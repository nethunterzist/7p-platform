/**
 * FALLBACK AUTHENTICATION CONTEXT
 * Fallback auth context with localStorage support when Supabase is unavailable
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
    // Check localStorage for existing auth data
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('auth_user');
      
      if (authUser) {
        try {
          const userData = JSON.parse(authUser);
          
          // Create a mock user object
          const mockUser = {
            id: userData.id || '1',
            email: userData.email || 'admin@7peducation.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            role: userData.role || 'admin',
            user_metadata: {
              full_name: userData.name || 'Admin User',
              role: userData.role || 'admin'
            },
            app_metadata: {},
            aud: 'authenticated',
            phone: null,
            confirmation_sent_at: null,
            confirmed_at: new Date().toISOString(),
            recovery_sent_at: null
          } as User;
          
          const mockSession = {
            access_token: 'fallback-token',
            refresh_token: 'fallback-refresh',
            expires_in: 3600,
            expires_at: Date.now() + 3600 * 1000,
            token_type: 'bearer',
            user: mockUser
          } as Session;
          
          setUser(mockUser);
          setSession(mockSession);
        } catch (error) {
          console.warn('Failed to parse auth data from localStorage');
        }
      }
    }
    
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    // Check if it's admin credentials
    if (email === 'admin@7peducation.com' && password === 'admin123456') {
      const mockUser = {
        id: '1',
        email: 'admin@7peducation.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'admin',
        user_metadata: {
          full_name: 'Admin User',
          role: 'admin'
        },
        app_metadata: {},
        aud: 'authenticated',
        phone: null,
        confirmation_sent_at: null,
        confirmed_at: new Date().toISOString(),
        recovery_sent_at: null
      } as User;
      
      const mockSession = {
        access_token: 'fallback-token',
        refresh_token: 'fallback-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600 * 1000,
        token_type: 'bearer',
        user: mockUser
      } as Session;
      
      // Store in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_user', JSON.stringify({
          id: '1',
          email: 'admin@7peducation.com',
          name: 'Admin User',
          role: 'admin'
        }));
        localStorage.setItem('auth_token', 'fallback-token');
      }
      
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
      
      return { error: null };
    }
    
    setLoading(false);
    return { error: 'Invalid credentials' };
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(false);
    return { error: 'Sign up not available in fallback mode' };
  };

  const signOut = async () => {
    setLoading(true);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('supabase.auth.token');
    }
    
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    return { error: 'Password reset not available in fallback mode' };
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