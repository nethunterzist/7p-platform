import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/courses/[courseId]/enroll - Enroll user in course
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courseId = params.courseId;

    // Check if course exists and is published
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price')
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

    // Check if user is already enrolled
    const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentCheckError && enrollmentCheckError.code !== 'PGRST116') {
      console.error('Enrollment check error:', enrollmentCheckError);
      return NextResponse.json({ error: 'Failed to check enrollment status' }, { status: 500 });
    }

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 });
    }

    // For now, simulate enrollment (later integrate with Stripe for paid courses)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('user_courses')
      .insert({
        user_id: user.id,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
        status: 'active',
        progress_percentage: 0
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Enrollment error:', enrollmentError);
      return NextResponse.json({ error: 'Failed to enroll in course' }, { status: 500 });
    }

    // TODO: For paid courses, integrate with Stripe payment processing here
    // if (course.price > 0) {
    //   // Create Stripe payment session
    // }

    return NextResponse.json({ 
      success: true, 
      enrollment,
      message: 'Successfully enrolled in course' 
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}