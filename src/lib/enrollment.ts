// PRODUCTION ENROLLMENT SYSTEM - Real Supabase Integration

export interface UserEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
  lastAccessedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
}

// Real user authentication through Supabase
const getCurrentUserId = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Import Supabase client
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    
    // Get current user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Kullanıcının bir kursa kayıtlı olup olmadığını kontrol eder
 */
export const isUserEnrolledInCourse = async (courseId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  try {
    const { supabaseData } = await import('@/lib/supabase-data');
    return await supabaseData.isUserEnrolledInCourse(userId, courseId);
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return false;
  }
};

/**
 * Kullanıcının bir derse erişim yetkisi olup olmadığını kontrol eder
 */
export const canUserAccessLesson = async (courseId: string, lessonId: string): Promise<boolean> => {
  // Önce kursa kayıtlı mı kontrol et
  const isEnrolled = await isUserEnrolledInCourse(courseId);
  if (!isEnrolled) {
    return false;
  }

  // Preview derslere herkes erişebilir
  // Bu bilgiyi course data'sından alacağız
  return true;
};

/**
 * Kullanıcının kayıtlı olduğu kursları getirir
 */
export const getUserEnrolledCourses = async (): Promise<string[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { supabaseData } = await import('@/lib/supabase-data');
    const enrollments = await supabaseData.getUserEnrollments(userId);
    return enrollments.map(enrollment => enrollment.course_id);
  } catch (error) {
    console.error('Error getting enrolled courses:', error);
    return [];
  }
};

/**
 * Kullanıcının bir kurstaki ilerlemesini getirir
 */
export const getUserCourseProgress = async (courseId: string): Promise<UserEnrollment | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { supabaseData } = await import('@/lib/supabase-data');
    const enrollments = await supabaseData.getUserEnrollments(userId);
    const enrollment = enrollments.find(e => e.course_id === courseId);
    
    if (!enrollment) return null;
    
    return {
      userId: enrollment.user_id,
      courseId: enrollment.course_id,
      enrolledAt: enrollment.enrolled_at,
      progress: enrollment.progress_percentage,
      completedLessons: [], // TODO: Implement completed lessons tracking
      lastAccessedAt: enrollment.last_accessed_at,
      status: enrollment.status
    };
  } catch (error) {
    console.error('Error getting course progress:', error);
    return null;
  }
};

/**
 * Kullanıcının oturum açıp açmadığını kontrol eder
 */
export const isUserLoggedIn = async (): Promise<boolean> => {
  const userId = await getCurrentUserId();
  return userId !== null;
};

/**
 * Login redirect helper
 */
export const redirectToLogin = (returnUrl?: string) => {
  const url = returnUrl ? `/login?return=${encodeURIComponent(returnUrl)}` : '/login';
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
};

/**
 * Marketplace'e redirect helper
 */
export const redirectToMarketplace = (courseSlug: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = `/marketplace/${courseSlug}`;
  }
};

/**
 * Course learning page'e redirect helper  
 */
export const redirectToCourseLearning = (courseId: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = `/learn/${courseId}`;
  }
};

/**
 * Real enrollment function using Supabase
 */
export const enrollUserInCourse = async (courseId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  try {
    const { supabaseData } = await import('@/lib/supabase-data');
    const enrollment = await supabaseData.enrollUserInCourse(userId, courseId);
    return !!enrollment;
  } catch (error) {
    console.error('Enrollment failed:', error);
    return false;
  }
};