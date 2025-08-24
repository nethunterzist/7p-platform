import { NextRequest, NextResponse } from 'next/server';
import { AuthProtectionMiddleware } from './middleware/auth-protection';

export async function middleware(request: NextRequest) {
  // 🔐 SECURITY: Enable comprehensive authentication and session protection
  return await AuthProtectionMiddleware.protect(request);
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