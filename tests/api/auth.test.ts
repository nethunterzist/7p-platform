/**
 * Authentication API Integration Tests
 * Tests the complete auth flow with real Supabase integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@/utils/supabase/client';
import { signInWithEmail } from '@/lib/auth/client-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Authentication API', () => {
  let supabase: SupabaseClient;
  const testUser = {
    email: `test-${Date.now()}@7peducation.test`,
    password: 'Test123!@#',
    full_name: 'Test User'
  };

  beforeAll(async () => {
    supabase = createClient();
  });

  afterAll(async () => {
    // Clean up test user if exists
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Ensure clean state
    await supabase.auth.signOut();
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            full_name: testUser.full_name
          }
        }
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testUser.email);
      expect(data.user?.user_metadata.full_name).toBe(testUser.full_name);
    });

    it('should reject registration with weak password', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: `weak-${Date.now()}@test.com`,
        password: '123', // Too weak
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });

    it('should reject registration with invalid email', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'invalid-email',
        password: testUser.password,
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });

  describe('User Sign In', () => {
    beforeEach(async () => {
      // Create test user for sign-in tests
      await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            full_name: testUser.full_name
          }
        }
      });
      await supabase.auth.signOut();
    });

    it('should successfully sign in with valid credentials', async () => {
      const result = await signInWithEmail(testUser.email, testUser.password);

      expect(result.error).toBeNull();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.user?.email).toBe(testUser.email);
    });

    it('should reject sign in with invalid password', async () => {
      const result = await signInWithEmail(testUser.email, 'wrongpassword');

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });

    it('should reject sign in with non-existent email', async () => {
      const result = await signInWithEmail('nonexistent@test.com', testUser.password);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Sign in for session tests
      await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
      });
    });

    it('should retrieve current session', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(session).toBeDefined();
      expect(session?.user.email).toBe(testUser.email);
    });

    it('should successfully sign out', async () => {
      const { error } = await supabase.auth.signOut();

      expect(error).toBeNull();

      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });

    it('should handle token refresh', async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      expect(initialSession).toBeDefined();

      // Force token refresh
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession({
        refresh_token: initialSession!.refresh_token
      });

      expect(error).toBeNull();
      expect(refreshedSession).toBeDefined();
      expect(refreshedSession?.access_token).toBeDefined();
      expect(refreshedSession?.access_token).not.toBe(initialSession?.access_token);
    });
  });

  describe('User Profile Integration', () => {
    let userId: string;

    beforeEach(async () => {
      const { data } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            full_name: testUser.full_name
          }
        }
      });
      userId = data.user!.id;
    });

    it('should automatically create user profile on registration', async () => {
      // Wait a bit for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile.email).toBe(testUser.email);
      expect(profile.full_name).toBe(testUser.full_name);
      expect(profile.role).toBe('student'); // Default role
    });

    it('should enforce RLS policies for user profiles', async () => {
      // Try to access another user's profile (should fail)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('user_id', userId);

      // Should return empty result due to RLS, not error
      expect(profiles).toEqual([]);
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
      });
      await supabase.auth.signOut();
    });

    it('should send password reset email', async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(
        testUser.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`
        }
      );

      expect(error).toBeNull();
    });

    it('should handle invalid email for password reset', async () => {
      const { error } = await supabase.auth.resetPasswordForEmail('nonexistent@test.com');

      // Supabase returns success even for non-existent emails for security
      expect(error).toBeNull();
    });
  });

  describe('Email Verification', () => {
    it('should handle email confirmation', async () => {
      // This would typically be tested with a mock email service
      // For now, we'll just test the API doesn't crash
      const { data, error } = await supabase.auth.signUp({
        email: `verify-${Date.now()}@test.com`,
        password: testUser.password,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
    });
  });

  describe('Auth State Changes', () => {
    it('should trigger auth state change listeners', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Auth state change timeout'));
        }, 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            expect(session.user.email).toBe(testUser.email);
            resolve();
          }
        });

        // Trigger sign in
        supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password,
        });
      });
    });
  });
});