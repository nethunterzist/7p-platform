"use client";

import React from 'react';
import Link from 'next/link';
import { 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  BarChart3,
  Calendar,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface MyCourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    short_description?: string;
    thumbnail_url?: string;
    instructor_name?: string;
    category_name?: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    duration_hours?: number;
    total_lessons?: number;
  };
  enrollment: {
    progress_percentage: number;
    last_accessed?: string;
    enrolled_at: string;
    status: 'active' | 'completed' | 'paused';
    completed_lessons?: number;
    total_time_spent?: number; // in minutes
  };
  lastWatchedLesson?: {
    id: string;
    title: string;
    module_title?: string;
  };
}

const MyCourseCard: React.FC<MyCourseCardProps> = ({
  course,
  enrollment,
  lastWatchedLesson
}) => {
  const formatDuration = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}dk`;
    return `${Math.round(hours)}sa`;
  };

  const formatLastAccessed = (dateString?: string) => {
    if (!dateString) return 'Henüz başlanmamış';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    if (diffInHours < 48) return 'Dün';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'short' 
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-green-500 bg-green-50';
      case 'paused': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const isCompleted = enrollment.status === 'completed' || enrollment.progress_percentage >= 100;
  const continueUrl = lastWatchedLesson 
    ? `/learn/${course.id}?lesson=${lastWatchedLesson.id}`
    : `/learn/${course.id}`;

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 ${getStatusColor(enrollment.status)}`}>
      <CardContent className="p-0">
        {/* Course Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className={getLevelColor(course.level)}>
                  {getLevelText(course.level)}
                </Badge>
                {course.category_name && (
                  <Badge variant="outline">
                    {course.category_name}
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Tamamlandı
                  </Badge>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
              
              {course.short_description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {course.short_description}
                </p>
              )}
            </div>
            
            {course.thumbnail_url && (
              <div className="ml-4 flex-shrink-0">
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-6 pb-4">
          <div className="space-y-3">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">İlerleme</span>
                <span className="font-medium text-gray-900">
                  %{Math.round(enrollment.progress_percentage)}
                </span>
              </div>
              <Progress 
                value={enrollment.progress_percentage} 
                className="h-2"
              />
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <BookOpen className="h-4 w-4" />
                <span>{course.total_lessons || 0} ders</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(course.duration_hours)}</span>
              </div>
            </div>

            {/* Last Watched Lesson */}
            {lastWatchedLesson && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Son İzlenen Ders:</div>
                <div className="text-sm font-medium text-gray-900 line-clamp-1">
                  {lastWatchedLesson.title}
                </div>
                {lastWatchedLesson.module_title && (
                  <div className="text-xs text-gray-500 mt-1">
                    {lastWatchedLesson.module_title}
                  </div>
                )}
              </div>
            )}

            {/* Last Accessed Info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Son erişim: {formatLastAccessed(enrollment.last_accessed)}</span>
              </div>
              {enrollment.total_time_spent && (
                <div className="flex items-center space-x-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>{Math.round(enrollment.total_time_spent)} dk</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6">
          <div className="flex space-x-3">
            <Button 
              asChild 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Link href={continueUrl}>
                <PlayCircle className="h-4 w-4 mr-2" />
                {enrollment.progress_percentage > 0 ? 'Devam Et' : 'Başla'}
              </Link>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <Link href={`/courses/${course.id}/details`}>
                Detay
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyCourseCard;