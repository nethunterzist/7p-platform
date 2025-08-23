// Assessment & Quiz Types for 7P Education Platform

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'drag_drop';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type AssessmentStatus = 'draft' | 'published' | 'archived';
export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'expired';
export type GradingMethod = 'automatic' | 'manual' | 'hybrid';

// Core Assessment Interfaces
export interface Assessment {
  id: string;
  title: string;
  description: string;
  lesson_id?: string;
  module_id?: string;
  course_id: string;
  instructor_id: string;
  questions: Question[];
  time_limit: number; // minutes
  passing_score: number; // percentage
  max_attempts: number;
  weight: number; // contribution to final grade %
  randomize_questions: boolean;
  randomize_options: boolean;
  show_results_immediately: boolean;
  allow_review: boolean;
  status: AssessmentStatus;
  due_date?: string;
  available_from?: string;
  available_until?: string;
  grading_method: GradingMethod;
  anti_cheating_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  media_url?: string;
  order_index: number;
  time_limit?: number; // per question time limit
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

// Quiz Attempt & Submission
export interface QuizAttempt {
  id: string;
  assessment_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at?: string;
  time_spent: number; // minutes
  status: SubmissionStatus;
  responses: QuestionResponse[];
  score?: number;
  max_score?: number;
  percentage?: number;
  passed?: boolean;
  graded_at?: string;
  graded_by?: string;
  feedback?: string;
  browser_fingerprint?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  user_answer: string | string[];
  is_correct?: boolean;
  points_earned?: number;
  time_spent?: number; // seconds
  feedback?: string;
  created_at: string;
}

// Grading & Results
export interface QuizResult {
  attempt_id: string;
  user_id: string;
  assessment_id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
  time_spent: number;
  question_results: QuestionResult[];
  overall_feedback: string;
  strengths: string[];
  improvement_areas: string[];
  next_steps: string[];
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  user_answer: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  feedback: string;
  explanation?: string;
  time_spent?: number;
}

export interface GradingRubric {
  id: string;
  assessment_id: string;
  criteria: RubricCriterion[];
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
  levels: {
    excellent: { points: number; description: string };
    good: { points: number; description: string };
    satisfactory: { points: number; description: string };
    needs_improvement: { points: number; description: string };
  };
}

// Analytics & Reporting
export interface AssessmentAnalytics {
  assessment_id: string;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  median_score: number;
  pass_rate: number;
  average_time_spent: number;
  question_analytics: QuestionAnalytics[];
  difficulty_analysis: DifficultyAnalysis;
  time_distribution: TimeDistribution;
  performance_trends: PerformanceTrend[];
  anomaly_detection: AnomalyReport;
}

export interface QuestionAnalytics {
  question_id: string;
  question_text: string;
  total_responses: number;
  correct_responses: number;
  success_rate: number;
  average_time_spent: number;
  discrimination_index: number; // how well it separates high/low performers
  difficulty_index: number; // percentage who got it right
  most_common_incorrect_answers: {
    answer: string;
    frequency: number;
    percentage: number;
  }[];
}

export interface DifficultyAnalysis {
  overall_difficulty: number;
  questions_by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  performance_by_difficulty: {
    easy: { avg_score: number; success_rate: number };
    medium: { avg_score: number; success_rate: number };
    hard: { avg_score: number; success_rate: number };
  };
}

export interface TimeDistribution {
  average_completion_time: number;
  median_completion_time: number;
  time_percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  questions_by_time: {
    question_id: string;
    average_time: number;
    median_time: number;
  }[];
}

export interface PerformanceTrend {
  date: string;
  attempts: number;
  average_score: number;
  pass_rate: number;
}

export interface AnomalyReport {
  total_anomalies: number;
  high_confidence_anomalies: number;
  anomalies_by_type: {
    rapid_improvement: number;
    similar_patterns: number;
    timing_anomaly: number;
    suspicious_behavior: number;
  };
  flagged_students: {
    user_id: string;
    anomaly_type: string;
    confidence: number;
    details: string;
  }[];
  recommended_actions: string[];
}

// Question Bank & Categories
export interface QuestionBank {
  id: string;
  title: string;
  description: string;
  category_id: string;
  subject: string;
  difficulty: DifficultyLevel;
  tags: string[];
  questions: Question[];
  created_by: string;
  is_public: boolean;
  usage_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionCategory {
  id: string;
  name: string;
  description: string;
  parent_id?: string;
  children?: QuestionCategory[];
  question_count: number;
  created_at: string;
  updated_at: string;
}

// AI Grading for Essays
export interface EssayGradeResult {
  score: number;
  max_score: number;
  correct: boolean;
  feedback: string;
  detailed_analysis: {
    word_count: number;
    readability_score: number;
    keyword_matches: string[];
    grammar_score: number;
    structure_score: number;
    content_relevance: number;
    critical_thinking: number;
    vocabulary_richness: number;
    suggested_improvements: string[];
  };
}

// Anti-Cheating & Security
export interface CheatingDetection {
  session_id: string;
  user_id: string;
  assessment_id: string;
  risk_score: number;
  flags: CheatingFlag[];
  browser_checks: BrowserSecurity;
  behavioral_analysis: BehavioralAnalysis;
}

export interface CheatingFlag {
  type: 'tab_switch' | 'copy_paste' | 'right_click' | 'unusual_timing' | 'pattern_matching';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  details: string;
}

export interface BrowserSecurity {
  fullscreen_required: boolean;
  disable_right_click: boolean;
  disable_copy_paste: boolean;
  disable_navigation: boolean;
  lockdown_browser: boolean;
  camera_monitoring: boolean;
  screen_recording: boolean;
}

export interface BehavioralAnalysis {
  typing_pattern: {
    wpm: number;
    keystroke_dynamics: number[];
    pause_patterns: number[];
  };
  mouse_movement: {
    clicks: number;
    movements: number;
    scroll_behavior: number[];
  };
  focus_changes: {
    tab_switches: number;
    window_blur_events: number;
    total_focus_time: number;
  };
  time_analysis: {
    time_per_question: number[];
    unusual_speed_flags: boolean[];
    idle_time_percentage: number;
  };
}

// Adaptive Assessment
export interface AdaptiveAssessment {
  assessment_id: string;
  user_id: string;
  current_difficulty: DifficultyLevel;
  ability_estimate: number;
  confidence_interval: number;
  next_question_id?: string;
  stopping_criteria: {
    max_questions: number;
    min_questions: number;
    confidence_threshold: number;
    time_limit: number;
  };
  completed_questions: string[];
  remaining_questions: string[];
}

// Performance Feedback
export interface PersonalizedFeedback {
  overall_performance: {
    summary: string;
    grade: number;
    percentile: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  strengths: {
    areas: string[];
    messages: string[];
    encouragement: string;
  };
  improvements: {
    areas: string[];
    specific_suggestions: ImprovementSuggestion[];
    resources: LearningResource[];
    action_plan: ActionPlan[];
  };
  next_steps: {
    short_term: string[];
    medium_term: string[];
    long_term: string[];
  };
}

export interface ImprovementSuggestion {
  area: string;
  suggestion: string;
  resources: string[];
  priority: 'low' | 'medium' | 'high';
  estimated_time: string;
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'exercise' | 'quiz' | 'interactive';
  url: string;
  duration?: number;
  difficulty: DifficultyLevel;
  relevance_score: number;
}

export interface ActionPlan {
  step: number;
  description: string;
  estimated_duration: string;
  resources: string[];
  success_criteria: string;
}

// Course Grading Integration
export interface GradeComponent {
  type: 'quiz' | 'assignment' | 'participation' | 'final_exam';
  weight: number;
  scores: number[];
  drop_lowest?: number;
}

export interface FinalGrade {
  numeric_grade: number;
  letter_grade: string;
  passed: boolean;
  component_grades: ComponentGrade[];
  gpa: number;
  earned_credits: number;
}

export interface ComponentGrade {
  type: string;
  average: number;
  weight: number;
  contribution: number;
}