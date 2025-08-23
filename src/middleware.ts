import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security/middleware';
import { AuthProtectionMiddleware } from '@/middleware/auth-protection';

const PROTECTED_ROUTES = ['/dashboard', '/admin', '/profile', '/settings'];
const API_ROUTES = ['/api/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Apply basic security checks to all API routes
  if (API_ROUTES.some(route => pathname.startsWith(route))) {
    const securityCheck = await APISecurityMiddleware.protect(request);
    if (securityCheck) {
      return securityCheck;
    }

    const validationCheck = await APISecurityMiddleware.validateInput(request);
    if (validationCheck) {
      return validationCheck;
    }
  }

  // Handle protected routes with authentication
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    return await AuthProtectionMiddleware.protect(request);
  }

  // For all other routes, just continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    // Include API routes for security processing
    '/api/:path*'
  ]
};