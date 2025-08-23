/**
 * AUTH PROTECTION MIDDLEWARE - 7P Education
 * Enterprise-grade authentication and session protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PRODUCTION_AUTH_CONFIG, AUTH_SECURITY_HEADERS } from '@/lib/auth/production-config';

// CSRF token management
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';

interface SessionData {
  userId: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  isValid: boolean;
}

interface RateLimitData {
  attempts: number;
  firstAttempt: number;
  lockUntil?: number;
}

// In-memory stores (in production, use Redis or database)
const sessionStore = new Map<string, SessionData>();
const rateLimitStore = new Map<string, RateLimitData>();
const csrfTokenStore = new Map<string, string>();

export class AuthProtectionMiddleware {
  
  /**
   * Main middleware function
   */
  static async protect(request: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next();
    
    // Add security headers
    this.addSecurityHeaders(response);
    
    // Handle auth-related paths
    if (this.isAuthPath(request.nextUrl.pathname)) {
      return await this.handleAuthPath(request, response);
    }
    
    // Handle protected paths
    if (this.isProtectedPath(request.nextUrl.pathname)) {
      return await this.handleProtectedPath(request, response);
    }
    
    return response;
  }
  
  /**
   * Handle authentication paths (login, register, etc.)
   */
  private static async handleAuthPath(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    
    // Generate CSRF token for auth forms
    if (method === 'GET' && (pathname.includes('login') || pathname.includes('register'))) {
      const csrfToken = this.generateCSRFToken();
      response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 // 1 hour
      });
    }
    
    // Validate CSRF for auth POST requests
    if (method === 'POST') {
      const csrfValid = await this.validateCSRFToken(request);
      if (!csrfValid) {
        return NextResponse.json(
          { error: 'CSRF token geçersiz. Sayfayı yenileyip tekrar deneyin.' },
          { status: 403 }
        );
      }
    }
    
    // Apply rate limiting
    const rateLimitResult = await this.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      return NextResponse.json(
        { 
          error: 'Çok fazla deneme. Lütfen bekleyip tekrar deneyin.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }
    
    return response;
  }
  
  /**
   * Handle protected paths
   */
  private static async handleProtectedPath(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return this.redirectToLogin(request);
      }
      
      // Validate session
      const sessionValid = await this.validateSession(session, request);
      if (!sessionValid.isValid) {
        // Clear invalid session
        await supabase.auth.signOut();
        return this.redirectToLogin(request, sessionValid.reason);
      }
      
      // Check concurrent sessions
      const concurrentCheck = await this.checkConcurrentSessions(session.user.id, request);
      if (!concurrentCheck.allowed) {
        return NextResponse.json(
          { error: 'Maksimum eş zamanlı oturum sayısını aştınız. Diğer cihazlardan çıkış yapın.' },
          { status: 429 }
        );
      }
      
      // Update session activity
      await this.updateSessionActivity(session.user.id, request);
      
      return response;
      
    } catch (error) {
      console.error('[Auth Protection] Error:', error);
      return this.redirectToLogin(request);
    }
  }
  
  /**
   * Generate CSRF token
   */
  private static generateCSRFToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < CSRF_TOKEN_LENGTH; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
  
  /**
   * Validate CSRF token
   */
  private static async validateCSRFToken(request: NextRequest): Promise<boolean> {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get('X-CSRF-Token');
    
    if (!cookieToken || !headerToken) {
      return false;
    }
    
    return cookieToken === headerToken;
  }
  
  /**
   * Check rate limiting
   */
  private static async checkRateLimit(request: NextRequest): Promise<{ blocked: boolean; retryAfter?: number }> {
    const clientIP = this.getClientIP(request);
    const now = Date.now();
    const key = `rate_limit:${clientIP}`;
    
    let limitData = rateLimitStore.get(key);
    
    if (!limitData) {
      limitData = {
        attempts: 1,
        firstAttempt: now
      };
      rateLimitStore.set(key, limitData);
      return { blocked: false };
    }
    
    // Check if locked
    if (limitData.lockUntil && limitData.lockUntil > now) {
      const retryAfter = Math.ceil((limitData.lockUntil - now) / 1000);
      return { blocked: true, retryAfter };
    }
    
    // Reset window if expired
    const config = PRODUCTION_AUTH_CONFIG.rateLimit.loginAttempts;
    if (now - limitData.firstAttempt > config.windowMs) {
      limitData = {
        attempts: 1,
        firstAttempt: now
      };
      rateLimitStore.set(key, limitData);
      return { blocked: false };
    }
    
    // Increment attempts
    limitData.attempts++;
    
    // Check if limit exceeded
    if (limitData.attempts > config.maxAttempts) {
      limitData.lockUntil = now + config.lockoutDuration;
      rateLimitStore.set(key, limitData);
      
      // Log security event
      await this.logSecurityEvent('rate_limit_exceeded', {
        ipAddress: clientIP,
        attempts: limitData.attempts,
        timestamp: new Date().toISOString()
      });
      
      const retryAfter = Math.ceil(config.lockoutDuration / 1000);
      return { blocked: true, retryAfter };
    }
    
    rateLimitStore.set(key, limitData);
    return { blocked: false };
  }
  
  /**
   * Validate session
   */
  private static async validateSession(session: any, request: NextRequest): Promise<{ isValid: boolean; reason?: string }> {
    const now = Date.now();
    const sessionKey = `session:${session.user.id}:${session.access_token.slice(-8)}`;
    
    let sessionData = sessionStore.get(sessionKey);
    
    if (!sessionData) {
      // First time seeing this session
      sessionData = {
        userId: session.user.id,
        sessionId: session.access_token.slice(-8),
        createdAt: now,
        lastActivity: now,
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        isValid: true
      };
      sessionStore.set(sessionKey, sessionData);
    }
    
    // Check session age
    const sessionAge = now - sessionData.createdAt;
    if (sessionAge > PRODUCTION_AUTH_CONFIG.session.absoluteTimeout) {
      return { isValid: false, reason: 'SESSION_EXPIRED' };
    }
    
    // Check inactivity
    const inactivityTime = now - sessionData.lastActivity;
    if (inactivityTime > PRODUCTION_AUTH_CONFIG.session.inactivityTimeout) {
      return { isValid: false, reason: 'INACTIVE_SESSION' };
    }
    
    // Check IP consistency (allow some flexibility for mobile networks)
    const currentIP = this.getClientIP(request);
    if (sessionData.ipAddress !== currentIP) {
      // Log suspicious activity but don't block (mobile IPs can change)
      await this.logSecurityEvent('ip_change', {
        userId: session.user.id,
        oldIP: sessionData.ipAddress,
        newIP: currentIP,
        timestamp: new Date().toISOString()
      });
    }
    
    return { isValid: true };
  }
  
  /**
   * Check concurrent sessions
   */
  private static async checkConcurrentSessions(userId: string, request: NextRequest): Promise<{ allowed: boolean }> {
    const userSessions = Array.from(sessionStore.entries())
      .filter(([key, data]) => data.userId === userId && data.isValid)
      .length;
    
    const maxSessions = PRODUCTION_AUTH_CONFIG.session.maxConcurrentSessions;
    
    if (userSessions >= maxSessions) {
      // Log security event
      await this.logSecurityEvent('max_concurrent_sessions', {
        userId,
        currentSessions: userSessions,
        maxAllowed: maxSessions,
        timestamp: new Date().toISOString()
      });
      
      return { allowed: false };
    }
    
    return { allowed: true };
  }
  
  /**
   * Update session activity
   */
  private static async updateSessionActivity(userId: string, request: NextRequest): Promise<void> {
    const sessionEntries = Array.from(sessionStore.entries())
      .filter(([key, data]) => data.userId === userId);
    
    sessionEntries.forEach(([key, data]) => {
      data.lastActivity = Date.now();
      sessionStore.set(key, data);
    });
  }
  
  /**
   * Utility functions
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || 'unknown';
  }
  
  private static isAuthPath(pathname: string): boolean {
    const authPaths = ['/login', '/register', '/reset-password', '/verify-email', '/auth'];
    return authPaths.some(path => pathname.startsWith(path));
  }
  
  private static isProtectedPath(pathname: string): boolean {
    const protectedPaths = ['/dashboard', '/profile', '/courses', '/admin', '/settings'];
    const publicPaths = ['/', '/about', '/contact', '/privacy', '/terms', '/_next', '/api/health'];
    
    // Check if explicitly public
    if (publicPaths.some(path => pathname.startsWith(path))) {
      return false;
    }
    
    // Check if explicitly protected
    return protectedPaths.some(path => pathname.startsWith(path));
  }
  
  private static addSecurityHeaders(response: NextResponse): void {
    Object.entries(AUTH_SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  private static redirectToLogin(request: NextRequest, reason?: string): NextResponse {
    const loginUrl = new URL('/login', request.url);
    
    if (reason) {
      loginUrl.searchParams.set('reason', reason);
    }
    
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    
    return NextResponse.redirect(loginUrl);
  }
  
  private static async logSecurityEvent(eventType: string, data: any): Promise<void> {
    try {
      // In production, send to security monitoring service
      console.log(`[Security Event] ${eventType}:`, data);
      
      // TODO: Send to audit logging service
      // await auditLogger.log(eventType, data);
    } catch (error) {
      console.error('[Auth Protection] Failed to log security event:', error);
    }
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = PRODUCTION_AUTH_CONFIG.session.absoluteTimeout;
  
  // Clean session store
  for (const [key, data] of sessionStore.entries()) {
    if (now - data.createdAt > maxAge) {
      sessionStore.delete(key);
    }
  }
  
  // Clean rate limit store
  for (const [key, data] of rateLimitStore.entries()) {
    const windowMs = PRODUCTION_AUTH_CONFIG.rateLimit.loginAttempts.windowMs;
    if (now - data.firstAttempt > windowMs && (!data.lockUntil || data.lockUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export default AuthProtectionMiddleware;