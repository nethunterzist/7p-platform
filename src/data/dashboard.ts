/**
 * DASHBOARD MOCK DATA - 7P Education
 * Mock data specifically for dashboard components
 */

export interface DashboardStats {
  totalCourses: number;
  completedCourses: number;
  activeCourses: number;
  totalHours: number;
  certificatesEarned: number;
  averageProgress: number;
}

export interface RecentActivity {
  id: string;
  type: 'lesson_completed' | 'quiz_passed' | 'certificate_earned' | 'discussion_posted' | 'course_enrolled';
  title: string;
  description: string;
  timestamp: string;
  course?: {
    id: string;
    title: string;
  };
  icon: string;
}

export interface UpcomingDeadline {
  id: string;
  type: 'assignment' | 'quiz' | 'exam' | 'project';
  title: string;
  course: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'submitted' | 'overdue';
}

export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  thisWeekDays: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  monthlyGoal: number;
  monthlyProgress: number;
}

export interface CourseProgress {
  courseId: string;
  title: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessed: string;
  estimatedTimeToComplete: string;
  nextLesson: {
    id: string;
    title: string;
    duration: string;
  };
}

export interface WeeklyProgress {
  date: string;
  hoursStudied: number;
  lessonsCompleted: number;
  quizzesPassed: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'course' | 'system' | 'event';
  priority: 'high' | 'medium' | 'low';
  publishedAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  course?: {
    id: string;
    title: string;
  };
}

// Mock Dashboard Statistics
export const DASHBOARD_STATS: DashboardStats = {
  totalCourses: 12,
  completedCourses: 8,
  activeCourses: 4,
  totalHours: 156,
  certificatesEarned: 6,
  averageProgress: 67
};

// Recent Activities
export const RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: '1',
    type: 'lesson_completed',
    title: 'React Hooks dersi tamamlandı',
    description: 'useState ve useEffect konularını başarıyla tamamladınız',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    course: {
      id: 'react-fundamentals',
      title: 'React Fundamentals'
    },
    icon: '✅'
  },
  {
    id: '2',
    type: 'quiz_passed',
    title: 'JavaScript Quiz başarıyla geçildi',
    description: '85/100 puan ile quiz tamamlandı',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    course: {
      id: 'javascript-advanced',
      title: 'Advanced JavaScript'
    },
    icon: '🎯'
  },
  {
    id: '3',
    type: 'certificate_earned',
    title: 'Web Development sertifikası kazanıldı',
    description: 'Tebrikler! HTML/CSS kursunu başarıyla tamamladınız',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    course: {
      id: 'html-css-fundamentals',
      title: 'HTML & CSS Fundamentals'
    },
    icon: '🏆'
  },
  {
    id: '4',
    type: 'discussion_posted',
    title: 'Node.js forumuna yorum yapıldı',
    description: 'Express.js konusundaki soruya yanıt verdiniz',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    course: {
      id: 'nodejs-backend',
      title: 'Node.js Backend Development'
    },
    icon: '💬'
  },
  {
    id: '5',
    type: 'course_enrolled',
    title: 'Yeni kursa kayıt olundu',
    description: 'TypeScript Advanced kursuna başarıyla kayıt oldunuz',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    course: {
      id: 'typescript-advanced',
      title: 'TypeScript Advanced'
    },
    icon: '📚'
  }
];

// Upcoming Deadlines
export const UPCOMING_DEADLINES: UpcomingDeadline[] = [
  {
    id: '1',
    type: 'assignment',
    title: 'React Portfolio Projesi',
    course: 'React Fundamentals',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days
    priority: 'high',
    status: 'pending'
  },
  {
    id: '2',
    type: 'quiz',
    title: 'JavaScript ES6+ Quiz',
    course: 'Advanced JavaScript',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week
    priority: 'medium',
    status: 'pending'
  },
  {
    id: '3',
    type: 'exam',
    title: 'Node.js Final Sınavı',
    course: 'Node.js Backend Development',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 weeks
    priority: 'high',
    status: 'pending'
  },
  {
    id: '4',
    type: 'project',
    title: 'Full-Stack E-commerce Projesi',
    course: 'Full-Stack Development',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(), // 3 weeks
    priority: 'high',
    status: 'pending'
  }
];

// Learning Streak
export const LEARNING_STREAK: LearningStreak = {
  currentStreak: 12,
  longestStreak: 28,
  thisWeekDays: [true, true, false, true, true, false, true], // Mon-Sun
  monthlyGoal: 20, // hours
  monthlyProgress: 14 // hours completed this month
};

// Course Progress
export const COURSE_PROGRESS: CourseProgress[] = [
  {
    courseId: 'react-fundamentals',
    title: 'React Fundamentals',
    thumbnail: '/api/placeholder/300/200',
    progress: 75,
    totalLessons: 24,
    completedLessons: 18,
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    estimatedTimeToComplete: '3 saat',
    nextLesson: {
      id: 'react-19',
      title: 'Context API ve State Management',
      duration: '25 dakika'
    }
  },
  {
    courseId: 'javascript-advanced',
    title: 'Advanced JavaScript',
    thumbnail: '/api/placeholder/300/200',
    progress: 60,
    totalLessons: 30,
    completedLessons: 18,
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    estimatedTimeToComplete: '5 saat',
    nextLesson: {
      id: 'js-19',
      title: 'Async/Await ve Promise Chains',
      duration: '30 dakika'
    }
  },
  {
    courseId: 'nodejs-backend',
    title: 'Node.js Backend Development',
    thumbnail: '/api/placeholder/300/200',
    progress: 40,
    totalLessons: 35,
    completedLessons: 14,
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    estimatedTimeToComplete: '8 saat',
    nextLesson: {
      id: 'node-15',
      title: 'Express.js Middleware',
      duration: '35 dakika'
    }
  },
  {
    courseId: 'typescript-advanced',
    title: 'TypeScript Advanced',
    thumbnail: '/api/placeholder/300/200',
    progress: 20,
    totalLessons: 28,
    completedLessons: 6,
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    estimatedTimeToComplete: '12 saat',
    nextLesson: {
      id: 'ts-7',
      title: 'Generics ve Advanced Types',
      duration: '40 dakika'
    }
  }
];

// Weekly Progress Data (for charts)
export const WEEKLY_PROGRESS: WeeklyProgress[] = [
  { date: '2024-08-05', hoursStudied: 2.5, lessonsCompleted: 3, quizzesPassed: 1 },
  { date: '2024-08-06', hoursStudied: 3.0, lessonsCompleted: 4, quizzesPassed: 2 },
  { date: '2024-08-07', hoursStudied: 1.5, lessonsCompleted: 2, quizzesPassed: 0 },
  { date: '2024-08-08', hoursStudied: 4.0, lessonsCompleted: 5, quizzesPassed: 3 },
  { date: '2024-08-09', hoursStudied: 2.0, lessonsCompleted: 3, quizzesPassed: 1 },
  { date: '2024-08-10', hoursStudied: 0, lessonsCompleted: 0, quizzesPassed: 0 },
  { date: '2024-08-11', hoursStudied: 3.5, lessonsCompleted: 4, quizzesPassed: 2 }
];

// Notifications
export const DASHBOARD_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Quiz Başarılı!',
    message: 'JavaScript Advanced quiz\'ini 85 puan ile geçtiniz',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    actionUrl: '/courses/javascript-advanced/results',
    actionLabel: 'Sonuçları Gör'
  },
  {
    id: '2',
    type: 'info',
    title: 'Yeni Kurs Eklendi',
    message: 'Vue.js 3 kursu artık kütüphanede mevcut',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    actionUrl: '/courses/vuejs-3',
    actionLabel: 'Kursa Göz At'
  },
  {
    id: '3',
    type: 'warning',
    title: 'Görev Yaklaşıyor',
    message: 'React Portfolio projenizin teslim tarihi 3 gün sonra',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    actionUrl: '/assignments/react-portfolio',
    actionLabel: 'Görevi Görüntüle'
  },
  {
    id: '4',
    type: 'info',
    title: 'Haftalık Rapor Hazır',
    message: 'Bu hafta 15 saat çalışma tamamladınız',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    read: true
  }
];

// Announcements
export const DASHBOARD_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Platform Güncellemesi v2.1',
    content: 'Yeni özellikler: Gelişmiş quiz sistemi, mobil uygulama desteği ve daha hızlı video yükleme.',
    type: 'system',
    priority: 'high',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    author: {
      name: '7P Education Ekibi',
      avatar: '/api/placeholder/40/40'
    }
  },
  {
    id: '2',
    title: 'Yeni Kurs: Advanced React Patterns',
    content: 'React uzmanları için tasarlanan yeni kurs artık mevcut. Custom hooks, performance optimization ve testing konularını kapsıyor.',
    type: 'course',
    priority: 'medium',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    author: {
      name: 'Ahmet Yılmaz',
      avatar: '/api/placeholder/40/40'
    },
    course: {
      id: 'advanced-react-patterns',
      title: 'Advanced React Patterns'
    }
  },
  {
    id: '3',
    title: 'Canlı Workshop: DevOps Best Practices',
    content: '15 Ağustos\'ta Docker, Kubernetes ve CI/CD konularında canlı workshop düzenlenecek.',
    type: 'event',
    priority: 'medium',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    author: {
      name: 'Mehmet Kaya',
      avatar: '/api/placeholder/40/40'
    }
  }
];

// Helper functions
export const getDashboardStats = (): DashboardStats => DASHBOARD_STATS;

export const getRecentActivities = (limit?: number): RecentActivity[] => 
  limit ? RECENT_ACTIVITIES.slice(0, limit) : RECENT_ACTIVITIES;

export const getUpcomingDeadlines = (limit?: number): UpcomingDeadline[] => 
  limit ? UPCOMING_DEADLINES.slice(0, limit) : UPCOMING_DEADLINES;

export const getLearningStreak = (): LearningStreak => LEARNING_STREAK;

export const getCourseProgress = (limit?: number): CourseProgress[] => 
  limit ? COURSE_PROGRESS.slice(0, limit) : COURSE_PROGRESS;

export const getWeeklyProgress = (): WeeklyProgress[] => WEEKLY_PROGRESS;

export const getDashboardNotifications = (unreadOnly?: boolean): Notification[] => 
  unreadOnly ? DASHBOARD_NOTIFICATIONS.filter(n => !n.read) : DASHBOARD_NOTIFICATIONS;

export const getDashboardAnnouncements = (limit?: number): Announcement[] => 
  limit ? DASHBOARD_ANNOUNCEMENTS.slice(0, limit) : DASHBOARD_ANNOUNCEMENTS;

// Mark notification as read
export const markNotificationAsRead = (notificationId: string): void => {
  const notification = DASHBOARD_NOTIFICATIONS.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
};

// Get notifications count
export const getUnreadNotificationsCount = (): number => 
  DASHBOARD_NOTIFICATIONS.filter(n => !n.read).length;