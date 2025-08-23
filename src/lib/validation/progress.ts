import { z } from 'zod';

// Progress update schema
export const progressUpdateSchema = z.object({
  lesson_id: z.string().uuid('Invalid lesson ID'),
  video_watch_percentage: z.number().min(0).max(100).optional(),
  time_spent_minutes: z.number().min(0).max(1440), // Max 24 hours
  last_position_seconds: z.number().min(0).optional(),
  quiz_score: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

// Quiz result schema
export const quizResultSchema = z.object({
  quiz_id: z.string().uuid('Invalid quiz ID'),
  lesson_id: z.string().uuid('Invalid lesson ID'),
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    answer: z.string().min(1),
  })),
  time_spent_minutes: z.number().min(0).max(120), // Max 2 hours
  attempt_number: z.number().min(1).max(5).optional(),
});

// Progress query schema
export const progressQuerySchema = z.object({
  course_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  include_analytics: z.coerce.boolean().default(false),
});

// Instructor progress query schema
export const instructorProgressQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'all']).default('month'),
  student_status: z.enum(['all', 'active', 'at_risk', 'completed']).default('all'),
  include_details: z.coerce.boolean().default(false),
});

// Achievement query schema
export const achievementQuerySchema = z.object({
  category: z.enum(['completion', 'performance', 'engagement', 'special', 'all']).default('all'),
  earned: z.coerce.boolean().optional(),
  course_id: z.string().uuid().optional(),
});

// Lesson completion batch schema
export const batchLessonCompletionSchema = z.object({
  lessons: z.array(z.object({
    lesson_id: z.string().uuid(),
    video_watch_percentage: z.number().min(0).max(100),
    time_spent_minutes: z.number().min(0),
    quiz_score: z.number().min(0).max(100).optional(),
  })).min(1).max(20), // Max 20 lessons at once
});

// Analytics request schema
export const analyticsRequestSchema = z.object({
  course_ids: z.array(z.string().uuid()).max(10).optional(),
  date_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  metrics: z.array(z.enum([
    'learning_velocity',
    'retention_rate',
    'completion_prediction',
    'engagement_metrics',
    'performance_trends'
  ])).default(['learning_velocity', 'retention_rate']),
});

// Types
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type QuizResultSubmission = z.infer<typeof quizResultSchema>;
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
export type InstructorProgressQuery = z.infer<typeof instructorProgressQuerySchema>;
export type AchievementQuery = z.infer<typeof achievementQuerySchema>;
export type BatchLessonCompletion = z.infer<typeof batchLessonCompletionSchema>;
export type AnalyticsRequest = z.infer<typeof analyticsRequestSchema>;