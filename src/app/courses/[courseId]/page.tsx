"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCourseDetailBySlug,
  type CourseDetail,
  type Module,
  type Lesson
} from '@/data/courses';
import { 
  isUserEnrolledInCourse, 
  getUserCourseProgress,
  redirectToMarketplace,
  isUserLoggedIn,
  redirectToLogin
} from '@/lib/enrollment';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard, DashboardSection } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  PlayCircle,
  Clock,
  Users,
  BookOpen,
  Star,
  Award,
  CheckCircle,
  Download,
  Share2,
  ArrowLeft,
  FileText,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export default function OwnedCoursePage({ 
  params 
}: { 
  params: Promise<{ courseId: string }> 
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>('');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProgress, setUserProgress] = useState<any>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.courseId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if user is logged in
      if (!isUserLoggedIn()) {
        redirectToLogin(`/courses/${courseId}`);
        return;
      }

      // Get course details by slug (courseId is actually slug in this case)
      const courseData = getCourseDetailBySlug(courseId);
      if (!courseData) {
        throw new Error('Kurs bulunamadı');
      }

      // Check if user is enrolled in this course (ücretsiz kurslar için kayıt kontrolü atlanır)
      if (!courseData.is_free && !isUserEnrolledInCourse(courseData.id)) {
        // Redirect to marketplace if not enrolled (only for paid courses)
        redirectToMarketplace(courseId);
        return;
      }

      setCourse(courseData);

      // Get user progress
      const progress = getUserCourseProgress(courseData.id);
      setUserProgress(progress);

    } catch (err: any) {
      console.error('Course fetch error:', err);
      setError(err.message || 'Kurs yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}dk`;
    return `${Math.round(hours)}sa`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating) 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Kurs yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  };

  if (error || !course) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kurs Bulunamadı</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/courses">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kurslarıma Dön
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
    >
      {/* Course Header with Progress */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl text-white p-8 mb-8">
        {/* Course Info - Full Width */}
        <div className="w-full">
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <Badge className="bg-green-500 text-white cursor-default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sahip Oldunuz
              </Badge>
            </div>

            <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
            <p className="text-lg text-blue-100 mb-4">{course.short_description}</p>

            {/* Progress Info - Full Width */}
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-blue-100 text-lg">İlerleme</span>
                <span className="font-bold text-xl">{userProgress?.progress || 0}%</span>
              </div>
              <div className="bg-white/20 h-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300 rounded-full"
                  style={{ width: `${userProgress?.progress || 0}%` }}
                />
              </div>
              <div className="text-sm text-blue-100 mt-3">
                {userProgress?.completedLessons?.length || 0} / {course.total_lessons} ders tamamlandı
              </div>
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold mb-1">{course.total_students?.toLocaleString()}</div>
                <div className="text-sm text-blue-200">Öğrenci</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold mb-1">{formatDuration(course.duration_hours)}</div>
                <div className="text-sm text-blue-200">Süre</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold mb-1">{course.total_lessons}</div>
                <div className="text-sm text-blue-200">Ders</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold mb-1">12</div>
                <div className="text-sm text-blue-200">Materyal</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <DashboardSection title="Kurs Müfredatı" description="Tüm derslere erişim sağlayabilirsiniz">
        <div className="space-y-4">
          {course.modules?.map((module, moduleIndex) => (
            <OwnedModuleAccordion
              key={module.id}
              module={module}
              moduleIndex={moduleIndex}
              courseSlug={course.slug}
              userProgress={userProgress}
            />
          ))}
        </div>
      </DashboardSection>

    </DashboardLayout>
  );
}

// Owned Module Accordion Component (Tam erişim)
interface OwnedModuleAccordionProps {
  module: Module;
  moduleIndex: number;
  courseSlug: string;
  userProgress: any;
}

function OwnedModuleAccordion({ 
  module, 
  moduleIndex, 
  courseSlug, 
  userProgress 
}: OwnedModuleAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(moduleIndex === 0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Calculate module progress (excluding quiz lessons)
  const videoLessons = module.lessons.filter(lesson => lesson.type !== 'quiz');
  const completedLessonsInModule = videoLessons.filter(lesson => 
    userProgress?.completedLessons?.includes(lesson.id)
  ).length;
  const moduleProgress = videoLessons.length > 0 ? (completedLessonsInModule / videoLessons.length) * 100 : 0;

  return (
    <DashboardCard>
      {/* Module Header */}
      <button
        onClick={toggleExpanded}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm">
            {moduleIndex + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{module.description}</p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="text-xs text-gray-500">
                {videoLessons.length} ders
              </div>
              <div className="text-xs text-gray-500">
                {completedLessonsInModule} / {videoLessons.length} tamamlandı
              </div>
              <div className="flex-1 max-w-32">
                <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300 rounded-full"
                    style={{ width: `${moduleProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Lessons List */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="py-2">
            {module.lessons.filter(lesson => lesson.type !== 'quiz').map((lesson) => {
              const isCompleted = userProgress?.completedLessons?.includes(lesson.id);
              // Owned course - full access to all video lessons (quiz lessons filtered out)
              const href = `/courses/${courseSlug}/modules/${module.id}/lessons/${lesson.id}`;
              
              return (
                <Link
                  key={lesson.id}
                  href={href}
                  className="flex items-center justify-between py-3 px-6 hover:bg-white transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-500">
                      {lesson.order_index}
                    </div>
                    <div className="flex items-center space-x-2">
                      <PlayCircle className={`h-4 w-4 ${isCompleted ? 'text-green-500' : 'text-blue-500'} group-hover:text-blue-600`} />
                      <span className={`text-sm ${isCompleted ? 'text-gray-700' : 'text-gray-900'}`}>
                        {lesson.title}
                      </span>
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {lesson.duration}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}