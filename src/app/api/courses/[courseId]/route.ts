import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CourseService } from '@/services/course-service';
import { courseUpdateSchema } from '@/lib/validation/courses';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/courses/[courseId] - Get specific course details
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { courseId: string } }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-course-detail', {
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    // Get course details
    const course = await CourseService.getCourseById(courseId);

    const response = {
      success: true,
      data: course
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching course:', error);

    if (error.message === 'Course not found') {
      return NextResponse.json(
        { success: false, message: 'Course not found' },
        { status: 404 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to fetch course'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PUT /api/courses/[courseId] - Update course
 */
export async function PUT(
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
    const rateLimitResult = await rateLimit.check(request, 'api-course-update', {
      max: 20,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const courseId = params.courseId;
    const body = await request.json();

    // Validate course data
    const validatedCourse = courseUpdateSchema.parse({ ...body, id: courseId });

    // Update course
    const course = await CourseService.updateCourse(courseId, validatedCourse, session.user.id);

    const response = {
      success: true,
      data: course,
      message: 'Course updated successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating course:', error);

    if (error.message === 'Course not found') {
      return NextResponse.json(
        { success: false, message: 'Course not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Insufficient permissions to update this course') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

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
      message: error.message || 'Failed to update course'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[courseId] - Delete course
 */
export async function DELETE(
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
    const rateLimitResult = await rateLimit.check(request, 'api-course-delete', {
      max: 5,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const courseId = params.courseId;

    // Delete course
    await CourseService.deleteCourse(courseId, session.user.id);

    const response = {
      success: true,
      message: 'Course deleted successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error deleting course:', error);

    if (error.message === 'Course not found') {
      return NextResponse.json(
        { success: false, message: 'Course not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Insufficient permissions to delete this course') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to delete course'
    };

    return NextResponse.json(response, { status: 500 });
  }
}