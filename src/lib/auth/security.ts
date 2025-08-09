/**
 * Security Utilities
 * Password validation, session management, rate limiting
 */

import crypto from 'crypto-js';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { 
  PasswordPolicy, 
  RateLimitConfig, 
  SecurityHeaders, 
  AuthError,
  LoginAttempt,
  User 
} from '@/lib/types/auth';
import { 
  AUTH_CONFIG, 
  DEFAULT_PASSWORD_POLICY, 
  RATE_LIMIT_CONFIG, 
  SECURITY_HEADERS,
  AUDIT_EVENTS 
} from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';

export interface PasswordStrength {
  score: number;
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  meets_policy: boolean;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  reset_time: number;
  retry_after?: number;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  device_fingerprint?: string;
}

export class SecurityService {
  private static instance: SecurityService;
  private rateLimitStore = new Map<string, { count: number; window_start: number }>();

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Validate password strength against policy
   */
  validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < policy.min_length) {
      feedback.push(`Password must be at least ${policy.min_length} characters long`);
    } else {
      score += 1;
    }

    // Character requirements
    if (policy.require_uppercase && !/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else if (policy.require_uppercase) {
      score += 1;
    }

    if (policy.require_lowercase && !/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else if (policy.require_lowercase) {
      score += 1;
    }

    if (policy.require_numbers && !/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else if (policy.require_numbers) {
      score += 1;
    }

    if (policy.require_symbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else if (policy.require_symbols) {
      score += 1;
    }

    // Additional strength checks
    if (password.length >= 12) score += 1;
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeating characters');
      score -= 1;
    }

    // Common password patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /welcome/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      feedback.push('Avoid common password patterns');
      score -= 2;
    }

    score = Math.max(0, Math.min(5, score));

    const strengthMap: Record<number, PasswordStrength['strength']> = {
      0: 'very-weak',
      1: 'very-weak',
      2: 'weak',
      3: 'fair',
      4: 'good',
      5: 'strong'
    };

    return {
      score,
      strength: strengthMap[score],
      feedback,
      meets_policy: score >= policy.complexity_score && feedback.length === 0
    };
  }

  /**
   * Check if password was previously used
   */
  async checkPasswordReuse(userId: string, newPassword: string, preventReuse: number): Promise<boolean> {
    try {
      if (preventReuse === 0) return false;

      const { data, error } = await supabase
        .from('password_history')
        .select('password_hash')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(preventReuse);

      if (error) {
        console.error('Password history check error:', error);
        return false;
      }

      const newPasswordHash = this.hashPassword(newPassword);
      return data.some(record => record.password_hash === newPasswordHash);
    } catch (error) {
      console.error('Password reuse check error:', error);
      return false;
    }
  }

  /**
   * Store password in history
   */
  async storePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('password_history')
        .insert([{
          user_id: userId,
          password_hash: passwordHash,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Password history storage error:', error);
      }
    } catch (error) {
      console.error('Password history storage error:', error);
    }
  }
  
  /**
   * Migrate legacy password hash to new secure format
   * SECURITY: This helps transition from old JWT-secret-based hashes to secure bcrypt
   */
  async migrateLegacyPasswordHash(userId: string, plainPassword: string): Promise<void> {
    try {
      // Generate new secure hash
      const newSecureHash = await this.hashPassword(plainPassword);
      
      // Update user's password hash in database
      const { error } = await supabase
        .from('users')
        .update({ 
          password_hash: newSecureHash,
          password_migrated: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('Password migration error:', error);
        throw error;
      }
      
      console.log(`✅ Password migrated to secure format for user: ${userId}`);
    } catch (error) {
      console.error('Legacy password migration error:', error);
      throw error;
    }
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitStatus> {
    const now = Date.now();
    const stored = this.rateLimitStore.get(key);

    if (!stored || now - stored.window_start > config.window_ms) {
      // New window
      this.rateLimitStore.set(key, { count: 1, window_start: now });
      return {
        allowed: true,
        remaining: config.max_requests - 1,
        reset_time: now + config.window_ms
      };
    }

    if (stored.count >= config.max_requests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        reset_time: stored.window_start + config.window_ms,
        retry_after: Math.ceil((stored.window_start + config.window_ms - now) / 1000)
      };
    }

    // Increment count
    stored.count++;
    this.rateLimitStore.set(key, stored);

    return {
      allowed: true,
      remaining: config.max_requests - stored.count,
      reset_time: stored.window_start + config.window_ms
    };
  }

  /**
   * Track login attempt
   */
  async trackLoginAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    failureReason?: string
  ): Promise<void> {
    try {
      const attempt: Partial<LoginAttempt> = {
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        failure_reason: failureReason,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('login_attempts')
        .insert([attempt]);

      if (error) {
        console.error('Login attempt tracking error:', error);
      }

      // Check for suspicious activity
      if (!success) {
        await this.checkSuspiciousActivity(email, ipAddress);
      }
    } catch (error) {
      console.error('Login attempt tracking error:', error);
    }
  }

  /**
   * Check for suspicious login activity
   */
  private async checkSuspiciousActivity(email: string, ipAddress: string): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check failed attempts in last hour
      const { data: failedAttempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .eq('success', false)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Suspicious activity check error:', error);
        return;
      }

      const recentFailures = failedAttempts?.length || 0;

      // Check for brute force (5+ failures in 1 hour)
      if (recentFailures >= 5) {
        await auditLogger.logSecurity(
          AUDIT_EVENTS.BRUTE_FORCE_DETECTED,
          undefined,
          {
            email,
            ip_address: ipAddress,
            failed_attempts: recentFailures
          },
          'critical'
        );

        // Lock account if exists
        await this.lockAccount(email, 'brute_force');
      }

      // Check for distributed attacks (same IP, multiple emails)
      const { data: ipAttempts } = await supabase
        .from('login_attempts')
        .select('email')
        .eq('ip_address', ipAddress)
        .eq('success', false)
        .gte('created_at', oneHourAgo);

      const uniqueEmails = new Set(ipAttempts?.map(a => a.email) || []);
      if (uniqueEmails.size >= 10) {
        await auditLogger.logSecurity(
          AUDIT_EVENTS.SUSPICIOUS_LOGIN,
          undefined,
          {
            ip_address: ipAddress,
            unique_emails: uniqueEmails.size,
            type: 'distributed_attack'
          },
          'critical'
        );
      }
    } catch (error) {
      console.error('Suspicious activity analysis error:', error);
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(email: string, reason: string): Promise<void> {
    try {
      const lockDuration = AUTH_CONFIG.LOCKOUT_DURATION;
      const lockedUntil = new Date(Date.now() + lockDuration).toISOString();

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!userData) return;

      const { error } = await supabase
        .from('users')
        .update({
          locked_until: lockedUntil,
          failed_login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (error) {
        console.error('Account lock error:', error);
        return;
      }

      await auditLogger.logSecurity(
        AUDIT_EVENTS.ACCOUNT_LOCKED,
        userData.id,
        {
          email,
          reason,
          locked_until: lockedUntil
        },
        'high'
      );
    } catch (error) {
      console.error('Account lock error:', error);
    }
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          locked_until: null,
          failed_login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Account unlock error:', error);
        return;
      }

      await auditLogger.logSecurity(
        AUDIT_EVENTS.ACCOUNT_UNLOCKED,
        userId,
        { manual_unlock: true },
        'medium'
      );
    } catch (error) {
      console.error('Account unlock error:', error);
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('locked_until')
        .eq('email', email)
        .single();

      if (error || !data) return false;

      if (data.locked_until) {
        const lockExpiry = new Date(data.locked_until);
        if (lockExpiry > new Date()) {
          return true;
        } else {
          // Auto-unlock expired locks
          await supabase
            .from('users')
            .update({ locked_until: null })
            .eq('email', email);
        }
      }

      return false;
    } catch (error) {
      console.error('Account lock check error:', error);
      return false;
    }
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const fingerprint = `${userAgent}_${ipAddress}`;
    return crypto.SHA256(fingerprint).toString();
  }

  /**
   * Create secure session
   */
  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<SessionInfo> {
    try {
      const sessionId = this.generateSecureId();
      const expiresAt = new Date(Date.now() + AUTH_CONFIG.SESSION_TIMEOUT).toISOString();
      const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);

      const sessionInfo: SessionInfo = {
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true,
        device_fingerprint: deviceFingerprint
      };

      const { error } = await supabase
        .from('user_sessions')
        .insert([sessionInfo]);

      if (error) {
        console.error('Session creation error:', error);
        throw new AuthError('Failed to create session', {
          code: 'SESSION_CREATION_FAILED'
        });
      }

      return sessionInfo;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (error || !data) return null;

      // Check if session expired
      if (new Date(data.expires_at) < new Date()) {
        await this.invalidateSession(sessionId);
        return null;
      }

      return data as SessionInfo;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) {
        console.error('Session invalidation error:', error);
      }
    } catch (error) {
      console.error('Session invalidation error:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Session cleanup error:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Hash password with secure salt (FIXED: Removed JWT secret reuse vulnerability)
   * Uses bcrypt with individual salt per password for cryptographic security
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Generate cryptographically secure salt (cost factor 12 = 2^12 iterations)
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Password hashing failed');
    }
  }
  
  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random ID
   */
  generateSecureId(): string {
    return crypto.lib.WordArray.random(32).toString();
  }

  // JWT token blacklist for revoked tokens
  private static tokenBlacklist = new Set<string>();
  
  /**
   * Generate secure JWT token with enhanced security claims
   */
  generateJWT(
    payload: any, 
    expiresIn: string = AUTH_CONFIG.JWT_EXPIRES_IN,
    options: { sessionId?: string; deviceFingerprint?: string } = {}
  ): string {
    try {
      // Generate unique token ID for revocation capability
      const jti = this.generateSecureId();
      const now = Math.floor(Date.now() / 1000);
      
      // Create enhanced payload with security claims
      const enhancedPayload = {
        ...payload,
        jti, // JWT ID for unique identification
        iat: now, // Issued at
        nbf: now, // Not before (prevent premature token usage)
        iss: AUTH_CONFIG.JWT_ISSUER, // Issuer
        aud: AUTH_CONFIG.JWT_AUDIENCE, // Audience
        ...(options.sessionId && { sid: options.sessionId }), // Session ID binding
        ...(options.deviceFingerprint && { dfp: options.deviceFingerprint }) // Device fingerprint
      };
      
      return jwt.sign(enhancedPayload, AUTH_CONFIG.JWT_SECRET, { 
        expiresIn,
        algorithm: AUTH_CONFIG.JWT_ALGORITHM
      });
    } catch (error) {
      console.error('JWT generation error:', error);
      throw new AuthError('Token generation failed', { code: 'TOKEN_GENERATION_FAILED' });
    }
  }

  /**
   * Verify JWT token with enhanced security validation
   */
  verifyJWT(token: string, options: { checkBlacklist?: boolean; validateDevice?: string } = {}): any {
    try {
      // Verify token signature and decode
      const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET, {
        algorithms: [AUTH_CONFIG.JWT_ALGORITHM],
        issuer: AUTH_CONFIG.JWT_ISSUER,
        audience: AUTH_CONFIG.JWT_AUDIENCE
      }) as any;
      
      // Check if token is blacklisted (revoked)
      if (options.checkBlacklist !== false && decoded.jti && SecurityService.tokenBlacklist.has(decoded.jti)) {
        throw new AuthError('Token has been revoked', { code: 'TOKEN_REVOKED' });
      }
      
      // Validate device fingerprint if provided
      if (options.validateDevice && decoded.dfp && decoded.dfp !== options.validateDevice) {
        throw new AuthError('Token device mismatch', { code: 'TOKEN_DEVICE_MISMATCH' });
      }
      
      // Validate not-before claim
      const now = Math.floor(Date.now() / 1000);
      if (decoded.nbf && decoded.nbf > now) {
        throw new AuthError('Token not yet valid', { code: 'TOKEN_NOT_YET_VALID' });
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      // Handle JWT library errors
      if (error.name === 'TokenExpiredError') {
        throw new AuthError('Token has expired', { code: 'TOKEN_EXPIRED' });
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthError('Invalid token format', { code: 'INVALID_TOKEN_FORMAT' });
      } else if (error.name === 'NotBeforeError') {
        throw new AuthError('Token not active yet', { code: 'TOKEN_NOT_ACTIVE' });
      }
      
      console.error('JWT verification error:', error);
      throw new AuthError('Token verification failed', { code: 'TOKEN_VERIFICATION_FAILED' });
    }
  }
  
  /**
   * Revoke JWT token by adding to blacklist
   */
  revokeJWT(token: string): void {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.jti) {
        SecurityService.tokenBlacklist.add(decoded.jti);
        console.log(`✅ JWT token revoked: ${decoded.jti}`);
      }
    } catch (error) {
      console.error('JWT revocation error:', error);
    }
  }
  
  /**
   * Clean up expired tokens from blacklist
   */
  cleanupExpiredTokens(): void {
    // Note: In production, implement proper cleanup based on token expiry
    // This is a simple implementation for demonstration
    if (SecurityService.tokenBlacklist.size > 10000) {
      SecurityService.tokenBlacklist.clear();
      console.log('✅ Token blacklist cleaned up');
    }
  }
  
  /**
   * Generate refresh token with rotation capability
   */
  generateRefreshToken(userId: string, sessionId: string): string {
    const payload = {
      userId,
      sessionId,
      type: 'refresh',
      version: 1 // For token rotation
    };
    
    return this.generateJWT(payload, AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN);
  }

  /**
   * Get security headers
   */
  getSecurityHeaders(): SecurityHeaders {
    return SECURITY_HEADERS;
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"']/g, '')
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
}

export const securityService = SecurityService.getInstance();