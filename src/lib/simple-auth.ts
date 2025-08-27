/**
 * SECURE AUTHENTICATION SYSTEM
 * NextAuth-based authentication replacing localStorage fallbacks
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
}

// Client-side authentication check (no localStorage)
export const getCurrentUser = (): User | null => {
  // For client-side, this should use NextAuth session
  // Components should use useSession from next-auth/react instead
  console.warn('getCurrentUser is deprecated. Use useSession from next-auth/react');
  return null;
};

// Server-side authentication check
export const getServerUser = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || 'User',
        role: (session.user as any).role || 'student'
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const login = async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
  console.warn('login function is deprecated. Use NextAuth signIn instead');
  return { error: 'Please use NextAuth authentication system' };
};

export const logout = async () => {
  console.warn('logout function is deprecated. Use NextAuth signOut instead');
};

export const isAuthenticated = (): boolean => {
  console.warn('isAuthenticated is deprecated. Use useSession from next-auth/react');
  return false;
};