/**
 * MAIN DATA EXPORT - 7P Education MVP
 * Core MVP data exports
 */

// Core MVP exports
export * from './courses';
export * from './settings';
export * from './dashboard';

// Re-export commonly used types
export type {
  Course,
  CourseDetail,
  Lesson
} from './courses';

export type {
  UserProfile,
  PlatformPreferences,
  NotificationSettings,
  ActiveDevice,
  PaymentMethod,
  Subscription,
  Invoice,
  SecuritySettings
} from './settings';

export type {
  DashboardStats,
  RecentActivity,
  UpcomingDeadline,
  LearningStreak,
  CourseProgress,
  WeeklyProgress,
  Notification,
  Announcement
} from './dashboard';

// MVP Data summary
export const DATA_SUMMARY = {
  courses: {
    main: 4,
    all: 5,
    marketplace: 2,
    details: 2
  },
  settings: {
    devices: 4,
    payment_methods: 2,
    invoices: 3
  },
  dashboard: {
    activities: 5,
    deadlines: 4,
    notifications: 4,
    announcements: 3,
    course_progress: 4
  }
} as const;