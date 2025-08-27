/**
 * Client-side Authentication Utilities
 * Simple, reliable auth helpers for Next.js client components
 */

import { createSafeClient } from '@/utils/supabase/client';

const supabase = createSafeClient();
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

/**
 * Get current session with error handling
 */
export async function getCurrentSession(): Promise<{
  session: Session | null;
  user: AuthUser | null;
  error: string | null;
}> {
  try {
    if (!supabase) {
      return { session: null, user: null, error: 'Authentication service unavailable' };
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { session: null, user: null, error: error.message };
    }
    
    if (!session?.user) {
      return { session: null, user: null, error: null };
    }
    
    // Convert to our AuthUser format
    const user: AuthUser = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.role?.name || session.user.role?.full_name,
      avatar_url: session.user.role?.avatar_url
    };
    
    return { session, user, error: null };
  } catch (error) {
    return { 
      session: null, 
      user: null, 
      error: error instanceof Error ? error.message : 'Authentication error'
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<{
  user: AuthUser | null;
  session: Session | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { user: null, session: null, error: error.message };
    }
    
    if (!data.user || !data.session) {
      return { user: null, session: null, error: 'Login failed' };
    }
    
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.role?.name || data.user.role?.full_name,
      avatar_url: data.user.role?.avatar_url
    };
    
    return { user, session: data.session, error: null };
  } catch (error) {
    return { 
      user: null, 
      session: null, 
      error: error instanceof Error ? error.message : 'Login error'
    };
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    // Clean up local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
    }
    
    return { error: error?.message || null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sign out error' };
  }
}

/**
 * Check if user is authenticated (simple boolean check)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!(session?.user);
  } catch {
    return false;
  }
}

/**
 * Auth state change listener
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}