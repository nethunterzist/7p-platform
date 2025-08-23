import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { 
      materialId, 
      progressType, 
      progressValue, 
      metadata = {} 
    } = body;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get material info to validate course enrollment
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select(`
        id,
        course_id,
        title,
        type,
        file_path,
        courses!inner (
          id,
          title,
          instructor_id
        )
      `)
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check if user is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, enrolled_at')
      .eq('course_id', material.course_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'Not enrolled in this course' 
      }, { status: 403 });
    }

    // Calculate progress based on type
    let calculatedProgress = 0;
    const now = new Date().toISOString();

    switch (progressType) {
      case 'video_watched':
        // progressValue should be percentage watched (0-100)
        calculatedProgress = Math.min(100, Math.max(0, progressValue));
        break;
      
      case 'document_read':
        // progressValue should be pages read / total pages * 100
        calculatedProgress = Math.min(100, Math.max(0, progressValue));
        break;
      
      case 'quiz_completed':
        // progressValue should be score percentage
        calculatedProgress = progressValue >= 60 ? 100 : progressValue;
        break;
      
      case 'assignment_submitted':
        calculatedProgress = 100;
        break;
      
      default:
        calculatedProgress = Math.min(100, Math.max(0, progressValue));
    }

    // Check existing progress
    const { data: existingProgress } = await supabase
      .from('user_material_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('material_id', materialId)
      .single();

    let progressData;

    if (existingProgress) {
      // Update existing progress (only if new progress is higher)
      if (calculatedProgress > existingProgress.progress_percentage) {
        const { data: updated, error: updateError } = await supabase
          .from('user_material_progress')
          .update({
            progress_percentage: calculatedProgress,
            completed_at: calculatedProgress >= 100 ? now : null,
            updated_at: now,
            metadata: {
              ...existingProgress.metadata,
              ...metadata,
              last_activity: progressType,
              last_activity_at: now
            }
          })
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }
        progressData = updated;
      } else {
        // No update needed, return existing progress
        progressData = existingProgress;
      }
    } else {
      // Create new progress record
      const { data: created, error: createError } = await supabase
        .from('user_material_progress')
        .insert({
          user_id: user.id,
          material_id: materialId,
          course_id: material.course_id,
          progress_percentage: calculatedProgress,
          started_at: now,
          completed_at: calculatedProgress >= 100 ? now : null,
          metadata: {
            ...metadata,
            first_activity: progressType,
            first_activity_at: now,
            last_activity: progressType,
            last_activity_at: now
          }
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      progressData = created;
    }

    // Calculate XP based on progress type and business logic
    let xpEarned = 0;
    if (calculatedProgress >= 100) {
      switch (material.type) {
        case 'video':
          xpEarned = 50 + (metadata.score >= 90 ? 20 : 0);
          break;
        case 'document':
          xpEarned = 30;
          break;
        case 'quiz':
          xpEarned = 30 + (calculatedProgress * 0.5);
          break;
        case 'assignment':
          xpEarned = 100;
          break;
        default:
          xpEarned = 25;
      }
    }

    // Update user XP and level if material completed
    if (calculatedProgress >= 100 && xpEarned > 0) {
      await updateUserXP(supabase, user.id, xpEarned, progressType);
    }

    // Calculate course progress
    const courseProgress = await calculateCourseProgress(supabase, user.id, material.course_id);

    // Send real-time notification to user
    await sendProgressNotification(supabase, {
      userId: user.id,
      courseId: material.course_id,
      materialId,
      progressType,
      progressValue: calculatedProgress,
      courseProgress,
      xpEarned
    });

    // Check for achievements
    const achievements = await checkAchievements(supabase, user.id, {
      progressType,
      progressValue: calculatedProgress,
      courseProgress,
      materialType: material.type
    });

    return NextResponse.json({
      success: true,
      data: {
        progress: progressData,
        courseProgress,
        xpEarned,
        achievements,
        levelUp: false // Will be calculated in updateUserXP
      }
    });

  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({
      error: 'Failed to update progress',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to update user XP and level
async function updateUserXP(supabase: any, userId: string, xpEarned: number, activityType: string) {
  try {
    // Get current user stats
    const { data: userStats } = await supabase
      .from('user_profiles')
      .select('current_xp, current_level')
      .eq('id', userId)
      .single();

    const currentXP = userStats?.current_xp || 0;
    const newXP = currentXP + xpEarned;
    
    // Calculate new level using exponential formula from business logic
    const newLevel = Math.floor(Math.sqrt(newXP / 1000)) + 1;
    const leveledUp = newLevel > (userStats?.current_level || 1);

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        current_xp: newXP,
        current_level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Log XP activity
    await supabase
      .from('user_xp_logs')
      .insert({
        user_id: userId,
        activity_type: activityType,
        xp_earned: xpEarned,
        total_xp: newXP,
        level_after: newLevel,
        created_at: new Date().toISOString()
      });

    return { leveledUp, newLevel, newXP };
  } catch (error) {
    console.error('XP update error:', error);
    return { leveledUp: false, newLevel: 1, newXP: 0 };
  }
}

// Helper function to calculate course progress
async function calculateCourseProgress(supabase: any, userId: string, courseId: string) {
  try {
    // Get all materials for the course
    const { data: materials } = await supabase
      .from('course_materials')
      .select('id')
      .eq('course_id', courseId);

    if (!materials || materials.length === 0) {
      return { overallCompletion: 0, completedMaterials: 0, totalMaterials: 0 };
    }

    // Get user progress for these materials
    const { data: progress } = await supabase
      .from('user_material_progress')
      .select('material_id, progress_percentage')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    const progressMap = new Map();
    progress?.forEach(p => {
      progressMap.set(p.material_id, p.progress_percentage);
    });

    let totalProgress = 0;
    let completedCount = 0;

    materials.forEach(material => {
      const materialProgress = progressMap.get(material.id) || 0;
      totalProgress += materialProgress;
      if (materialProgress >= 100) {
        completedCount++;
      }
    });

    const overallCompletion = Math.round(totalProgress / materials.length);

    return {
      overallCompletion,
      completedMaterials: completedCount,
      totalMaterials: materials.length
    };
  } catch (error) {
    console.error('Course progress calculation error:', error);
    return { overallCompletion: 0, completedMaterials: 0, totalMaterials: 0 };
  }
}

// Helper function to send real-time notifications
async function sendProgressNotification(supabase: any, data: any) {
  try {
    const { userId, courseId, progressValue, courseProgress, xpEarned } = data;

    // Insert notification
    await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type: 'progress_update',
        title: 'Progress Updated!',
        message: `You've made progress! ${progressValue}% complete${xpEarned > 0 ? ` (+${xpEarned} XP)` : ''}`,
        metadata: {
          course_id: courseId,
          progress_value: progressValue,
          course_progress: courseProgress,
          xp_earned: xpEarned
        },
        read: false,
        created_at: new Date().toISOString()
      });

    // Send real-time update via Supabase realtime
    await supabase
      .channel(`progress_${userId}`)
      .send({
        type: 'broadcast',
        event: 'progress_updated',
        payload: data
      });

  } catch (error) {
    console.error('Notification sending error:', error);
  }
}

// Helper function to check for achievements
async function checkAchievements(supabase: any, userId: string, progressData: any) {
  try {
    const achievements = [];
    
    // Check completion-based achievements
    if (progressData.progressValue >= 100) {
      achievements.push({
        type: 'material_completed',
        name: `${progressData.materialType} Master`,
        description: `Completed a ${progressData.materialType}`,
        points: 25
      });
    }

    // Check course progress milestones
    const { courseProgress } = progressData;
    if (courseProgress.overallCompletion >= 50 && courseProgress.overallCompletion < 60) {
      achievements.push({
        type: 'course_halfway',
        name: 'Halfway Hero',
        description: 'Reached 50% course completion',
        points: 50
      });
    }

    if (courseProgress.overallCompletion >= 100) {
      achievements.push({
        type: 'course_completed',
        name: 'Course Champion',
        description: 'Completed entire course',
        points: 500
      });
    }

    // Award achievements
    for (const achievement of achievements) {
      await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_type: achievement.type,
          achievement_name: achievement.name,
          achievement_description: achievement.description,
          points_earned: achievement.points,
          earned_at: new Date().toISOString()
        });
    }

    return achievements;
  } catch (error) {
    console.error('Achievement check error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    // Get current user if userId not provided
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      targetUserId = user.id;
    }

    // Calculate and return course progress
    const courseProgress = await calculateCourseProgress(supabase, targetUserId, courseId);

    // Get detailed material progress
    const { data: materialProgress } = await supabase
      .from('user_material_progress')
      .select(`
        material_id,
        progress_percentage,
        started_at,
        completed_at,
        course_materials (
          title,
          type,
          file_path
        )
      `)
      .eq('user_id', targetUserId)
      .eq('course_id', courseId)
      .order('started_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        courseProgress,
        materialProgress: materialProgress || []
      }
    });

  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch progress',
      details: error.message
    }, { status: 500 });
  }
}