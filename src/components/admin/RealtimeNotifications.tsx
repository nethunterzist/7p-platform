'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUnifiedAuth } from '@/lib/unified-auth';
import { Bell, UserPlus, BookOpen, Award, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Notification {
  id: string;
  type: 'enrollment' | 'unenrollment' | 'new-course' | 'course-completion';
  message: string;
  timestamp: string;
  user_name?: string;
  user_email?: string;
  course_title?: string;
  read: boolean;
}

export default function RealtimeNotifications() {
  const { isAdmin, user } = useUnifiedAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isAdmin || !user) return;

    // Subscribe to admin notifications channel
    const channel = supabase
      .channel('admin-notifications')
      .on('broadcast', { event: 'enrollment' }, (payload) => {
        const newNotification: Notification = {
          id: `enrollment-${payload.payload.enrollment_id}-${Date.now()}`,
          type: 'enrollment',
          message: payload.payload.message,
          timestamp: payload.payload.timestamp,
          user_name: payload.payload.user_name,
          user_email: payload.payload.user_email,
          course_title: payload.payload.course_title,
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
        setUnreadCount(prev => prev + 1);
      })
      .on('broadcast', { event: 'unenrollment' }, (payload) => {
        const newNotification: Notification = {
          id: `unenrollment-${payload.payload.enrollment_id}-${Date.now()}`,
          type: 'unenrollment',
          message: payload.payload.message,
          timestamp: payload.payload.timestamp,
          user_name: payload.payload.user_name,
          user_email: payload.payload.user_email,
          course_title: payload.payload.course_title,
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    // Listen for database changes on enrollments table
    const enrollmentsChannel = supabase
      .channel('enrollments-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'enrollments' }, 
        async (payload) => {
          // Fetch user and course details
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select(`
              *,
              profiles!user_id(name, email),
              courses!course_id(title)
            `)
            .eq('id', payload.new.id)
            .single();

          if (enrollment) {
            const newNotification: Notification = {
              id: `db-enrollment-${enrollment.id}-${Date.now()}`,
              type: 'enrollment',
              message: `${enrollment.profiles?.name || 'Yeni kullanıcı'} "${enrollment.courses?.title}" kursuna kaydoldu`,
              timestamp: enrollment.enrolled_at,
              user_name: enrollment.profiles?.name,
              user_email: enrollment.profiles?.email,
              course_title: enrollment.courses?.title,
              read: false
            };
            
            setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(enrollmentsChannel);
    };
  }, [isAdmin, user, supabase]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'enrollment':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'unenrollment':
        return <X className="h-4 w-4 text-red-600" />;
      case 'new-course':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'course-completion':
        return <Award className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes}dk önce`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}sa önce`;
    return date.toLocaleDateString('tr-TR');
  };

  if (!isAdmin) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-12 w-96 max-h-96 z-50 shadow-lg">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">
                  Bildirimler {unreadCount > 0 && `(${unreadCount})`}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Tümünü oku
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Henüz bildirim yok</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read ? 'font-medium' : ''} text-gray-900`}>
                            {notification.message}
                          </p>
                          {notification.user_email && (
                            <p className="text-xs text-gray-500 truncate">
                              {notification.user_email}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t bg-gray-50">
                  <button 
                    className="text-sm text-gray-600 hover:text-gray-900 w-full text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Kapat
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}