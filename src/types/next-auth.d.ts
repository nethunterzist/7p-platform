/**
 * NextAuth.js Type Definitions
 * Extended types for authentication system
 */

import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      emailVerified: boolean
      phone?: string
      timezone?: string
      language?: string
      preferences?: UserPreferences
      stats?: UserStats
      created_at: string
      last_active_at?: string
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: UserRole
    emailVerified: boolean
    phone?: string
    timezone?: string
    language?: string
    preferences?: UserPreferences
    stats?: UserStats
    created_at: string
    last_active_at?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string
    role: UserRole
    emailVerified: boolean
    phone?: string
    timezone?: string
    language?: string
  }
}

// User role types
export type UserRole = 'student' | 'instructor' | 'admin' | 'support'

// User preferences
export interface UserPreferences {
  email_notifications: boolean
  course_updates: boolean
  marketing_emails: boolean
  assignment_reminders: boolean
}

// User statistics
export interface UserStats {
  total_enrollments: number
  completed_courses: number
  active_courses: number
  recent_activity: ActivityItem[]
}

// Activity item
export interface ActivityItem {
  id: string
  type: 'lesson_completed' | 'course_enrolled' | 'course_completed' | 'assignment_submitted'
  title: string
  description?: string
  created_at: string
  metadata?: Record<string, any>
}