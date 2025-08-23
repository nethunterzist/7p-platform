import { z } from 'zod';

// Assessment Creation & Update Schemas
export const createAssessmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  lesson_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  course_id: z.string().uuid('Invalid course ID'),
  time_limit: z.number().min(1, 'Time limit must be at least 1 minute').max(480, 'Time limit cannot exceed 8 hours'),
  passing_score: z.number().min(0, 'Passing score cannot be negative').max(100, 'Passing score cannot exceed 100%'),
  max_attempts: z.number().min(1, 'Must allow at least 1 attempt').max(10, 'Cannot exceed 10 attempts'),
  weight: z.number().min(0, 'Weight cannot be negative').max(100, 'Weight cannot exceed 100%'),
  randomize_questions: z.boolean().default(false),
  randomize_options: z.boolean().default(false),
  show_results_immediately: z.boolean().default(true),
  allow_review: z.boolean().default(true),
  due_date: z.string().datetime().optional(),
  available_from: z.string().datetime().optional(),
  available_until: z.string().datetime().optional(),
  grading_method: z.enum(['automatic', 'manual', 'hybrid']).default('automatic'),
  anti_cheating_enabled: z.boolean().default(false),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();

// Question Schemas
export const createQuestionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required').max(2000, 'Question text too long'),
  question_type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'essay', 'drag_drop']),
  options: z.array(z.object({
    option_text: z.string().min(1, 'Option text is required').max(500, 'Option text too long'),
    is_correct: z.boolean(),
    order_index: z.number().min(0)
  })).optional(),
  correct_answer: z.union([z.string(), z.array(z.string())]).refine(
    (val) => Array.isArray(val) ? val.length > 0 : val.length > 0,
    { message: 'Correct answer is required' }
  ),
  explanation: z.string().max(1000, 'Explanation too long').optional(),
  points: z.number().min(1, 'Points must be at least 1').max(100, 'Points cannot exceed 100'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  tags: z.array(z.string()).default([]),
  media_url: z.string().url().optional(),
  order_index: z.number().min(0),
  time_limit: z.number().min(1).max(300).optional(), // 5 minutes max per question
});

export const updateQuestionSchema = createQuestionSchema.partial();

// Quiz Attempt & Submission Schemas
export const startQuizAttemptSchema = z.object({
  assessment_id: z.string().uuid('Invalid assessment ID'),
  browser_fingerprint: z.string().optional(),
});

export const submitQuizResponseSchema = z.object({
  attempt_id: z.string().uuid('Invalid attempt ID'),
  question_id: z.string().uuid('Invalid question ID'),
  answer: z.union([z.string(), z.array(z.string())]).refine(
    (val) => Array.isArray(val) ? val.length > 0 : val.length > 0,
    { message: 'Answer is required' }
  ),
  time_spent: z.number().min(0).max(1800), // 30 minutes max per question
});

export const submitQuizAttemptSchema = z.object({
  attempt_id: z.string().uuid('Invalid attempt ID'),
  responses: z.array(z.object({
    question_id: z.string().uuid('Invalid question ID'),
    answer: z.union([z.string(), z.array(z.string())]),
    time_spent: z.number().min(0).optional(),
  })).min(1, 'At least one response is required'),
  total_time_spent: z.number().min(0).max(28800), // 8 hours max
});

// Assessment Query Schemas
export const assessmentQuerySchema = z.object({
  course_id: z.string().uuid().optional(),
  lesson_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.string().optional(), // comma-separated
  search: z.string().optional(),
  include_questions: z.coerce.boolean().default(false),
  include_analytics: z.coerce.boolean().default(false),
  sort_by: z.enum(['created_at', 'title', 'due_date', 'difficulty']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const attemptQuerySchema = z.object({
  assessment_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  status: z.enum(['in_progress', 'submitted', 'graded', 'expired']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  include_responses: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Analytics Query Schemas
export const analyticsQuerySchema = z.object({
  assessment_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  period: z.enum(['week', 'month', 'quarter', 'semester', 'all']).default('month'),
  include_question_analytics: z.coerce.boolean().default(true),
  include_difficulty_analysis: z.coerce.boolean().default(true),
  include_time_distribution: z.coerce.boolean().default(true),
  include_performance_trends: z.coerce.boolean().default(false),
  include_anomaly_detection: z.coerce.boolean().default(false),
});

// Question Bank Schemas
export const questionBankQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  subject: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.string().optional(), // comma-separated
  question_type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'essay', 'drag_drop']).optional(),
  search: z.string().optional(),
  is_public: z.coerce.boolean().optional(),
  created_by: z.string().uuid().optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  sort_by: z.enum(['created_at', 'title', 'rating', 'usage_count']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const createQuestionBankSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  category_id: z.string().uuid('Invalid category ID'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject too long'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  tags: z.array(z.string()).default([]),
  is_public: z.boolean().default(false),
});

// Grading Schemas
export const manualGradingSchema = z.object({
  attempt_id: z.string().uuid('Invalid attempt ID'),
  question_responses: z.array(z.object({
    question_id: z.string().uuid('Invalid question ID'),
    points_earned: z.number().min(0),
    feedback: z.string().optional(),
  })),
  overall_feedback: z.string().optional(),
});

export const rubricSchema = z.object({
  assessment_id: z.string().uuid('Invalid assessment ID'),
  criteria: z.array(z.object({
    name: z.string().min(1, 'Criterion name is required'),
    description: z.string().min(1, 'Criterion description is required'),
    max_points: z.number().min(1, 'Max points must be at least 1'),
    levels: z.object({
      excellent: z.object({
        points: z.number().min(0),
        description: z.string(),
      }),
      good: z.object({
        points: z.number().min(0),
        description: z.string(),
      }),
      satisfactory: z.object({
        points: z.number().min(0),
        description: z.string(),
      }),
      needs_improvement: z.object({
        points: z.number().min(0),
        description: z.string(),
      }),
    }),
  })).min(1, 'At least one criterion is required'),
});

// Anti-Cheating Schemas
export const cheatingReportSchema = z.object({
  attempt_id: z.string().uuid('Invalid attempt ID'),
  flag_type: z.enum(['tab_switch', 'copy_paste', 'right_click', 'unusual_timing', 'pattern_matching']),
  severity: z.enum(['low', 'medium', 'high']),
  details: z.string().min(1, 'Details are required'),
  timestamp: z.string().datetime(),
});

export const browserSecuritySchema = z.object({
  fullscreen_required: z.boolean().default(false),
  disable_right_click: z.boolean().default(false),
  disable_copy_paste: z.boolean().default(false),
  disable_navigation: z.boolean().default(false),
  lockdown_browser: z.boolean().default(false),
  camera_monitoring: z.boolean().default(false),
  screen_recording: z.boolean().default(false),
});

// Adaptive Assessment Schemas
export const adaptiveConfigSchema = z.object({
  assessment_id: z.string().uuid('Invalid assessment ID'),
  max_questions: z.number().min(5).max(50).default(20),
  min_questions: z.number().min(3).max(30).default(10),
  confidence_threshold: z.number().min(0.1).max(1.0).default(0.95),
  time_limit: z.number().min(5).max(240).default(60), // minutes
});

// Export types
export type CreateAssessment = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessment = z.infer<typeof updateAssessmentSchema>;
export type CreateQuestion = z.infer<typeof createQuestionSchema>;
export type UpdateQuestion = z.infer<typeof updateQuestionSchema>;
export type StartQuizAttempt = z.infer<typeof startQuizAttemptSchema>;
export type SubmitQuizResponse = z.infer<typeof submitQuizResponseSchema>;
export type SubmitQuizAttempt = z.infer<typeof submitQuizAttemptSchema>;
export type AssessmentQuery = z.infer<typeof assessmentQuerySchema>;
export type AttemptQuery = z.infer<typeof attemptQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type QuestionBankQuery = z.infer<typeof questionBankQuerySchema>;
export type CreateQuestionBank = z.infer<typeof createQuestionBankSchema>;
export type ManualGrading = z.infer<typeof manualGradingSchema>;
export type RubricDefinition = z.infer<typeof rubricSchema>;
export type CheatingReport = z.infer<typeof cheatingReportSchema>;
export type BrowserSecurityConfig = z.infer<typeof browserSecuritySchema>;
export type AdaptiveConfig = z.infer<typeof adaptiveConfigSchema>;