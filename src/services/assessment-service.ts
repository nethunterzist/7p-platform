import { createClient } from '@/utils/supabase/server';
import {
  Assessment,
  Question,
  QuizAttempt,
  QuizResult,
  QuestionResult,
  AssessmentAnalytics,
  QuestionAnalytics,
  PersonalizedFeedback,
  EssayGradeResult,
  CheatingDetection,
  AnomalyReport
} from '@/types/assessment';
import {
  CreateAssessment,
  UpdateAssessment,
  CreateQuestion,
  SubmitQuizAttempt,
  ManualGrading
} from '@/lib/validation/assessment';

export class AssessmentService {
  /**
   * Create new assessment
   */
  static async createAssessment(
    instructorId: string,
    assessmentData: CreateAssessment
  ): Promise<Assessment> {
    const supabase = createClient();

    // Verify instructor owns the course
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', assessmentData.course_id)
      .single();

    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Course not found or access denied');
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        ...assessmentData,
        instructor_id: instructorId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create assessment: ${error.message}`);
    }

    return data;
  }

  /**
   * Get assessment by ID with questions
   */
  static async getAssessment(assessmentId: string, includeQuestions = true): Promise<Assessment> {
    const supabase = createClient();

    let query = supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    const { data: assessment, error } = await query;

    if (error) {
      throw new Error(`Assessment not found: ${error.message}`);
    }

    if (includeQuestions) {
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          *,
          options:question_options(*)
        `)
        .eq('assessment_id', assessmentId)
        .order('order_index');

      assessment.questions = questions || [];
    }

    return assessment;
  }

  /**
   * Update assessment
   */
  static async updateAssessment(
    assessmentId: string,
    instructorId: string,
    updateData: UpdateAssessment
  ): Promise<Assessment> {
    const supabase = createClient();

    // Verify ownership
    const { data: assessment } = await supabase
      .from('assessments')
      .select('instructor_id')
      .eq('id', assessmentId)
      .single();

    if (!assessment || assessment.instructor_id !== instructorId) {
      throw new Error('Assessment not found or access denied');
    }

    const { data, error } = await supabase
      .from('assessments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update assessment: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete assessment
   */
  static async deleteAssessment(assessmentId: string, instructorId: string): Promise<void> {
    const supabase = createClient();

    // Verify ownership
    const { data: assessment } = await supabase
      .from('assessments')
      .select('instructor_id')
      .eq('id', assessmentId)
      .single();

    if (!assessment || assessment.instructor_id !== instructorId) {
      throw new Error('Assessment not found or access denied');
    }

    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) {
      throw new Error(`Failed to delete assessment: ${error.message}`);
    }
  }

  /**
   * Add question to assessment
   */
  static async addQuestion(
    assessmentId: string,
    instructorId: string,
    questionData: CreateQuestion
  ): Promise<Question> {
    const supabase = createClient();

    // Verify assessment ownership
    const { data: assessment } = await supabase
      .from('assessments')
      .select('instructor_id')
      .eq('id', assessmentId)
      .single();

    if (!assessment || assessment.instructor_id !== instructorId) {
      throw new Error('Assessment not found or access denied');
    }

    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        ...questionData,
        assessment_id: assessmentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add question: ${error.message}`);
    }

    // Add question options if provided
    if (questionData.options && questionData.options.length > 0) {
      const optionsData = questionData.options.map(option => ({
        ...option,
        question_id: question.id
      }));

      await supabase
        .from('question_options')
        .insert(optionsData);
    }

    return question;
  }

  /**
   * Start quiz attempt
   */
  static async startQuizAttempt(
    userId: string,
    assessmentId: string,
    browserFingerprint?: string
  ): Promise<QuizAttempt> {
    const supabase = createClient();

    // Check if assessment exists and is available
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*, questions(*)')
      .eq('id', assessmentId)
      .eq('status', 'published')
      .single();

    if (!assessment) {
      throw new Error('Assessment not found or not available');
    }

    // Check if user is enrolled in the course
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', assessment.course_id)
      .is('cancelled_at', null)
      .single();

    if (!enrollment) {
      throw new Error('You are not enrolled in this course');
    }

    // Check attempt limits
    const { data: previousAttempts } = await supabase
      .from('quiz_attempts')
      .select('attempt_number')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false });

    const nextAttemptNumber = (previousAttempts?.[0]?.attempt_number || 0) + 1;

    if (nextAttemptNumber > assessment.max_attempts) {
      throw new Error(`Maximum attempts (${assessment.max_attempts}) reached`);
    }

    // Create new attempt
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        assessment_id: assessmentId,
        user_id: userId,
        attempt_number: nextAttemptNumber,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        browser_fingerprint: browserFingerprint,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start quiz attempt: ${error.message}`);
    }

    return attempt;
  }

  /**
   * Submit quiz attempt with auto-grading
   */
  static async submitQuizAttempt(
    userId: string,
    submissionData: SubmitQuizAttempt
  ): Promise<QuizResult> {
    const supabase = createClient();

    // Get attempt details
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        assessment:assessments(*)
      `)
      .eq('id', submissionData.attempt_id)
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .single();

    if (!attempt) {
      throw new Error('Quiz attempt not found or already submitted');
    }

    // Get questions and correct answers
    const { data: questions } = await supabase
      .from('questions')
      .select(`
        *,
        options:question_options(*)
      `)
      .eq('assessment_id', attempt.assessment_id)
      .order('order_index');

    if (!questions) {
      throw new Error('Questions not found');
    }

    // Save responses
    const responsesData = submissionData.responses.map(response => ({
      ...response,
      attempt_id: submissionData.attempt_id,
      created_at: new Date().toISOString()
    }));

    await supabase
      .from('question_responses')
      .insert(responsesData);

    // Grade the quiz
    const result = await this.gradeQuizAttempt(attempt, questions, submissionData.responses);

    // Update attempt status
    await supabase
      .from('quiz_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        time_spent: submissionData.total_time_spent,
        status: 'graded',
        score: result.score,
        max_score: result.max_score,
        percentage: result.percentage,
        passed: result.passed,
        graded_at: new Date().toISOString(),
        feedback: result.overall_feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionData.attempt_id);

    // Update question responses with grading results
    for (const questionResult of result.question_results) {
      await supabase
        .from('question_responses')
        .update({
          is_correct: questionResult.is_correct,
          points_earned: questionResult.points_earned,
          feedback: questionResult.feedback
        })
        .eq('attempt_id', submissionData.attempt_id)
        .eq('question_id', questionResult.question_id);
    }

    return result;
  }

  /**
   * Auto-grade quiz attempt
   */
  private static async gradeQuizAttempt(
    attempt: any,
    questions: Question[],
    responses: any[]
  ): Promise<QuizResult> {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const questionResults: QuestionResult[] = [];

    for (const question of questions) {
      const response = responses.find(r => r.question_id === question.id);
      const userAnswer = response?.answer || '';

      const gradeResult = await this.gradeQuestion(question, userAnswer);
      
      totalScore += gradeResult.points_earned;
      maxPossibleScore += question.points;

      questionResults.push({
        question_id: question.id,
        question_text: question.question_text,
        user_answer: userAnswer,
        correct_answer: question.correct_answer,
        is_correct: gradeResult.is_correct,
        points_earned: gradeResult.points_earned,
        max_points: question.points,
        feedback: gradeResult.feedback,
        explanation: question.explanation,
        time_spent: response?.time_spent
      });
    }

    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    const passed = percentage >= attempt.assessment.passing_score;

    // Generate personalized feedback
    const feedback = this.generateQuizFeedback(questionResults, percentage);

    return {
      attempt_id: attempt.id,
      user_id: attempt.user_id,
      assessment_id: attempt.assessment_id,
      score: totalScore,
      max_score: maxPossibleScore,
      percentage,
      passed,
      completed_at: new Date().toISOString(),
      time_spent: attempt.time_spent || 0,
      question_results: questionResults,
      overall_feedback: feedback.summary,
      strengths: feedback.strengths,
      improvement_areas: feedback.weaknesses,
      next_steps: feedback.recommendations
    };
  }

  /**
   * Grade individual question based on type
   */
  private static async gradeQuestion(question: Question, userAnswer: string | string[]): Promise<{
    is_correct: boolean;
    points_earned: number;
    feedback: string;
  }> {
    switch (question.question_type) {
      case 'multiple_choice':
        return this.gradeMultipleChoice(question, userAnswer as string);
      
      case 'true_false':
        return this.gradeTrueFalse(question, userAnswer as string);
      
      case 'fill_blank':
        return this.gradeFillBlank(question, userAnswer as string);
      
      case 'essay':
        return await this.gradeEssayAI(question, userAnswer as string);
      
      default:
        return {
          is_correct: false,
          points_earned: 0,
          feedback: 'Question type not supported for auto-grading'
        };
    }
  }

  /**
   * Grade multiple choice question
   */
  private static gradeMultipleChoice(question: Question, userAnswer: string): {
    is_correct: boolean;
    points_earned: number;
    feedback: string;
  } {
    const isCorrect = userAnswer === question.correct_answer;
    
    return {
      is_correct: isCorrect,
      points_earned: isCorrect ? question.points : 0,
      feedback: isCorrect 
        ? 'Correct!' 
        : `Incorrect. The correct answer is: ${question.correct_answer}`
    };
  }

  /**
   * Grade true/false question
   */
  private static gradeTrueFalse(question: Question, userAnswer: string): {
    is_correct: boolean;
    points_earned: number;
    feedback: string;
  } {
    const isCorrect = userAnswer.toLowerCase() === question.correct_answer.toString().toLowerCase();
    
    return {
      is_correct: isCorrect,
      points_earned: isCorrect ? question.points : 0,
      feedback: isCorrect 
        ? 'Correct!' 
        : `Incorrect. The correct answer is: ${question.correct_answer}`
    };
  }

  /**
   * Grade fill-in-the-blank question
   */
  private static gradeFillBlank(question: Question, userAnswer: string): {
    is_correct: boolean;
    points_earned: number;
    feedback: string;
  } {
    const correctAnswers = Array.isArray(question.correct_answer) 
      ? question.correct_answer 
      : [question.correct_answer as string];

    const userAnswerNormalized = userAnswer.toLowerCase().trim();
    const isCorrect = correctAnswers.some(answer => 
      answer.toLowerCase().trim() === userAnswerNormalized
    );

    return {
      is_correct: isCorrect,
      points_earned: isCorrect ? question.points : 0,
      feedback: isCorrect 
        ? 'Correct!' 
        : `Incorrect. Possible correct answers: ${correctAnswers.join(', ')}`
    };
  }

  /**
   * AI-powered essay grading (simplified implementation)
   */
  private static async gradeEssayAI(question: Question, userAnswer: string): Promise<{
    is_correct: boolean;
    points_earned: number;
    feedback: string;
  }> {
    // Simplified essay grading - in a real implementation, this would use NLP/AI
    const wordCount = userAnswer.split(' ').length;
    const hasKeywords = question.tags.some(tag => 
      userAnswer.toLowerCase().includes(tag.toLowerCase())
    );

    let score = 0;
    
    // Basic scoring criteria
    if (wordCount >= 50) score += 0.3; // Adequate length
    if (wordCount >= 100) score += 0.2; // Good length
    if (hasKeywords) score += 0.3; // Contains relevant keywords
    if (userAnswer.length > 200) score += 0.2; // Detailed response

    const pointsEarned = Math.round(score * question.points);
    const isCorrect = pointsEarned >= (question.points * 0.7); // 70% threshold

    return {
      is_correct: isCorrect,
      points_earned: pointsEarned,
      feedback: this.generateEssayFeedback(userAnswer, score, wordCount)
    };
  }

  /**
   * Generate essay feedback
   */
  private static generateEssayFeedback(answer: string, score: number, wordCount: number): string {
    const feedback = [];
    
    if (score >= 0.8) {
      feedback.push('Excellent response! Well-structured and comprehensive.');
    } else if (score >= 0.6) {
      feedback.push('Good response. Shows understanding of the topic.');
    } else if (score >= 0.4) {
      feedback.push('Adequate response. Could be more detailed.');
    } else {
      feedback.push('Response needs improvement. Consider adding more detail.');
    }

    if (wordCount < 50) {
      feedback.push('Response is quite brief. Consider expanding your answer.');
    } else if (wordCount > 200) {
      feedback.push('Comprehensive response with good detail.');
    }

    return feedback.join(' ');
  }

  /**
   * Generate personalized quiz feedback
   */
  private static generateQuizFeedback(questionResults: QuestionResult[], percentage: number): {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const correctAnswers = questionResults.filter(q => q.is_correct).length;
    const totalQuestions = questionResults.length;
    
    let summary = '';
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Generate summary
    if (percentage >= 90) {
      summary = 'Excellent performance! You demonstrate strong mastery of the material.';
      strengths.push('Exceptional understanding of key concepts');
    } else if (percentage >= 80) {
      summary = 'Good performance! You have a solid understanding of most concepts.';
      strengths.push('Strong grasp of fundamental concepts');
    } else if (percentage >= 70) {
      summary = 'Satisfactory performance. You understand the basic concepts but could improve.';
    } else if (percentage >= 60) {
      summary = 'Below average performance. Review the material and practice more.';
      weaknesses.push('Need to strengthen understanding of basic concepts');
    } else {
      summary = 'Poor performance. Significant review and practice needed.';
      weaknesses.push('Fundamental concepts need review');
      recommendations.push('Schedule additional study time');
    }

    // Analyze question types
    const easyQuestions = questionResults.filter(q => q.question_id.includes('easy')); // Simplified
    const hardQuestions = questionResults.filter(q => q.question_id.includes('hard')); // Simplified

    if (easyQuestions.length > 0) {
      const easyCorrect = easyQuestions.filter(q => q.is_correct).length;
      if (easyCorrect / easyQuestions.length >= 0.8) {
        strengths.push('Strong performance on basic concepts');
      }
    }

    if (hardQuestions.length > 0) {
      const hardCorrect = hardQuestions.filter(q => q.is_correct).length;
      if (hardCorrect / hardQuestions.length < 0.5) {
        weaknesses.push('Challenging concepts need more attention');
        recommendations.push('Focus on advanced topics and practice problems');
      }
    }

    // General recommendations
    if (percentage < 80) {
      recommendations.push('Review course materials and retake quizzes');
      recommendations.push('Seek help during instructor office hours');
    }

    return { summary, strengths, weaknesses, recommendations };
  }

  /**
   * Get assessment analytics
   */
  static async getAssessmentAnalytics(assessmentId: string): Promise<AssessmentAnalytics> {
    const supabase = createClient();

    // Get all attempts for this assessment
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        responses:question_responses(*)
      `)
      .eq('assessment_id', assessmentId)
      .eq('status', 'graded');

    if (!attempts || attempts.length === 0) {
      throw new Error('No completed attempts found for this assessment');
    }

    const completedAttempts = attempts.filter(a => a.submitted_at);
    const scores = completedAttempts.map(a => a.percentage || 0);
    const passingAttempts = completedAttempts.filter(a => a.passed);

    // Calculate basic statistics
    const totalAttempts = attempts.length;
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const medianScore = this.calculateMedian(scores);
    const passRate = (passingAttempts.length / completedAttempts.length) * 100;
    const averageTimeSpent = completedAttempts.reduce((sum, a) => sum + (a.time_spent || 0), 0) / completedAttempts.length;

    // Question analytics
    const questionAnalytics: QuestionAnalytics[] = await this.calculateQuestionAnalytics(assessmentId, attempts);

    return {
      assessment_id: assessmentId,
      total_attempts: totalAttempts,
      completed_attempts: completedAttempts.length,
      average_score: Math.round(averageScore * 100) / 100,
      median_score: medianScore,
      pass_rate: Math.round(passRate * 100) / 100,
      average_time_spent: Math.round(averageTimeSpent),
      question_analytics: questionAnalytics,
      difficulty_analysis: {
        overall_difficulty: this.calculateOverallDifficulty(questionAnalytics),
        questions_by_difficulty: { easy: 0, medium: 0, hard: 0 },
        performance_by_difficulty: {
          easy: { avg_score: 0, success_rate: 0 },
          medium: { avg_score: 0, success_rate: 0 },
          hard: { avg_score: 0, success_rate: 0 }
        }
      },
      time_distribution: {
        average_completion_time: averageTimeSpent,
        median_completion_time: this.calculateMedian(completedAttempts.map(a => a.time_spent || 0)),
        time_percentiles: {
          p25: 0, p50: 0, p75: 0, p90: 0
        },
        questions_by_time: []
      },
      performance_trends: [],
      anomaly_detection: {
        total_anomalies: 0,
        high_confidence_anomalies: 0,
        anomalies_by_type: {
          rapid_improvement: 0,
          similar_patterns: 0,
          timing_anomaly: 0,
          suspicious_behavior: 0
        },
        flagged_students: [],
        recommended_actions: []
      }
    };
  }

  /**
   * Calculate question analytics
   */
  private static async calculateQuestionAnalytics(assessmentId: string, attempts: any[]): Promise<QuestionAnalytics[]> {
    const supabase = createClient();

    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (!questions) return [];

    return questions.map(question => {
      const responses = attempts.flatMap(a => 
        a.responses?.filter((r: any) => r.question_id === question.id) || []
      );

      const correctResponses = responses.filter(r => r.is_correct).length;
      const totalResponses = responses.length;
      const successRate = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

      return {
        question_id: question.id,
        question_text: question.question_text,
        total_responses: totalResponses,
        correct_responses: correctResponses,
        success_rate: Math.round(successRate * 100) / 100,
        average_time_spent: 0, // Would calculate from response times
        discrimination_index: 0.5, // Simplified
        difficulty_index: successRate / 100,
        most_common_incorrect_answers: []
      };
    });
  }

  /**
   * Calculate median value
   */
  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Calculate overall difficulty
   */
  private static calculateOverallDifficulty(questionAnalytics: QuestionAnalytics[]): number {
    if (questionAnalytics.length === 0) return 0;
    
    const averageSuccessRate = questionAnalytics.reduce((sum, q) => sum + q.success_rate, 0) / questionAnalytics.length;
    return Math.round((100 - averageSuccessRate) * 100) / 100; // Invert success rate for difficulty
  }
}