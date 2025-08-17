"use client";

import React, { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Star, 
  BookOpen, 
  Users,
  ArrowRight 
} from 'lucide-react';

interface CourseRecommendationsProps {
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    price: number;
    originalPrice?: number;
    thumbnail: string;
    shortDescription: string;
    rating?: number;
    studentCount?: number;
    instructor?: string;
  }>;
  onPurchase: (courseId: string) => void;
  loading?: boolean;
}

const CourseRecommendations: React.FC<CourseRecommendationsProps> = ({ 
  courses, 
  onPurchase, 
  loading 
}) => {
  const formatPrice = (price: number) => {
    return `₺${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
            <div className="w-full h-32 bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
            <div className="flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return null; // Don't show anything if no recommendations
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.slice(0, 3).map((course) => {
          const discountPercentage = course.originalPrice 
            ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
            : 0;

          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {/* Course Thumbnail */}
              <div className="relative">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                {/* Discount Badge */}
                {discountPercentage > 0 && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    %{discountPercentage} İndirim
                  </div>
                )}
              </div>

              {/* Course Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {course.shortDescription}
                </p>

                {/* Course Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  {course.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{course.rating}</span>
                    </div>
                  )}
                  
                  {course.studentCount && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{course.studentCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Price and Action */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(course.price)}
                      </span>
                      {course.originalPrice && course.originalPrice > course.price && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(course.originalPrice)}
                        </span>
                      )}
                    </div>
                    {course.instructor && (
                      <span className="text-xs text-gray-500">
                        {course.instructor}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild
                    >
                      <Link href={`/marketplace/${course.slug}`}>
                        Detay
                      </Link>
                    </Button>
                    
                    <Button 
                      size="sm"
                      onClick={() => onPurchase(course.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Link */}
      <div className="text-center">
        <Button variant="ghost" asChild className="text-blue-600 hover:text-blue-700">
          <Link href="/marketplace">
            <ArrowRight className="h-4 w-4 mr-2" />
            Daha Fazla Kurs Keşfet
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default memo(CourseRecommendations);