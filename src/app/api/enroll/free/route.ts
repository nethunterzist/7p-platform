import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { rateLimit, getSecurityHeaders, validatePayload, isValidUUID } from '@/lib/security';
import { FEATURE_ENROLL_FREE, FREE_ENROLLMENT_CODE, SUPABASE_SERVICE_KEY, NEXT_PUBLIC_SUPABASE_URL } from '@/lib/env';

/**
 * 7P Education - Free Enrollment API
 * 
 * POST /api/enroll/free
 * Allows users to enroll in courses for free when payments are disabled
 */

interface EnrollFreeRequest {
  courseId: string;
  code?: string;
}

interface EnrollFreeResponse {
  success: boolean;
  message?: string;
  error?: string;
  enrollment?: {
    id: string;
    courseId: string;
    userId: string;
    plan: string;
    status: string;
    enrolledAt: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<EnrollFreeResponse>> {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check(request, '/api/enroll/free', { max: 5, window: '1m' });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Feature flag check
    if (!FEATURE_ENROLL_FREE) {
      return NextResponse.json(
        { success: false, error: 'Free enrollment is not enabled' },
        { 
          status: 501,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { 
          status: 401,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    validatePayload(body, ['courseId']);

    const { courseId, code }: EnrollFreeRequest = body;

    // Validate courseId format
    if (!isValidUUID(courseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID format' },
        { 
          status: 400,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Validate enrollment code if required
    if (FREE_ENROLLMENT_CODE) {
      if (!code || code !== FREE_ENROLLMENT_CODE) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing enrollment code' },
          { 
            status: 403,
            headers: getSecurityHeaders(),
          }
        );
      }
    }

    // Initialize Supabase admin client
    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { 
          status: 500,
          headers: getSecurityHeaders(),
        }
      );
    }

    const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, status')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { 
          status: 404,
          headers: getSecurityHeaders(),
        }
      );
    }

    if (course.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Course is not available for enrollment' },
        { 
          status: 400,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('user_id', session.user.id)
      .single();

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Already enrolled in this course' },
        { 
          status: 409,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Create free enrollment
    const enrollmentData = {
      course_id: courseId,
      user_id: session.user.id,
      plan: 'free',
      status: 'active',
      enrolled_at: new Date().toISOString(),
      payment_status: 'free',
      metadata: {
        enrollment_type: 'free',
        enrollment_code_used: !!FREE_ENROLLMENT_CODE,
        created_via: 'api/enroll/free',
      },
    };

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert(enrollmentData)
      .select('*')
      .single();

    if (enrollmentError) {
      console.error('Free enrollment creation failed:', enrollmentError);
      return NextResponse.json(
        { success: false, error: 'Failed to create enrollment' },
        { 
          status: 500,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Log audit event
    const auditData = {
      user_id: session.user.id,
      action: 'enrollment_created',
      resource_type: 'course',
      resource_id: courseId,
      details: {
        enrollment_id: enrollment.id,
        enrollment_type: 'free',
        course_title: course.title,
        enrollment_code_used: !!FREE_ENROLLMENT_CODE,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    };

    await supabase
      .from('audit_logs')
      .insert(auditData);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Successfully enrolled in course',
        enrollment: {
          id: enrollment.id,
          courseId: enrollment.course_id,
          userId: enrollment.user_id,
          plan: enrollment.plan,
          status: enrollment.status,
          enrolledAt: enrollment.enrolled_at,
        },
      },
      { 
        status: 201,
        headers: getSecurityHeaders(),
      }
    );

  } catch (error) {
    console.error('Free enrollment API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { 
        status: 500,
        headers: getSecurityHeaders(),
      }
    );
  }
}

// Method not allowed for other HTTP methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { 
      status: 405,
      headers: { ...getSecurityHeaders(), Allow: 'POST' },
    }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { 
      status: 405,
      headers: { ...getSecurityHeaders(), Allow: 'POST' },
    }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { 
      status: 405,
      headers: { ...getSecurityHeaders(), Allow: 'POST' },
    }
  );
}