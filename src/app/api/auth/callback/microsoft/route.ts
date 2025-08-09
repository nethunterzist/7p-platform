/**
 * Microsoft OAuth Callback Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { microsoftSSO } from '@/lib/auth/providers/microsoft';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('Microsoft OAuth error:', error, errorDescription);
    
    await auditLogger.logAuth(
      AUDIT_EVENTS.SSO_LOGIN_FAILURE,
      undefined,
      {
        provider: 'microsoft',
        error: error,
        error_description: errorDescription
      },
      'high'
    );

    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'Microsoft authentication failed');
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Initialize Microsoft SSO
    await microsoftSSO.initialize();

    // For Microsoft, the actual authentication happens in the client-side popup
    // This callback is mainly for handling the redirect flow if used
    
    // Redirect to dashboard - the client-side auth will handle the actual login
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Set a flag to indicate Microsoft callback was processed
    response.cookies.set('microsoft_callback_processed', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 // 1 minute
    });

    return response;

  } catch (error) {
    console.error('Microsoft callback processing error:', error);
    
    await auditLogger.logAuth(
      AUDIT_EVENTS.SSO_LOGIN_FAILURE,
      undefined,
      {
        provider: 'microsoft',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'high'
    );

    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'Microsoft authentication processing failed');
    return NextResponse.redirect(errorUrl);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authResult } = body;

    if (!authResult) {
      return NextResponse.json(
        { error: 'No authentication result provided' },
        { status: 400 }
      );
    }

    // Handle Microsoft SSO login with auth result from client
    const { user, session } = await microsoftSSO.handleLogin(authResult);

    // Create response with session data
    const response = NextResponse.json({
      success: true,
      user,
      redirect: '/dashboard'
    });

    // Set session cookies if available
    if (session) {
      response.cookies.set('access_token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: session.expires_in || 3600
      });

      if (session.refresh_token) {
        response.cookies.set('refresh_token', session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });
      }
    }

    return response;

  } catch (error) {
    console.error('Microsoft callback POST error:', error);
    
    await auditLogger.logAuth(
      AUDIT_EVENTS.SSO_LOGIN_FAILURE,
      undefined,
      {
        provider: 'microsoft',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'high'
    );

    return NextResponse.json(
      { error: 'Microsoft authentication processing failed' },
      { status: 500 }
    );
  }
}