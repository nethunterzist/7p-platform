import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CourseService } from '@/services/course-service';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/courses/stats - Get course statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-course-stats', {
      max: 20,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const instructorId = url.searchParams.get('instructor_id');

    // Check permissions
    if (instructorId && instructorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get stats for instructor or admin
    const finalInstructorId = session.user.role === 'admin' ? instructorId || undefined : session.user.id;
    
    const stats = await CourseService.getCourseStats(finalInstructorId);

    const response = {
      success: true,
      data: stats
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching course stats:', error);

    const response = {
      success: false,
      message: error.message || 'Failed to fetch statistics'
    };

    return NextResponse.json(response, { status: 500 });
  }
}