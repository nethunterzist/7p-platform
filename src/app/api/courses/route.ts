import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CourseService } from '@/services/course-service';
import { courseQuerySchema, courseCreateSchema } from '@/lib/validation/courses';
import { rateLimit } from '@/lib/security';

/**
 * GET /api/courses - List courses with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-courses', {
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
    const validatedQuery = courseQuerySchema.parse(queryParams);

    // Fetch courses
    const result = await CourseService.getCourses(validatedQuery);

    const totalPages = Math.ceil(result.total / validatedQuery.limit);
    const hasNext = validatedQuery.page < totalPages;
    const hasPrev = validatedQuery.page > 1;

    const response = {
      success: true,
      data: {
        courses: result.courses,
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
    console.error('Error fetching courses:', error);
    
    const response = {
      success: false,
      message: error.message || 'Failed to fetch courses'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/courses - Create a new course
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

    // Check if user is instructor or admin
    if (session.user.role !== 'instructor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only instructors and admins can create courses' },
        { status: 403 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request, 'api-courses-create', {
      max: 10,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate course data
    const validatedCourse = courseCreateSchema.parse(body);

    // Create course
    const course = await CourseService.createCourse(validatedCourse, session.user.id);

    const response = {
      success: true,
      data: course,
      message: 'Course created successfully'
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error creating course:', error);

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
      message: error.message || 'Failed to create course'
    };

    return NextResponse.json(response, { status: 500 });
  }
}