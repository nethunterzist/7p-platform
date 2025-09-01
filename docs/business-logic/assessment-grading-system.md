# 📝 Assessment & Grading System - Değerlendirme ve Notlama Sistemi

## 🎯 Genel Bakış

7P Education platformunda öğrenci değerlendirme ve otomatik notlama sisteminin detaylı iş mantığı.

## 📊 Değerlendirme Türleri

### 1. Quiz Assessments
```typescript
interface Quiz {
  id: string;
  lessonId: string;
  questions: Question[];
  timeLimit: number; // dakika
  passingScore: number; // %
  attempts: number; // maksimum deneme
  weight: number; // final nota katkı %
}

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'drag_drop';
  question: string;
  options?: string[]; // çoktan seçmeli için
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[]; // konu etiketleri
}
```

### 2. Assignment Assessments
```typescript
interface Assignment {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  requirements: string[];
  dueDate: Date;
  maxScore: number;
  rubric: GradingRubric;
  submissionFormat: 'file' | 'text' | 'video' | 'presentation';
  peerReview: boolean;
}

interface GradingRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
}

interface RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
  levels: {
    excellent: { points: number; description: string };
    good: { points: number; description: string };
    satisfactory: { points: number; description: string };
    needsImprovement: { points: number; description: string };
  };
}
```

## 🔄 Otomatik Notlama Algoritmaları

### Quiz Auto-Grading
```typescript
const gradeQuizAttempt = (attempt: QuizAttempt): QuizResult => {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const detailedResults: QuestionResult[] = [];
  
  attempt.answers.forEach((answer, index) => {
    const question = attempt.quiz.questions[index];
    const result = gradeQuestion(question, answer);
    
    totalScore += result.score;
    maxPossibleScore += question.points;
    
    detailedResults.push({
      questionId: question.id,
      userAnswer: answer,
      correctAnswer: question.correctAnswer,
      score: result.score,
      maxScore: question.points,
      feedback: result.feedback,
      correct: result.correct
    });
  });
  
  const percentage = Math.round((totalScore / maxPossibleScore) * 100);
  const passed = percentage >= attempt.quiz.passingScore;
  
  return {
    attemptId: attempt.id,
    userId: attempt.userId,
    quizId: attempt.quiz.id,
    score: totalScore,
    maxScore: maxPossibleScore,
    percentage,
    passed,
    completedAt: new Date(),
    timeSpent: attempt.timeSpent,
    questionResults: detailedResults,
    feedback: generateQuizFeedback(detailedResults, percentage)
  };
};

const gradeQuestion = (question: Question, answer: string): QuestionGradeResult => {
  switch (question.type) {
    case 'multiple_choice':
      return gradeMultipleChoice(question, answer);
    case 'true_false':
      return gradeTrueFalse(question, answer);
    case 'fill_blank':
      return gradeFillBlank(question, answer);
    case 'essay':
      return gradeEssayAI(question, answer);
    default:
      throw new Error(`Unsupported question type: ${question.type}`);
  }
};
```

### AI-Powered Essay Grading
```typescript
const gradeEssayAI = async (question: Question, answer: string): Promise<EssayGradeResult> => {
  // NLP analizi için gerekli kriterler
  const criteria = {
    contentRelevance: 0.3,    // İçerik uygunluğu
    grammarAccuracy: 0.2,     // Dilbilgisi doğruluğu
    structureClarity: 0.2,    // Yapı ve netlik
    criticalThinking: 0.2,    // Eleştirel düşünme
    vocabularyRichness: 0.1   // Kelime zenginliği
  };
  
  const analysis = await analyzeEssayContent(answer, question.question);
  
  const scores = {
    contentRelevance: assessContentRelevance(analysis, question),
    grammarAccuracy: assessGrammar(answer),
    structureClarity: assessStructure(analysis),
    criticalThinking: assessCriticalThinking(analysis, question),
    vocabularyRichness: assessVocabulary(answer)
  };
  
  const weightedScore = Object.entries(criteria).reduce((total, [criterion, weight]) => {
    return total + (scores[criterion] * weight);
  }, 0);
  
  const finalScore = Math.round(weightedScore * question.points);
  
  return {
    score: finalScore,
    maxScore: question.points,
    correct: finalScore >= (question.points * 0.7), // %70 eşik
    feedback: generateEssayFeedback(scores, analysis),
    detailedAnalysis: {
      wordCount: answer.split(' ').length,
      readabilityScore: calculateReadability(answer),
      keywordMatches: findKeywordMatches(answer, question.tags),
      suggestedImprovements: generateImprovements(scores)
    }
  };
};
```

## 📈 Final Grade Calculation

### Weighted Grading System
```typescript
interface GradeComponent {
  type: 'quiz' | 'assignment' | 'participation' | 'final_exam';
  weight: number; // yüzde olarak (toplam %100)
  scores: number[];
  dropLowest?: number; // en düşük kaç not atılacak
}

interface CourseGrading {
  components: GradeComponent[];
  gradingScale: GradingScale;
  passingGrade: number;
}

interface GradingScale {
  A: { min: 90, max: 100 };
  B: { min: 80, max: 89 };
  C: { min: 70, max: 79 };
  D: { min: 60, max: 69 };
  F: { min: 0, max: 59 };
}

const calculateFinalGrade = (courseGrading: CourseGrading, studentScores: StudentScores): FinalGrade => {
  let weightedTotal = 0;
  const componentGrades = [];
  
  courseGrading.components.forEach(component => {
    const studentComponentScores = studentScores[component.type] || [];
    
    // En düşük notları at (eğer belirtilmişse)
    let processedScores = [...studentComponentScores];
    if (component.dropLowest && processedScores.length > component.dropLowest) {
      processedScores.sort((a, b) => b - a); // Büyükten küçüğe sırala
      processedScores = processedScores.slice(0, processedScores.length - component.dropLowest);
    }
    
    // Ortalama hesapla
    const average = processedScores.length > 0 
      ? processedScores.reduce((sum, score) => sum + score, 0) / processedScores.length 
      : 0;
    
    componentGrades.push({
      type: component.type,
      average: Math.round(average * 100) / 100,
      weight: component.weight,
      contribution: (average * component.weight) / 100
    });
    
    weightedTotal += (average * component.weight) / 100;
  });
  
  const letterGrade = calculateLetterGrade(weightedTotal, courseGrading.gradingScale);
  const passed = weightedTotal >= courseGrading.passingGrade;
  
  return {
    numericGrade: Math.round(weightedTotal * 100) / 100,
    letterGrade,
    passed,
    componentGrades,
    gpa: convertToGPA(letterGrade),
    earnedCredits: passed ? getCourseCredits() : 0
  };
};
```

### Curve Grading (İstatistiksel Düzeltme)
```typescript
const applyCurveGrading = (rawScores: number[], curveType: 'linear' | 'bell' | 'square_root'): number[] => {
  switch (curveType) {
    case 'linear':
      return applyLinearCurve(rawScores);
    case 'bell':
      return applyBellCurve(rawScores);
    case 'square_root':
      return applySquareRootCurve(rawScores);
    default:
      return rawScores;
  }
};

const applyLinearCurve = (scores: number[]): number[] => {
  const maxScore = Math.max(...scores);
  const targetMax = 100;
  const multiplier = targetMax / maxScore;
  
  return scores.map(score => Math.min(Math.round(score * multiplier), 100));
};

const applyBellCurve = (scores: number[]): number[] => {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  );
  
  // Z-score normalleştirmesi
  return scores.map(score => {
    const zScore = (score - mean) / stdDev;
    // Z-score'u 0-100 aralığına dönüştür
    const normalizedScore = 50 + (zScore * 15); // Ortalama 50, standart sapma 15
    return Math.max(0, Math.min(100, Math.round(normalizedScore)));
  });
};
```

## 🔄 Feedback Generation

### Personalized Feedback System
```typescript
const generatePersonalizedFeedback = (
  studentPerformance: StudentPerformance,
  courseContext: CourseContext
): PersonalizedFeedback => {
  
  const strengths = identifyStrengths(studentPerformance);
  const weaknesses = identifyWeaknesses(studentPerformance);
  const improvementAreas = identifyImprovementAreas(studentPerformance);
  
  return {
    overallPerformance: {
      summary: generatePerformanceSummary(studentPerformance),
      grade: studentPerformance.currentGrade,
      percentile: calculatePercentile(studentPerformance, courseContext),
      trend: calculateGradeTrend(studentPerformance.gradeHistory)
    },
    strengths: {
      areas: strengths,
      messages: strengths.map(strength => generateStrengthMessage(strength)),
      encouragement: generateEncouragementMessage(strengths)
    },
    improvements: {
      areas: weaknesses,
      specificSuggestions: generateImprovementSuggestions(weaknesses),
      resources: recommendLearningResources(weaknesses),
      actionPlan: createActionPlan(improvementAreas)
    },
    nextSteps: {
      shortTerm: generateShortTermGoals(studentPerformance),
      mediumTerm: generateMediumTermGoals(studentPerformance),
      longTerm: generateLongTermGoals(studentPerformance)
    }
  };
};

const generateImprovementSuggestions = (weaknesses: WeaknessArea[]): ImprovementSuggestion[] => {
  return weaknesses.map(weakness => {
    switch (weakness.type) {
      case 'conceptual_understanding':
        return {
          area: weakness.name,
          suggestion: 'Bu konuyu daha derinlemesine çalışmanızı öneririz',
          resources: ['video_tutorials', 'practice_exercises', 'study_group'],
          priority: weakness.severity,
          estimatedTime: '2-3 saat/hafta'
        };
        
      case 'application_skills':
        return {
          area: weakness.name,
          suggestion: 'Pratik uygulamalar yaparak becerilerinizi geliştirebilirsiniz',
          resources: ['hands_on_projects', 'real_world_examples', 'simulation_exercises'],
          priority: weakness.severity,
          estimatedTime: '1-2 saat/hafta'
        };
        
      case 'time_management':
        return {
          area: 'Zaman Yönetimi',
          suggestion: 'Çalışma planınızı gözden geçirin ve düzenli çalışma alışkanlığı geliştirin',
          resources: ['study_schedule_template', 'time_tracking_tools', 'productivity_tips'],
          priority: 'high',
          estimatedTime: 'Günlük 15 dakika planlama'
        };
    }
  });
};
```

## 📊 Analytics & Reporting

### Grade Analytics
```typescript
const generateGradeAnalytics = (courseId: string, period: string): GradeAnalytics => {
  const allStudentGrades = getStudentGradesByCourse(courseId, period);
  
  return {
    classStatistics: {
      totalStudents: allStudentGrades.length,
      averageGrade: calculateAverage(allStudentGrades.map(g => g.numericGrade)),
      medianGrade: calculateMedian(allStudentGrades.map(g => g.numericGrade)),
      standardDeviation: calculateStandardDeviation(allStudentGrades.map(g => g.numericGrade)),
      gradeDistribution: calculateGradeDistribution(allStudentGrades),
      passRate: calculatePassRate(allStudentGrades)
    },
    performanceTrends: {
      weeklyAverages: calculateWeeklyAverages(courseId, period),
      improvementRate: calculateImprovementRate(allStudentGrades),
      strugglingStudents: identifyStrugglingStudents(allStudentGrades),
      topPerformers: identifyTopPerformers(allStudentGrades)
    },
    assessmentAnalysis: {
      mostDifficultTopics: identifyDifficultTopics(courseId),
      questionAnalysis: analyzeQuestionPerformance(courseId),
      timeSpentAnalysis: analyzeTimeSpentOnAssessments(courseId),
      cheatingDetection: detectAnomalousPatterns(allStudentGrades)
    }
  };
};

const detectAnomalousPatterns = (studentGrades: StudentGrade[]): AnomalyReport => {
  const anomalies = [];
  
  studentGrades.forEach(student => {
    // Aniden yükselen performans (potansiyel kopya)
    const rapidImprovement = detectRapidImprovement(student.gradeHistory);
    if (rapidImprovement.detected) {
      anomalies.push({
        studentId: student.userId,
        type: 'rapid_improvement',
        confidence: rapidImprovement.confidence,
        details: rapidImprovement.details
      });
    }
    
    // Benzer yanıt kalıpları
    const similarPatterns = detectSimilarAnswerPatterns(student.answerHistory);
    if (similarPatterns.detected) {
      anomalies.push({
        studentId: student.userId,
        type: 'similar_patterns',
        confidence: similarPatterns.confidence,
        suspiciousSessions: similarPatterns.sessions
      });
    }
    
    // Zamanlama anomalileri (çok hızlı tamamlama)
    const timingAnomalies = detectTimingAnomalies(student.sessionHistory);
    if (timingAnomalies.detected) {
      anomalies.push({
        studentId: student.userId,
        type: 'timing_anomaly',
        confidence: timingAnomalies.confidence,
        suspiciousSessions: timingAnomalies.sessions
      });
    }
  });
  
  return {
    totalAnomalies: anomalies.length,
    highConfidenceAnomalies: anomalies.filter(a => a.confidence > 0.8),
    anomaliesByType: groupAnomaliesByType(anomalies),
    recommendedActions: generateAnomalyRecommendations(anomalies)
  };
};
```

---

*Bu dokümantasyon, 7P Education platformunun kapsamlı değerlendirme ve notlama sistemini detaylandırmaktadır.*