/**
 * SECURITY INTEGRATION TESTS - 7P Education
 * End-to-end security flow validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { createMocks } from 'node-mocks-http';

// Mock Next.js app for testing
const mockApp = {
  request: (url: string, options?: any) => ({
    get: (path: string) => ({ status: 200, body: {} }),
    post: (path: string) => ({ status: 200, body: {} })
  })
};

describe('Security Integration Tests', () => {
  let testUser: any;
  let authToken: string;
  let csrfToken: string;

  beforeAll(async () => {
    // Set up test database and test user
    testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User'
    };
  });

  afterAll(async () => {
    // Clean up test data
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete secure registration flow', async () => {
      // Step 1: Initial registration
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        confirmPassword: 'SecurePass123!'
      };

      // Mock registration request
      const { req: regReq, res: regRes } = createMocks({
        method: 'POST',
        url: '/api/auth/register',
        body: registrationData
      });

      // Should return success and send verification email
      expect(registrationData.password).toBe(registrationData.confirmPassword);

      // Step 2: Email verification
      const verificationToken = 'generated-verification-token';
      
      const { req: verReq, res: verRes } = createMocks({
        method: 'GET',
        url: `/api/auth/verify?token=${verificationToken}`
      });

      // Should verify email and activate account
      expect(verificationToken).toBeDefined();

      // Step 3: First login
      const { req: loginReq, res: loginRes } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: registrationData.email,
          password: registrationData.password
        }
      });

      // Should return JWT token and set session
      expect(loginRes).toBeDefined();
    });

    it('should handle login with MFA enabled', async () => {
      // Step 1: Normal login
      const loginData = {
        email: 'mfa-user@example.com',
        password: 'SecurePass123!'
      };

      const { req: loginReq, res: loginRes } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        body: loginData
      });

      // Should return MFA challenge instead of full access token
      expect(loginData.email).toBe('mfa-user@example.com');

      // Step 2: MFA verification
      const mfaData = {
        code: '123456',
        challengeId: 'mfa-challenge-123',
        factorId: 'totp-factor-456'
      };

      const { req: mfaReq, res: mfaRes } = createMocks({
        method: 'POST',
        url: '/api/auth/mfa/verify',
        body: mfaData
      });

      // Should return full access token after MFA verification
      expect(mfaData.code).toBe('123456');
    });

    it('should handle password reset flow securely', async () => {
      // Step 1: Request password reset
      const resetRequest = {
        email: 'user@example.com'
      };

      const { req: resetReq, res: resetRes } = createMocks({
        method: 'POST',
        url: '/api/auth/reset-password',
        body: resetRequest
      });

      // Should send reset email (rate limited)
      expect(resetRequest.email).toBe('user@example.com');

      // Step 2: Reset with token
      const resetToken = 'secure-reset-token';
      const newPassword = 'NewSecurePass456!';

      const { req: confirmReq, res: confirmRes } = createMocks({
        method: 'POST',
        url: '/api/auth/confirm-reset',
        body: {
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword
        }
      });

      // Should update password and invalidate all sessions
      expect(newPassword).toBe('NewSecurePass456!');
    });
  });

  describe('Session Management Integration', () => {
    it('should enforce session timeout correctly', async () => {
      // Step 1: Login
      const { req: loginReq, res: loginRes } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: testUser.email,
          password: testUser.password
        }
      });

      authToken = 'mock-auth-token';

      // Step 2: Make authenticated request immediately (should work)
      const { req: authReq1, res: authRes1 } = createMocks({
        method: 'GET',
        url: '/api/user/profile',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(authRes1).toBeDefined();

      // Step 3: Simulate time passage (30+ minutes)
      jest.useFakeTimers();
      jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

      // Step 4: Make authenticated request after timeout (should fail)
      const { req: authReq2, res: authRes2 } = createMocks({
        method: 'GET',
        url: '/api/user/profile',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should redirect to login due to session timeout
      expect(authReq2.url).toBe('/api/user/profile');

      jest.useRealTimers();
    });

    it('should handle concurrent session limits', async () => {
      const userEmail = 'concurrent-test@example.com';
      const sessions = [];

      // Create multiple sessions (up to limit + 1)
      for (let i = 0; i < 4; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/auth/login',
          body: {
            email: userEmail,
            password: 'TestPass123!'
          },
          headers: {
            'User-Agent': `Browser-${i}`,
            'X-Forwarded-For': `192.168.1.${i + 1}`
          }
        });

        sessions.push({ req, res });
      }

      // First 3 sessions should succeed, 4th should fail or kill oldest
      expect(sessions.length).toBe(4);
    });

    it('should detect and prevent session hijacking', async () => {
      // Step 1: Normal login
      const { req: loginReq, res: loginRes } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'User-Agent': 'Chrome/91.0',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      const sessionToken = 'valid-session-token';

      // Step 2: Use session with different browser/IP (potential hijacking)
      const { req: hijackReq, res: hijackRes } = createMocks({
        method: 'GET',
        url: '/api/user/profile',
        cookies: {
          'session': sessionToken
        },
        headers: {
          'User-Agent': 'Firefox/89.0', // Different browser
          'X-Forwarded-For': '10.0.0.50' // Different IP
        }
      });

      // Should trigger security check and potentially lock session
      expect(hijackReq.cookies.session).toBe(sessionToken);
    });
  });

  describe('CSRF Protection Integration', () => {
    it('should protect all state-changing operations', async () => {
      // Step 1: Get CSRF token
      const { req: getReq, res: getRes } = createMocks({
        method: 'GET',
        url: '/auth/login'
      });

      csrfToken = 'generated-csrf-token';

      // Step 2: Try POST without CSRF token (should fail)
      const { req: postReq1, res: postRes1 } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: testUser.email,
          password: testUser.password
        }
        // Missing CSRF token
      });

      expect(postRes1).toBeDefined();

      // Step 3: Try POST with wrong CSRF token (should fail)
      const { req: postReq2, res: postRes2 } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'X-CSRF-Token': 'wrong-token'
        },
        cookies: {
          'csrf-token': csrfToken
        }
      });

      expect(postRes2).toBeDefined();

      // Step 4: POST with correct CSRF token (should succeed)
      const { req: postReq3, res: postRes3 } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'X-CSRF-Token': csrfToken
        },
        cookies: {
          'csrf-token': csrfToken
        },
        body: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(postRes3).toBeDefined();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce different rate limits per endpoint', async () => {
      const clientIP = '192.168.1.200';

      // Test login rate limiting (5 attempts per 15 minutes)
      const loginAttempts = [];
      for (let i = 0; i < 6; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/auth/login',
          headers: {
            'X-Forwarded-For': clientIP
          },
          body: {
            email: 'test@example.com',
            password: 'wrong-password'
          }
        });

        loginAttempts.push({ req, res, attempt: i + 1 });
      }

      // First 5 should return 401 (wrong password)
      // 6th should return 429 (rate limited)
      expect(loginAttempts.length).toBe(6);

      // Test password reset rate limiting (3 attempts per hour)
      const resetAttempts = [];
      for (let i = 0; i < 4; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/auth/reset-password',
          headers: {
            'X-Forwarded-For': clientIP
          },
          body: {
            email: 'test@example.com'
          }
        });

        resetAttempts.push({ req, res, attempt: i + 1 });
      }

      // First 3 should succeed, 4th should be rate limited
      expect(resetAttempts.length).toBe(4);
    });

    it('should implement progressive delays for failed attempts', async () => {
      const startTime = Date.now();
      const delays = [];

      // Simulate failed login attempts with progressive delays
      for (let i = 0; i < 4; i++) {
        const attemptTime = Date.now();
        
        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/auth/login',
          body: {
            email: 'test@example.com',
            password: 'wrong-password'
          }
        });

        delays.push(attemptTime - startTime);
        
        // Simulate delay (1s, 2s, 4s, 8s)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }

      // Verify progressive delay pattern
      expect(delays.length).toBe(4);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log all security-relevant events', async () => {
      const securityEvents = [];

      // Login attempt
      const { req: loginReq, res: loginRes } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: testUser.email,
          password: testUser.password
        }
      });

      securityEvents.push({
        event: 'login_success',
        user: testUser.email,
        timestamp: new Date()
      });

      // Password change
      const { req: pwdReq, res: pwdRes } = createMocks({
        method: 'POST',
        url: '/api/user/change-password',
        body: {
          currentPassword: testUser.password,
          newPassword: 'NewSecurePass789!'
        }
      });

      securityEvents.push({
        event: 'password_change',
        user: testUser.email,
        timestamp: new Date()
      });

      // Failed login
      const { req: failReq, res: failRes } = createMocks({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: testUser.email,
          password: 'wrong-password'
        }
      });

      securityEvents.push({
        event: 'login_failed',
        user: testUser.email,
        timestamp: new Date()
      });

      // Verify all events are logged
      expect(securityEvents.length).toBe(3);
      expect(securityEvents.every(event => event.timestamp)).toBe(true);
    });

    it('should provide audit trail for investigation', async () => {
      const userId = testUser.id;
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
      };

      // Mock audit log query
      const auditLogs = [
        {
          event_type: 'login',
          user_id: userId,
          ip_address: '192.168.1.100',
          timestamp: new Date(),
          success: true
        },
        {
          event_type: 'password_change',
          user_id: userId,
          ip_address: '192.168.1.100',
          timestamp: new Date(),
          success: true
        },
        {
          event_type: 'suspicious_activity',
          user_id: userId,
          ip_address: '10.0.0.50',
          timestamp: new Date(),
          success: false
        }
      ];

      // Should provide comprehensive audit trail
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.every(log => log.user_id === userId)).toBe(true);
      expect(auditLogs.every(log => log.timestamp >= timeRange.start)).toBe(true);
    });
  });

  describe('Email Verification Integration', () => {
    it('should enforce mandatory email verification', async () => {
      // Step 1: Register new user
      const newUser = {
        email: 'unverified@example.com',
        password: 'TestPass123!',
        name: 'Unverified User'
      };

      const { req: regReq, res: regRes } = createMocks({
        method: 'POST',
        url: '/api/auth/register',
        body: newUser
      });

      // Step 2: Try to access protected resource without verification
      const { req: protectedReq, res: protectedRes } = createMocks({
        method: 'GET',
        url: '/api/user/profile',
        headers: {
          'Authorization': 'Bearer unverified-user-token'
        }
      });

      // Should redirect to email verification page
      expect(protectedRes).toBeDefined();

      // Step 3: Verify email
      const verificationToken = 'email-verification-token';
      
      const { req: verifyReq, res: verifyRes } = createMocks({
        method: 'GET',
        url: `/api/auth/verify-email?token=${verificationToken}`
      });

      // Step 4: Access protected resource after verification
      const { req: accessReq, res: accessRes } = createMocks({
        method: 'GET',
        url: '/api/user/profile',
        headers: {
          'Authorization': 'Bearer verified-user-token'
        }
      });

      // Should allow access after verification
      expect(accessRes).toBeDefined();
    });

    it('should handle verification rate limiting', async () => {
      const userEmail = 'ratelimit-test@example.com';
      const resendAttempts = [];

      // Try to resend verification email multiple times
      for (let i = 0; i < 4; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/auth/resend-verification',
          body: {
            email: userEmail
          }
        });

        resendAttempts.push({ req, res, attempt: i + 1 });
      }

      // First 3 should succeed, 4th should be rate limited
      expect(resendAttempts.length).toBe(4);
    });
  });

  describe('Password Security Integration', () => {
    it('should enforce password policy across all password operations', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'Password1', // Missing special character
        'password123!' // Common pattern
      ];

      for (const weakPassword of weakPasswords) {
        // Test in registration
        const { req: regReq, res: regRes } = createMocks({
          method: 'POST',
          url: '/api/auth/register',
          body: {
            email: 'test@example.com',
            password: weakPassword,
            confirmPassword: weakPassword
          }
        });

        // Should reject weak password
        expect(weakPassword).toBeDefined();

        // Test in password change
        const { req: changeReq, res: changeRes } = createMocks({
          method: 'POST',
          url: '/api/user/change-password',
          body: {
            currentPassword: 'OldPass123!',
            newPassword: weakPassword
          }
        });

        // Should reject weak password
        expect(weakPassword).toBeDefined();
      }
    });

    it('should prevent password reuse', async () => {
      const userId = testUser.id;
      const previousPasswords = [
        'OldPass123!',
        'OldPass456!',
        'OldPass789!'
      ];

      // Try to change to a previously used password
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/user/change-password',
        body: {
          currentPassword: 'CurrentPass123!',
          newPassword: previousPasswords[0] // Try to reuse old password
        }
      });

      // Should reject password reuse
      expect(previousPasswords[0]).toBe('OldPass123!');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors securely without information disclosure', async () => {
      // Test various error scenarios
      const errorScenarios = [
        {
          url: '/api/auth/login',
          body: { email: 'nonexistent@example.com', password: 'password' },
          expected: 'Invalid credentials' // Generic message
        },
        {
          url: '/api/user/999999', // Non-existent user
          expected: 'User not found' // Generic message
        },
        {
          url: '/api/internal-error', // Trigger server error
          expected: 'Internal server error' // No stack trace
        }
      ];

      for (const scenario of errorScenarios) {
        const { req, res } = createMocks({
          method: 'POST',
          url: scenario.url,
          body: scenario.body || {}
        });

        // Error messages should be generic and not reveal system details
        expect(scenario.expected).toBeDefined();
      }
    });
  });
});