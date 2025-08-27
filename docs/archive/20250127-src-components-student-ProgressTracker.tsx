'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Clock, 
  Target,
  Zap,
  Award,
  Calendar,
  PlayCircle,
  CheckCircle,
  Book,
  BarChart3
} from 'lucide-react';

interface ProgressTrackerProps {
  courseId: string;
  userId?: string;
}

interface CourseProgress {
  overallCompletion: number;
  completedMaterials: number;
  totalMaterials: number;
}

interface MaterialProgress {
  material_id: string;
  progress_percentage: number;
  started_at: string;
  completed_at: string | null;
  course_materials: {
    title: string;
    type: string;
    file_path: string;
  };
}

interface UserStats {
  currentXP: number;
  currentLevel: number;
  streakDays: number;
  totalAchievements: number;
}

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  points_earned: number;
  earned_at: string;
}

interface RealtimeUpdate {
  progressValue: number;
  courseProgress: CourseProgress;
  xpEarned: number;
  achievements: Achievement[];
  levelUp: boolean;
}

export default function ProgressTracker({ courseId, userId }: ProgressTrackerProps) {
  const [courseProgress, setCourseProgress] = useState<CourseProgress>({
    overallCompletion: 0,
    completedMaterials: 0,
    totalMaterials: 0
  });
  
  const [materialProgress, setMaterialProgress] = useState<MaterialProgress[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    currentXP: 0,
    currentLevel: 1,
    streakDays: 0,
    totalAchievements: 0
  });
  
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeUpdate, setRealtimeUpdate] = useState<RealtimeUpdate | null>(null);
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadProgressData();
    setupRealtimeSubscription();
    
    return () => {
      // Cleanup subscriptions
      supabase.removeAllChannels();
    };
  }, [courseId, userId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);

      // Load course progress
      const progressParams = new URLSearchParams({ courseId });
      if (userId) progressParams.set('userId', userId);

      const progressResponse = await fetch(`/api/progress/update?${progressParams}`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        if (progressData.success) {
          setCourseProgress(progressData.data.courseProgress);
          setMaterialProgress(progressData.data.materialProgress);
        }
      }

      // Load user stats
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadUserStats(userId || user.id);
        await loadRecentAchievements(userId || user.id);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (targetUserId: string) => {
    try {
      // Get user profile with XP and level
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_xp, current_level')
        .eq('id', targetUserId)
        .single();

      // Get learning streak
      const { data: streak } = await supabase
        .from('learning_streaks')
        .select('current_streak')
        .eq('user_id', targetUserId)
        .single();

      // Get achievements count
      const { count: achievementsCount } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact' })
        .eq('user_id', targetUserId);

      setUserStats({
        currentXP: profile?.current_xp || 0,
        currentLevel: profile?.current_level || 1,
        streakDays: streak?.current_streak || 0,
        totalAchievements: achievementsCount || 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentAchievements = async (targetUserId: string) => {
    try {
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', targetUserId)
        .order('earned_at', { ascending: false })
        .limit(5);

      setRecentAchievements(achievements || []);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const setupRealtimeSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUserId = userId || user.id;

    // Subscribe to progress updates
    const channel = supabase
      .channel(`progress_${targetUserId}`)
      .on('broadcast', { event: 'progress_updated' }, (payload) => {
        handleRealtimeUpdate(payload.payload);
      })
      .subscribe();

    // Subscribe to achievements
    supabase
      .channel('user_achievements')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'user_achievements',
          filter: `user_id=eq.${targetUserId}`
        }, 
        (payload) => {
          if (payload.new) {
            setRecentAchievements(prev => [payload.new as Achievement, ...prev.slice(0, 4)]);
            setUserStats(prev => ({ ...prev, totalAchievements: prev.totalAchievements + 1 }));
          }
        }
      )
      .subscribe();
  };

  const handleRealtimeUpdate = (update: RealtimeUpdate) => {
    setRealtimeUpdate(update);
    setShowUpdateAnimation(true);

    // Update course progress
    setCourseProgress(update.courseProgress);

    // Update user stats if XP earned
    if (update.xpEarned > 0) {
      setUserStats(prev => ({
        ...prev,
        currentXP: prev.currentXP + update.xpEarned,
        currentLevel: update.levelUp ? prev.currentLevel + 1 : prev.currentLevel
      }));
    }

    // Show animation for 3 seconds
    setTimeout(() => {
      setShowUpdateAnimation(false);
      setRealtimeUpdate(null);
    }, 3000);
  };

  const calculateXPToNextLevel = () => {
    const currentLevel = userStats.currentLevel;
    const xpForNextLevel = Math.pow(currentLevel, 2) * 1000;
    const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 1000;
    const xpProgress = userStats.currentXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    
    return { xpProgress, xpNeeded, percentage: (xpProgress / xpNeeded) * 100 };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const xpToNextLevel = calculateXPToNextLevel();

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Card>
          <CardContent className="h-32 bg-gray-200 rounded"></CardContent>
        </Card>
        <Card>
          <CardContent className="h-48 bg-gray-200 rounded"></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Update Animation */}
      {showUpdateAnimation && realtimeUpdate && (
        <Card className="border-green-500 bg-green-50 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Progress Updated!</p>
                <p className="text-sm text-green-600">
                  +{realtimeUpdate.xpEarned} XP earned • {realtimeUpdate.courseProgress.overallCompletion}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Course Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getProgressColor(courseProgress.overallCompletion)}`}>
                {courseProgress.overallCompletion}%
              </div>
              <p className="text-sm text-gray-600">Overall Progress</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {courseProgress.completedMaterials}/{courseProgress.totalMaterials}
              </div>
              <p className="text-sm text-gray-600">Materials Completed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {userStats.streakDays}
              </div>
              <p className="text-sm text-gray-600">Day Streak</p>
            </div>
          </div>
          
          <Progress 
            value={courseProgress.overallCompletion} 
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Level & XP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">Level {userStats.currentLevel}</div>
                <p className="text-sm text-gray-600">{userStats.currentXP} total XP</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Level {userStats.currentLevel + 1}</span>
                <span>{Math.round(xpToNextLevel.percentage)}%</span>
              </div>
              <Progress value={xpToNextLevel.percentage} className="h-2" />
              <p className="text-xs text-gray-500">
                {xpToNextLevel.xpProgress}/{xpToNextLevel.xpNeeded} XP
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold">{userStats.totalAchievements}</div>
                <p className="text-sm text-gray-600">Total Earned</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Trophy className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            
            {recentAchievements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recent</h4>
                <div className="space-y-1">
                  {recentAchievements.slice(0, 2).map((achievement) => (
                    <Badge key={achievement.id} variant="secondary" className="text-xs">
                      {achievement.achievement_name} (+{achievement.points_earned} pts)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Material Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Material Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {materialProgress.length > 0 ? (
              materialProgress.map((material) => (
                <div key={material.material_id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {material.progress_percentage >= 100 ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : material.progress_percentage > 0 ? (
                      <PlayCircle className="h-6 w-6 text-blue-500" />
                    ) : (
                      <PlayCircle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate">
                        {material.course_materials.title}
                      </h4>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {material.course_materials.type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={material.progress_percentage} 
                        className="flex-1 h-2"
                      />
                      <span className="text-sm text-gray-600 min-w-0">
                        {Math.round(material.progress_percentage)}%
                      </span>
                    </div>
                    
                    {material.started_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {material.completed_at 
                          ? `Completed ${formatTimeAgo(material.completed_at)}`
                          : `Started ${formatTimeAgo(material.started_at)}`
                        }
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Book className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No materials accessed yet</p>
                <p className="text-sm">Start learning to see your progress here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}