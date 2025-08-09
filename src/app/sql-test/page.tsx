"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SQLTestPage() {
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM lesson_questions LIMIT 5;');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const predefinedQueries = [
    {
      name: "Test lesson_questions table",
      sql: "SELECT * FROM lesson_questions LIMIT 5;"
    },
    {
      name: "Count lesson_questions", 
      sql: "SELECT COUNT(*) FROM lesson_questions;"
    },
    {
      name: "Test profiles table",
      sql: "SELECT id, email, full_name, is_admin FROM profiles LIMIT 5;"
    },
    {
      name: "Test lessons table",
      sql: "SELECT id, title, type FROM lessons LIMIT 5;"
    },
    {
      name: "Check table structure - lesson_questions",
      sql: `SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'lesson_questions'
            ORDER BY ordinal_position;`
    },
    {
      name: "Check RLS policies",
      sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'lesson_questions';`
    },
    {
      name: "Test basic lesson_questions join",
      sql: `SELECT lq.*, p.email 
            FROM lesson_questions lq 
            LEFT JOIN profiles p ON p.id = lq.user_id 
            LIMIT 3;`
    }
  ];

  const executeQuery = async () => {
    try {
      setLoading(true);
      setError('');
      setResults(null);

      console.log('🔍 Executing SQL:', sqlQuery);

      // Use the rpc function to execute raw SQL (if available)
      const { data, error } = await supabase.rpc('execute_sql', { 
        query: sqlQuery 
      }).catch(async () => {
        // Fallback: try to parse and execute as Supabase query
        console.log('RPC not available, trying Supabase query...');
        
        if (sqlQuery.toLowerCase().includes('select * from lesson_questions')) {
          return await supabase.from('lesson_questions').select('*').limit(5);
        } else if (sqlQuery.toLowerCase().includes('count(*) from lesson_questions')) {
          return await supabase.from('lesson_questions').select('*', { count: 'exact', head: true });
        } else if (sqlQuery.toLowerCase().includes('select * from profiles')) {
          return await supabase.from('profiles').select('id, email, full_name, is_admin').limit(5);
        } else if (sqlQuery.toLowerCase().includes('select * from lessons')) {
          return await supabase.from('lessons').select('id, title, type').limit(5);
        } else {
          throw new Error('Query not supported in fallback mode');
        }
      });

      if (error) {
        console.error('❌ SQL Error:', error);
        setError(`SQL Error: ${error.message || JSON.stringify(error)}`);
        return;
      }

      console.log('✅ SQL Success:', data);
      setResults(data);

    } catch (err: any) {
      console.error('❌ Execution Error:', err);
      setError(`Execution Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseQueries = async () => {
    const tests = [
      {
        name: "Basic lesson_questions access",
        test: async () => {
          const { data, error } = await supabase
            .from('lesson_questions')
            .select('*')
            .limit(3);
          return { data, error };
        }
      },
      {
        name: "lesson_questions with profiles join",
        test: async () => {
          const { data, error } = await supabase
            .from('lesson_questions')
            .select(`
              *,
              profiles:user_id (
                full_name,
                email
              )
            `)
            .limit(3);
          return { data, error };
        }
      },
      {
        name: "lesson_questions with lessons join",
        test: async () => {
          const { data, error } = await supabase
            .from('lesson_questions')
            .select(`
              *,
              lessons (
                title
              )
            `)
            .limit(3);
          return { data, error };
        }
      }
    ];

    const testResults = [];
    
    for (const test of tests) {
      try {
        console.log(`🔍 Running test: ${test.name}`);
        const result = await test.test();
        testResults.push({
          name: test.name,
          success: !result.error,
          data: result.data,
          error: result.error
        });
        console.log(`${result.error ? '❌' : '✅'} ${test.name}:`, result);
      } catch (err) {
        testResults.push({
          name: test.name,
          success: false,
          error: err
        });
        console.error(`❌ ${test.name} failed:`, err);
      }
    }

    setResults(testResults);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SQL Query Tester</h1>
        
        {/* Predefined Queries */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Predefined Queries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {predefinedQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => setSqlQuery(query.sql)}
                className="text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm">{query.name}</div>
                <div className="text-xs text-gray-500 mt-1 truncate">{query.sql}</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={testSupabaseQueries}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            Run Supabase Query Tests
          </button>
        </div>

        {/* Query Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Custom SQL Query</h2>
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter your SQL query here..."
          />
          <div className="mt-4">
            <button
              onClick={executeQuery}
              disabled={loading || !sqlQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md mr-4"
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <pre className="text-sm text-red-700 overflow-auto">{error}</pre>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Sonuçlar</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}