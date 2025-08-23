import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProgressService } from '@/services/progress-service';
import { progressQuerySchema } from '@/lib/validation/progress';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/student/progress - Get overall student progress
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
    const rateLimitResult = await rateLimit.check(request, 'api-student-progress', {
      max: 100,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // Validate query parameters
    const validatedQuery = progressQuerySchema.parse(queryParams);

    let progressData;

    if (validatedQuery.course_id) {
      // Get progress for specific course
      progressData = await ProgressService.getCourseProgress(session.user.id, validatedQuery.course_id);
      
      // Include analytics if requested
      if (validatedQuery.include_analytics) {
        const analytics = await ProgressService.generateLearningAnalytics(
          session.user.id, 
          validatedQuery.course_id
        );
        progressData = { ...progressData, analytics };
      }
    } else {
      // Get overall progress across all courses
      progressData = await ProgressService.getStudentProgress(session.user.id);
    }

    const response = {
      success: true,
      data: progressData
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching student progress:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch progress'
    };

    return NextResponse.json(response, { status: 500 });
  }
}