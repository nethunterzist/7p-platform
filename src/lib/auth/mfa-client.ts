/**
 * Client-Safe MFA Service
 * All MFA operations delegated to secure server APIs
 */

import { AuthMethod } from '@/lib/types/auth';

export interface MFASecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  recoveryCode: string;
}

export interface MFAVerificationResult {
  success: boolean;
  method: AuthMethod;
  used_backup_code?: string;
  remaining_backup_codes?: number;
}

export class ClientMFAService {
  private static instance: ClientMFAService;

  static getInstance(): ClientMFAService {
    if (!ClientMFAService.instance) {
      ClientMFAService.instance = new ClientMFAService();
    }
    return ClientMFAService.instance;
  }

  /**
   * Generate TOTP secret via server API
   */
  async generateTOTPSecret(userId: string, userEmail: string): Promise<MFASecret> {
    const response = await fetch('/api/auth/mfa/generate-secret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userEmail }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate TOTP secret');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate TOTP secret');
    }

    return data.secret;
  }

  /**
   * Verify and activate TOTP via server API
   */
  async verifyAndActivateTOTP(userId: string, token: string, secret: string): Promise<boolean> {
    const response = await fetch('/api/auth/mfa/verify-activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, token, secret }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify TOTP');
    }

    const data = await response.json();
    return data.success;
  }

  /**
   * Verify MFA token via server API
   */
  async verifyMFA(userId: string, token: string, method: AuthMethod): Promise<MFAVerificationResult> {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, token, method }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify MFA');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'MFA verification failed');
    }

    return data.result;
  }

  /**
   * Disable MFA via server API
   */
  async disableMFA(userId: string, password: string, mfaToken: string): Promise<boolean> {
    const response = await fetch('/api/auth/mfa/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, password, mfaToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to disable MFA');
    }

    const data = await response.json();
    return data.success;
  }

  /**
   * Generate new backup codes via server API
   */
  async generateNewBackupCodes(userId: string, mfaToken: string): Promise<string[]> {
    const response = await fetch('/api/auth/mfa/backup-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, mfaToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate backup codes');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate backup codes');
    }

    return data.codes;
  }
}

export const clientMFAService = ClientMFAService.getInstance();