import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip internal Next.js routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if route needs authentication
  const needsAuth = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (!needsAuth) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken = request.cookies.get('auth_token');
  
  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};