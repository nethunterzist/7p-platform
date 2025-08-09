/**
 * Microsoft SSO Provider
 * Microsoft 365 and Azure AD authentication
 */

import { PublicClientApplication, Configuration, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { supabase } from '@/lib/supabase';
import { MICROSOFT_SSO_CONFIG, AUDIT_EVENTS } from '@/lib/auth/config';
import { SSOProvider, User, Organization, AuthError } from '@/lib/types/auth';
import { auditLogger } from '@/lib/auth/audit';

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface MicrosoftUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  upn?: string; // User Principal Name
  tid?: string; // Tenant ID
  oid?: string; // Object ID
  preferred_username?: string;
  department?: string;
  job_title?: string;
}

export interface AzureADGroupInfo {
  id: string;
  displayName: string;
  description?: string;
  groupTypes: string[];
  mail?: string;
  mailEnabled: boolean;
  securityEnabled: boolean;
}

export class MicrosoftSSOProvider {
  private static instance: MicrosoftSSOProvider;
  private msalInstance: PublicClientApplication;
  private config = MICROSOFT_SSO_CONFIG;

  constructor() {
    const msalConfig: Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: this.config.authority,
        redirectUri: this.config.redirectUri,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            console.log(`MSAL [${level}]: ${message}`);
          },
          piiLoggingEnabled: false,
        },
      },
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  static getInstance(): MicrosoftSSOProvider {
    if (!MicrosoftSSOProvider.instance) {
      MicrosoftSSOProvider.instance = new MicrosoftSSOProvider();
    }
    return MicrosoftSSOProvider.instance;
  }

  /**
   * Initialize MSAL instance
   */
  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
    } catch (error) {
      console.error('MSAL initialization error:', error);
      throw new AuthError('Failed to initialize Microsoft authentication', {
        code: 'MSAL_INIT_FAILED'
      });
    }
  }

  /**
   * Handle redirect response
   */
  async handleRedirectPromise(): Promise<AuthenticationResult | null> {
    try {
      return await this.msalInstance.handleRedirectPromise();
    } catch (error) {
      console.error('MSAL redirect handling error:', error);
      throw new AuthError('Failed to handle Microsoft redirect', {
        code: 'MSAL_REDIRECT_FAILED'
      });
    }
  }

  /**
   * Get Microsoft OAuth authorization URL and initiate login
   */
  async loginRedirect(loginHint?: string): Promise<void> {
    try {
      const loginRequest = {
        scopes: this.config.scopes,
        prompt: 'select_account',
        loginHint,
      };

      await this.msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Microsoft login redirect error:', error);
      throw new AuthError('Failed to initiate Microsoft login', {
        code: 'MICROSOFT_LOGIN_FAILED'
      });
    }
  }

  /**
   * Login with popup
   */
  async loginPopup(loginHint?: string): Promise<AuthenticationResult> {
    try {
      const loginRequest = {
        scopes: this.config.scopes,
        prompt: 'select_account',
        loginHint,
      };

      return await this.msalInstance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Microsoft login popup error:', error);
      throw new AuthError('Failed to complete Microsoft login', {
        code: 'MICROSOFT_LOGIN_FAILED'
      });
    }
  }

  /**
   * Get access token silently
   */
  async acquireTokenSilent(account: AccountInfo): Promise<AuthenticationResult> {
    try {
      const silentRequest = {
        scopes: this.config.scopes,
        account,
      };

      return await this.msalInstance.acquireTokenSilent(silentRequest);
    } catch (error) {
      console.error('Microsoft silent token acquisition error:', error);
      throw error;
    }
  }

  /**
   * Get user information from Microsoft Graph
   */
  async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new AuthError('Failed to fetch Microsoft user info', {
          code: 'MICROSOFT_USER_INFO_FAILED'
        });
      }

      return await response.json();
    } catch (error) {
      console.error('Microsoft user info error:', error);
      throw error;
    }
  }

  /**
   * Get user's Azure AD groups
   */
  async getUserGroups(accessToken: string): Promise<AzureADGroupInfo[]> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // If we don't have permissions, return empty array
        if (response.status === 403) {
          console.warn('No Microsoft Graph permissions for group lookup');
          return [];
        }
        throw new AuthError('Failed to fetch Azure AD groups', {
          code: 'MICROSOFT_GROUPS_FAILED'
        });
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Microsoft groups error:', error);
      return []; // Non-critical, return empty array
    }
  }

  /**
   * Get organization information from Azure AD
   */
  async getOrganizationInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch organization info');
        return null;
      }

      const data = await response.json();
      return data.value?.[0] || null;
    } catch (error) {
      console.error('Microsoft organization info error:', error);
      return null;
    }
  }

  /**
   * Handle Microsoft SSO login process
   */
  async handleLogin(authResult: AuthenticationResult): Promise<{ user: User; session: any }> {
    try {
      if (!authResult.account) {
        throw new AuthError('No account information received from Microsoft', {
          code: 'NO_ACCOUNT_INFO'
        });
      }

      // Get user information from Microsoft Graph
      const microsoftUser = await this.getUserInfo(authResult.accessToken);
      
      // Get organization information
      const orgInfo = await this.getOrganizationInfo(authResult.accessToken);
      
      // Get user groups for role mapping
      const groups = await this.getUserGroups(authResult.accessToken);

      // Extract domain from email or UPN
      const email = microsoftUser.email || authResult.account.username;
      const domain = email.split('@')[1];

      // Look for existing organization by domain
      let organization: Organization | null = null;
      if (domain) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('domain', domain)
          .single();

        organization = orgData;
      }

      // Create a custom JWT token for Supabase (since MSAL doesn't provide standard JWT for Supabase)
      const customToken = {
        sub: authResult.account.localAccountId,
        email: email,
        name: microsoftUser.name,
        picture: microsoftUser.picture,
        iss: 'https://login.microsoftonline.com/' + authResult.account.tenantId,
        aud: this.config.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        upn: microsoftUser.upn,
        tid: authResult.account.tenantId,
        oid: authResult.account.localAccountId,
      };

      // For Microsoft, we'll create a session manually since Supabase doesn't have native Microsoft support
      // In a production environment, you might want to implement your own JWT handling
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: `microsoft_sso_${authResult.account.localAccountId}`, // Temporary approach
      });

      // If user doesn't exist, create them first
      if (authError && authError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: `microsoft_sso_${authResult.account.localAccountId}`,
          options: {
            data: {
              name: microsoftUser.name,
              avatar_url: microsoftUser.picture,
              sso_provider: SSOProvider.MICROSOFT,
              sso_id: authResult.account.localAccountId,
            }
          }
        });

        if (signUpError) {
          throw new AuthError(`Failed to create user: ${signUpError.message}`, {
            code: 'USER_CREATION_FAILED',
            details: signUpError
          });
        }
      } else if (authError) {
        throw new AuthError(`Supabase authentication failed: ${authError.message}`, {
          code: 'SUPABASE_AUTH_FAILED',
          details: authError
        });
      }

      // Update or create user profile
      const userData = {
        email: email,
        name: microsoftUser.name,
        avatar_url: microsoftUser.picture,
        sso_provider: SSOProvider.MICROSOFT,
        sso_id: authResult.account.localAccountId,
        domain: domain,
        email_verified: true, // Microsoft accounts are pre-verified
        last_login: new Date().toISOString(),
        organization_id: organization?.id,
        metadata: {
          upn: microsoftUser.upn,
          tenant_id: authResult.account.tenantId,
          department: microsoftUser.department,
          job_title: microsoftUser.job_title,
        }
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
        user_id: authData?.user?.id,
        resource: 'auth',
        details: {
          provider: SSOProvider.MICROSOFT,
          email: email,
          domain: domain,
          tenant_id: authResult.account.tenantId,
          organization: orgInfo?.displayName
        }
      });

      return {
        user: user || userData,
        session: authData?.session || null
      };

    } catch (error) {
      // Log failed login
      await auditLogger.log({
        action: AUDIT_EVENTS.SSO_LOGIN_FAILURE,
        resource: 'auth',
        details: {
          provider: SSOProvider.MICROSOFT,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        severity: 'high'
      });

      throw error;
    }
  }

  /**
   * Sign out from Microsoft
   */
  async logout(account?: AccountInfo): Promise<void> {
    try {
      if (account) {
        await this.msalInstance.logoutRedirect({
          account,
          postLogoutRedirectUri: window.location.origin,
        });
      } else {
        await this.msalInstance.logoutRedirect({
          postLogoutRedirectUri: window.location.origin,
        });
      }
    } catch (error) {
      console.error('Microsoft logout error:', error);
      // Continue with local logout even if Microsoft logout fails
    }
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): AccountInfo[] {
    return this.msalInstance.getAllAccounts();
  }

  /**
   * Get active account
   */
  getActiveAccount(): AccountInfo | null {
    return this.msalInstance.getActiveAccount();
  }

  /**
   * Set active account
   */
  setActiveAccount(account: AccountInfo | null): void {
    this.msalInstance.setActiveAccount(account);
  }

  /**
   * Map Azure AD groups to user roles
   */
  mapGroupsToRoles(groups: AzureADGroupInfo[], groupMapping?: Record<string, string>): string[] {
    if (!groupMapping) return [];

    const roles: string[] = [];
    for (const group of groups) {
      const role = groupMapping[group.id] || groupMapping[group.displayName] || groupMapping[group.mail || ''];
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  /**
   * Validate tenant access
   */
  isValidTenant(tenantId: string, allowedTenants?: string[]): boolean {
    if (!allowedTenants || allowedTenants.length === 0) return true;
    return allowedTenants.includes(tenantId) || allowedTenants.includes('common');
  }
}

export const microsoftSSO = MicrosoftSSOProvider.getInstance();