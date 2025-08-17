"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Star,
  Clock,
  Users,
  BookOpen,
  PlayCircle,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    short_description?: string;
    thumbnail_url?: string;
    price: number;
    original_price?: number;
    currency?: string;
    instructor_name?: string;
    category_name?: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    duration_hours?: number;
    total_lessons?: number;
    rating?: number;
    total_ratings?: number;
    total_students?: number;
    is_featured?: boolean;
    is_free?: boolean;
    tags?: string[];
  };
  variant?: 'store' | 'owned'; // Yeni variant prop
  onPurchase?: (courseId: string) => void;
  isEnrolled?: boolean;
  loading?: boolean;
  className?: string;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  variant = 'store',
  onPurchase,
  isEnrolled = false,
  loading = false,
  className = ""
}) => {
  const formatPrice = (price: number, currency: string = 'TRY') => {
    const symbol = currency === 'TRY' ? '₺' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}dk`;
    return `${Math.round(hours)}sa`;
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'advanced': return 'İleri';
      default: return level;
    }
  };

  const discountPercentage = course.original_price 
    ? Math.round(((course.original_price - course.price) / course.original_price) * 100)
    : 0;

  const isListMode = className?.includes('flex-row');
  
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-500 group ${className}`}>
      {/* Course Image */}
      <div className={`relative ${isListMode ? 'w-48 flex-shrink-0' : ''}`}>
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className={`object-cover ${isListMode ? 'w-48 h-32 rounded-l-2xl' : 'w-full h-48 rounded-t-2xl'}`}
          />
        ) : (
          <div className={`bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${isListMode ? 'w-48 h-32 rounded-l-2xl' : 'w-full h-48 rounded-t-2xl'}`}>
            <BookOpen className="h-12 w-12 text-slate-400" />
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {course.is_free && (
            <div key="free-badge" className="px-2 py-0.5 rounded-md text-xs bg-blue-100 text-blue-700 border-0 inline-flex items-center font-semibold">
              ÜCRETSİZ
            </div>
          )}
          {!isEnrolled && !course.is_free && discountPercentage > 0 && (
            <div key="discount-badge" className="px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700 border-0 inline-flex items-center">
              %{discountPercentage} İndirim
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className={`p-6 ${isListMode ? 'flex-1' : ''}`}>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {course.title}
        </h3>

        {/* Description */}
        {course.short_description && (
          <p className="text-sm text-slate-600 dark:text-gray-300 line-clamp-2 mb-4">
            {course.short_description}
          </p>
        )}

        {/* Meta Information */}
        <div className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-3 mb-4">
          <div key="lessons-info" className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span>{course.total_lessons || 0} ders</span>
          </div>
          <div key="duration-info" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(course.duration_hours)}</span>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-gray-700">
          {/* Price - Only show if not enrolled */}
          {!isEnrolled && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {course.is_free ? (
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ÜCRETSİZ
                  </span>
                ) : (
                  <span className="text-xl font-bold text-slate-900 dark:text-gray-100">
                    {formatPrice(course.price, course.currency)}
                  </span>
                )}
                {course.original_price && course.original_price > course.price && !course.is_free && (
                  <span className="text-sm text-slate-400 dark:text-gray-500 line-through">
                    {formatPrice(course.original_price, course.currency)}
                  </span>
                )}
              </div>
              
              {/* Students only */}
              <div className="flex items-center gap-3 mt-1">
                {course.total_students && course.total_students > 0 && (
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {course.total_students.toLocaleString()} öğrenci
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Students for enrolled users */}
          {isEnrolled && (
            <div className="flex items-center gap-3">
              {course.total_students && (
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  {course.total_students.toLocaleString()} öğrenci
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {variant !== 'owned' && (
              <Button 
                key="detail-button"
                variant="outline" 
                size="sm"
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white"
                asChild
              >
                <Link href={`/marketplace/${course.slug}`}>
                  Detay
                </Link>
              </Button>
            )}
            
            {variant === 'owned' || isEnrolled ? (
              <Button 
                key="continue-button"
                size="sm"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                asChild
              >
                <Link href={`/courses/${course.slug}`}>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  {variant === 'owned' ? 'Kursa Git' : 'İzlemeye Devam Et'}
                </Link>
              </Button>
            ) : (
              <Button
                key="purchase-button"
                onClick={() => onPurchase?.(course.id)}
                disabled={loading}
                size="sm"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-1" />
                )}
                {loading ? 'İşleniyor...' : (course.is_free ? 'Ücretsiz Al' : 'Satın Al')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
