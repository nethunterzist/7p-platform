/**
 * Google Analytics 4 (GA4) Integration Library
 * 
 * High-performance, privacy-compliant GA4 implementation for 7P Education Platform
 * Features: Educational event tracking, e-commerce, privacy controls, performance optimization
 */

// Type definitions for GA4 events and parameters
export interface GA4Event {
  event: string;
  [key: string]: string | number | boolean | undefined;
}

export interface GA4Config {
  measurement_id: string;
  cookie_domain?: string;
  cookie_expires?: number;
  allow_google_signals?: boolean;
  allow_ad_personalization_signals?: boolean;
}

export interface CourseEvent {
  course_id: string;
  course_name: string;
  course_category: string;
  instructor_id?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
  currency?: string;
}

export interface LessonEvent extends CourseEvent {
  lesson_id: string;
  lesson_name: string;
  lesson_duration?: number;
  lesson_type?: 'video' | 'text' | 'quiz' | 'assignment';
}

export interface QuizEvent extends LessonEvent {
  quiz_id: string;
  quiz_name: string;
  question_count?: number;
  time_limit?: number;
}

export interface UserEvent {
  user_id?: string;
  user_role?: 'student' | 'instructor' | 'admin';
  subscription_tier?: 'free' | 'premium' | 'enterprise';
  is_anonymous?: boolean;
}

export interface PerformanceMetrics {
  page_load_time?: number;
  time_to_interactive?: number;
  first_contentful_paint?: number;
  largest_contentful_paint?: number;
  cumulative_layout_shift?: number;
}

// GA4 Configuration
let ga4Config: GA4Config | null = null;
let isInitialized = false;
let cookieConsent = false;

/**
 * Initialize Google Analytics 4
 * Lazy loads GA4 script for optimal performance
 */
export function initializeGA4(config: GA4Config): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Store configuration
      ga4Config = config;
      
      // Check if already initialized
      if (isInitialized) {
        resolve();
        return;
      }

      // Skip in development/server-side
      if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
        console.log('GA4: Skipping initialization in development/SSR');
        resolve();
        return;
      }

      // Check for measurement ID
      if (!config.measurement_id || !config.measurement_id.startsWith('G-')) {
        console.warn('GA4: Invalid measurement ID provided');
        resolve();
        return;
      }

      // Create and load GA4 script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurement_id}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Initialize gtag
        if (typeof window !== 'undefined') {
          (window as any).dataLayer = (window as any).dataLayer || [];
          (window as any).gtag = function() {
            (window as any).dataLayer.push(arguments);
          };
          
          // Configure GA4
          (window as any).gtag('js', new Date());
          (window as any).gtag('config', config.measurement_id, {
            cookie_domain: config.cookie_domain || 'auto',
            cookie_expires: config.cookie_expires || 63072000, // 2 years
            allow_google_signals: config.allow_google_signals ?? false,
            allow_ad_personalization_signals: config.allow_ad_personalization_signals ?? false,
            send_page_view: false, // We'll handle page views manually
            anonymize_ip: true, // GDPR compliance
          });

          isInitialized = true;
          console.log('GA4: Successfully initialized');
          resolve();
        }
      };

      script.onerror = () => {
        console.error('GA4: Failed to load script');
        reject(new Error('Failed to load GA4 script'));
      };

      // Add script to head
      document.head.appendChild(script);

    } catch (error) {
      console.error('GA4: Initialization error:', error);
      reject(error);
    }
  });
}

/**
 * Set cookie consent status
 * Controls whether GA4 can use cookies for tracking
 */
export function setCookieConsent(consent: boolean): void {
  cookieConsent = consent;
  
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: consent ? 'granted' : 'denied',
      ad_storage: 'denied', // Always deny ad storage for privacy
      functionality_storage: consent ? 'granted' : 'denied',
      personalization_storage: 'denied', // Always deny for privacy
      security_storage: 'granted', // Always allow for security
    });
    
    console.log(`GA4: Cookie consent ${consent ? 'granted' : 'denied'}`);
  }
}

/**
 * Track page view with educational context
 */
export function trackPageView(
  path: string,
  title?: string,
  additionalParams?: Record<string, any>
): void {
  if (!isGA4Available()) return;

  try {
    const pageParams: Record<string, any> = {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
      user_engagement: true,
      ...additionalParams,
    };

    // Add educational context
    if (path.includes('/courses/')) {
      pageParams.content_group1 = 'courses';
      pageParams.page_type = 'course_page';
    } else if (path.includes('/lessons/')) {
      pageParams.content_group1 = 'lessons';
      pageParams.page_type = 'lesson_page';
    } else if (path.includes('/dashboard')) {
      pageParams.content_group1 = 'dashboard';
      pageParams.page_type = 'dashboard_page';
    } else if (path.includes('/admin')) {
      pageParams.content_group1 = 'admin';
      pageParams.page_type = 'admin_page';
    }

    (window as any).gtag('event', 'page_view', pageParams);
    
    console.log('GA4: Page view tracked:', path);
  } catch (error) {
    console.error('GA4: Page view tracking error:', error);
  }
}

/**
 * Track custom event with automatic retry
 */
export function trackEvent(
  eventName: string,
  parameters: Record<string, any> = {},
  retryOnFailure = true
): void {
  if (!isGA4Available()) return;

  try {
    // Clean and validate parameters
    const cleanParams = cleanEventParameters(parameters);
    
    // Add timestamp and session info
    const eventParams = {
      ...cleanParams,
      event_timestamp: Date.now(),
      session_engaged: true,
    };

    (window as any).gtag('event', eventName, eventParams);
    
    console.log(`GA4: Event tracked - ${eventName}`, eventParams);
  } catch (error) {
    console.error(`GA4: Event tracking error for ${eventName}:`, error);
    
    if (retryOnFailure) {
      // Retry once after a short delay
      setTimeout(() => trackEvent(eventName, parameters, false), 1000);
    }
  }
}

/**
 * EDUCATIONAL EVENTS
 */

/**
 * Track course view
 */
export function trackCourseView(courseData: CourseEvent & UserEvent): void {
  trackEvent('course_view', {
    course_id: courseData.course_id,
    course_name: courseData.course_name,
    course_category: courseData.course_category,
    instructor_id: courseData.instructor_id,
    difficulty_level: courseData.difficulty_level,
    user_role: courseData.user_role,
    content_type: 'course',
  });
}

/**
 * Track course enrollment
 */
export function trackCourseEnrollment(courseData: CourseEvent & UserEvent): void {
  trackEvent('course_enroll', {
    course_id: courseData.course_id,
    course_name: courseData.course_name,
    course_category: courseData.course_category,
    instructor_id: courseData.instructor_id,
    user_role: courseData.user_role,
    value: courseData.price || 0,
    currency: courseData.currency || 'USD',
  });
}

/**
 * Track lesson start
 */
export function trackLessonStart(lessonData: LessonEvent & UserEvent): void {
  trackEvent('lesson_start', {
    course_id: lessonData.course_id,
    course_name: lessonData.course_name,
    lesson_id: lessonData.lesson_id,
    lesson_name: lessonData.lesson_name,
    lesson_type: lessonData.lesson_type,
    lesson_duration: lessonData.lesson_duration,
    user_role: lessonData.user_role,
    content_type: 'lesson',
  });
}

/**
 * Track lesson completion
 */
export function trackLessonComplete(lessonData: LessonEvent & UserEvent & { completion_time?: number }): void {
  trackEvent('lesson_complete', {
    course_id: lessonData.course_id,
    course_name: lessonData.course_name,
    lesson_id: lessonData.lesson_id,
    lesson_name: lessonData.lesson_name,
    lesson_type: lessonData.lesson_type,
    completion_time: lessonData.completion_time,
    user_role: lessonData.user_role,
    content_type: 'lesson',
  });
}

/**
 * Track quiz attempt
 */
export function trackQuizStart(quizData: QuizEvent & UserEvent): void {
  trackEvent('quiz_start', {
    course_id: quizData.course_id,
    lesson_id: quizData.lesson_id,
    quiz_id: quizData.quiz_id,
    quiz_name: quizData.quiz_name,
    question_count: quizData.question_count,
    time_limit: quizData.time_limit,
    user_role: quizData.user_role,
    content_type: 'quiz',
  });
}

/**
 * Track quiz completion
 */
export function trackQuizComplete(
  quizData: QuizEvent & UserEvent & {
    score: number;
    max_score: number;
    time_spent: number;
    attempts_count: number;
  }
): void {
  trackEvent('quiz_complete', {
    course_id: quizData.course_id,
    lesson_id: quizData.lesson_id,
    quiz_id: quizData.quiz_id,
    quiz_name: quizData.quiz_name,
    score: quizData.score,
    max_score: quizData.max_score,
    score_percentage: Math.round((quizData.score / quizData.max_score) * 100),
    time_spent: quizData.time_spent,
    attempts_count: quizData.attempts_count,
    user_role: quizData.user_role,
    content_type: 'quiz',
  });
}

/**
 * Track course completion
 */
export function trackCourseComplete(
  courseData: CourseEvent & UserEvent & {
    completion_time_days: number;
    lessons_completed: number;
    total_lessons: number;
    average_quiz_score: number;
  }
): void {
  trackEvent('course_complete', {
    course_id: courseData.course_id,
    course_name: courseData.course_name,
    course_category: courseData.course_category,
    completion_time_days: courseData.completion_time_days,
    lessons_completed: courseData.lessons_completed,
    total_lessons: courseData.total_lessons,
    completion_rate: Math.round((courseData.lessons_completed / courseData.total_lessons) * 100),
    average_quiz_score: courseData.average_quiz_score,
    user_role: courseData.user_role,
    value: courseData.price || 0,
    currency: courseData.currency || 'USD',
  });
}

/**
 * E-COMMERCE EVENTS
 */

/**
 * Track purchase (course purchase)
 */
export function trackPurchase(
  transactionId: string,
  items: Array<{
    item_id: string;
    item_name: string;
    item_category: string;
    price: number;
    quantity?: number;
  }>,
  userData: UserEvent & { total_value: number; currency?: string }
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: userData.total_value,
    currency: userData.currency || 'USD',
    user_role: userData.user_role,
    items: items.map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      item_category: item.item_category,
      price: item.price,
      quantity: item.quantity || 1,
    })),
  });
}

/**
 * Track subscription start
 */
export function trackSubscriptionStart(
  subscriptionData: {
    subscription_id: string;
    plan_name: string;
    plan_price: number;
    billing_cycle: 'monthly' | 'yearly';
    currency?: string;
  } & UserEvent
): void {
  trackEvent('subscription_start', {
    subscription_id: subscriptionData.subscription_id,
    plan_name: subscriptionData.plan_name,
    plan_price: subscriptionData.plan_price,
    billing_cycle: subscriptionData.billing_cycle,
    currency: subscriptionData.currency || 'USD',
    user_role: subscriptionData.user_role,
    value: subscriptionData.plan_price,
  });
}

/**
 * USER ENGAGEMENT EVENTS
 */

/**
 * Track user registration
 */
export function trackUserRegistration(userData: {
  user_id: string;
  registration_method: 'email' | 'google' | 'facebook';
  user_role: 'student' | 'instructor';
}): void {
  trackEvent('sign_up', {
    user_id: userData.user_id,
    method: userData.registration_method,
    user_role: userData.user_role,
  });
}

/**
 * Track user login
 */
export function trackUserLogin(userData: {
  user_id: string;
  login_method: 'email' | 'google' | 'facebook';
  user_role: 'student' | 'instructor' | 'admin';
}): void {
  trackEvent('login', {
    user_id: userData.user_id,
    method: userData.login_method,
    user_role: userData.user_role,
  });
}

/**
 * Track search
 */
export function trackSearch(searchData: {
  search_term: string;
  search_results_count: number;
  search_category?: string;
}): void {
  trackEvent('search', {
    search_term: searchData.search_term,
    search_results: searchData.search_results_count,
    search_category: searchData.search_category || 'courses',
  });
}

/**
 * Track messaging activity
 */
export function trackMessage(messageData: {
  message_type: 'send' | 'receive';
  conversation_type: 'student_instructor' | 'student_admin' | 'group';
  user_role: 'student' | 'instructor' | 'admin';
}): void {
  trackEvent('message_activity', {
    message_type: messageData.message_type,
    conversation_type: messageData.conversation_type,
    user_role: messageData.user_role,
  });
}

/**
 * PERFORMANCE TRACKING
 */

/**
 * Track Core Web Vitals and performance metrics
 */
export function trackPerformanceMetrics(metrics: PerformanceMetrics): void {
  trackEvent('performance_metrics', {
    page_load_time: metrics.page_load_time,
    time_to_interactive: metrics.time_to_interactive,
    first_contentful_paint: metrics.first_contentful_paint,
    largest_contentful_paint: metrics.largest_contentful_paint,
    cumulative_layout_shift: metrics.cumulative_layout_shift,
  });
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Check if GA4 is available and cookies are consented
 */
function isGA4Available(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isInitialized || !ga4Config) return false;
  if (!cookieConsent) {
    console.log('GA4: Tracking skipped - no cookie consent');
    return false;
  }
  if (!(window as any).gtag) {
    console.warn('GA4: gtag not available');
    return false;
  }
  return true;
}

/**
 * Clean and validate event parameters
 */
function cleanEventParameters(params: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    // Skip undefined, null, or empty string values
    if (value === undefined || value === null || value === '') continue;
    
    // Convert to appropriate types
    if (typeof value === 'string') {
      // Truncate long strings
      cleaned[key] = value.length > 100 ? value.substring(0, 100) : value;
    } else if (typeof value === 'number') {
      // Ensure valid numbers
      cleaned[key] = isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      // Keep arrays for items parameter
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Get current GA4 configuration
 */
export function getGA4Config(): GA4Config | null {
  return ga4Config;
}

/**
 * Check if GA4 is initialized
 */
export function isGA4Initialized(): boolean {
  return isInitialized;
}

/**
 * Check cookie consent status
 */
export function getCookieConsent(): boolean {
  return cookieConsent;
}

/**
 * Enable debug mode (development only)
 */
export function enableDebugMode(): void {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).gtag_debug = true;
    console.log('GA4: Debug mode enabled');
  }
}

// Export types for use in other files
export type {
  GA4Event,
  GA4Config,
  CourseEvent,
  LessonEvent,
  QuizEvent,
  UserEvent,
  PerformanceMetrics,
};