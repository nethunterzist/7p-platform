import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProgressService } from '@/services/progress-service';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/student/progress/course/[courseId] - Get course-specific progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
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
    const rateLimitResult = await rateLimit.check(request, 'api-course-progress', {
      max: 100,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const courseId = params.courseId;
    const url = new URL(request.url);
    const includeAnalytics = url.searchParams.get('include_analytics') === 'true';

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    // Verify user is enrolled in the course
    // This is handled within the service, but we could add explicit check here

    // Get course progress
    const courseProgress = await ProgressService.getCourseProgress(session.user.id, courseId);

    let responseData: any = courseProgress;

    // Include learning analytics if requested
    if (includeAnalytics) {
      const analytics = await ProgressService.generateLearningAnalytics(session.user.id, courseId);
      responseData = {
        ...courseProgress,
        analytics
      };
    }

    // Include user achievements for this course
    const achievements = await ProgressService.getUserAchievements(session.user.id, courseId);
    responseData.achievements = achievements;

    // Include level system
    const levelSystem = await ProgressService.getUserLevelSystem(session.user.id);
    responseData.level_system = levelSystem;

    const response = {
      success: true,
      data: responseData
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching course progress:', error);

    if (error.message.includes('not found') || error.message.includes('not enrolled')) {
      return NextResponse.json(
        { success: false, message: 'Course not found or not enrolled' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch course progress'
    };

    return NextResponse.json(response, { status: 500 });
  }
}