/**
 * Google SSO Provider
 * Google Workspace and Gmail authentication
 */

import { supabase } from '@/lib/supabase';
import { GOOGLE_SSO_CONFIG, AUDIT_EVENTS } from '@/lib/auth/config';
import { SSOProvider, User, Organization, AuthError } from '@/lib/types/auth';
import { auditLogger } from '@/lib/auth/audit';

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  hd?: string; // Hosted domain for Google Workspace
}

export interface GoogleGroupInfo {
  id: string;
  name: string;
  email: string;
  description?: string;
  directMembersCount?: string;
}

export class GoogleSSOProvider {
  private static instance: GoogleSSOProvider;
  private config = GOOGLE_SSO_CONFIG;

  static getInstance(): GoogleSSOProvider {
    if (!GoogleSSOProvider.instance) {
      GoogleSSOProvider.instance = new GoogleSSOProvider();
    }
    return GoogleSSOProvider.instance;
  }

  /**
   * Get Google OAuth authorization URL
   */
  getAuthorizationUrl(state?: string, hostedDomain?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
    });

    if (state) {
      params.append('state', state);
    }

    if (hostedDomain) {
      params.append('hd', hostedDomain);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new AuthError(`Google token exchange failed: ${error.error_description}`, {
          code: 'GOOGLE_TOKEN_EXCHANGE_FAILED',
          details: error
        });
      }

      return await response.json();
    } catch (error) {
      console.error('Google token exchange error:', error);
      throw error;
    }
  }

  /**
   * Get user information from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new AuthError('Failed to fetch Google user info', {
          code: 'GOOGLE_USER_INFO_FAILED'
        });
      }

      return await response.json();
    } catch (error) {
      console.error('Google user info error:', error);
      throw error;
    }
  }

  /**
   * Get user's Google Workspace groups
   */
  async getUserGroups(accessToken: string, userEmail: string): Promise<GoogleGroupInfo[]> {
    try {
      const response = await fetch(
        `https://admin.googleapis.com/admin/directory/v1/groups?userKey=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // If we don't have admin permissions, return empty array
        if (response.status === 403) {
          console.warn('No Google Workspace admin permissions for group lookup');
          return [];
        }
        throw new AuthError('Failed to fetch Google Workspace groups', {
          code: 'GOOGLE_GROUPS_FAILED'
        });
      }

      const data = await response.json();
      return data.groups || [];
    } catch (error) {
      console.error('Google groups error:', error);
      return []; // Non-critical, return empty array
    }
  }

  /**
   * Verify domain ownership for Google Workspace
   */
  async verifyWorkspaceDomain(domain: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://admin.googleapis.com/admin/directory/v1/domains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Google domain verification error:', error);
      return false;
    }
  }

  /**
   * Handle Google SSO login process
   */
  async handleLogin(code: string, state?: string): Promise<{ user: User; session: any }> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);
      
      // Get user information
      const googleUser = await this.getUserInfo(tokens.access_token);
      
      // Verify email is verified
      if (!googleUser.email_verified) {
        throw new AuthError('Google email not verified', {
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      // Check if this is a Google Workspace account
      const isWorkspaceAccount = !!googleUser.hd;
      let organization: Organization | null = null;

      if (isWorkspaceAccount) {
        // Look for existing organization by domain
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('domain', googleUser.hd)
          .single();

        organization = orgData;

        // If organization exists and has domain restrictions
        if (organization && !this.config.hostedDomains.includes(googleUser.hd!)) {
          throw new AuthError('Domain not allowed', {
            code: 'DOMAIN_NOT_ALLOWED'
          });
        }
      }

      // Get user groups for role mapping
      const groups = await this.getUserGroups(tokens.access_token, googleUser.email);

      // Authenticate with Supabase using Google OAuth
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.id_token,
        access_token: tokens.access_token,
      });

      if (authError) {
        throw new AuthError(`Supabase authentication failed: ${authError.message}`, {
          code: 'SUPABASE_AUTH_FAILED',
          details: authError
        });
      }

      // Update or create user profile
      const userData = {
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture,
        sso_provider: SSOProvider.GOOGLE,
        sso_id: googleUser.sub,
        domain: googleUser.hd,
        email_verified: googleUser.email_verified,
        last_login: new Date().toISOString(),
        organization_id: organization?.id
      };

      const { data: user, error: userError } = await supabase
        .from('users')
        .upsert([userData], { onConflict: 'email' })
        .select()
        .single();

      if (userError) {
        console.error('User profile update error:', userError);
      }

      // Log successful login
      await auditLogger.log({
        action: AUDIT_EVENTS.SSO_LOGIN_SUCCESS,
        user_id: authData.user?.id,
        resource: 'auth',
        details: {
          provider: SSOProvider.GOOGLE,
          email: googleUser.email,
          domain: googleUser.hd,
          workspace_account: isWorkspaceAccount
        }
      });

      return {
        user: user || userData,
        session: authData.session
      };

    } catch (error) {
      // Log failed login
      await auditLogger.log({
        action: AUDIT_EVENTS.SSO_LOGIN_FAILURE,
        resource: 'auth',
        details: {
          provider: SSOProvider.GOOGLE,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        severity: 'high'
      });

      throw error;
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshToken(refreshToken: string): Promise<GoogleTokenResponse> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new AuthError(`Google token refresh failed: ${error.error_description}`, {
          code: 'GOOGLE_TOKEN_REFRESH_FAILED',
          details: error
        });
      }

      return await response.json();
    } catch (error) {
      console.error('Google token refresh error:', error);
      throw error;
    }
  }

  /**
   * Revoke Google access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        console.warn('Failed to revoke Google token, but continuing...');
      }
    } catch (error) {
      console.error('Google token revocation error:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Map Google Workspace groups to user roles
   */
  mapGroupsToRoles(groups: GoogleGroupInfo[], groupMapping?: Record<string, string>): string[] {
    if (!groupMapping) return [];

    const roles: string[] = [];
    for (const group of groups) {
      const role = groupMapping[group.email] || groupMapping[group.name];
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  /**
   * Validate Google Workspace domain
   */
  isValidWorkspaceDomain(domain: string): boolean {
    if (this.config.hostedDomains.length === 0) return true;
    return this.config.hostedDomains.includes(domain);
  }
}

export const googleSSO = GoogleSSOProvider.getInstance();