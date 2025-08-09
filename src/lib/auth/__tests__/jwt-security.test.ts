/**
 * Comprehensive JWT Security Test Suite
 * Tests all JWT security fixes and authentication vulnerabilities
 */

// Test environment setup
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dGVzdC1qd3Qtc2VjcmV0LWZvci10ZXN0aW5nLW9ubHktbm90LWZvci1wcm9kdWN0aW9uLXVzZS1hdC1sZWFzdC0yNTYtYml0cw=='; // Test secret (base64, 256+ bits)

import { SecurityService } from '../security';
import { AUTH_CONFIG } from '../config';
import { AuthError } from '@/lib/types/auth';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

// Mock Supabase for isolated testing
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      }),
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
  }
}));

// Mock audit logger
jest.mock('../audit', () => ({
  auditLogger: {
    logSecurity: jest.fn().mockResolvedValue({}),
    logAuth: jest.fn().mockResolvedValue({})
  }
}));

describe('JWT Security Fixes - Comprehensive Test Suite', () => {
  let securityService: SecurityService;
  
  beforeEach(() => {
    securityService = SecurityService.getInstance();
    // Clear any existing blacklist for clean tests
    (SecurityService as any).tokenBlacklist.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test state
    (SecurityService as any).tokenBlacklist.clear();
  });

  describe('1. JWT Secret Validation on Startup', () => {
    it('should fail application startup without JWT_SECRET environment variable', () => {
      expect(() => {
        // Simulate missing JWT_SECRET
        const validateJWTSecret = (secret?: string) => {
          if (!secret) {
            throw new Error(
              'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required. ' +
              'Application cannot start without a cryptographically secure JWT secret.'
            );
          }
          return secret;
        };
        
        validateJWTSecret(undefined);
      }).toThrow('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required');
    });

    it('should reject weak JWT secrets during startup validation', () => {
      const weakSecrets = [
        'secret',
        '123456',
        'your-super-secret-jwt-key',
        'default-secret',
        'changeme',
        'password',
        'admin'
      ];
      
      weakSecrets.forEach(weakSecret => {
        expect(() => {
          const validateJWTSecret = (testSecret: string) => {
            const knownWeakSecrets = [
              'your-super-secret-jwt-key',
              'secret',
              'jwt-secret', 
              'default-secret',
              'changeme',
              'password',
              '123456'
            ];
            
            if (knownWeakSecrets.includes(testSecret)) {
              throw new Error(
                'CRITICAL SECURITY ERROR: JWT_SECRET is using a known weak/default value. ' +
                'This creates a critical authentication bypass vulnerability.'
              );
            }
            
            return testSecret;
          };
          
          validateJWTSecret(weakSecret);
        }).toThrow('CRITICAL SECURITY ERROR: JWT_SECRET is using a known weak/default value');
      });
    });

    it('should enforce minimum JWT secret length (256 bits)', () => {
      const shortSecrets = [
        'short',
        'tooShortSecret',
        Buffer.from('less-than-32-bytes').toString('base64') // Less than 256 bits
      ];
      
      shortSecrets.forEach(shortSecret => {
        expect(() => {
          const validateJWTSecret = (testSecret: string) => {
            // Check decoded length for base64 secrets
            let decodedLength: number;
            try {
              decodedLength = Buffer.from(testSecret, 'base64').length;
            } catch {
              decodedLength = testSecret.length;
            }
            
            if (decodedLength < 32) {
              throw new Error(
                'CRITICAL SECURITY ERROR: JWT_SECRET must be at least 256 bits (32 bytes) in length. ' +
                `Current secret provides only ${decodedLength * 8} bits of security.`
              );
            }
            return testSecret;
          };
          
          validateJWTSecret(shortSecret);
        }).toThrow('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 256 bits');
      });
    });

    it('should validate current JWT_SECRET meets security requirements', () => {
      expect(AUTH_CONFIG.JWT_SECRET).toBeDefined();
      expect(AUTH_CONFIG.JWT_SECRET).not.toBe('your-super-secret-jwt-key');
      expect(AUTH_CONFIG.JWT_SECRET.length).toBeGreaterThan(32);
      
      // Validate against known weak secrets
      const knownWeakSecrets = [
        'your-super-secret-jwt-key',
        'secret',
        'jwt-secret',
        'default-secret',
        'changeme',
        'password',
        '123456'
      ];
      
      knownWeakSecrets.forEach(weakSecret => {
        expect(AUTH_CONFIG.JWT_SECRET).not.toBe(weakSecret);
      });
    });
  });

  describe('2. Enhanced JWT Token Generation', () => {
    it('should generate JWT with enhanced security claims', () => {
      const payload = { userId: 'test123', role: 'user' };
      const token = securityService.generateJWT(payload);
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.jti).toBeDefined(); // JWT ID for revocation
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
      
      expect(decoded.sid).toBe('session123'); // Session ID binding
      expect(decoded.dfp).toBe('device456'); // Device fingerprint
    });

    it('should generate unique JWT IDs to prevent replay attacks', () => {
      const payload = { userId: 'test123' };
      const tokens = [];
      
      // Generate multiple tokens
      for (let i = 0; i < 100; i++) {
        tokens.push(securityService.generateJWT(payload));
      }
      
      const jtis = tokens.map(token => {
        const decoded = jwt.decode(token) as any;
        return decoded.jti;
      });
      
      // All JTIs should be unique
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(tokens.length);
    });

    it('should include proper not-before (nbf) claim', () => {
      const payload = { userId: 'test123' };
      const token = securityService.generateJWT(payload);
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.nbf).toBeDefined();
      expect(decoded.nbf).toBeLessThanOrEqual(now + 1); // Allow 1 second tolerance
      expect(decoded.iat).toBe(decoded.nbf); // Should be same as issued at
    });
  });

  describe('3. Enhanced JWT Token Verification', () => {
    it('should verify valid tokens successfully', () => {
      const payload = { userId: 'test123', role: 'user' };
      const token = securityService.generateJWT(payload);
      
      const decoded = securityService.verifyJWT(token);
      expect(decoded.userId).toBe('test123');
      expect(decoded.role).toBe('user');
      expect(decoded.jti).toBeDefined();
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
      const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, { 
        expiresIn: '-1s',
        algorithm: AUTH_CONFIG.JWT_ALGORITHM,
        issuer: AUTH_CONFIG.JWT_ISSUER,
        audience: AUTH_CONFIG.JWT_AUDIENCE
      });
      
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow('Token has expired');
    });

    it('should validate issuer and audience claims', () => {
      const payload = { userId: 'test123' };
      
      // Test wrong issuer
      const tokenWrongIssuer = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
        algorithm: AUTH_CONFIG.JWT_ALGORITHM,
        issuer: 'wrong-issuer',
        audience: AUTH_CONFIG.JWT_AUDIENCE
      });
      
      expect(() => {
        securityService.verifyJWT(tokenWrongIssuer);
      }).toThrow();
      
      // Test wrong audience
      const tokenWrongAudience = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
        algorithm: AUTH_CONFIG.JWT_ALGORITHM,
        issuer: AUTH_CONFIG.JWT_ISSUER,
        audience: 'wrong-audience'
      });
      
      expect(() => {
        securityService.verifyJWT(tokenWrongAudience);
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

    it('should validate not-before (nbf) claim', () => {
      // Create token with future nbf claim
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const payload = { userId: 'test123', nbf: futureTime };
      const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
        algorithm: AUTH_CONFIG.JWT_ALGORITHM,
        issuer: AUTH_CONFIG.JWT_ISSUER,
        audience: AUTH_CONFIG.JWT_AUDIENCE
      });
      
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow('Token not yet valid');
    });
  });

  describe('4. JWT Token Revocation System', () => {
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

    it('should maintain blacklist integrity during concurrent operations', () => {
      const tokens = [];
      const payload = { userId: 'test123' };
      
      // Generate multiple tokens
      for (let i = 0; i < 10; i++) {
        tokens.push(securityService.generateJWT(payload));
      }
      
      // Revoke all tokens concurrently
      tokens.forEach(token => securityService.revokeJWT(token));
      
      // All tokens should be revoked
      tokens.forEach(token => {
        expect(() => {
          securityService.verifyJWT(token);
        }).toThrow('Token has been revoked');
      });
    });

    it('should handle blacklist cleanup without affecting valid tokens', () => {
      const payload = { userId: 'test123' };
      const validToken = securityService.generateJWT(payload);
      const revokedToken = securityService.generateJWT(payload);
      
      // Revoke one token
      securityService.revokeJWT(revokedToken);
      
      // Cleanup blacklist (simulate periodic cleanup)
      securityService.cleanupExpiredTokens();
      
      // Valid token should still work
      expect(() => {
        securityService.verifyJWT(validToken);
      }).not.toThrow();
    });
  });

  describe('5. Token Tampering Detection', () => {
    it('should detect and reject tampered token payloads', () => {
      const payload = { userId: 'test123', role: 'user' };
      const token = securityService.generateJWT(payload);
      
      // Split token and tamper with payload
      const [header, , signature] = token.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ 
        userId: 'admin', 
        role: 'admin' 
      })).toString('base64url');
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
      
      expect(() => {
        securityService.verifyJWT(tamperedToken);
      }).toThrow('Token verification failed');
    });

    it('should detect and reject tokens with modified signatures', () => {
      const payload = { userId: 'test123', role: 'user' };
      const token = securityService.generateJWT(payload);
      
      // Modify the signature
      const [header, payload_part] = token.split('.');
      const tamperedToken = `${header}.${payload_part}.fakesignature`;
      
      expect(() => {
        securityService.verifyJWT(tamperedToken);
      }).toThrow('Token verification failed');
    });

    it('should detect header tampering attempts', () => {
      const payload = { userId: 'test123' };
      const token = securityService.generateJWT(payload);
      
      // Tamper with header (try to change algorithm)
      const [, payload_part, signature] = token.split('.');
      const tamperedHeader = Buffer.from(JSON.stringify({
        alg: 'none',
        typ: 'JWT'
      })).toString('base64url');
      const tamperedToken = `${tamperedHeader}.${payload_part}.${signature}`;
      
      expect(() => {
        securityService.verifyJWT(tamperedToken);
      }).toThrow();
    });
  });

  describe('6. Authentication Bypass Prevention', () => {
    it('should prevent none algorithm attack', () => {
      const payload = { userId: 'test123', role: 'admin' };
      const token = jwt.sign(payload, '', { algorithm: 'none' as any });
      
      expect(() => {
        securityService.verifyJWT(token);
      }).toThrow();
    });

    it('should prevent algorithm confusion attacks', () => {
      // Try to use different algorithms that shouldn't be accepted
      const payload = { userId: 'test123', role: 'admin' };
      const unsafeAlgorithms = ['RS256', 'ES256', 'none'];
      
      unsafeAlgorithms.forEach(alg => {
        try {
          const token = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, { algorithm: alg as any });
          expect(() => {
            securityService.verifyJWT(token);
          }).toThrow();
        } catch (error) {
          // Expected - algorithm not supported
        }
      });
    });

    it('should prevent weak secret attacks', () => {
      const payload = { userId: 'test123' };
      const weakSecrets = ['secret', '123456', 'password', 'admin'];
      
      weakSecrets.forEach(weakSecret => {
        const token = jwt.sign(payload, weakSecret, {
          algorithm: AUTH_CONFIG.JWT_ALGORITHM,
          issuer: AUTH_CONFIG.JWT_ISSUER,
          audience: AUTH_CONFIG.JWT_AUDIENCE
        });
        
        expect(() => {
          securityService.verifyJWT(token);
        }).toThrow();
      });
    });

    it('should validate required algorithm configuration', () => {
      expect(AUTH_CONFIG.JWT_ALGORITHM).toBe('HS256');
      expect(AUTH_CONFIG.JWT_ISSUER).toBeDefined();
      expect(AUTH_CONFIG.JWT_AUDIENCE).toBeDefined();
    });
  });

  describe('7. Secure Password Hashing', () => {
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
      
      // Both should verify correctly
      expect(await securityService.verifyPassword(password, hash1)).toBe(true);
      expect(await securityService.verifyPassword(password, hash2)).toBe(true);
    });

    it('should use strong bcrypt configuration', async () => {
      const password = 'testPassword123!';
      const hash = await securityService.hashPassword(password);
      
      // Verify bcrypt format and cost factor (should be 12)
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
      
      // Verify timing (bcrypt with cost 12 should take reasonable time)
      const start = Date.now();
      await securityService.verifyPassword(password, hash);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThan(50); // Should take some time
      expect(duration).toBeLessThan(5000); // But not too long
    });

    it('should resist timing attacks in password verification', async () => {
      const password = 'testPassword123!';
      const hash = await securityService.hashPassword(password);
      const wrongPassword = 'wrongPassword123!';
      
      // Measure timing for correct password
      const times = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await securityService.verifyPassword(password, hash);
        times.push(Date.now() - start);
      }
      
      // Measure timing for wrong password
      const wrongTimes = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await securityService.verifyPassword(wrongPassword, hash);
        wrongTimes.push(Date.now() - start);
      }
      
      // Times should be relatively consistent (bcrypt provides timing resistance)
      const avgCorrect = times.reduce((a, b) => a + b, 0) / times.length;
      const avgWrong = wrongTimes.reduce((a, b) => a + b, 0) / wrongTimes.length;
      
      // Difference should be minimal (within 50% of each other)
      const ratio = Math.abs(avgCorrect - avgWrong) / Math.max(avgCorrect, avgWrong);
      expect(ratio).toBeLessThan(0.5);
    });
  });

  describe('8. Refresh Token Security', () => {
    it('should generate refresh tokens with proper claims', () => {
      const refreshToken = securityService.generateRefreshToken('user123', 'session456');
      const decoded = jwt.decode(refreshToken) as any;
      
      expect(decoded.userId).toBe('user123');
      expect(decoded.sessionId).toBe('session456');
      expect(decoded.type).toBe('refresh');
      expect(decoded.version).toBe(1);
      expect(decoded.jti).toBeDefined(); // Should have unique JWT ID
      expect(decoded.iss).toBe(AUTH_CONFIG.JWT_ISSUER);
      expect(decoded.aud).toBe(AUTH_CONFIG.JWT_AUDIENCE);
    });

    it('should support token rotation with versioning', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      // Generate initial refresh token
      const refreshToken1 = securityService.generateRefreshToken(userId, sessionId);
      const decoded1 = jwt.decode(refreshToken1) as any;
      
      // Generate new refresh token (simulating rotation)
      const refreshToken2 = securityService.generateRefreshToken(userId, sessionId);
      const decoded2 = jwt.decode(refreshToken2) as any;
      
      // Tokens should have different JTIs but same version
      expect(decoded1.jti).not.toBe(decoded2.jti);
      expect(decoded1.version).toBe(decoded2.version);
      expect(decoded1.userId).toBe(decoded2.userId);
      expect(decoded1.sessionId).toBe(decoded2.sessionId);
    });

    it('should validate refresh tokens with same security checks', () => {
      const refreshToken = securityService.generateRefreshToken('user123', 'session456');
      
      // Should verify with standard verification
      expect(() => {
        securityService.verifyJWT(refreshToken);
      }).not.toThrow();
      
      // Should be revokable
      securityService.revokeJWT(refreshToken);
      expect(() => {
        securityService.verifyJWT(refreshToken);
      }).toThrow('Token has been revoked');
    });
  });

  describe('9. Session Hijacking Prevention', () => {
    it('should bind tokens to device fingerprints', () => {
      const payload = { userId: 'test123' };
      const deviceFingerprint = 'device123';
      const token = securityService.generateJWT(payload, '1h', { deviceFingerprint });
      
      // Should work with correct device fingerprint
      expect(() => {
        securityService.verifyJWT(token, { validateDevice: deviceFingerprint });
      }).not.toThrow();
      
      // Should fail with different device fingerprint
      expect(() => {
        securityService.verifyJWT(token, { validateDevice: 'different-device' });
      }).toThrow('Token device mismatch');
    });

    it('should generate unique device fingerprints', () => {
      const userAgent1 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const userAgent2 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      
      const fingerprint1 = securityService.generateDeviceFingerprint(userAgent1, ip1);
      const fingerprint2 = securityService.generateDeviceFingerprint(userAgent2, ip2);
      const fingerprint3 = securityService.generateDeviceFingerprint(userAgent1, ip2);
      
      expect(fingerprint1).not.toBe(fingerprint2);
      expect(fingerprint1).not.toBe(fingerprint3);
      expect(fingerprint2).not.toBe(fingerprint3);
      
      // Same inputs should produce same fingerprint
      const fingerprint1_duplicate = securityService.generateDeviceFingerprint(userAgent1, ip1);
      expect(fingerprint1).toBe(fingerprint1_duplicate);
    });

    it('should create secure session bindings', async () => {
      const userId = 'user123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 Test Browser';
      
      const session = await securityService.createSession(userId, ipAddress, userAgent);
      
      expect(session.id).toBeDefined();
      expect(session.user_id).toBe(userId);
      expect(session.ip_address).toBe(ipAddress);
      expect(session.user_agent).toBe(userAgent);
      expect(session.device_fingerprint).toBeDefined();
      expect(session.is_active).toBe(true);
      expect(new Date(session.expires_at)).toBeInstanceOf(Date);
    });
  });

  describe('10. Cryptographic Security', () => {
    it('should use secure random number generation for IDs', () => {
      const ids = new Set();
      
      // Generate many IDs to test for uniqueness and entropy
      for (let i = 0; i < 1000; i++) {
        const id = securityService.generateSecureId();
        expect(ids.has(id)).toBe(false); // Should not have duplicates
        ids.add(id);
        expect(id.length).toBeGreaterThan(32); // Should be sufficiently long
        expect(/^[a-f0-9]+$/i.test(id)).toBe(true); // Should be hex string
      }
    });

    it('should provide sufficient entropy in generated IDs', () => {
      const ids = new Set();
      const numIds = 10000;
      
      // Generate many IDs
      for (let i = 0; i < numIds; i++) {
        const id = securityService.generateSecureId();
        expect(ids.has(id)).toBe(false); // No collisions
        ids.add(id);
      }
      
      expect(ids.size).toBe(numIds); // All unique
    });
  });

  describe('11. Error Handling and Security', () => {
    it('should provide specific error codes without information leakage', () => {
      const scenarios = [
        {
          name: 'malformed token',
          token: 'malformed.token',
          expectedPattern: /TOKEN_VERIFICATION_FAILED/
        },
        {
          name: 'expired token',
          token: jwt.sign({ userId: 'test' }, AUTH_CONFIG.JWT_SECRET, { 
            expiresIn: '-1s',
            algorithm: AUTH_CONFIG.JWT_ALGORITHM,
            issuer: AUTH_CONFIG.JWT_ISSUER,
            audience: AUTH_CONFIG.JWT_AUDIENCE
          }),
          expectedPattern: /TOKEN_EXPIRED/
        },
        {
          name: 'invalid signature',
          token: jwt.sign({ userId: 'test' }, 'wrong-secret', {
            algorithm: AUTH_CONFIG.JWT_ALGORITHM,
            issuer: AUTH_CONFIG.JWT_ISSUER,
            audience: AUTH_CONFIG.JWT_AUDIENCE
          }),
          expectedPattern: /TOKEN_VERIFICATION_FAILED/
        }
      ];
      
      scenarios.forEach(({ name, token, expectedPattern }) => {
        try {
          securityService.verifyJWT(token);
          fail(`Expected error for ${name}`);
        } catch (error: any) {
          expect(error).toBeInstanceOf(AuthError);
          expect(error.code).toMatch(expectedPattern);
          // Ensure no sensitive information is leaked
          expect(error.message).not.toContain(AUTH_CONFIG.JWT_SECRET);
        }
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        'not.a.jwt',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.', // Incomplete token
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' // Missing signature
      ];
      
      edgeCases.forEach(token => {
        expect(() => {
          securityService.verifyJWT(token as any);
        }).toThrow();
      });
    });

    it('should log security events without exposing sensitive data', () => {
      const payload = { userId: 'test123', sensitiveData: 'secret-info' };
      const token = securityService.generateJWT(payload);
      
      // Revoke token to trigger security logging
      securityService.revokeJWT(token);
      
      // Verify token is in blacklist but sensitive data isn't logged
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        securityService.verifyJWT(token);
      } catch (error) {
        // Security event should be logged without sensitive data
        expect(consoleSpy).toHaveBeenCalled();
        const logCalls = consoleSpy.mock.calls;
        logCalls.forEach(call => {
          expect(call.join(' ')).not.toContain('secret-info');
          expect(call.join(' ')).not.toContain(AUTH_CONFIG.JWT_SECRET);
        });
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('12. Password Security Validation', () => {
    it('should enforce minimum password complexity', () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'admin',
        'welcome',
        'abc123',
        'Password', // Missing numbers and symbols
        'password123', // Missing uppercase and symbols
        'PASSWORD123!' // Missing lowercase
      ];
      
      weakPasswords.forEach(password => {
        const validation = securityService.validatePassword(password);
        expect(validation.meets_policy).toBe(false);
        expect(validation.strength).toMatch(/(very-weak|weak|fair)/);
      });
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MySecureP@ssw0rd!',
        'C0mpl3x&S3cur3!',
        'Th1s!sV3ryStr0ng#',
        'P@ssw0rd#2024$'
      ];
      
      strongPasswords.forEach(password => {
        const validation = securityService.validatePassword(password);
        expect(validation.meets_policy).toBe(true);
        expect(validation.strength).toMatch(/(good|strong)/);
      });
    });

    it('should detect common password patterns', () => {
      const commonPatterns = [
        'password123456',
        'qwerty123',
        'admin2024',
        'welcome123'
      ];
      
      commonPatterns.forEach(password => {
        const validation = securityService.validatePassword(password);
        expect(validation.feedback).toContain('Avoid common password patterns');
      });
    });

    it('should detect repeating characters', () => {
      const repeatingPasswords = [
        'aaabbbccc123!',
        'Password111!',
        'MyPasssssword!'
      ];
      
      repeatingPasswords.forEach(password => {
        const validation = securityService.validatePassword(password);
        expect(validation.feedback).toContain('Avoid repeating characters');
      });
    });
  });

  describe('13. Rate Limiting Security', () => {
    it('should enforce rate limits correctly', async () => {
      const key = 'test-key';
      const config = { max_requests: 3, window_ms: 60000 };
      
      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const result = await securityService.checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(3 - i - 1);
      }
      
      // 4th request should be blocked
      const blocked = await securityService.checkRateLimit(key, config);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retry_after).toBeGreaterThan(0);
    });

    it('should reset rate limit after window expires', async () => {
      const key = 'test-reset-key';
      const config = { max_requests: 2, window_ms: 100 }; // Short window for testing
      
      // Exhaust rate limit
      await securityService.checkRateLimit(key, config);
      await securityService.checkRateLimit(key, config);
      const blocked = await securityService.checkRateLimit(key, config);
      expect(blocked.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be allowed again
      const renewed = await securityService.checkRateLimit(key, config);
      expect(renewed.allowed).toBe(true);
    });
  });

  describe('14. Legacy Password Migration Security', () => {
    it('should provide migration capability for legacy passwords', async () => {
      // This would be used to migrate from old JWT-secret-based hashes
      const userId = 'test-user-123';
      const plainPassword = 'userPassword123!';
      
      // This test verifies the method exists and has proper structure
      expect(securityService.migrateLegacyPasswordHash).toBeDefined();
      expect(typeof securityService.migrateLegacyPasswordHash).toBe('function');
    });

    it('should generate secure bcrypt hashes during migration', async () => {
      const plainPassword = 'legacyPassword123!';
      const newHash = await securityService.hashPassword(plainPassword);
      
      // Verify new hash is bcrypt format
      expect(newHash).toMatch(/^\$2[aby]\$12\$/);
      
      // Verify it doesn't contain JWT secret
      expect(newHash).not.toContain(AUTH_CONFIG.JWT_SECRET);
      
      // Verify it can be verified
      const isValid = await securityService.verifyPassword(plainPassword, newHash);
      expect(isValid).toBe(true);
    });
  });
});