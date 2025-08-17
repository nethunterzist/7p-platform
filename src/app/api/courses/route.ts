import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/courses - Get user's enrolled courses
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's enrolled courses
    const { data: userCourses, error: coursesError } = await supabase
      .from('user_courses')
      .select(`
        *,
        course:courses (
          id,
          title,
          slug,
          description,
          short_description,
          thumbnail_url,
          level,
          duration_hours,
          total_lessons,
          rating,
          instructors (
            display_name,
            avatar_url
          ),
          course_categories (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false, nullsFirst: false })
      .order('enrolled_at', { ascending: false });

    if (coursesError) {
      console.error('Courses fetch error:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    return NextResponse.json({ courses: userCourses || [] });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}