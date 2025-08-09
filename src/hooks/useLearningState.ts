"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { learningStateManager } from '@/lib/recommendations';

export interface LearningState {
  courseId: string;
  lessonId: string;
  progress: number;
  position: number; // Video/content position in seconds
  notes: string[];
  bookmarks: number[];
  completedActivities: string[];
  timeSpent: number; // Total time spent in seconds
  lastAccessed: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    timestamp: string;
  };
  preferences: {
    playbackSpeed: number;
    autoplay: boolean;
    quality: 'auto' | 'high' | 'medium' | 'low';
    subtitles: boolean;
    subtitleLanguage: string;
  };
}

export interface LearningSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  activitiesCompleted: number;
  score?: number;
  engagement: {
    clicks: number;
    scrollDepth: number;
    pauseCount: number;
    replayCount: number;
    notesCount: number;
    seekCount: number;
    fullscreenTime: number;
  };
  context: {
    device: 'mobile' | 'tablet' | 'desktop';
    location?: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    networkType?: string;
    batteryLevel?: number;
  };
}

export interface UseLearningStateOptions {
  userId: string;
  courseId: string;
  lessonId: string;
  autoSave?: boolean;
  saveInterval?: number; // milliseconds
  syncToCloud?: boolean;
  enableAnalytics?: boolean;
}

export interface UseLearningStateReturn {
  // State
  learningState: LearningState | null;
  isLoading: boolean;
  isSaving: boolean;
  isOffline: boolean;
  lastSynced: Date | null;
  
  // Actions
  updateProgress: (progress: number) => void;
  updatePosition: (position: number) => void;
  addNote: (note: string, timestamp?: number) => void;
  removeNote: (index: number) => void;
  addBookmark: (timestamp: number) => void;
  removeBookmark: (timestamp: number) => void;
  completeActivity: (activityId: string) => void;
  updatePreferences: (preferences: Partial<LearningState['preferences']>) => void;
  
  // Session management
  startSession: () => string;
  endSession: (sessionId: string) => void;
  trackEngagement: (event: keyof LearningSession['engagement']) => void;
  
  // Synchronization
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  
  // Analytics
  getSessionStats: () => {
    totalTime: number;
    averageSessionLength: number;
    completionRate: number;
    engagementScore: number;
  };
  
  // Offline support
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  getOfflineCapability: () => boolean;
}

export function useLearningState({
  userId,
  courseId,
  lessonId,
  autoSave = true,
  saveInterval = 10000, // 10 seconds
  syncToCloud = true,
  enableAnalytics = true
}: UseLearningStateOptions): UseLearningStateReturn {
  
  const [learningState, setLearningState] = useState<LearningState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [currentSession, setCurrentSession] = useState<LearningSession | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionStartRef = useRef<Date>(new Date());
  const engagementRef = useRef<LearningSession['engagement']>({
    clicks: 0,
    scrollDepth: 0,
    pauseCount: 0,
    replayCount: 0,
    notesCount: 0,
    seekCount: 0,
    fullscreenTime: 0
  });

  // Initialize learning state
  useEffect(() => {
    loadState();
    
    // Online/offline detection
    const handleOnline = () => {
      setIsOffline(false);
      if (syncToCloud) {
        syncWithCloud();
      }
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Auto-save interval
    if (autoSave) {
      const interval = setInterval(() => {
        if (learningState && !isSaving) {
          saveState();
        }
      }, saveInterval);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId, courseId, lessonId, autoSave, saveInterval, syncToCloud]);

  // Save state when component unmounts or user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (learningState && !isSaving) {
        // Use sync version for page unload
        navigator.sendBeacon('/api/learning-state/save', JSON.stringify({
          userId,
          courseId,
          lessonId,
          state: learningState
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [learningState, isSaving, userId, courseId, lessonId]);

  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to load from learning state manager first
      const savedState = await learningStateManager.resumeLearning(userId, courseId, lessonId);
      
      if (savedState) {
        setLearningState(savedState);
      } else {
        // Initialize default state
        const defaultState: LearningState = {
          courseId,
          lessonId,
          progress: 0,
          position: 0,
          notes: [],
          bookmarks: [],
          completedActivities: [],
          timeSpent: 0,
          lastAccessed: new Date().toISOString(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString()
          },
          preferences: {
            playbackSpeed: 1.0,
            autoplay: true,
            quality: 'auto',
            subtitles: false,
            subtitleLanguage: 'en'
          }
        };
        setLearningState(defaultState);
      }
      
      setLastSynced(new Date());
    } catch (error) {
      console.error('Error loading learning state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, courseId, lessonId]);

  const saveState = useCallback(async () => {
    if (!learningState || isSaving) return;
    
    try {
      setIsSaving(true);
      
      const updatedState = {
        ...learningState,
        lastAccessed: new Date().toISOString(),
        timeSpent: learningState.timeSpent + Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000)
      };
      
      // Save locally first
      await learningStateManager.saveLearningState(
        userId,
        courseId,
        lessonId,
        {
          progress: updatedState.progress,
          position: updatedState.position,
          notes: updatedState.notes,
          bookmarks: updatedState.bookmarks,
          completedActivities: updatedState.completedActivities,
          timeSpent: updatedState.timeSpent
        }
      );
      
      // If online and sync enabled, save to cloud
      if (!isOffline && syncToCloud) {
        const { error } = await supabase
          .from('learning_states')
          .upsert({
            user_id: userId,
            course_id: courseId,
            lesson_id: lessonId,
            state: updatedState,
            updated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error saving to cloud:', error);
          // Add to offline queue
          setOfflineQueue(prev => [...prev, { action: 'save', data: updatedState }]);
        } else {
          setLastSynced(new Date());
        }
      } else {
        // Add to offline queue
        setOfflineQueue(prev => [...prev, { action: 'save', data: updatedState }]);
      }
      
      setLearningState(updatedState);
      sessionStartRef.current = new Date();
      
    } catch (error) {
      console.error('Error saving learning state:', error);
    } finally {
      setIsSaving(false);
    }
  }, [learningState, isSaving, userId, courseId, lessonId, isOffline, syncToCloud]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveState();
    }, 1000); // Debounce saves by 1 second
  }, [saveState]);

  const updateProgress = useCallback((progress: number) => {
    setLearningState(prev => prev ? { ...prev, progress } : null);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);

  const updatePosition = useCallback((position: number) => {
    setLearningState(prev => prev ? { ...prev, position } : null);
    if (autoSave) debouncedSave();
    
    // Track seek events for analytics
    if (enableAnalytics && learningState && Math.abs(position - learningState.position) > 5) {
      trackEngagement('seekCount');
    }
  }, [autoSave, debouncedSave, enableAnalytics, learningState]);

  const addNote = useCallback((note: string, timestamp?: number) => {
    const noteWithTimestamp = {
      content: note,
      timestamp: timestamp || learningState?.position || 0,
      createdAt: new Date().toISOString()
    };
    
    setLearningState(prev => prev ? {
      ...prev,
      notes: [...prev.notes, JSON.stringify(noteWithTimestamp)]
    } : null);
    
    if (autoSave) debouncedSave();
    if (enableAnalytics) trackEngagement('notesCount');
  }, [learningState?.position, autoSave, debouncedSave, enableAnalytics]);

  const removeNote = useCallback((index: number) => {
    setLearningState(prev => prev ? {
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index)
    } : null);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);

  const addBookmark = useCallback((timestamp: number) => {
    setLearningState(prev => prev ? {
      ...prev,
      bookmarks: [...prev.bookmarks, timestamp].sort((a, b) => a - b)
    } : null);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);

  const removeBookmark = useCallback((timestamp: number) => {
    setLearningState(prev => prev ? {
      ...prev,
      bookmarks: prev.bookmarks.filter(b => b !== timestamp)
    } : null);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);

  const completeActivity = useCallback((activityId: string) => {
    setLearningState(prev => prev ? {
      ...prev,
      completedActivities: [...prev.completedActivities, activityId]
    } : null);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);

  const updatePreferences = useCallback((preferences: Partial<LearningState['preferences']>) => {
    setLearningState(prev => prev ? {
      ...prev,
      preferences: { ...prev.preferences, ...preferences }
    } : null);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);

  const startSession = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: LearningSession = {
      sessionId,
      startTime: new Date().toISOString(),
      duration: 0,
      activitiesCompleted: 0,
      engagement: { ...engagementRef.current },
      context: {
        device: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
        timeOfDay: getTimeOfDay(),
        networkType: (navigator as any).connection?.effectiveType,
        batteryLevel: (navigator as any).getBattery ? undefined : undefined // Will be set if available
      }
    };
    
    setCurrentSession(session);
    sessionStartRef.current = new Date();
    
    // Reset engagement tracking
    engagementRef.current = {
      clicks: 0,
      scrollDepth: 0,
      pauseCount: 0,
      replayCount: 0,
      notesCount: 0,
      seekCount: 0,
      fullscreenTime: 0
    };
    
    return sessionId;
  }, []);

  const endSession = useCallback((sessionId: string) => {
    if (currentSession && currentSession.sessionId === sessionId) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - new Date(currentSession.startTime).getTime()) / 1000);
      
      const completedSession = {
        ...currentSession,
        endTime: endTime.toISOString(),
        duration,
        engagement: { ...engagementRef.current }
      };
      
      // Save session data for analytics
      if (enableAnalytics) {
        saveSessionData(completedSession);
      }
      
      setCurrentSession(null);
    }
  }, [currentSession, enableAnalytics]);

  const trackEngagement = useCallback((event: keyof LearningSession['engagement']) => {
    if (enableAnalytics) {
      engagementRef.current[event]++;
    }
  }, [enableAnalytics]);

  const syncWithCloud = useCallback(async () => {
    if (isOffline || offlineQueue.length === 0) return;
    
    try {
      // Process offline queue
      for (const item of offlineQueue) {
        if (item.action === 'save') {
          await supabase
            .from('learning_states')
            .upsert({
              user_id: userId,
              course_id: courseId,
              lesson_id: lessonId,
              state: item.data,
              updated_at: new Date().toISOString()
            });
        }
      }
      
      // Clear offline queue
      setOfflineQueue([]);
      setLastSynced(new Date());
      
    } catch (error) {
      console.error('Error syncing with cloud:', error);
    }
  }, [isOffline, offlineQueue, userId, courseId, lessonId]);

  const getSessionStats = useCallback(() => {
    // Mock implementation - would calculate from stored session data
    return {
      totalTime: learningState?.timeSpent || 0,
      averageSessionLength: 1200, // 20 minutes average
      completionRate: learningState?.progress || 0,
      engagementScore: 85
    };
  }, [learningState]);

  const enableOfflineMode = useCallback(() => {
    // Enable offline capabilities
    console.log('Offline mode enabled');
  }, []);

  const disableOfflineMode = useCallback(() => {
    // Disable offline capabilities
    console.log('Offline mode disabled');
  }, []);

  const getOfflineCapability = useCallback(() => {
    return 'serviceWorker' in navigator && 'caches' in window;
  }, []);

  // Helper functions
  const getTimeOfDay = (): LearningSession['context']['timeOfDay'] => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const saveSessionData = async (session: LearningSession) => {
    try {
      await supabase
        .from('learning_sessions')
        .insert({
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
          session_data: session,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  };

  return {
    // State
    learningState,
    isLoading,
    isSaving,
    isOffline,
    lastSynced,
    
    // Actions
    updateProgress,
    updatePosition,
    addNote,
    removeNote,
    addBookmark,
    removeBookmark,
    completeActivity,
    updatePreferences,
    
    // Session management
    startSession,
    endSession,
    trackEngagement,
    
    // Synchronization
    saveState,
    loadState,
    syncWithCloud,
    
    // Analytics
    getSessionStats,
    
    // Offline support
    enableOfflineMode,
    disableOfflineMode,
    getOfflineCapability
  };
}