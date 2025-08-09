/**
 * Client-Safe SSO Provider Interface
 * No server-side configuration access for browser safety
 */

import { SSOProvider } from '@/lib/types/auth';

export interface ClientSSOProvider {
  getAuthorizationUrl(state?: string, hostedDomain?: string): Promise<string>;
  isAvailable(): Promise<boolean>;
  getName(): string;
}

export class ClientGoogleSSO implements ClientSSOProvider {
  async getAuthorizationUrl(state?: string, hostedDomain?: string): Promise<string> {
    // Delegate to server-side API to get auth URL without exposing secrets
    const response = await fetch('/api/auth/sso/google/auth-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state, hostedDomain }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Google auth URL');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get Google auth URL');
    }

    return data.authUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/sso-providers');
      if (response.ok) {
        const data = await response.json();
        const googleProvider = data.providers?.find((p: any) => p.provider === SSOProvider.GOOGLE);
        return googleProvider?.enabled || false;
      }
      return false;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'Google Workspace';
  }
}

export class ClientMicrosoftSSO implements ClientSSOProvider {
  async getAuthorizationUrl(state?: string): Promise<string> {
    // Delegate to server-side API to get auth URL without exposing secrets
    const response = await fetch('/api/auth/sso/microsoft/auth-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Microsoft auth URL');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get Microsoft auth URL');
    }

    return data.authUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/sso-providers');
      if (response.ok) {
        const data = await response.json();
        const microsoftProvider = data.providers?.find((p: any) => p.provider === SSOProvider.MICROSOFT);
        return microsoftProvider?.enabled || false;
      }
      return false;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'Microsoft 365';
  }
}

// Client-safe SSO provider instances
export const clientGoogleSSO = new ClientGoogleSSO();
export const clientMicrosoftSSO = new ClientMicrosoftSSO();