import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AssessmentService } from '@/services/assessment-service';
import { submitQuizAttemptSchema, startQuizAttemptSchema } from '@/lib/validation/assessment';
import { rateLimit } from '@/lib/security';

/**
 * POST /api/assessments/[id]/submit - Submit quiz attempt
 */
export async function POST(
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

    // Apply rate limiting for quiz submissions
    const rateLimitResult = await rateLimit.check(request, 'api-quiz-submit', {
      max: 10,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Too many submission attempts.' },
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
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'submit';

    if (action === 'start') {
      // Start a new quiz attempt
      const validatedData = startQuizAttemptSchema.parse(body);
      
      const attempt = await AssessmentService.startQuizAttempt(
        session.user.id,
        assessmentId,
        validatedData.browser_fingerprint
      );

      const response = {
        success: true,
        data: {
          attempt,
          message: 'Quiz attempt started successfully'
        }
      };

      return NextResponse.json(response, { status: 201 });

    } else if (action === 'submit') {
      // Submit completed quiz attempt
      const validatedData = submitQuizAttemptSchema.parse(body);
      
      const result = await AssessmentService.submitQuizAttempt(
        session.user.id,
        validatedData
      );

      // Determine response message based on performance
      let message = 'Quiz submitted successfully!';
      if (result.passed) {
        if (result.percentage >= 90) {
          message = `Excellent work! You scored ${result.percentage}% and passed the quiz.`;
        } else if (result.percentage >= 80) {
          message = `Great job! You scored ${result.percentage}% and passed the quiz.`;
        } else {
          message = `Good work! You scored ${result.percentage}% and passed the quiz.`;
        }
      } else {
        message = `You scored ${result.percentage}%. Unfortunately, you didn't pass this time. Review the material and try again!`;
      }

      const response = {
        success: true,
        data: {
          result,
          performance_summary: {
            score: result.score,
            max_score: result.max_score,
            percentage: result.percentage,
            passed: result.passed,
            time_spent: result.time_spent,
            questions_correct: result.question_results.filter(q => q.is_correct).length,
            total_questions: result.question_results.length
          },
          feedback: {
            overall: result.overall_feedback,
            strengths: result.strengths,
            improvement_areas: result.improvement_areas,
            next_steps: result.next_steps
          }
        },
        message
      };

      return NextResponse.json(response, { status: 201 });

    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "start" or "submit".' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error processing quiz submission:', error);

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

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('not enrolled')) {
      return NextResponse.json(
        { success: false, message: 'You are not enrolled in this course' },
        { status: 403 }
      );
    }

    if (error.message.includes('Maximum attempts')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('already submitted')) {
      return NextResponse.json(
        { success: false, message: 'Quiz attempt already submitted' },
        { status: 409 }
      );
    }

    if (error.message.includes('not available')) {
      return NextResponse.json(
        { success: false, message: 'Assessment is not available for submission' },
        { status: 403 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to process quiz submission'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/assessments/[id]/submit - Get submission status or start new attempt
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
    const rateLimitResult = await rateLimit.check(request, 'api-quiz-status', {
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // Get assessment details
    const assessment = await AssessmentService.getAssessment(assessmentId, false);

    // Check if assessment is available
    if (assessment.status !== 'published') {
      return NextResponse.json(
        { success: false, message: 'Assessment is not available' },
        { status: 403 }
      );
    }

    // Check availability dates
    const now = new Date();
    if (assessment.available_from && new Date(assessment.available_from) > now) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Assessment is not yet available',
          available_from: assessment.available_from
        },
        { status: 403 }
      );
    }

    if (assessment.available_until && new Date(assessment.available_until) < now) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Assessment is no longer available',
          available_until: assessment.available_until
        },
        { status: 403 }
      );
    }

    // Get user's previous attempts (this would be implemented in the service)
    // For now, return basic submission info
    const submissionInfo = {
      assessment_id: assessmentId,
      assessment_title: assessment.title,
      time_limit: assessment.time_limit,
      passing_score: assessment.passing_score,
      max_attempts: assessment.max_attempts,
      attempts_used: 0, // Would be calculated from database
      attempts_remaining: assessment.max_attempts, // Would be calculated
      can_attempt: true, // Would be calculated based on attempts and availability
      due_date: assessment.due_date,
      show_results_immediately: assessment.show_results_immediately,
      allow_review: assessment.allow_review,
      question_count: assessment.questions?.length || 0
    };

    const response = {
      success: true,
      data: submissionInfo
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error getting submission status:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'Assessment not found' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to get submission status'
    };

    return NextResponse.json(response, { status: 500 });
  }
}