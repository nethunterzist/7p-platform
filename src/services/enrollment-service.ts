import { createClient } from '@/utils/supabase/server';
import { Enrollment } from '@/types/course';

export interface EnrollmentRequest {
  courseId: string;
  userId: string;
  paymentIntentId?: string; // For paid courses
  paymentMethod?: 'free' | 'paid' | 'coupon';
  couponCode?: string;
}

export interface EnrollmentResult extends Enrollment {
  course: {
    id: string;
    title: string;
    price: number;
    instructor_id: string;
  };
}

export interface EnrollmentEligibility {
  eligible: boolean;
  reason?: string;
  course?: {
    id: string;
    title: string;
    price: number;
    max_students?: number;
    published: boolean;
  };
  currentEnrollmentCount?: number;
  userEnrollmentStatus?: 'not_enrolled' | 'enrolled' | 'completed' | 'cancelled';
}

export class EnrollmentService {
  /**
   * Check if user can enroll in a course
   */
  static async checkEnrollmentEligibility(
    courseId: string,
    userId: string
  ): Promise<EnrollmentEligibility> {
    const supabase = createClient();

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price, max_students, published, instructor_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return {
        eligible: false,
        reason: 'Course not found'
      };
    }

    if (!course.published) {
      return {
        eligible: false,
        reason: 'Course is not published',
        course
      };
    }

    // Check if user is the instructor
    if (course.instructor_id === userId) {
      return {
        eligible: false,
        reason: 'Instructors cannot enroll in their own courses',
        course
      };
    }

    // Check existing enrollment
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, completed_at')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .single();

    if (existingEnrollment) {
      const status = existingEnrollment.completed_at ? 'completed' : 'enrolled';
      return {
        eligible: false,
        reason: status === 'completed' ? 'Already completed this course' : 'Already enrolled in this course',
        course,
        userEnrollmentStatus: status
      };
    }

    // Check course capacity if specified
    if (course.max_students) {
      const { count: currentEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .is('completed_at', null); // Only count active enrollments

      if (currentEnrollments && currentEnrollments >= course.max_students) {
        return {
          eligible: false,
          reason: 'Course is full',
          course,
          currentEnrollmentCount: currentEnrollments,
          userEnrollmentStatus: 'not_enrolled'
        };
      }
    }

    return {
      eligible: true,
      course,
      userEnrollmentStatus: 'not_enrolled'
    };
  }

  /**
   * Enroll user in a free course
   */
  static async enrollInFreeCourse(
    courseId: string,
    userId: string
  ): Promise<EnrollmentResult> {
    const supabase = createClient();

    // Check eligibility first
    const eligibility = await this.checkEnrollmentEligibility(courseId, userId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Enrollment not allowed');
    }

    // Verify course is free
    if (eligibility.course && eligibility.course.price > 0) {
      throw new Error('This is a paid course. Payment is required.');
    }

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0
      })
      .select(`
        *,
        course:courses!course_id (
          id, title, price, instructor_id
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to enroll in course: ${error.message}`);
    }

    return enrollment;
  }

  /**
   * Enroll user in a paid course (requires payment verification)
   */
  static async enrollInPaidCourse(
    courseId: string,
    userId: string,
    paymentIntentId: string
  ): Promise<EnrollmentResult> {
    const supabase = createClient();

    // Check eligibility first
    const eligibility = await this.checkEnrollmentEligibility(courseId, userId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Enrollment not allowed');
    }

    // Verify course requires payment
    if (!eligibility.course || eligibility.course.price === 0) {
      throw new Error('This is a free course. No payment required.');
    }

    // TODO: Verify payment with Stripe
    // const paymentVerified = await this.verifyStripePayment(paymentIntentId, eligibility.course.price);
    // if (!paymentVerified) {
    //   throw new Error('Payment verification failed');
    // }

    // For now, assume payment is verified
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0,
        payment_intent_id: paymentIntentId
      })
      .select(`
        *,
        course:courses!course_id (
          id, title, price, instructor_id
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to enroll in course: ${error.message}`);
    }

    return enrollment;
  }

  /**
   * Get user's enrollments
   */
  static async getUserEnrollments(
    userId: string,
    options: {
      status?: 'active' | 'completed' | 'all';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ enrollments: EnrollmentResult[]; total: number }> {
    const supabase = createClient();
    const { status = 'all', page = 1, limit = 20 } = options;

    let query = supabase
      .from('enrollments')
      .select(`
        *,
        course:courses!course_id (
          id, title, description, thumbnail_url, price, difficulty,
          instructor:users!instructor_id (
            id, name, avatar_url
          ),
          category:course_categories (
            id, name
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    // Apply status filter
    if (status === 'active') {
      query = query.is('completed_at', null);
    } else if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch enrollments: ${error.message}`);
    }

    return {
      enrollments: data || [],
      total: count || 0
    };
  }

  /**
   * Update enrollment progress
   */
  static async updateProgress(
    enrollmentId: string,
    userId: string,
    progressPercentage: number,
    lastAccessedLessonId?: string
  ): Promise<Enrollment> {
    const supabase = createClient();

    // Verify ownership
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment || enrollment.user_id !== userId) {
      throw new Error('Enrollment not found or access denied');
    }

    const updateData: any = {
      progress_percentage: Math.min(Math.max(progressPercentage, 0), 100),
      updated_at: new Date().toISOString()
    };

    if (lastAccessedLessonId) {
      updateData.last_accessed_lesson_id = lastAccessedLessonId;
    }

    // Mark as completed if 100% progress
    if (progressPercentage >= 100) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update(updateData)
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel enrollment (within refund period)
   */
  static async cancelEnrollment(
    enrollmentId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const supabase = createClient();

    // Get enrollment details
    const { data: enrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses!course_id (price)
      `)
      .eq('id', enrollmentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !enrollment) {
      throw new Error('Enrollment not found');
    }

    // Check if within refund period (14 days and <25% progress)
    const enrolledDate = new Date(enrollment.enrolled_at);
    const daysSinceEnrollment = Math.floor(
      (Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isWithinRefundPeriod = 
      daysSinceEnrollment <= 14 && 
      (enrollment.progress_percentage || 0) < 25;

    if (!isWithinRefundPeriod) {
      throw new Error('Cancellation not allowed. Refund period has expired or progress exceeds 25%.');
    }

    // For paid courses, process refund
    if (enrollment.course?.price > 0 && enrollment.payment_intent_id) {
      // TODO: Process Stripe refund
      // await this.processStripeRefund(enrollment.payment_intent_id);
    }

    // Mark enrollment as cancelled (soft delete)
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({
        completed_at: null,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'User requested cancellation'
      })
      .eq('id', enrollmentId);

    if (updateError) {
      throw new Error(`Failed to cancel enrollment: ${updateError.message}`);
    }
  }

  /**
   * Get enrollment statistics for a course
   */
  static async getCourseEnrollmentStats(courseId: string): Promise<{
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
    completion_rate: number;
    average_progress: number;
  }> {
    const supabase = createClient();

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('progress_percentage, completed_at')
      .eq('course_id', courseId)
      .is('cancelled_at', null); // Exclude cancelled enrollments

    if (error) {
      throw new Error(`Failed to fetch enrollment stats: ${error.message}`);
    }

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => !e.completed_at).length;
    const completedEnrollments = enrollments.filter(e => e.completed_at).length;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    
    const averageProgress = totalEnrollments > 0 
      ? enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalEnrollments 
      : 0;

    return {
      total_enrollments: totalEnrollments,
      active_enrollments: activeEnrollments,
      completed_enrollments: completedEnrollments,
      completion_rate: Math.round(completionRate * 10) / 10,
      average_progress: Math.round(averageProgress * 10) / 10
    };
  }
}