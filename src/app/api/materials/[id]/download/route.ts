/**
 * MATERIAL DOWNLOAD API
 * Secure download endpoint with permission checks and usage tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SupabaseStorageService } from '@/lib/storage/supabase-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const materialId = params.id;

    if (!materialId) {
      return NextResponse.json(
        { success: false, error: 'Material ID is required' }, 
        { status: 400 }
      );
    }

    // Get download URL with permission check
    const downloadResult = await SupabaseStorageService.downloadMaterial(
      materialId,
      user.id
    );

    if (!downloadResult.success) {
      const statusCode = downloadResult.error === 'Access denied' ? 403 : 404;
      return NextResponse.json(
        { success: false, error: downloadResult.error }, 
        { status: statusCode }
      );
    }

    // Return download URL (client will handle the actual download)
    return NextResponse.json({
      success: true,
      download_url: downloadResult.url,
      expires_in: 3600 // 1 hour
    });

  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' }, 
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const materialId = params.id;
    const body = await request.json();
    const { action } = body;

    // Handle different actions
    switch (action) {
      case 'mark-completed':
        // Mark material as completed for progress tracking
        const { error: completionError } = await supabase
          .from('user_material_progress')
          .upsert({
            user_id: user.id,
            material_id: materialId,
            completed_at: new Date().toISOString(),
            progress_percentage: 100
          });

        if (completionError) {
          console.error('Error marking material as completed:', completionError);
          return NextResponse.json(
            { success: false, error: 'Failed to update progress' }, 
            { status: 500 }
          );
        }

        // Get course info for progress calculation
        const { data: material } = await supabase
          .from('course_materials')
          .select(`
            course_id,
            courses!course_id(title)
          `)
          .eq('id', materialId)
          .single();

        if (material) {
          // Send real-time progress update
          await supabase
            .channel('user-progress')
            .send({
              type: 'broadcast',
              event: 'material-completed',
              payload: {
                user_id: user.id,
                course_id: material.course_id,
                course_title: material.courses?.title,
                material_id: materialId,
                timestamp: new Date().toISOString()
              }
            });
        }

        return NextResponse.json({
          success: true,
          message: 'Material marked as completed'
        });

      case 'update-progress':
        // Update material progress (for videos, documents, etc.)
        const { progress_percentage } = body;
        
        if (typeof progress_percentage !== 'number' || progress_percentage < 0 || progress_percentage > 100) {
          return NextResponse.json(
            { success: false, error: 'Invalid progress percentage' }, 
            { status: 400 }
          );
        }

        const { error: progressError } = await supabase
          .from('user_material_progress')
          .upsert({
            user_id: user.id,
            material_id: materialId,
            progress_percentage,
            last_accessed_at: new Date().toISOString(),
            ...(progress_percentage === 100 && { completed_at: new Date().toISOString() })
          });

        if (progressError) {
          console.error('Error updating material progress:', progressError);
          return NextResponse.json(
            { success: false, error: 'Failed to update progress' }, 
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Progress updated successfully'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' }, 
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Material action API error:', error);
    return NextResponse.json(
      { success: false, error: 'Action failed' }, 
      { status: 500 }
    );
  }
}