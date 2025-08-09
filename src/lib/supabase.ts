/**
 * Legacy Supabase client export for backward compatibility
 * NOTE: This uses the new SSR-compatible client internally
 * New code should import from @/utils/supabase/client instead
 */

import { createClient as createBrowserClient } from '@/utils/supabase/client';

// Create a browser client instance for backward compatibility
export const supabase = createBrowserClient();