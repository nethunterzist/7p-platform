import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AssessmentService } from '@/services/assessment-service';
import { analyticsQuerySchema } from '@/lib/validation/assessment';
import { rateLimit } from '@/lib/security';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/assessments/[id]/analytics - Quiz performance analytics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Check authorization - only instructors and admins can access analytics
    const userRole = session.user.role || 'student';
    if (!['instructor', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Instructor role required for analytics.' },
        { status: 403 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-assessment-analytics', {
      max: 50,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const { id: assessmentId } = await params;
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
    const validatedQuery = analyticsQuerySchema.parse({
      ...queryParams,
      assessment_id: assessmentId
    });

    const supabase = createClient();

    // Verify instructor owns the assessment (if instructor role)
    if (userRole === 'instructor') {
      const { data: assessment } = await supabase
        .from('assessments')
        .select('instructor_id, title, course_id')
        .eq('id', assessmentId)
        .single();

      if (!assessment || assessment.instructor_id !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Access denied. You do not own this assessment.' },
          { status: 403 }
        );
      }
    }

    // Get comprehensive analytics
    const analytics = await AssessmentService.getAssessmentAnalytics(assessmentId);

    // Add additional analytics based on query parameters
    let enhancedAnalytics = { ...analytics };

    if (validatedQuery.include_performance_trends) {
      const performanceTrends = await getPerformanceTrends(assessmentId, validatedQuery.period);
      enhancedAnalytics.performance_trends = performanceTrends;
    }

    if (validatedQuery.include_anomaly_detection) {
      const anomalyReport = await getAnomalyDetection(assessmentId);
      enhancedAnalytics.anomaly_detection = anomalyReport;
    }

    // Generate insights and recommendations
    const insights = generateAnalyticsInsights(enhancedAnalytics);
    const recommendations = generateInstructorRecommendations(enhancedAnalytics);

    const response = {
      success: true,
      data: {
        analytics: enhancedAnalytics,
        insights: {
          summary: insights.summary,
          key_metrics: insights.keyMetrics,
          trends: insights.trends,
          alerts: insights.alerts
        },
        recommendations: {
          immediate_actions: recommendations.immediate,
          improvement_suggestions: recommendations.improvements,
          content_adjustments: recommendations.content,
          teaching_strategies: recommendations.teaching
        },
        generated_at: new Date().toISOString(),
        period: validatedQuery.period
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching assessment analytics:', error);

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

    if (error.message.includes('No completed attempts')) {
      return NextResponse.json(
        { 
          success: true, 
          data: {
            analytics: null,
            message: 'No completed attempts found for analytics generation'
          }
        }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch assessment analytics'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// Helper function to get performance trends
async function getPerformanceTrends(assessmentId: string, period: string) {
  const supabase = createClient();
  
  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'semester':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    default:
      startDate.setFullYear(2020); // All time
  }

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('submitted_at, percentage, passed')
    .eq('assessment_id', assessmentId)
    .eq('status', 'graded')
    .gte('submitted_at', startDate.toISOString())
    .lte('submitted_at', endDate.toISOString())
    .order('submitted_at');

  if (!attempts || attempts.length === 0) {
    return [];
  }

  // Group attempts by day/week based on period
  const groupBy = period === 'week' ? 'day' : period === 'month' ? 'day' : 'week';
  const trends = groupAttemptsByPeriod(attempts, groupBy);

  return trends;
}

// Helper function to get anomaly detection
async function getAnomalyDetection(assessmentId: string) {
  const supabase = createClient();

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      responses:question_responses(*),
      user:users(id, name)
    `)
    .eq('assessment_id', assessmentId)
    .eq('status', 'graded');

  if (!attempts || attempts.length === 0) {
    return {
      total_anomalies: 0,
      high_confidence_anomalies: 0,
      anomalies_by_type: {
        rapid_improvement: 0,
        similar_patterns: 0,
        timing_anomaly: 0,
        suspicious_behavior: 0
      },
      flagged_students: [],
      recommended_actions: []
    };
  }

  const anomalies = [];
  const flaggedStudents = [];

  // Detect timing anomalies
  for (const attempt of attempts) {
    const averageTimePerQuestion = (attempt.time_spent || 0) / (attempt.responses?.length || 1);
    
    if (averageTimePerQuestion < 10) { // Less than 10 seconds per question
      anomalies.push({
        type: 'timing_anomaly',
        user_id: attempt.user_id,
        confidence: 0.8,
        details: `Completed quiz in ${attempt.time_spent} minutes (${averageTimePerQuestion.toFixed(1)}s per question)`
      });
      
      flaggedStudents.push({
        user_id: attempt.user_id,
        user_name: attempt.user?.name || 'Unknown',
        anomaly_type: 'timing_anomaly',
        confidence: 0.8,
        details: 'Unusually fast completion time'
      });
    }
  }

  // Detect rapid improvement patterns
  const userAttempts = groupAttemptsByUser(attempts);
  for (const [userId, userAttemptsList] of Object.entries(userAttempts)) {
    const sortedAttempts = (userAttemptsList as any[]).sort((a, b) => 
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    if (sortedAttempts.length >= 2) {
      const firstScore = sortedAttempts[0].percentage || 0;
      const lastScore = sortedAttempts[sortedAttempts.length - 1].percentage || 0;
      const improvement = lastScore - firstScore;

      if (improvement > 40) { // More than 40% improvement
        anomalies.push({
          type: 'rapid_improvement',
          user_id: userId,
          confidence: 0.7,
          details: `Score improved from ${firstScore}% to ${lastScore}% (${improvement}% increase)`
        });

        flaggedStudents.push({
          user_id: userId,
          user_name: sortedAttempts[0].user?.name || 'Unknown',
          anomaly_type: 'rapid_improvement',
          confidence: 0.7,
          details: `Significant score improvement: ${improvement}%`
        });
      }
    }
  }

  const anomaliesByType = {
    rapid_improvement: anomalies.filter(a => a.type === 'rapid_improvement').length,
    similar_patterns: 0, // Would implement pattern matching
    timing_anomaly: anomalies.filter(a => a.type === 'timing_anomaly').length,
    suspicious_behavior: 0
  };

  const recommendedActions = [];
  if (anomaliesByType.timing_anomaly > 0) {
    recommendedActions.push('Review quiz time limits and consider minimum time requirements');
  }
  if (anomaliesByType.rapid_improvement > 0) {
    recommendedActions.push('Investigate sudden performance improvements for potential academic integrity issues');
  }

  return {
    total_anomalies: anomalies.length,
    high_confidence_anomalies: anomalies.filter(a => a.confidence >= 0.8).length,
    anomalies_by_type: anomaliesByType,
    flagged_students: flaggedStudents,
    recommended_actions: recommendedActions
  };
}

// Helper function to generate insights
function generateAnalyticsInsights(analytics: any) {
  const insights = {
    summary: '',
    keyMetrics: [],
    trends: [],
    alerts: []
  };

  // Generate summary
  const passRate = analytics.pass_rate || 0;
  const avgScore = analytics.average_score || 0;
  
  if (passRate >= 80) {
    insights.summary = 'Assessment performance is excellent with high pass rates and strong student understanding.';
  } else if (passRate >= 60) {
    insights.summary = 'Assessment performance is satisfactory but has room for improvement.';
  } else {
    insights.summary = 'Assessment performance indicates significant challenges that need attention.';
  }

  // Key metrics
  insights.keyMetrics = [
    { metric: 'Pass Rate', value: `${passRate}%`, status: passRate >= 70 ? 'good' : 'needs_attention' },
    { metric: 'Average Score', value: `${avgScore}%`, status: avgScore >= 75 ? 'good' : 'needs_attention' },
    { metric: 'Completion Rate', value: `${Math.round((analytics.completed_attempts / analytics.total_attempts) * 100)}%`, status: 'info' }
  ];

  // Alerts
  if (passRate < 50) {
    insights.alerts.push('Low pass rate indicates assessment may be too difficult or content needs review');
  }
  if (analytics.average_time_spent < 5) {
    insights.alerts.push('Very short average completion time may indicate rushing or cheating');
  }
  if (analytics.anomaly_detection?.high_confidence_anomalies > 0) {
    insights.alerts.push('High-confidence anomalies detected - review flagged submissions');
  }

  return insights;
}

// Helper function to generate recommendations
function generateInstructorRecommendations(analytics: any) {
  const recommendations = {
    immediate: [],
    improvements: [],
    content: [],
    teaching: []
  };

  const passRate = analytics.pass_rate || 0;
  const avgScore = analytics.average_score || 0;

  // Immediate actions
  if (analytics.anomaly_detection?.flagged_students?.length > 0) {
    recommendations.immediate.push('Review flagged student submissions for potential academic integrity issues');
  }
  if (passRate < 50) {
    recommendations.immediate.push('Consider extending deadline or allowing additional attempts');
  }

  // Content improvements
  if (avgScore < 70) {
    recommendations.content.push('Review difficult questions and consider adding explanatory content');
    recommendations.content.push('Provide additional study materials for challenging topics');
  }

  // Question-specific recommendations
  if (analytics.question_analytics) {
    const difficultQuestions = analytics.question_analytics.filter(q => q.success_rate < 50);
    if (difficultQuestions.length > 0) {
      recommendations.content.push(`Review ${difficultQuestions.length} questions with low success rates`);
    }
  }

  // Teaching strategies
  if (passRate < 70) {
    recommendations.teaching.push('Consider additional review sessions or office hours');
    recommendations.teaching.push('Provide practice quizzes on challenging topics');
  }

  return recommendations;
}

// Helper functions
function groupAttemptsByPeriod(attempts: any[], groupBy: string) {
  // Simplified implementation - would group by day/week/month
  return attempts.reduce((acc, attempt) => {
    const date = new Date(attempt.submitted_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, attempts: 0, average_score: 0, pass_rate: 0 };
    }
    acc[date].attempts++;
    acc[date].average_score += attempt.percentage || 0;
    if (attempt.passed) acc[date].pass_rate++;
    return acc;
  }, {});
}

function groupAttemptsByUser(attempts: any[]) {
  return attempts.reduce((acc, attempt) => {
    if (!acc[attempt.user_id]) {
      acc[attempt.user_id] = [];
    }
    acc[attempt.user_id].push(attempt);
    return acc;
  }, {});
}