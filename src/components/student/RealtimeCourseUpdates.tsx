'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUnifiedAuth } from '@/lib/unified-auth';
import { BookOpen, Bell, Eye, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  price: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface CourseNotification {
  id: string;
  type: 'new-course' | 'course-published' | 'course-updated';
  course: Course;
  message: string;
  timestamp: string;
  seen: boolean;
}

export default function RealtimeCourseUpdates() {
  const { isAuthenticated, user, isAdmin } = useUnifiedAuth();
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<CourseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const supabase = createClient();

  // Don't show to admins (they have their own interface)
  if (!isAuthenticated || isAdmin) return null;

  useEffect(() => {
    if (!user) return;

    fetchInitialData();

    // Subscribe to course notifications
    const courseChannel = supabase
      .channel('course-notifications')
      .on('broadcast', { event: 'new-course' }, (payload) => {
        const newNotification: CourseNotification = {
          id: `new-${payload.payload.course_id}-${Date.now()}`,
          type: 'new-course',
          course: payload.payload.course,
          message: payload.payload.message,
          timestamp: payload.payload.timestamp,
          seen: false
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep last 20
        
        // Also add to available courses if not already there
        setAvailableCourses(prev => {
          const exists = prev.find(c => c.id === payload.payload.course_id);
          if (!exists && payload.payload.course) {
            return [payload.payload.course, ...prev];
          }
          return prev;
        });
      })
      .on('broadcast', { event: 'course-published' }, (payload) => {
        const newNotification: CourseNotification = {
          id: `published-${payload.payload.course_id}-${Date.now()}`,
          type: 'course-published',
          course: payload.payload.course,
          message: payload.payload.message,
          timestamp: payload.payload.timestamp,
          seen: false
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      })
      .subscribe();

    // Listen for database changes to courses
    const coursesChannel = supabase
      .channel('courses-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'courses' }, 
        (payload) => {
          if (payload.new.is_published) {
            const newCourse = payload.new as Course;
            setAvailableCourses(prev => [newCourse, ...prev]);
            
            const newNotification: CourseNotification = {
              id: `db-new-${newCourse.id}-${Date.now()}`,
              type: 'new-course',
              course: newCourse,
              message: `Yeni kurs eklendi: ${newCourse.title}`,
              timestamp: newCourse.created_at,
              seen: false
            };
            
            setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'courses' }, 
        (payload) => {
          const updatedCourse = payload.new as Course;
          
          // If course was just published
          if (updatedCourse.is_published && !payload.old.is_published) {
            setAvailableCourses(prev => {
              const exists = prev.find(c => c.id === updatedCourse.id);
              if (exists) {
                return prev.map(c => c.id === updatedCourse.id ? updatedCourse : c);
              } else {
                return [updatedCourse, ...prev];
              }
            });
            
            const newNotification: CourseNotification = {
              id: `db-published-${updatedCourse.id}-${Date.now()}`,
              type: 'course-published',
              course: updatedCourse,
              message: `Kurs yayınlandı: ${updatedCourse.title}`,
              timestamp: updatedCourse.updated_at,
              seen: false
            };
            
            setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          }
          
          // Update existing course in list
          setAvailableCourses(prev => 
            prev.map(c => c.id === updatedCourse.id ? updatedCourse : c)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(courseChannel);
      supabase.removeChannel(coursesChannel);
    };
  }, [user, supabase]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch available courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      setAvailableCourses(courses || []);

      // Fetch user's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;
      
      const enrolledSet = new Set(enrollments?.map(e => e.course_id) || []);
      setEnrolledCourses(enrolledSet);

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const response = await fetch('/api/student/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId })
      });

      const data = await response.json();
      
      if (data.success) {
        setEnrolledCourses(prev => new Set([...prev, courseId]));
        
        // Show success message (you could use a toast here)
        alert('Kursa başarıyla kaydoldunuz!');
      } else {
        alert(data.error || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Kayıt sırasında hata oluştu');
    }
  };

  const markNotificationAsSeen = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, seen: true } : n)
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'advanced': return 'İleri';
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notifications.filter(n => !n.seen).length > 0 && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-blue-900">
              <Bell className="h-5 w-5 mr-2" />
              Yeni Kurslar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.filter(n => !n.seen).slice(0, 3).map(notification => (
                <div 
                  key={notification.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markNotificationAsSeen(notification.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Courses */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <BookOpen className="h-6 w-6 mr-2" />
          Mevcut Kurslar ({availableCourses.length})
        </h2>
        
        {availableCourses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Henüz yayınlanan kurs bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map(course => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                      {getLevelText(course.level)}
                    </span>
                    {course.duration_minutes > 0 && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {Math.round(course.duration_minutes / 60)}sa
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-corporate-primary">
                      {course.price > 0 ? `₺${course.price}` : 'Ücretsiz'}
                    </div>
                    
                    {enrolledCourses.has(course.id) ? (
                      <Button variant="outline" disabled>
                        Kayıtlı ✓
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleEnroll(course.id)}
                        className="bg-corporate-primary hover:bg-corporate-deep"
                      >
                        Kayıt Ol
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}