/**
 * ULTRA SIMPLIFIED AUTH CONTEXT
 * NO SERVER CONFIG DEPENDENCIES - CLIENT SAFE
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  AuthState, 
  SSOProvider, 
  AuthError 
} from '@/lib/types/auth';

interface SimpleAuthContext {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithSSO: (provider: SSOProvider) => Promise<void>;
}

const AuthContext = createContext<SimpleAuthContext | undefined>(undefined);

export function useAuth(): SimpleAuthContext {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser(profile);
        }
      } catch (error) {
        console.error('Session error:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new AuthError(authError.message, {
          code: authError.message.includes('Invalid') ? 'INVALID_CREDENTIALS' : 'SIGN_IN_FAILED'
        });
      }

      // User will be set by auth state change listener
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: any): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (authError) {
        throw new AuthError(authError.message, {
          code: 'SIGN_UP_FAILED'
        });
      }

      // User will be set by auth state change listener
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error: authError } = await supabase.auth.signOut();

      if (authError) {
        throw new AuthError(authError.message, {
          code: 'SIGN_OUT_FAILED'
        });
      }

      setUser(null);
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithSSO = async (provider: SSOProvider): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Get auth URL from server
      const response = await fetch(`/api/auth/sso/${provider.toLowerCase()}/auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          state: Math.random().toString(36).substring(7) 
        }),
      });

      if (!response.ok) {
        throw new AuthError('Failed to initiate SSO', {
          code: 'SSO_FAILED'
        });
      }

      const data = await response.json();
      if (!data.success) {
        throw new AuthError(data.error || 'Failed to initiate SSO', {
          code: 'SSO_FAILED'
        });
      }

      // Redirect to SSO provider
      window.location.href = data.authUrl;
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      setLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithSSO
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}