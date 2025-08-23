import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EnrollmentService } from '@/services/enrollment-service';
import { progressUpdateSchema, cancellationRequestSchema } from '@/lib/validation/enrollments';
import { rateLimit } from '@/lib/security';

/**
 * PATCH /api/enrollments/[enrollmentId] - Update enrollment progress
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { enrollmentId: string } }
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
    const rateLimitResult = await rateLimit.check(request, 'api-enrollment-progress', {
      max: 100,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const enrollmentId = params.enrollmentId;
    const body = await request.json();

    // Validate progress data
    const { progress_percentage, last_accessed_lesson_id } = progressUpdateSchema.parse(body);

    // Update progress
    const enrollment = await EnrollmentService.updateProgress(
      enrollmentId,
      session.user.id,
      progress_percentage,
      last_accessed_lesson_id
    );

    const response = {
      success: true,
      data: enrollment,
      message: 'Progress updated successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating enrollment progress:', error);

    if (error.message === 'Enrollment not found or access denied') {
      return NextResponse.json(
        { success: false, message: 'Enrollment not found or access denied' },
        { status: 404 }
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
      message: error.message || 'Failed to update progress'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/enrollments/[enrollmentId] - Cancel enrollment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { enrollmentId: string } }
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
    const rateLimitResult = await rateLimit.check(request, 'api-enrollment-cancel', {
      max: 5,
      window: '1h'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const enrollmentId = params.enrollmentId;
    
    let reason;
    try {
      const body = await request.json();
      const { reason: validatedReason } = cancellationRequestSchema.parse(body);
      reason = validatedReason;
    } catch {
      // Body is optional for cancellation
    }

    // Cancel enrollment
    await EnrollmentService.cancelEnrollment(enrollmentId, session.user.id, reason);

    const response = {
      success: true,
      message: 'Enrollment cancelled successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error cancelling enrollment:', error);

    if (error.message === 'Enrollment not found') {
      return NextResponse.json(
        { success: false, message: 'Enrollment not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('Cancellation not allowed')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    const response = {
      success: false,
      message: error.message || 'Failed to cancel enrollment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}