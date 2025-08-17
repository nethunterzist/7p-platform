"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Star,
  Clock,
  Users,
  BookOpen,
  PlayCircle,
  ShoppingCart,
  Tag,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketplaceCourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    short_description?: string;
    thumbnail_url?: string;
    price: number;
    original_price?: number;
    currency?: string;
    instructor_name?: string;
    instructor_avatar?: string;
    category_name?: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    duration_hours?: number;
    total_lessons?: number;
    rating?: number;
    total_ratings?: number;
    total_students?: number;
    is_featured?: boolean;
    what_you_learn?: string[];
    requirements?: string[];
    tags?: string[];
    updated_at: string;
  };
  onPurchase?: (courseId: string) => void;
  isEnrolled?: boolean;
  loading?: boolean;
}

const MarketplaceCourseCard: React.FC<MarketplaceCourseCardProps> = ({
  course,
  onPurchase,
  isEnrolled = false,
  loading = false
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const formatPrice = (price: number, currency: string = 'TRY') => {
    const symbol = currency === 'TRY' ? '₺' : '$';
    return `${symbol}${price.toLocaleString()}`;
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

  const renderStars = (rating?: number, totalRatings?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
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
        <span className="text-sm font-medium text-gray-900">
          {rating.toFixed(1)}
        </span>
        {totalRatings && (
          <span className="text-sm text-gray-500">
            ({totalRatings.toLocaleString()})
          </span>
        )}
      </div>
    );
  };

  const discountPercentage = course.original_price 
    ? Math.round(((course.original_price - course.price) / course.original_price) * 100)
    : 0;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <CardContent className="p-0">
        {/* Course Image/Header */}
        <div className="relative">
          {course.thumbnail_url ? (
            <img 
              src={course.thumbnail_url} 
              alt={course.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-white/50" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex space-x-2">
            {discountPercentage > 0 && (
              <Badge className="bg-red-500 text-white">
                -%{discountPercentage}
              </Badge>
            )}
          </div>

          {/* Level Badge */}
          <div className="absolute top-4 right-4">
            <Badge className={getLevelColor(course.level)}>
              {getLevelText(course.level)}
            </Badge>
          </div>

          {/* Preview Button Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 hover:bg-white/30 text-white"
              asChild
            >
              <Link href={`/marketplace/${course.slug}`}>
                <PlayCircle className="h-5 w-5 mr-2" />
                Önizle
              </Link>
            </Button>
          </div>
        </div>

        {/* Course Content */}
        <div className="p-6">
          {/* Category */}
          {course.category_name && (
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                {course.category_name}
              </Badge>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {course.title}
          </h3>

          {/* Instructor */}
          {course.instructor_name && (
            <div className="flex items-center space-x-2 mb-3">
              {course.instructor_avatar ? (
                <img 
                  src={course.instructor_avatar} 
                  alt={course.instructor_name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-600">
                    {course.instructor_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-600">{course.instructor_name}</span>
            </div>
          )}

          {/* Description */}
          {course.short_description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {course.short_description}
            </p>
          )}

          {/* What you learn (preview) */}
          {course.what_you_learn && course.what_you_learn.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Neler Öğreneceksiniz:</h4>
              <ul className="space-y-1">
                {course.what_you_learn.slice(0, 3).map((item, index) => (
                  <li key={index} className="flex items-start space-x-2 text-xs text-gray-600">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
                {course.what_you_learn.length > 3 && (
                  <li className="text-xs text-gray-500 ml-3">
                    +{course.what_you_learn.length - 3} daha fazla...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Course Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(course.duration_hours)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookOpen className="h-4 w-4" />
              <span>{course.total_lessons || 0} ders</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{course.total_students?.toLocaleString() || 0} öğrenci</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>{course.language === 'tr' ? 'Türkçe' : 'English'}</span>
            </div>
          </div>

          {/* Rating */}
          {course.rating && (
            <div className="mb-4">
              {renderStars(course.rating, course.total_ratings)}
            </div>
          )}

          {/* Tags */}
          {course.tags && course.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {course.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Price and Purchase */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(course.price, course.currency)}
                </span>
                {course.original_price && course.original_price > course.price && (
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(course.original_price, course.currency)}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">Tek ödeme</span>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/marketplace/${course.slug}`}>
                  Detay
                </Link>
              </Button>
              
              {isEnrolled ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/learn/${course.id}`}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Devam Et
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() => onPurchase?.(course.id)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'İşleniyor...' : 'Satın Al'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceCourseCard;