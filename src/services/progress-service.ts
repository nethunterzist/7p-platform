import { createClient } from '@/utils/supabase/server';
import { 
  LessonProgress, 
  ModuleProgress, 
  CourseProgress, 
  StudentProgress, 
  LearningAnalytics,
  InstructorProgressOverview,
  QuizResult,
  LearningActivity,
  LevelSystem,
  UserAchievement
} from '@/types/progress';
import { ProgressUpdate, QuizResultSubmission } from '@/lib/validation/progress';

export class ProgressService {
  /**
   * Calculate lesson completion percentage based on algorithms from documentation
   */
  static calculateLessonCompletion(lessonProgress: {
    videoWatchPercentage: number;
    quizScore?: number;
    timeSpent: number;
    expectedTime: number;
  }): number {
    let completion = 0;
    
    // Video viewing weight: 60%
    completion += (lessonProgress.videoWatchPercentage * 0.6);
    
    // Quiz performance weight: 30%
    if (lessonProgress.quizScore !== undefined) {
      completion += (lessonProgress.quizScore * 0.3);
    }
    
    // Time-based completion weight: 10%
    const timeCompletion = Math.min(lessonProgress.timeSpent / lessonProgress.expectedTime, 1) * 10;
    completion += timeCompletion;
    
    return Math.min(completion, 100);
  }

  /**
   * Update lesson progress
   */
  static async updateLessonProgress(
    userId: string, 
    courseId: string, 
    progressData: ProgressUpdate
  ): Promise<LessonProgress> {
    const supabase = createClient();

    // Get lesson details for expected time calculation
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('duration_minutes')
      .eq('id', progressData.lesson_id)
      .single();

    const expectedTime = lesson?.duration_minutes || 30; // Default 30 minutes

    // Calculate completion percentage
    const completionPercentage = this.calculateLessonCompletion({
      videoWatchPercentage: progressData.video_watch_percentage || 0,
      quizScore: progressData.quiz_score,
      timeSpent: progressData.time_spent_minutes,
      expectedTime
    });

    // Check if lesson should be marked as completed
    const isCompleted = progressData.completed || 
                       (progressData.video_watch_percentage && progressData.video_watch_percentage >= 80);

    // Upsert lesson progress
    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        lesson_id: progressData.lesson_id,
        course_id: courseId,
        video_watch_percentage: progressData.video_watch_percentage || 0,
        quiz_score: progressData.quiz_score,
        time_spent_minutes: progressData.time_spent_minutes,
        last_position_seconds: progressData.last_position_seconds,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lesson progress: ${error.message}`);
    }

    // Update enrollment progress
    await this.updateEnrollmentProgress(userId, courseId);

    // Check for achievements
    await this.checkAndAwardAchievements(userId, {
      type: 'lesson_completed',
      score: progressData.quiz_score,
      difficulty: 'intermediate' // TODO: Get from lesson data
    });

    return data;
  }

  /**
   * Get student's progress for a specific course
   */
  static async getCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
    const supabase = createClient();

    // Get course modules and lessons
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select(`
        id, title, order_index,
        lessons:course_lessons(id, title, duration_minutes, order_index)
      `)
      .eq('course_id', courseId)
      .order('order_index')
      .order('order_index', { referencedTable: 'course_lessons' });

    if (modulesError) {
      throw new Error(`Failed to fetch course modules: ${modulesError.message}`);
    }

    // Get user's lesson progress
    const { data: lessonProgress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (progressError) {
      throw new Error(`Failed to fetch lesson progress: ${progressError.message}`);
    }

    // Calculate module progress
    const moduleProgressList: ModuleProgress[] = (modules || []).map(module => {
      const moduleProgress = (lessonProgress || []).filter(p => 
        module.lessons?.some(l => l.id === p.lesson_id)
      );

      const completedLessons = moduleProgress.filter(p => p.completed_at).length;
      const totalLessons = module.lessons?.length || 0;
      const overallCompletion = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      
      const averageScore = moduleProgress.length > 0
        ? moduleProgress
            .filter(p => p.quiz_score !== null)
            .reduce((sum, p) => sum + (p.quiz_score || 0), 0) / moduleProgress.length
        : 0;

      const totalTimeSpent = moduleProgress.reduce((sum, p) => sum + p.time_spent_minutes, 0);
      const expectedTotalTime = module.lessons?.reduce((sum, l) => sum + l.duration_minutes, 0) || 0;
      const estimatedTimeRemaining = Math.max(0, expectedTotalTime - totalTimeSpent);

      return {
        module_id: module.id,
        module_title: module.title,
        lessons: moduleProgress,
        overall_completion: Math.round(overallCompletion),
        average_score: Math.round(averageScore),
        estimated_time_remaining: estimatedTimeRemaining,
        completed_lessons: completedLessons,
        total_lessons: totalLessons
      };
    });

    // Calculate overall course progress
    const totalModules = moduleProgressList.length;
    const completedModules = moduleProgressList.filter(m => m.overall_completion >= 80).length;
    
    const totalLessons = moduleProgressList.reduce((sum, m) => sum + m.total_lessons, 0);
    const completedLessons = moduleProgressList.reduce((sum, m) => sum + m.completed_lessons, 0);
    const overallCompletion = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const averageScore = moduleProgressList.length > 0
      ? moduleProgressList.reduce((sum, m) => sum + m.average_score, 0) / moduleProgressList.length
      : 0;

    // Calculate current streak and study time
    const totalStudyTime = (lessonProgress || []).reduce((sum, p) => sum + p.time_spent_minutes, 0);
    const lastActivity = (lessonProgress || [])
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at;

    // TODO: Implement streak calculation and skills acquired logic
    const currentStreak = 0;
    const skillsAcquired: string[] = [];

    return {
      user_id: userId,
      course_id: courseId,
      overall_completion: Math.round(overallCompletion),
      completed_modules: completedModules,
      total_modules: totalModules,
      average_score: Math.round(averageScore),
      skills_acquired: skillsAcquired,
      modules: moduleProgressList,
      current_streak: currentStreak,
      total_study_time: totalStudyTime,
      last_activity: lastActivity || new Date().toISOString()
    };
  }

  /**
   * Get overall student progress across all courses
   */
  static async getStudentProgress(userId: string): Promise<StudentProgress[]> {
    const supabase = createClient();

    // Get user's enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        progress_percentage,
        course:courses(id, title, difficulty)
      `)
      .eq('user_id', userId)
      .is('cancelled_at', null);

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`);
    }

    // Get detailed progress for each course
    const progressPromises = (enrollments || []).map(async (enrollment) => {
      const courseProgress = await this.getCourseProgress(userId, enrollment.course_id);
      const achievements = await this.getUserAchievements(userId, enrollment.course_id);
      const levelSystem = await this.getUserLevelSystem(userId);
      
      return {
        user_id: userId,
        course_id: enrollment.course_id,
        progress_percentage: courseProgress.overall_completion,
        lessons_completed: courseProgress.modules.reduce((sum, m) => sum + m.completed_lessons, 0),
        total_lessons: courseProgress.modules.reduce((sum, m) => sum + m.total_lessons, 0),
        modules_completed: courseProgress.completed_modules,
        total_modules: courseProgress.total_modules,
        average_score: courseProgress.average_score,
        time_spent_minutes: courseProgress.total_study_time,
        current_streak: courseProgress.current_streak,
        last_activity: courseProgress.last_activity,
        achievements,
        level_system: levelSystem,
        weak_areas: [], // TODO: Implement weakness identification
        strong_areas: [] // TODO: Implement strength identification
      };
    });

    return Promise.all(progressPromises);
  }

  /**
   * Record quiz result and calculate score
   */
  static async recordQuizResult(
    userId: string,
    quizData: QuizResultSubmission
  ): Promise<QuizResult> {
    const supabase = createClient();

    // Get quiz questions and correct answers
    const { data: quiz, error: quizError } = await supabase
      .from('lesson_quizzes')
      .select(`
        id, max_score, passing_score,
        questions:quiz_questions(id, correct_answer, points)
      `)
      .eq('id', quizData.quiz_id)
      .single();

    if (quizError || !quiz) {
      throw new Error('Quiz not found');
    }

    // Calculate score
    let totalScore = 0;
    const maxScore = quiz.questions?.reduce((sum, q) => sum + q.points, 0) || 100;
    
    const questionResults = quizData.answers.map(answer => {
      const question = quiz.questions?.find(q => q.id === answer.question_id);
      if (!question) {
        return {
          question_id: answer.question_id,
          user_answer: answer.answer,
          correct_answer: '',
          score: 0,
          max_score: 0,
          feedback: 'Question not found',
          correct: false
        };
      }

      const isCorrect = answer.answer === question.correct_answer;
      const score = isCorrect ? question.points : 0;
      totalScore += score;

      return {
        question_id: answer.question_id,
        user_answer: answer.answer,
        correct_answer: question.correct_answer,
        score,
        max_score: question.points,
        feedback: isCorrect ? 'Correct!' : `Correct answer: ${question.correct_answer}`,
        correct: isCorrect
      };
    });

    const percentage = (totalScore / maxScore) * 100;
    const passed = percentage >= (quiz.passing_score || 70);

    // Save quiz result
    const { data: result, error: resultError } = await supabase
      .from('quiz_results')
      .insert({
        user_id: userId,
        lesson_id: quizData.lesson_id,
        quiz_id: quizData.quiz_id,
        score: totalScore,
        max_score: maxScore,
        percentage: Math.round(percentage),
        passed,
        completed_at: new Date().toISOString(),
        time_spent_minutes: quizData.time_spent_minutes,
        attempt_number: quizData.attempt_number || 1,
        question_results: questionResults
      })
      .select()
      .single();

    if (resultError) {
      throw new Error(`Failed to save quiz result: ${resultError.message}`);
    }

    // Update lesson progress with quiz score
    await this.updateLessonProgress(userId, '', {
      lesson_id: quizData.lesson_id,
      quiz_score: percentage,
      time_spent_minutes: quizData.time_spent_minutes
    });

    // Check achievements
    await this.checkAndAwardAchievements(userId, {
      type: 'quiz_completed',
      score: percentage
    });

    return result;
  }

  /**
   * Update enrollment progress based on lesson completions
   */
  private static async updateEnrollmentProgress(userId: string, courseId: string): Promise<void> {
    const supabase = createClient();

    // Get course progress
    const courseProgress = await this.getCourseProgress(userId, courseId);

    // Update enrollment record
    await supabase
      .from('enrollments')
      .update({
        progress_percentage: courseProgress.overall_completion,
        updated_at: new Date().toISOString(),
        completed_at: courseProgress.overall_completion >= 100 ? new Date().toISOString() : null
      })
      .eq('user_id', userId)
      .eq('course_id', courseId);
  }

  /**
   * Check and award achievements based on activity
   */
  private static async checkAndAwardAchievements(
    userId: string, 
    activity: LearningActivity
  ): Promise<UserAchievement[]> {
    const supabase = createClient();

    // Get available achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*');

    if (!achievements) return [];

    const newAchievements: UserAchievement[] = [];

    // Check each achievement
    for (const achievement of achievements) {
      const eligible = await this.checkAchievementEligibility(userId, achievement, activity);
      
      if (eligible) {
        // Check if user already has this achievement
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_id', achievement.id)
          .single();

        if (!existing) {
          // Award achievement
          const { data: userAchievement } = await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              earned_at: new Date().toISOString(),
              progress_value: this.calculateAchievementProgress(activity, achievement)
            })
            .select(`
              *,
              achievement:achievements(*)
            `)
            .single();

          if (userAchievement) {
            newAchievements.push(userAchievement);
            
            // Award XP for achievement
            await this.addExperience(userId, achievement.points);
          }
        }
      }
    }

    return newAchievements;
  }

  /**
   * Check if user is eligible for an achievement
   */
  private static async checkAchievementEligibility(
    userId: string,
    achievement: any,
    activity: LearningActivity
  ): Promise<boolean> {
    // Implementation based on badge criteria from documentation
    switch (achievement.criteria.type) {
      case 'completion':
        // Check overall completion rate
        // TODO: Implement completion checking logic
        return activity.type === 'lesson_completed' || activity.type === 'course_completed';
        
      case 'score':
        return (activity.score || 0) >= achievement.criteria.threshold;
        
      case 'streak':
        // TODO: Implement streak checking logic
        return activity.type === 'daily_login' && (activity.streakDays || 0) >= achievement.criteria.threshold;
        
      default:
        return false;
    }
  }

  /**
   * Calculate achievement progress value
   */
  private static calculateAchievementProgress(activity: LearningActivity, achievement: any): number {
    switch (achievement.criteria.type) {
      case 'score':
        return activity.score || 0;
      case 'streak':
        return activity.streakDays || 0;
      default:
        return 100; // Full progress for completion-based achievements
    }
  }

  /**
   * Add experience points to user
   */
  private static async addExperience(userId: string, points: number): Promise<void> {
    const supabase = createClient();

    // Update user XP
    const { error } = await supabase.rpc('add_user_experience', {
      p_user_id: userId,
      p_points: points
    });

    if (error) {
      console.error('Failed to add experience:', error);
    }
  }

  /**
   * Get user achievements for a course
   */
  static async getUserAchievements(userId: string, courseId?: string): Promise<UserAchievement[]> {
    const supabase = createClient();

    let query = supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch achievements: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get user level system
   */
  static async getUserLevelSystem(userId: string): Promise<LevelSystem> {
    const supabase = createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('experience_points')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user level: ${error.message}`);
    }

    const currentXP = user?.experience_points || 0;
    
    // Exponential leveling formula from documentation
    const level = Math.floor(Math.sqrt(currentXP / 1000)) + 1;
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 1000;
    const xpForNextLevel = Math.pow(level, 2) * 1000;

    return {
      current_level: level,
      current_xp: currentXP,
      xp_to_next_level: xpForNextLevel - currentXP,
      total_xp: currentXP,
      level_benefits: this.getLevelBenefits(level)
    };
  }

  /**
   * Get level benefits
   */
  private static getLevelBenefits(level: number): string[] {
    const benefits = [];
    
    if (level >= 5) benefits.push('Course completion certificates');
    if (level >= 10) benefits.push('Priority instructor support');
    if (level >= 15) benefits.push('Early access to new courses');
    if (level >= 20) benefits.push('Exclusive community access');
    if (level >= 25) benefits.push('Course creation privileges');
    
    return benefits;
  }

  /**
   * Get instructor progress overview for a course
   */
  static async getInstructorProgressOverview(
    instructorId: string,
    courseId: string
  ): Promise<InstructorProgressOverview> {
    const supabase = createClient();

    // Verify instructor owns the course
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Course not found or access denied');
    }

    // Get enrolled students progress
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        user_id, progress_percentage, enrolled_at,
        user:users(id, name)
      `)
      .eq('course_id', courseId)
      .is('cancelled_at', null);

    const totalStudents = enrollments?.length || 0;
    const averageProgress = totalStudents > 0
      ? enrollments!.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalStudents
      : 0;

    const completedStudents = enrollments?.filter(e => e.progress_percentage >= 100).length || 0;
    const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;

    // Get detailed lesson progress for analysis
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, quiz_score, completed_at')
      .eq('course_id', courseId);

    const averageScore = lessonProgress && lessonProgress.length > 0
      ? lessonProgress
          .filter(lp => lp.quiz_score !== null)
          .reduce((sum, lp) => sum + (lp.quiz_score || 0), 0) / lessonProgress.length
      : 0;

    // Calculate at-risk and top performers
    const atRiskStudents = enrollments?.filter(e => 
      (e.progress_percentage || 0) < 25 && 
      Date.now() - new Date(e.enrolled_at).getTime() > 7 * 24 * 60 * 60 * 1000 // 1 week
    ).length || 0;

    const topPerformers = enrollments?.filter(e => 
      (e.progress_percentage || 0) > 80
    ).length || 0;

    // Progress distribution
    const progressDistribution = [
      { range: '0-25%', student_count: enrollments?.filter(e => (e.progress_percentage || 0) <= 25).length || 0 },
      { range: '26-50%', student_count: enrollments?.filter(e => (e.progress_percentage || 0) > 25 && (e.progress_percentage || 0) <= 50).length || 0 },
      { range: '51-75%', student_count: enrollments?.filter(e => (e.progress_percentage || 0) > 50 && (e.progress_percentage || 0) <= 75).length || 0 },
      { range: '76-100%', student_count: enrollments?.filter(e => (e.progress_percentage || 0) > 75).length || 0 }
    ];

    return {
      course_id: courseId,
      total_students: totalStudents,
      average_progress: Math.round(averageProgress),
      completion_rate: Math.round(completionRate),
      average_score: Math.round(averageScore),
      at_risk_students: atRiskStudents,
      top_performers: topPerformers,
      most_difficult_lessons: [], // TODO: Implement lesson difficulty analysis
      engagement_metrics: {
        daily_active_users: 0, // TODO: Implement DAU calculation
        weekly_active_users: 0, // TODO: Implement WAU calculation
        average_time_per_session: 0, // TODO: Implement session time calculation
        bounce_rate: 0 // TODO: Implement bounce rate calculation
      },
      progress_distribution: progressDistribution
    };
  }

  /**
   * Generate learning analytics for a student
   */
  static async generateLearningAnalytics(
    userId: string,
    courseId: string
  ): Promise<LearningAnalytics> {
    const supabase = createClient();

    // Get learning sessions and progress data
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (!lessonProgress || lessonProgress.length === 0) {
      // Return default analytics for new students
      return {
        user_id: userId,
        course_id: courseId,
        learning_velocity: 0,
        retention_rate: 0,
        practical_application: 0,
        conceptual_understanding: 0,
        time_optimization: 0,
        study_sessions: 0,
        average_session_duration: 0,
        peak_learning_hours: [],
        completion_prediction: {
          estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          success_probability: 75,
          confidence_level: 50
        }
      };
    }

    // Calculate learning velocity (lessons per hour of study)
    const totalLessons = lessonProgress.filter(lp => lp.completed_at).length;
    const totalStudyTime = lessonProgress.reduce((sum, lp) => sum + lp.time_spent_minutes, 0) / 60; // Convert to hours
    const learningVelocity = totalStudyTime > 0 ? totalLessons / totalStudyTime : 0;

    // Calculate retention rate based on quiz scores
    const quizScores = lessonProgress.filter(lp => lp.quiz_score !== null);
    const retentionRate = quizScores.length > 0
      ? quizScores.reduce((sum, lp) => sum + (lp.quiz_score || 0), 0) / quizScores.length
      : 0;

    // Calculate study sessions
    const studySessions = lessonProgress.length;
    const averageSessionDuration = studySessions > 0
      ? lessonProgress.reduce((sum, lp) => sum + lp.time_spent_minutes, 0) / studySessions
      : 0;

    // TODO: Implement more sophisticated analytics algorithms from documentation

    return {
      user_id: userId,
      course_id: courseId,
      learning_velocity: Math.round(learningVelocity * 100) / 100,
      retention_rate: Math.round(retentionRate),
      practical_application: 75, // TODO: Implement practical application scoring
      conceptual_understanding: Math.round(retentionRate), // Use retention as proxy
      time_optimization: 80, // TODO: Implement time optimization scoring
      study_sessions: studySessions,
      average_session_duration: Math.round(averageSessionDuration),
      peak_learning_hours: [14, 15, 16, 19, 20], // TODO: Calculate from session timestamps
      completion_prediction: {
        estimated_completion_date: this.predictCompletionDate(lessonProgress).toISOString(),
        success_probability: Math.min(90, Math.max(30, Math.round(retentionRate * 1.2))),
        confidence_level: Math.min(95, Math.max(40, studySessions * 10))
      }
    };
  }

  /**
   * Predict course completion date based on current progress
   */
  private static predictCompletionDate(lessonProgress: LessonProgress[]): Date {
    if (lessonProgress.length === 0) {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
    }

    const completedLessons = lessonProgress.filter(lp => lp.completed_at).length;
    const averageTimePerLesson = lessonProgress.reduce((sum, lp) => sum + lp.time_spent_minutes, 0) / lessonProgress.length;
    
    // TODO: Get total lessons from course data
    const assumedTotalLessons = 50; // Placeholder
    const remainingLessons = assumedTotalLessons - completedLessons;
    
    const estimatedRemainingTime = remainingLessons * averageTimePerLesson; // minutes
    const estimatedDays = Math.ceil(estimatedRemainingTime / (60 * 2)); // Assuming 2 hours study per day
    
    return new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);
  }
}