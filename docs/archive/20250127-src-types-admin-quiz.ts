// Admin quiz yönetimi için genişletilmiş veri yapıları
import { Quiz, QuizQuestion } from './quiz';

export interface AdminQuiz extends Quiz {
  created_by: string;
  status: 'draft' | 'published' | 'archived';
  usage_count: number; // Kaç derste kullanılıyor
  last_used: string | null;
  category: string; // Quiz kategorisi (FBA, PPC, vb.)
  tags: string[]; // Quiz etiketleri
  is_featured: boolean; // Öne çıkan quiz mi?
  created_at_full: string; // created_at ile aynı ama daha açık
  updated_at_full: string; // updated_at ile aynı ama daha açık
}

export interface AdminQuizStats {
  total_quizzes: number;
  published_count: number;
  draft_count: number;
  archived_count: number;
  most_used_quiz: AdminQuiz | null;
  recent_quizzes: AdminQuiz[];
}

export interface QuizUsage {
  quiz_id: string;
  course_id: string;
  course_title: string;
  lesson_id: string;
  lesson_title: string;
  module_title: string;
  usage_date: string;
}

// Quiz builder için form veri yapısı
export interface QuizFormData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  passing_score: number;
  time_limit?: number;
  attempts_allowed: number;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
}

// Question builder için form veri yapısı
export interface QuestionFormData {
  question: string;
  options: OptionFormData[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OptionFormData {
  text: string;
  isCorrect: boolean;
}

// Quiz kategori listesi
export const QUIZ_CATEGORIES = [
  'Amazon FBA',
  'Amazon PPC', 
  'E-ticaret',
  'Dropshipping',
  'SEO',
  'Pazarlama',
  'Genel Bilgiler'
] as const;

export type QuizCategory = typeof QUIZ_CATEGORIES[number];

// Quiz zorluk seviyeleri
export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Kolay', color: 'green' },
  { value: 'medium', label: 'Orta', color: 'yellow' },
  { value: 'hard', label: 'Zor', color: 'red' }
] as const;

// Quiz durumları
export const QUIZ_STATUSES = [
  { value: 'draft', label: 'Taslak', color: 'gray' },
  { value: 'published', label: 'Yayında', color: 'green' },
  { value: 'archived', label: 'Arşivlenmiş', color: 'red' }
] as const;