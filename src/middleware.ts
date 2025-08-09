/**
 * Next.js Middleware
 * Authentication, rate limiting, and security enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SECURITY_HEADERS, RATE_LIMIT_CONFIG } from '@/lib/auth/config';

// Rate limiting storage (in production, use Redis or similar)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/admin',
  '/courses/purchase',
  '/messages'
];

// Admin routes that require admin role
const ADMIN_ROUTES = [
  '/admin'
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/courses',
  '/auth/callback',
  '/auth/mfa-verify',
  '/auth/reset-password'
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

  // Apply rate limiting to specific routes
  if (shouldRateLimit(pathname)) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // Handle authentication for protected routes
  if (shouldCheckAuth(pathname)) {
    return await handleAuthentication(request, response);
  }

  // Handle SSO callbacks
  if (pathname.startsWith('/auth/callback/')) {
    return await handleSSOCallback(request, response);
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
  // Skip public routes
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return false;
  }

  // Check protected routes
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Handle authentication for protected routes with secure JWT validation
 */
async function handleAuthentication(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  try {
    // Get JWT token from cookies or Authorization header
    const accessToken = 
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!accessToken) {
      // No token found, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Import security service dynamically to avoid circular dependencies
    const { securityService } = await import('@/lib/auth/security');
    
    // Verify JWT token with device fingerprint validation
    let decoded: any;
    try {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const ipAddress = getClientIP(request);
      const deviceFingerprint = securityService.generateDeviceFingerprint(userAgent, ipAddress);
      
      decoded = securityService.verifyJWT(accessToken, { 
        checkBlacklist: true,
        validateDevice: deviceFingerprint 
      });
    } catch (jwtError) {
      console.warn('JWT verification failed:', jwtError);
      
      // Try to refresh token if we have a refresh token
      const refreshToken = request.cookies.get('refresh_token')?.value;
      if (refreshToken) {
        // Attempt automatic token refresh
        try {
          const refreshResponse = await fetch(new URL('/api/auth/refresh', request.url), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({ refresh_token: refreshToken })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.success && refreshData.access_token) {
              // Update response with new tokens
              const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                path: '/',
                maxAge: 60 * 60 * 1000 // 1 hour
              };

              response.cookies.set('access_token', refreshData.access_token, cookieOptions);
              response.cookies.set('refresh_token', refreshData.refresh_token, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
              });

              // Verify the new token
              decoded = securityService.verifyJWT(refreshData.access_token, { checkBlacklist: true });
            }
          }
        } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError);
        }
      }

      // If token refresh failed or no refresh token, redirect to login
      if (!decoded) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Validate session if present
    if (decoded.sessionId || decoded.sid) {
      const sessionId = decoded.sessionId || decoded.sid;
      const session = await securityService.validateSession(sessionId);
      if (!session) {
        // Session expired, redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Create Supabase client for additional user data
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

    // Get user profile for additional checks
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, mfa_enabled, locked_until')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      console.error('User profile fetch error:', userError);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if account is locked
    if (userData.locked_until && new Date(userData.locked_until) > new Date()) {
      const lockedUrl = new URL('/auth/account-locked', request.url);
      return NextResponse.redirect(lockedUrl);
    }

    // Check admin routes
    if (isAdminRoute(request.nextUrl.pathname)) {
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // Check MFA requirement for admin users
    if ((userData.role === 'admin' || userData.role === 'super_admin') && 
        userData.mfa_enabled && 
        !request.nextUrl.pathname.startsWith('/auth/mfa-verify')) {
      
      // Check if MFA is verified in session
      const mfaVerified = request.cookies.get('mfa_verified')?.value === 'true';
      if (!mfaVerified) {
        const mfaUrl = new URL('/auth/mfa-verify', request.url);
        mfaUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(mfaUrl);
      }
    }

    // Add user context to headers for API routes
    response.headers.set('X-User-ID', decoded.userId);
    response.headers.set('X-User-Role', userData.role);
    response.headers.set('X-Session-ID', decoded.sessionId || decoded.sid || '');

    return response;

  } catch (error) {
    console.error('Authentication middleware error:', error);
    const loginUrl = new URL('/login', request.url);
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