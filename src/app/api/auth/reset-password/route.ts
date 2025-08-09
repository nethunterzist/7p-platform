/**
 * Password Reset API Endpoint
 * Secure password reset with email verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/auth/security';
import { supabase } from '@/lib/supabase';
import { AUTH_CONFIG, RATE_LIMIT_CONFIG, DEFAULT_PASSWORD_POLICY } from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

interface ResetPasswordRequest {
  email?: string;
  token?: string;
  new_password?: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
  password_feedback?: string[];
}

/**
 * POST - Request password reset (send reset email)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedEmail = securityService.sanitizeInput(email.toLowerCase());
    if (!securityService.isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get client information
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Rate limiting check
    const rateLimit = await securityService.checkRateLimit(
      `password_reset:${ipAddress}`,
      RATE_LIMIT_CONFIG.password_reset
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many password reset attempts. Please try again later.',
          retry_after: rateLimit.retry_after
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimit.retry_after?.toString() || '60'
          }
        }
      );
    }

    // Check if user exists (but don't reveal if they don't)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', sanitizedEmail)
      .single();

    if (userData) {
      // Generate secure reset token
      const resetToken = securityService.generateSecureId();

      // Store reset token in database
      await supabase
        .from('password_resets')
        .insert([{
          user_id: userData.id,
          token: resetToken,
          email: sanitizedEmail,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          created_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        }]);

      // Send reset email
      await sendPasswordResetEmail(sanitizedEmail, userData.name, resetToken);

      // Log password reset request
      await auditLogger.logAuth(
        AUDIT_EVENTS.PASSWORD_RESET,
        userData.id,
        {
          ip_address: ipAddress,
          user_agent: userAgent,
          email: sanitizedEmail
        }
      );
    } else {
      // Log suspicious password reset attempt
      await auditLogger.logSecurity(
        'auth.password_reset.unknown_email',
        undefined,
        {
          email: sanitizedEmail,
          ip_address: ipAddress,
          user_agent: userAgent
        },
        'high'
      );
    }

    // Always return success to prevent email enumeration
    return NextResponse.json<ResetPasswordResponse>({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Complete password reset with token
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return NextResponse.json(
        { success: false, error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    // Get client information
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate password strength
    const passwordValidation = securityService.validatePassword(new_password, DEFAULT_PASSWORD_POLICY);
    if (!passwordValidation.meets_policy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password does not meet security requirements',
          password_feedback: passwordValidation.feedback
        },
        { status: 400 }
      );
    }

    // Find valid reset token
    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .select('user_id, email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (resetError || !resetData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Check if token was already used
    if (resetData.used_at) {
      return NextResponse.json(
        { success: false, error: 'Reset token has already been used' },
        { status: 400 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('id', resetData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 400 }
      );
    }

    // Check password reuse
    const isPasswordReused = await securityService.checkPasswordReuse(
      userData.id, 
      new_password, 
      DEFAULT_PASSWORD_POLICY.prevent_reuse
    );

    if (isPasswordReused) {
      return NextResponse.json(
        { success: false, error: 'Cannot reuse recent passwords' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await securityService.hashPassword(new_password);

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        failed_login_attempts: 0, // Reset failed attempts
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Store new password in history
    await securityService.storePasswordHistory(userData.id, newPasswordHash);

    // Mark reset token as used
    await supabase
      .from('password_resets')
      .update({
        used_at: new Date().toISOString(),
        used_by_ip: ipAddress
      })
      .eq('token', token);

    // Invalidate all user sessions (force re-login)
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userData.id);

    // Log password change
    await auditLogger.logAuth(
      AUDIT_EVENTS.PASSWORD_CHANGE,
      userData.id,
      {
        ip_address: ipAddress,
        user_agent: userAgent,
        method: 'reset_token',
        sessions_invalidated: true
      }
    );

    return NextResponse.json<ResetPasswordResponse>({
      success: true,
      message: 'Password has been successfully reset. Please log in with your new password.'
    });

  } catch (error) {
    console.error('Password reset completion error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Validate reset token
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Reset token is required' },
        { status: 400 }
      );
    }

    // Find reset token
    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .select('expires_at, used_at')
      .eq('token', token)
      .single();

    if (resetError || !resetData) {
      return NextResponse.json(
        { valid: false, error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Check if token was already used
    if (resetData.used_at) {
      return NextResponse.json(
        { valid: false, error: 'Reset token has already been used' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Reset token is valid'
    });

  } catch (error) {
    console.error('Reset token validation error:', error);
    
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send password reset email (placeholder implementation)
 */
async function sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
  try {
    // TODO: Send actual email using your email service
    // Example: SendGrid, AWS SES, Resend, etc.
    
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}`;
    
    console.log(`📧 Password reset email sent to ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    
    // In production, send email with reset link and security information
    
  } catch (error) {
    console.error('Password reset email sending error:', error);
  }
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  return realIP || clientIP || '127.0.0.1';
}