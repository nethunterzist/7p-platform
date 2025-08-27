/**
 * Next.js Middleware for Supabase Authentication
 * Handles automatic token refresh and session management
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Update user's auth session
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Temporarily disable middleware to debug 500 errors
     * Match nothing for now
     */
    '/this-path-will-never-match-anything',
  ],
};