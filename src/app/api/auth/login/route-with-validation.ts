/**
 * 🔐 Enhanced Login API with Comprehensive Validation
 * 7P Education Platform - Example of Validation Middleware Usage
 * 
 * This is an enhanced version of the login route demonstrating
 * comprehensive input validation and security measures.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAPI, ValidatedRequest } from '@/lib/validation/middleware';
import { loginRequestSchema, LoginRequest } from '@/lib/validation/schemas';
import { securityService } from '@/lib/auth/security';
import { supabase } from '@/lib/supabase';
import { RATE_LIMIT_CONFIG } from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';
import { 
  setAuthCookie, 
  setRefreshCookie, 
  setSessionCookie, 
  setDeviceCookie 
} from '@/lib/auth/secure-cookies';

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

/**
 * 🔐 Enhanced Login Endpoint with Comprehensive Security
 */
export const POST = validateAPI.public<LoginRequest>({
  // Validate request body against schema
  body: loginRequestSchema,
  
  // Apply rate limiting (5 attempts per 15 minutes per IP)
  rateLimit: {
    key: 'login',
    config: RATE_LIMIT_CONFIG.login
  }
})(async (request: ValidatedRequest<LoginRequest>): Promise<NextResponse<LoginResponse>> => {
  try {
    // ✅ Input is already validated by middleware
    const { email, password, mfa_code, remember_me } = request.validatedBody!;

    // Get client information for security tracking
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 🔒 Check if account is locked (additional security layer)
    const isLocked = await securityService.isAccountLocked(email);
    if (isLocked) {
      await securityService.trackLoginAttempt(
        email,
        false,
        ipAddress,
        userAgent,
        'account_locked'
      );

      return NextResponse.json<LoginResponse>(
        { 
          success: false, 
          error: 'Account is temporarily locked due to suspicious activity' 
        },
        { status: 423 }
      );
    }

    // 👤 Get user from database with comprehensive data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id, email, password_hash, name, role, 
        mfa_enabled, mfa_secret, failed_login_attempts, 
        last_login_at, email_verified, account_locked_until
      `)
      .eq('email', email)
      .single();

    if (userError || !userData) {
      await securityService.trackLoginAttempt(
        email,
        false,
        ipAddress,
        userAgent,
        'user_not_found'
      );

      // 🛡️ Generic error to prevent email enumeration
      return NextResponse.json<LoginResponse>(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ✅ Check email verification requirement
    if (!userData.email_verified && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      return NextResponse.json<LoginResponse>(
        { 
          success: false, 
          error: 'Please verify your email address before logging in',
          message: 'Check your email for verification link'
        },
        { status: 403 }
      );
    }

    // 🔐 Verify password using secure bcrypt comparison
    const isPasswordValid = await securityService.verifyPassword(
      password, 
      userData.password_hash
    );
    
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
        email,
        false,
        ipAddress,
        userAgent,
        'invalid_password'
      );

      // 🔒 Auto-lock account after max attempts
      if (failedAttempts >= 5) {
        await securityService.lockAccount(email, 'max_failed_attempts');
      }

      return NextResponse.json<LoginResponse>(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 🔐 MFA validation if enabled
    if (userData.mfa_enabled) {
      if (!mfa_code) {
        return NextResponse.json<LoginResponse>(
          {
            success: false,
            mfa_required: true,
            message: 'MFA code is required'
          },
          { status: 200 }
        );
      }

      const isMfaValid = await verifyMfaCode(
        userData.id, 
        userData.mfa_secret, 
        mfa_code
      );
      
      if (!isMfaValid) {
        await securityService.trackLoginAttempt(
          email,
          false,
          ipAddress,
          userAgent,
          'invalid_mfa'
        );

        return NextResponse.json<LoginResponse>(
          { success: false, error: 'Invalid MFA code' },
          { status: 401 }
        );
      }
    }

    // 🆔 Generate secure device fingerprint
    const deviceFingerprint = securityService.generateDeviceFingerprint(
      userAgent, 
      ipAddress
    );
    
    const deviceId = securityService.generateSecureId();

    // 🎫 Create secure session with enhanced metadata
    const session = await securityService.createSession(
      userData.id, 
      ipAddress, 
      userAgent
    );

    // 🔑 Generate JWT tokens with enhanced security claims
    const tokenExpiration = remember_me ? '7d' : '1h'; // Uses enhanced config
    const accessToken = securityService.generateJWT(
      {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        sessionId: session.id,
        emailVerified: userData.email_verified
      },
      tokenExpiration,
      { 
        sessionId: session.id, 
        deviceFingerprint: deviceFingerprint 
      }
    );

    const refreshToken = securityService.generateRefreshToken(
      userData.id, 
      session.id
    );

    // ✅ Reset failed login attempts and update last login
    await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    // 📊 Track successful login with enhanced metadata
    await securityService.trackLoginAttempt(
      email,
      true,
      ipAddress,
      userAgent
    );

    // 🎯 Comprehensive audit logging
    await auditLogger.logAuth(
      AUDIT_EVENTS.LOGIN_SUCCESS,
      userData.id,
      {
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: session.id,
        device_fingerprint: deviceFingerprint,
        mfa_used: userData.mfa_enabled,
        remember_me: remember_me || false,
        login_method: 'password'
      }
    );

    // 🍪 Create response with secure cookies
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

    // 🔐 Set secure HTTP-only cookies
    setAuthCookie(response, accessToken);
    setRefreshCookie(response, refreshToken);
    setSessionCookie(response, session.id);
    setDeviceCookie(response, deviceId);

    // 🛡️ Additional security headers
    response.headers.set('X-Login-Success', 'true');
    response.headers.set('X-Session-ID', session.id);
    
    return response;

  } catch (error) {
    console.error('Enhanced login API error:', error);
    
    // 📊 Log error for monitoring
    await auditLogger.logError('LOGIN_ERROR', undefined, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json<LoginResponse>(
      { 
        success: false, 
        error: 'Authentication service temporarily unavailable' 
      },
      { status: 503 }
    );
  }
});

/**
 * 🔐 MFA Code Verification
 */
async function verifyMfaCode(
  userId: string, 
  mfaSecret: string, 
  code: string
): Promise<boolean> {
  try {
    // TODO: Implement actual TOTP verification
    // Example implementation with speakeasy:
    // const verified = speakeasy.totp.verify({
    //   secret: mfaSecret,
    //   encoding: 'base32',
    //   token: code,
    //   window: 1
    // });
    // return verified;
    
    // Placeholder - always return true for demo
    console.log(`MFA verification for user ${userId} with code ${code}`);
    return true;
    
  } catch (error) {
    console.error('MFA verification error:', error);
    return false;
  }
}

/**
 * 🌐 Enhanced Client IP Detection
 */
function getClientIP(request: NextRequest): string {
  // Check multiple headers for IP address (common proxy configurations)
  const headers = [
    'x-forwarded-for',
    'x-real-ip', 
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (take first one)
      const ip = value.split(',')[0].trim();
      // Basic IP validation
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  return '127.0.0.1'; // Fallback
}

/**
 * ✅ Basic IP address validation
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}