/**
 * EMAIL VERIFICATION SYSTEM - 7P Education
 * Mandatory email verification with rate limiting and Turkish localization
 */

import { createClient } from '@/utils/supabase/server';
import { PRODUCTION_AUTH_CONFIG, AUTH_MESSAGES_TR } from './production-config';
import { auditLogger } from './audit-logger';

export interface EmailVerificationRequest {
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  canResend: boolean;
  nextResendTime?: number;
  remainingAttempts?: number;
}

export interface VerificationLinkData {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  isValid: boolean;
}

// In-memory store for resend rate limiting (use Redis in production)
const resendAttempts = new Map<string, {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}>();

export class EmailVerificationService {
  
  /**
   * Generate and send email verification
   */
  static async sendVerificationEmail(
    request: EmailVerificationRequest
  ): Promise<EmailVerificationResult> {
    try {
      // Check rate limiting first
      const rateLimitCheck = await this.checkResendRateLimit(request.userId, request.email);
      if (!rateLimitCheck.allowed) {
        await auditLogger.logSuspiciousActivity(
          request.userId,
          request.ipAddress,
          request.userAgent,
          'verification_rate_limit_exceeded',
          {
            email: request.email,
            attempts: rateLimitCheck.attempts,
            windowStart: rateLimitCheck.windowStart
          }
        );

        return {
          success: false,
          message: `Çok fazla doğrulama e-postası gönderdiniz. ${this.formatWaitTime(rateLimitCheck.waitTime!)} sonra tekrar deneyin.`,
          canResend: false,
          nextResendTime: rateLimitCheck.nextAllowedTime
        };
      }

      // Generate verification token
      const verificationToken = await this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + PRODUCTION_AUTH_CONFIG.verification.email.linkExpiry);

      // Store verification record
      await this.storeVerificationRecord({
        userId: request.userId,
        email: request.email,
        token: verificationToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        isValid: true
      });

      // Send email via Supabase
      const supabase = createClient();
      const verificationUrl = this.buildVerificationUrl(verificationToken);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: request.email,
        options: {
          emailRedirectTo: verificationUrl
        }
      });

      if (error) {
        console.error('Failed to send verification email:', error);
        await auditLogger.logAuthEvent(
          'email_verification_failed',
          request.userId,
          request.ipAddress,
          request.userAgent,
          false,
          {
            email: request.email,
            error: error.message,
            reason: 'supabase_send_failed'
          },
          'high'
        );

        return {
          success: false,
          message: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.',
          canResend: true
        };
      }

      // Update rate limiting
      await this.updateResendAttempts(request.userId, request.email);

      // Log successful send
      await auditLogger.logAuthEvent(
        'email_verification_sent',
        request.userId,
        request.ipAddress,
        request.userAgent,
        true,
        {
          email: request.email,
          expiresAt: expiresAt.toISOString(),
          attempt: rateLimitCheck.attempts + 1
        },
        'low'
      );

      const remainingAttempts = PRODUCTION_AUTH_CONFIG.verification.email.resendLimit - (rateLimitCheck.attempts + 1);

      return {
        success: true,
        message: 'Doğrulama e-postası gönderildi. E-posta adresinizi kontrol edin.',
        canResend: remainingAttempts > 0,
        remainingAttempts: remainingAttempts
      };

    } catch (error) {
      console.error('Email verification send failed:', error);
      await auditLogger.logAuthEvent(
        'email_verification_error',
        request.userId,
        request.ipAddress,
        request.userAgent,
        false,
        {
          email: request.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        'high'
      );

      return {
        success: false,
        message: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        canResend: true
      };
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(
    token: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const supabase = createClient();

      // Get verification record
      const verificationData = await this.getVerificationRecord(token);
      if (!verificationData) {
        await auditLogger.logSuspiciousActivity(
          null,
          ipAddress,
          userAgent,
          'invalid_verification_token',
          { token: token.slice(0, 8) + '...' }
        );

        return {
          success: false,
          message: 'Doğrulama bağlantısı geçersiz veya bulunamadı.'
        };
      }

      // Check if expired
      if (new Date(verificationData.expiresAt) < new Date()) {
        await auditLogger.logAuthEvent(
          'email_verification_expired',
          verificationData.userId,
          ipAddress,
          userAgent,
          false,
          {
            email: verificationData.email,
            expiresAt: verificationData.expiresAt,
            attemptedAt: new Date().toISOString()
          },
          'medium'
        );

        return {
          success: false,
          message: 'Doğrulama bağlantısının süresi dolmuş. Yeni bir bağlantı talep edin.'
        };
      }

      // Mark as verified in Supabase
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) {
        console.error('Email verification failed:', error);
        await auditLogger.logAuthEvent(
          'email_verification_failed',
          verificationData.userId,
          ipAddress,
          userAgent,
          false,
          {
            email: verificationData.email,
            error: error.message,
            reason: 'supabase_verify_failed'
          },
          'medium'
        );

        return {
          success: false,
          message: 'E-posta doğrulaması başarısız. Lütfen tekrar deneyin.'
        };
      }

      // Invalidate verification record
      await this.invalidateVerificationRecord(token);

      // Update user profile
      await this.updateUserEmailVerified(verificationData.userId, verificationData.email);

      // Log successful verification
      await auditLogger.logAuthEvent(
        'email_verified',
        verificationData.userId,
        ipAddress,
        userAgent,
        true,
        {
          email: verificationData.email,
          verifiedAt: new Date().toISOString()
        },
        'low'
      );

      // Clear any rate limiting for this user
      this.clearResendAttempts(verificationData.userId, verificationData.email);

      return {
        success: true,
        message: 'E-posta adresiniz başarıyla doğrulandı.',
        userId: verificationData.userId
      };

    } catch (error) {
      console.error('Email verification error:', error);
      await auditLogger.logSuspiciousActivity(
        null,
        ipAddress,
        userAgent,
        'email_verification_system_error',
        {
          token: token.slice(0, 8) + '...',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      return {
        success: false,
        message: 'Doğrulama işlemi sırasında hata oluştu. Lütfen tekrar deneyin.'
      };
    }
  }

  /**
   * Check if user email is verified
   */
  static async isEmailVerified(userId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select('email_verified, email_verified_at')
        .eq('user_id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      return user.email_verified === true && user.email_verified_at !== null;
    } catch (error) {
      console.error('Failed to check email verification status:', error);
      return false;
    }
  }

  /**
   * Get verification status for user
   */
  static async getVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    canResend: boolean;
    nextResendTime?: number;
    remainingAttempts?: number;
  }> {
    const isVerified = await this.isEmailVerified(userId);
    
    if (isVerified) {
      return {
        isVerified: true,
        canResend: false
      };
    }

    // Get user email
    const supabase = createClient();
    const { data: user } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .single();

    if (!user?.email) {
      return {
        isVerified: false,
        canResend: false
      };
    }

    const rateLimitCheck = await this.checkResendRateLimit(userId, user.email);
    
    return {
      isVerified: false,
      canResend: rateLimitCheck.allowed,
      nextResendTime: rateLimitCheck.nextAllowedTime,
      remainingAttempts: rateLimitCheck.allowed ? 
        PRODUCTION_AUTH_CONFIG.verification.email.resendLimit - rateLimitCheck.attempts : 0
    };
  }

  // Private helper methods

  private static async generateVerificationToken(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private static buildVerificationUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${baseUrl}/auth/verify-email?token=${token}`;
  }

  private static async storeVerificationRecord(data: VerificationLinkData): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('email_verifications')
        .insert({
          user_id: data.userId,
          email: data.email,
          token: data.token,
          expires_at: data.expiresAt,
          created_at: data.createdAt,
          is_valid: data.isValid
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to store verification record:', error);
      throw error;
    }
  }

  private static async getVerificationRecord(token: string): Promise<VerificationLinkData | null> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('token', token)
        .eq('is_valid', true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.user_id,
        email: data.email,
        token: data.token,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        isValid: data.is_valid
      };
    } catch (error) {
      console.error('Failed to get verification record:', error);
      return null;
    }
  }

  private static async invalidateVerificationRecord(token: string): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('email_verifications')
        .update({ is_valid: false, verified_at: new Date().toISOString() })
        .eq('token', token);

      if (error) {
        console.error('Failed to invalidate verification record:', error);
      }
    } catch (error) {
      console.error('Failed to invalidate verification record:', error);
    }
  }

  private static async updateUserEmailVerified(userId: string, email: string): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          email: email
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update user email verification:', error);
      }
    } catch (error) {
      console.error('Failed to update user email verification:', error);
    }
  }

  private static async checkResendRateLimit(userId: string, email: string): Promise<{
    allowed: boolean;
    attempts: number;
    waitTime?: number;
    nextAllowedTime?: number;
    windowStart?: number;
  }> {
    const key = `${userId}:${email}`;
    const now = Date.now();
    const config = PRODUCTION_AUTH_CONFIG.verification.email;
    
    let attempts = resendAttempts.get(key);
    
    if (!attempts) {
      return {
        allowed: true,
        attempts: 0
      };
    }

    // Check if window expired
    if (now - attempts.firstAttempt > config.resendWindow) {
      // Reset the window
      resendAttempts.delete(key);
      return {
        allowed: true,
        attempts: 0
      };
    }

    // Check if limit exceeded
    if (attempts.count >= config.resendLimit) {
      const waitTime = config.resendWindow - (now - attempts.firstAttempt);
      const nextAllowedTime = attempts.firstAttempt + config.resendWindow;
      
      return {
        allowed: false,
        attempts: attempts.count,
        waitTime,
        nextAllowedTime,
        windowStart: attempts.firstAttempt
      };
    }

    return {
      allowed: true,
      attempts: attempts.count
    };
  }

  private static async updateResendAttempts(userId: string, email: string): Promise<void> {
    const key = `${userId}:${email}`;
    const now = Date.now();
    
    let attempts = resendAttempts.get(key);
    
    if (!attempts) {
      attempts = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      };
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
    
    resendAttempts.set(key, attempts);
  }

  private static clearResendAttempts(userId: string, email: string): void {
    const key = `${userId}:${email}`;
    resendAttempts.delete(key);
  }

  private static formatWaitTime(waitTimeMs: number): string {
    const minutes = Math.ceil(waitTimeMs / (60 * 1000));
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours} saat`;
  }
}

// SQL for email_verifications table (to be added to migration)
export const EMAIL_VERIFICATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT email_verifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- Add email verification tracking to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

-- Row Level Security
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email verifications" 
  ON email_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert email verifications" 
  ON email_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update email verifications" 
  ON email_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Cleanup function for expired verification links
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications 
  WHERE expires_at < NOW() 
  AND is_valid = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-verifications', '0 2 * * *', 'SELECT cleanup_expired_email_verifications();');
`;

// Email template in Turkish
export const EMAIL_VERIFICATION_TEMPLATE_TR = {
  subject: '7P Education - E-posta Doğrulama',
  html: `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">7P Education</h1>
        <h2 style="color: #1f2937; font-weight: normal;">E-posta Adresinizi Doğrulayın</h2>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #4b5563;">
          Merhaba,<br><br>
          7P Education hesabınızı oluşturduğunuz için teşekkür ederiz. 
          Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verification_url}}" 
           style="background-color: #2563eb; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold; 
                  display: inline-block;">
          E-posta Adresimi Doğrula
        </a>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Önemli:</strong> Bu bağlantının geçerlilik süresi 24 saattir. 
          Süre dolmadan önce e-posta doğrulamanızı tamamlayın.
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 12px;">
        <p>Eğer bu e-postayı siz talep etmediyseniz, güvenle silebilirsiniz.</p>
        <p>Bağlantı çalışmıyorsa, aşağıdaki URL'yi tarayıcınıza kopyalayın:</p>
        <p style="word-break: break-all;">{{verification_url}}</p>
        <br>
        <p>Saygılarımızla,<br>7P Education Ekibi</p>
      </div>
    </div>
  `,
  text: `
7P Education - E-posta Doğrulama

Merhaba,

7P Education hesabınızı oluşturduğunuz için teşekkür ederiz.
Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:

{{verification_url}}

ÖNEMLI: Bu bağlantının geçerlilik süresi 24 saattir.

Eğer bu e-postayı siz talep etmediyseniz, güvenle silebilirsiniz.

Saygılarımızla,
7P Education Ekibi
  `
};

export default EmailVerificationService;