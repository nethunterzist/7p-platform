/**
 * SUPABASE SERVER CLIENT - 7P Education
 * Server-side Supabase client for API routes and server components
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }

  const cookieStore = cookies();

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Server doesn't need to persist sessions
      autoRefreshToken: false, // Server doesn't need to refresh tokens
      detectSessionInUrl: false // Server doesn't need to detect session in URL
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

// Service role client for admin operations
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing Supabase service role key. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

// Compatibility exports
export const createServerClient = createClient;