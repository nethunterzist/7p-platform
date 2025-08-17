import { mockApi } from '@/lib/mock-api';
/**
 * JWT Token Refresh API Endpoint
 * Secure token rotation with device validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/auth/security';
import { supabase } from '@/lib/supabase';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

interface RefreshTokenRequest {
  refresh_token?: string;
}

interface RefreshTokenResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RefreshTokenResponse>> {
  try {
    // Get refresh token from request body or cookies
    let refreshToken: string | undefined;
    
    try {
      const body: RefreshTokenRequest = await request.json().catch(() => ({}));
      refreshToken = body.refresh_token;
    } catch {
      // Body parsing failed, continue with cookie check
    }

    if (!refreshToken) {
      refreshToken = request.cookies.get('refresh_token')?.value;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 401 }
      );
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = securityService.verifyJWT(refreshToken, { checkBlacklist: true });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Validate token type
    if (decoded.type !== 'refresh') {
      return NextResponse.json(
        { success: false, error: 'Invalid token type' },
        { status: 401 }
      );
    }

    const { userId, sessionId } = decoded;

    // Validate session exists and is active
    const session = await securityService.validateSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or expired' },
        { status: 401 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, locked_until')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (userData.locked_until && new Date(userData.locked_until) > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Account is locked' },
        { status: 423 }
      );
    }

    // Device fingerprint validation
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = getClientIP(request);
    const currentDeviceFingerprint = securityService.generateDeviceFingerprint(userAgent, ipAddress);

    // Validate device fingerprint if available in token
    if (decoded.dfp && decoded.dfp !== currentDeviceFingerprint) {
      // Log suspicious activity
      await auditLogger.logSecurity(
        'auth.token.device_mismatch',
        userId,
        {
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId,
          expected_fingerprint: decoded.dfp,
          actual_fingerprint: currentDeviceFingerprint
        },
        'high'
      );

      return NextResponse.json(
        { success: false, error: 'Device validation failed' },
        { status: 401 }
      );
    }

    // Revoke old refresh token (token rotation)
    securityService.revokeJWT(refreshToken);

    // Generate new access token
    const newAccessToken = securityService.generateJWT(
      {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        sessionId: session.id
      },
      AUTH_CONFIG.JWT_EXPIRES_IN,
      { 
        sessionId: session.id, 
        deviceFingerprint: currentDeviceFingerprint 
      }
    );

    // Generate new refresh token (token rotation)
    const newRefreshToken = securityService.generateRefreshToken(userData.id, session.id);

    // Update session activity
    await supabase
      .from('user_sessions')
      .update({ 
        updated_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .eq('id', session.id);

    // Log token refresh event
    await auditLogger.logAuth(
      'auth.token.refreshed',
      userId,
      {
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: session.id
      }
    );

    // Calculate expiration time
    const expiresIn = parseInt(AUTH_CONFIG.JWT_EXPIRES_IN.replace(/\D/g, '')) * 3600; // Convert to seconds

    // Create response
    const response = NextResponse.json<RefreshTokenResponse>({
      success: true,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn
    });

    // Set secure HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/'
    };

    response.cookies.set('access_token', newAccessToken, {
      ...cookieOptions,
      maxAge: expiresIn * 1000 // Convert to milliseconds
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Token refresh API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate existing access token
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const accessToken = 
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = securityService.verifyJWT(accessToken, { 
      checkBlacklist: true,
      validateDevice: securityService.generateDeviceFingerprint(
        request.headers.get('user-agent') || 'unknown',
        getClientIP(request)
      )
    });

    // Validate session if present
    if (decoded.sessionId || decoded.sid) {
      const sessionId = decoded.sessionId || decoded.sid;
      const session = await securityService.validateSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { valid: false, error: 'Session expired' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      },
      expires_at: decoded.exp
    });

  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Invalid token' },
      { status: 401 }
    );
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