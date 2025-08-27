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
    // Validate JWT token with NextAuth
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If no valid token, redirect to login with callback
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl, { status: 307 });
    }

    // Additional role-based checks for admin routes
    if (pathname.startsWith('/admin') && token.role !== 'admin') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'insufficient_permissions');
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl, { status: 307 });
    }

    // Valid token - allow access
    return NextResponse.next();
    
  } catch (error) {
    // JWT validation failed - redirect to login
    console.error('Middleware JWT validation error:', error);
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