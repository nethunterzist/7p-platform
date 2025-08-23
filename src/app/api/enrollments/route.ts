import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EnrollmentService } from '@/services/enrollment-service';
import { enrollmentQuerySchema } from '@/lib/validation/enrollments';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/enrollments - Get user's enrollments
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
    const rateLimitResult = await rateLimit.check(request, 'api-enrollments', {
      max: 50,
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
    const validatedQuery = enrollmentQuerySchema.parse(queryParams);

    // Get user's enrollments
    const result = await EnrollmentService.getUserEnrollments(session.user.id, validatedQuery);

    const totalPages = Math.ceil(result.total / validatedQuery.limit);
    const hasNext = validatedQuery.page < totalPages;
    const hasPrev = validatedQuery.page > 1;

    const response = {
      success: true,
      data: {
        enrollments: result.enrollments,
        total: result.total,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        totalPages,
        hasNext,
        hasPrev
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching enrollments:', error);

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
      message: error.message || 'Failed to fetch enrollments'
    };

    return NextResponse.json(response, { status: 500 });
  }
}