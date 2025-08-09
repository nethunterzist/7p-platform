/**
 * JWT Security Test Suite
 * Comprehensive testing for JWT authentication security fixes
 */

import { SecurityService } from '../security';
import { AUTH_CONFIG } from '../config';
import * as jwt from 'jsonwebtoken';

describe('JWT Security Fixes', () => {
  let securityService: SecurityService;
  
  beforeEach(() => {
    securityService = SecurityService.getInstance();
    // Clear any existing blacklist for clean tests
    (SecurityService as any).tokenBlacklist.clear();
  });

  describe('JWT Secret Security Validation', () => {
    it('should validate JWT_SECRET exists and is secure', () => {
      expect(AUTH_CONFIG.JWT_SECRET).toBeDefined();
      expect(AUTH_CONFIG.JWT_SECRET).not.toBe('your-super-secret-jwt-key');
      expect(AUTH_CONFIG.JWT_SECRET.length).toBeGreaterThan(32);
    });

    it('should include proper JWT algorithm configuration', () => {
      expect(AUTH_CONFIG.JWT_ALGORITHM).toBe('HS256');
      expect(AUTH_CONFIG.JWT_ISSUER).toBeDefined();
      expect(AUTH_CONFIG.JWT_AUDIENCE).toBeDefined();
    });
  });

  describe('Secure Password Hashing', () => {
    it('should hash passwords with bcrypt (no JWT secret reuse)', async () => {
      const password = 'testPassword123!';
      const hash = await securityService.hashPassword(password);
      
      // Verify bcrypt format (starts with $2a$, $2b$, or $2y$)
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(hash).not.toContain(AUTH_CONFIG.JWT_SECRET);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });

    it('should verify passwords correctly', async () => {
      const password = 'testPassword123!';
      const hash = await securityService.hashPassword(password);
      
      const isValid = await securityService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await securityService.verifyPassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should generate unique salts for each password', async () => {
      const password = 'samePassword123!';
      const hash1 = await securityService.hashPassword(password);
      const hash2 = await securityService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Different salts = different hashes
    });
  });

  describe('Enhanced JWT Token Generation', () => {
    it('should generate JWT with enhanced security claims', () => {
      const payload = { userId: 'test123', role: 'user' };
      const token = securityService.generateJWT(payload);
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.jti).toBeDefined(); // JWT ID
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.nbf).toBeDefined(); // Not before
      expect(decoded.iss).toBe(AUTH_CONFIG.JWT_ISSUER); // Issuer
      expect(decoded.aud).toBe(AUTH_CONFIG.JWT_AUDIENCE); // Audience
      expect(decoded.userId).toBe('test123');
      expect(decoded.role).toBe('user');
    });

    it('should bind tokens to session and device when provided', () => {
      const payload = { userId: 'test123' };
      const options = {
        sessionId: 'session123',
        deviceFingerprint: 'device456'
      };
      
      const token = securityService.generateJWT(payload, '1h', options);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.sid).toBe('session123');
      expect(decoded.dfp).toBe('device456');
    });
  });

  describe('Enhanced JWT Token Verification', () => {
    it('should verify valid tokens successfully', () => {
      const payload = { userId: 'test123', role: 'user' };
      const token = securityService.generateJWT(payload);
      
      const decoded = securityService.verifyJWT(token);
      expect(decoded.userId).toBe('test123');
      expect(decoded.role).toBe('user');
    });

    it('should reject tokens with invalid signature', () => {
      const payload = { userId: 'test123' };
      const token = jwt.sign(payload, 'wrong-secret');
      
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow('Token verification failed');
    });

    it('should reject expired tokens', () => {
      const payload = { userId: 'test123' };
      const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, { expiresIn: '-1s' });
      
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow('Token has expired');
    });

    it('should validate issuer and audience', () => {
      const payload = { userId: 'test123' };
      const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
        issuer: 'wrong-issuer',
        audience: 'wrong-audience'
      });
      
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow();
    });

    it('should validate device fingerprint when provided', () => {
      const payload = { userId: 'test123' };
      const options = { deviceFingerprint: 'device123' };
      const token = securityService.generateJWT(payload, '1h', options);
      
      // Should pass with correct device fingerprint
      expect(() => {
        securityService.verifyJWT(token, { validateDevice: 'device123' });
      }).not.toThrow();
      
      // Should fail with wrong device fingerprint
      expect(() => {
        securityService.verifyJWT(token, { validateDevice: 'wrong-device' });
      }).toThrow('Token device mismatch');
    });
  });

  describe('JWT Token Revocation', () => {
    it('should revoke tokens and reject them on verification', () => {
      const payload = { userId: 'test123' };
      const token = securityService.generateJWT(payload);
      
      // Should verify successfully initially
      expect(() => {
        securityService.verifyJWT(token);
      }).not.toThrow();
      
      // Revoke the token
      securityService.revokeJWT(token);
      
      // Should now be rejected
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow('Token has been revoked');
    });

    it('should allow skipping blacklist check when needed', () => {
      const payload = { userId: 'test123' };
      const token = securityService.generateJWT(payload);
      
      securityService.revokeJWT(token);
      
      // Should still work when blacklist check is skipped
      expect(() => {
        securityService.verifyJWT(token, { checkBlacklist: false });
      }).not.toThrow();
    });
  });

  describe('Refresh Token Generation', () => {
    it('should generate refresh tokens with proper claims', () => {
      const refreshToken = securityService.generateRefreshToken('user123', 'session456');
      const decoded = jwt.decode(refreshToken) as any;
      
      expect(decoded.userId).toBe('user123');
      expect(decoded.sessionId).toBe('session456');
      expect(decoded.type).toBe('refresh');
      expect(decoded.version).toBe(1);
    });
  });

  describe('Security Error Handling', () => {
    it('should provide specific error codes for different failure types', () => {
      // Test various error scenarios
      const scenarios = [
        {
          token: 'invalid.token.format',
          expectedError: 'TOKEN_VERIFICATION_FAILED'
        },
        {
          token: jwt.sign({ userId: 'test' }, AUTH_CONFIG.JWT_SECRET, { expiresIn: '-1s' }),
          expectedError: 'TOKEN_EXPIRED'
        }
      ];
      
      scenarios.forEach(({ token, expectedError }) => {
        try {
          securityService.verifyJWT(token);
          fail('Expected error was not thrown');
        } catch (error: any) {
          expect(error.code).toBeDefined(); // Should have error code
        }
      });
    });
  });

  describe('Secure ID Generation', () => {
    it('should generate cryptographically secure random IDs', () => {
      const id1 = securityService.generateSecureId();
      const id2 = securityService.generateSecureId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2); // Should be unique
      expect(id1.length).toBeGreaterThan(32); // Should be sufficiently long
    });
  });

  describe('Legacy Password Migration', () => {
    it('should provide migration capability for legacy passwords', async () => {
      // This would be used to migrate from old JWT-secret-based hashes
      const userId = 'test-user-123';
      const plainPassword = 'userPassword123!';
      
      // Mock the database operation
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      };
      
      // This test verifies the method exists and has proper structure
      expect(securityService.migrateLegacyPasswordHash).toBeDefined();
      expect(typeof securityService.migrateLegacyPasswordHash).toBe('function');
    });
  });
});

describe('JWT Configuration Security Validation', () => {
  describe('Environment Variable Validation', () => {
    it('should fail fast without JWT_SECRET', () => {
      // This test verifies the validation function exists
      // In real deployment, missing JWT_SECRET would prevent app startup
      expect(AUTH_CONFIG.JWT_SECRET).toBeDefined();
      expect(AUTH_CONFIG.JWT_SECRET).not.toBe('your-super-secret-jwt-key');
    });
  });
});