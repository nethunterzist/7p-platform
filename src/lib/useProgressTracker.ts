"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ProgressUpdate {
  lessonId: string;
  progressPercentage: number;
  timeSpent?: number;
}

interface AnalyticsEvent {
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  eventData?: any;
}

interface UseProgressTrackerReturn {
  updateProgress: (update: ProgressUpdate) => Promise<void>;
  trackEvent: (event: AnalyticsEvent) => Promise<void>;
  markLessonComplete: (lessonId: string, timeSpent?: number) => Promise<void>;
  startSession: () => Promise<string>;
  endSession: (sessionId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useProgressTracker(): UseProgressTrackerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize session on hook mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const sessionId = await startSession();
        setCurrentSessionId(sessionId);
      } catch (err) {
        console.error('Failed to initialize session:', err);
      }
    };

    initSession();

    // End session on unmount
    return () => {
      if (currentSessionId) {
        endSession(currentSessionId);
      }
    };
  }, []);

  const updateProgress = useCallback(async ({ 
    lessonId, 
    progressPercentage, 
    timeSpent = 0 
  }: ProgressUpdate) => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('📊 Updating progress:', { lessonId, progressPercentage, timeSpent });

      // Update or insert progress
      const { data, error: upsertError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          progress_percentage: Math.min(100, Math.max(0, progressPercentage)),
          time_spent: timeSpent,
          last_accessed: new Date().toISOString(),
          completed_at: progressPercentage >= 100 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ Progress update error:', upsertError);
        throw new Error(`Failed to update progress: ${upsertError.message}`);
      }

      console.log('✅ Progress updated successfully:', data);

      // Track analytics event
      await trackEvent({
        eventType: progressPercentage >= 100 ? 'lesson_complete' : 'progress_update',
        resourceType: 'lesson',
        resourceId: lessonId,
        eventData: {
          progress_percentage: progressPercentage,
          time_spent: timeSpent,
          completed: progressPercentage >= 100
        }
      });

    } catch (err: any) {
      console.error('❌ Progress update error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const trackEvent = useCallback(async ({ 
    eventType, 
    resourceType, 
    resourceId, 
    eventData = {} 
  }: AnalyticsEvent) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('Cannot track event: User not authenticated');
        return;
      }

      console.log('📈 Tracking event:', { eventType, resourceType, resourceId });

      // Insert analytics event
      const { error: insertError } = await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          resource_type: resourceType,
          resource_id: resourceId,
          event_data: eventData,
          session_id: currentSessionId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Analytics tracking error:', insertError);
        // Don't throw error for analytics failures
        return;
      }

      console.log('✅ Event tracked successfully');

    } catch (err: any) {
      console.error('❌ Event tracking error:', err);
      // Don't throw error for analytics failures
    }
  }, [currentSessionId]);

  const markLessonComplete = useCallback(async (lessonId: string, timeSpent = 0) => {
    await updateProgress({
      lessonId,
      progressPercentage: 100,
      timeSpent
    });
  }, [updateProgress]);

  const startSession = useCallback(async (): Promise<string> => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('🎯 Starting new session for user:', user.id);

      // Create new session
      const { data, error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_start: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Session start error:', insertError);
        throw new Error(`Failed to start session: ${insertError.message}`);
      }

      console.log('✅ Session started:', data.id);
      return data.id;

    } catch (err: any) {
      console.error('❌ Session start error:', err);
      throw err;
    }
  }, []);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      if (!sessionId) return;

      console.log('⏹️ Ending session:', sessionId);

      // Update session end time
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('❌ Session end error:', updateError);
        return;
      }

      console.log('✅ Session ended successfully');

    } catch (err: any) {
      console.error('❌ Session end error:', err);
    }
  }, []);

  return {
    updateProgress,
    trackEvent,
    markLessonComplete,
    startSession,
    endSession,
    loading,
    error
  };
}

// Utility function to track page views - simplified to avoid session conflicts
export function usePageTracking() {
  const trackPageView = useCallback(async (pageName: string, pageData?: any) => {
    try {
      // Get current user without creating a session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('Cannot track page view: User not authenticated');
        return;
      }

      console.log('📈 Tracking page view:', pageName);

      // Direct analytics insert without session dependency
      const { error: insertError } = await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_type: 'page_view',
          resource_type: 'page',
          resource_id: pageName,
          event_data: {
            page_name: pageName,
            timestamp: new Date().toISOString(),
            ...pageData
          },
          session_id: null, // No session dependency
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Page view tracking error:', insertError);
        // Don't throw error for analytics failures
        return;
      }

      console.log('✅ Page view tracked successfully');

    } catch (err: any) {
      console.error('❌ Page view tracking error:', err);
      // Don't throw error for analytics failures
    }
  }, []); // No dependencies to prevent re-creation

  return { trackPageView };
}

// Utility function to track quiz events
export function useQuizTracking() {
  const { trackEvent, updateProgress } = useProgressTracker();

  const trackQuizStart = useCallback(async (quizId: string, lessonId: string) => {
    await trackEvent({
      eventType: 'quiz_start',
      resourceType: 'quiz',
      resourceId: quizId,
      eventData: {
        lesson_id: lessonId,
        started_at: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackQuizComplete = useCallback(async (
    quizId: string, 
    lessonId: string, 
    score: number, 
    timeSpent: number
  ) => {
    // Track quiz completion
    await trackEvent({
      eventType: 'quiz_complete',
      resourceType: 'quiz',
      resourceId: quizId,
      eventData: {
        lesson_id: lessonId,
        score,
        time_spent: timeSpent,
        completed_at: new Date().toISOString()
      }
    });

    // Update lesson progress if quiz passed
    if (score >= 70) { // Assuming 70% is passing grade
      await updateProgress({
        lessonId,
        progressPercentage: 100,
        timeSpent
      });
    }
  }, [trackEvent, updateProgress]);

  return {
    trackQuizStart,
    trackQuizComplete
  };
}