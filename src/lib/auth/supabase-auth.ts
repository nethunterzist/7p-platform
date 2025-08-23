/**
 * SUPABASE AUTHENTICATION HELPERS
 * Simple helpers for Supabase authentication operations
 */

import { createClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  userData?: {
    name?: string;
    role?: string;
  };
}

export interface SignInData {
  email: string;
  password: string;
}

class SupabaseAuth {
  private supabase = createClient();

  // Sign up with email and password
  async signUp({ email, password, userData }: SignUpData): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {}
        }
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: error.message
        };
      }

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Sign up failed'
      };
    }
  }

  // Sign in with email and password
  async signIn({ email, password }: SignInData): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: error.message
        };
      }

      if (!data || !data.user) {
        return {
          user: null,
          session: null,
          error: 'Login failed: User not found or email not verified.'
        };
      }

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }

  // Get current session
  async getSession(): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        return {
          user: null,
          session: null,
          error: error.message
        };
      }

      return {
        user: data.session?.user || null,
        session: data.session,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Get session failed'
      };
    }
  }

  // Get current user
  async getUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        return {
          user: null,
          error: error.message
        };
      }

      return {
        user: data.user,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Get user failed'
      };
    }
  }

  // Password reset
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      return { error: error?.message || null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Password reset failed'
      };
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      return { error: error?.message || null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Password update failed'
      };
    }
  }

  // Sign in with OAuth provider
  async signInWithOAuth(provider: 'google' | 'github' | 'discord'): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      return { error: error?.message || null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'OAuth sign in failed'
      };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
}

// Export singleton instance
export const supabaseAuth = new SupabaseAuth();

// Export for direct use
export { supabaseAuth as auth };