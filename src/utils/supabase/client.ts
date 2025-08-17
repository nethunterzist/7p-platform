/**
 * SIMPLE MOCK CLIENT - 7P Education
 * Simple mock replacement for Supabase browser client
 * Uses straightforward Promise-based API without complex chaining
 */

import { simpleMockClient } from '@/lib/simple-supabase-mock';
import type { MockUser as User, MockSession as Session } from '@/lib/simple-supabase-mock';

// Export types for compatibility
export type { User, Session };
export type SupabaseClient = typeof simpleMockClient;

let clientInstance: typeof simpleMockClient | null = null;

export function createClient() {
  // Return existing client if available
  if (clientInstance) {
    return clientInstance;
  }
  
  // No environment variables needed for simple mock client
  if (process.env.NODE_ENV === 'development') {
    console.log('[SimpleMock] Creating simple mock client - no backend required!');
  }

  try {
    clientInstance = simpleMockClient;
    
    // Set up mock auth state change handler
    clientInstance.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SimpleMock] Auth state changed:', event, session?.user?.email || 'no user');
      }
      
      // Clean up on sign out
      if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    });

    return clientInstance;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SimpleMock] Failed to create simple mock client:', error);
    }
    throw error;
  }
}

// Default export for easier importing
export const supabase = createClient();