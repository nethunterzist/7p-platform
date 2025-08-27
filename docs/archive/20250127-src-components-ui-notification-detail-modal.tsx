"use client";

import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Gift, 
  Settings as SettingsIcon,
  ExternalLink,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/app/notifications/page';

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose
}) => {
  if (!notification) return null;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'course': return <BookOpen className="h-5 w-5" />;
      case 'system': return <SettingsIcon className="h-5 w-5" />;
      case 'achievement': return <CheckCircle className="h-5 w-5" />;
      case 'reminder': return <Clock className="h-5 w-5" />;
      case 'promotion': return <Gift className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'course': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'system': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'achievement': return 'text-green-600 bg-green-100 border-green-200';
      case 'reminder': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'promotion': return 'text-purple-600 bg-purple-100 border-purple-200';
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'course': return 'Kurs Bildirimi';
      case 'system': return 'Sistem Bildirimi';
      case 'achievement': return 'Başarı Bildirimi';
      case 'reminder': return 'Hatırlatma';
      case 'promotion': return 'Promosyon';
    }
  };

  const getPriorityLabel = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'Yüksek Öncelik';
      case 'medium': return 'Orta Öncelik';
      case 'low': return 'Düşük Öncelik';
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatContent = (content: string) => {
    // Convert line breaks and format the content
    return content.split('\n').map((line, index) => {
      // Handle emoji bullets and formatting
      if (line.trim() === '') {
        return <br key={index} />;
      }
      
      // Handle section headers (lines starting with emoji or bold text)
      if (line.match(/^[🎉🔥📚👨‍🏫⏱🎯💰📊⚡🎁💡🎤📋👥📅⏰📋🛠🚫✅🎯🏆📜🚀💡🔧]/)) {
        return (
          <div key={index} className="font-semibold text-gray-900 mt-4 mb-2 text-base">
            {line.trim()}
          </div>
        );
      }
      
      // Handle bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={index} className="ml-4 mb-1 text-gray-700">
            <span className="text-blue-500 font-bold mr-2">•</span>
            {line.trim().substring(1).trim()}
          </div>
        );
      }
      
      // Handle numbered lists
      if (line.match(/^\d+\./)) {
        return (
          <div key={index} className="ml-4 mb-1 text-gray-700 font-medium">
            {line.trim()}
          </div>
        );
      }
      
      // Regular paragraphs
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 text-gray-700 leading-relaxed">
            {line.trim()}
          </p>
        );
      }
      
      return null;
    }).filter(Boolean);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-3 rounded-full border flex-shrink-0",
              getNotificationColor(notification.type)
            )}>
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                {notification.title}
              </DialogTitle>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(notification.type)}
                </Badge>
                
                {notification.priority !== 'low' && (
                  <Badge className={cn("text-xs", getPriorityColor(notification.priority))}>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {getPriorityLabel(notification.priority)}
                  </Badge>
                )}
                
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(notification.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* Short Description */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-gray-700 font-medium leading-relaxed">
                {notification.message}
              </p>
            </div>

            {/* Full Content */}
            {notification.fullContent && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Detaylar
                </h4>
                <div className="prose prose-sm max-w-none">
                  <div className="text-sm leading-relaxed">
                    {formatContent(notification.fullContent)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              {notification.read ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Okundu
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Yeni
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-6"
              >
                Kapat
              </Button>
              
              {notification.actionUrl && notification.actionLabel && (
                <Button asChild className="px-6">
                  <Link 
                    href={notification.actionUrl}
                    onClick={onClose}
                    className="flex items-center gap-2"
                  >
                    {notification.actionLabel}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetailModal;