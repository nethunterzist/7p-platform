/**
 * Authentication Login API Endpoint
 * Secure JWT-based authentication with enhanced security features
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/auth/security';
import { supabase } from '@/lib/supabase';
import { AUTH_CONFIG, RATE_LIMIT_CONFIG } from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

interface LoginRequest {
  email: string;
  password: string;
  mfa_code?: string;
  remember_me?: boolean;
}

interface LoginResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    mfa_enabled: boolean;
  };
  mfa_required?: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, mfa_code, remember_me } = body;

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = securityService.sanitizeInput(email.toLowerCase());
    if (!securityService.isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get client information for security tracking
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Rate limiting check
    const rateLimit = await securityService.checkRateLimit(
      `login:${ipAddress}`,
      RATE_LIMIT_CONFIG.login
    );

    if (!rateLimit.allowed) {
      await securityService.trackLoginAttempt(
        sanitizedEmail,
        false,
        ipAddress,
        userAgent,
        'rate_limit_exceeded'
      );

      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many login attempts. Please try again later.',
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

    // Check if account is locked
    const isLocked = await securityService.isAccountLocked(sanitizedEmail);
    if (isLocked) {
      await securityService.trackLoginAttempt(
        sanitizedEmail,
        false,
        ipAddress,
        userAgent,
        'account_locked'
      );

      return NextResponse.json(
        { success: false, error: 'Account is temporarily locked due to suspicious activity' },
        { status: 423 }
      );
    }

    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, role, mfa_enabled, mfa_secret, failed_login_attempts, last_login_at')
      .eq('email', sanitizedEmail)
      .single();

    if (userError || !userData) {
      await securityService.trackLoginAttempt(
        sanitizedEmail,
        false,
        ipAddress,
        userAgent,
        'user_not_found'
      );

      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await securityService.verifyPassword(password, userData.password_hash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = (userData.failed_login_attempts || 0) + 1;
      
      await supabase
        .from('users')
        .update({ 
          failed_login_attempts: failedAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id);

      await securityService.trackLoginAttempt(
        sanitizedEmail,
        false,
        ipAddress,
        userAgent,
        'invalid_password'
      );

      // Lock account after max attempts
      if (failedAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
        await securityService.lockAccount(sanitizedEmail, 'max_failed_attempts');
      }

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check MFA if enabled
    if (userData.mfa_enabled) {
      if (!mfa_code) {
        return NextResponse.json(
          {
            success: false,
            mfa_required: true,
            message: 'MFA code is required'
          },
          { status: 200 }
        );
      }

      // Verify MFA code (implementation would depend on MFA service)
      const isMfaValid = await verifyMfaCode(userData.id, userData.mfa_secret, mfa_code);
      if (!isMfaValid) {
        await securityService.trackLoginAttempt(
          sanitizedEmail,
          false,
          ipAddress,
          userAgent,
          'invalid_mfa'
        );

        return NextResponse.json(
          { success: false, error: 'Invalid MFA code' },
          { status: 401 }
        );
      }
    }

    // Generate device fingerprint
    const deviceFingerprint = securityService.generateDeviceFingerprint(userAgent, ipAddress);

    // Create session
    const session = await securityService.createSession(userData.id, ipAddress, userAgent);

    // Generate JWT tokens with enhanced security
    const tokenExpiration = remember_me ? '7d' : AUTH_CONFIG.JWT_EXPIRES_IN;
    const accessToken = securityService.generateJWT(
      {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        sessionId: session.id
      },
      tokenExpiration,
      { sessionId: session.id, deviceFingerprint }
    );

    const refreshToken = securityService.generateRefreshToken(userData.id, session.id);

    // Reset failed login attempts and update last login
    await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    // Track successful login
    await securityService.trackLoginAttempt(
      sanitizedEmail,
      true,
      ipAddress,
      userAgent
    );

    // Audit log
    await auditLogger.logAuth(
      AUDIT_EVENTS.LOGIN_SUCCESS,
      userData.id,
      {
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: session.id,
        mfa_used: userData.mfa_enabled
      }
    );

    // Set secure HTTP-only cookies
    const response = NextResponse.json<LoginResponse>({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        mfa_enabled: userData.mfa_enabled
      }
    });

    // Set secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: remember_me ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000 // 7 days or 1 hour
    };

    response.cookies.set('access_token', accessToken, cookieOptions);
    response.cookies.set('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
    });

    if (userData.mfa_enabled) {
      response.cookies.set('mfa_verified', 'true', {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours MFA grace period
      });
    }

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify MFA code (placeholder implementation)
 */
async function verifyMfaCode(userId: string, mfaSecret: string, code: string): Promise<boolean> {
  // This would integrate with your MFA service (TOTP, SMS, etc.)
  // For now, return true as placeholder
  // In production, implement proper TOTP verification
  try {
    // TODO: Implement actual MFA verification
    // Example: Use speakeasy library for TOTP verification
    return true;
  } catch (error) {
    console.error('MFA verification error:', error);
    return false;
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