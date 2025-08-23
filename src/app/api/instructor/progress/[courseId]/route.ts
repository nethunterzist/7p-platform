import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProgressService } from '@/services/progress-service';
import { instructorProgressQuerySchema } from '@/lib/validation/progress';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/instructor/progress/[courseId] - Get class progress overview for instructors
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
    const rateLimitResult = await rateLimit.check(request, 'api-instructor-progress', {
      max: 50,
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
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    // Validate query parameters
    const validatedQuery = instructorProgressQuerySchema.parse(queryParams);

    // Get instructor progress overview
    const progressOverview = await ProgressService.getInstructorProgressOverview(
      session.user.id,
      courseId
    );

    // Filter students based on status if specified
    let filteredData = progressOverview;
    if (validatedQuery.student_status !== 'all') {
      // This would require additional logic to filter students
      // For now, we'll return the complete overview
    }

    // Add period-specific analytics
    const analytics = {
      period: validatedQuery.period,
      trend_analysis: {
        enrollment_trend: 'increasing', // TODO: Calculate actual trend
        completion_trend: 'stable',
        engagement_trend: 'improving'
      },
      recent_activity: {
        new_enrollments_this_period: 0, // TODO: Calculate from enrollment dates
        completions_this_period: 0,
        average_session_duration: 0
      }
    };

    const response = {
      success: true,
      data: {
        course_overview: filteredData,
        analytics: validatedQuery.include_details ? analytics : undefined,
        recommendations: generateInstructorRecommendations(filteredData),
        period_filter: validatedQuery.period,
        last_updated: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching instructor progress overview:', error);

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

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return NextResponse.json(
        { success: false, message: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch instructor progress overview'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Generate actionable recommendations for instructors
 */
function generateInstructorRecommendations(overview: any): string[] {
  const recommendations = [];

  // Completion rate recommendations
  if (overview.completion_rate < 50) {
    recommendations.push('Consider adding more interactive content to improve engagement');
    recommendations.push('Review course difficulty and pacing');
  } else if (overview.completion_rate > 90) {
    recommendations.push('Excellent completion rate! Consider creating advanced follow-up content');
  }

  // At-risk students recommendations
  if (overview.at_risk_students > overview.total_students * 0.2) {
    recommendations.push('High number of at-risk students - consider reaching out for support');
    recommendations.push('Review early course content for potential barriers');
  }

  // Average score recommendations
  if (overview.average_score < 70) {
    recommendations.push('Low average scores suggest need for additional practice materials');
    recommendations.push('Consider adding explanatory content or live Q&A sessions');
  }

  // Engagement recommendations
  if (overview.engagement_metrics.daily_active_users < overview.total_students * 0.1) {
    recommendations.push('Low daily engagement - consider sending motivational messages');
    recommendations.push('Add more interactive elements like discussions or live sessions');
  }

  // Default recommendations if none triggered
  if (recommendations.length === 0) {
    recommendations.push('Course performance looks good! Keep monitoring student progress');
    recommendations.push('Consider gathering student feedback for continuous improvement');
  }

  return recommendations;
}