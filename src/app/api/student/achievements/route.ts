import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProgressService } from '@/services/progress-service';
import { achievementQuerySchema } from '@/lib/validation/progress';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/student/achievements - Get student achievements/badges
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
    const rateLimitResult = await rateLimit.check(request, 'api-achievements', {
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
    const validatedQuery = achievementQuerySchema.parse(queryParams);

    // Get user achievements based on filters
    const achievements = await ProgressService.getUserAchievements(
      session.user.id,
      validatedQuery.course_id
    );

    // Filter by category if specified
    let filteredAchievements = achievements;
    if (validatedQuery.category !== 'all') {
      filteredAchievements = achievements.filter(achievement => 
        achievement.achievement.category === validatedQuery.category
      );
    }

    // Filter by earned status if specified
    if (validatedQuery.earned !== undefined) {
      if (validatedQuery.earned) {
        filteredAchievements = filteredAchievements.filter(achievement => 
          achievement.earned_at !== null
        );
      } else {
        // Show available achievements not yet earned (this would require additional logic)
        // For now, we'll just return earned achievements when earned=false
        filteredAchievements = [];
      }
    }

    // Get user level system for additional context
    const levelSystem = await ProgressService.getUserLevelSystem(session.user.id);

    const response = {
      success: true,
      data: {
        achievements: filteredAchievements,
        level_system: levelSystem,
        summary: {
          total_achievements: filteredAchievements.length,
          total_points: filteredAchievements.reduce((sum, a) => sum + (a.achievement.points || 0), 0),
          categories: {
            completion: filteredAchievements.filter(a => a.achievement.category === 'completion').length,
            performance: filteredAchievements.filter(a => a.achievement.category === 'performance').length,
            engagement: filteredAchievements.filter(a => a.achievement.category === 'engagement').length,
            special: filteredAchievements.filter(a => a.achievement.category === 'special').length
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching achievements:', error);

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
      message: error.message || 'Failed to fetch achievements'
    };

    return NextResponse.json(response, { status: 500 });
  }
}