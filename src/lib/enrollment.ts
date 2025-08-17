// Enrollment ve course access control utilities

export interface UserEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
  lastAccessedAt?: string;
}

// Mock enrolled courses data - gerçek uygulamada backend'den gelecek
const MOCK_ENROLLMENTS: UserEnrollment[] = [
  // amazon-full-mentoring kursunu geçici olarak çıkardık - test için
  // {
  //   userId: 'user-1',
  //   courseId: 'amazon-full-mentoring',
  //   enrolledAt: '2024-01-10T10:00:00Z',
  //   progress: 35,
  //   completedLessons: ['1', '2', '3'],
  //   lastAccessedAt: '2024-01-15T14:30:00Z'
  // },
  {
    userId: 'user-1', 
    courseId: 'amazon-ppc',
    enrolledAt: '2024-01-12T15:00:00Z',
    progress: 60,
    completedLessons: ['ppc-1'],
    lastAccessedAt: '2024-01-14T16:45:00Z'
  }
];

// Mock user ID - gerçek uygulamada auth context'ten gelecek
const getCurrentUserId = (): string | null => {
  // Check if user is "logged in" (has auth token)
  if (typeof window === 'undefined') return null;
  
  let authToken = localStorage.getItem('auth-token');
  
  // Demo için otomatik login - gerçek uygulamada kaldırılacak
  if (!authToken) {
    localStorage.setItem('auth-token', 'mock-token-user-1');
    authToken = 'mock-token-user-1';
  }
  
  return authToken ? 'user-1' : null; // Mock user ID
};

/**
 * Kullanıcının bir kursa kayıtlı olup olmadığını kontrol eder
 */
export const isUserEnrolledInCourse = (courseId: string): boolean => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  return MOCK_ENROLLMENTS.some(
    enrollment => enrollment.userId === userId && enrollment.courseId === courseId
  );
};

/**
 * Kullanıcının bir derse erişim yetkisi olup olmadığını kontrol eder
 */
export const canUserAccessLesson = (courseId: string, lessonId: string): boolean => {
  // Önce kursa kayıtlı mı kontrol et
  if (!isUserEnrolledInCourse(courseId)) {
    return false;
  }

  // Preview derslere herkes erişebilir
  // Bu bilgiyi course data'sından alacağız
  return true;
};

/**
 * Kullanıcının kayıtlı olduğu kursları getirir
 */
export const getUserEnrolledCourses = (): string[] => {
  const userId = getCurrentUserId();
  if (!userId) return [];

  return MOCK_ENROLLMENTS
    .filter(enrollment => enrollment.userId === userId)
    .map(enrollment => enrollment.courseId);
};

/**
 * Kullanıcının bir kurstaki ilerlemesini getirir
 */
export const getUserCourseProgress = (courseId: string): UserEnrollment | null => {
  const userId = getCurrentUserId();
  if (!userId) return null;

  return MOCK_ENROLLMENTS.find(
    enrollment => enrollment.userId === userId && enrollment.courseId === courseId
  ) || null;
};

/**
 * Kullanıcının oturum açıp açmadığını kontrol eder
 */
export const isUserLoggedIn = (): boolean => {
  return getCurrentUserId() !== null;
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
 * Mock enrollment function - gerçek uygulamada API call olacak
 */
export const enrollUserInCourse = async (courseId: string): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add to mock enrollments
    const newEnrollment: UserEnrollment = {
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
      progress: 0,
      completedLessons: [],
      lastAccessedAt: new Date().toISOString()
    };
    
    MOCK_ENROLLMENTS.push(newEnrollment);
    return true;
  } catch (error) {
    console.error('Enrollment failed:', error);
    return false;
  }
};