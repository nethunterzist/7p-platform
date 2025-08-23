import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProgressService } from '@/services/progress-service';
import { quizResultSchema } from '@/lib/validation/progress';
import { rateLimit } from '@/lib/security';

/**
 * POST /api/student/progress/quiz - Record quiz/assessment results
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

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-quiz-submission', {
      max: 30,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate quiz submission data
    const validatedData = quizResultSchema.parse(body);

    // Record quiz result
    const quizResult = await ProgressService.recordQuizResult(
      session.user.id,
      validatedData
    );

    // Check if this quiz completion triggers any achievements
    const newAchievements = await ProgressService.getUserAchievements(
      session.user.id,
      undefined // Get all achievements to check for new ones
    );

    // Get updated level system after potential XP gain
    const levelSystem = await ProgressService.getUserLevelSystem(session.user.id);

    const response = {
      success: true,
      data: {
        quiz_result: quizResult,
        achievements_earned: [], // This would need to be tracked differently
        level_system: levelSystem,
        performance_feedback: {
          passed: quizResult.passed,
          score_percentage: quizResult.percentage,
          time_efficiency: calculateTimeEfficiency(
            validatedData.time_spent_minutes,
            validatedData.answers.length
          ),
          areas_for_improvement: identifyWeakAreas(quizResult.question_results),
          strengths: identifyStrengths(quizResult.question_results)
        }
      },
      message: quizResult.passed 
        ? `Quiz completed successfully! Score: ${quizResult.percentage}%`
        : `Quiz completed. Score: ${quizResult.percentage}%. Keep practicing!`
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error recording quiz result:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid quiz submission data',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'Quiz or lesson not found' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to record quiz result'
    };

    return NextResponse.json(response, { status: 500 });
  }

}

/**
 * Calculate time efficiency based on time spent vs expected time
 */
function calculateTimeEfficiency(timeSpent: number, questionCount: number): string {
    const expectedTimePerQuestion = 2; // 2 minutes per question
    const expectedTotalTime = questionCount * expectedTimePerQuestion;
    
    if (timeSpent <= expectedTotalTime * 0.8) {
      return 'excellent';
    } else if (timeSpent <= expectedTotalTime) {
      return 'good';
    } else if (timeSpent <= expectedTotalTime * 1.5) {
      return 'average';
    } else {
      return 'needs_improvement';
    }
  }

/**
 * Identify weak areas based on incorrect answers
 */
function identifyWeakAreas(questionResults: any[]): string[] {
    const incorrectAnswers = questionResults.filter(qr => !qr.correct);
    
    // This would normally analyze question categories/topics
    // For now, return generic feedback
    if (incorrectAnswers.length > questionResults.length * 0.5) {
      return ['Review course materials', 'Practice more examples'];
    } else if (incorrectAnswers.length > 0) {
      return ['Focus on specific concepts'];
    }
    
    return [];
  }

/**
 * Identify strengths based on correct answers
 */
function identifyStrengths(questionResults: any[]): string[] {
    const correctAnswers = questionResults.filter(qr => qr.correct);
    const correctPercentage = (correctAnswers.length / questionResults.length) * 100;
    
    if (correctPercentage >= 90) {
      return ['Excellent understanding', 'Strong grasp of concepts'];
    } else if (correctPercentage >= 70) {
      return ['Good understanding', 'Solid foundation'];
    } else if (correctPercentage >= 50) {
      return ['Basic understanding'];
    }
    
    return [];
}