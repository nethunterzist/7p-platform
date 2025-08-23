/**
 * SIMPLE AUTHENTICATION CONTEXT
 * Simplified auth context using real Supabase
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseAuth } from './supabase-auth';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabaseAuth.getSession().then(({ user, session, error }) => {
      if (error) {
        console.error('Session error:', error);
      }
      setUser(user);
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseAuth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user || null);
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await supabaseAuth.signIn({ email, password });
    setLoading(false);
    
    if (result.error) {
      return { error: result.error };
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    const result = await supabaseAuth.signUp({ email, password, userData });
    setLoading(false);
    
    if (result.error) {
      return { error: result.error };
    }
    
    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabaseAuth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    return await supabaseAuth.resetPassword(email);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export alias for compatibility
export const AuthProvider = SimpleAuthProvider;