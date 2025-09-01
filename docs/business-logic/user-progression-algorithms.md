# 📈 User Progression Algorithms - Öğrenci İlerleme Algoritmaları

## 🎯 Genel Bakış

7P Education platformunda öğrenci ilerlemesini takip etmek ve optimize etmek için kullanılan algoritma ve hesaplama yöntemleri.

## 📊 Progress Calculation

### Temel İlerleme Hesaplama
```typescript
interface LessonProgress {
  lessonId: string;
  videoWatchPercentage: number; // 0-100
  completedAt?: Date;
  quizScore?: number;
  timeSpent: number; // dakika cinsinden
}

interface ModuleProgress {
  moduleId: string;
  lessons: LessonProgress[];
  overallCompletion: number;
  averageScore: number;
  estimatedTimeRemaining: number;
}

const calculateLessonCompletion = (lesson: LessonProgress): number => {
  let completion = 0;
  
  // Video izleme ağırlığı: %60
  completion += (lesson.videoWatchPercentage * 0.6);
  
  // Quiz performansı: %30
  if (lesson.quizScore !== undefined) {
    completion += (lesson.quizScore * 0.3);
  }
  
  // Zaman bazlı tamamlanma: %10
  const expectedTime = getExpectedLessonTime(lesson.lessonId);
  const timeCompletion = Math.min(lesson.timeSpent / expectedTime, 1) * 10;
  completion += timeCompletion;
  
  return Math.min(completion, 100);
};
```

### Kurs İlerleme Hesaplama
```typescript
const calculateCourseProgress = (modules: ModuleProgress[]): CourseProgress => {
  const totalModules = modules.length;
  const completedModules = modules.filter(m => m.overallCompletion >= 80).length;
  
  const overallCompletion = modules.reduce((sum, module) => {
    return sum + (module.overallCompletion * module.lessons.length);
  }, 0) / modules.reduce((sum, module) => sum + module.lessons.length, 0);
  
  const averageScore = modules.reduce((sum, module) => sum + module.averageScore, 0) / totalModules;
  
  return {
    overallCompletion: Math.round(overallCompletion),
    completedModules,
    totalModules,
    averageScore: Math.round(averageScore),
    estimatedCompletionDate: calculateEstimatedCompletion(modules),
    skillsAcquired: calculateSkillsAcquired(modules)
  };
};
```

## 🎓 Learning Path Optimization

### Adaptive Learning Algorithm
```typescript
interface LearningStyle {
  visual: number;    // 0-100
  auditory: number;  // 0-100
  kinesthetic: number; // 0-100
  reading: number;   // 0-100
}

interface PersonalizedContent {
  contentType: 'video' | 'audio' | 'interactive' | 'text';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  prerequisites: string[];
}

const optimizeLearningPath = (
  userProgress: CourseProgress,
  learningStyle: LearningStyle,
  availableTime: number // haftalık dakika
): PersonalizedContent[] => {
  
  // Kullanıcının güçlü/zayıf alanlarını belirle
  const strengths = identifyStrengths(userProgress);
  const weaknesses = identifyWeaknesses(userProgress);
  
  // Öğrenme stiline göre içerik türü öncelik
  const contentPriority = determineContentPriority(learningStyle);
  
  // Haftalık plan oluştur
  const weeklyPlan = generateWeeklyPlan(
    weaknesses,
    contentPriority,
    availableTime
  );
  
  return weeklyPlan;
};

const identifyWeaknesses = (progress: CourseProgress): string[] => {
  const weakAreas = [];
  
  progress.modules.forEach(module => {
    if (module.averageScore < 70) {
      weakAreas.push(module.moduleId);
    }
    
    module.lessons.forEach(lesson => {
      if (lesson.quizScore && lesson.quizScore < 60) {
        weakAreas.push(lesson.lessonId);
      }
    });
  });
  
  return weakAreas;
};
```

### Difficulty Adjustment
```typescript
const adjustDifficultyLevel = (
  userPerformance: UserPerformance,
  currentDifficulty: string
): string => {
  
  const performanceMetrics = {
    averageScore: userPerformance.averageQuizScore,
    completionTime: userPerformance.averageCompletionTime,
    strugglingTopics: userPerformance.lowScoreTopics.length,
    consecutiveSuccess: userPerformance.consecutiveCorrectAnswers
  };
  
  // Zorluk seviyesi artırma kriterleri
  if (
    performanceMetrics.averageScore > 85 &&
    performanceMetrics.consecutiveSuccess > 10 &&
    performanceMetrics.strugglingTopics < 2
  ) {
    return increaseDifficulty(currentDifficulty);
  }
  
  // Zorluk seviyesi azaltma kriterleri
  if (
    performanceMetrics.averageScore < 60 ||
    performanceMetrics.strugglingTopics > 5 ||
    performanceMetrics.completionTime > expectedTime * 1.5
  ) {
    return decreaseDifficulty(currentDifficulty);
  }
  
  return currentDifficulty;
};
```

## 🏆 Achievement & Gamification

### Badge System
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteria: BadgeCriteria;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface BadgeCriteria {
  type: 'completion' | 'score' | 'time' | 'streak' | 'special';
  threshold: number;
  timeframe?: number; // gün cinsinden
}

const checkBadgeEligibility = (userProgress: UserProgress, badge: Badge): boolean => {
  switch (badge.criteria.type) {
    case 'completion':
      return userProgress.overallCompletion >= badge.criteria.threshold;
      
    case 'score':
      return userProgress.averageScore >= badge.criteria.threshold;
      
    case 'streak':
      return userProgress.currentStreak >= badge.criteria.threshold;
      
    case 'time':
      const studyTime = calculateTotalStudyTime(userProgress);
      return studyTime >= badge.criteria.threshold;
      
    default:
      return false;
  }
};
```

### Points & Leveling System
```typescript
interface LevelSystem {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  levelBenefits: string[];
}

const calculateXP = (activity: LearningActivity): number => {
  let xp = 0;
  
  switch (activity.type) {
    case 'lesson_completed':
      xp = 50;
      if (activity.score >= 90) xp += 20; // Bonus for high score
      break;
      
    case 'quiz_completed':
      xp = 30 + (activity.score * 0.5);
      break;
      
    case 'assignment_submitted':
      xp = 100;
      break;
      
    case 'course_completed':
      xp = 500;
      break;
      
    case 'daily_login':
      xp = 10;
      break;
      
    case 'streak_milestone':
      xp = activity.streakDays * 5;
      break;
  }
  
  return Math.round(xp * getMultiplier(activity.difficulty));
};

const updateUserLevel = (currentXP: number): LevelSystem => {
  // Exponential leveling formula
  const level = Math.floor(Math.sqrt(currentXP / 1000)) + 1;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 1000;
  const xpForNextLevel = Math.pow(level, 2) * 1000;
  
  return {
    currentLevel: level,
    currentXP: currentXP,
    xpToNextLevel: xpForNextLevel - currentXP,
    totalXP: currentXP,
    levelBenefits: getLevelBenefits(level)
  };
};
```

## 📈 Performance Analytics

### Learning Efficiency Metrics
```typescript
interface EfficiencyMetrics {
  learningVelocity: number; // konu/saat
  retentionRate: number; // %
  practicalApplication: number; // %
  conceptualUnderstanding: number; // %
  timeOptimization: number; // %
}

const calculateLearningEfficiency = (
  userSessions: LearningSession[],
  assessmentResults: AssessmentResult[]
): EfficiencyMetrics => {
  
  // Öğrenme hızı hesaplama
  const totalTopicsCovered = userSessions.reduce((sum, session) => 
    sum + session.topicsCovered.length, 0);
  const totalTimeSpent = userSessions.reduce((sum, session) => 
    sum + session.duration, 0);
  
  const learningVelocity = totalTopicsCovered / (totalTimeSpent / 60); // konu/saat
  
  // Kalıcılık oranı hesaplama
  const retentionTests = assessmentResults.filter(result => 
    result.type === 'retention_test');
  const retentionRate = retentionTests.reduce((sum, test) => 
    sum + test.score, 0) / retentionTests.length;
  
  // Pratik uygulama başarısı
  const practicalTests = assessmentResults.filter(result => 
    result.type === 'practical_application');
  const practicalApplication = practicalTests.reduce((sum, test) => 
    sum + test.score, 0) / practicalTests.length;
  
  return {
    learningVelocity: Math.round(learningVelocity * 100) / 100,
    retentionRate: Math.round(retentionRate),
    practicalApplication: Math.round(practicalApplication),
    conceptualUnderstanding: calculateConceptualUnderstanding(assessmentResults),
    timeOptimization: calculateTimeOptimization(userSessions)
  };
};
```

### Predictive Analytics
```typescript
const predictStudentSuccess = (
  userProgress: UserProgress,
  historicalData: HistoricalData[]
): SuccessPrediction => {
  
  const features = extractFeatures(userProgress);
  const similarStudents = findSimilarStudents(features, historicalData);
  
  const successProbability = calculateSuccessProbability(
    features,
    similarStudents
  );
  
  const riskFactors = identifyRiskFactors(userProgress);
  const recommendations = generateRecommendations(riskFactors);
  
  return {
    successProbability: Math.round(successProbability * 100),
    completionTimeEstimate: estimateCompletionTime(features, similarStudents),
    riskFactors,
    recommendations,
    confidenceLevel: calculateConfidenceLevel(similarStudents.length)
  };
};

const identifyAtRiskStudents = (students: UserProgress[]): AtRiskStudent[] => {
  return students.filter(student => {
    const riskScore = calculateRiskScore(student);
    return riskScore > 70; // %70 üzeri risk skoru
  }).map(student => ({
    userId: student.userId,
    riskScore: calculateRiskScore(student),
    riskFactors: identifyRiskFactors(student),
    interventionRecommendations: generateInterventions(student)
  }));
};
```

## 🔄 Intervention Strategies

### Auto Intervention System
```typescript
const autoIntervention = (student: UserProgress): InterventionAction[] => {
  const actions = [];
  
  // Düşük performans müdahalesi
  if (student.averageScore < 60) {
    actions.push({
      type: 'content_recommendation',
      priority: 'high',
      content: generateRemedialContent(student.weakAreas),
      message: 'Size özel destekleyici içerikler hazırladık'
    });
  }
  
  // Motivasyon müdahalesi
  if (student.daysSinceLastActivity > 7) {
    actions.push({
      type: 'motivational_message',
      priority: 'medium',
      message: generateMotivationalMessage(student.progressLevel),
      incentive: 'double_xp_next_lesson'
    });
  }
  
  // Mentor ataması
  if (student.strugglingDuration > 14) { // 14 gün boyunca zorlanma
    actions.push({
      type: 'mentor_assignment',
      priority: 'high',
      mentorId: findBestMentor(student.learningStyle, student.courseId),
      scheduledCall: true
    });
  }
  
  return actions;
};
```

---

*Bu dokümantasyon, 7P Education platformunun öğrenci ilerleme takibi ve optimizasyon algoritmalarını detaylandırmaktadır.*