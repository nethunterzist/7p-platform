/**
 * SIMPLE MOCK SUPABASE CLIENT - 7P Education
 * Drop-in replacement for Supabase client using simple mock system
 * Provides basic functionality without complex chaining
 */

import { simpleMockClient } from './simple-supabase-mock';

// Export simple mock client as drop-in replacement
export const supabase = simpleMockClient;

// Re-export types for compatibility
export type { MockUser as User, MockSession as Session } from './simple-supabase-mock';