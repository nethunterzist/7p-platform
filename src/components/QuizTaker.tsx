"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface QuizQuestion {
  id: string;
  question_text: string;
  position: number;
  options: QuizOption[];
}

interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
}

interface QuizSettings {
  passing_grade: number;
  max_attempts: number;
  time_limit: number | null;
  show_correct_answers: boolean;
  allow_review: boolean;
}

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  attempt_number: number;
  attempted_at: string;
}

interface QuizTakerProps {
  lessonId: string;
  onQuizComplete: (passed: boolean) => void;
}

export default function QuizTaker({ lessonId, onQuizComplete }: QuizTakerProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [quizState, setQuizState] = useState<'loading' | 'ready' | 'taking' | 'completed' | 'maxed_out'>('loading');
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizData();
  }, [lessonId]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && quizState === 'taking') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmitQuiz();
    }
  }, [timeLeft, quizState]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 QuizTaker: Starting fetchQuizData for lessonId:', lessonId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to take the quiz');
        return;
      }

      console.log('✅ QuizTaker: User authenticated:', user.id);

      // First, test basic table access
      console.log('🔍 QuizTaker: Testing quiz_questions table access...');
      const { data: testData, error: testError } = await supabase
        .from('quiz_questions')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error('❌ QuizTaker: quiz_questions table test failed:', testError);
        setError(`Database Error: ${testError.message}. Please check if quiz tables exist.`);
        return;
      }

      console.log('✅ QuizTaker: quiz_questions table accessible');

      // Fetch quiz questions with options
      console.log('🔍 QuizTaker: Fetching questions with options...');
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          question_options (*)
        `)
        .eq('lesson_id', lessonId)
        .order('position');

      if (questionsError) {
        console.error('❌ QuizTaker: Error fetching questions:', questionsError);
        setError(`Failed to load quiz questions: ${questionsError.message}`);
        return;
      }

      console.log('✅ QuizTaker: Questions fetched successfully:', questionsData?.length || 0, 'questions');

      if (!questionsData || questionsData.length === 0) {
        setError('This quiz has no questions yet');
        return;
      }

      // Transform questions data
      const transformedQuestions = questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        position: q.position,
        options: (q.question_options || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((opt: any) => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            position: opt.position
          }))
      }));

      setQuestions(transformedQuestions);

      // Fetch quiz settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('quiz_settings')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching settings:', settingsError);
        setError('Failed to load quiz settings');
        return;
      }

      const quizSettings = settingsData || {
        passing_grade: 70,
        max_attempts: 3,
        time_limit: null,
        show_correct_answers: true,
        allow_review: true
      };
      setSettings(quizSettings);

      // Fetch user's previous attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .order('attempted_at', { ascending: false });

      if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError);
      } else {
        setAttempts(attemptsData || []);
        
        // Check if user has passed or maxed out attempts
        const passedAttempt = attemptsData?.find(attempt => attempt.passed);
        if (passedAttempt) {
          setCurrentAttempt(passedAttempt);
          setQuizState('completed');
        } else if (attemptsData && attemptsData.length >= quizSettings.max_attempts) {
          setQuizState('maxed_out');
        } else {
          setQuizState('ready');
        }
      }

    } catch (err: any) {
      console.error('Quiz data fetch error:', err);
      setError('Error loading quiz data');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizState('taking');
    setUserAnswers({});
    if (settings?.time_limit) {
      setTimeLeft(settings.time_limit * 60); // Convert minutes to seconds
    }
  };

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to submit quiz');
        return;
      }

      // Calculate score
      let correctCount = 0;
      const totalQuestions = questions.length;

      questions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        const correctOption = question.options.find(opt => opt.is_correct);
        if (userAnswer && correctOption && userAnswer === correctOption.id) {
          correctCount++;
        }
      });

      const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      const passed = percentage >= (settings?.passing_grade || 70);
      const attemptNumber = attempts.length + 1;

      // Save attempt to database
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          score: correctCount,
          total_questions: totalQuestions,
          percentage: percentage,
          passed: passed,
          answers_json: userAnswers,
          attempt_number: attemptNumber
        })
        .select()
        .single();

      if (attemptError) {
        console.error('Error saving attempt:', attemptError);
        setError('Failed to save quiz results');
        return;
      }

      setCurrentAttempt(attemptData);
      setQuizState('completed');
      
      // Notify parent component
      onQuizComplete(passed);

    } catch (err: any) {
      console.error('Submit quiz error:', err);
      setError('Error submitting quiz');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading && quizState === 'loading') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (quizState === 'maxed_out') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Maximum Attempts Reached</h3>
          <p className="text-gray-600 mb-4">
            You have used all {settings?.max_attempts} attempts for this quiz.
          </p>
          {attempts.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Your Best Score:</h4>
              <p className="text-2xl font-bold text-gray-700">
                {Math.max(...attempts.map(a => a.percentage)).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (quizState === 'completed' && currentAttempt) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="mb-4">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              currentAttempt.passed 
                ? 'bg-green-100' 
                : 'bg-red-100'
            }`}>
              <span className={`text-2xl ${
                currentAttempt.passed 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {currentAttempt.passed ? '✓' : '✕'}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Quiz {currentAttempt.passed ? 'Passed!' : 'Not Passed'}
          </h3>
          <p className="text-gray-600 mb-4">
            Your Score: {currentAttempt.score}/{currentAttempt.total_questions} ({currentAttempt.percentage.toFixed(1)}%)
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Passing Grade: {settings?.passing_grade || 70}%
          </p>
          
          {!currentAttempt.passed && attempts.length < (settings?.max_attempts || 3) && (
            <button
              onClick={() => {
                setQuizState('ready');
                setCurrentAttempt(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again ({attempts.length + 1}/{settings?.max_attempts || 3} attempts)
            </button>
          )}

          {settings?.show_correct_answers && settings?.allow_review && (
            <div className="mt-6 text-left">
              <h4 className="font-medium text-gray-900 mb-4">Review Answers:</h4>
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const userAnswer = userAnswers[question.id];
                  const correctOption = question.options.find(opt => opt.is_correct);
                  const userOption = question.options.find(opt => opt.id === userAnswer);
                  const isCorrect = userAnswer === correctOption?.id;

                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">
                        {index + 1}. {question.question_text}
                      </h5>
                      <div className="space-y-2">
                        {question.options.map(option => (
                          <div 
                            key={option.id} 
                            className={`p-2 rounded ${
                              option.is_correct 
                                ? 'bg-green-100 border border-green-300' 
                                : option.id === userAnswer && !option.is_correct
                                ? 'bg-red-100 border border-red-300'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center">
                              {option.is_correct && <span className="text-green-600 mr-2">✓</span>}
                              {option.id === userAnswer && !option.is_correct && <span className="text-red-600 mr-2">✕</span>}
                              <span>{option.option_text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm mt-2 font-medium">
                        Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                          {userOption?.option_text || 'Not answered'}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (quizState === 'ready') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ready to Start Quiz?</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-gray-900 mb-2">Quiz Information:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Questions: {questions.length}</li>
              <li>• Passing Grade: {settings?.passing_grade || 70}%</li>
              <li>• Maximum Attempts: {settings?.max_attempts || 3}</li>
              {settings?.time_limit && (
                <li>• Time Limit: {settings.time_limit} minutes</li>
              )}
              <li>• Attempts Used: {attempts.length}/{settings?.max_attempts || 3}</li>
            </ul>
          </div>

          {attempts.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Previous Attempts:</h4>
              <div className="space-y-2">
                {attempts.map((attempt, index) => (
                  <div key={attempt.id} className="flex justify-between text-sm">
                    <span>Attempt {attempt.attempt_number}:</span>
                    <span className={attempt.passed ? 'text-green-600 font-medium' : 'text-gray-600'}>
                      {attempt.percentage.toFixed(1)}% {attempt.passed && '(Passed)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startQuiz}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'taking') {
    const answeredCount = Object.keys(userAnswers).length;
    const allAnswered = answeredCount === questions.length;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        {/* Quiz Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Quiz in Progress</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Progress: {answeredCount}/{questions.length} questions
            </div>
            {timeLeft !== null && (
              <div className={`text-lg font-mono ${timeLeft < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                Time Left: {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">
                {index + 1}. {question.question_text}
              </h4>
              <div className="space-y-2">
                {question.options.map(option => (
                  <label key={option.id} className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={userAnswers[question.id] === option.id}
                      onChange={() => handleAnswerChange(question.id, option.id)}
                      className="mr-3"
                    />
                    <span>{option.option_text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {allAnswered ? 'All questions answered' : `${questions.length - answeredCount} questions remaining`}
            </div>
            <button
              onClick={handleSubmitQuiz}
              disabled={loading || !allAnswered}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gönderiliyor...
                </>
              ) : (
                'Sınavı Gönder'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}