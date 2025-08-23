import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProgressService } from '@/services/progress-service';
import { progressUpdateSchema, batchLessonCompletionSchema } from '@/lib/validation/progress';
import { rateLimit } from '@/lib/security';

/**
 * POST /api/student/progress/lesson - Mark lesson as completed or update progress
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
    const rateLimitResult = await rateLimit.check(request, 'api-lesson-progress', {
      max: 200,
      window: '1m'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const url = new URL(request.url);
    const courseId = url.searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json(
        { success: false, message: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check if this is a batch update or single update
    let progressData;
    let isBatch = false;

    try {
      // Try to parse as batch first
      progressData = batchLessonCompletionSchema.parse(body);
      isBatch = true;
    } catch {
      // Fall back to single lesson update
      progressData = progressUpdateSchema.parse(body);
      isBatch = false;
    }

    if (isBatch) {
      // Process batch lesson completions
      const results = [];
      
      for (const lesson of progressData.lessons) {
        const lessonProgress = await ProgressService.updateLessonProgress(
          session.user.id,
          courseId,
          {
            lesson_id: lesson.lesson_id,
            video_watch_percentage: lesson.video_watch_percentage,
            time_spent_minutes: lesson.time_spent_minutes,
            quiz_score: lesson.quiz_score,
            completed: lesson.video_watch_percentage >= 80
          }
        );
        results.push(lessonProgress);
      }

      const response = {
        success: true,
        data: {
          type: 'batch',
          updated_lessons: results.length,
          lessons: results
        },
        message: `Updated progress for ${results.length} lessons`
      };

      return NextResponse.json(response);
    } else {
      // Process single lesson update
      const lessonProgress = await ProgressService.updateLessonProgress(
        session.user.id,
        courseId,
        progressData
      );

      const response = {
        success: true,
        data: {
          type: 'single',
          lesson_progress: lessonProgress
        },
        message: 'Lesson progress updated successfully'
      };

      return NextResponse.json(response, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error updating lesson progress:', error);

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

    const response = {
      success: false,
      message: error.message || 'Failed to update lesson progress'
    };

    return NextResponse.json(response, { status: 500 });
  }
}