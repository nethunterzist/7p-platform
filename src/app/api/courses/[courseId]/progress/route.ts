import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/courses/[courseId]/progress - Get user's progress for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courseId = params.courseId;

    // Get user's course enrollment
    const { data: userCourse, error: userCourseError } = await supabase
      .from('user_courses')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (userCourseError) {
      if (userCourseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
      }
      console.error('User course fetch error:', userCourseError);
      return NextResponse.json({ error: 'Failed to fetch enrollment' }, { status: 500 });
    }

    // Get all lessons in the course
    const { data: lessons, error: lessonsError } = await supabase
      .from('course_lessons')
      .select(`
        id,
        title,
        course_modules!inner (
          course_id
        )
      `)
      .eq('course_modules.course_id', courseId);

    if (lessonsError) {
      console.error('Lessons fetch error:', lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    // Get user's progress for all lessons
    const lessonIds = lessons.map(lesson => lesson.id);
    const { data: lessonProgress, error: progressError } = await supabase
      .from('user_lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);

    if (progressError) {
      console.error('Progress fetch error:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    return NextResponse.json({
      userCourse,
      lessonProgress: lessonProgress || []
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/courses/[courseId]/progress - Update course progress
export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courseId = params.courseId;
    const body = await request.json();
    const { progress_percentage, status, completed_lessons } = body;

    // Verify enrollment
    const { data: userCourse, error: enrollmentError } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      if (enrollmentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
      }
      console.error('Enrollment check error:', enrollmentError);
      return NextResponse.json({ error: 'Failed to verify enrollment' }, { status: 500 });
    }

    // Update course progress
    const updateData: any = {
      last_accessed: new Date().toISOString()
    };

    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;
    if (status !== undefined) updateData.status = status;
    if (completed_lessons !== undefined) updateData.completed_lessons = completed_lessons;

    const { data: updatedCourse, error: updateError } = await supabase
      .from('user_courses')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Course progress update error:', updateError);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      userCourse: updatedCourse,
      message: 'Progress updated successfully' 
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}