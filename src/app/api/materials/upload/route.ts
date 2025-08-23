/**
 * MATERIAL UPLOAD API
 * Secure file upload for course materials with validation and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SupabaseStorageService } from '@/lib/storage/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const description = formData.get('description') as string || '';

    if (!file || !courseId) {
      return NextResponse.json(
        { success: false, error: 'File and course ID are required' }, 
        { status: 400 }
      );
    }

    // Verify course exists and user has permission to upload
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' }, 
        { status: 404 }
      );
    }

    // Check if user is instructor or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isInstructor = course.instructor_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' }, 
        { status: 403 }
      );
    }

    // Initialize storage bucket if needed
    await SupabaseStorageService.initializeBucket();

    // Upload file
    const uploadResult = await SupabaseStorageService.uploadMaterial(
      file,
      courseId,
      user.id
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error }, 
        { status: 400 }
      );
    }

    // Add description if provided
    if (description && uploadResult.file) {
      await supabase
        .from('course_materials')
        .update({ description })
        .eq('id', uploadResult.file.id);
    }

    // Send real-time notification to enrolled students
    await supabase
      .channel('course-materials')
      .send({
        type: 'broadcast',
        event: 'new-material',
        payload: {
          course_id: courseId,
          course_title: course.title,
          material_id: uploadResult.file?.id,
          filename: uploadResult.file?.original_name,
          message: `Yeni materyal eklendi: ${uploadResult.file?.original_name}`,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: uploadResult.file
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' }, 
        { status: 400 }
      );
    }

    // Get course materials
    const materials = await SupabaseStorageService.getCourseMaterials(courseId);

    return NextResponse.json({
      success: true,
      materials
    });

  } catch (error) {
    console.error('Get materials API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch materials' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');

    if (!materialId) {
      return NextResponse.json(
        { success: false, error: 'Material ID is required' }, 
        { status: 400 }
      );
    }

    // Delete material
    const deleteResult = await SupabaseStorageService.deleteMaterial(materialId, user.id);

    if (!deleteResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete material or permission denied' }, 
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('Delete material API error:', error);
    return NextResponse.json(
      { success: false, error: 'Delete failed' }, 
      { status: 500 }
    );
  }
}