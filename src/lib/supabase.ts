/**
 * REAL SUPABASE CLIENT - 7P Education
 * Production-ready Supabase client with full functionality
 * Replaced mock system with real database connection
 */

import { createClient } from '@/utils/supabase/client';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

// Export real Supabase client
export const supabase = createClient();

// Re-export types for compatibility
export type { User, Session, SupabaseClient };