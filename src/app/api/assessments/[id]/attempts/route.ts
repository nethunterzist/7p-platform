import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { attemptQuerySchema } from '@/lib/validation/assessment';
import { rateLimit } from '@/lib/security';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/assessments/[id]/attempts - Get attempt history
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
    const rateLimitResult = await rateLimit.check(request, 'api-quiz-attempts', {
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
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // Validate query parameters
    const validatedQuery = attemptQuerySchema.parse({
      ...queryParams,
      assessment_id: assessmentId
    });

    const supabase = createClient();
    const userRole = session.user.role || 'student';

    // Build query based on user role
    let query = supabase
      .from('quiz_attempts')
      .select(`
        id,
        attempt_number,
        started_at,
        submitted_at,
        time_spent,
        status,
        score,
        max_score,
        percentage,
        passed,
        graded_at,
        feedback,
        ${validatedQuery.include_responses ? 'responses:question_responses(*),' : ''}
        assessment:assessments(title, passing_score, max_attempts)
      `)
      .eq('assessment_id', assessmentId);

    // Access control
    if (userRole === 'student') {
      // Students can only see their own attempts
      query = query.eq('user_id', session.user.id);
    } else if (userRole === 'instructor') {
      // Instructors can see all attempts for their assessments
      // First verify they own the assessment
      const { data: assessment } = await supabase
        .from('assessments')
        .select('instructor_id')
        .eq('id', assessmentId)
        .single();

      if (!assessment || assessment.instructor_id !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Access denied. You do not own this assessment.' },
          { status: 403 }
        );
      }

      // If specific user_id is provided in query, filter by it
      if (validatedQuery.user_id) {
        query = query.eq('user_id', validatedQuery.user_id);
      }
    }

    // Apply additional filters
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status);
    }

    if (validatedQuery.date_from) {
      query = query.gte('started_at', validatedQuery.date_from);
    }

    if (validatedQuery.date_to) {
      query = query.lte('started_at', validatedQuery.date_to);
    }

    // Apply pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit;
    query = query
      .order('started_at', { ascending: false })
      .range(offset, offset + validatedQuery.limit - 1);

    const { data: attempts, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch attempts: ${error.message}`);
    }

    // Calculate pagination info
    const total = count || 0;
    const pages = Math.ceil(total / validatedQuery.limit);

    // Process attempts data
    const processedAttempts = (attempts || []).map(attempt => ({
      ...attempt,
      time_spent_formatted: formatTimeSpent(attempt.time_spent || 0),
      performance_level: getPerformanceLevel(attempt.percentage || 0),
      status_display: getStatusDisplay(attempt.status, attempt.submitted_at, attempt.graded_at)
    }));

    // Calculate summary statistics for students
    let summary = null;
    if (userRole === 'student' && attempts && attempts.length > 0) {
      const completedAttempts = attempts.filter(a => a.status === 'graded');
      const bestScore = Math.max(...completedAttempts.map(a => a.percentage || 0));
      const latestScore = completedAttempts[0]?.percentage || 0;
      const averageScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts.length
        : 0;

      summary = {
        total_attempts: attempts.length,
        completed_attempts: completedAttempts.length,
        best_score: bestScore,
        latest_score: latestScore,
        average_score: Math.round(averageScore * 100) / 100,
        passed_attempts: completedAttempts.filter(a => a.passed).length,
        remaining_attempts: (attempts[0]?.assessment?.max_attempts || 0) - attempts.length,
        improvement_trend: calculateImprovementTrend(completedAttempts)
      };
    }

    const response = {
      success: true,
      data: {
        attempts: processedAttempts,
        summary,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          pages,
          has_next: validatedQuery.page < pages,
          has_prev: validatedQuery.page > 1
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error);

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
        { success: false, message: 'Assessment not found or access denied' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch quiz attempts'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// Helper functions
function formatTimeSpent(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getPerformanceLevel(percentage: number): string {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'good';
  if (percentage >= 70) return 'satisfactory';
  if (percentage >= 60) return 'needs_improvement';
  return 'poor';
}

function getStatusDisplay(status: string, submittedAt: string | null, gradedAt: string | null): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'submitted':
      return submittedAt ? 'Submitted - Awaiting Grading' : 'Submitted';
    case 'graded':
      return gradedAt ? 'Completed' : 'Graded';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

function calculateImprovementTrend(attempts: any[]): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  if (attempts.length < 2) return 'insufficient_data';
  
  const scores = attempts
    .filter(a => a.percentage !== null)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .map(a => a.percentage);

  if (scores.length < 2) return 'insufficient_data';

  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;

  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}