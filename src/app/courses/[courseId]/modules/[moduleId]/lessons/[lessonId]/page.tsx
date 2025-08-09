"use client";

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import QuizTaker from '@/components/QuizTaker';
import LessonQA from '@/components/LessonQA';
import ProgressTracker from '@/components/ProgressTracker';
import { useProgressTracker, usePageTracking, useQuizTracking } from '@/lib/useProgressTracker';
import { useLessonProgressTracking, useEducationAnalytics } from '@/hooks/useEducationAnalytics';

interface Course {
  id: string;
  name: string;
}

interface Module {
  id: string;
  title: string;
  course_id: string;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  content: string | null;
  type: string;
  position: number;
}

interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface LessonCompletion {
  lesson_id: string;
  user_id: string;
  completed_at: string;
}

export default function LessonViewerPage({ 
  params 
}: { 
  params: Promise<{ courseId: string; moduleId: string; lessonId: string }> 
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [lessonStartTime, setLessonStartTime] = useState<Date>(new Date());
  const [showProgress, setShowProgress] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Progress tracking hooks (existing)
  const { updateProgress, trackEvent } = useProgressTracker();
  const { trackPageView } = usePageTracking();
  const { trackQuizStart, trackQuizComplete } = useQuizTracking();

  // GA4 education analytics hooks
  const { 
    trackLessonStart, 
    trackLessonCompletion, 
    trackQuizStart: trackGA4QuizStart, 
    trackQuizCompletion 
  } = useEducationAnalytics({
    userId: currentUser?.id,
    userRole: currentUser?.user_metadata?.role || 'student',
    subscriptionTier: currentUser?.user_metadata?.subscription_tier || 'free'
  });

  // Automatic lesson progress tracking
  const { markLessonComplete } = useLessonProgressTracking(
    lesson && course && module ? {
      courseId: course.id,
      courseName: course.name,
      courseCategory: 'general', // You might want to add this to course data
      lessonId: lesson.id,
      lessonName: lesson.title,
      lessonType: lesson.type as 'video' | 'text' | 'quiz' | 'assignment',
      lessonDuration: undefined, // Could be calculated or stored
    } : {} as any,
    {
      userId: currentUser?.id,
      userRole: currentUser?.user_metadata?.role || 'student',
      subscriptionTier: currentUser?.user_metadata?.subscription_tier || 'free'
    }
  );

  useEffect(() => {
    fetchLessonData();
  }, [resolvedParams.lessonId]);

  useEffect(() => {
    // Track page view and lesson start when lesson is loaded
    if (lesson && course && module && currentUser) {
      setLessonStartTime(new Date());
      
      // Existing Supabase tracking
      trackEvent({
        eventType: 'lesson_start',
        resourceType: 'lesson',
        resourceId: lesson.id,
        eventData: {
          lesson_title: lesson.title,
          lesson_type: lesson.type,
          course_name: course.name,
          module_title: module.title
        }
      });

      trackPageView(`lesson_${lesson.id}`, {
        lesson_title: lesson.title,
        course_id: course.id,
        module_id: module.id
      });

      // GA4 Analytics tracking
      trackLessonStart({
        courseId: course.id,
        courseName: course.name,
        courseCategory: 'general',
        lessonId: lesson.id,
        lessonName: lesson.title,
        lessonType: lesson.type as 'video' | 'text' | 'quiz' | 'assignment',
        lessonDuration: undefined,
      });

      // Start progress tracking (25% for viewing)
      updateProgress({
        lessonId: lesson.id,
        progressPercentage: 25,
        timeSpent: 0
      }).catch(err => console.error('Progress update failed:', err));
    }
  }, [lesson, course, module, currentUser, trackLessonStart]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Please login to view lessons');
        return;
      }
      
      // Store user for analytics
      setCurrentUser(user);

      // Check enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', resolvedParams.courseId)
        .eq('user_id', user.id)
        .single();

      if (enrollmentError || !enrollmentData) {
        setError('You must be enrolled in this course to view lessons');
        return;
      }

      // Fetch course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('id', resolvedParams.courseId)
        .single();

      if (courseError) {
        setError('Course not found');
        return;
      }
      setCourse(courseData);

      // Fetch module info
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('id, title, course_id')
        .eq('id', resolvedParams.moduleId)
        .single();

      if (moduleError) {
        setError('Module not found');
        return;
      }
      setModule(moduleData);

      // Fetch lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', resolvedParams.lessonId)
        .single();

      if (lessonError) {
        setError('Lesson not found');
        return;
      }
      setLesson(lessonData);

      // Fetch lesson materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', resolvedParams.lessonId)
        .order('created_at');

      if (!materialsError && materialsData) {
        setMaterials(materialsData);
      }

      // Check if lesson is completed
      const { data: completionData, error: completionError } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('lesson_id', resolvedParams.lessonId)
        .eq('user_id', user.id)
        .single();

      if (!completionError && completionData) {
        setIsCompleted(true);
      }

    } catch (err: any) {
      console.error('Lesson viewer error:', err);
      setError('Error loading lesson data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      setMarkingComplete(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Authentication required');
        return;
      }

      // Calculate time spent
      const timeSpentSeconds = Math.floor((new Date().getTime() - lessonStartTime.getTime()) / 1000);

      if (isCompleted) {
        // Remove completion
        const { error: deleteError } = await supabase
          .from('lesson_completions')
          .delete()
          .eq('lesson_id', resolvedParams.lessonId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error removing completion:', deleteError);
          setError('Failed to update completion status');
          return;
        }

        // Update progress to 75% (not completed)
        await updateProgress({
          lessonId: resolvedParams.lessonId,
          progressPercentage: 75,
          timeSpent: timeSpentSeconds
        });

        setIsCompleted(false);
      } else {
        // Mark as complete
        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert({
            lesson_id: resolvedParams.lessonId,
            user_id: user.id,
            completed_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error marking complete:', insertError);
          setError('Failed to mark lesson as complete');
          return;
        }

        // Update progress to 100%
        await updateProgress({
          lessonId: resolvedParams.lessonId,
          progressPercentage: 100,
          timeSpent: timeSpentSeconds
        });

        // Track completion event (existing Supabase tracking)
        await trackEvent({
          eventType: 'lesson_complete',
          resourceType: 'lesson',
          resourceId: resolvedParams.lessonId,
          eventData: {
            time_spent: timeSpentSeconds,
            lesson_type: lesson?.type,
            completed_manually: true
          }
        });

        // GA4 Analytics tracking for lesson completion
        if (lesson && course) {
          trackLessonCompletion({
            courseId: course.id,
            courseName: course.name,
            courseCategory: 'general',
            lessonId: lesson.id,
            lessonName: lesson.title,
            lessonType: lesson.type as 'video' | 'text' | 'quiz' | 'assignment',
            completionTime: timeSpentSeconds,
          });
        }

        setIsCompleted(true);
      }

    } catch (err: any) {
      console.error('Completion toggle error:', err);
      setError('Error updating completion status');
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleQuizComplete = async (passed: boolean, score?: number, timeSpent?: number) => {
    if (passed && !isCompleted) {
      // Automatically mark the lesson as complete when quiz is passed
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError('Authentication required');
          return;
        }

        const totalTimeSpent = timeSpent || Math.floor((new Date().getTime() - lessonStartTime.getTime()) / 1000);

        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert({
            lesson_id: resolvedParams.lessonId,
            user_id: user.id,
            completed_at: new Date().toISOString()
          });

        if (!insertError) {
          // Update progress to 100%
          await updateProgress({
            lessonId: resolvedParams.lessonId,
            progressPercentage: 100,
            timeSpent: totalTimeSpent
          });

          // Track quiz completion
          if (lesson) {
            await trackQuizComplete(
              `quiz_${lesson.id}`, 
              lesson.id, 
              score || 100, 
              totalTimeSpent
            );
          }

          setIsCompleted(true);
        }
      } catch (err) {
        console.error('Error auto-completing lesson:', err);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'text': return '📖';
      case 'quiz': return '❓';
      case 'assignment': return '📝';
      default: return '📄';
    }
  };

  const renderLessonContent = () => {
    if (!lesson) return null;

    switch (lesson.type) {
      case 'video':
        // Check if content is a YouTube URL or video URL
        if (lesson.content && (lesson.content.includes('youtube.com') || lesson.content.includes('youtu.be'))) {
          const videoId = lesson.content.includes('youtu.be') 
            ? lesson.content.split('youtu.be/')[1]?.split('?')[0]
            : lesson.content.split('v=')[1]?.split('&')[0];
          
          if (videoId) {
            return (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={lesson.title}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            );
          }
        }
        return (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🎥</div>
            <p className="text-gray-600">Video content will be displayed here</p>
            {lesson.content && (
              <div className="mt-4 text-sm text-gray-500">
                Video URL: {lesson.content}
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="prose max-w-none">
            <div 
              className="whitespace-pre-wrap text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: lesson.content || 'No content available' }}
            />
          </div>
        );

      case 'quiz':
        return (
          <div>
            {lesson.content && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-700">
                  <strong>Quiz Instructions:</strong>
                  <div className="mt-2">{lesson.content}</div>
                </div>
              </div>
            )}
            <QuizTaker 
              lessonId={lesson.id} 
              onQuizComplete={handleQuizComplete}
            />
          </div>
        );

      case 'assignment':
        return (
          <div className="bg-yellow-50 rounded-lg p-8">
            <div className="text-4xl mb-4 text-center">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment</h3>
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {lesson.content || 'Assignment details will be provided here'}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {lesson.content || 'No content available'}
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading lesson...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-600 mb-4">❌ {error}</div>
          <div className="space-y-3">
            <button 
              onClick={fetchLessonData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push(`/courses/${resolvedParams.courseId}`)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg w-full"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => router.push('/dashboard')}
                className="hover:text-blue-600"
              >
                Dashboard
              </button>
              <span>→</span>
              <button
                onClick={() => router.push(`/courses/${resolvedParams.courseId}`)}
                className="hover:text-blue-600"
              >
                {course?.name}
              </button>
              <span>→</span>
              <span className="text-gray-900">{module?.title}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowProgress(!showProgress)}
                className="text-gray-600 hover:text-blue-600 transition-colors"
                title="Toggle Progress View"
              >
                📊
              </button>
              
              <button
                onClick={handleMarkComplete}
                disabled={markingComplete}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {markingComplete ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span>Updating...</span>
                  </div>
                ) : isCompleted ? (
                  '✓ Completed'
                ) : (
                  'Mark Complete'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Tracker - Show when toggled */}
        {showProgress && lesson && (
          <div className="mb-8">
            <ProgressTracker 
              lessonId={lesson.id}
              courseId={resolvedParams.courseId}
              showDetailed={false}
            />
          </div>
        )}

        {/* Lesson Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{getTypeIcon(lesson?.type || '')}</span>
                <span className="text-sm text-gray-500 capitalize px-2 py-1 bg-gray-100 rounded">
                  {lesson?.type}
                </span>
                {isCompleted && (
                  <span className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                    ✓ Completed
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {lesson?.title}
              </h1>
              {lesson?.content && lesson.type !== 'video' && (
                <p className="text-gray-600 text-sm">
                  Preview: {lesson.content.slice(0, 150)}...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Content</h2>
          {renderLessonContent()}
        </div>

        {/* Lesson Materials */}
        {materials.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📎 Lesson Materials ({materials.length})
            </h2>
            <div className="grid gap-4">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {material.title}
                      </h3>
                      {material.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {material.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>{material.file_name}</span>
                        <span>{formatFileSize(material.file_size)}</span>
                        <span>{material.file_type}</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A Section */}
        <div className="mt-8">
          <LessonQA lessonId={resolvedParams.lessonId} />
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push(`/courses/${resolvedParams.courseId}`)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ← Back to Course
          </button>
        </div>
      </div>
    </div>
  );
}