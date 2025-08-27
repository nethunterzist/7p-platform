/**
 * Next.js Middleware for Auth Protection
 * Edge-safe minimal authentication middleware
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static files, and public pages
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next();
  }
  
  // Check if user is on a protected route
  const isProtectedRoute = pathname.startsWith('/admin') || 
                          pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/student');
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth session token)
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                      request.cookies.get('__Secure-next-auth.session-token');

  // If no session token, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session exists, allow access (NextAuth will handle validation)
  return NextResponse.next();
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