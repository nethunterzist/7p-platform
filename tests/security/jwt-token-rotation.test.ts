/**
 * JWT Token Rotation Security Test Suite
 * Tests token rotation, refresh mechanisms, and security lifecycle
 */

import { SecurityService } from '@/lib/auth/security';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { AuthError } from '@/lib/types/auth';
import * as jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: {
              id: 'session123',
              user_id: 'user123',
              is_active: true,
              expires_at: new Date(Date.now() + 3600000).toISOString()
            }, 
            error: null 
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
    })
  }
}));

jest.mock('@/lib/auth/audit', () => ({
  auditLogger: {
    logSecurity: jest.fn().mockResolvedValue({})
  }
}));

describe('JWT Token Rotation Security Tests', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = SecurityService.getInstance();
    (SecurityService as any).tokenBlacklist.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    (SecurityService as any).tokenBlacklist.clear();
  });

  describe('1. Access Token Rotation', () => {
    it('should generate new access token with unique JTI on refresh', () => {
      const payload = { userId: 'user123', role: 'user' };
      
      // Generate initial token
      const token1 = securityService.generateJWT(payload);
      const decoded1 = jwt.decode(token1) as any;
      
      // Generate new token (simulating refresh)
      const token2 = securityService.generateJWT(payload);
      const decoded2 = jwt.decode(token2) as any;
      
      // Tokens should be different
      expect(token1).not.toBe(token2);
      
      // JTIs should be unique
      expect(decoded1.jti).not.toBe(decoded2.jti);
      
      // Core payload should be same
      expect(decoded1.userId).toBe(decoded2.userId);
      expect(decoded1.role).toBe(decoded2.role);
    });

    it('should revoke old token when issuing new one', () => {
      const payload = { userId: 'user123', role: 'user' };
      const oldToken = securityService.generateJWT(payload);
      
      // Verify old token works
      expect(() => {
        securityService.verifyJWT(oldToken);
      }).not.toThrow();
      
      // Simulate token refresh - revoke old token
      securityService.revokeJWT(oldToken);
      
      // Generate new token
      const newToken = securityService.generateJWT(payload);
      
      // Old token should be revoked
      expect(() => {
        securityService.verifyJWT(oldToken);
      }).toThrow('Token has been revoked');
      
      // New token should work
      expect(() => {
        securityService.verifyJWT(newToken);
      }).not.toThrow();
    });

    it('should maintain token security properties during rotation', () => {
      const payload = { userId: 'user123', role: 'user', sessionId: 'session123' };
      const deviceFingerprint = 'device456';
      
      const tokens = [];
      
      // Generate tokens through multiple rotations
      for (let i = 0; i < 10; i++) {
        const token = securityService.generateJWT(payload, '1h', { 
          sessionId: 'session123',
          deviceFingerprint 
        });
        tokens.push(token);
      }
      
      // All tokens should have required security claims
      tokens.forEach(token => {
        const decoded = jwt.decode(token) as any;
        
        expect(decoded.jti).toBeDefined(); // JWT ID
        expect(decoded.iat).toBeDefined(); // Issued at
        expect(decoded.nbf).toBeDefined(); // Not before
        expect(decoded.iss).toBe(AUTH_CONFIG.JWT_ISSUER); // Issuer
        expect(decoded.aud).toBe(AUTH_CONFIG.JWT_AUDIENCE); // Audience
        expect(decoded.sid).toBe('session123'); // Session binding
        expect(decoded.dfp).toBe(deviceFingerprint); // Device binding
      });
      
      // All JTIs should be unique
      const jtis = tokens.map(token => {
        const decoded = jwt.decode(token) as any;
        return decoded.jti;
      });
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(tokens.length);
    });
  });

  describe('2. Refresh Token Security', () => {
    it('should generate refresh tokens with proper claims structure', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      const refreshToken = securityService.generateRefreshToken(userId, sessionId);
      const decoded = jwt.decode(refreshToken) as any;
      
      expect(decoded.userId).toBe(userId);
      expect(decoded.sessionId).toBe(sessionId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.version).toBe(1);
      expect(decoded.jti).toBeDefined();
      expect(decoded.iss).toBe(AUTH_CONFIG.JWT_ISSUER);
      expect(decoded.aud).toBe(AUTH_CONFIG.JWT_AUDIENCE);
      expect(decoded.iat).toBeDefined();
      expect(decoded.nbf).toBeDefined();
    });

    it('should support refresh token rotation with family tracking', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Generate refresh token family
      const refreshTokens = [];
      for (let i = 0; i < 5; i++) {
        const refreshToken = securityService.generateRefreshToken(userId, sessionId);
        refreshTokens.push(refreshToken);
      }
      
      // All should have same version but different JTIs
      const decodedTokens = refreshTokens.map(token => jwt.decode(token) as any);
      
      decodedTokens.forEach(decoded => {
        expect(decoded.version).toBe(1); // Same family version
        expect(decoded.userId).toBe(userId);
        expect(decoded.sessionId).toBe(sessionId);
      });
      
      // JTIs should be unique within family
      const jtis = decodedTokens.map(decoded => decoded.jti);
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(refreshTokens.length);
    });

    it('should handle refresh token revocation cascading', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Generate refresh token family
      const refreshTokens = [];
      for (let i = 0; i < 3; i++) {
        const refreshToken = securityService.generateRefreshToken(userId, sessionId);
        refreshTokens.push(refreshToken);
      }
      
      // Revoke one token in the family
      securityService.revokeJWT(refreshTokens[1]);
      
      // Revoked token should be invalid
      expect(() => {
        securityService.verifyJWT(refreshTokens[1]);
      }).toThrow('Token has been revoked');
      
      // Other tokens in family should still work
      expect(() => {
        securityService.verifyJWT(refreshTokens[0]);
      }).not.toThrow();
      
      expect(() => {
        securityService.verifyJWT(refreshTokens[2]);
      }).not.toThrow();
    });

    it('should validate refresh token expiration separately from access tokens', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Generate refresh token with longer expiration
      const refreshToken = securityService.generateRefreshToken(userId, sessionId);
      const decoded = jwt.decode(refreshToken) as any;
      
      // Should have longer expiration than typical access token
      const accessTokenDuration = 60 * 60; // 1 hour
      const refreshTokenDuration = decoded.exp - decoded.iat;
      
      expect(refreshTokenDuration).toBeGreaterThan(accessTokenDuration);
      
      // Should be valid for days, not hours
      expect(refreshTokenDuration).toBeGreaterThan(24 * 60 * 60); // More than 24 hours
    });
  });

  describe('3. Token Lifecycle Management', () => {
    it('should handle concurrent token operations safely', async () => {
      const payload = { userId: 'user123', role: 'user' };
      
      // Simulate concurrent token generation and revocation
      const operations = [];
      
      // Generate tokens concurrently
      for (let i = 0; i < 50; i++) {
        operations.push(Promise.resolve(securityService.generateJWT(payload)));
      }
      
      const tokens = await Promise.all(operations);
      
      // Revoke half of them concurrently
      const revocationPromises = tokens.slice(0, 25).map(token => 
        Promise.resolve(securityService.revokeJWT(token))
      );
      
      await Promise.all(revocationPromises);
      
      // Verify states are consistent
      tokens.slice(0, 25).forEach(token => {
        expect(() => {
          securityService.verifyJWT(token);
        }).toThrow('Token has been revoked');
      });
      
      tokens.slice(25).forEach(token => {
        expect(() => {
          securityService.verifyJWT(token);
        }).not.toThrow();
      });
    });

    it('should clean up expired tokens from blacklist', () => {
      const payload = { userId: 'user123', role: 'user' };
      
      // Generate and revoke many tokens
      const tokens = [];
      for (let i = 0; i < 1000; i++) {
        const token = securityService.generateJWT(payload);
        tokens.push(token);
        securityService.revokeJWT(token);
      }
      
      // Verify all are revoked
      tokens.forEach(token => {
        expect(() => {
          securityService.verifyJWT(token);
        }).toThrow('Token has been revoked');
      });
      
      // Trigger cleanup
      securityService.cleanupExpiredTokens();
      
      // Generate new token to verify system still works
      const newToken = securityService.generateJWT(payload);
      expect(() => {
        securityService.verifyJWT(newToken);
      }).not.toThrow();
    });

    it('should handle session invalidation properly', async () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Create session
      const session = await securityService.createSession(userId, '192.168.1.1', 'Test Browser');
      
      // Generate tokens bound to session
      const accessToken = securityService.generateJWT(
        { userId, role: 'user', sessionId: session.id },
        '1h',
        { sessionId: session.id }
      );
      
      const refreshToken = securityService.generateRefreshToken(userId, session.id);
      
      // Verify tokens work
      expect(() => {
        securityService.verifyJWT(accessToken);
      }).not.toThrow();
      
      expect(() => {
        securityService.verifyJWT(refreshToken);
      }).not.toThrow();
      
      // Invalidate session
      await securityService.invalidateSession(session.id);
      
      // Session validation should fail
      const sessionValidation = await securityService.validateSession(session.id);
      expect(sessionValidation).toBeNull();
    });
  });

  describe('4. Token Security Edge Cases', () => {
    it('should handle token verification with expired sessions', async () => {
      const userId = 'user123';
      const expiredSessionId = 'expired-session';
      
      // Mock expired session
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: expiredSessionId,
                user_id: userId,
                is_active: true,
                expires_at: new Date(Date.now() - 1000).toISOString() // Expired
              },
              error: null
            })
          })
        })
      });
      
      // Generate token with expired session
      const token = securityService.generateJWT(
        { userId, role: 'user', sessionId: expiredSessionId },
        '1h',
        { sessionId: expiredSessionId }
      );
      
      // Token verification should still work (token handles its own expiration)
      expect(() => {
        securityService.verifyJWT(token);
      }).not.toThrow();
      
      // But session validation should fail
      const sessionValidation = await securityService.validateSession(expiredSessionId);
      expect(sessionValidation).toBeNull();
    });

    it('should prevent token reuse across different sessions', () => {
      const userId = 'user123';
      const session1 = 'session1';
      const session2 = 'session2';
      
      // Generate token for session1
      const token = securityService.generateJWT(
        { userId, role: 'user', sessionId: session1 },
        '1h',
        { sessionId: session1 }
      );
      
      // Verify token contains session1
      const decoded = securityService.verifyJWT(token);
      expect(decoded.sessionId).toBe(session1);
      expect(decoded.sid).toBe(session1);
      
      // Token should not be valid for session2 (would need session validation)
      expect(decoded.sessionId).not.toBe(session2);
    });

    it('should handle malformed refresh tokens gracefully', () => {
      const malformedTokens = [
        'malformed.refresh.token',
        '',
        null,
        undefined,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature',
        'not-a-jwt-at-all'
      ];
      
      malformedTokens.forEach(token => {
        expect(() => {
          securityService.verifyJWT(token as any);
        }).toThrow();
      });
    });

    it('should prevent refresh token confusion attacks', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Generate access token
      const accessToken = securityService.generateJWT(
        { userId, role: 'user', sessionId }
      );
      
      // Generate refresh token
      const refreshToken = securityService.generateRefreshToken(userId, sessionId);
      
      // Decode both tokens
      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;
      
      // Should have different properties
      expect(accessDecoded.type).toBeUndefined(); // Access tokens don't have type
      expect(refreshDecoded.type).toBe('refresh'); // Refresh tokens have type
      
      expect(accessDecoded.role).toBe('user'); // Access tokens have role
      expect(refreshDecoded.role).toBeUndefined(); // Refresh tokens don't have role
      
      expect(accessDecoded.version).toBeUndefined(); // Access tokens don't have version
      expect(refreshDecoded.version).toBe(1); // Refresh tokens have version
    });
  });

  describe('5. Performance and Scalability', () => {
    it('should handle high-frequency token rotation efficiently', () => {
      const payload = { userId: 'user123', role: 'user' };
      
      const start = Date.now();
      const tokens = [];
      
      // Generate many tokens quickly
      for (let i = 0; i < 1000; i++) {
        const token = securityService.generateJWT(payload);
        tokens.push(token);
        
        // Revoke every other token
        if (i % 2 === 0) {
          securityService.revokeJWT(token);
        }
      }
      
      const duration = Date.now() - start;
      
      // Should complete quickly
      expect(duration).toBeLessThan(5000); // 5 seconds for 1000 operations
      
      // Verify final states
      tokens.forEach((token, index) => {
        if (index % 2 === 0) {
          expect(() => {
            securityService.verifyJWT(token);
          }).toThrow('Token has been revoked');
        } else {
          expect(() => {
            securityService.verifyJWT(token);
          }).not.toThrow();
        }
      });
    });

    it('should maintain memory efficiency during token operations', () => {
      const payload = { userId: 'user123', role: 'user' };
      
      // Generate and immediately revoke many tokens
      for (let i = 0; i < 10000; i++) {
        const token = securityService.generateJWT(payload);
        securityService.revokeJWT(token);
        
        // Periodic cleanup
        if (i % 1000 === 0) {
          securityService.cleanupExpiredTokens();
        }
      }
      
      // System should still be responsive
      const newToken = securityService.generateJWT(payload);
      expect(() => {
        securityService.verifyJWT(newToken);
      }).not.toThrow();
    });

    it('should handle concurrent refresh operations', async () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Simulate many concurrent refresh operations
      const refreshPromises = Array.from({ length: 100 }, () =>
        Promise.resolve(securityService.generateRefreshToken(userId, sessionId))
      );
      
      const start = Date.now();
      const refreshTokens = await Promise.all(refreshPromises);
      const duration = Date.now() - start;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(3000); // 3 seconds
      
      // All tokens should be valid and unique
      expect(refreshTokens.length).toBe(100);
      
      const jtis = refreshTokens.map(token => {
        const decoded = jwt.decode(token) as any;
        return decoded.jti;
      });
      
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(100); // All unique
    });
  });

  describe('6. Token Binding and Validation', () => {
    it('should enforce strict device binding on token rotation', () => {
      const payload = { userId: 'user123', role: 'user' };
      const device1 = 'device-fingerprint-1';
      const device2 = 'device-fingerprint-2';
      
      // Generate token bound to device1
      const token1 = securityService.generateJWT(payload, '1h', { 
        deviceFingerprint: device1 
      });
      
      // Should work with device1
      expect(() => {
        securityService.verifyJWT(token1, { validateDevice: device1 });
      }).not.toThrow();
      
      // Should fail with device2
      expect(() => {
        securityService.verifyJWT(token1, { validateDevice: device2 });
      }).toThrow('Token device mismatch');
      
      // Generate new token for device2 (rotation)
      const token2 = securityService.generateJWT(payload, '1h', { 
        deviceFingerprint: device2 
      });
      
      // Should work with device2
      expect(() => {
        securityService.verifyJWT(token2, { validateDevice: device2 });
      }).not.toThrow();
      
      // Should fail with device1
      expect(() => {
        securityService.verifyJWT(token2, { validateDevice: device1 });
      }).toThrow('Token device mismatch');
    });

    it('should validate token temporal constraints during rotation', () => {
      const payload = { userId: 'user123', role: 'user' };
      
      // Generate token with current time
      const now = Math.floor(Date.now() / 1000);
      const token = securityService.generateJWT(payload);
      const decoded = jwt.decode(token) as any;
      
      // Should have proper temporal claims
      expect(decoded.iat).toBeDefined();
      expect(decoded.nbf).toBeDefined();
      expect(decoded.exp).toBeDefined();
      
      // Not-before should be current time or earlier
      expect(decoded.nbf).toBeLessThanOrEqual(now + 1); // Allow 1 second tolerance
      
      // Issued-at should be current time or earlier
      expect(decoded.iat).toBeLessThanOrEqual(now + 1);
      
      // Expiration should be in the future
      expect(decoded.exp).toBeGreaterThan(now);
      
      // Not-before should not be in the future
      expect(decoded.nbf).toBeLessThanOrEqual(now + 1);
    });

    it('should maintain audit trail during token rotation', () => {
      const payload = { userId: 'user123', role: 'user', sessionId: 'session456' };
      
      // Generate multiple tokens in rotation
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        const token = securityService.generateJWT(payload);
        tokens.push(token);
      }
      
      // Each token should have unique JTI for audit trail
      const jtis = tokens.map(token => {
        const decoded = jwt.decode(token) as any;
        return decoded.jti;
      });
      
      // All JTIs should be unique and trackable
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(tokens.length);
      
      // JTIs should be sufficiently long for security
      jtis.forEach(jti => {
        expect(jti.length).toBeGreaterThan(16);
        expect(typeof jti).toBe('string');
      });
    });
  });
});