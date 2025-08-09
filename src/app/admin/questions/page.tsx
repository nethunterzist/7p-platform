"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/lib/useAdmin';

interface LessonQuestion {
  id: string;
  lesson_id: string;
  user_id: string;
  question_text: string;
  is_answered: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
    id: string;
  };
  lessons: {
    title: string;
    modules: {
      title: string;
      courses: {
        name: string;
      };
    };
  };
  question_answers: Array<{
    id: string;
    answer_text: string;
    is_instructor: boolean;
    created_at: string;
    profiles: {
      full_name: string;
      id: string;
      is_admin: boolean;
    };
  }>;
}

// Helper function to filter questions based on current filter
const setFilteredQuestions = (allQuestions: LessonQuestion[], filter: 'all' | 'unanswered' | 'answered', setQuestions: React.Dispatch<React.SetStateAction<LessonQuestion[]>>) => {
  let filtered = allQuestions;
  
  if (filter === 'unanswered') {
    filtered = allQuestions.filter(q => !q.is_answered);
  } else if (filter === 'answered') {
    filtered = allQuestions.filter(q => q.is_answered);
  }
  
  setQuestions(filtered);
};

export default function AdminQuestionsPage() {
  const { user, isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<LessonQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('unanswered');
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (adminLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    fetchQuestions();
  }, [user, isAdmin, adminLoading, router]);

  // Separate useEffect to handle filter changes without refetching
  useEffect(() => {
    if (allQuestions.length > 0) {
      setFilteredQuestions(allQuestions, filter, setQuestions);
    }
  }, [filter, allQuestions]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 STEP 1: Starting fetchQuestions with filter:', filter);

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔍 STEP 2: Auth check:', { user: user?.id, authError });
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        setError(`Authentication error: ${authError.message}`);
        return;
      }
      
      if (!user) {
        console.error('❌ No user found');
        setError('User not authenticated');
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      console.log('🔍 STEP 3: Profile check:', { profile, profileError });
      
      if (profileError) {
        console.error('❌ Profile error:', profileError);
        setError(`Profile error: ${profileError.message}`);
        return;
      }

      // Skip table structure test for now
      console.log('🔍 STEP 4-5: Skipping table structure test');

      // Test basic table access
      console.log('🔍 STEP 6: Testing basic lesson_questions access...');
      const { data: basicTest, error: basicError } = await supabase
        .from('lesson_questions')
        .select('id, lesson_id, user_id, question_text, is_answered, created_at')
        .limit(1);

      console.log('🔍 STEP 7: Basic access test:', { 
        data: basicTest, 
        error: basicError,
        errorCode: basicError?.code,
        errorMessage: basicError?.message,
        errorDetails: basicError?.details,
        errorHint: basicError?.hint
      });

      if (basicError) {
        console.error('❌ STEP 7 FAILED: Basic table access failed:', {
          error: basicError,
          code: basicError.code,
          message: basicError.message,
          details: basicError.details,
          hint: basicError.hint
        });
        setError(`Database access failed: ${basicError.message || 'Unknown error'}`);
        return;
      }

      console.log('✅ STEP 7 SUCCESS: Basic table access works');

      // Test profiles join with correct column names
      console.log('🔍 STEP 8: Testing profiles join...');
      const { data: profileJoinTest, error: profileJoinError } = await supabase
        .from('lesson_questions')
        .select(`
          id,
          user_id,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .limit(1);

      console.log('🔍 STEP 9: Profile join test:', { 
        data: profileJoinTest, 
        error: profileJoinError,
        errorCode: profileJoinError?.code,
        errorMessage: profileJoinError?.message
      });

      if (profileJoinError) {
        console.error('❌ STEP 9 FAILED: Profile join failed:', profileJoinError);
        // Continue without profiles join
      }

      // Test lessons join
      console.log('🔍 STEP 10: Testing lessons join...');
      const { data: lessonJoinTest, error: lessonJoinError } = await supabase
        .from('lesson_questions')
        .select(`
          id,
          lesson_id,
          lessons (
            title
          )
        `)
        .limit(1);

      console.log('🔍 STEP 11: Lesson join test:', { 
        data: lessonJoinTest, 
        error: lessonJoinError,
        errorCode: lessonJoinError?.code,
        errorMessage: lessonJoinError?.message
      });

      if (lessonJoinError) {
        console.error('❌ STEP 11 FAILED: Lesson join failed:', lessonJoinError);
        // Continue without lessons join for now
      }

      // Build the comprehensive query with joins - ALWAYS fetch ALL questions
      console.log('🔍 STEP 12: Building comprehensive query with joins (fetching ALL questions)...');
      
      let query = supabase
        .from('lesson_questions')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          ),
          lessons (
            title,
            modules (
              title,
              courses (
                name
              )
            )
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
        .order('created_at', { ascending: false });

      // Don't apply filter to the query - we'll filter in the UI

      console.log('🔍 STEP 13: Executing comprehensive query with filter:', filter);
      const { data: questionsData, error: questionsError } = await query;

      console.log('🔍 STEP 14: Comprehensive query result:', { 
        dataLength: questionsData?.length,
        error: questionsError,
        errorCode: questionsError?.code,
        errorMessage: questionsError?.message,
        sampleData: questionsData?.[0]
      });

      if (questionsError) {
        console.error('❌ STEP 14 FAILED: Comprehensive query failed:', {
          error: questionsError,
          code: questionsError.code,
          message: questionsError.message,
          details: questionsError.details,
          hint: questionsError.hint
        });
        
        // Fallback to basic query without joins
        console.log('🔍 FALLBACK: Trying basic query without joins...');
        const { data: basicData, error: basicError } = await supabase
          .from('lesson_questions')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (basicError) {
          setError(`Query failed: ${basicError.message}`);
          return;
        }
        
        // Set basic data and fetch related data separately
        const processedQuestions = await Promise.all((basicData || []).map(async (question) => {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', question.user_id)
            .single();

          // Fetch lesson details
          const { data: lesson } = await supabase
            .from('lessons')
            .select(`
              title,
              modules (
                title,
                courses (
                  name
                )
              )
            `)
            .eq('id', question.lesson_id)
            .single();

          // Fetch answers
          const { data: answers } = await supabase
            .from('question_answers')
            .select(`
              *,
              profiles:user_id (
                id,
                full_name,
                is_admin
              )
            `)
            .eq('question_id', question.id)
            .order('created_at', { ascending: true });

          return {
            ...question,
            profiles: profile || { id: question.user_id, full_name: 'Anonymous' },
            lessons: lesson || { title: 'Unknown Lesson', modules: { title: 'Unknown Module', courses: { name: 'Unknown Course' } } },
            question_answers: answers || []
          };
        }));
        
        // Store all questions and set filtered questions
        setAllQuestions(processedQuestions);
        setFilteredQuestions(processedQuestions, filter, setQuestions);
        console.log('✅ FALLBACK SUCCESS: Basic query with separate fetches worked');
        return;
      }

      console.log('✅ STEP 14 SUCCESS: Comprehensive query worked! Data length:', questionsData?.length);

      // Process the successful comprehensive query results
      const processedQuestions = (questionsData || []).map(question => ({
        ...question,
        profiles: question.profiles || { id: question.user_id, full_name: 'Anonymous' },
        lessons: question.lessons || { title: 'Unknown Lesson', modules: { title: 'Unknown Module', courses: { name: 'Unknown Course' } } },
        question_answers: (question.question_answers || []).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }));

      // Store all questions and set filtered questions
      setAllQuestions(processedQuestions);
      setFilteredQuestions(processedQuestions, filter, setQuestions);
      console.log('✅ SUCCESS: Questions set successfully');

    } catch (err: any) {
      console.error('❌ CRITICAL ERROR: Catch block triggered:', {
        error: err,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        toString: err?.toString?.(),
        valueOf: err?.valueOf?.()
      });
      setError(`Critical error: ${err?.message || JSON.stringify(err) || 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('🔍 FINAL: fetchQuestions completed');
    }
  };

  const handleAnswerSubmit = async (questionId: string) => {
    const answerText = answerTexts[questionId];
    
    if (!answerText?.trim()) return;
    if (!user) return;

    try {
      setSubmitting(prev => ({ ...prev, [questionId]: true }));
      setError('');

      // Submit the answer
      const { error: insertError } = await supabase
        .from('question_answers')
        .insert({
          question_id: questionId,
          user_id: user.id,
          answer_text: answerText.trim(),
          is_instructor: true
        });

      if (insertError) {
        console.error('Error submitting answer:', insertError);
        setError('Failed to submit answer');
        return;
      }

      // Mark question as answered
      const { error: updateError } = await supabase
        .from('lesson_questions')
        .update({ 
          is_answered: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (updateError) {
        console.error('Error updating question status:', updateError);
      }

      // Clear the answer text
      setAnswerTexts(prev => ({
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
      setSubmitting(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswerTexts(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMarkAnswered = async (questionId: string, isAnswered: boolean) => {
    try {
      const { error } = await supabase
        .from('lesson_questions')
        .update({ 
          is_answered: isAnswered,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) {
        console.error('Error updating question status:', error);
        setError('Failed to update question status');
        return;
      }

      setSuccess(`Question marked as ${isAnswered ? 'answered' : 'unanswered'}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      fetchQuestions();

    } catch (err: any) {
      console.error('Update question status error:', err);
      setError('Error updating question status');
    }
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

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  // Calculate stats from ALL questions, not just filtered ones
  const unansweredCount = allQuestions.filter(q => !q.is_answered).length;
  const answeredCount = allQuestions.filter(q => q.is_answered).length;
  const totalCount = allQuestions.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Questions Management</h1>
              <p className="text-sm text-gray-600">
                Manage student questions and provide answers
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Stats and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{unansweredCount}</div>
                <div className="text-sm text-gray-600">Unanswered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{answeredCount}</div>
                <div className="text-sm text-gray-600">Answered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalCount}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('unanswered')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'unanswered'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unanswered ({unansweredCount})
              </button>
              <button
                onClick={() => setFilter('answered')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'answered'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Answered ({answeredCount})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({totalCount})
              </button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filter === 'all' ? 'All Questions' : 
               filter === 'unanswered' ? 'Unanswered Questions' : 'Answered Questions'}
            </h2>
          </div>

          {questions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg font-medium mb-2">
                {filter === 'unanswered' ? 'No unanswered questions!' : 
                 filter === 'answered' ? 'No answered questions yet' : 'No questions found'}
              </p>
              <p className="text-sm">
                {filter === 'unanswered' ? 'Great job staying on top of student questions!' : 
                 'Questions will appear here as students ask them.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {questions.map((question) => (
                <div key={question.id} className="p-6">
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">
                            {question.profiles.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {question.profiles.full_name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(question.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        📚 {question.lessons.modules.courses.name} → 
                        {question.lessons.modules.title} → 
                        {question.lessons.title}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {question.is_answered ? (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Answered
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Needs Answer
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleMarkAnswered(question.id, !question.is_answered)}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                        title={`Mark as ${question.is_answered ? 'unanswered' : 'answered'}`}
                      >
                        {question.is_answered ? '↶' : '✓'}
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{question.question_text}</p>
                  </div>

                  {/* Existing Answers */}
                  {question.question_answers.length > 0 && (
                    <div className="mb-4 space-y-3">
                      {question.question_answers.map((answer) => (
                        <div key={answer.id} className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              answer.profiles.is_admin ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-xs font-medium ${
                                answer.profiles.is_admin ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {answer.profiles.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="font-medium text-gray-900 text-sm">
                                  {answer.profiles.full_name || 'Anonymous'}
                                </div>
                                {answer.profiles.is_admin && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Instructor
                                  </span>
                                )}
                                <div className="text-xs text-gray-500">
                                  {formatDate(answer.created_at)}
                                </div>
                              </div>
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                {answer.answer_text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer Form */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Cevap Ekle:</h4>
                    <textarea
                      value={answerTexts[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Cevabınızı buraya yazın..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      disabled={submitting[question.id]}
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleAnswerSubmit(question.id)}
                        disabled={submitting[question.id] || !answerTexts[question.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                      >
                        {submitting[question.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Gönderiliyor...
                          </>
                        ) : (
                          'Cevabı Gönder'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}