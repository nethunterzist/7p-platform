/**
 * Next.js Middleware
 * Authentication, rate limiting, and security enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
// Supabase SSR removed - using mock API
import { SECURITY_HEADERS, RATE_LIMIT_CONFIG } from '@/lib/auth/config';

// Rate limiting storage (in production, use Redis or similar)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/courses/purchase',
  '/messages'
];

// Admin routes that require admin role
const ADMIN_ROUTES = [
  '/admin'
];

// Public routes that don't require authentication (supports both exact and prefix matching)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/courses',      // This allows /courses and /courses/* 
  '/auth/callback',
  '/auth/mfa-verify',
  '/auth/reset-password',
  '/library',      // Public access to library
  '/discussions',  // Public discussions
  '/marketplace',  // Public marketplace browsing
  '/help',         // Help pages
  '/support'       // Support pages
];

// API routes that require rate limiting
const API_RATE_LIMITED = [
  '/api/auth',
  '/api/admin'
];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Add security headers to all responses
  addSecurityHeaders(response);

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    handleCORS(request, response);
  }

  // Apply rate limiting to specific routes (keep this for security)
  if (shouldRateLimit(pathname)) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // Simple Supabase authentication for protected routes
  if (shouldCheckAuth(pathname)) {
    return await handleSupabaseAuth(request, response);
  }

  return response;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

/**
 * Handle CORS for API routes
 */
function handleCORS(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }
}

/**
 * Check if route should be rate limited
 */
function shouldRateLimit(pathname: string): boolean {
  return API_RATE_LIMITED.some(route => pathname.startsWith(route));
}

/**
 * Apply rate limiting
 */
async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  
  // Determine rate limit config based on path
  let config = RATE_LIMIT_CONFIG.api;
  if (pathname.includes('/auth/login')) {
    config = RATE_LIMIT_CONFIG.login;
  } else if (pathname.includes('/auth/register')) {
    config = RATE_LIMIT_CONFIG.register;
  } else if (pathname.includes('/auth/reset')) {
    config = RATE_LIMIT_CONFIG.password_reset;
  }

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const windowStart = now - config.window_ms;

  // Clean up old entries
  for (const [k, v] of rateLimit.entries()) {
    if (v.resetTime < now) {
      rateLimit.delete(k);
    }
  }

  const current = rateLimit.get(key);
  
  if (!current || current.resetTime < windowStart) {
    // New window
    rateLimit.set(key, { count: 1, resetTime: now + config.window_ms });
    return null;
  }

  if (current.count >= config.max_requests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: config.message || 'Too many requests',
        retry_after: retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.max_requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString()
        }
      }
    );
  }

  // Increment counter
  current.count++;
  rateLimit.set(key, current);
  
  return null;
}

/**
 * Check if route requires authentication
 */
function shouldCheckAuth(pathname: string): boolean {
  // Skip Next.js internal and API routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return false;
  }

  // Skip public routes (both exact match and prefix match)
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    return pathname === route || pathname.startsWith(route + '/');
  });
  
  if (isPublicRoute) {
    return false;
  }

  // Check if it's explicitly a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  return isProtectedRoute;
}

/**
 * Simple Supabase authentication for protected routes
 */
async function handleSupabaseAuth(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  try {
    // Create Supabase client with minimal cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get session with timeout protection
    const { data: { session }, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      )
    ]);
    
    // Handle session validation errors
    if (error) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }
    
    // Redirect to login if no valid session
    if (!session?.user) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Add minimal user context to headers
    response.headers.set('X-User-ID', session.user.id);
    response.headers.set('X-User-Email', session.user.email || '');
    
    return response;
    
  } catch (error) {
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Middleware auth error:', error);
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'auth_error');
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Handle SSO callback routes
 */
async function handleSSOCallback(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  if (pathname === '/auth/callback/google') {
    return await handleGoogleCallback(request, response);
  } else if (pathname === '/auth/callback/microsoft') {
    return await handleMicrosoftCallback(request, response);
  }

  return response;
}

/**
 * Handle Google OAuth callback
 */
async function handleGoogleCallback(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
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
    // The actual Google SSO handling would be done in the API route
    // This just redirects to the processing endpoint
    const callbackUrl = new URL('/api/auth/callback/google', request.url);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);
    
    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'Google authentication processing failed');
    return NextResponse.redirect(errorUrl);
  }
}

/**
 * Handle Microsoft OAuth callback
 */
async function handleMicrosoftCallback(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  // Microsoft OAuth handling would be similar to Google
  // The actual processing happens in the API route
  const callbackUrl = new URL('/api/auth/callback/microsoft', request.url);
  return NextResponse.redirect(callbackUrl);
}

/**
 * Check if route is admin-only
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
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
  ],
};