/**
 * SUPABASE SERVER CLIENT - 7P Education
 * Server-side Supabase client for API routes and server components
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function createClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }

  // Import cookies dynamically to avoid build issues
  let cookieStore;
  try {
    const { cookies } = await import('next/headers');
    cookieStore = cookies();
  } catch {
    // Fallback for non-server environments
    cookieStore = null;
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Server doesn't need to persist sessions
      autoRefreshToken: false, // Server doesn't need to refresh tokens
      detectSessionInUrl: false // Server doesn't need to detect session in URL
    },
    cookies: cookieStore ? {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    } : undefined,
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