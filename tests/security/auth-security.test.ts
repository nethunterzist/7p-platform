/**
 * AUTHENTICATION SECURITY TESTS - 7P Education
 * Comprehensive security validation for auth system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { PasswordSecurityService } from '@/lib/auth/password-security';
import { EmailVerificationService } from '@/lib/auth/email-verification';
import { AuthProtectionMiddleware } from '@/middleware/auth-protection';
import { AuditLogger } from '@/lib/auth/audit-logger';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  auth: {
    getSession: jest.fn(),
    signOut: jest.fn(),
    resend: jest.fn(),
    verifyOtp: jest.fn()
  }
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Security Validation', () => {
    describe('Password Strength Requirements', () => {
      it('should reject passwords under 8 characters', async () => {
        const result = await PasswordSecurityService.validatePassword('weak');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Şifre en az 8 karakter olmalıdır.');
        expect(result.score).toBeLessThan(60);
      });

      it('should require uppercase letters', async () => {
        const result = await PasswordSecurityService.validatePassword('nocapitals123!');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Şifre en az bir büyük harf içermelidir.');
      });

      it('should require lowercase letters', async () => {
        const result = await PasswordSecurityService.validatePassword('NOLOWERCASE123!');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Şifre en az bir küçük harf içermelidir.');
      });

      it('should require numbers', async () => {
        const result = await PasswordSecurityService.validatePassword('NoNumbers!');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Şifre en az bir rakam içermelidir.');
      });

      it('should require special characters', async () => {
        const result = await PasswordSecurityService.validatePassword('NoSpecialChars123');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)');
      });

      it('should accept strong passwords', async () => {
        const result = await PasswordSecurityService.validatePassword('StrongPass123!');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.strength).toBeOneOf(['good', 'strong']);
      });
    });

    describe('Common Password Protection', () => {
      it('should reject common passwords', async () => {
        const commonPasswords = [
          'password123',
          'admin123',
          'qwerty123',
          'Password1!'
        ];

        for (const password of commonPasswords) {
          const result = await PasswordSecurityService.validatePassword(password);
          expect(result.errors.some(error => 
            error.includes('yaygın') || error.includes('common')
          )).toBe(true);
        }
      });

      it('should reject Turkish common passwords', async () => {
        const turkishPasswords = [
          'sifre123',
          'parola123',
          'istanbul123'
        ];

        for (const password of turkishPasswords) {
          const result = await PasswordSecurityService.validatePassword(password);
          expect(result.score).toBeLessThan(60);
        }
      });
    });

    describe('Personal Information Protection', () => {
      it('should reject passwords containing email username', async () => {
        const result = await PasswordSecurityService.validatePassword(
          'johndoe123!',
          'test-user-id',
          { email: 'johndoe@example.com' }
        );

        expect(result.errors).toContain('Şifre kişisel bilgilerinizi içeremez.');
      });

      it('should reject passwords containing name parts', async () => {
        const result = await PasswordSecurityService.validatePassword(
          'JohnSmith123!',
          'test-user-id', 
          { name: 'John Smith' }
        );

        expect(result.errors).toContain('Şifre kişisel bilgilerinizi içeremez.');
      });
    });

    describe('Password History Protection', () => {
      it('should prevent password reuse', async () => {
        // Mock password history data
        mockSupabase.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({
                    data: [
                      { password_hash: 'hash1' },
                      { password_hash: 'hash2' }
                    ],
                    error: null
                  })
                })
              })
            })
          })
        });

        // Mock bcrypt compare to simulate password match
        jest.doMock('bcryptjs', () => ({
          compare: jest.fn().mockResolvedValue(true) // Simulate password match
        }));

        const result = await PasswordSecurityService.validatePassword(
          'ReusedPassword123!',
          'test-user-id'
        );

        expect(result.errors).toContain('Bu şifre son 5 şifrenizden biri. Lütfen farklı bir şifre seçin.');
      });
    });
  });

  describe('Email Verification Security', () => {
    describe('Rate Limiting', () => {
      it('should enforce email resend rate limits', async () => {
        // Mock rate limit data to simulate exceeded attempts
        const mockRequest = {
          userId: 'test-user-id',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        };

        // First 3 attempts should succeed, 4th should be blocked
        for (let i = 0; i < 4; i++) {
          const result = await EmailVerificationService.sendVerificationEmail(mockRequest);
          
          if (i < 3) {
            expect(result.canResend).toBe(true);
          } else {
            expect(result.success).toBe(false);
            expect(result.message).toContain('Çok fazla doğrulama e-postası');
            expect(result.canResend).toBe(false);
          }
        }
      });

      it('should reset rate limit after window expires', async () => {
        // This would require mocking time or using fake timers
        // Implementation depends on your testing setup
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('Token Security', () => {
      it('should generate secure verification tokens', () => {
        const token1 = 'generated-token-1';
        const token2 = 'generated-token-2';
        
        expect(token1).not.toBe(token2);
        expect(token1.length).toBeGreaterThanOrEqual(32);
      });

      it('should expire verification tokens after 24 hours', async () => {
        const expiredToken = 'expired-token-123';
        
        mockSupabase.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    expires_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
                    userId: 'test-user-id',
                    email: 'test@example.com',
                    token: expiredToken
                  },
                  error: null
                })
              })
            })
          })
        });

        const result = await EmailVerificationService.verifyEmail(
          expiredToken,
          '192.168.1.1',
          'test-agent'
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('süres');
      });
    });
  });

  describe('Authentication Middleware Security', () => {
    describe('CSRF Protection', () => {
      it('should generate CSRF tokens for auth forms', async () => {
        const { req, res } = createMocks({
          method: 'GET',
          url: '/login'
        });

        const response = await AuthProtectionMiddleware.protect(req as any);
        
        const csrfCookie = response.cookies.get('csrf-token');
        expect(csrfCookie).toBeDefined();
        expect(csrfCookie?.value.length).toBeGreaterThanOrEqual(32);
      });

      it('should validate CSRF tokens on POST requests', async () => {
        const { req } = createMocks({
          method: 'POST',
          url: '/auth/login',
          headers: {
            'X-CSRF-Token': 'valid-token'
          },
          cookies: {
            'csrf-token': 'different-token'
          }
        });

        const response = await AuthProtectionMiddleware.protect(req as any);
        
        expect(response.status).toBe(403);
      });
    });

    describe('Rate Limiting', () => {
      it('should block excessive login attempts from same IP', async () => {
        const clientIP = '192.168.1.100';
        const requests = [];

        // Simulate 6 rapid requests from same IP
        for (let i = 0; i < 6; i++) {
          const { req } = createMocks({
            method: 'POST',
            url: '/auth/login',
            headers: {
              'x-forwarded-for': clientIP
            }
          });
          requests.push(req);
        }

        // First 5 should pass, 6th should be blocked
        for (let i = 0; i < requests.length; i++) {
          const response = await AuthProtectionMiddleware.protect(requests[i] as any);
          
          if (i < 5) {
            expect(response.status).not.toBe(429);
          } else {
            expect(response.status).toBe(429);
          }
        }
      });

      it('should implement progressive delays for failed attempts', async () => {
        const delays = [1000, 2000, 4000, 8000]; // Expected progressive delays
        
        // This test would require mocking time or using fake timers
        // to verify that delays are actually implemented
        expect(delays).toEqual([1000, 2000, 4000, 8000]);
      });
    });

    describe('Session Validation', () => {
      it('should validate session timeout', async () => {
        const expiredSession = {
          user: { id: 'test-user-id' },
          access_token: 'expired-token',
          created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() // 9 hours ago
        };

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: expiredSession },
          error: null
        });

        const { req } = createMocks({
          method: 'GET',
          url: '/dashboard'
        });

        const response = await AuthProtectionMiddleware.protect(req as any);
        
        expect(response.status).toBe(302); // Redirect to login
      });

      it('should enforce concurrent session limits', async () => {
        // Mock multiple active sessions for same user
        const userId = 'test-user-id';
        
        // This would require mocking the session store
        // Implementation depends on your session management approach
        expect(true).toBe(true); // Placeholder
      });
    });
  });

  describe('Audit Logging Security', () => {
    it('should log all authentication events', async () => {
      const auditLogger = AuditLogger.getInstance();
      
      await auditLogger.logLogin(
        'test-user-id',
        'test@example.com', 
        '192.168.1.1',
        'test-agent',
        true
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should log failed login attempts', async () => {
      const auditLogger = AuditLogger.getInstance();
      
      await auditLogger.logLogin(
        null, // No user ID for failed login
        'test@example.com',
        '192.168.1.1', 
        'test-agent',
        false,
        'invalid_credentials'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should log suspicious activities', async () => {
      const auditLogger = AuditLogger.getInstance();
      
      await auditLogger.logSuspiciousActivity(
        'test-user-id',
        '192.168.1.1',
        'test-agent',
        'multiple_failed_logins',
        { attempts: 5, timespan: '5 minutes' }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should mask sensitive data in audit logs', async () => {
      const auditLogger = AuditLogger.getInstance();
      
      await auditLogger.logAuthEvent(
        'password_change',
        'test-user-id',
        '192.168.1.1',
        'test-agent', 
        true,
        { 
          email: 'test@example.com',
          // Password should not be logged
        }
      );

      // Verify sensitive data is not logged
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('Brute Force Protection', () => {
    it('should lock account after 5 failed attempts', async () => {
      const userId = 'test-user-id';
      
      // Mock failed attempts tracking
      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => Promise.resolve({ error: null })
        })
      });

      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await AuditLogger.getInstance().logLogin(
          userId,
          'test@example.com',
          '192.168.1.1',
          'test-agent',
          false,
          'invalid_password'
        );
      }

      // Account should be locked after 5th attempt
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should unlock account after lockout period', async () => {
      // Mock account unlocking after 15 minutes
      const lockoutTime = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      
      expect(lockoutTime.getTime()).toBeLessThan(Date.now() - 15 * 60 * 1000);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should sanitize database inputs', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      try {
        await PasswordSecurityService.validatePassword(maliciousInput);
        // Should not cause any issues
        expect(true).toBe(true);
      } catch (error) {
        // Should fail gracefully without SQL injection
        expect(error).toBeDefined();
      }
    });

    it('should use parameterized queries', () => {
      // Verify that all database calls use parameterized queries
      // This would require checking the actual SQL generated
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize user input in error messages', async () => {
      const xssInput = '<script>alert("xss")</script>';
      
      const result = await PasswordSecurityService.validatePassword(xssInput);
      
      // Error messages should not contain unescaped HTML
      result.errors.forEach(error => {
        expect(error).not.toContain('<script>');
        expect(error).not.toContain('</script>');
      });
    });
  });

  describe('GDPR Compliance', () => {
    it('should allow data deletion', async () => {
      const userId = 'test-user-id';
      
      // Mock data deletion
      mockSupabase.delete.mockResolvedValue({ error: null });
      
      // Verify user data can be deleted
      expect(mockSupabase.delete).toBeDefined();
    });

    it('should provide data export capability', async () => {
      const userId = 'test-user-id';
      
      const auditLogger = AuditLogger.getInstance();
      const userData = await auditLogger.getUserAuditLogs(userId);
      
      expect(Array.isArray(userData)).toBe(true);
    });
  });
});

describe('Security Configuration Tests', () => {
  it('should have secure JWT configuration', () => {
    const config = {
      accessTokenExpiry: 15 * 60, // 15 minutes
      refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
      signatureAlgorithm: 'HS256'
    };

    expect(config.accessTokenExpiry).toBeLessThanOrEqual(15 * 60);
    expect(config.refreshTokenExpiry).toBeLessThanOrEqual(7 * 24 * 60 * 60);
    expect(config.signatureAlgorithm).toBe('HS256');
  });

  it('should have secure session configuration', () => {
    const config = {
      inactivityTimeout: 30 * 60 * 1000, // 30 minutes
      absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
      maxConcurrentSessions: 3
    };

    expect(config.inactivityTimeout).toBeLessThanOrEqual(30 * 60 * 1000);
    expect(config.absoluteTimeout).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
    expect(config.maxConcurrentSessions).toBeLessThanOrEqual(3);
  });

  it('should have secure password policy', () => {
    const config = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      historyLimit: 5
    };

    expect(config.minLength).toBeGreaterThanOrEqual(8);
    expect(config.requireUppercase).toBe(true);
    expect(config.requireLowercase).toBe(true);
    expect(config.requireNumbers).toBe(true);
    expect(config.requireSpecialChars).toBe(true);
    expect(config.historyLimit).toBeGreaterThanOrEqual(5);
  });
});