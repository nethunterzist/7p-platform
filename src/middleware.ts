import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security/middleware';
import { AuthProtectionMiddleware } from '@/middleware/auth-protection';
import { RateLimitMiddleware } from '@/lib/api-security/rate-limit';

// Production security configuration
const SECURITY_CONFIG = {
  enableDDoSProtection: true,
  enableInputValidation: true,
  enableCORSProtection: true,
  enableSecurityHeaders: true,
  enableRateLimit: true,
  enableLogging: true,
  allowedOrigins: [
    'https://7peducation.com',
    'https://www.7peducation.com',
    'https://7peducation.vercel.app'
  ]
};

const PROTECTED_ROUTES = ['/dashboard', '/admin', '/profile', '/settings'];
const API_ROUTES = ['/api/'];
const AUTH_ROUTES = ['/api/auth/'];
const PUBLIC_AUTH_ROUTES = ['/api/auth/signin', '/api/auth/signup', '/api/auth/callback', '/api/auth/session', '/api/auth/csrf'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();
  
  try {
    // Handle API routes with comprehensive security
    if (API_ROUTES.some(route => pathname.startsWith(route))) {
      // Special handling for NextAuth.js routes
      if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
        
        // Apply lighter security for NextAuth.js public routes
        return await APISecurityMiddleware.process(request, {
          enableDDoSProtection: SECURITY_CONFIG.enableDDoSProtection,
          enableInputValidation: false, // NextAuth.js handles its own validation
          enableCORSProtection: isPublicAuthRoute ? false : SECURITY_CONFIG.enableCORSProtection,
          enableSecurityHeaders: true,
          enableRateLimit: !isPublicAuthRoute, // Don't rate limit NextAuth.js session/csrf endpoints
          enableLogging: SECURITY_CONFIG.enableLogging,
          allowedOrigins: SECURITY_CONFIG.allowedOrigins
        });
      }
      
      // Full security for other API routes
      return await APISecurityMiddleware.process(request, {
        enableDDoSProtection: SECURITY_CONFIG.enableDDoSProtection,
        enableInputValidation: SECURITY_CONFIG.enableInputValidation,
        enableCORSProtection: SECURITY_CONFIG.enableCORSProtection,
        enableSecurityHeaders: SECURITY_CONFIG.enableSecurityHeaders,
        enableRateLimit: SECURITY_CONFIG.enableRateLimit,
        enableLogging: SECURITY_CONFIG.enableLogging,
        allowedOrigins: SECURITY_CONFIG.allowedOrigins
      });
    }

    // Skip internal Next.js routes
    if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico')) {
      return NextResponse.next();
    }

    // Apply rate limiting to all routes
    if (SECURITY_CONFIG.enableRateLimit) {
      const rateLimitResult = await RateLimitMiddleware.checkGlobalRateLimit(request);
      if (rateLimitResult.blocked) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': '1000',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + (rateLimitResult.retryAfter || 60)).toString()
          }
        });
      }
    }

    // Handle protected routes with authentication
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      return await AuthProtectionMiddleware.protect(request);
    }

    // Apply security headers to all responses
    const response = NextResponse.next();
    if (SECURITY_CONFIG.enableSecurityHeaders) {
      APISecurityMiddleware.addSecurityHeaders(response);
    }

    // Log request metrics
    if (SECURITY_CONFIG.enableLogging) {
      const duration = Date.now() - startTime;
      console.log(`[Security] ${request.method} ${pathname} - ${duration}ms`);
    }

    return response;

  } catch (error) {
    console.error('[Middleware Error]:', error);
    
    // Log security incident
    if (SECURITY_CONFIG.enableLogging) {
      await APISecurityMiddleware.logSecurityEvent(request, 'middleware_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathname,
        timestamp: new Date().toISOString()
      });
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  }
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
  // Note: Edge runtime is automatically enabled for middleware in Next.js 15
};