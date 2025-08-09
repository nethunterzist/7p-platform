/**
 * Multi-Factor Authentication (MFA) Implementation
 * TOTP, SMS, and Backup Codes
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto-js';
import { supabase } from '@/lib/supabase';
import { AuthMethod, User, AuthError } from '@/lib/types/auth';
import { AUTH_CONFIG, AUDIT_EVENTS } from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';

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

export interface SMSProvider {
  sendSMS(phoneNumber: string, message: string): Promise<boolean>;
}

export class MFAService {
  private static instance: MFAService;
  private smsProvider?: SMSProvider;

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  setSMSProvider(provider: SMSProvider): void {
    this.smsProvider = provider;
  }

  /**
   * Generate TOTP secret and QR code for user
   */
  async generateTOTPSecret(userId: string, userEmail: string): Promise<MFASecret> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: '7P Education',
        length: 32,
      });

      if (!secret.base32) {
        throw new AuthError('Failed to generate TOTP secret', {
          code: 'TOTP_SECRET_GENERATION_FAILED'
        });
      }

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate recovery code (for account recovery)
      const recoveryCode = this.generateRecoveryCode();

      // Store encrypted secret in database (don't activate MFA yet)
      const encryptedSecret = this.encryptSecret(secret.base32);
      const encryptedBackupCodes = backupCodes.map(code => this.encryptSecret(code));
      const encryptedRecoveryCode = this.encryptSecret(recoveryCode);

      const { error } = await supabase
        .from('user_mfa_secrets')
        .upsert([{
          user_id: userId,
          secret: encryptedSecret,
          backup_codes: encryptedBackupCodes,
          recovery_code: encryptedRecoveryCode,
          created_at: new Date().toISOString(),
          verified: false
        }], { onConflict: 'user_id' });

      if (error) {
        throw new AuthError('Failed to store MFA secret', {
          code: 'MFA_SECRET_STORAGE_FAILED',
          details: error
        });
      }

      // Log MFA setup initiated
      await auditLogger.log({
        action: 'auth.mfa.setup.initiated',
        user_id: userId,
        resource: 'auth',
        details: { method: AuthMethod.MFA_TOTP }
      });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        recoveryCode
      };

    } catch (error) {
      console.error('TOTP secret generation error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token and activate MFA
   */
  async verifyAndActivateTOTP(userId: string, token: string, secret: string): Promise<boolean> {
    try {
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret,
        token,
        window: 2, // Allow for time drift
        encoding: 'base32'
      });

      if (!verified) {
        // Log failed verification
        await auditLogger.log({
          action: AUDIT_EVENTS.MFA_FAILED,
          user_id: userId,
          resource: 'auth',
          details: { method: AuthMethod.MFA_TOTP, reason: 'invalid_token' }
        });

        return false;
      }

      // Activate MFA for user
      const { error: userError } = await supabase
        .from('users')
        .update({
          mfa_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (userError) {
        throw new AuthError('Failed to activate MFA', {
          code: 'MFA_ACTIVATION_FAILED',
          details: userError
        });
      }

      // Mark secret as verified
      const { error: secretError } = await supabase
        .from('user_mfa_secrets')
        .update({
          verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (secretError) {
        console.error('Failed to mark MFA secret as verified:', secretError);
      }

      // Log successful MFA activation
      await auditLogger.log({
        action: AUDIT_EVENTS.MFA_ENABLED,
        user_id: userId,
        resource: 'auth',
        details: { method: AuthMethod.MFA_TOTP }
      });

      return true;
    } catch (error) {
      console.error('TOTP verification error:', error);
      throw error;
    }
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFA(userId: string, token: string, method: AuthMethod): Promise<MFAVerificationResult> {
    try {
      // Get user's MFA secret
      const { data: secretData, error: secretError } = await supabase
        .from('user_mfa_secrets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (secretError || !secretData) {
        throw new AuthError('MFA not set up for user', {
          code: 'MFA_NOT_SETUP'
        });
      }

      let verified = false;
      let usedBackupCode: string | undefined;

      switch (method) {
        case AuthMethod.MFA_TOTP:
          verified = await this.verifyTOTP(secretData.secret, token);
          break;

        case AuthMethod.MFA_SMS:
          verified = await this.verifySMS(userId, token);
          break;

        default:
          // Try backup code
          const backupResult = await this.verifyBackupCode(userId, token, secretData.backup_codes);
          verified = backupResult.verified;
          usedBackupCode = backupResult.usedCode;
          break;
      }

      if (verified) {
        // Update last MFA verification time
        await supabase
          .from('users')
          .update({
            last_mfa_verification: new Date().toISOString()
          })
          .eq('id', userId);

        // Log successful MFA verification
        await auditLogger.log({
          action: AUDIT_EVENTS.MFA_VERIFIED,
          user_id: userId,
          resource: 'auth',
          details: {
            method,
            backup_code_used: !!usedBackupCode
          }
        });

        return {
          success: true,
          method,
          used_backup_code: usedBackupCode,
          remaining_backup_codes: usedBackupCode ? 
            secretData.backup_codes.filter((code: string) => code !== usedBackupCode).length : 
            undefined
        };
      } else {
        // Log failed MFA verification
        await auditLogger.log({
          action: AUDIT_EVENTS.MFA_FAILED,
          user_id: userId,
          resource: 'auth',
          details: { method, reason: 'invalid_token' },
          severity: 'medium'
        });

        return { success: false, method };
      }

    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string, password: string, mfaToken: string): Promise<boolean> {
    try {
      // Verify password first
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!userData) {
        throw new AuthError('User not found', { code: 'USER_NOT_FOUND' });
      }

      // Verify password with Supabase
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password
      });

      if (passwordError) {
        throw new AuthError('Invalid password', { code: 'INVALID_PASSWORD' });
      }

      // Verify MFA token
      const mfaResult = await this.verifyMFA(userId, mfaToken, AuthMethod.MFA_TOTP);
      if (!mfaResult.success) {
        throw new AuthError('Invalid MFA token', { code: 'INVALID_MFA_TOKEN' });
      }

      // Disable MFA
      const { error: userError } = await supabase
        .from('users')
        .update({
          mfa_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (userError) {
        throw new AuthError('Failed to disable MFA', {
          code: 'MFA_DISABLE_FAILED',
          details: userError
        });
      }

      // Remove MFA secrets
      const { error: secretError } = await supabase
        .from('user_mfa_secrets')
        .delete()
        .eq('user_id', userId);

      if (secretError) {
        console.error('Failed to remove MFA secrets:', secretError);
      }

      // Log MFA disabled
      await auditLogger.log({
        action: AUDIT_EVENTS.MFA_DISABLED,
        user_id: userId,
        resource: 'auth',
        details: { method: AuthMethod.MFA_TOTP }
      });

      return true;
    } catch (error) {
      console.error('MFA disable error:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string, mfaToken: string): Promise<string[]> {
    try {
      // Verify MFA token first
      const mfaResult = await this.verifyMFA(userId, mfaToken, AuthMethod.MFA_TOTP);
      if (!mfaResult.success) {
        throw new AuthError('Invalid MFA token', { code: 'INVALID_MFA_TOKEN' });
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      const encryptedBackupCodes = backupCodes.map(code => this.encryptSecret(code));

      // Update backup codes in database
      const { error } = await supabase
        .from('user_mfa_secrets')
        .update({
          backup_codes: encryptedBackupCodes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new AuthError('Failed to update backup codes', {
          code: 'BACKUP_CODES_UPDATE_FAILED',
          details: error
        });
      }

      // Log backup codes generation
      await auditLogger.log({
        action: AUDIT_EVENTS.BACKUP_CODES_GENERATED,
        user_id: userId,
        resource: 'auth',
        details: { count: backupCodes.length }
      });

      return backupCodes;
    } catch (error) {
      console.error('Backup codes generation error:', error);
      throw error;
    }
  }

  /**
   * Send SMS token
   */
  async sendSMSToken(userId: string, phoneNumber: string): Promise<boolean> {
    try {
      if (!this.smsProvider) {
        throw new AuthError('SMS provider not configured', {
          code: 'SMS_PROVIDER_NOT_CONFIGURED'
        });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code temporarily (expires in 5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const { error } = await supabase
        .from('sms_tokens')
        .upsert([{
          user_id: userId,
          phone_number: phoneNumber,
          code: this.encryptSecret(code),
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }], { onConflict: 'user_id' });

      if (error) {
        throw new AuthError('Failed to store SMS token', {
          code: 'SMS_TOKEN_STORAGE_FAILED',
          details: error
        });
      }

      // Send SMS
      const message = `Your 7P Education verification code is: ${code}. This code expires in 5 minutes.`;
      const sent = await this.smsProvider.sendSMS(phoneNumber, message);

      if (!sent) {
        throw new AuthError('Failed to send SMS', { code: 'SMS_SEND_FAILED' });
      }

      return true;
    } catch (error) {
      console.error('SMS token send error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async verifyTOTP(encryptedSecret: string, token: string): Promise<boolean> {
    const secret = this.decryptSecret(encryptedSecret);
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2,
      encoding: 'base32'
    });
  }

  private async verifySMS(userId: string, token: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('sms_tokens')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return false;

    const storedCode = this.decryptSecret(data.code);
    if (storedCode === token) {
      // Remove used token
      await supabase
        .from('sms_tokens')
        .delete()
        .eq('user_id', userId);
      
      return true;
    }

    return false;
  }

  private async verifyBackupCode(userId: string, code: string, encryptedBackupCodes: string[]): Promise<{ verified: boolean; usedCode?: string }> {
    for (const encryptedCode of encryptedBackupCodes) {
      const backupCode = this.decryptSecret(encryptedCode);
      if (backupCode === code) {
        // Remove used backup code
        const updatedCodes = encryptedBackupCodes.filter(c => c !== encryptedCode);
        await supabase
          .from('user_mfa_secrets')
          .update({ backup_codes: updatedCodes })
          .eq('user_id', userId);

        // Log backup code usage
        await auditLogger.log({
          action: AUDIT_EVENTS.BACKUP_CODE_USED,
          user_id: userId,
          resource: 'auth',
          details: { remaining_codes: updatedCodes.length }
        });

        return { verified: true, usedCode: code };
      }
    }

    return { verified: false };
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < AUTH_CONFIG.BACKUP_CODES_COUNT; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private generateRecoveryCode(): string {
    return Math.random().toString(36).substring(2, 18).toUpperCase();
  }

  private encryptSecret(secret: string): string {
    return crypto.AES.encrypt(secret, AUTH_CONFIG.JWT_SECRET).toString();
  }

  private decryptSecret(encryptedSecret: string): string {
    const bytes = crypto.AES.decrypt(encryptedSecret, AUTH_CONFIG.JWT_SECRET);
    return bytes.toString(crypto.enc.Utf8);
  }
}

export const mfaService = MFAService.getInstance();