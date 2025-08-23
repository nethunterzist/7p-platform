import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EnrollmentService } from '@/services/enrollment-service';
import { enrollmentRequestSchema } from '@/lib/validation/enrollments';
import { rateLimit } from '@/lib/security';

/**
 * POST /api/courses/[courseId]/enroll - Enroll user in course
 */
export async function POST(
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
    const rateLimitResult = await rateLimit.check(request, 'api-course-enroll', {
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
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    
    // Validate enrollment data
    const { paymentIntentId, paymentMethod, couponCode } = enrollmentRequestSchema.parse(body);

    // Check enrollment eligibility
    const eligibility = await EnrollmentService.checkEnrollmentEligibility(courseId, session.user.id);
    
    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, message: eligibility.reason },
        { status: 400 }
      );
    }

    let enrollment;

    // Handle different payment methods
    if (paymentMethod === 'free' || (eligibility.course && eligibility.course.price === 0)) {
      // Free enrollment
      enrollment = await EnrollmentService.enrollInFreeCourse(courseId, session.user.id);
    } else if (paymentMethod === 'paid' && paymentIntentId) {
      // Paid enrollment
      enrollment = await EnrollmentService.enrollInPaidCourse(courseId, session.user.id, paymentIntentId);
    } else if (paymentMethod === 'coupon' && couponCode) {
      // TODO: Implement coupon-based enrollment
      return NextResponse.json(
        { success: false, message: 'Coupon enrollment not yet implemented' },
        { status: 501 }
      );
    } else {
      // Missing payment information for paid course
      if (eligibility.course && eligibility.course.price > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Payment required for this course',
            requiresPayment: true,
            coursePrice: eligibility.course.price
          },
          { status: 402 }
        );
      } else {
        // Default to free enrollment
        enrollment = await EnrollmentService.enrollInFreeCourse(courseId, session.user.id);
      }
    }

    const response = {
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course'
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error enrolling in course:', error);

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
      message: error.message || 'Failed to enroll in course'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/courses/[courseId]/enroll - Check enrollment eligibility
 */
export async function GET(
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

    const courseId = params.courseId;

    // Check enrollment eligibility
    const eligibility = await EnrollmentService.checkEnrollmentEligibility(courseId, session.user.id);

    const response = {
      success: true,
      data: eligibility
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error checking enrollment eligibility:', error);

    const response = {
      success: false,
      message: error.message || 'Failed to check enrollment eligibility'
    };

    return NextResponse.json(response, { status: 500 });
  }
}