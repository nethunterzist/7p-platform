/**
 * MOCK SERVER CLIENT - 7P Education
 * Server-side mock replacement for Supabase
 */

import { cookies } from 'next/headers';
import { mockApi } from '@/lib/mock-api';

export function createClient() {
  // Return mock client for server-side usage
  return mockApi;
}

// Compatibility export
export const createServerClient = createClient;