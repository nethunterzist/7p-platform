/**
 * Authentication Logout API Endpoint
 * Secure JWT token invalidation and session cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/auth/security';
import { supabase } from '@/lib/supabase';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LogoutResponse>> {
  try {
    // Get tokens from cookies or Authorization header
    const accessToken = 
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No active session found' },
        { status: 401 }
      );
    }

    let userId: string | undefined;
    let sessionId: string | undefined;

    try {
      // Verify and decode the access token to get user info
      const decoded = securityService.verifyJWT(accessToken, { checkBlacklist: false });
      userId = decoded.userId;
      sessionId = decoded.sessionId || decoded.sid;
    } catch (error) {
      // Even if token is invalid/expired, we should still clean up cookies
      console.warn('Token verification failed during logout:', error);
    }

    // Revoke the access token by adding to blacklist
    securityService.revokeJWT(accessToken);

    // Revoke refresh token if present
    if (refreshToken) {
      securityService.revokeJWT(refreshToken);
    }

    // Invalidate session if we have session ID
    if (sessionId) {
      await securityService.invalidateSession(sessionId);
    }

    // If we have user ID, log the logout event
    if (userId) {
      await auditLogger.logAuth(
        AUDIT_EVENTS.LOGOUT,
        userId,
        {
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || 'unknown',
          session_id: sessionId
        }
      );
    }

    // Create response and clear all auth-related cookies
    const response = NextResponse.json<LogoutResponse>({
      success: true,
      message: 'Successfully logged out'
    });

    // Clear authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0 // Expire immediately
    };

    response.cookies.set('access_token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('mfa_verified', '', cookieOptions);

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    
    // Even if there's an error, we should still clear cookies
    const response = NextResponse.json<LogoutResponse>(
      { success: false, error: 'Logout error occurred, but session cleared' },
      { status: 500 }
    );

    // Clear cookies even on error
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0
    };

    response.cookies.set('access_token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('mfa_verified', '', cookieOptions);

    return response;
  }
}

/**
 * Handle logout for all sessions (logout everywhere)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<LogoutResponse>> {
  try {
    const accessToken = 
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No active session found' },
        { status: 401 }
      );
    }

    let userId: string | undefined;

    try {
      // Verify and decode the access token to get user info
      const decoded = securityService.verifyJWT(accessToken, { checkBlacklist: false });
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Invalidate all user sessions
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (sessionError) {
      console.error('Error invalidating all sessions:', sessionError);
    }

    // Log the logout all event
    await auditLogger.logAuth(
      AUDIT_EVENTS.LOGOUT,
      userId,
      {
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent') || 'unknown',
        logout_type: 'all_sessions'
      }
    );

    // Create response and clear cookies
    const response = NextResponse.json<LogoutResponse>({
      success: true,
      message: 'Successfully logged out from all devices'
    });

    // Clear authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0
    };

    response.cookies.set('access_token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('mfa_verified', '', cookieOptions);

    return response;

  } catch (error) {
    console.error('Logout all sessions API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
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