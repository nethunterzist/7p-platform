/**
 * SUPABASE MFA VERIFICATION HOOK - 7P Education
 * Custom MFA verification with Turkish TOTP and SMS support
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MFAVerificationPayload {
  user_id: string;
  factor_id: string;
  challenge_id: string;
  code: string;
  factor_type: 'totp' | 'phone';
  phone?: string;
}

interface MFAVerificationResult {
  valid: boolean;
  message: string;
  attempts_remaining?: number;
  locked_until?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MFA Configuration
const MFA_CONFIG = {
  maxAttempts: 3,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  codeExpiry: 5 * 60 * 1000, // 5 minutes
  rateLimitWindow: 60 * 1000, // 1 minute
  maxCodesPerWindow: 3
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: MFAVerificationPayload = await req.json();
    console.log('MFA verification hook triggered for user:', payload.user_id, 'factor:', payload.factor_type);

    // Get client information
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limiting first
    const rateLimitResult = await checkMFARateLimit(supabase, payload.user_id, clientIP);
    if (!rateLimitResult.allowed) {
      await logMFAEvent(supabase, payload, clientIP, userAgent, false, 'rate_limit_exceeded');
      
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: 'Çok fazla MFA denemesi. Lütfen bekleyip tekrar deneyin.',
          locked_until: rateLimitResult.locked_until
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Verify the MFA code
    const verificationResult = await verifyMFACode(supabase, payload);

    // Log the MFA verification attempt
    await logMFAEvent(
      supabase,
      payload,
      clientIP,
      userAgent,
      verificationResult.valid,
      verificationResult.valid ? 'success' : 'invalid_code'
    );

    // Update attempt tracking
    await updateMFAAttempts(supabase, payload.user_id, verificationResult.valid);

    if (!verificationResult.valid) {
      return new Response(
        JSON.stringify({
          error: 'mfa_verification_failed',
          message: verificationResult.message,
          attempts_remaining: verificationResult.attempts_remaining
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // MFA verification successful
    return new Response(
      JSON.stringify({
        success: true,
        message: 'MFA doğrulama başarılı',
        factor_type: payload.factor_type
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('MFA verification hook error:', error);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: 'MFA doğrulama sırasında hata oluştu'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function checkMFARateLimit(
  supabase: any,
  userId: string,
  clientIP: string
): Promise<{ allowed: boolean; locked_until?: string }> {
  try {
    // Check user-based rate limiting
    const { data: userAttempts } = await supabase
      .from('audit_logs')
      .select('timestamp')
      .eq('user_id', userId)
      .eq('event_type', 'mfa_verification_failed')
      .gte('timestamp', new Date(Date.now() - MFA_CONFIG.rateLimitWindow).toISOString())
      .order('timestamp', { ascending: false });

    if (userAttempts && userAttempts.length >= MFA_CONFIG.maxCodesPerWindow) {
      const locked_until = new Date(Date.now() + MFA_CONFIG.lockoutDuration).toISOString();
      return { allowed: false, locked_until };
    }

    // Check IP-based rate limiting
    const { data: ipAttempts } = await supabase
      .from('audit_logs')
      .select('timestamp')
      .eq('ip_address', clientIP)
      .eq('event_type', 'mfa_verification_failed')
      .gte('timestamp', new Date(Date.now() - MFA_CONFIG.rateLimitWindow).toISOString())
      .order('timestamp', { ascending: false });

    if (ipAttempts && ipAttempts.length >= MFA_CONFIG.maxCodesPerWindow * 2) {
      const locked_until = new Date(Date.now() + MFA_CONFIG.lockoutDuration).toISOString();
      return { allowed: false, locked_until };
    }

    return { allowed: true };
  } catch (error) {
    console.error('MFA rate limit check failed:', error);
    return { allowed: true }; // Fail open
  }
}

async function verifyMFACode(
  supabase: any,
  payload: MFAVerificationPayload
): Promise<MFAVerificationResult> {
  try {
    if (payload.factor_type === 'totp') {
      return await verifyTOTPCode(supabase, payload);
    } else if (payload.factor_type === 'phone') {
      return await verifySMSCode(supabase, payload);
    } else {
      return {
        valid: false,
        message: 'Desteklenmeyen MFA türü'
      };
    }
  } catch (error) {
    console.error('MFA code verification failed:', error);
    return {
      valid: false,
      message: 'MFA doğrulama sırasında hata oluştu'
    };
  }
}

async function verifyTOTPCode(
  supabase: any,
  payload: MFAVerificationPayload
): Promise<MFAVerificationResult> {
  try {
    // Get the user's TOTP secret from the factor
    const { data: factor, error } = await supabase.auth.admin
      .getMFAFactor(payload.user_id, payload.factor_id);

    if (error || !factor) {
      return {
        valid: false,
        message: 'MFA faktörü bulunamadı'
      };
    }

    // In a real implementation, you would verify the TOTP code
    // against the secret using a TOTP library like 'otplib'
    // For this example, we'll simulate the verification
    
    const isValidCode = await simulateTOTPVerification(payload.code, factor.secret);

    if (!isValidCode) {
      const attempts = await getMFAAttempts(supabase, payload.user_id);
      return {
        valid: false,
        message: 'Geçersiz doğrulama kodu',
        attempts_remaining: Math.max(0, MFA_CONFIG.maxAttempts - attempts - 1)
      };
    }

    return {
      valid: true,
      message: 'TOTP kodu doğrulandı'
    };

  } catch (error) {
    console.error('TOTP verification failed:', error);
    return {
      valid: false,
      message: 'TOTP doğrulama hatası'
    };
  }
}

async function verifySMSCode(
  supabase: any,
  payload: MFAVerificationPayload
): Promise<MFAVerificationResult> {
  try {
    // Get the stored SMS verification code
    const { data: smsVerification, error } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('challenge_id', payload.challenge_id)
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !smsVerification) {
      return {
        valid: false,
        message: 'SMS doğrulama kodu bulunamadı veya süresi dolmuş'
      };
    }

    // Verify the code
    const isValidCode = smsVerification.code === payload.code;

    if (!isValidCode) {
      const attempts = await getMFAAttempts(supabase, payload.user_id);
      return {
        valid: false,
        message: 'Geçersiz SMS kodu',
        attempts_remaining: Math.max(0, MFA_CONFIG.maxAttempts - attempts - 1)
      };
    }

    // Mark SMS verification as used
    await supabase
      .from('sms_verifications')
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq('id', smsVerification.id);

    return {
      valid: true,
      message: 'SMS kodu doğrulandı'
    };

  } catch (error) {
    console.error('SMS verification failed:', error);
    return {
      valid: false,
      message: 'SMS doğrulama hatası'
    };
  }
}

async function simulateTOTPVerification(code: string, secret: string): Promise<boolean> {
  // In a real implementation, you would use a TOTP library like:
  // import { authenticator } from 'otplib';
  // return authenticator.verify({ token: code, secret: secret });
  
  // For this example, we'll accept any 6-digit code
  return /^\d{6}$/.test(code);
}

async function getMFAAttempts(supabase: any, userId: string): Promise<number> {
  try {
    const { data: attempts } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'mfa_verification_failed')
      .gte('timestamp', new Date(Date.now() - MFA_CONFIG.lockoutDuration).toISOString());

    return attempts ? attempts.length : 0;
  } catch (error) {
    return 0;
  }
}

async function updateMFAAttempts(
  supabase: any,
  userId: string,
  success: boolean
): Promise<void> {
  try {
    if (success) {
      // Reset MFA attempts on successful verification
      await supabase
        .from('user_profiles')
        .update({
          mfa_failed_attempts: 0,
          mfa_locked_until: null,
          last_mfa_success: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Increment failed attempts
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('mfa_failed_attempts')
        .eq('user_id', userId)
        .single();

      const currentAttempts = (userProfile?.mfa_failed_attempts || 0) + 1;
      const updateData: any = { mfa_failed_attempts: currentAttempts };

      if (currentAttempts >= MFA_CONFIG.maxAttempts) {
        updateData.mfa_locked_until = new Date(Date.now() + MFA_CONFIG.lockoutDuration).toISOString();
      }

      await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error('Failed to update MFA attempts:', error);
  }
}

async function logMFAEvent(
  supabase: any,
  payload: MFAVerificationPayload,
  clientIP: string,
  userAgent: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      event_type: success ? 'mfa_verification_success' : 'mfa_verification_failed',
      user_id: payload.user_id,
      ip_address: clientIP,
      user_agent: userAgent,
      success,
      details: {
        factor_type: payload.factor_type,
        factor_id: payload.factor_id,
        challenge_id: payload.challenge_id,
        phone: payload.phone ? `***${payload.phone.slice(-4)}` : undefined,
        failure_reason: failureReason
      },
      risk_level: success ? 'low' : 'medium'
    });
  } catch (error) {
    console.error('Failed to log MFA event:', error);
  }
}