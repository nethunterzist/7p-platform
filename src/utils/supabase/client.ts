/**
 * SUPABASE CLIENT - 7P Education  
 * Production-hardened Supabase client with enterprise security
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { getSupabaseAuthConfig, PRODUCTION_AUTH_CONFIG } from '@/lib/auth/production-config';

// Export types for compatibility
export type { User, Session, SupabaseClient };

let clientInstance: SupabaseClient | null = null;

// Client instance counter for concurrent session management
let instanceCounter = 0;

export function createClient(): SupabaseClient {
  // Return existing client if available
  if (clientInstance) {
    return clientInstance;
  }
  
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase] Creating client connection to:', supabaseUrl);
  }

  try {
    clientInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
      ...getSupabaseAuthConfig(),
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': '7p-education-frontend',
          'X-Client-Version': process.env.npm_package_version || '1.0.0'
        }
      }
    });
    
    // Set up enhanced auth state change handler
    clientInstance.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Supabase] Auth state changed:', event, session?.user?.email || 'no user');
      }
      
      // Handle session events
      switch (event) {
        case 'SIGNED_IN':
          if (session?.user && typeof window !== 'undefined') {
            // Track login event
            await trackAuthEvent('login', session.user.id, {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              ipAddress: await getClientIP()
            });
            
            // Start session timeout monitoring
            startSessionMonitoring(session);
          }
          break;
          
        case 'SIGNED_OUT':
          if (typeof window !== 'undefined') {
            // Clean up auth data
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_session_start');
            
            // Clear session monitoring
            clearSessionMonitoring();
          }
          break;
          
        case 'TOKEN_REFRESHED':
          if (session && typeof window !== 'undefined') {
            // Update session monitoring
            updateSessionMonitoring(session);
          }
          break;
      }
    });

    return clientInstance;
  } catch (error) {
    console.error('[Supabase] Failed to create client:', error);
    throw error;
  }
}

// Session monitoring functions (Edge-safe)
let sessionTimeout: number | null = null;
let activityTimeout: number | null = null;

function startSessionMonitoring(session: Session) {
  if (typeof window === 'undefined') return;
  
  // Clear existing timeouts
  clearSessionMonitoring();
  
  // Set session start time
  localStorage.setItem('auth_session_start', Date.now().toString());
  
  // Activity timeout (30 minutes of inactivity)
  const resetActivityTimer = () => {
    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout = window.setTimeout(() => {
      createClient().auth.signOut();
    }, PRODUCTION_AUTH_CONFIG.session.inactivityTimeout);
  };
  
  // Absolute session timeout (8 hours max)
  sessionTimeout = window.setTimeout(() => {
    createClient().auth.signOut();
  }, PRODUCTION_AUTH_CONFIG.session.absoluteTimeout);
  
  // Listen for user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetActivityTimer, true);
  });
  
  // Start activity timer
  resetActivityTimer();
}

function clearSessionMonitoring() {
  if (sessionTimeout) {
    window.clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  if (activityTimeout) {
    window.clearTimeout(activityTimeout);
    activityTimeout = null;
  }
}

function updateSessionMonitoring(session: Session) {
  // Refresh monitoring with new session
  startSessionMonitoring(session);
}

// Helper functions
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function trackAuthEvent(event: string, userId: string, metadata: any) {
  try {
    // Send to audit logging endpoint
    await fetch('/api/auth/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, userId, metadata })
    });
  } catch (error) {
    console.error('[Auth] Failed to track event:', error);
  }
}

// Default export for easier importing
export const supabase = createClient();