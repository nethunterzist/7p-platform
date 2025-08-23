import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AssessmentService } from '@/services/assessment-service';
import { createAssessmentSchema, assessmentQuerySchema } from '@/lib/validation/assessment';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/assessments - List assessments with filtering
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
    const rateLimitResult = await rateLimit.check(request, 'api-assessments-list', {
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
    const validatedQuery = assessmentQuerySchema.parse(queryParams);

    // Build filter conditions
    const filters: any = {};
    
    if (validatedQuery.course_id) filters.course_id = validatedQuery.course_id;
    if (validatedQuery.lesson_id) filters.lesson_id = validatedQuery.lesson_id;
    if (validatedQuery.module_id) filters.module_id = validatedQuery.module_id;
    if (validatedQuery.status) filters.status = validatedQuery.status;
    if (validatedQuery.difficulty) filters.difficulty = validatedQuery.difficulty;

    // For students, only show published assessments in their enrolled courses
    // For instructors, show their own assessments
    const userRole = session.user.role || 'student';
    
    if (userRole === 'student') {
      filters.status = 'published';
      // Add enrollment check in service
    } else if (userRole === 'instructor') {
      filters.instructor_id = session.user.id;
    }

    const { data: assessments, pagination } = await getAssessmentsList(filters, validatedQuery);

    const response = {
      success: true,
      data: {
        assessments,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: pagination.total,
          pages: pagination.pages,
          has_next: pagination.has_next,
          has_prev: pagination.has_prev
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching assessments:', error);

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
      message: error.message || 'Failed to fetch assessments'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/assessments - Create new assessment (instructor/admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check authorization - only instructors and admins can create assessments
    const userRole = session.user.role || 'student';
    if (!['instructor', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Instructor role required.' },
        { status: 403 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-assessment-create', {
      max: 20,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate assessment data
    const validatedData = createAssessmentSchema.parse(body);

    // Create assessment
    const assessment = await AssessmentService.createAssessment(
      session.user.id,
      validatedData
    );

    const response = {
      success: true,
      data: {
        assessment,
        message: 'Assessment created successfully'
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error creating assessment:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
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
      message: error.message || 'Failed to create assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// Helper function to get assessments list
async function getAssessmentsList(filters: any, query: any) {
  // This would be implemented in the service layer
  // For now, returning a placeholder structure
  
  const assessments = []; // Would come from AssessmentService
  const total = 0;
  const pages = Math.ceil(total / query.limit);

  return {
    data: assessments,
    pagination: {
      total,
      pages,
      has_next: query.page < pages,
      has_prev: query.page > 1
    }
  };
}