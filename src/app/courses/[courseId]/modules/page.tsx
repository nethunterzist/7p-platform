"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, 
  Clock, 
  BookOpen, 
  CheckCircle2,
  Circle,
  FileText,
  Video,
  HelpCircle,
  Award,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Course, Module } from '@/types/course';
import { mockCourses, mockModules, mockLessons } from '@/data/mockCourses';

interface CourseModulesPageProps {
  params: { courseId: string };
}

export default function CourseModulesPage({ params }: CourseModulesPageProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCourseData();
  }, [params.courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      // Mock data kullanımı
      const courseData = mockCourses.find(c => c.id === params.courseId);
      const moduleData = mockModules[params.courseId] || [];
      
      if (courseData) {
        setCourse(courseData);
        
        // Modüllere derslerini ekle
        const modulesWithLessons = moduleData.map(module => {
          const lessons = mockLessons[module.id] || [];
          return {
            ...module,
            lessons
          };
        });
        
        setModules(modulesWithLessons);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getLessonTypeText = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'text': return 'Metin';
      case 'quiz': return 'Quiz';
      case 'assignment': return 'Ödev';
      default: return 'Ders';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}dk`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}sa ${remainingMinutes}dk` : `${hours}sa`;
  };

  const getTotalProgress = () => {
    // Mock progress - gerçek uygulamada API'den gelecek
    return Math.floor(Math.random() * 100);
  };

  const getCompletedLessonsCount = () => {
    // Mock completed lessons - gerçek uygulamada API'den gelecek
    const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);
    return Math.floor(totalLessons * (getTotalProgress() / 100));
  };

  const startLearning = () => {
    // İlk modülün ilk dersine yönlendir
    if (modules.length > 0 && modules[0].lessons && modules[0].lessons.length > 0) {
      const firstLesson = modules[0].lessons[0];
      router.push(`/learn/${params.courseId}?lesson=${firstLesson.id}`);
    }
  };

  const goToLesson = (lessonId: string) => {
    router.push(`/learn/${params.courseId}?lesson=${lessonId}`);
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Yükleniyor..."
        subtitle=""
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Kurs bilgileri yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout
        title="Kurs Bulunamadı"
        subtitle=""
      >
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Kurs bulunamadı</h3>
          <p className="text-gray-600 mb-6">Aradığınız kurs mevcut değil veya erişim izniniz yok.</p>
          <Button onClick={() => router.push('/courses')}>
            Kurslarıma Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);
  const completedLessons = getCompletedLessonsCount();
  const progressPercentage = getTotalProgress();

  return (
    <DashboardLayout
      title={course.title}
      subtitle="Kurs modülleri ve dersler"
    >
      {/* Kurs Özeti */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
          <div className="flex-1 mb-6 lg:mb-0">
            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
            <p className="text-blue-100 mb-4 max-w-2xl">{course.description}</p>
            
            {/* İstatistikler */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{modules.length} modül</span>
              </div>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                <span>{totalLessons} ders</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{course.duration_hours} saat</span>
              </div>
            </div>
          </div>
          
          {/* İlerleme ve Başla Butonu */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 min-w-[280px]">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold mb-1">{progressPercentage}%</div>
              <div className="text-blue-100 text-sm">Tamamlandı</div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-2 mb-4">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="text-center text-sm text-blue-100 mb-6">
              {completedLessons} / {totalLessons} ders tamamlandı
            </div>
            
            <Button 
              onClick={startLearning}
              className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3"
            >
              {progressPercentage > 0 ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Kaldığın Yerden Devam Et
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Öğrenmeye Başla
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modül Listesi */}
      <div className="space-y-4">
        {modules.map((module, moduleIndex) => (
          <div key={module.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Modül Header */}
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleModule(module.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold">
                      {moduleIndex + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{module.title}</h3>
                    {module.description && (
                      <p className="text-gray-600 text-sm">{module.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {module.lessons?.length || 0} ders
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(module.duration_minutes || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Tamamlanma Durumu */}
                  <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm text-gray-500">
                      {Math.floor(Math.random() * (module.lessons?.length || 0))} / {module.lessons?.length || 0}
                    </span>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  
                  {/* Açılır/Kapanır İkon */}
                  {expandedModules.has(module.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Dersler Listesi */}
            {expandedModules.has(module.id) && (
              <div className="border-t border-gray-100">
                <div className="p-6 pt-0">
                  <div className="space-y-3 mt-6">
                    {module.lessons?.map((lesson, lessonIndex) => {
                      const LessonIcon = getLessonIcon(lesson.type);
                      const isCompleted = Math.random() > 0.5; // Mock completion status
                      
                      return (
                        <div 
                          key={lesson.id}
                          className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                          onClick={() => goToLesson(lesson.id)}
                        >
                          {/* Ders Numarası ve Durum */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                              {lessonIndex + 1}
                            </div>
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                          
                          {/* Ders Bilgileri */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <LessonIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {getLessonTypeText(lesson.type)}
                              </span>
                              {lesson.is_free && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                  Ücretsiz
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {lesson.title}
                            </h4>
                            {lesson.description && (
                              <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                            )}
                          </div>
                          
                          {/* Süre ve Aksiyon */}
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(lesson.duration_minutes || 0)}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alt Navigasyon */}
      <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={() => router.push('/courses')}
          className="flex items-center gap-2"
        >
          ← Kurslarıma Dön
        </Button>
        
        <Button
          onClick={startLearning}
          className="flex items-center gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          {progressPercentage > 0 ? 'Devam Et' : 'Başla'}
        </Button>
      </div>
    </DashboardLayout>
  );
}