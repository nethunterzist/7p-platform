"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDBPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    setUser(user);
    console.log('Current user:', user);
  };

  const testQueries = [
    {
      name: "Test basic connection",
      query: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Basic Supabase connection test" };
      }
    },
    {
      name: "Check quiz_questions table",
      query: async () => {
        const { data, error } = await supabase
          .from('quiz_questions')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Quiz questions table existence" };
      }
    },
    {
      name: "Check question_options table", 
      query: async () => {
        const { data, error } = await supabase
          .from('question_options')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Question options table existence" };
      }
    },
    {
      name: "Check quiz_attempts table",
      query: async () => {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Quiz attempts table existence" };
      }
    },
    {
      name: "Check quiz_settings table",
      query: async () => {
        const { data, error } = await supabase
          .from('quiz_settings')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Quiz settings table existence" };
      }
    },
    {
      name: "Check lesson_questions table",
      query: async () => {
        const { data, error } = await supabase
          .from('lesson_questions')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Lesson questions table existence" };
      }
    },
    {
      name: "Check question_answers table",
      query: async () => {
        const { data, error } = await supabase
          .from('question_answers')
          .select('count', { count: 'exact', head: true });
        return { data, error, description: "Question answers table existence" };
      }
    },
    {
      name: "Test lessons table access",
      query: async () => {
        const { data, error } = await supabase
          .from('lessons')
          .select('id, title, type')
          .limit(5);
        return { data, error, description: "Lessons table access test" };
      }
    },
    {
      name: "Test quiz_questions with lessons join",
      query: async () => {
        const { data, error } = await supabase
          .from('quiz_questions')
          .select(`
            *,
            lessons!inner (
              id,
              title,
              type
            )
          `)
          .limit(5);
        return { data, error, description: "Quiz questions with lessons join test" };
      }
    }
  ];

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    
    for (const test of testQueries) {
      try {
        console.log(`Running test: ${test.name}`);
        const result = await test.query();
        const testResult = {
          name: test.name,
          description: result.description,
          success: !result.error,
          data: result.data,
          error: result.error,
          message: result.error ? result.error.message : 'Success'
        };
        
        console.log(`Test result for ${test.name}:`, testResult);
        setResults(prev => [...prev, testResult]);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Test failed: ${test.name}`, err);
        setResults(prev => [...prev, {
          name: test.name,
          success: false,
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error'
        }]);
      }
    }
    
    setLoading(false);
  };

  const createQuizTables = async () => {
    try {
      setLoading(true);
      
      // This would normally be done through Supabase SQL editor
      // For now, we'll show the SQL that needs to be executed
      const sql = `
-- Phase 2.5: Interactive Quiz System Database Schema
-- Run this in Supabase SQL Editor

-- Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(lesson_id, position)
);

-- Question Options Table
CREATE TABLE IF NOT EXISTS question_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(question_id, position)
);

-- Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    passed BOOLEAN DEFAULT false NOT NULL,
    answers_json JSONB DEFAULT '{}' NOT NULL,
    time_spent INTEGER DEFAULT 0,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1
);

-- Quiz Settings Table
CREATE TABLE IF NOT EXISTS quiz_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE UNIQUE,
    passing_grade INTEGER DEFAULT 70 NOT NULL,
    max_attempts INTEGER DEFAULT 3 NOT NULL,
    time_limit INTEGER DEFAULT NULL,
    shuffle_questions BOOLEAN DEFAULT false NOT NULL,
    shuffle_options BOOLEAN DEFAULT false NOT NULL,
    show_correct_answers BOOLEAN DEFAULT true NOT NULL,
    allow_review BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Q&A System Tables
CREATE TABLE IF NOT EXISTS lesson_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    is_answered BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS question_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_instructor BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_id ON quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_position ON quiz_questions(lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_position ON question_options(question_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_lesson ON quiz_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson_id ON quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempted_at ON quiz_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_id ON lesson_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_user_id ON lesson_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_answered ON lesson_questions(is_answered);
CREATE INDEX IF NOT EXISTS idx_question_answers_question_id ON question_answers(question_id);

-- Enable RLS
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- QUIZ_QUESTIONS POLICIES
CREATE POLICY "Admin users can manage all quiz questions" 
ON quiz_questions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Students can view quiz questions of enrolled courses" 
ON quiz_questions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.course_id = e.course_id
    JOIN lessons l ON l.module_id = m.id
    WHERE e.user_id = auth.uid() 
    AND l.id = quiz_questions.lesson_id
    AND e.status = 'active'
  )
);

-- QUESTION_OPTIONS POLICIES
CREATE POLICY "Admin users can manage all question options" 
ON question_options FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Students can view question options of enrolled courses" 
ON question_options FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.course_id = e.course_id
    JOIN lessons l ON l.module_id = m.id
    JOIN quiz_questions qq ON qq.lesson_id = l.id
    WHERE e.user_id = auth.uid() 
    AND qq.id = question_options.question_id
    AND e.status = 'active'
  )
);

-- QUIZ_ATTEMPTS POLICIES
CREATE POLICY "Users can manage their own quiz attempts" 
ON quiz_attempts FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admin can view all quiz attempts" 
ON quiz_attempts FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- QUIZ_SETTINGS POLICIES
CREATE POLICY "Admin users can manage quiz settings" 
ON quiz_settings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Students can view quiz settings of enrolled courses" 
ON quiz_settings FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.course_id = e.course_id
    JOIN lessons l ON l.module_id = m.id
    WHERE e.user_id = auth.uid() 
    AND l.id = quiz_settings.lesson_id
    AND e.status = 'active'
  )
);

-- LESSON_QUESTIONS POLICIES
CREATE POLICY "Users can manage their own lesson questions" 
ON lesson_questions FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all lesson questions" 
ON lesson_questions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Students can view questions for enrolled courses" 
ON lesson_questions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.course_id = e.course_id
    JOIN lessons l ON l.module_id = m.id
    WHERE e.user_id = auth.uid() 
    AND l.id = lesson_questions.lesson_id
    AND e.status = 'active'
  )
);

-- QUESTION_ANSWERS POLICIES
CREATE POLICY "Users can create answers to questions" 
ON question_answers FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own answers" 
ON question_answers FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all question answers" 
ON question_answers FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Students can view answers for enrolled courses" 
ON question_answers FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.course_id = e.course_id
    JOIN lessons l ON l.module_id = m.id
    JOIN lesson_questions lq ON lq.lesson_id = l.id
    WHERE e.user_id = auth.uid() 
    AND lq.id = question_answers.question_id
    AND e.status = 'active'
  )
);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quiz_settings_updated_at BEFORE UPDATE ON quiz_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_questions_updated_at BEFORE UPDATE ON lesson_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_answers_updated_at BEFORE UPDATE ON question_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Quiz system database schema created successfully!' as result;
`;
      
      alert(`Please run this SQL in your Supabase SQL Editor:\n\n${sql.substring(0, 500)}...\n\n[SQL shown in console]`);
      console.log('COMPLETE SQL TO RUN IN SUPABASE:', sql);
      
    } catch (err) {
      console.error('Error showing SQL:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Connection Test</h1>
        
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Current User</h2>
          {user ? (
            <div className="text-sm">
              <p>ID: {user.id}</p>
              <p>Email: {user.email}</p>
            </div>
          ) : (
            <p className="text-red-600">Not authenticated</p>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
          <div className="space-x-4">
            <button
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
            >
              {loading ? 'Running Tests...' : 'Run Database Tests'}
            </button>
            
            <button
              onClick={createQuizTables}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
            >
              Show SQL to Create Tables
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500">No tests run yet</p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{result.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.success ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>
                  
                  {result.description && (
                    <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                  )}
                  
                  <p className="text-sm mb-2">
                    <strong>Message:</strong> {result.message}
                  </p>
                  
                  {result.error && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-red-600">Error Details</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.error, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  {result.data && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-green-600">Veri</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}