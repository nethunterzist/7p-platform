export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  video_watch_percentage: number; // 0-100
  completed_at?: string;
  quiz_score?: number;
  time_spent_minutes: number;
  last_position_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleProgress {
  module_id: string;
  module_title: string;
  lessons: LessonProgress[];
  overall_completion: number;
  average_score: number;
  estimated_time_remaining: number;
  completed_lessons: number;
  total_lessons: number;
}

export interface CourseProgress {
  user_id: string;
  course_id: string;
  overall_completion: number;
  completed_modules: number;
  total_modules: number;
  average_score: number;
  estimated_completion_date?: string;
  skills_acquired: string[];
  modules: ModuleProgress[];
  current_streak: number;
  total_study_time: number; // minutes
  last_activity: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  criteria: BadgeCriteria;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  category: 'completion' | 'performance' | 'engagement' | 'special';
  created_at: string;
}

export interface BadgeCriteria {
  type: 'completion' | 'score' | 'time' | 'streak' | 'special';
  threshold: number;
  timeframe?: number; // days
  course_specific?: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  course_id?: string;
  progress_value: number;
  achievement: Achievement;
}

export interface LearningActivity {
  type: 'lesson_completed' | 'quiz_completed' | 'assignment_submitted' | 'course_completed' | 'daily_login' | 'streak_milestone';
  score?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  streakDays?: number;
}

export interface LevelSystem {
  current_level: number;
  current_xp: number;
  xp_to_next_level: number;
  total_xp: number;
  level_benefits: string[];
}

export interface StudentProgress {
  user_id: string;
  course_id: string;
  progress_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  modules_completed: number;
  total_modules: number;
  average_score: number;
  time_spent_minutes: number;
  current_streak: number;
  last_activity: string;
  achievements: UserAchievement[];
  level_system: LevelSystem;
  weak_areas: string[];
  strong_areas: string[];
}

export interface QuizResult {
  id: string;
  user_id: string;
  lesson_id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
  time_spent_minutes: number;
  attempt_number: number;
  question_results: QuestionResult[];
}

export interface QuestionResult {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  score: number;
  max_score: number;
  feedback: string;
  correct: boolean;
}

export interface LearningAnalytics {
  user_id: string;
  course_id: string;
  learning_velocity: number; // topics per hour
  retention_rate: number; // percentage
  practical_application: number; // percentage
  conceptual_understanding: number; // percentage
  time_optimization: number; // percentage
  study_sessions: number;
  average_session_duration: number; // minutes
  peak_learning_hours: number[]; // hours of day (0-23)
  completion_prediction: {
    estimated_completion_date: string;
    success_probability: number;
    confidence_level: number;
  };
}

export interface ProgressUpdateRequest {
  lesson_id: string;
  video_watch_percentage?: number;
  time_spent_minutes: number;
  last_position_seconds?: number;
  quiz_score?: number;
  completed?: boolean;
}

export interface InstructorProgressOverview {
  course_id: string;
  total_students: number;
  average_progress: number;
  completion_rate: number;
  average_score: number;
  at_risk_students: number;
  top_performers: number;
  most_difficult_lessons: string[];
  engagement_metrics: {
    daily_active_users: number;
    weekly_active_users: number;
    average_time_per_session: number;
    bounce_rate: number;
  };
  progress_distribution: {
    range: string;
    student_count: number;
  }[];
}