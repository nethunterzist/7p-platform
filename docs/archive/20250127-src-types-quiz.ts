// Quiz veri yapıları
export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  explanation?: string; // Doğru cevabın açıklaması
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  lesson_id: string;
  questions: QuizQuestion[];
  passing_score: number; // Geçme puanı (%)
  time_limit?: number; // Süre limiti (dakika)
  attempts_allowed: number; // İzin verilen deneme sayısı
  created_at: string;
  updated_at: string;
}

export interface UserQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: UserAnswer[];
  score: number;
  passed: boolean;
  completed_at: string;
  time_spent: number; // Saniye cinsinden
}

export interface UserAnswer {
  question_id: string;
  selected_option_id: string;
  is_correct: boolean;
}

export interface QuizResult {
  attempt: UserQuizAttempt;
  quiz: Quiz;
  correct_answers: number;
  wrong_answers: number;
  percentage: number;
  passed: boolean;
}