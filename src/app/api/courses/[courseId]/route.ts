import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/courses/[courseId] - Get specific course details
export async function GET(
  request: NextRequest, 
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId;

    // Get course with modules and lessons
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        instructors (
          display_name,
          avatar_url,
          bio,
          title
        ),
        course_categories (
          name,
          slug
        ),
        course_modules (
          id,
          title,
          description,
          order,
          course_lessons (
            id,
            title,
            description,
            video_url,
            duration_seconds,
            order,
            is_free,
            resources
          )
        )
      `)
      .eq('id', courseId)
      .eq('is_published', true)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      console.error('Course fetch error:', courseError);
      return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
    }

    // Get reviews for the course
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id,
        users:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.warn('Reviews fetch error:', reviewsError);
    }

    // Calculate course statistics
    const totalLessons = course.course_modules?.reduce(
      (acc: number, module: any) => acc + (module.course_lessons?.length || 0), 
      0
    ) || 0;

    const totalDuration = course.course_modules?.reduce(
      (acc: number, module: any) => 
        acc + (module.course_lessons?.reduce(
          (lessonAcc: number, lesson: any) => lessonAcc + (lesson.duration_seconds || 0),
          0
        ) || 0),
      0
    ) || 0;

    // Sort modules and lessons by order
    const sortedModules = course.course_modules?.map((module: any) => ({
      ...module,
      course_lessons: module.course_lessons?.sort((a: any, b: any) => a.order - b.order) || []
    })).sort((a: any, b: any) => a.order - b.order) || [];

    const enrichedCourse = {
      ...course,
      course_modules: sortedModules,
      total_lessons: totalLessons,
      total_duration_seconds: totalDuration,
      reviews: reviews || []
    };

    return NextResponse.json({ course: enrichedCourse });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}