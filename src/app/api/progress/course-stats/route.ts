import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    // Verify user is instructor or admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is instructor of this course or admin
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!course || (course.instructor_id !== user.id && profile?.role !== 'admin')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get course enrollment statistics
    const { data: enrollments, count: totalEnrollments } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        enrolled_at,
        status,
        user_profiles (
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('course_id', courseId)
      .eq('status', 'active');

    // Get course materials
    const { data: materials } = await supabase
      .from('course_materials')
      .select('id, title, type')
      .eq('course_id', courseId)
      .order('created_at');

    const materialIds = materials?.map(m => m.id) || [];

    // Get progress statistics for all enrolled users
    const { data: allProgress } = await supabase
      .from('user_material_progress')
      .select(`
        user_id,
        material_id,
        progress_percentage,
        completed_at,
        started_at
      `)
      .eq('course_id', courseId)
      .in('user_id', enrollments?.map(e => e.user_id) || []);

    // Calculate statistics
    const stats = await calculateCourseStats(
      enrollments || [],
      materials || [],
      allProgress || []
    );

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentActivity } = await supabase
      .from('user_material_progress')
      .select(`
        user_id,
        material_id,
        progress_percentage,
        updated_at,
        course_materials (
          title,
          type
        ),
        user_profiles (
          full_name
        )
      `)
      .eq('course_id', courseId)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(20);

    // Get completion timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: completionTimeline } = await supabase
      .from('user_material_progress')
      .select('completed_at')
      .eq('course_id', courseId)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .not('completed_at', 'is', null)
      .order('completed_at');

    // Calculate at-risk students (no activity in 7+ days or low progress)
    const atRiskStudents = await identifyAtRiskStudents(
      supabase,
      courseId,
      enrollments || []
    );

    return NextResponse.json({
      success: true,
      data: {
        overview: stats.overview,
        studentProgress: stats.studentProgress,
        materialStats: stats.materialStats,
        recentActivity: recentActivity || [],
        completionTimeline: processCompletionTimeline(completionTimeline || []),
        atRiskStudents,
        topPerformers: stats.topPerformers
      }
    });

  } catch (error) {
    console.error('Course stats error:', error);
    return NextResponse.json({
      error: 'Failed to fetch course statistics',
      details: error.message
    }, { status: 500 });
  }
}

async function calculateCourseStats(enrollments: any[], materials: any[], allProgress: any[]) {
  const totalStudents = enrollments.length;
  const totalMaterials = materials.length;
  
  // Group progress by student
  const studentProgressMap = new Map();
  
  enrollments.forEach(enrollment => {
    studentProgressMap.set(enrollment.user_id, {
      student: enrollment,
      materials: new Map(),
      totalProgress: 0,
      completedMaterials: 0,
      overallCompletion: 0
    });
  });

  // Fill progress data
  allProgress.forEach(progress => {
    const studentData = studentProgressMap.get(progress.user_id);
    if (studentData) {
      studentData.materials.set(progress.material_id, progress);
      if (progress.progress_percentage >= 100) {
        studentData.completedMaterials++;
      }
      studentData.totalProgress += progress.progress_percentage;
    }
  });

  // Calculate completion rates for each student
  let activeStudents = 0;
  let completedStudents = 0;
  const studentProgress = [];

  studentProgressMap.forEach((data, userId) => {
    data.overallCompletion = totalMaterials > 0 
      ? Math.round(data.totalProgress / totalMaterials) 
      : 0;
    
    if (data.overallCompletion > 0) activeStudents++;
    if (data.overallCompletion >= 100) completedStudents++;
    
    studentProgress.push({
      userId,
      studentName: data.student.user_profiles?.full_name || 'Unknown',
      studentEmail: data.student.user_profiles?.email,
      enrolledAt: data.student.enrolled_at,
      overallCompletion: data.overallCompletion,
      completedMaterials: data.completedMaterials,
      totalMaterials,
      lastActivity: getLastActivity(data.materials)
    });
  });

  // Sort by completion and recent activity
  studentProgress.sort((a, b) => {
    if (b.overallCompletion !== a.overallCompletion) {
      return b.overallCompletion - a.overallCompletion;
    }
    return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
  });

  // Get top performers (top 5 or top 20%, whichever is smaller)
  const topPerformersCount = Math.min(5, Math.ceil(totalStudents * 0.2));
  const topPerformers = studentProgress.slice(0, topPerformersCount);

  // Calculate material statistics
  const materialStats = materials.map(material => {
    const materialProgress = allProgress.filter(p => p.material_id === material.id);
    const completedCount = materialProgress.filter(p => p.progress_percentage >= 100).length;
    const averageProgress = materialProgress.length > 0
      ? materialProgress.reduce((sum, p) => sum + p.progress_percentage, 0) / materialProgress.length
      : 0;

    return {
      materialId: material.id,
      title: material.title,
      type: material.type,
      completedCount,
      averageProgress: Math.round(averageProgress),
      completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
    };
  });

  const overview = {
    totalStudents,
    activeStudents,
    completedStudents,
    completionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
    averageProgress: totalStudents > 0 
      ? Math.round(studentProgress.reduce((sum, s) => sum + s.overallCompletion, 0) / totalStudents)
      : 0,
    totalMaterials
  };

  return {
    overview,
    studentProgress,
    materialStats,
    topPerformers
  };
}

function getLastActivity(materialsMap: Map<any, any>) {
  let lastActivity = null;
  materialsMap.forEach(progress => {
    const activityDate = progress.updated_at || progress.started_at;
    if (activityDate && (!lastActivity || new Date(activityDate) > new Date(lastActivity))) {
      lastActivity = activityDate;
    }
  });
  return lastActivity;
}

function processCompletionTimeline(completions: any[]) {
  const timeline = new Map();
  
  completions.forEach(completion => {
    const date = completion.completed_at.split('T')[0]; // Get date part
    timeline.set(date, (timeline.get(date) || 0) + 1);
  });

  return Array.from(timeline.entries())
    .map(([date, count]) => ({ date, completions: count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function identifyAtRiskStudents(supabase: any, courseId: string, enrollments: any[]) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const atRiskStudents = [];

  for (const enrollment of enrollments) {
    // Check for recent activity
    const { data: recentActivity } = await supabase
      .from('user_material_progress')
      .select('updated_at, progress_percentage')
      .eq('user_id', enrollment.user_id)
      .eq('course_id', courseId)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(1);

    // Calculate overall progress
    const courseProgress = await calculateCourseProgress(supabase, enrollment.user_id, courseId);
    
    // Risk factors
    const noRecentActivity = !recentActivity || recentActivity.length === 0;
    const lowProgress = courseProgress.overallCompletion < 30;
    const enrolledLongAgo = new Date(enrollment.enrolled_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

    if ((noRecentActivity && enrolledLongAgo) || (lowProgress && enrolledLongAgo)) {
      let riskScore = 0;
      const riskFactors = [];

      if (noRecentActivity) {
        riskScore += 40;
        riskFactors.push('No recent activity (7+ days)');
      }
      
      if (lowProgress) {
        riskScore += 30;
        riskFactors.push(`Low progress (${courseProgress.overallCompletion}%)`);
      }
      
      if (enrolledLongAgo) {
        riskScore += 20;
        riskFactors.push('Enrolled over 2 weeks ago');
      }

      if (courseProgress.overallCompletion === 0) {
        riskScore += 30;
        riskFactors.push('Never started course');
      }

      atRiskStudents.push({
        userId: enrollment.user_id,
        studentName: enrollment.user_profiles?.full_name || 'Unknown',
        studentEmail: enrollment.user_profiles?.email,
        riskScore: Math.min(100, riskScore),
        riskFactors,
        overallCompletion: courseProgress.overallCompletion,
        lastActivity: recentActivity?.[0]?.updated_at || enrollment.enrolled_at,
        interventionRecommendations: generateInterventions(riskScore, riskFactors)
      });
    }
  }

  return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
}

// Helper function from business logic
async function calculateCourseProgress(supabase: any, userId: string, courseId: string) {
  try {
    const { data: materials } = await supabase
      .from('course_materials')
      .select('id')
      .eq('course_id', courseId);

    if (!materials || materials.length === 0) {
      return { overallCompletion: 0, completedMaterials: 0, totalMaterials: 0 };
    }

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

function generateInterventions(riskScore: number, riskFactors: string[]) {
  const interventions = [];
  
  if (riskScore > 70) {
    interventions.push({
      type: 'urgent',
      action: 'Schedule immediate 1-on-1 call',
      priority: 'high'
    });
  }
  
  if (riskFactors.includes('No recent activity (7+ days)')) {
    interventions.push({
      type: 'engagement',
      action: 'Send motivational email with progress summary',
      priority: 'medium'
    });
  }
  
  if (riskFactors.includes('Never started course')) {
    interventions.push({
      type: 'onboarding',
      action: 'Provide guided tour and initial lesson recommendation',
      priority: 'high'
    });
  }
  
  if (riskFactors.some(f => f.includes('Low progress'))) {
    interventions.push({
      type: 'support',
      action: 'Assign study buddy or provide additional resources',
      priority: 'medium'
    });
  }

  return interventions;
}