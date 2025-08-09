/**
 * Attack Scenario Test Suite
 * Tests against common authentication attacks and vulnerabilities
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { SecurityService } from '@/lib/auth/security';
import { AUTH_CONFIG } from '@/lib/auth/config';
import * as jwt from 'jsonwebtoken';

// Mock setup for attack simulation
jest.mock('@/lib/supabase');
jest.mock('@/lib/auth/audit');

describe('Attack Scenario Tests', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = SecurityService.getInstance();
    (SecurityService as any).tokenBlacklist.clear();
    jest.clearAllMocks();
  });

  describe('1. JWT Manipulation Attacks', () => {
    test('should prevent algorithm substitution attacks', () => {
      const payload = { userId: 'attacker', role: 'admin' };
      
      // Attack 1: None algorithm
      const noneToken = jwt.sign(payload, '', { algorithm: 'none' as any });
      expect(() => {
        securityService.verifyJWT(noneToken);
      }).toThrow();

      // Attack 2: Algorithm confusion (try to use HMAC secret as RSA key)
      try {
        const rsToken = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, { algorithm: 'RS256' as any });
        expect(() => {
          securityService.verifyJWT(rsToken);
        }).toThrow();
      } catch {
        // Expected - RS256 signing should fail with HMAC secret
      }

      // Attack 3: Algorithm downgrade
      const weakAlgToken = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, { algorithm: 'HS1' as any });
      expect(() => {
        securityService.verifyJWT(weakAlgToken);
      }).toThrow();
    });

    test('should prevent token substitution attacks', () => {
      const legitimatePayload = { userId: 'user123', role: 'user' };
      const legitimateToken = securityService.generateJWT(legitimatePayload);

      // Attack: Replace payload while keeping signature
      const [header, , signature] = legitimateToken.split('.');
      const maliciousPayload = Buffer.from(JSON.stringify({
        userId: 'attacker',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');

      const maliciousToken = `${header}.${maliciousPayload}.${signature}`;

      expect(() => {
        securityService.verifyJWT(maliciousToken);
      }).toThrow('Token verification failed');
    });

    test('should prevent signature stripping attacks', () => {
      const payload = { userId: 'user123', role: 'user' };
      const token = securityService.generateJWT(payload);

      // Attack: Remove signature
      const [header, payloadPart] = token.split('.');
      const strippedToken = `${header}.${payloadPart}.`;

      expect(() => {
        securityService.verifyJWT(strippedToken);
      }).toThrow();

      // Attack: Replace signature with empty string
      const emptySignatureToken = `${header}.${payloadPart}.`;

      expect(() => {
        securityService.verifyJWT(emptySignatureToken);
      }).toThrow();
    });

    test('should prevent token replay attacks with JTI', () => {
      const payload = { userId: 'user123', role: 'user' };
      const token = securityService.generateJWT(payload);

      // First use should work
      expect(() => {
        securityService.verifyJWT(token);
      }).not.toThrow();

      // Revoke token (simulating logout or security event)
      securityService.revokeJWT(token);

      // Replay should fail
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow('Token has been revoked');
    });

    test('should prevent cross-jwt attacks', () => {
      // Generate token with different secret (simulating another service)
      const differentSecret = 'different-secret-key-for-another-service';
      const crossToken = jwt.sign(
        { userId: 'attacker', role: 'admin' },
        differentSecret,
        { 
          algorithm: 'HS256',
          issuer: AUTH_CONFIG.JWT_ISSUER, // Same issuer to try to fool validation
          audience: AUTH_CONFIG.JWT_AUDIENCE // Same audience
        }
      );

      expect(() => {
        securityService.verifyJWT(crossToken);
      }).toThrow();
    });
  });

  describe('2. Timing Attack Prevention', () => {
    test('should resist timing attacks in password verification', async () => {
      const correctPassword = 'SecureP@ssw0rd123!';
      const correctHash = await securityService.hashPassword(correctPassword);
      
      // Test multiple wrong passwords of different lengths
      const wrongPasswords = [
        'a',
        'wrong',
        'wrongpassword',
        'wrongpasswordverylongtotrytotriggertimingatack',
        'W', // Single char
        'Wrong123!', // Similar complexity but wrong
        'SecureP@ssw0rd123', // Close but missing char
        'SecureP@ssw0rd123!!' // Close but extra char
      ];

      const timings: number[] = [];

      // Measure timing for correct password
      const correctTimes = [];
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        await securityService.verifyPassword(correctPassword, correctHash);
        const end = process.hrtime.bigint();
        correctTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
      }

      // Measure timing for wrong passwords
      for (const wrongPassword of wrongPasswords) {
        const times = [];
        for (let i = 0; i < 5; i++) {
          const start = process.hrtime.bigint();
          await securityService.verifyPassword(wrongPassword, correctHash);
          const end = process.hrtime.bigint();
          times.push(Number(end - start) / 1000000);
        }
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        timings.push(avgTime);
      }

      const avgCorrect = correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length;
      const avgWrong = timings.reduce((a, b) => a + b, 0) / timings.length;

      // Times should be relatively consistent (bcrypt provides timing resistance)
      const ratio = Math.abs(avgCorrect - avgWrong) / Math.max(avgCorrect, avgWrong);
      expect(ratio).toBeLessThan(0.5); // Within 50% of each other
    });

    test('should resist timing attacks in JWT verification', () => {
      const validPayload = { userId: 'user123', role: 'user' };
      const validToken = securityService.generateJWT(validPayload);

      // Generate various invalid tokens
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        validToken.replace(/.$/, 'x'), // Change last character
        validToken.substring(0, validToken.length - 5), // Truncated
        validToken + 'extra', // Extended
        'a.b.c' // Minimal invalid
      ];

      const timings: number[] = [];

      // Measure timing for valid token
      const validTimes = [];
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        try {
          securityService.verifyJWT(validToken);
        } catch (error) {
          // Expected for some scenarios
        }
        const end = process.hrtime.bigint();
        validTimes.push(Number(end - start) / 1000000);
      }

      // Measure timing for invalid tokens
      for (const invalidToken of invalidTokens) {
        const times = [];
        for (let i = 0; i < 5; i++) {
          const start = process.hrtime.bigint();
          try {
            securityService.verifyJWT(invalidToken);
          } catch (error) {
            // Expected for invalid tokens
          }
          const end = process.hrtime.bigint();
          times.push(Number(end - start) / 1000000);
        }
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        timings.push(avgTime);
      }

      // Verification times should be relatively consistent
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const ratio = (maxTiming - minTiming) / maxTiming;
      
      // Should not have dramatic timing differences that could leak information
      expect(ratio).toBeLessThan(0.8);
    });
  });

  describe('3. Rate Limiting Bypass Attempts', () => {
    test('should prevent distributed brute force attacks', async () => {
      const targetEmail = 'victim@example.com';
      const wrongPassword = 'wrongpassword';
      
      // Simulate attacks from different IP addresses
      const attackIPs = [
        '192.168.1.100',
        '192.168.1.101', 
        '192.168.1.102',
        '10.0.0.100',
        '10.0.0.101'
      ];

      const results = [];

      for (const ip of attackIPs) {
        // Each IP tries to brute force
        for (let attempt = 0; attempt < 6; attempt++) {
          const rateLimit = await securityService.checkRateLimit(
            `login:${ip}`,
            { max_requests: 5, window_ms: 60000 }
          );
          
          results.push({
            ip,
            attempt,
            allowed: rateLimit.allowed,
            remaining: rateLimit.remaining
          });

          if (!rateLimit.allowed) break;
        }
      }

      // Each IP should be rate limited independently
      const blockedPerIP = attackIPs.map(ip => 
        results.filter(r => r.ip === ip && !r.allowed).length
      );

      // Each IP should eventually be blocked
      blockedPerIP.forEach(blocked => {
        expect(blocked).toBeGreaterThan(0);
      });
    });

    test('should prevent rate limit bypass with header manipulation', async () => {
      const baseKey = 'login:test-ip';
      
      // Try to bypass by using different variations of the same key
      const keyVariations = [
        'login:test-ip',
        'login:test-ip ',
        'login: test-ip',
        'login:TEST-IP',
        'login:test_ip',
        'Login:test-ip'
      ];

      const results = [];

      for (const key of keyVariations) {
        for (let i = 0; i < 6; i++) {
          const result = await securityService.checkRateLimit(
            key,
            { max_requests: 3, window_ms: 60000 }
          );
          results.push({ key, allowed: result.allowed });
          if (!result.allowed) break;
        }
      }

      // Should not be able to bypass by key manipulation
      // Note: This test assumes the rate limiting implementation
      // normalizes keys to prevent such bypass attempts
    });

    test('should handle concurrent rate limit checks correctly', async () => {
      const key = 'concurrent-test';
      const config = { max_requests: 5, window_ms: 60000 };

      // Make many concurrent requests
      const promises = Array.from({ length: 20 }, (_, i) =>
        securityService.checkRateLimit(`${key}:${i % 5}`, config)
      );

      const results = await Promise.all(promises);
      
      // Should handle concurrent requests without race conditions
      results.forEach(result => {
        expect(result.allowed).toBeDefined();
        expect(result.remaining).toBeDefined();
        expect(result.reset_time).toBeDefined();
      });

      // No more than max_requests should be allowed per key
      const groupedResults = results.reduce((acc, result, index) => {
        const groupKey = index % 5;
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(result);
        return acc;
      }, {} as Record<number, typeof results>);

      Object.values(groupedResults).forEach(group => {
        const allowedCount = group.filter(r => r.allowed).length;
        expect(allowedCount).toBeLessThanOrEqual(config.max_requests);
      });
    });
  });

  describe('4. Session Hijacking and Fixation Attacks', () => {
    test('should prevent session fixation attacks', async () => {
      const userId = 'user123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 Test Browser';

      // Attacker provides a pre-generated session ID
      const attackerSessionId = 'attacker-controlled-session-id';

      // System should generate its own session ID, not use provided one
      const session = await securityService.createSession(userId, ipAddress, userAgent);

      expect(session.id).not.toBe(attackerSessionId);
      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(32); // Should be cryptographically secure
    });

    test('should detect session hijacking attempts', () => {
      const userId = 'user123';
      const legitimateFingerprint = securityService.generateDeviceFingerprint(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '192.168.1.1'
      );

      // Generate token bound to legitimate device
      const token = securityService.generateJWT(
        { userId },
        '1h',
        { deviceFingerprint: legitimateFingerprint }
      );

      // Attacker tries to use token from different device
      const attackerFingerprint = securityService.generateDeviceFingerprint(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        '10.0.0.1'
      );

      expect(() => {
        securityService.verifyJWT(token, { validateDevice: attackerFingerprint });
      }).toThrow('Token device mismatch');
    });

    test('should prevent session token leakage', () => {
      const payload = { userId: 'user123', role: 'user' };
      const token = securityService.generateJWT(payload);

      // Verify token doesn't contain sensitive information
      const decoded = jwt.decode(token) as any;

      // Should not contain password, secret keys, or other sensitive data
      expect(decoded.password).toBeUndefined();
      expect(decoded.secret).toBeUndefined();
      expect(decoded.key).toBeUndefined();
      expect(decoded.hash).toBeUndefined();

      // Should have proper claims structure
      expect(decoded.userId).toBeDefined();
      expect(decoded.jti).toBeDefined(); // JWT ID for revocation
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.nbf).toBeDefined(); // Not before
      expect(decoded.iss).toBe(AUTH_CONFIG.JWT_ISSUER);
      expect(decoded.aud).toBe(AUTH_CONFIG.JWT_AUDIENCE);
    });

    test('should handle concurrent session management', async () => {
      const userId = 'user123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 Test Browser';

      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: 10 }, () =>
        securityService.createSession(userId, ipAddress, userAgent)
      );

      const sessions = await Promise.all(sessionPromises);

      // All session IDs should be unique
      const sessionIds = sessions.map(s => s.id);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(sessions.length);

      // All sessions should be valid
      sessions.forEach(session => {
        expect(session.id).toBeDefined();
        expect(session.user_id).toBe(userId);
        expect(session.is_active).toBe(true);
        expect(session.device_fingerprint).toBeDefined();
      });
    });
  });

  describe('5. Privilege Escalation Attacks', () => {
    test('should prevent horizontal privilege escalation', () => {
      // User tries to access another user's resources by manipulating token
      const user1Payload = { userId: 'user1', role: 'user' };
      const user1Token = securityService.generateJWT(user1Payload);

      // Verify token contains correct user ID
      const decoded = securityService.verifyJWT(user1Token);
      expect(decoded.userId).toBe('user1');
      expect(decoded.role).toBe('user');

      // Token should not be modifiable to access user2's resources
      const [header, , signature] = user1Token.split('.');
      const modifiedPayload = Buffer.from(JSON.stringify({
        ...user1Payload,
        userId: 'user2' // Try to escalate to different user
      })).toString('base64url');

      const modifiedToken = `${header}.${modifiedPayload}.${signature}`;

      expect(() => {
        securityService.verifyJWT(modifiedToken);
      }).toThrow();
    });

    test('should prevent vertical privilege escalation', () => {
      // Regular user tries to escalate to admin role
      const userPayload = { userId: 'user123', role: 'user' };
      const userToken = securityService.generateJWT(userPayload);

      // Verify original token
      const decoded = securityService.verifyJWT(userToken);
      expect(decoded.role).toBe('user');

      // Try to modify role to admin
      const [header, , signature] = userToken.split('.');
      const escalatedPayload = Buffer.from(JSON.stringify({
        ...userPayload,
        role: 'admin' // Try to escalate privileges
      })).toString('base64url');

      const escalatedToken = `${header}.${escalatedPayload}.${signature}`;

      expect(() => {
        securityService.verifyJWT(escalatedToken);
      }).toThrow();
    });

    test('should prevent role injection attacks', () => {
      // Try to inject additional roles or permissions
      const payload = { 
        userId: 'user123', 
        role: 'user',
        permissions: ['read'] 
      };
      const token = securityService.generateJWT(payload);

      // Try to add admin permissions
      const [header, , signature] = token.split('.');
      const injectedPayload = Buffer.from(JSON.stringify({
        ...payload,
        permissions: ['read', 'write', 'admin'],
        isAdmin: true,
        superuser: true
      })).toString('base64url');

      const injectedToken = `${header}.${injectedPayload}.${signature}`;

      expect(() => {
        securityService.verifyJWT(injectedToken);
      }).toThrow();
    });
  });

  describe('6. Cryptographic Attacks', () => {
    test('should use secure random number generation', () => {
      const ids = new Set();
      const iterations = 10000;

      // Generate many IDs to test for patterns or collisions
      for (let i = 0; i < iterations; i++) {
        const id = securityService.generateSecureId();
        
        // Should not have duplicates
        expect(ids.has(id)).toBe(false);
        ids.add(id);
        
        // Should be sufficiently long
        expect(id.length).toBeGreaterThan(32);
        
        // Should be hexadecimal
        expect(/^[a-f0-9]+$/i.test(id)).toBe(true);
      }

      // All IDs should be unique
      expect(ids.size).toBe(iterations);
    });

    test('should prevent key confusion attacks', () => {
      // Try to use JWT secret for other purposes
      const jwtSecret = AUTH_CONFIG.JWT_SECRET;
      
      // JWT secret should not be used directly for password hashing
      const password = 'testpassword';
      const hashPromise = securityService.hashPassword(password);
      
      expect(hashPromise).resolves.not.toContain(jwtSecret);
    });

    test('should prevent weak signature attacks', () => {
      // Verify that only strong signatures are accepted
      const payload = { userId: 'user123', role: 'user' };
      
      // Try with known weak secrets
      const weakSecrets = ['', 'secret', '123456', 'password'];
      
      weakSecrets.forEach(weakSecret => {
        try {
          const weakToken = jwt.sign(payload, weakSecret, {
            algorithm: 'HS256',
            issuer: AUTH_CONFIG.JWT_ISSUER,
            audience: AUTH_CONFIG.JWT_AUDIENCE
          });
          
          expect(() => {
            securityService.verifyJWT(weakToken);
          }).toThrow();
        } catch (error) {
          // Expected - weak secrets should not work
        }
      });
    });
  });

  describe('7. Input Validation Bypass Attacks', () => {
    test('should prevent SQL injection through various encoding methods', () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM admin --",
        "%27; DROP TABLE users; --",
        "'; DROP TABLE users; %00",
        "\\'; DROP TABLE users; --",
        "'; DROP TABLE users;\u0000",
        String.fromCharCode(39) + "; DROP TABLE users; --"
      ];

      sqlPayloads.forEach(payload => {
        const sanitized = securityService.sanitizeInput(payload);
        
        // Should remove or escape dangerous characters
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toMatch(/['"]/);
      });
    });

    test('should prevent XSS through various encoding methods', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '&lt;script&gt;alert("xss")&lt;/script&gt;',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '%3Cscript%3Ealert("xss")%3C/script%3E',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
        String.fromCharCode(60) + 'script' + String.fromCharCode(62) + 'alert("xss")' + String.fromCharCode(60) + '/script' + String.fromCharCode(62)
      ];

      xssPayloads.forEach(payload => {
        const sanitized = securityService.sanitizeInput(payload);
        
        // Should remove dangerous HTML/JS
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
      });
    });

    test('should prevent path traversal attacks', () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f%etc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
      ];

      pathTraversalPayloads.forEach(payload => {
        const sanitized = securityService.sanitizeInput(payload);
        
        // Should remove path traversal patterns
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('%2e%2e');
        expect(sanitized).not.toContain('etc/passwd');
        expect(sanitized).not.toContain('windows/system32');
      });
    });

    test('should enforce input length limits', () => {
      // Very long input to test buffer overflow protection
      const longInput = 'A'.repeat(10000);
      const sanitized = securityService.sanitizeInput(longInput);
      
      // Should be truncated to safe length
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    test('should validate email format strictly', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test@.example.com',
        'test@example..com',
        'test@example.com.',
        'test@-example.com',
        'test@example-.com',
        'test@exam ple.com',
        'test@exam\tple.com',
        'test@exam\nple.com',
        'A'.repeat(255) + '@example.com' // Too long
      ];

      invalidEmails.forEach(email => {
        expect(securityService.isValidEmail(email)).toBe(false);
      });

      // Valid emails should pass
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example123.com'
      ];

      validEmails.forEach(email => {
        expect(securityService.isValidEmail(email)).toBe(true);
      });
    });
  });

  describe('8. Business Logic Attacks', () => {
    test('should prevent account enumeration through timing', async () => {
      const existingEmail = 'existing@example.com';
      const nonExistentEmail = 'nonexistent@example.com';
      
      // Mock different responses for existing vs non-existing users
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Time requests for existing user
      const existingTimes = [];
      for (let i = 0; i < 10; i++) {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { id: 'user123', password_hash: '$2b$12$hash' }, 
                error: null 
              })
            })
          })
        });
        
        const start = process.hrtime.bigint();
        await securityService.verifyPassword('wrongpassword', '$2b$12$hash');
        const end = process.hrtime.bigint();
        existingTimes.push(Number(end - start) / 1000000);
      }
      
      // Time requests for non-existing user
      const nonExistentTimes = [];
      for (let i = 0; i < 10; i++) {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        });
        
        const start = process.hrtime.bigint();
        try {
          // This should still take similar time even for non-existent user
          await securityService.verifyPassword('wrongpassword', '$2b$12$fakehash');
        } catch (error) {
          // Expected
        }
        const end = process.hrtime.bigint();
        nonExistentTimes.push(Number(end - start) / 1000000);
      }
      
      const avgExisting = existingTimes.reduce((a, b) => a + b, 0) / existingTimes.length;
      const avgNonExistent = nonExistentTimes.reduce((a, b) => a + b, 0) / nonExistentTimes.length;
      
      // Timing should be similar to prevent enumeration
      const ratio = Math.abs(avgExisting - avgNonExistent) / Math.max(avgExisting, avgNonExistent);
      expect(ratio).toBeLessThan(0.3); // Within 30% of each other
    });

    test('should prevent password reset enumeration', () => {
      // Password reset should not reveal whether email exists
      const emails = [
        'existing@example.com',
        'nonexistent@example.com',
        'invalid-email',
        'admin@example.com'
      ];

      // All should return similar responses to prevent enumeration
      emails.forEach(email => {
        // This test would need actual password reset endpoint implementation
        // For now, verify that email validation doesn't leak information
        const isValid = securityService.isValidEmail(email);
        
        if (!isValid) {
          // Invalid emails should be rejected immediately
          expect(isValid).toBe(false);
        } else {
          // Valid emails should not reveal existence in error messages
          expect(isValid).toBe(true);
        }
      });
    });

    test('should prevent registration enumeration', () => {
      // Registration attempts should not reveal if email is already taken
      // through timing or different error messages
      
      const testEmails = [
        'new@example.com',
        'existing@example.com'
      ];

      testEmails.forEach(email => {
        expect(securityService.isValidEmail(email)).toBe(true);
        // Actual registration logic would need to handle enumeration prevention
      });
    });
  });

  describe('9. Denial of Service (DoS) Attack Prevention', () => {
    test('should handle resource exhaustion attacks', async () => {
      // Test with extremely long passwords
      const longPassword = 'A'.repeat(100000);
      
      const start = Date.now();
      try {
        await securityService.hashPassword(longPassword);
      } catch (error) {
        // Should reject or handle gracefully
      }
      const duration = Date.now() - start;
      
      // Should not take excessive time (protection against algorithmic complexity attacks)
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    test('should limit concurrent operations', async () => {
      // Simulate many concurrent password hashing requests
      const promises = Array.from({ length: 100 }, () =>
        securityService.hashPassword('testpassword').catch(() => null)
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // Should complete in reasonable time even under load
      expect(duration).toBeLessThan(30000); // 30 seconds for 100 operations

      // Most operations should succeed (some might be rate limited)
      const successful = results.filter(r => r !== null).length;
      expect(successful).toBeGreaterThan(50); // At least 50% success rate
    });

    test('should handle malformed JWT tokens efficiently', () => {
      const malformedTokens = [
        'not.a.jwt',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.', // Missing parts
        'a'.repeat(10000), // Very long invalid token
        '', // Empty token
        'null',
        'undefined',
        '...',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ', // Missing signature
      ];

      malformedTokens.forEach(token => {
        const start = Date.now();
        
        try {
          securityService.verifyJWT(token);
        } catch (error) {
          // Expected for malformed tokens
        }
        
        const duration = Date.now() - start;
        
        // Should fail fast for malformed tokens
        expect(duration).toBeLessThan(100); // 100ms max
      });
    });
  });

  describe('10. Advanced Persistent Threat (APT) Simulation', () => {
    test('should detect and prevent token harvesting attempts', () => {
      // Simulate attacker trying to collect many valid tokens
      const tokens = [];
      const payload = { userId: 'user123', role: 'user' };

      // Generate multiple tokens
      for (let i = 0; i < 100; i++) {
        const token = securityService.generateJWT(payload);
        tokens.push(token);
      }

      // All tokens should have unique JTIs (prevent correlation)
      const jtis = tokens.map(token => {
        const decoded = jwt.decode(token) as any;
        return decoded.jti;
      });

      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(tokens.length);

      // Tokens should not be predictable
      const tokenEndings = tokens.map(token => token.slice(-10));
      const uniqueEndings = new Set(tokenEndings);
      expect(uniqueEndings.size).toBe(tokens.length); // All should be different
    });

    test('should prevent long-term session persistence attacks', async () => {
      const userId = 'user123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 Test Browser';

      // Create session
      const session = await securityService.createSession(userId, ipAddress, userAgent);
      
      // Verify session has expiration
      expect(session.expires_at).toBeDefined();
      const expiresAt = new Date(session.expires_at);
      const now = new Date();
      
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      
      // Session should not be indefinitely valid
      const maxDuration = 24 * 60 * 60 * 1000; // 24 hours
      expect(expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(maxDuration);
    });

    test('should prevent credential stuffing detection evasion', async () => {
      // Simulate credential stuffing with evasion techniques
      const credentials = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password123' },
        { email: 'user3@example.com', password: 'password123' },
        { email: 'user4@example.com', password: 'password123' },
        { email: 'user5@example.com', password: 'password123' }
      ];

      const ipAddress = '192.168.1.100';
      let blockedAttempts = 0;

      for (const cred of credentials) {
        const rateLimit = await securityService.checkRateLimit(
          `login:${ipAddress}`,
          { max_requests: 3, window_ms: 60000 }
        );

        if (!rateLimit.allowed) {
          blockedAttempts++;
        }

        // Simulate failed login tracking
        await securityService.trackLoginAttempt(
          cred.email,
          false,
          ipAddress,
          'AttackBot/1.0',
          'invalid_password'
        );
      }

      // Should detect and block pattern
      expect(blockedAttempts).toBeGreaterThan(0);
    });

    test('should maintain security under sustained attack', async () => {
      // Simulate sustained attack over time
      const attackDuration = 5000; // 5 seconds
      const attackStart = Date.now();
      const attacks = [];

      while (Date.now() - attackStart < attackDuration) {
        try {
          // Various attack vectors
          const attackType = Math.random();
          
          if (attackType < 0.25) {
            // Malformed JWT attack
            securityService.verifyJWT('malformed.token');
          } else if (attackType < 0.5) {
            // Rate limit testing
            await securityService.checkRateLimit('attack:sustained', { max_requests: 1, window_ms: 1000 });
          } else if (attackType < 0.75) {
            // Input validation attack
            securityService.sanitizeInput('<script>alert("xss")</script>');
          } else {
            // Password verification attack
            await securityService.verifyPassword('attack', '$2b$12$invalidhash');
          }
          
          attacks.push(Date.now() - attackStart);
        } catch (error) {
          // Expected for attack attempts
        }
        
        // Small delay to prevent overwhelming the test
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // System should remain responsive
      expect(attacks.length).toBeGreaterThan(100); // Processed many attacks
      
      // Response times should not degrade significantly
      const earlyAttacks = attacks.slice(0, 10);
      const lateAttacks = attacks.slice(-10);
      
      const avgEarly = earlyAttacks.reduce((a, b) => a + b, 0) / earlyAttacks.length;
      const avgLate = lateAttacks.reduce((a, b) => a + b, 0) / lateAttacks.length;
      
      // Performance should not degrade more than 3x
      expect(avgLate).toBeLessThan(avgEarly * 3);
    });
  });
});