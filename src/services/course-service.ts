import { createClient } from '@/utils/supabase/server';
import { 
  Course, 
  CourseQueryOptions, 
  CourseListResult, 
  CourseWithDetails,
  CourseStats 
} from '@/types/course';
import { CourseCreate, CourseUpdate } from '@/lib/validation/courses';

export class CourseService {
  /**
   * Get paginated list of courses with filtering and sorting
   */
  static async getCourses(options: CourseQueryOptions): Promise<CourseListResult> {
    const supabase = createClient();
    
    let query = supabase
      .from('courses')
      .select(`
        *,
        instructor:user_profiles!instructor_id(id, full_name, email, avatar_url),
        category:course_categories(id, name, description),
        enrollment_count:enrollments(count),
        average_rating:course_reviews(rating)
      `, { count: 'exact' });

    // Apply filters
    if (options.category) {
      query = query.eq('category_id', options.category);
    }

    if (options.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }

    if (options.published !== undefined) {
      query = query.eq('published', options.published);
    }

    if (options.instructor_id) {
      query = query.eq('instructor_id', options.instructor_id);
    }

    if (options.price_min !== undefined) {
      query = query.gte('price', options.price_min);
    }

    if (options.price_max !== undefined) {
      query = query.lte('price', options.price_max);
    }

    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,tags.cs.{${options.search}}`);
    }

    // Apply sorting
    const ascending = options.sortOrder === 'asc';
    query = query.order(options.sortBy, { ascending });

    // Apply pagination
    const from = (options.page - 1) * options.limit;
    const to = from + options.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }

    // Process enrollment count and average rating
    const processedCourses = (data || []).map(course => ({
      ...course,
      enrollment_count: course.enrollment_count?.[0]?.count || 0,
      average_rating: course.average_rating?.length > 0 
        ? course.average_rating.reduce((sum: number, review: any) => sum + review.rating, 0) / course.average_rating.length
        : 0,
      total_ratings: course.average_rating?.length || 0
    }));

    return {
      courses: processedCourses,
      total: count || 0
    };
  }

  /**
   * Get course by ID with detailed information
   */
  static async getCourseById(id: string): Promise<CourseWithDetails> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:user_profiles!instructor_id(*),
        category:course_categories(*),
        modules:course_modules(
          id, title, description, order_index,
          lessons:course_lessons(id, title, description, duration_minutes, order_index, is_preview)
        ),
        recent_enrollments:enrollments(
          id, user_id, enrolled_at,
          user:user_profiles(id, full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .order('order_index', { referencedTable: 'course_modules' })
      .order('order_index', { referencedTable: 'course_modules.course_lessons' })
      .limit(10, { referencedTable: 'recent_enrollments' })
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Course not found');
      }
      throw new Error(`Failed to fetch course: ${error.message}`);
    }

    // Flatten lessons from modules
    const lessons = (data.modules || []).flatMap((module: any) => module.lessons || []);

    return {
      ...data,
      lessons,
      recent_enrollments: data.recent_enrollments || []
    };
  }

  /**
   * Create a new course
   */
  static async createCourse(
    courseData: CourseCreate, 
    instructorId: string
  ): Promise<Course> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...courseData,
        instructor_id: instructorId,
        currency: 'TRY' // Default currency
      })
      .select(`
        *,
        instructor:user_profiles!instructor_id(id, full_name, email, avatar_url),
        category:course_categories(id, name, description)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create course: ${error.message}`);
    }

    return data;
  }

  /**
   * Update course
   */
  static async updateCourse(
    id: string, 
    updateData: Partial<CourseUpdate>,
    userId: string
  ): Promise<Course> {
    const supabase = createClient();

    // First verify ownership or admin role
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!course) {
      throw new Error('Course not found');
    }

    // Check if user is the instructor or admin
    const { data: user } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (course.instructor_id !== userId && user?.role !== 'admin') {
      throw new Error('Insufficient permissions to update this course');
    }

    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        instructor:user_profiles!instructor_id(id, full_name, email, avatar_url),
        category:course_categories(id, name, description)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update course: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete course (soft delete by unpublishing)
   */
  static async deleteCourse(id: string, userId: string): Promise<void> {
    const supabase = createClient();

    // Verify ownership or admin role
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!course) {
      throw new Error('Course not found');
    }

    const { data: user } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (course.instructor_id !== userId && user?.role !== 'admin') {
      throw new Error('Insufficient permissions to delete this course');
    }

    // Check if course has active enrollments
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)
      .is('completed_at', null);

    if (count && count > 0) {
      // Soft delete by unpublishing
      const { error } = await supabase
        .from('courses')
        .update({ published: false })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to unpublish course: ${error.message}`);
      }
    } else {
      // Hard delete if no active enrollments
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete course: ${error.message}`);
      }
    }
  }

  /**
   * Get course statistics
   */
  static async getCourseStats(instructorId?: string): Promise<CourseStats> {
    const supabase = createClient();

    let coursesQuery = supabase.from('courses').select('*', { count: 'exact', head: true });
    let publishedQuery = supabase.from('courses').select('*', { count: 'exact', head: true }).eq('published', true);
    let draftQuery = supabase.from('courses').select('*', { count: 'exact', head: true }).eq('published', false);

    if (instructorId) {
      coursesQuery = coursesQuery.eq('instructor_id', instructorId);
      publishedQuery = publishedQuery.eq('instructor_id', instructorId);
      draftQuery = draftQuery.eq('instructor_id', instructorId);
    }

    const [
      { count: totalCourses },
      { count: publishedCourses },
      { count: draftCourses }
    ] = await Promise.all([
      coursesQuery,
      publishedQuery,
      draftQuery
    ]);

    // Get enrollment stats
    let enrollmentQuery = supabase
      .from('enrollments')
      .select('course_id, courses!inner(price)', { count: 'exact' });

    if (instructorId) {
      enrollmentQuery = enrollmentQuery.eq('courses.instructor_id', instructorId);
    }

    const { data: enrollments, count: totalEnrollments } = await enrollmentQuery;

    // Calculate revenue
    const totalRevenue = enrollments?.reduce((sum, enrollment) => {
      return sum + (enrollment.courses?.price || 0);
    }, 0) || 0;

    // Get average rating
    let ratingsQuery = supabase
      .from('course_reviews')
      .select('rating, courses!inner(instructor_id)');

    if (instructorId) {
      ratingsQuery = ratingsQuery.eq('courses.instructor_id', instructorId);
    }

    const { data: ratings } = await ratingsQuery;
    const averageRating = ratings?.length > 0 
      ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length
      : 0;

    // Calculate completion rate
    let completionsQuery = supabase
      .from('enrollments')
      .select('completed_at, courses!inner(instructor_id)', { count: 'exact' })
      .not('completed_at', 'is', null);

    if (instructorId) {
      completionsQuery = completionsQuery.eq('courses.instructor_id', instructorId);
    }

    const { count: completedEnrollments } = await completionsQuery;
    const completionRate = totalEnrollments > 0 
      ? ((completedEnrollments || 0) / totalEnrollments) * 100 
      : 0;

    return {
      total_courses: totalCourses || 0,
      published_courses: publishedCourses || 0,
      draft_courses: draftCourses || 0,
      total_enrollments: totalEnrollments || 0,
      total_revenue: totalRevenue,
      average_rating: Math.round(averageRating * 10) / 10,
      completion_rate: Math.round(completionRate * 10) / 10
    };
  }

  /**
   * Search courses with advanced filtering
   */
  static async searchCourses(
    searchTerm: string,
    filters: {
      categories?: string[];
      difficulties?: string[];
      priceRange?: { min: number; max: number };
      rating?: number;
    } = {}
  ): Promise<Course[]> {
    const supabase = createClient();

    let query = supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, name, avatar_url),
        category:course_categories(id, name),
        enrollment_count:enrollments(count),
        average_rating:course_reviews(rating)
      `)
      .eq('published', true);

    // Apply search term
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,learning_objectives.cs.{${searchTerm}},tags.cs.{${searchTerm}}`);
    }

    // Apply filters
    if (filters.categories?.length) {
      query = query.in('category_id', filters.categories);
    }

    if (filters.difficulties?.length) {
      query = query.in('difficulty', filters.difficulties);
    }

    if (filters.priceRange) {
      query = query.gte('price', filters.priceRange.min).lte('price', filters.priceRange.max);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    // Filter by rating if specified
    let processedCourses = (data || []).map(course => ({
      ...course,
      enrollment_count: course.enrollment_count?.[0]?.count || 0,
      average_rating: course.average_rating?.length > 0 
        ? course.average_rating.reduce((sum: number, review: any) => sum + review.rating, 0) / course.average_rating.length
        : 0
    }));

    if (filters.rating) {
      processedCourses = processedCourses.filter(course => course.average_rating >= filters.rating!);
    }

    return processedCourses;
  }
}