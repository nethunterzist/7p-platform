"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProgress {
  id: string;
  lesson_id: string;
  progress_percentage: number;
  time_spent: number;
  started_at: string;
  completed_at?: string;
  last_accessed: string;
  lessons: {
    title: string;
    type: string;
    modules: {
      title: string;
      courses: {
        name: string;
      };
    };
  };
}

interface ProgressTrackerProps {
  userId?: string;
  lessonId?: string;
  courseId?: string;
  showDetailed?: boolean;
}

export default function ProgressTracker({ 
  userId, 
  lessonId, 
  courseId, 
  showDetailed = true 
}: ProgressTrackerProps) {
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overallStats, setOverallStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    totalTimeSpent: 0,
    averageProgress: 0
  });

  useEffect(() => {
    fetchProgress();
  }, [userId, lessonId, courseId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user if userId not provided
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }
        targetUserId = user.id;
      }

      console.log('🔍 Fetching progress for user:', targetUserId);

      // Build query based on filters
      let query = supabase
        .from('user_progress')
        .select(`
          *,
          lessons (
            title,
            type,
            modules (
              title,
              courses (
                name
              )
            )
          )
        `)
        .eq('user_id', targetUserId)
        .order('last_accessed', { ascending: false });

      // Apply filters
      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }

      if (courseId) {
        // Filter by course through joins
        query = query.eq('lessons.modules.course_id', courseId);
      }

      const { data: progressData, error: progressError } = await query;

      if (progressError) {
        console.error('❌ Progress fetch error:', progressError);
        setError(`Failed to load progress: ${progressError.message}`);
        return;
      }

      console.log('✅ Progress data fetched:', progressData?.length || 0, 'records');
      setProgress(progressData || []);

      // Calculate overall stats
      if (progressData && progressData.length > 0) {
        const totalLessons = progressData.length;
        const completedLessons = progressData.filter(p => p.progress_percentage === 100).length;
        const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.time_spent || 0), 0);
        const averageProgress = Math.round(
          progressData.reduce((sum, p) => sum + p.progress_percentage, 0) / totalLessons
        );

        setOverallStats({
          totalLessons,
          completedLessons,
          totalTimeSpent,
          averageProgress
        });
      }

    } catch (err: any) {
      console.error('❌ Progress tracker error:', err);
      setError(`Error loading progress: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressText = (percentage: number) => {
    if (percentage === 100) return 'Tamamlandı';
    if (percentage >= 75) return 'Neredeyse bitti';
    if (percentage >= 50) return 'Yarı yolda';
    if (percentage >= 25) return 'Başlangıç aşaması';
    return 'Henüz başlanmadı';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2">İlerleme yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium mb-2">İlerleme Yüklenemedi</p>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={fetchProgress}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📊 Genel İlerleme Özeti
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {overallStats.totalLessons}
            </div>
            <div className="text-sm text-gray-600">Toplam Ders</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {overallStats.completedLessons}
            </div>
            <div className="text-sm text-gray-600">Tamamlanan</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatTime(overallStats.totalTimeSpent)}
            </div>
            <div className="text-sm text-gray-600">Toplam Süre</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              %{overallStats.averageProgress}
            </div>
            <div className="text-sm text-gray-600">Ortalama İlerleme</div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Genel Tamamlanma Oranı
            </span>
            <span className="text-sm text-gray-600">
              %{overallStats.averageProgress}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(overallStats.averageProgress)}`}
              style={{ width: `${overallStats.averageProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Detailed Progress */}
      {showDetailed && progress.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              📚 Detaylı Ders İlerlemesi
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {progress.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {item.lessons.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      📖 {item.lessons.modules.courses.name} → {item.lessons.modules.title}
                    </p>
                    {item.lessons.type && (
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        item.lessons.type === 'quiz' 
                          ? 'bg-purple-100 text-purple-800'
                          : item.lessons.type === 'video'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.lessons.type === 'quiz' ? '🧩 Quiz' : 
                         item.lessons.type === 'video' ? '🎥 Video' : '📄 Metin'}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      %{item.progress_percentage}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getProgressText(item.progress_percentage)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(item.progress_percentage)}`}
                      style={{ width: `${item.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>⏱️ {formatTime(item.time_spent)}</span>
                    <span>🕒 {formatDate(item.last_accessed)}</span>
                  </div>
                  
                  {item.completed_at && (
                    <div className="flex items-center text-green-600">
                      <span>✅ {formatDate(item.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Progress Message */}
      {progress.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz İlerleme Yok
          </h3>
          <p className="text-gray-600">
            Öğrenmeye başladığınızda ilerlemeniz burada görünecek.
          </p>
        </div>
      )}
    </div>
  );
}