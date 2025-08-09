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
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
}

interface QuizBuilderProps {
  lessonId: string;
  onSave: () => void;
  onClose: () => void;
}

export default function QuizBuilder({ lessonId, onSave, onClose }: QuizBuilderProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({
    passing_grade: 70,
    max_attempts: 3,
    time_limit: null,
    shuffle_questions: false,
    shuffle_options: false,
    show_correct_answers: true,
    allow_review: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizData();
  }, [lessonId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 QuizBuilder: Starting fetchQuizData for lessonId:', lessonId);

      // First, test basic table access
      console.log('🔍 QuizBuilder: Testing quiz_questions table access...');
      const { data: testData, error: testError } = await supabase
        .from('quiz_questions')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error('❌ QuizBuilder: quiz_questions table test failed:', testError);
        setError(`Database Error: ${testError.message}. Please check if quiz tables exist.`);
        return;
      }

      console.log('✅ QuizBuilder: quiz_questions table accessible');

      // Fetch existing questions with options
      console.log('🔍 QuizBuilder: Fetching questions with options...');
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          question_options (*)
        `)
        .eq('lesson_id', lessonId)
        .order('position');

      if (questionsError) {
        console.error('❌ QuizBuilder: Error fetching questions:', questionsError);
        setError(`Failed to load quiz questions: ${questionsError.message}`);
        return;
      }

      console.log('✅ QuizBuilder: Questions fetched successfully:', questionsData?.length || 0, 'questions');

      // Transform data
      const transformedQuestions = questionsData?.map(q => ({
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
      })) || [];

      setQuestions(transformedQuestions);

      // Fetch quiz settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('quiz_settings')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching settings:', settingsError);
      } else if (settingsData) {
        setSettings({
          passing_grade: settingsData.passing_grade,
          max_attempts: settingsData.max_attempts,
          time_limit: settingsData.time_limit,
          shuffle_questions: settingsData.shuffle_questions,
          shuffle_options: settingsData.shuffle_options,
          show_correct_answers: settingsData.show_correct_answers,
          allow_review: settingsData.allow_review
        });
      }

    } catch (err: any) {
      console.error('Quiz data fetch error:', err);
      setError('Error loading quiz data');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `temp-${Date.now()}`,
      question_text: '',
      position: questions.length,
      options: [
        { id: `temp-opt-${Date.now()}-0`, option_text: '', is_correct: true, position: 0 },
        { id: `temp-opt-${Date.now()}-1`, option_text: '', is_correct: false, position: 1 },
        { id: `temp-opt-${Date.now()}-2`, option_text: '', is_correct: false, position: 2 },
      ]
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionIndex: number) => {
    setQuestions(questions.filter((_, index) => index !== questionIndex));
  };

  const updateQuestion = (questionIndex: number, field: string, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value
    };
    setQuestions(updatedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    const question = updatedQuestions[questionIndex];
    const newOption: QuizOption = {
      id: `temp-opt-${Date.now()}`,
      option_text: '',
      is_correct: false,
      position: question.options.length
    };
    question.options.push(newOption);
    setQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options
      .filter((_, index) => index !== optionIndex);
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = {
      ...updatedQuestions[questionIndex].options[optionIndex],
      [field]: value
    };
    setQuestions(updatedQuestions);
  };

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    // Set all options to false, then set selected to true
    updatedQuestions[questionIndex].options.forEach((opt, idx) => {
      opt.is_correct = idx === optionIndex;
    });
    setQuestions(updatedQuestions);
  };

  const saveQuiz = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate quiz
      if (questions.length === 0) {
        setError('Please add at least one question');
        return;
      }

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!question.question_text.trim()) {
          setError(`Question ${i + 1} is empty`);
          return;
        }
        if (question.options.length < 2) {
          setError(`Soru ${i + 1} en az 2 seçenek gerektirir`);
          return;
        }
        if (!question.options.some(opt => opt.is_correct)) {
          setError(`Question ${i + 1} needs a correct answer`);
          return;
        }
        if (question.options.some(opt => !opt.option_text.trim())) {
          setError(`Question ${i + 1} has empty options`);
          return;
        }
      }

      // Delete existing questions (cascade will handle options)
      const { error: deleteError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('lesson_id', lessonId);

      if (deleteError) {
        console.error('Error deleting existing questions:', deleteError);
        setError('Failed to update quiz questions');
        return;
      }

      // Save questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // Insert question
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            lesson_id: lessonId,
            question_text: question.question_text.trim(),
            position: i
          })
          .select()
          .single();

        if (questionError) {
          console.error('Error saving question:', questionError);
          setError(`Failed to save question ${i + 1}`);
          return;
        }

        // Insert options
        const optionsToInsert = question.options.map((option, optIndex) => ({
          question_id: questionData.id,
          option_text: option.option_text.trim(),
          is_correct: option.is_correct,
          position: optIndex
        }));

        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(optionsToInsert);

        if (optionsError) {
          console.error('Error saving options:', optionsError);
          setError(`Failed to save options for question ${i + 1}`);
          return;
        }
      }

      // Save or update quiz settings
      const { error: settingsError } = await supabase
        .from('quiz_settings')
        .upsert({
          lesson_id: lessonId,
          ...settings
        });

      if (settingsError) {
        console.error('Error saving settings:', settingsError);
        setError('Failed to save quiz settings');
        return;
      }

      onSave();
      
    } catch (err: any) {
      console.error('Save quiz error:', err);
      setError('Error saving quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading quiz builder...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Quiz Builder</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Quiz Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Quiz Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Grade (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.passing_grade}
                  onChange={(e) => setSettings({...settings, passing_grade: parseInt(e.target.value) || 70})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_attempts}
                  onChange={(e) => setSettings({...settings, max_attempts: parseInt(e.target.value) || 3})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.show_correct_answers}
                  onChange={(e) => setSettings({...settings, show_correct_answers: e.target.checked})}
                  className="mr-2"
                />
                Show correct answers after completion
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allow_review}
                  onChange={(e) => setSettings({...settings, allow_review: e.target.checked})}
                  className="mr-2"
                />
                Allow students to review their answers
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Quiz Questions ({questions.length})</h4>
              <button
                onClick={addQuestion}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No questions yet. Click "Add Question" to start building your quiz.</p>
              </div>
            ) : (
              questions.map((question, questionIndex) => (
                <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                  {/* Question Header */}
                  <div className="flex justify-between items-start mb-4">
                    <h5 className="font-medium text-gray-900">Question {questionIndex + 1}</h5>
                    <button
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Answer Options
                      </label>
                      <button
                        onClick={() => addOption(questionIndex)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Add Option
                      </button>
                    </div>

                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={option.is_correct}
                          onChange={() => setCorrectAnswer(questionIndex, optionIndex)}
                          className="mt-1"
                        />
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => updateOption(questionIndex, optionIndex, 'option_text', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        {question.options.length > 2 && (
                          <button
                            onClick={() => removeOption(questionIndex, optionIndex)}
                            className="text-red-600 hover:text-red-700 text-sm px-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={saveQuiz}
            disabled={saving || questions.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Quiz'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}