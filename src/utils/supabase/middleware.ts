/**
 * MOCK MIDDLEWARE - 7P Education  
 * Placeholder for Supabase middleware functionality
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock implementation for middleware compatibility
export function updateSession(request: NextRequest) {
  // Mock session update - always passes through
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

// Export compatibility function
export const createServerClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null })
    }
  };
};