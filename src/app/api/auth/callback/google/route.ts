/**
 * Google OAuth Callback Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { googleSSO } from '@/lib/auth/providers/google';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Google OAuth error:', error);
    
    await auditLogger.logAuth(
      AUDIT_EVENTS.SSO_LOGIN_FAILURE,
      undefined,
      {
        provider: 'google',
        error: error,
        error_description: searchParams.get('error_description')
      },
      'high'
    );

    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'Google authentication failed');
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Verify state parameter (CSRF protection)
    const cookieStore = cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    
    if (state && storedState && state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Handle Google OAuth callback
    const { user, session } = await googleSSO.handleLogin(code, state);

    // Set session cookies
    if (session) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      
      // Set secure cookies
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

      // Clear state cookie
      response.cookies.delete('google_oauth_state');

      return response;
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error) {
    console.error('Google callback processing error:', error);
    
    await auditLogger.logAuth(
      AUDIT_EVENTS.SSO_LOGIN_FAILURE,
      undefined,
      {
        provider: 'google',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'high'
    );

    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'Google authentication processing failed');
    return NextResponse.redirect(errorUrl);
  }
}

export async function POST(request: NextRequest) {
  return new NextResponse('Method not allowed', { status: 405 });
}