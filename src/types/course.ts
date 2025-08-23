export interface Course {
  id: string;
  title: string;
  slug?: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  preview_video_url?: string;
  price: number;
  original_price?: number;
  currency: string;
  category_id: string;
  instructor_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  duration_hours: number;
  max_students?: number;
  certificate_enabled: boolean;
  has_assignments: boolean;
  has_quizzes: boolean;
  published: boolean;
  learning_objectives: string[];
  requirements: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  
  // Populated fields
  instructor?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  enrollment_count?: number;
  average_rating?: number;
  total_ratings?: number;
  lessons_count?: number;
  total_duration?: number;
  modules?: Module[];
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  position: number;
  is_published?: boolean;
  lessons?: Lesson[];
  total_lessons?: number;
  duration_minutes?: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  slug?: string;
  description?: string;
  video_url?: string;
  content?: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  position: number;
  duration_minutes?: number;
  is_published?: boolean;
  is_free?: boolean;
  materials?: LessonMaterial[];
  notes?: LessonNote[];
  completed_at?: string;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  download_count?: number;
  created_at?: string;
}

export interface LessonNote {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  timestamp?: number;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  lesson_id: string;
  user_id: string;
  progress_percentage: number;
  time_spent_seconds: number;
  last_position_seconds?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LessonCompletion {
  lesson_id: string;
  user_id: string;
  completed_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percentage?: number;
  last_accessed_lesson_id?: string;
  completed_at?: string;
}

// Additional types for API responses
export interface CourseListResponse {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CourseWithDetails extends Course {
  lessons: Lesson[];
  recent_enrollments: RecentEnrollment[];
}

export interface RecentEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface CourseStats {
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  total_enrollments: number;
  total_revenue: number;
  average_rating: number;
  completion_rate: number;
}

export interface CourseQueryOptions {
  page: number;
  limit: number;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  published?: boolean;
  instructor_id?: string;
  price_min?: number;
  price_max?: number;
}

export interface CourseListResult {
  courses: Course[];
  total: number;
}