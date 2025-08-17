export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string;
  price: number;
  original_price?: number;
  currency?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  duration_hours?: number;
  total_lessons?: number;
  rating?: number;
  total_ratings?: number;
  total_students?: number;
  is_featured?: boolean;
  is_free?: boolean;
  what_you_learn?: string[];
  requirements?: string[];
  tags?: string[];
  updated_at: string;
  instructor_name?: string;
  instructor_avatar?: string;
  category_name?: string;
  is_published?: boolean;
  created_at?: string;
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