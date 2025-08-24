/**
 * AUTH PROTECTION MIDDLEWARE - 7P Education
 * Enterprise-grade authentication and session protection
 * Refactored to use Vercel KV for stateless environments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/utils/supabase/server';
import { PRODUCTION_AUTH_CONFIG, AUTH_SECURITY_HEADERS } from '@/lib/auth/production-config';
import { EnhancedSessionSecurity } from '@/lib/auth/session-security-enhancements';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';
import { kv } from '@vercel/kv';

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
      // Store CSRF token in KV with a short expiration
      await kv.set(`csrf:${csrfToken}`, 'valid', { ex: 60 * 60 }); // 1 hour expiration
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
      const supabase = createSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return this.redirectToLogin(request);
      }
      
      // 🛡️ ENHANCED SESSION VALIDATION with Risk Assessment
      const sessionId = session.access_token.slice(-8);
      const requestMetadata = {
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        path: request.nextUrl.pathname,
        method: request.method
      };

      const riskAssessment = await EnhancedSessionSecurity.validateSessionWithRiskAssessment(
        sessionId,
        session.user.id,
        requestMetadata
      );

      if (!riskAssessment.isValid) {
        // Log security event
        await auditLogger.logSecurity(
          AUDIT_EVENTS.SESSION_INVALIDATED,
          session.user.id,
          {
            sessionId,
            reason: riskAssessment.reason,
            riskScore: riskAssessment.riskScore,
            ipAddress: requestMetadata.ipAddress,
            path: requestMetadata.path
          },
          'high'
        );

        // Clear invalid session
        await supabase.auth.signOut();
        return this.redirectToLogin(request, riskAssessment.reason);
      }

      // 🚨 Handle security actions based on risk score
      if (riskAssessment.actionRequired !== 'NONE') {
        return await this.handleSecurityAction(
          riskAssessment.actionRequired,
          riskAssessment.riskScore,
          riskAssessment.threats,
          session.user.id,
          sessionId,
          request
        );
      }

      // ✅ Session is valid with acceptable risk - continue with legacy validation
      const sessionValid = await this.validateSession(session, request);
      if (!sessionValid.isValid) {
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
      await this.updateSessionActivity(session, request);

      // Add security headers based on risk score
      if (riskAssessment.riskScore > 50) {
        response.headers.set('X-Security-Warning', 'elevated-risk');
        response.headers.set('X-Risk-Score', riskAssessment.riskScore.toString());
      }
      
      return response;
      
    } catch (error) {
      console.error('[Auth Protection] Error:', error);
      return this.redirectToLogin(request);
    }
  }
  
  /**
   * 🚨 Handle Security Actions based on Risk Assessment
   */
  private static async handleSecurityAction(
    actionRequired: 'MFA_REQUIRED' | 'FORCE_LOGOUT' | 'SECURITY_REVIEW',
    riskScore: number,
    threats: any[],
    userId: string,
    sessionId: string,
    request: NextRequest
  ): Promise<NextResponse> {
    
    // Log high-risk security event
    await auditLogger.logSecurity(
      AUDIT_EVENTS.HIGH_RISK_ACTIVITY,
      userId,
      {
        sessionId,
        riskScore,
        actionRequired,
        threatCount: threats.length,
        highestThreatSeverity: threats.reduce(
          (max: string, t: any) => t.severity > max ? t.severity : max, 
          'LOW'
        ),
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        path: request.nextUrl.pathname
      },
      'critical'
    );

    switch (actionRequired) {
      case 'FORCE_LOGOUT':
        // Immediately terminate session
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        
        return NextResponse.json(
          { 
            error: 'Security violation detected. Session terminated for your protection.',
            action: 'FORCE_LOGOUT',
            riskScore,
            code: 'SECURITY_VIOLATION'
          },
          { status: 401 }
        );

      case 'MFA_REQUIRED':
        return NextResponse.json(
          { 
            error: 'Additional verification required due to suspicious activity.',
            action: 'MFA_REQUIRED',
            riskScore,
            code: 'MFA_CHALLENGE',
            redirect: '/auth/mfa-challenge'
          },
          { status: 403 }
        );

      case 'SECURITY_REVIEW':
        return NextResponse.json(
          { 
            error: 'Account flagged for security review. Please contact support.',
            action: 'SECURITY_REVIEW',
            riskScore,
            code: 'SECURITY_REVIEW',
            contact: 'security@7peducation.com'
          },
          { status: 423 } // Locked
        );

      default:
        return this.redirectToLogin(request, 'SECURITY_ACTION_REQUIRED');
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
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return false;
    }
    
    // Check if token exists in KV and delete it to prevent reuse
    const tokenExists = await kv.get(`csrf:${cookieToken}`);
    if (tokenExists) {
      await kv.del(`csrf:${cookieToken}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Check rate limiting
   */
  private static async checkRateLimit(request: NextRequest): Promise<{ blocked: boolean; retryAfter?: number }> {
    const clientIP = this.getClientIP(request);
    const now = Date.now();
    const key = `rate_limit:${clientIP}`;
    const config = PRODUCTION_AUTH_CONFIG.rateLimit.loginAttempts;
    
    let limitData: RateLimitData | null = await kv.get(key);
    
    if (!limitData) {
      limitData = { attempts: 1, firstAttempt: now };
      await kv.set(key, limitData, { ex: config.windowMs / 1000 }); // Use expiration
      return { blocked: false };
    }
    
    // Check if locked
    if (limitData.lockUntil && limitData.lockUntil > now) {
      const retryAfter = Math.ceil((limitData.lockUntil - now) / 1000);
      return { blocked: true, retryAfter };
    }
    
    // Increment attempts
    limitData.attempts++;
    
    // Check if limit exceeded
    if (limitData.attempts > config.maxAttempts) {
      limitData.lockUntil = now + config.lockoutDuration;
      await kv.set(key, limitData, { ex: config.lockoutDuration / 1000 });
      
      await this.logSecurityEvent('rate_limit_exceeded', {
        ipAddress: clientIP,
        attempts: limitData.attempts,
        timestamp: new Date().toISOString()
      });
      
      const retryAfter = Math.ceil(config.lockoutDuration / 1000);
      return { blocked: true, retryAfter };
    }
    
    await kv.set(key, limitData);
    return { blocked: false };
  }
  
  /**
   * Validate session
   */
  private static async validateSession(session: any, request: NextRequest): Promise<{ isValid: boolean; reason?: string }> {
    const now = Date.now();
    const sessionKey = `session:${session.user.id}:${session.access_token.slice(-8)}`;
    
    let sessionData: SessionData | null = await kv.get(sessionKey);
    
    if (!sessionData) {
      sessionData = {
        userId: session.user.id,
        sessionId: session.access_token.slice(-8),
        createdAt: now,
        lastActivity: now,
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        isValid: true
      };
      await kv.set(sessionKey, sessionData, { ex: PRODUCTION_AUTH_CONFIG.session.absoluteTimeout / 1000 });
    }
    
    // Check session age
    const sessionAge = now - sessionData.createdAt;
    if (sessionAge > PRODUCTION_AUTH_CONFIG.session.absoluteTimeout) {
      await kv.del(sessionKey);
      return { isValid: false, reason: 'SESSION_EXPIRED' };
    }
    
    // Check inactivity
    const inactivityTime = now - sessionData.lastActivity;
    if (inactivityTime > PRODUCTION_AUTH_CONFIG.session.inactivityTimeout) {
      await kv.del(sessionKey);
      return { isValid: false, reason: 'INACTIVE_SESSION' };
    }
    
    // Check IP consistency
    const currentIP = this.getClientIP(request);
    if (sessionData.ipAddress !== currentIP) {
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
    const userSessionKeys = [];
    for await (const key of kv.scanIterator({ match: `session:${userId}:*` })) {
      userSessionKeys.push(key);
    }
    
    const maxSessions = PRODUCTION_AUTH_CONFIG.session.maxConcurrentSessions;
    
    if (userSessionKeys.length >= maxSessions) {
      await this.logSecurityEvent('max_concurrent_sessions', {
        userId,
        currentSessions: userSessionKeys.length,
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
  private static async updateSessionActivity(session: any, request: NextRequest): Promise<void> {
    const sessionKey = `session:${session.user.id}:${session.access_token.slice(-8)}`;
    const sessionData: SessionData | null = await kv.get(sessionKey);

    if (sessionData) {
      sessionData.lastActivity = Date.now();
      await kv.set(sessionKey, sessionData, { ex: PRODUCTION_AUTH_CONFIG.session.absoluteTimeout / 1000 });
    }
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
    
    return realIP || request.ip || 'unknown';
  }
  
  private static isAuthPath(pathname: string): boolean {
    const authPaths = ['/login', '/register', '/reset-password', '/verify-email', '/auth'];
    return authPaths.some(path => pathname.startsWith(path));
  }
  
  private static isProtectedPath(pathname: string): boolean {
    const protectedPaths = ['/dashboard', '/profile', '/courses', '/admin', '/settings'];
    return protectedPaths.some(path => pathname.startsWith(path));
  }
  
  private static addSecurityHeaders(response: NextResponse): void {
    Object.entries(AUTH_SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value as string);
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
      console.log(`[Security Event] ${eventType}:`, data);
      // In a real-world scenario, you would send this to a dedicated logging or security monitoring service.
      // For example, using a Supabase table or a third-party service.
    } catch (error) {
      console.error('[Auth Protection] Failed to log security event:', error);
    }
  }

  /**
   * 🧹 Cleanup expired sessions periodically
   */
  static async performSessionCleanup(): Promise<{ cleaned: number; errors: number }> {
    try {
      const cleanedCount = await EnhancedSessionSecurity.cleanupExpiredSessions();
      
      console.log(`[Session Cleanup] Cleaned up ${cleanedCount} expired sessions`);
      
      return { cleaned: cleanedCount, errors: 0 };
    } catch (error) {
      console.error('[Session Cleanup] Failed:', error);
      return { cleaned: 0, errors: 1 };
    }
  }

  /**
   * 🎯 Create Enhanced Session (for use in login endpoints)
   */
  static async createEnhancedUserSession(
    userId: string,
    sessionId: string,
    request: NextRequest,
    options: {
      mfaVerified?: boolean;
      deviceTrusted?: boolean;
      geolocation?: any;
    } = {}
  ): Promise<void> {
    const metadata = {
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      deviceFingerprint: this.generateDeviceFingerprint(request),
      ...options
    };

    await EnhancedSessionSecurity.createEnhancedSession(userId, sessionId, metadata);
  }

  /**
   * 🔍 Generate Device Fingerprint
   */
  private static generateDeviceFingerprint(request: NextRequest): string {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const ipAddress = this.getClientIP(request);
    
    // Create a simple fingerprint from available headers
    const fingerprint = Buffer.from(
      `${userAgent}${acceptLanguage}${acceptEncoding}${ipAddress}`
    ).toString('base64').slice(0, 32);
    
    return fingerprint;
  }
}

export default AuthProtectionMiddleware;
