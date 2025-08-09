/**
 * Authentication Context Provider
 * Enterprise SSO and MFA Integration
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  AuthContext as IAuthContext,
  User, 
  Session, 
  Organization, 
  SSOProvider, 
  AuthMethod,
  AuthError 
} from '@/lib/types/auth';
import { clientGoogleSSO, clientMicrosoftSSO } from '@/lib/auth/providers/client-safe';
import { clientMFAService } from '@/lib/auth/mfa-client';
// Security service removed from client-side to prevent JWT secret exposure
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config-client';
import { 
  retryCriticalAuthOperation, 
  retryAuthOperation, 
  retryOptionalOperation,
  networkMonitor,
  NetworkStatus,
  isRetryableNetworkError,
  getNetworkStatus
} from '@/lib/auth/network-utils';

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function useAuth(): IAuthContext {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ online: true });
  const router = useRouter();

  // Create Supabase client for browser-side operations
  const supabase = createClient();

  /**
   * Initialize authentication
   */
  useEffect(() => {
    initializeAuth();
    
    // Monitor network status changes
    const unsubscribeNetwork = networkMonitor.subscribe((status) => {
      setNetworkStatus(status);
      console.log('Network status changed:', status);
    });
    
    return () => {
      unsubscribeNetwork();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Get initial session with retry logic
      const { data: { session: initialSession } } = await retryCriticalAuthOperation(
        () => supabase.auth.getSession(),
        'get_initial_session'
      );
      
      if (initialSession) {
        await handleSessionChange(initialSession);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state change:', event, session?.user?.email);
          
          try {
            switch (event) {
              case 'SIGNED_IN':
                await handleSessionChange(session);
                break;
              case 'SIGNED_OUT':
                await handleSignOut();
                break;
              case 'TOKEN_REFRESHED':
                await handleSessionChange(session);
                break;
              default:
                break;
            }
          } catch (error) {
            console.error(`Auth state change error for event ${event}:`, error);
            
            // Queue operation if offline
            if (!networkStatus.online) {
              console.warn(`Auth state change failed while offline: ${event}. Will retry when connection restored.`);
            } else {
              setError(`Failed to handle auth state change: ${event}`);
            }
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Auth initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize authentication';
      
      // Check if it's a network error and queue retry
      if (!networkStatus.online) {
        setError('You appear to be offline. Authentication will retry when connection is restored.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle session changes
   */
  const handleSessionChange = async (newSession: any) => {
    try {
      if (!newSession) {
        setUser(null);
        setSession(null);
        setOrganization(null);
        return;
      }

      // Get user profile with retry logic, create if doesn't exist
      let userData = null;
      const { data: existingUser, error: userError } = await retryAuthOperation(
        () => supabase
          .from('users')
          .select('*')
          .eq('id', newSession.user.id)
          .single(),
        'fetch_user_profile'
      );

      if (userError) {
        // If user doesn't exist in custom table, create them
        if (userError.code === 'PGRST116' || userError.message?.includes('No rows found')) {
          console.log('Creating new user profile for:', newSession.user.email);
          
          // Extract user info from session
          const userEmail = newSession.user.email;
          const userName = newSession.user.user_metadata?.name || 
                          newSession.user.user_metadata?.full_name || 
                          userEmail.split('@')[0];
          const avatarUrl = newSession.user.user_metadata?.avatar_url;
          
          // Try to create user profile
          const { data: newUser, error: createError } = await retryAuthOperation(
            () => supabase
              .from('users')
              .insert({
                id: newSession.user.id,
                email: userEmail,
                name: userName,
                avatar_url: avatarUrl,
                email_verified: newSession.user.email_confirmed_at !== null,
                created_at: newSession.user.created_at,
                updated_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                metadata: newSession.user.user_metadata || {}
              })
              .select()
              .single(),
            'create_user_profile'
          );
          
          if (createError) {
            console.error('Failed to create user profile:', createError);
            // Continue with basic user data from session instead of failing
            userData = {
              id: newSession.user.id,
              email: userEmail,
              name: userName,
              avatar_url: avatarUrl,
              role: 'student',
              organization_id: null,
              email_verified: newSession.user.email_confirmed_at !== null,
              created_at: newSession.user.created_at,
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              metadata: newSession.user.user_metadata || {}
            };
            console.log('Using fallback user data for session');
          } else {
            userData = newUser;
            console.log('Successfully created user profile');
          }
        } else {
          console.error('User profile fetch error:', userError);
          // Continue with fallback data instead of throwing
          userData = {
            id: newSession.user.id,
            email: newSession.user.email,
            name: newSession.user.user_metadata?.name || newSession.user.email.split('@')[0],
            avatar_url: newSession.user.user_metadata?.avatar_url,
            role: 'student',
            organization_id: null,
            email_verified: newSession.user.email_confirmed_at !== null,
            created_at: newSession.user.created_at,
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            metadata: newSession.user.user_metadata || {}
          };
          console.warn('Using fallback user data due to profile fetch error');
        }
      } else {
        userData = existingUser;
      }

      // Get organization if user has one (with retry)
      let orgData = null;
      if (userData.organization_id) {
        try {
          const { data, error: orgError } = await retryAuthOperation(
            () => supabase
              .from('organizations')
              .select('*')
              .eq('id', userData.organization_id)
              .single(),
            'fetch_organization'
          );

          if (!orgError) {
            orgData = data;
          }
        } catch (orgError) {
          console.warn('Organization fetch failed, continuing without org data:', orgError);
          // Continue without organization data rather than failing entirely
        }
      }

      // Update last login with retry
      try {
        await retryAuthOperation(
          () => supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', newSession.user.id),
          'update_last_login'
        );
      } catch (updateError) {
        console.warn('Failed to update last login timestamp:', updateError);
        // Don't fail the entire session for this non-critical operation
      }

      setUser(userData);
      setSession(newSession);
      setOrganization(orgData);
      setError(null);

      // Log successful session (with retry but don't fail if it fails)
      try {
        await retryAuthOperation(
          () => auditLogger.logAuth(
            AUDIT_EVENTS.LOGIN_SUCCESS,
            newSession.user.id,
            { 
              method: userData.sso_provider || 'email_password',
              ip_address: 'client' // Would be filled by middleware
            }
          ),
          'log_login_success'
        );
      } catch (auditError) {
        console.warn('Failed to log authentication success:', auditError);
        // Don't fail the session for audit logging issues
      }

    } catch (error) {
      console.error('Session handling error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Session handling failed';
      
      // Check if offline and queue the operation
      if (!networkStatus.online) {
        setError('You appear to be offline. Session will be handled when connection is restored.');
      } else {
        setError(errorMessage);
      }
    }
  };

  /**
   * Handle sign out
   */
  const handleSignOut = async () => {
    const currentUserId = user?.id;
    
    setUser(null);
    setSession(null);
    setOrganization(null);
    setError(null);

    if (currentUserId) {
      await auditLogger.logAuth(
        AUDIT_EVENTS.LOGOUT,
        currentUserId,
        { manual: true }
      );
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Validate inputs
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AuthError('Invalid email format', { code: 'INVALID_EMAIL' });
      }

      // Check if account is locked (with retry)
      const isLocked = await retryAuthOperation(
        () => securityService.isAccountLocked(email),
        'check_account_locked'
      );
      
      if (isLocked) {
        throw new AuthError('Account is temporarily locked due to too many failed attempts', {
          code: 'ACCOUNT_LOCKED'
        });
      }

      // Rate limiting check (with retry)
      const rateLimitKey = `login:${email}`;
      const rateLimitStatus = await retryAuthOperation(
        () => securityService.checkRateLimit(
          rateLimitKey,
          { window_ms: 15 * 60 * 1000, max_requests: 5 } // 5 attempts per 15 minutes
        ),
        'check_rate_limit'
      );

      if (!rateLimitStatus.allowed) {
        throw new AuthError('Too many login attempts. Please try again later.', {
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: rateLimitStatus.retry_after
        });
      }

      // Attempt sign in (with retry for transient failures)
      const { data, error } = await retryAuthOperation(
        () => supabase.auth.signInWithPassword({
          email,
          password,
        }),
        'sign_in_with_password'
      );

      if (error) {
        // Track failed attempt
        await securityService.trackLoginAttempt(
          email,
          false,
          'client', // Would be real IP in server context
          navigator.userAgent,
          error.message
        );

        throw new AuthError(error.message, {
          code: 'SIGNIN_FAILED',
          details: error
        });
      }

      // Check if MFA is required
      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('mfa_enabled')
          .eq('id', data.user.id)
          .single();

        if (userData?.mfa_enabled) {
          // Redirect to MFA verification
          router.push('/auth/mfa-verify');
          return;
        }
      }

      // Track successful attempt
      await securityService.trackLoginAttempt(
        email,
        true,
        'client',
        navigator.userAgent
      );

    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with SSO provider
   */
  const signInWithSSO = async (provider: SSOProvider, options?: any): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      switch (provider) {
        case SSOProvider.GOOGLE:
          await handleGoogleSSO(options);
          break;
        case SSOProvider.MICROSOFT:
          await handleMicrosoftSSO(options);
          break;
        default:
          throw new AuthError('Unsupported SSO provider', {
            code: 'UNSUPPORTED_SSO_PROVIDER'
          });
      }
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google SSO
   */
  const handleGoogleSSO = async (options?: any) => {
    const state = Math.random().toString(36).substring(7);
    const authUrl = await clientGoogleSSO.getAuthorizationUrl(state, options?.hostedDomain);
    
    // Store state for verification
    sessionStorage.setItem('google_oauth_state', state);
    
    // Redirect to Google OAuth
    window.location.href = authUrl;
  };

  /**
   * Handle Microsoft SSO
   */
  const handleMicrosoftSSO = async (options?: any) => {
    const state = Math.random().toString(36).substring(7);
    const authUrl = await clientMicrosoftSSO.getAuthorizationUrl(state);
    
    // Store state for verification
    sessionStorage.setItem('microsoft_oauth_state', state);
    
    // Redirect to Microsoft OAuth
    window.location.href = authUrl;
  };

  /**
   * Sign out
   */
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }

      // Sign out from SSO providers if applicable
      if (user?.sso_provider === SSOProvider.MICROSOFT) {
        const activeAccount = microsoftSSO.getActiveAccount();
        if (activeAccount) {
          await microsoftSSO.logout(activeAccount);
        }
      }

      // Clear local storage
      sessionStorage.removeItem('google_oauth_state');
      
      // Redirect to home
      router.push('/');
      
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh session
   */
  const refreshSession = async (): Promise<void> => {
    try {
      const { data, error } = await retryCriticalAuthOperation(
        () => supabase.auth.refreshSession(),
        'refresh_session'
      );
      
      if (error) {
        throw new AuthError('Failed to refresh session', {
          code: 'SESSION_REFRESH_FAILED',
          details: error
        });
      }

      if (data.session) {
        await handleSessionChange(data.session);
      } else {
        // If no session returned, user might need to re-authenticate
        console.warn('No session returned from refresh, user may need to sign in again');
        setUser(null);
        setSession(null);
        setOrganization(null);
        setError('Session expired. Please sign in again.');
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      
      // Handle offline scenario
      if (!networkStatus.online) {
        setError('You appear to be offline. Session refresh will retry when connection is restored.');
      } else {
        // Session refresh failed, user needs to re-authenticate
        setUser(null);
        setSession(null);
        setOrganization(null);
        setError('Session expired. Please sign in again.');
      }
      
      throw error;
    }
  };

  /**
   * Enable MFA
   */
  const enableMFA = async (secret: string, token: string): Promise<void> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      setLoading(true);
      const success = await clientMFAService.verifyAndActivateTOTP(user.id, token, secret);
      
      if (!success) {
        throw new AuthError('Invalid MFA token', { code: 'INVALID_MFA_TOKEN' });
      }

      // Update user state
      setUser({ ...user, mfa_enabled: true });
      
    } catch (error) {
      console.error('MFA enable error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disable MFA
   */
  const disableMFA = async (password: string, token: string): Promise<void> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      setLoading(true);
      const success = await clientMFAService.disableMFA(user.id, password, token);
      
      if (!success) {
        throw new AuthError('Failed to disable MFA', { code: 'MFA_DISABLE_FAILED' });
      }

      // Update user state
      setUser({ ...user, mfa_enabled: false });
      
    } catch (error) {
      console.error('MFA disable error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify MFA
   */
  const verifyMFA = async (token: string, method: AuthMethod): Promise<boolean> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      const result = await clientMFAService.verifyMFA(user.id, token, method);
      return result.success;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  };

  /**
   * Generate backup codes
   */
  const generateBackupCodes = async (): Promise<string[]> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      // This would require MFA verification in a real implementation
      const codes = await clientMFAService.generateNewBackupCodes(user.id, 'temp_token');
      return codes;
    } catch (error) {
      console.error('Backup codes generation error:', error);
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw new AuthError('Failed to update profile', {
          code: 'PROFILE_UPDATE_FAILED',
          details: error
        });
      }

      // Update local user state
      setUser({ ...user, ...data });

      await auditLogger.logUser(
        'user.profile.updated',
        user.id,
        user.id,
        { updated_fields: Object.keys(data) }
      );
      
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change password
   */
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      setLoading(true);

      // Validate new password
      const passwordStrength = securityService.validatePassword(newPassword);
      if (!passwordStrength.meets_policy) {
        throw new AuthError('Password does not meet policy requirements', {
          code: 'PASSWORD_POLICY_VIOLATION',
          details: { feedback: passwordStrength.feedback }
        });
      }

      // Check password reuse
      const isReused = await securityService.checkPasswordReuse(user.id, newPassword, 5);
      if (isReused) {
        throw new AuthError('Cannot reuse recent passwords', {
          code: 'PASSWORD_REUSE_VIOLATION'
        });
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new AuthError('Failed to change password', {
          code: 'PASSWORD_CHANGE_FAILED',
          details: error
        });
      }

      // Store in password history
      const passwordHash = securityService.hashPassword(newPassword);
      await securityService.storePasswordHistory(user.id, passwordHash);

      await auditLogger.logAuth(
        AUDIT_EVENTS.PASSWORD_CHANGE,
        user.id,
        { method: 'user_initiated' }
      );
      
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        throw new AuthError('Failed to send reset email', {
          code: 'PASSWORD_RESET_FAILED',
          details: error
        });
      }

      await auditLogger.logAuth(
        AUDIT_EVENTS.PASSWORD_RESET,
        undefined,
        { email, method: 'email_link' }
      );
      
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify email
   */
  const verifyEmail = async (token: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        throw new AuthError('Email verification failed', {
          code: 'EMAIL_VERIFICATION_FAILED',
          details: error
        });
      }
      
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend verification email
   */
  const resendVerification = async (): Promise<void> => {
    if (!user) {
      throw new AuthError('User not authenticated', { code: 'NOT_AUTHENTICATED' });
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) {
        throw new AuthError('Failed to resend verification', {
          code: 'VERIFICATION_RESEND_FAILED',
          details: error
        });
      }
      
    } catch (error) {
      console.error('Verification resend error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contextValue: IAuthContext = {
    user,
    session,
    organization,
    loading,
    error,
    signIn,
    signInWithSSO,
    signOut,
    refreshSession,
    enableMFA,
    disableMFA,
    verifyMFA,
    generateBackupCodes,
    updateProfile,
    changePassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    // Network status info
    networkStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}