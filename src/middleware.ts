/**
 * PRODUCTION SECURITY MIDDLEWARE
 * JWT Token validation with NextAuth integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/courses') ||  // Public course browsing
    pathname.startsWith('/marketplace') // Public marketplace
  ) {
    return NextResponse.next();
  }
  
  // Define protected routes
  const isProtectedRoute = pathname.startsWith('/admin') || 
                          pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/student') ||
                          pathname.startsWith('/settings');
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  try {
    // Try NextAuth JWT token first
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If NextAuth token exists, check role for admin routes
    if (token) {
      if (pathname.startsWith('/admin') && token.role !== 'admin') {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'insufficient_permissions');
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl, { status: 307 });
      }
      return NextResponse.next();
    }

    // Check for fallback auth token (localStorage-based)
    const authToken = request.cookies.get('auth_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '');

    // Check for simple session cookie (for localStorage auth)
    const simpleSession = request.cookies.get('simple-auth-session');

    // If no tokens found, redirect to login
    if (!authToken && !simpleSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl, { status: 307 });
    }

    // Allow access if any auth method is present
    return NextResponse.next();
    
  } catch (error) {
    // Auth validation failed - redirect to login
    console.error('Middleware auth validation error:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl, { status: 307 });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};