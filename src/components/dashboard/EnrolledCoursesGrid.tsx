"use client";

import React, { memo } from 'react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, ArrowRight } from 'lucide-react';

interface EnrolledCoursesGridProps {
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnail: string;
    progress: number;
    totalLessons: number;
    completedLessons: number;
    lastAccessed?: string;
  }>;
  loading?: boolean;
  showAll?: boolean;
}

const EnrolledCoursesGrid: React.FC<EnrolledCoursesGridProps> = ({ 
  courses, 
  loading, 
  showAll = false 
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
            <div className="w-full h-40 bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Henüz kayıtlı kursunuz yok
        </h3>
        <p className="text-gray-500 mb-6">
          Mağazayı keşfedin ve öğrenmeye başlayın!
        </p>
        <Button asChild>
          <Link href="/marketplace">
            Kurs Mağazasını Keşfet
          </Link>
        </Button>
      </div>
    );
  }

  const displayCourses = showAll ? (courses || []) : (courses || []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCourses.map((course) => (
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
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-gray-400" />
                </div>
              )}
              
              {/* Progress Overlay */}
              {course.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>İlerleme</span>
                    <span>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-1" />
                </div>
              )}
            </div>

            {/* Course Content */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{course.completedLessons}/{course.totalLessons} ders</span>
                {course.lastAccessed && (
                  <span>Son: {new Date(course.lastAccessed).toLocaleDateString('tr-TR')}</span>
                )}
              </div>

              <Button 
                asChild 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Link href={`/courses/${course.slug}`}>
                  <Play className="h-4 w-4 mr-2" />
                  {course.progress > 0 ? 'Devam Et' : 'Başla'}
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Show All Button */}
      {!showAll && (courses || []).length > 3 && (
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href="/courses">
              <ArrowRight className="h-4 w-4 mr-2" />
              Tüm Kursları Gör ({(courses || []).length})
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default memo(EnrolledCoursesGrid);