/**
 * ADMIN COURSE MANAGEMENT API
 * Real-time course creation that students can immediately see
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all courses with enrollment stats
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        enrollments(count),
        profiles!instructor_id(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ 
      courses: courses || [],
      success: true 
    });

  } catch (error) {
    console.error('Error fetching admin courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      slug, 
      price, 
      level, 
      duration_minutes,
      instructor_id,
      is_published = false 
    } = body;

    // Validate required fields
    if (!title || !description || !slug) {
      return NextResponse.json(
        { error: 'Title, description, and slug are required' }, 
        { status: 400 }
      );
    }

    // Create the course
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        slug,
        price: price || 0,
        level: level || 'beginner',
        duration_minutes: duration_minutes || 0,
        instructor_id: instructor_id || user.id,
        is_published,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // If published, send real-time notification to all students
    if (is_published && course) {
      await supabase
        .channel('course-notifications')
        .send({
          type: 'broadcast',
          event: 'new-course',
          payload: {
            course_id: course.id,
            title: course.title,
            message: `Yeni kurs yayınlandı: ${course.title}`,
            timestamp: new Date().toISOString()
          }
        });
    }

    return NextResponse.json({ 
      course,
      success: true,
      message: 'Course created successfully' 
    });

  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, 
      title, 
      description, 
      slug, 
      price, 
      level, 
      duration_minutes,
      instructor_id,
      is_published 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' }, 
        { status: 400 }
      );
    }

    // Get current course state for comparison
    const { data: currentCourse } = await supabase
      .from('courses')
      .select('is_published, title')
      .eq('id', id)
      .single();

    // Update the course
    const { data: course, error } = await supabase
      .from('courses')
      .update({
        title,
        description,
        slug,
        price,
        level,
        duration_minutes,
        instructor_id,
        is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If course was just published (state change), notify students
    if (is_published && !currentCourse?.is_published && course) {
      await supabase
        .channel('course-notifications')
        .send({
          type: 'broadcast',
          event: 'course-published',
          payload: {
            course_id: course.id,
            title: course.title,
            message: `Kurs yayınlandı: ${course.title}`,
            timestamp: new Date().toISOString()
          }
        });
    }

    return NextResponse.json({ 
      course,
      success: true,
      message: 'Course updated successfully' 
    });

  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' }, 
      { status: 500 }
    );
  }
}