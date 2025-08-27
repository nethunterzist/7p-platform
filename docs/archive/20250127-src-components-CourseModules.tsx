"use client";

import React, { useState } from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Award,
  Lock
} from 'lucide-react';
import { Module, Lesson } from '@/types/course';
import { Button } from '@/components/ui/button';

interface CourseModulesProps {
  modules: Module[];
  currentLessonId?: string;
  onLessonSelect: (lesson: Lesson) => void;
  className?: string;
}

const CourseModules: React.FC<CourseModulesProps> = ({
  modules,
  currentLessonId,
  onLessonSelect,
  className = ""
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map(m => m.id)) // Tüm modüller açık başlasın
  );

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'text': return FileText;
      case 'quiz': return HelpCircle;
      case 'assignment': return Award;
      default: return BookOpen;
    }
  };

  const getLessonStatusIcon = (lesson: Lesson, isCurrentLesson: boolean) => {
    if (isCurrentLesson) {
      return <PlayCircle className="h-4 w-4 text-blue-600" />;
    }
    
    // Mock completion status - gerçek uygulamada API'den gelecek
    const isCompleted = Math.random() > 0.6;
    
    if (isCompleted) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}dk`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}sa ${remainingMinutes}dk` : `${hours}sa`;
  };

  const getModuleProgress = (module: Module) => {
    if (!module.lessons || module.lessons.length === 0) return 0;
    
    // Mock progress calculation
    const completedLessons = Math.floor(module.lessons.length * Math.random());
    return Math.round((completedLessons / module.lessons.length) * 100);
  };

  const getTotalCompletedLessons = (module: Module) => {
    if (!module.lessons || module.lessons.length === 0) return 0;
    
    // Mock completed lessons count
    return Math.floor(module.lessons.length * Math.random());
  };

  if (modules.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600">Kurs modülleri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Kurs İçeriği
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {modules.length} modül • {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} ders
        </p>
      </div>

      {/* Modules List */}
      <div className="max-h-96 overflow-y-auto">
        {modules.map((module, moduleIndex) => {
          const progress = getModuleProgress(module);
          const completedLessons = getTotalCompletedLessons(module);
          const totalLessons = module.lessons?.length || 0;
          
          return (
            <div key={module.id} className="border-b border-gray-100 last:border-b-0">
              {/* Module Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleModule(module.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-semibold">
                        {moduleIndex + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {module.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {totalLessons} ders
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(module.duration_minutes || 0)}
                        </span>
                        <span>
                          {completedLessons}/{totalLessons} tamamlandı
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {progress}%
                    </div>
                    <div className="w-16 h-1 bg-gray-200 rounded-full">
                      <div 
                        className="h-1 bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lessons List */}
              {expandedModules.has(module.id) && module.lessons && (
                <div className="bg-gray-50/50">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const LessonIcon = getLessonIcon(lesson.type);
                    const isCurrentLesson = currentLessonId === lesson.id;
                    const isLocked = false; // Mock - gerçek uygulamada önceki derslerin tamamlanma durumuna bakılacak
                    
                    return (
                      <div 
                        key={lesson.id}
                        className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${
                          isCurrentLesson 
                            ? 'bg-blue-50 border-r-2 border-blue-600' 
                            : 'hover:bg-gray-50'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isLocked && onLessonSelect(lesson)}
                      >
                        {/* Lesson Number */}
                        <div className="text-xs text-gray-400 w-6 text-right">
                          {lessonIndex + 1}
                        </div>
                        
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-gray-400" />
                          ) : (
                            getLessonStatusIcon(lesson, isCurrentLesson)
                          )}
                        </div>
                        
                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <LessonIcon className={`h-3 w-3 ${isCurrentLesson ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`text-xs px-1.5 py-0.5 rounded text-gray-600 bg-gray-200 ${
                              isCurrentLesson ? 'bg-blue-100 text-blue-700' : ''
                            }`}>
                              {lesson.type === 'video' ? 'Video' :
                               lesson.type === 'text' ? 'Metin' :
                               lesson.type === 'quiz' ? 'Quiz' :
                               lesson.type === 'assignment' ? 'Ödev' : 'Ders'}
                            </span>
                            {lesson.is_free && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                Ücretsiz
                              </span>
                            )}
                          </div>
                          
                          <h5 className={`text-sm font-medium truncate ${
                            isCurrentLesson ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {lesson.title}
                          </h5>
                        </div>
                        
                        {/* Duration */}
                        <div className="flex-shrink-0 text-xs text-gray-500">
                          {formatDuration(lesson.duration_minutes || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer Stats */}
      <div className="p-4 bg-gray-50 text-center">
        <div className="text-xs text-gray-600">
          {modules.reduce((acc, m) => acc + getTotalCompletedLessons(m), 0)} / {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} ders tamamlandı
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
          <div 
            className="h-1 bg-green-600 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.round((modules.reduce((acc, m) => acc + getTotalCompletedLessons(m), 0) / modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)) * 100)}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseModules;