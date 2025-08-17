/**
 * useAuth Hook
 * Consistent auth state management for React components
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentSession, onAuthStateChange } from '@/lib/auth/client-auth';
import type { AuthUser, AuthState } from '@/lib/auth/client-auth';

export function useAuth(requireAuth: boolean = false) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const { session, user, error } = await getCurrentSession();
      
      setAuthState({
        user,
        session,
        loading: false,
        error
      });

      // Redirect to login if auth is required and user is not authenticated
      if (requireAuth && (!session || !user)) {
        router.replace('/login');
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          error: null
        });
        
        if (requireAuth) {
          router.replace('/login');
        }
      } else if (event === 'SIGNED_IN' && session) {
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.role?.name || session.user.role?.full_name,
          avatar_url: session.user.role?.avatar_url
        };
        
        setAuthState({
          user,
          session,
          loading: false,
          error: null
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [requireAuth, router]);

  return authState;
}

/**
 * Hook specifically for protected routes
 */
export function useRequireAuth() {
  return useAuth(true);
}

/**
 * Hook for optional auth (won't redirect)
 */
export function useOptionalAuth() {
  return useAuth(false);
}