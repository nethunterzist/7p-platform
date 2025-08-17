"use client";

import React, { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Clock, BookOpen } from 'lucide-react';

interface ContinueLearningProps {
  lastLesson: {
    courseId: string;
    courseName: string;
    lessonId: string;
    lessonName: string;
    progress: number;
    thumbnail: string;
    estimatedTime: string;
    moduleId: string;
    courseSlug: string;
  } | null;
  loading?: boolean;
  userName?: string;
}

const ContinueLearning: React.FC<ContinueLearningProps> = ({ lastLesson, loading, userName }) => {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-48 mb-4"></div>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-6 bg-white/20 rounded w-64 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-48 mb-4"></div>
              <div className="h-3 bg-white/20 rounded w-full mb-2"></div>
              <div className="h-10 bg-white/20 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lastLesson) {
    return (
      <div className="section p-8 text-center bg-gradient-to-r from-slate-100/60 to-slate-200/60 dark:from-slate-800/60 dark:to-slate-700/60">
        <BookOpen className="h-16 w-16 text-muted mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-primary mb-2">
          Henüz bir derse başlamadınız
        </h3>
        <p className="text-muted mb-6">
          Kurslarınıza göz atın ve öğrenmeye başlayın!
        </p>
        <Button asChild className="btn-primary-dark">
          <Link href="/courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Kurslarıma Git
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white">
      <h2 className="text-2xl font-bold mb-6">
        Kaldığın Yerden Devam Et {userName && `${userName} 👋`}
      </h2>
      
      <div className="flex items-center gap-6">
        {/* Course Thumbnail */}
        <div className="flex-shrink-0">
          {lastLesson.thumbnail ? (
            <img
              src={lastLesson.thumbnail}
              alt={lastLesson.courseName}
              className="w-24 h-24 rounded-xl object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-white/80" />
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{lastLesson.courseName}</h3>
          <p className="text-blue-100 mb-4">{lastLesson.lessonName}</p>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-blue-100">İlerleme</span>
              <span className="font-semibold">{lastLesson.progress}%</span>
            </div>
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 transition-all duration-300 rounded-full"
                style={{ width: `${lastLesson.progress}%` }}
              />
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center gap-4">
            <Button 
              asChild 
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              <Link href={`/courses/${lastLesson.courseSlug}/modules/${lastLesson.moduleId}/lessons/${lastLesson.lessonId}`}>
                <Play className="h-5 w-5 mr-2" />
                Devam Et
              </Link>
            </Button>
            
            <div className="flex items-center text-blue-100 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              {lastLesson.estimatedTime} kaldı
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ContinueLearning);
