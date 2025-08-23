import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AssessmentService } from '@/services/assessment-service';
import { updateAssessmentSchema } from '@/lib/validation/assessment';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/assessments/[id] - Get assessment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const rateLimitResult = await rateLimit.check(request, 'api-assessment-get', {
      max: 100,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const assessmentId = params.id;
    const url = new URL(request.url);
    const includeQuestions = url.searchParams.get('include_questions') === 'true';
    const includeAnalytics = url.searchParams.get('include_analytics') === 'true';

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // Get assessment
    const assessment = await AssessmentService.getAssessment(assessmentId, includeQuestions);
    
    // Check access permissions
    const userRole = session.user.role || 'student';
    
    if (userRole === 'student') {
      // Students can only access published assessments in their enrolled courses
      if (assessment.status !== 'published') {
        return NextResponse.json(
          { success: false, message: 'Assessment not available' },
          { status: 403 }
        );
      }
      
      // TODO: Verify student is enrolled in the course
      // This would be checked in the service layer
    } else if (userRole === 'instructor') {
      // Instructors can only access their own assessments
      if (assessment.instructor_id !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }
    }

    let responseData: any = assessment;

    // Include analytics if requested and user has permission
    if (includeAnalytics && ['instructor', 'admin'].includes(userRole)) {
      const analytics = await AssessmentService.getAssessmentAnalytics(assessmentId);
      responseData = {
        ...assessment,
        analytics
      };
    }

    // For students, hide sensitive information
    if (userRole === 'student') {
      if (responseData.questions) {
        responseData.questions = responseData.questions.map((q: any) => ({
          ...q,
          correct_answer: undefined, // Hide correct answers
          explanation: undefined // Hide explanations until after submission
        }));
      }
    }

    const response = {
      success: true,
      data: responseData
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching assessment:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PUT /api/assessments/[id] - Update assessment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check authorization - only instructors and admins can update assessments
    const userRole = session.user.role || 'student';
    if (!['instructor', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Instructor role required.' },
        { status: 403 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-assessment-update', {
      max: 50,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const assessmentId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate update data
    const validatedData = updateAssessmentSchema.parse(body);

    // Update assessment
    const assessment = await AssessmentService.updateAssessment(
      assessmentId,
      session.user.id,
      validatedData
    );

    const response = {
      success: true,
      data: {
        assessment,
        message: 'Assessment updated successfully'
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating assessment:', error);

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
        { success: false, message: 'Assessment not found or access denied' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to update assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/assessments/[id] - Delete assessment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check authorization - only instructors and admins can delete assessments
    const userRole = session.user.role || 'student';
    if (!['instructor', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Instructor role required.' },
        { status: 403 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-assessment-delete', {
      max: 20,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const assessmentId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // Delete assessment
    await AssessmentService.deleteAssessment(assessmentId, session.user.id);

    const response = {
      success: true,
      message: 'Assessment deleted successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error deleting assessment:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found or access denied' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to delete assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}