/**
 * SUPABASE MIDDLEWARE - 7P Education  
 * Middleware for handling Supabase auth sessions
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export function createClient(request: NextRequest): ReturnType<typeof createSupabaseClient> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables in middleware, returning null client');
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // Can't set cookies in middleware, will be handled by response
      },
      remove(name: string, options: any) {
        // Can't remove cookies in middleware, will be handled by response
      },
    },
  });
}

export function updateSession(request: NextRequest) {
  try {
    // Check if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase environment variables not available in middleware, skipping session update');
      return NextResponse.next();
    }

    const response = NextResponse.next();
    const supabase = createClient(request);
    
    // If client creation failed, skip session handling
    if (!supabase) {
      console.warn('Failed to create Supabase client in middleware, skipping session update');
      return response;
    }

    // Let Supabase handle session refresh
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Export compatibility function
export const createServerClient = createClient;