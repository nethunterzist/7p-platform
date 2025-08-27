/**
 * UNIFIED AUTHENTICATION SYSTEM - Production Ready
 * Replaces simple-auth.ts, useAdmin.ts and consolidates with Supabase Auth
 */

import { createSafeClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface UnifiedUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin' | 'instructor';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
  avatar_url?: string;
  email_verified: boolean;
}

export interface AuthState {
  user: UnifiedUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isInstructor: boolean;
  isAuthenticated: boolean;
}

class UnifiedAuthService {
  private supabase = createSafeClient();
  private listeners: Array<(state: AuthState) => void> = [];
  private currentState: AuthState = {
    user: null,
    session: null,
    loading: true,
    error: null,
    isAdmin: false,
    isInstructor: false,
    isAuthenticated: false
  };

  constructor() {
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION & STATE MANAGEMENT
  // ============================================================================

  private async initialize() {
    try {
      if (!this.supabase) {
        this.updateState({ 
          loading: false, 
          error: 'Authentication service unavailable',
          isAuthenticated: false,
          isAdmin: false,
          isInstructor: false
        });
        return;
      }

      // Get initial session
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;

      await this.updateAuthState(session);

      // Listen to auth changes
      if (this.supabase) {
        this.supabase.auth.onAuthStateChange(async (event, session) => {
        await this.updateAuthState(session);
        
        // Handle specific events
        switch (event) {
          case 'SIGNED_IN':
            this.handleSignIn(session);
            break;
          case 'SIGNED_OUT':
            this.handleSignOut();
            break;
        }
      });
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateState({ error: error instanceof Error ? error.message : 'Authentication error' });
    }
  }

  private async updateAuthState(session: Session | null) {
    this.updateState({ loading: true, error: null });

    try {
      let user: UnifiedUser | null = null;
      
      if (session?.user) {
        // Fetch user profile from database
        const { data: profile, error } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        // Create unified user object
        user = {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.user_metadata?.full_name || 'User',
          role: profile?.role || 'student',
          created_at: session.user.created_at,
          updated_at: profile?.updated_at || session.user.updated_at || new Date().toISOString(),
          last_login_at: profile?.last_login_at,
          is_active: profile?.is_active ?? true,
          avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
          email_verified: session.user.email_confirmed_at ? true : false
        };

        // Update last login time
        if (profile) {
          await this.supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', session.user.id);
        }
      }

      const newState: AuthState = {
        user,
        session,
        loading: false,
        error: null,
        isAdmin: user?.role === 'admin',
        isInstructor: user?.role === 'instructor',
        isAuthenticated: !!user
      };

      this.updateState(newState);
      
    } catch (error) {
      console.error('Error updating auth state:', error);
      this.updateState({ 
        user: null,
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication error',
        isAdmin: false,
        isInstructor: false,
        isAuthenticated: false
      });
    }
  }

  private updateState(partialState: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...partialState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  private handleSignIn(session: Session | null) {
    if (session?.user && typeof window !== 'undefined') {
      console.log('User signed in:', session.user.email);
      
      // Clean up any old localStorage auth data
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-token');
    }
  }

  private handleSignOut() {
    if (typeof window !== 'undefined') {
      // Clean up any localStorage auth data
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-token');
      localStorage.removeItem('supabase.auth.token');
      
      console.log('User signed out');
    }
  }

  // ============================================================================
  // PUBLIC AUTH METHODS
  // ============================================================================

  async signUp(email: string, password: string, metadata?: { name?: string }) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.name || ''
          }
        }
      });

      if (error) throw error;

      // Create profile record
      if (data.user) {
        const { error: profileError } = await this.supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            name: metadata?.name || '',
            role: 'student',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error instanceof Error ? error.message : 'Sign out failed' };
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error instanceof Error ? error.message : 'Reset password failed' };
    }
  }

  // ============================================================================
  // GETTERS & UTILITIES
  // ============================================================================

  getState(): AuthState {
    return this.currentState;
  }

  getCurrentUser(): UnifiedUser | null {
    return this.currentState.user;
  }

  getCurrentSession(): Session | null {
    return this.currentState.session;
  }

  isAuthenticated(): boolean {
    return this.currentState.isAuthenticated;
  }

  isAdmin(): boolean {
    return this.currentState.isAdmin;
  }

  isInstructor(): boolean {
    return this.currentState.isInstructor;
  }

  isLoading(): boolean {
    return this.currentState.loading;
  }

  getError(): string | null {
    return this.currentState.error;
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current state
    listener(this.currentState);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ============================================================================
  // ADMIN HELPERS (Replacing useAdmin.ts functionality)
  // ============================================================================

  async checkAdminAccess(): Promise<{ isAdmin: boolean; user: UnifiedUser | null; error: string | null }> {
    const state = this.getState();
    
    if (state.loading) {
      return { isAdmin: false, user: null, error: 'Loading...' };
    }

    if (!state.isAuthenticated) {
      return { isAdmin: false, user: null, error: 'Not authenticated' };
    }

    return { 
      isAdmin: state.isAdmin, 
      user: state.user, 
      error: null 
    };
  }

  // ============================================================================
  // MIGRATION HELPERS (For backward compatibility)
  // ============================================================================

  // Backward compatibility with simple-auth.ts
  async login(email: string, password: string) {
    const result = await this.signIn(email, password);
    if (result.data?.user && result.data?.session) {
      return { user: this.getCurrentUser(), error: null };
    }
    return { user: null, error: result.error || 'Login failed' };
  }

  async logout() {
    return await this.signOut();
  }

  // Helper for components still using old pattern
  getCurrentUserSync(): UnifiedUser | null {
    return this.getCurrentUser();
  }
}

// Export singleton instance
export const unifiedAuth = new UnifiedAuthService();

// Export React hook for easy component integration
export function useUnifiedAuth() {
  const [state, setState] = React.useState<AuthState>(unifiedAuth.getState());

  React.useEffect(() => {
    const unsubscribe = unifiedAuth.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    signIn: unifiedAuth.signIn.bind(unifiedAuth),
    signOut: unifiedAuth.signOut.bind(unifiedAuth),
    signUp: unifiedAuth.signUp.bind(unifiedAuth),
    resetPassword: unifiedAuth.resetPassword.bind(unifiedAuth)
  };
}

// React import for the hook
import React from 'react';

// Default export
export default unifiedAuth;