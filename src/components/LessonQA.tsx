"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LessonQuestion {
  id: string;
  lesson_id: string;
  user_id: string;
  question_text: string;
  is_answered: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    id: string;
  };
  question_answers: QuestionAnswer[];
}

interface QuestionAnswer {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  is_instructor: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    id: string;
    is_admin: boolean;
  };
}

interface LessonQAProps {
  lessonId: string;
}

export default function LessonQA({ lessonId }: LessonQAProps) {
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswers, setNewAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCurrentUser();
    fetchQuestions();
  }, [lessonId]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(user);
      setIsAdmin(profile?.is_admin || false);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 LessonQA: Starting fetchQuestions for lessonId:', lessonId);

      // First, test basic table access
      console.log('🔍 LessonQA: Testing lesson_questions table access...');
      const { data: testData, error: testError } = await supabase
        .from('lesson_questions')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error('❌ LessonQA: lesson_questions table test failed:', testError);
        setError(`Database Error: ${testError.message}. Please check if Q&A tables exist.`);
        return;
      }

      console.log('✅ LessonQA: lesson_questions table accessible');

      // Use simplified join syntax with correct column names
      const { data: questionsData, error: questionsError } = await supabase
        .from('lesson_questions')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          ),
          question_answers (
            *,
            profiles:user_id (
              id,
              full_name,
              is_admin
            )
          )
        `)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (questionsError) {
        console.error('❌ LessonQA: Error fetching questions:', questionsError);
        setError(`Failed to load questions and answers: ${questionsError.message}`);
        return;
      }

      console.log('✅ LessonQA: Questions fetched successfully:', questionsData?.length || 0, 'questions');

      // Sort answers by created_at
      const processedQuestions = (questionsData || []).map(question => ({
        ...question,
        question_answers: (question.question_answers || []).sort(
          (a: QuestionAnswer, b: QuestionAnswer) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }));

      setQuestions(processedQuestions);

    } catch (err: any) {
      console.error('❌ LessonQA: Q&A fetch error:', err);
      setError(`Error loading Q&A data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim()) return;
    if (!currentUser) {
      setError('Please log in to ask a question');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const { error: insertError } = await supabase
        .from('lesson_questions')
        .insert({
          lesson_id: lessonId,
          user_id: currentUser.id,
          question_text: newQuestion.trim()
        });

      if (insertError) {
        console.error('Error submitting question:', insertError);
        setError('Failed to submit question');
        return;
      }

      setNewQuestion('');
      setSuccess('Question submitted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh questions
      fetchQuestions();

    } catch (err: any) {
      console.error('Submit question error:', err);
      setError('Error submitting question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const answerText = newAnswers[questionId];
    
    if (!answerText?.trim()) return;
    if (!currentUser) {
      setError('Please log in to answer a question');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const { error: insertError } = await supabase
        .from('question_answers')
        .insert({
          question_id: questionId,
          user_id: currentUser.id,
          answer_text: answerText.trim(),
          is_instructor: isAdmin
        });

      if (insertError) {
        console.error('Error submitting answer:', insertError);
        setError('Failed to submit answer');
        return;
      }

      // Update the question as answered if this is from an admin
      if (isAdmin) {
        await supabase
          .from('lesson_questions')
          .update({ is_answered: true })
          .eq('id', questionId);
      }

      setNewAnswers(prev => ({
        ...prev,
        [questionId]: ''
      }));
      
      setSuccess('Answer submitted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh questions
      fetchQuestions();

    } catch (err: any) {
      console.error('Submit answer error:', err);
      setError('Error submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setNewAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading Q&A...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Questions & Answers</h3>
        <div className="text-sm text-gray-500">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Ask Question Form */}
      {currentUser && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Ask a Question</h4>
          <form onSubmit={handleSubmitQuestion}>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Type your question here..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={submitting}
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={submitting || !newQuestion.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Ask Question'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-lg font-medium mb-2">No questions yet</p>
          <p className="text-sm">Be the first to ask a question about this lesson!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              {/* Question */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">
                        {question.profiles.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {question.profiles.full_name || 'Anonymous'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(question.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {question.is_answered && (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Answered
                      </span>
                    )}
                  </div>
                </div>
                <div className="pl-10">
                  <p className="text-gray-800 whitespace-pre-wrap">{question.question_text}</p>
                </div>
              </div>

              {/* Answers */}
              {question.question_answers.length > 0 && (
                <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                  {question.question_answers.map((answer) => (
                    <div key={answer.id} className="pl-6">
                      <div className="flex items-start space-x-2 mb-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          answer.profiles.is_admin 
                            ? 'bg-green-100' 
                            : 'bg-gray-100'
                        }`}>
                          <span className={`text-xs font-medium ${
                            answer.profiles.is_admin 
                              ? 'text-green-600' 
                              : 'text-gray-600'
                          }`}>
                            {answer.profiles.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="font-medium text-gray-900 text-sm">
                              {answer.profiles.full_name || 'Anonymous'}
                            </div>
                            {answer.profiles.is_admin && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                    Eğitmen
                              </span>
                            )}
                            <div className="text-xs text-gray-500">
                              {formatDate(answer.created_at)}
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">
                            {answer.answer_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer Form */}
              {currentUser && (
                <div className="mt-4 pl-4 border-l-2 border-gray-100">
                  <div className="pl-6">
                    <textarea
                      value={newAnswers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Write your answer..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                      disabled={submitting}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSubmitAnswer(question.id)}
                        disabled={submitting || !newAnswers[question.id]?.trim()}
                        className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Replying...
                          </>
                        ) : (
                          'Reply'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Login Prompt */}
      {!currentUser && (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-2">Please log in to ask questions or answer existing ones.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}