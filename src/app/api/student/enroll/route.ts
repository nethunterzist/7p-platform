/**
 * STUDENT ENROLLMENT API
 * Real-time enrollment that admin can immediately see
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: 'Course ID is required' }, 
        { status: 400 }
      );
    }

    // Check if course exists and is published
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price, is_published')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' }, 
        { status: 404 }
      );
    }

    if (!course.is_published) {
      return NextResponse.json(
        { error: 'Course is not available for enrollment' }, 
        { status: 400 }
      );
    }

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .single();

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json(
          { error: 'Already enrolled in this course' }, 
          { status: 400 }
        );
      }
      
      // If cancelled, reactivate
      if (existingEnrollment.status === 'cancelled') {
        const { data: enrollment, error } = await supabase
          .from('enrollments')
          .update({
            status: 'active',
            enrolled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEnrollment.id)
          .select(`
            *,
            profiles!user_id(name, email),
            courses!course_id(title, slug)
          `)
          .single();

        if (error) throw error;
        
        // Send real-time notification to admin
        await notifyAdmin(supabase, 'enrollment', enrollment);
        
        return NextResponse.json({ 
          enrollment,
          success: true,
          message: 'Successfully re-enrolled in course' 
        });
      }
    }

    // Create new enrollment
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: course_id,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        profiles!user_id(name, email),
        courses!course_id(title, slug)
      `)
      .single();

    if (error) throw error;

    // Send real-time notification to admin
    await notifyAdmin(supabase, 'enrollment', enrollment);

    return NextResponse.json({ 
      enrollment,
      success: true,
      message: 'Successfully enrolled in course' 
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in course' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's enrollments
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses!course_id(
          id, title, description, slug, price, level,
          duration_minutes, is_published
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ 
      enrollments: enrollments || [],
      success: true 
    });

  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const course_id = searchParams.get('course_id');

    if (!course_id) {
      return NextResponse.json(
        { error: 'Course ID is required' }, 
        { status: 400 }
      );
    }

    // Find the enrollment
    const { data: enrollment, error: findError } = await supabase
      .from('enrollments')
      .select(`
        *,
        profiles!user_id(name, email),
        courses!course_id(title, slug)
      `)
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .eq('status', 'active')
      .single();

    if (findError || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' }, 
        { status: 404 }
      );
    }

    // Cancel the enrollment
    const { data: cancelledEnrollment, error } = await supabase
      .from('enrollments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id)
      .select(`
        *,
        profiles!user_id(name, email),
        courses!course_id(title, slug)
      `)
      .single();

    if (error) throw error;

    // Send real-time notification to admin
    await notifyAdmin(supabase, 'unenrollment', cancelledEnrollment);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully unenrolled from course' 
    });

  } catch (error) {
    console.error('Error unenrolling from course:', error);
    return NextResponse.json(
      { error: 'Failed to unenroll from course' }, 
      { status: 500 }
    );
  }
}

// Helper function to notify admin of enrollment changes
async function notifyAdmin(supabase: any, type: 'enrollment' | 'unenrollment', enrollment: any) {
  try {
    const message = type === 'enrollment' 
      ? `${enrollment.profiles?.name || 'User'} enrolled in "${enrollment.courses?.title}"`
      : `${enrollment.profiles?.name || 'User'} unenrolled from "${enrollment.courses?.title}"`;

    // Send real-time notification
    await supabase
      .channel('admin-notifications')
      .send({
        type: 'broadcast',
        event: type,
        payload: {
          enrollment_id: enrollment.id,
          user_id: enrollment.user_id,
          course_id: enrollment.course_id,
          user_name: enrollment.profiles?.name,
          user_email: enrollment.profiles?.email,
          course_title: enrollment.courses?.title,
          message,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}