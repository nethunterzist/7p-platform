import { supabase } from './supabase';

/**
 * Analytics Data Layer for Dashboard KPIs
 * Server-side compatible functions for fetching real-time analytics data
 */

// Type definitions for the analytics data
export interface DashboardKPIs {
  totalStudents: number;
  totalCourses: number;
  averageCompletion: number;
}

export interface StudentRegistrationTrendData {
  date: string;
  count: number;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
}

/**
 * Fetches real-time KPI data from Supabase for the admin dashboard
 * 
 * This function performs optimized queries to gather:
 * - Total number of students (non-admin profiles)
 * - Total number of active courses
 * - Average completion percentage across all user progress
 * 
 * @returns Promise<DashboardKPIs> - Object containing the three main KPIs
 * @throws Error - When database queries fail or data is invalid
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  try {
    // Execute all three queries in parallel for optimal performance
    const [studentsResult, coursesResult, progressResult] = await Promise.all([
      // Query 1: Count total students (profiles where is_admin = false or null)
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('is_admin.eq.false,is_admin.is.null'),

      // Query 2: Count total courses (assuming active courses or all courses)
      supabase
        .from('courses')
        .select('id', { count: 'exact', head: true }),

      // Query 3: Calculate average completion from user_progress table
      supabase
        .from('user_progress')
        .select('progress_percentage')
    ]);

    // Check for errors in each query
    if (studentsResult.error) {
      console.error('Error fetching students count:', studentsResult.error);
      throw new Error(`Failed to fetch students data: ${studentsResult.error.message}`);
    }

    if (coursesResult.error) {
      console.error('Error fetching courses count:', coursesResult.error);
      throw new Error(`Failed to fetch courses data: ${coursesResult.error.message}`);
    }

    if (progressResult.error) {
      console.error('Error fetching progress data:', progressResult.error);
      throw new Error(`Failed to fetch progress data: ${progressResult.error.message}`);
    }

    // Extract the counts with null safety
    const totalStudents = studentsResult.count ?? 0;
    const totalCourses = coursesResult.count ?? 0;

    // Calculate average completion percentage
    let averageCompletion = 0;
    
    if (progressResult.data && progressResult.data.length > 0) {
      const progressData = progressResult.data.filter(
        (item): item is { progress_percentage: number } => 
          item?.progress_percentage !== null && 
          item?.progress_percentage !== undefined &&
          typeof item.progress_percentage === 'number'
      );

      if (progressData.length > 0) {
        const totalProgress = progressData.reduce(
          (sum, item) => sum + item.progress_percentage, 
          0
        );
        averageCompletion = Math.round(totalProgress / progressData.length);
      }
    }

    // Validate the results
    if (totalStudents < 0 || totalCourses < 0 || averageCompletion < 0 || averageCompletion > 100) {
      throw new Error('Invalid data received from database queries');
    }

    const result: DashboardKPIs = {
      totalStudents,
      totalCourses,
      averageCompletion
    };

    console.log('Successfully fetched dashboard KPIs:', result);
    return result;

  } catch (error) {
    // Enhanced error handling with proper typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.error('Error in getDashboardKPIs:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    // Re-throw with a more descriptive error for the calling code
    throw new Error(`Analytics data fetch failed: ${errorMessage}`);
  }
}

/**
 * Server-side compatible wrapper for getDashboardKPIs
 * This function can be used in Next.js 15 server components and API routes
 * 
 * @returns Promise<DashboardKPIs | null> - KPI data or null if error
 */
export async function getServerSideDashboardKPIs(): Promise<DashboardKPIs | null> {
  try {
    return await getDashboardKPIs();
  } catch (error) {
    // Log error server-side but don't throw to prevent page crashes
    console.error('Server-side analytics fetch failed:', error);
    return null;
  }
}

/**
 * Validates if the user has admin privileges to access analytics data
 * Should be called before displaying sensitive analytics information
 * 
 * @param userId - The user ID to check admin status for
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export async function validateAdminAccess(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error validating admin access:', error);
      return false;
    }

    return data?.is_admin === true;
  } catch (error) {
    console.error('Error in validateAdminAccess:', error);
    return false;
  }
}

/**
 * Fetches student registration trends for the last 30 days
 * 
 * This function queries the profiles table for new student registrations
 * and returns daily counts with Turkish locale date formatting.
 * 
 * @returns Promise<StudentRegistrationTrendData[]> - Array of daily registration counts
 * @throws Error - When database queries fail or data processing errors occur
 */
export async function getStudentRegistrationTrend(): Promise<StudentRegistrationTrendData[]> {
  try {
    // Calculate date range for last 30 days in UTC
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29); // 30 days including today
    
    // Format dates for Supabase query (UTC)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query profiles for new student registrations in the last 30 days
    const { data, error } = await supabase
      .from('profiles')
      .select('created_at')
      .or('is_admin.eq.false,is_admin.is.null') // Exclude admin users
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching student registration data:', error);
      throw new Error(`Failed to fetch registration data: ${error.message}`);
    }

    // Create a map to store daily counts
    const dailyCounts = new Map<string, number>();
    
    // Initialize all 30 days with 0 counts
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyCounts.set(dateKey, 0);
    }

    // Process the registration data and count by day
    if (data && data.length > 0) {
      data.forEach(profile => {
        if (profile.created_at) {
          // Extract date from created_at timestamp
          const registrationDate = new Date(profile.created_at).toISOString().split('T')[0];
          const currentCount = dailyCounts.get(registrationDate) || 0;
          dailyCounts.set(registrationDate, currentCount + 1);
        }
      });
    }

    // Turkish month abbreviations
    const turkishMonths = [
      'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
      'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
    ];

    // Format the result with Turkish locale dates
    const result: StudentRegistrationTrendData[] = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const count = dailyCounts.get(dateKey) || 0;
      
      // Format date as "25 Tem", "26 Tem" etc.
      const day = date.getDate();
      const monthIndex = date.getMonth();
      const formattedDate = `${day} ${turkishMonths[monthIndex]}`;
      
      result.push({
        date: formattedDate,
        count: count
      });
    }

    console.log(`Successfully fetched student registration trends: ${result.length} days processed`);
    return result;

  } catch (error) {
    // Enhanced error handling with proper typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.error('Error in getStudentRegistrationTrend:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    // Re-throw with a more descriptive error for the calling code
    throw new Error(`Student registration trend fetch failed: ${errorMessage}`);
  }
}

/**
 * Enhanced KPI fetcher with additional metrics for comprehensive dashboard
 * 
 * @returns Promise<ExtendedDashboardKPIs> - Extended KPI object with additional metrics
 */
export interface ExtendedDashboardKPIs extends DashboardKPIs {
  activeStudents: number;  // Students who accessed platform in last 30 days
  completedCourses: number; // Total course completions
  totalLessons: number;     // Total lessons across all courses
}

export async function getExtendedDashboardKPIs(): Promise<ExtendedDashboardKPIs> {
  try {
    // Get base KPIs first
    const baseKPIs = await getDashboardKPIs();
    
    // Get additional metrics in parallel
    const [activeStudentsResult, completedCoursesResult, totalLessonsResult] = await Promise.all([
      // Active students in last 30 days
      supabase
        .from('user_progress')
        .select('user_id', { count: 'exact', head: true })
        .gte('last_accessed', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .not('user_id', 'is', null),

      // Completed courses count
      supabase
        .from('course_completions')
        .select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null),

      // Total lessons count
      supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true })
    ]);

    // Handle potential errors
    if (activeStudentsResult.error || completedCoursesResult.error || totalLessonsResult.error) {
      console.warn('Some extended metrics failed to load, using base KPIs');
      return {
        ...baseKPIs,
        activeStudents: 0,
        completedCourses: 0,
        totalLessons: 0
      };
    }

    return {
      ...baseKPIs,
      activeStudents: activeStudentsResult.count ?? 0,
      completedCourses: completedCoursesResult.count ?? 0,
      totalLessons: totalLessonsResult.count ?? 0
    };

  } catch (error) {
    console.error('Error fetching extended KPIs:', error);
    // Fallback to base KPIs if extended metrics fail
    const baseKPIs = await getDashboardKPIs();
    return {
      ...baseKPIs,
      activeStudents: 0,
      completedCourses: 0,
      totalLessons: 0
    };
  }
}

// Type definition for quiz performance data
export interface QuizPerformanceData {
  quizName: string;
  averageScore: number; // 0-100%
  completionRate: number; // 0-100%
  attempts: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
}

/**
 * Fetches quiz performance data from Supabase database
 * 
 * This function queries the database to gather quiz performance metrics including:
 * - Quiz names from lessons table
 * - Average scores from quiz_attempts
 * - Completion rates based on quiz_answers vs attempts
 * - Total attempt counts
 * - Calculated difficulty levels based on average performance
 * 
 * @returns Promise<QuizPerformanceData[]> - Array of quiz performance metrics
 * @throws Error - When database queries fail or data processing errors occur
 */
export async function getQuizPerformanceData(): Promise<QuizPerformanceData[]> {
  try {
    console.log('Starting quiz performance data fetch...');

    // Execute parallel queries for optimal performance
    const [quizAttemptsResult, quizAnswersResult, lessonsResult] = await Promise.all([
      // Query 1: Get all quiz attempts with scores
      supabase
        .from('quiz_attempts')
        .select(`
          id,
          lesson_id,
          score,
          completed_at,
          created_at
        `)
        .not('score', 'is', null),

      // Query 2: Get quiz answers to calculate completion rates
      supabase
        .from('quiz_answers')
        .select(`
          id,
          attempt_id,
          quiz_attempts!inner(
            lesson_id,
            completed_at
          )
        `),

      // Query 3: Get lesson information for quiz names
      supabase
        .from('lessons')
        .select(`
          id,
          title,
          course_id
        `)
        .not('title', 'is', null)
    ]);

    // Check for errors in each query
    if (quizAttemptsResult.error) {
      console.error('Error fetching quiz attempts:', quizAttemptsResult.error);
      throw new Error(`Failed to fetch quiz attempts: ${quizAttemptsResult.error.message}`);
    }

    if (quizAnswersResult.error) {
      console.error('Error fetching quiz answers:', quizAnswersResult.error);
      throw new Error(`Failed to fetch quiz answers: ${quizAnswersResult.error.message}`);
    }

    if (lessonsResult.error) {
      console.error('Error fetching lessons:', lessonsResult.error);
      throw new Error(`Failed to fetch lessons: ${lessonsResult.error.message}`);
    }

    // Process the data with null safety
    const quizAttempts = quizAttemptsResult.data || [];
    const quizAnswers = quizAnswersResult.data || [];
    const lessons = lessonsResult.data || [];

    console.log(`Fetched ${quizAttempts.length} quiz attempts, ${quizAnswers.length} quiz answers, ${lessons.length} lessons`);

    // Create a map of lessons for quick lookup
    const lessonsMap = new Map(lessons.map(lesson => [lesson.id, lesson]));

    // Group quiz attempts by lesson_id and calculate metrics
    const quizMetrics = new Map<string, {
      lessonId: string;
      lessonTitle: string;
      scores: number[];
      totalAttempts: number;
      completedAttempts: number;
    }>();

    // Process quiz attempts
    for (const attempt of quizAttempts) {
      if (!attempt.lesson_id || typeof attempt.score !== 'number') continue;

      const lessonId = attempt.lesson_id;
      const lesson = lessonsMap.get(lessonId);
      
      if (!lesson) continue; // Skip if lesson not found

      if (!quizMetrics.has(lessonId)) {
        quizMetrics.set(lessonId, {
          lessonId,
          lessonTitle: lesson.title || `Lesson ${lessonId}`,
          scores: [],
          totalAttempts: 0,
          completedAttempts: 0
        });
      }

      const metrics = quizMetrics.get(lessonId)!;
      metrics.totalAttempts++;
      
      // Add score to the array
      metrics.scores.push(attempt.score);
      
      // Count as completed if has completed_at timestamp
      if (attempt.completed_at) {
        metrics.completedAttempts++;
      }
    }

    // Count quiz answers to enhance completion rate calculation
    const answerCounts = new Map<string, number>();
    for (const answer of quizAnswers) {
      if (!answer.quiz_attempts?.lesson_id) continue;
      
      const lessonId = answer.quiz_attempts.lesson_id;
      answerCounts.set(lessonId, (answerCounts.get(lessonId) || 0) + 1);
    }

    // Calculate final metrics and build result array
    const result: QuizPerformanceData[] = [];

    for (const [lessonId, metrics] of quizMetrics) {
      if (metrics.scores.length === 0) continue; // Skip lessons with no valid scores

      // Calculate average score
      const averageScore = Math.round(
        metrics.scores.reduce((sum, score) => sum + score, 0) / metrics.scores.length
      );

      // Calculate completion rate
      // Use quiz_answers count if available, otherwise use completed attempts
      const answersCount = answerCounts.get(lessonId) || 0;
      const completedCount = Math.max(metrics.completedAttempts, answersCount > 0 ? Math.ceil(answersCount / 5) : 0); // Assuming ~5 questions per quiz
      const completionRate = metrics.totalAttempts > 0 
        ? Math.round((completedCount / metrics.totalAttempts) * 100)
        : 0;

      // Determine difficulty level based on average score
      let difficultyLevel: 'easy' | 'medium' | 'hard';
      if (averageScore >= 70) {
        difficultyLevel = 'easy';
      } else if (averageScore >= 40) {
        difficultyLevel = 'medium';
      } else {
        difficultyLevel = 'hard';
      }

      // Ensure completion rate doesn't exceed 100%
      const finalCompletionRate = Math.min(completionRate, 100);

      result.push({
        quizName: metrics.lessonTitle,
        averageScore: Math.max(0, Math.min(100, averageScore)), // Clamp between 0-100
        completionRate: Math.max(0, finalCompletionRate), // Clamp between 0-100
        attempts: metrics.totalAttempts,
        difficultyLevel
      });
    }

    // Sort by quiz name for consistent display
    result.sort((a, b) => a.quizName.localeCompare(b.quizName, 'tr'));

    // Validate the results
    for (const item of result) {
      if (item.averageScore < 0 || item.averageScore > 100 ||
          item.completionRate < 0 || item.completionRate > 100 ||
          item.attempts < 0) {
        console.warn('Invalid quiz performance data detected:', item);
      }
    }

    console.log(`Successfully processed quiz performance data for ${result.length} quizzes`);
    return result;

  } catch (error) {
    // Enhanced error handling with proper typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.error('Error in getQuizPerformanceData:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    // Re-throw with a more descriptive error for the calling code
    throw new Error(`Quiz performance data fetch failed: ${errorMessage}`);
  }
}

/**
 * Server-side compatible wrapper for getQuizPerformanceData
 * This function can be used in Next.js 15 server components and API routes
 * 
 * @returns Promise<QuizPerformanceData[] | null> - Quiz performance data or null if error
 */
export async function getServerSideQuizPerformanceData(): Promise<QuizPerformanceData[] | null> {
  try {
    return await getQuizPerformanceData();
  } catch (error) {
    // Log error server-side but don't throw to prevent page crashes
    console.error('Server-side quiz performance fetch failed:', error);
    return null;
  }
}

// Type definition for course completion data
export interface CourseCompletionData {
  courseName: string;
  totalEnrolled: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number; // 0-100%
}

/**
 * Fetches course completion data from Supabase database
 * 
 * This function queries the database to gather course completion metrics including:
 * - Course names from courses table
 * - Total enrolled students from user_progress
 * - Completed students (progress_percentage = 100)
 * - In progress students (0 < progress_percentage < 100)
 * - Not started students (progress_percentage = 0 or null)
 * - Overall completion rate percentage
 * 
 * @returns Promise<CourseCompletionData[]> - Array of course completion metrics
 * @throws Error - When database queries fail or data processing errors occur
 */
export async function getCourseCompletionData(): Promise<CourseCompletionData[]> {
  try {
    console.log('Starting course completion data fetch...');

    // Execute parallel queries for optimal performance
    const [coursesResult, userProgressResult] = await Promise.all([
      // Query 1: Get all courses with their titles
      supabase
        .from('courses')
        .select(`
          id,
          title
        `)
        .not('title', 'is', null),

      // Query 2: Get all user progress data with course and user information
      supabase
        .from('user_progress')
        .select(`
          id,
          course_id,
          user_id,
          progress_percentage,
          profiles!inner(
            id,
            is_admin
          )
        `)
        .or('profiles.is_admin.eq.false,profiles.is_admin.is.null') // Only include non-admin users
    ]);

    // Check for errors in each query
    if (coursesResult.error) {
      console.error('Error fetching courses:', coursesResult.error);
      throw new Error(`Failed to fetch courses data: ${coursesResult.error.message}`);
    }

    if (userProgressResult.error) {
      console.error('Error fetching user progress:', userProgressResult.error);
      throw new Error(`Failed to fetch user progress data: ${userProgressResult.error.message}`);
    }

    // Process the data with null safety
    const courses = coursesResult.data || [];
    const userProgress = userProgressResult.data || [];

    console.log(`Fetched ${courses.length} courses and ${userProgress.length} user progress records`);

    // Create a map to store course metrics
    const courseMetrics = new Map<string, {
      courseId: string;
      courseName: string;
      totalEnrolled: number;
      completed: number;
      inProgress: number;
      notStarted: number;
    }>();

    // Initialize metrics for all courses
    for (const course of courses) {
      if (!course.id || !course.title) continue;
      
      courseMetrics.set(course.id, {
        courseId: course.id,
        courseName: course.title,
        totalEnrolled: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0
      });
    }

    // Process user progress data
    for (const progress of userProgress) {
      if (!progress.course_id || !progress.profiles) continue;

      const courseId = progress.course_id;
      const metrics = courseMetrics.get(courseId);
      
      if (!metrics) {
        // Course exists in user_progress but not in courses table
        // Skip this record to maintain data integrity
        continue;
      }

      // Increment total enrolled
      metrics.totalEnrolled++;

      // Categorize based on progress percentage
      const progressPercentage = progress.progress_percentage;
      
      if (progressPercentage === null || progressPercentage === undefined || progressPercentage === 0) {
        // Not started
        metrics.notStarted++;
      } else if (progressPercentage >= 100) {
        // Completed
        metrics.completed++;
      } else if (progressPercentage > 0 && progressPercentage < 100) {
        // In progress
        metrics.inProgress++;
      } else {
        // Invalid progress percentage, treat as not started
        metrics.notStarted++;
      }
    }

    // Calculate final metrics and build result array
    const result: CourseCompletionData[] = [];

    for (const [courseId, metrics] of courseMetrics) {
      // Calculate completion rate
      const completionRate = metrics.totalEnrolled > 0 
        ? Math.round((metrics.completed / metrics.totalEnrolled) * 100)
        : 0;

      // Validate data integrity
      const totalCheck = metrics.completed + metrics.inProgress + metrics.notStarted;
      if (totalCheck !== metrics.totalEnrolled && metrics.totalEnrolled > 0) {
        console.warn(`Data integrity issue for course ${metrics.courseName}: ${totalCheck} vs ${metrics.totalEnrolled}`);
      }

      result.push({
        courseName: metrics.courseName,
        totalEnrolled: metrics.totalEnrolled,
        completed: metrics.completed,
        inProgress: metrics.inProgress,
        notStarted: metrics.notStarted,
        completionRate: Math.max(0, Math.min(100, completionRate)) // Clamp between 0-100
      });
    }

    // Sort by completion rate (descending) and then by course name for consistent display
    result.sort((a, b) => {
      if (b.completionRate !== a.completionRate) {
        return b.completionRate - a.completionRate;
      }
      return a.courseName.localeCompare(b.courseName, 'tr');
    });

    // Validate the results
    for (const item of result) {
      if (item.completionRate < 0 || item.completionRate > 100 ||
          item.totalEnrolled < 0 || item.completed < 0 || 
          item.inProgress < 0 || item.notStarted < 0) {
        console.warn('Invalid course completion data detected:', item);
      }
      
      // Additional validation: sum should equal total
      const sum = item.completed + item.inProgress + item.notStarted;
      if (sum !== item.totalEnrolled && item.totalEnrolled > 0) {
        console.warn('Data consistency issue detected:', {
          courseName: item.courseName,
          sum,
          totalEnrolled: item.totalEnrolled
        });
      }
    }

    console.log(`Successfully processed course completion data for ${result.length} courses`);
    return result;

  } catch (error) {
    // Enhanced error handling with proper typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.error('Error in getCourseCompletionData:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    // Re-throw with a more descriptive error for the calling code
    throw new Error(`Course completion data fetch failed: ${errorMessage}`);
  }
}

/**
 * Server-side compatible wrapper for getCourseCompletionData
 * This function can be used in Next.js 15 server components and API routes
 * 
 * @returns Promise<CourseCompletionData[] | null> - Course completion data or null if error
 */
export async function getServerSideCourseCompletionData(): Promise<CourseCompletionData[] | null> {
  try {
    return await getCourseCompletionData();
  } catch (error) {
    // Log error server-side but don't throw to prevent page crashes
    console.error('Server-side course completion fetch failed:', error);
    return null;
  }
}