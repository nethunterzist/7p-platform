"use client";

import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Award,
  BookOpen,
  CheckCircle2,
  Calendar,
  Zap,
  BarChart3
} from 'lucide-react';
import { Course, Module, Lesson } from '@/types/course';

interface ProgressTrackerProps {
  course: Course;
  modules: Module[];
  currentLesson?: Lesson;
  className?: string;
}

interface ProgressStats {
  totalLessons: number;
  completedLessons: number;
  totalDuration: number;
  watchedDuration: number;
  averageScore?: number;
  streak: number;
  estimatedTimeLeft: number;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  course,
  modules,
  currentLesson,
  className = ""
}) => {
  // Mock progress data - gerçek uygulamada API'den gelecek
  const getProgressStats = (): ProgressStats => {
    const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);
    const completedLessons = Math.floor(totalLessons * 0.65); // 65% tamamlandı
    const totalDuration = modules.reduce((acc, module) => acc + (module.duration_minutes || 0), 0);
    const watchedDuration = Math.floor(totalDuration * 0.65);
    
    return {
      totalLessons,
      completedLessons,
      totalDuration,
      watchedDuration,
      averageScore: 87,
      streak: 12,
      estimatedTimeLeft: totalDuration - watchedDuration
    };
  };

  const stats = getProgressStats();
  const progressPercentage = Math.round((stats.completedLessons / stats.totalLessons) * 100);
  const timeProgressPercentage = Math.round((stats.watchedDuration / stats.totalDuration) * 100);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}dk`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}sa ${remainingMinutes}dk` : `${hours}sa`;
  };

  const getEstimatedCompletion = () => {
    const avgLessonTime = stats.totalDuration / stats.totalLessons;
    const remainingLessons = stats.totalLessons - stats.completedLessons;
    const remainingMinutes = remainingLessons * avgLessonTime;
    const daysLeft = Math.ceil(remainingMinutes / (30 * 7)); // Günde 30dk varsayımı
    
    return daysLeft;
  };

  const getProgressLevel = () => {
    if (progressPercentage >= 90) return { level: 'Uzman', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (progressPercentage >= 70) return { level: 'İleri', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (progressPercentage >= 40) return { level: 'Orta', color: 'text-green-600', bg: 'bg-green-100' };
    return { level: 'Başlangıç', color: 'text-orange-600', bg: 'bg-orange-100' };
  };

  const progressLevel = getProgressLevel();
  const estimatedDays = getEstimatedCompletion();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          İlerleme Durumu
        </h3>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${progressLevel.bg} ${progressLevel.color}`}>
          {progressLevel.level} Seviye
        </div>
      </div>

      {/* Main Progress Ring */}
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercentage / 100)}`}
              className="text-blue-600 transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Progress Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-900">{progressPercentage}%</div>
            <div className="text-sm text-gray-500">Tamamlandı</div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          {stats.completedLessons} / {stats.totalLessons} ders tamamlandı
        </div>
      </div>

      {/* Progress Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Watched Time */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">İzlenen Süre</span>
          </div>
          <div className="text-xl font-bold text-blue-900">{formatDuration(stats.watchedDuration)}</div>
          <div className="text-xs text-blue-600 mt-1">
            {formatDuration(stats.totalDuration)} toplamdan
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${timeProgressPercentage}%` }}
            />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Ortalama Puan</span>
          </div>
          <div className="text-xl font-bold text-green-900">
            {stats.averageScore || '--'}
            {stats.averageScore && <span className="text-sm">/100</span>}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Quiz sonuçları
          </div>
        </div>

        {/* Learning Streak */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Öğrenme Serisi</span>
          </div>
          <div className="text-xl font-bold text-orange-900">{stats.streak} gün</div>
          <div className="text-xs text-orange-600 mt-1">
            Ardışık gün
          </div>
        </div>

        {/* Estimated Time */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Tahmini Süre</span>
          </div>
          <div className="text-xl font-bold text-purple-900">{estimatedDays} gün</div>
          <div className="text-xs text-purple-600 mt-1">
            Tamamlamaya
          </div>
        </div>
      </div>

      {/* Module Progress */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Modül İlerlemesi
        </h4>
        
        {modules.slice(0, 4).map((module, index) => {
          // Mock progress for each module
          const moduleProgress = Math.floor(Math.random() * 100);
          const isCompleted = moduleProgress === 100;
          
          return (
            <div key={module.id} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate pr-2">
                    {index + 1}. {module.title}
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {moduleProgress}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${moduleProgress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        
        {modules.length > 4 && (
          <div className="text-center pt-2">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              +{modules.length - 4} modül daha
            </button>
          </div>
        )}
      </div>

      {/* Achievement */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 text-sm">İyi gidiyorsun! 🎉</h5>
              <p className="text-xs text-gray-600 mt-0.5">
                {progressPercentage >= 50 
                  ? `Kursun yarısını tamamladın! ${100 - progressPercentage}% kaldı.`
                  : `Harika başlangıç! Devam et, hedefine yaklaşıyorsun.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;