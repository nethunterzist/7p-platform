# Authentication Security Guide - 7P Education Platform

## Executive Summary

This comprehensive authentication security guide provides detailed implementation strategies for secure authentication systems, multi-factor authentication, session management, password policies, and biometric authentication for the 7P Education Platform. The guide ensures robust user identity verification while maintaining usability and compliance with security best practices.

### Authentication Security Overview
- **Multi-Layered Authentication**: MFA, biometric, and behavioral authentication
- **Zero-Trust Architecture**: Continuous verification and risk-based authentication
- **Advanced Session Management**: Secure token handling and session lifecycle
- **Password Security**: Comprehensive policy enforcement and breach detection
- **Biometric Integration**: Seamless biometric authentication implementation

### Implementation Status
- ✅ **Basic Authentication**: NextAuth.js with secure credential handling
- ✅ **OAuth2 Integration**: Google, GitHub, and educational provider SSO
- ✅ **Password Security**: Bcrypt hashing with salt rounds
- ⚠️ **Multi-Factor Authentication**: TOTP implementation in progress
- ⚠️ **Biometric Authentication**: WebAuthn integration pending
- ⚠️ **Behavioral Analytics**: Risk-based authentication development

## 1. Secure Authentication Foundation

### Next.js Authentication Architecture
```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from '../../../lib/mongodb'
import { AuthenticationService } from '../../../lib/auth/authentication'
import { SecurityLogger } from '../../../lib/security/logger'
import { RateLimiter } from '../../../lib/security/rateLimiting'

export default NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update every hour
  },
  
  providers: [
    // Enhanced credentials provider with security features
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpToken: { label: 'TOTP Token', type: 'text' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' }
      },
      
      async authorize(credentials, req) {
        try {
          // Rate limiting check
          const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress
          await RateLimiter.checkAuthenticationAttempts(clientIP, credentials.email)

          // Input validation and sanitization
          const validatedCredentials = AuthenticationService.validateCredentials(credentials)

          // Enhanced authentication with security logging
          const authResult = await AuthenticationService.authenticate({
            email: validatedCredentials.email,
            password: validatedCredentials.password,
            totpToken: validatedCredentials.totpToken,
            clientInfo: {
              ip: clientIP,
              userAgent: req.headers['user-agent'],
              timestamp: new Date()
            }
          })

          if (authResult.success) {
            // Log successful authentication
            await SecurityLogger.logAuthEvent({
              type: 'login_success',
              userId: authResult.user.id,
              email: authResult.user.email,
              clientIP,
              userAgent: req.headers['user-agent'],
              mfaUsed: !!validatedCredentials.totpToken
            })

            return {
              id: authResult.user.id,
              email: authResult.user.email,
              name: authResult.user.name,
              role: authResult.user.role,
              emailVerified: authResult.user.emailVerified,
              mfaEnabled: authResult.user.mfaEnabled,
              lastLoginAt: new Date()
            }
          } else {
            // Log failed authentication
            await SecurityLogger.logAuthEvent({
              type: 'login_failure',
              email: validatedCredentials.email,
              reason: authResult.reason,
              clientIP,
              userAgent: req.headers['user-agent']
            })
            
            throw new Error(authResult.reason || 'Authentication failed')
          }
        } catch (error) {
          // Log authentication error
          await SecurityLogger.logAuthEvent({
            type: 'login_error',
            email: credentials?.email,
            error: error.message,
            clientIP,
            userAgent: req.headers['user-agent']
          })
          
          throw error
        }
      }
    }),

    // Enhanced Google OAuth provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      // Enhanced JWT token with security features
      if (user) {
        token.role = user.role
        token.emailVerified = user.emailVerified
        token.mfaEnabled = user.mfaEnabled
        token.loginTime = Date.now()
        token.sessionId = AuthenticationService.generateSessionId()
        
        // Add security fingerprint
        token.fingerprint = await AuthenticationService.generateSecurityFingerprint({
          userId: user.id,
          loginTime: token.loginTime
        })
      }

      // Token refresh security validation
      if (trigger === 'update') {
        // Validate token integrity
        const isValid = await AuthenticationService.validateTokenIntegrity(token)
        if (!isValid) {
          throw new Error('Token integrity validation failed')
        }
      }

      // Add token expiration warnings
      const tokenAge = Date.now() - token.loginTime
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (tokenAge > maxAge * 0.8) { // 80% of max age
        token.nearExpiry = true
      }

      return token
    },

    async session({ session, token }) {
      // Enhanced session with security context
      session.user.id = token.sub
      session.user.role = token.role
      session.user.emailVerified = token.emailVerified
      session.user.mfaEnabled = token.mfaEnabled
      session.sessionId = token.sessionId
      session.fingerprint = token.fingerprint
      session.nearExpiry = token.nearExpiry || false
      
      // Add session security metadata
      session.security = {
        loginTime: new Date(token.loginTime),
        lastActivity: new Date(),
        riskScore: await AuthenticationService.calculateSessionRisk(token),
        deviceTrusted: await AuthenticationService.isDeviceTrusted(token.fingerprint)
      }

      return session
    },

    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Pre-signin security validation
        if (account?.provider === 'google') {
          // Validate Google OAuth response
          const isValidOAuth = await AuthenticationService.validateOAuthResponse({
            provider: 'google',
            account,
            profile
          })
          
          if (!isValidOAuth) {
            await SecurityLogger.logAuthEvent({
              type: 'oauth_validation_failed',
              provider: 'google',
              email: profile?.email
            })
            return false
          }
        }

        // Check for account lockout
        if (user?.email) {
          const isLocked = await AuthenticationService.isAccountLocked(user.email)
          if (isLocked.locked) {
            await SecurityLogger.logAuthEvent({
              type: 'signin_blocked_locked_account',
              email: user.email,
              lockReason: isLocked.reason
            })
            return false
          }
        }

        // Email verification check for new signups
        if (account?.provider === 'credentials' && !user.emailVerified) {
          // Send verification email but allow signin
          await AuthenticationService.sendVerificationEmail(user.email)
        }

        return true
      } catch (error) {
        await SecurityLogger.logAuthEvent({
          type: 'signin_error',
          email: user?.email || email?.verificationRequest?.identifier,
          error: error.message
        })
        return false
      }
    }
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Track successful sign-ins
      await SecurityLogger.logAuthEvent({
        type: 'signin_success',
        userId: user.id,
        email: user.email,
        provider: account.provider,
        isNewUser
      })

      // Update user login statistics
      await AuthenticationService.updateLoginStats(user.id, {
        lastLoginAt: new Date(),
        loginCount: await AuthenticationService.incrementLoginCount(user.id),
        provider: account.provider
      })
    },

    async signOut({ session, token }) {
      // Secure sign-out with session cleanup
      if (session?.sessionId) {
        await AuthenticationService.invalidateSession(session.sessionId)
      }

      await SecurityLogger.logAuthEvent({
        type: 'signout',
        userId: token?.sub,
        sessionId: session?.sessionId
      })
    }
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request'
  },

  // Enhanced security configuration
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? 
        '__Secure-next-auth.session-token' : 
        'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 // 24 hours
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? 
        '__Secure-next-auth.callback-url' : 
        'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? 
        '__Host-next-auth.csrf-token' : 
        'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
})
```

### Core Authentication Service
```javascript
// lib/auth/authentication.js
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import speakeasy from 'speakeasy'
import { User, LoginAttempt, SecurityEvent } from '../models'
import { PasswordValidator } from './passwordValidator'
import { DeviceFingerprinting } from './deviceFingerprinting'

export class AuthenticationService {
  static async authenticate({ email, password, totpToken, clientInfo }) {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim()
      
      // Find user with security context
      const user = await User.findOne({ 
        email: normalizedEmail 
      }).select('+password +mfaSecret +failedLoginAttempts +lastFailedLogin +accountLocked')

      if (!user) {
        // Log authentication attempt for non-existent user
        await this.logFailedAttempt(normalizedEmail, 'user_not_found', clientInfo)
        throw new Error('Invalid credentials')
      }

      // Check account lock status
      if (user.accountLocked && user.accountLocked.lockedUntil > Date.now()) {
        await this.logFailedAttempt(normalizedEmail, 'account_locked', clientInfo)
        throw new Error('Account temporarily locked')
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user, 'invalid_password', clientInfo)
        throw new Error('Invalid credentials')
      }

      // Validate MFA if enabled
      if (user.mfaEnabled) {
        if (!totpToken) {
          throw new Error('MFA token required')
        }

        const isMFAValid = speakeasy.totp.verify({
          secret: user.mfaSecret,
          encoding: 'base32',
          token: totpToken,
          window: 2 // Allow 2 time steps for clock drift
        })

        if (!isMFAValid) {
          await this.handleFailedLogin(user, 'invalid_mfa', clientInfo)
          throw new Error('Invalid MFA token')
        }
      }

      // Successful authentication - reset failed attempts
      await this.resetFailedAttempts(user._id)
      
      // Update last login
      user.lastLoginAt = new Date()
      user.lastLoginIP = clientInfo.ip
      await user.save()

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          mfaEnabled: user.mfaEnabled
        }
      }
    } catch (error) {
      return {
        success: false,
        reason: error.message
      }
    }
  }

  static async handleFailedLogin(user, reason, clientInfo) {
    const maxAttempts = 5
    const lockoutDuration = 30 * 60 * 1000 // 30 minutes

    // Increment failed attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
    user.lastFailedLogin = new Date()

    // Lock account if max attempts exceeded
    if (user.failedLoginAttempts >= maxAttempts) {
      user.accountLocked = {
        lockedAt: new Date(),
        lockedUntil: new Date(Date.now() + lockoutDuration),
        reason: 'max_login_attempts',
        lockCount: (user.accountLocked?.lockCount || 0) + 1
      }

      // Send account lockout notification
      await this.sendAccountLockoutNotification(user)
    }

    await user.save()

    // Log the failed attempt
    await this.logFailedAttempt(user.email, reason, clientInfo)
  }

  static async logFailedAttempt(email, reason, clientInfo) {
    await LoginAttempt.create({
      email,
      success: false,
      reason,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      timestamp: new Date()
    })

    // Security event for monitoring
    await SecurityEvent.create({
      type: 'failed_login',
      severity: 'medium',
      details: {
        email,
        reason,
        clientIP: clientInfo.ip,
        userAgent: clientInfo.userAgent
      },
      timestamp: new Date()
    })
  }

  static async resetFailedAttempts(userId) {
    await User.updateOne(
      { _id: userId },
      { 
        $unset: { 
          failedLoginAttempts: 1, 
          lastFailedLogin: 1,
          accountLocked: 1 
        }
      }
    )
  }

  // Device fingerprinting for security
  static async generateSecurityFingerprint({ userId, loginTime }) {
    const fingerprintData = {
      userId,
      loginTime,
      timestamp: Date.now()
    }

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData) + process.env.NEXTAUTH_SECRET)
      .digest('hex')
  }

  static async validateTokenIntegrity(token) {
    try {
      // Validate token structure
      if (!token.sub || !token.loginTime || !token.fingerprint) {
        return false
      }

      // Validate fingerprint
      const expectedFingerprint = await this.generateSecurityFingerprint({
        userId: token.sub,
        loginTime: token.loginTime
      })

      return expectedFingerprint === token.fingerprint
    } catch (error) {
      return false
    }
  }

  // Session risk calculation
  static async calculateSessionRisk(token) {
    let riskScore = 0

    // Age-based risk
    const tokenAge = Date.now() - token.loginTime
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (tokenAge > maxAge * 0.8) {
      riskScore += 30 // High risk for old tokens
    } else if (tokenAge > maxAge * 0.5) {
      riskScore += 15 // Medium risk
    }

    // User behavior analysis
    const user = await User.findById(token.sub)
    if (user) {
      // Check for unusual login patterns
      const recentLogins = await LoginAttempt.find({
        userId: user._id,
        success: true,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })

      // Geographic risk (simplified)
      const uniqueIPs = new Set(recentLogins.map(login => login.ipAddress))
      if (uniqueIPs.size > 3) {
        riskScore += 20 // Multiple locations
      }

      // Time-based risk
      const currentHour = new Date().getHours()
      if (currentHour < 6 || currentHour > 22) {
        riskScore += 10 // Off-hours access
      }
    }

    return Math.min(riskScore, 100) // Cap at 100
  }

  static async isDeviceTrusted(fingerprint) {
    // Check if device fingerprint has been seen before
    const trustedDevice = await TrustedDevice.findOne({
      fingerprint,
      trusted: true,
      expiresAt: { $gt: new Date() }
    })

    return !!trustedDevice
  }
}
```

## 2. Multi-Factor Authentication (MFA)

### TOTP-Based MFA Implementation
```javascript
// lib/auth/mfa.js
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { User, MFABackupCode, SecurityEvent } from '../models'

export class MFAService {
  static async enableMFA(userId, userEmail) {
    try {
      // Generate secret for TOTP
      const secret = speakeasy.generateSecret({
        name: `7P Education (${userEmail})`,
        issuer: '7P Education Platform',
        length: 32
      })

      // Generate QR code for easy setup
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()
      
      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(async code => ({
          code: await bcrypt.hash(code, 12),
          used: false,
          createdAt: new Date()
        }))
      )

      // Store MFA configuration (not activated yet)
      const user = await User.findById(userId)
      user.mfaSetup = {
        secret: secret.base32,
        backupCodes: hashedBackupCodes,
        setupAt: new Date(),
        activated: false
      }
      await user.save()

      // Log MFA setup initiation
      await SecurityEvent.create({
        type: 'mfa_setup_initiated',
        userId,
        severity: 'low',
        details: {
          method: 'totp',
          setupAt: new Date()
        }
      })

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes, // Return unhashed codes to user
        setupToken: this.generateSetupToken(userId, secret.base32)
      }
    } catch (error) {
      throw new Error(`MFA setup failed: ${error.message}`)
    }
  }

  static async verifyAndActivateMFA(userId, totpToken, setupToken) {
    try {
      const user = await User.findById(userId)
      
      if (!user.mfaSetup || user.mfaSetup.activated) {
        throw new Error('Invalid MFA setup state')
      }

      // Verify setup token
      const isValidSetupToken = this.verifySetupToken(setupToken, userId, user.mfaSetup.secret)
      if (!isValidSetupToken) {
        throw new Error('Invalid setup token')
      }

      // Verify TOTP token
      const isValidTOTP = speakeasy.totp.verify({
        secret: user.mfaSetup.secret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      })

      if (!isValidTOTP) {
        throw new Error('Invalid TOTP token')
      }

      // Activate MFA
      user.mfaEnabled = true
      user.mfaSecret = user.mfaSetup.secret
      user.mfaActivatedAt = new Date()
      
      // Move backup codes to separate collection
      await MFABackupCode.insertMany(
        user.mfaSetup.backupCodes.map(code => ({
          userId,
          hashedCode: code.code,
          used: false,
          createdAt: code.createdAt
        }))
      )

      // Clear setup data
      user.mfaSetup = undefined
      await user.save()

      // Log MFA activation
      await SecurityEvent.create({
        type: 'mfa_activated',
        userId,
        severity: 'low',
        details: {
          method: 'totp',
          activatedAt: new Date()
        }
      })

      return {
        success: true,
        message: 'MFA successfully activated'
      }
    } catch (error) {
      throw new Error(`MFA activation failed: ${error.message}`)
    }
  }

  static async verifyMFA(userId, token) {
    try {
      const user = await User.findById(userId).select('+mfaSecret')
      
      if (!user.mfaEnabled || !user.mfaSecret) {
        throw new Error('MFA not enabled for user')
      }

      // First try TOTP verification
      const isTOTPValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2
      })

      if (isTOTPValid) {
        // Log successful MFA verification
        await SecurityEvent.create({
          type: 'mfa_verified',
          userId,
          severity: 'low',
          details: {
            method: 'totp',
            verifiedAt: new Date()
          }
        })

        return { success: true, method: 'totp' }
      }

      // If TOTP fails, try backup codes
      const backupCodeResult = await this.verifyBackupCode(userId, token)
      if (backupCodeResult.success) {
        return backupCodeResult
      }

      // Log failed MFA attempt
      await SecurityEvent.create({
        type: 'mfa_verification_failed',
        userId,
        severity: 'medium',
        details: {
          attempts: ['totp', 'backup_code'],
          failedAt: new Date()
        }
      })

      throw new Error('Invalid MFA token')
    } catch (error) {
      throw error
    }
  }

  static async verifyBackupCode(userId, code) {
    try {
      const backupCodes = await MFABackupCode.find({ userId, used: false })
      
      for (const backupCode of backupCodes) {
        const isValidCode = await bcrypt.compare(code, backupCode.hashedCode)
        
        if (isValidCode) {
          // Mark backup code as used
          backupCode.used = true
          backupCode.usedAt = new Date()
          await backupCode.save()

          // Log backup code usage
          await SecurityEvent.create({
            type: 'mfa_backup_code_used',
            userId,
            severity: 'medium',
            details: {
              codeId: backupCode._id,
              usedAt: new Date()
            }
          })

          // Check remaining backup codes
          const remainingCodes = await MFABackupCode.countDocuments({
            userId,
            used: false
          })

          // Warn if running low on backup codes
          if (remainingCodes <= 2) {
            await this.sendBackupCodeWarning(userId, remainingCodes)
          }

          return {
            success: true,
            method: 'backup_code',
            remainingCodes
          }
        }
      }

      return { success: false }
    } catch (error) {
      throw new Error(`Backup code verification failed: ${error.message}`)
    }
  }

  static generateBackupCodes(count = 10) {
    const codes = []
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }

  static generateSetupToken(userId, secret) {
    const payload = {
      userId,
      secret,
      timestamp: Date.now()
    }
    
    return crypto
      .createHmac('sha256', process.env.NEXTAUTH_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')
  }

  static verifySetupToken(token, userId, secret) {
    const expectedToken = this.generateSetupToken(userId, secret)
    return token === expectedToken
  }

  static async disableMFA(userId, totpToken, reason = 'user_request') {
    try {
      const user = await User.findById(userId).select('+mfaSecret')
      
      if (!user.mfaEnabled) {
        throw new Error('MFA not enabled')
      }

      // Verify current MFA token before disabling
      const isValidTOTP = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      })

      if (!isValidTOTP) {
        throw new Error('Invalid TOTP token')
      }

      // Disable MFA
      user.mfaEnabled = false
      user.mfaSecret = undefined
      user.mfaDisabledAt = new Date()
      user.mfaDisabledReason = reason
      await user.save()

      // Remove backup codes
      await MFABackupCode.deleteMany({ userId })

      // Log MFA disabling
      await SecurityEvent.create({
        type: 'mfa_disabled',
        userId,
        severity: 'medium',
        details: {
          reason,
          disabledAt: new Date()
        }
      })

      return {
        success: true,
        message: 'MFA successfully disabled'
      }
    } catch (error) {
      throw new Error(`MFA disable failed: ${error.message}`)
    }
  }

  static async generateNewBackupCodes(userId, totpToken) {
    try {
      const user = await User.findById(userId).select('+mfaSecret')
      
      if (!user.mfaEnabled) {
        throw new Error('MFA not enabled')
      }

      // Verify current MFA token
      const isValidTOTP = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      })

      if (!isValidTOTP) {
        throw new Error('Invalid TOTP token')
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes()
      const hashedBackupCodes = await Promise.all(
        newBackupCodes.map(async code => ({
          userId,
          hashedCode: await bcrypt.hash(code, 12),
          used: false,
          createdAt: new Date()
        }))
      )

      // Replace old backup codes
      await MFABackupCode.deleteMany({ userId })
      await MFABackupCode.insertMany(hashedBackupCodes)

      // Log backup code regeneration
      await SecurityEvent.create({
        type: 'mfa_backup_codes_regenerated',
        userId,
        severity: 'low',
        details: {
          count: newBackupCodes.length,
          regeneratedAt: new Date()
        }
      })

      return {
        success: true,
        backupCodes: newBackupCodes
      }
    } catch (error) {
      throw new Error(`Backup code generation failed: ${error.message}`)
    }
  }
}
```

## 3. Advanced Password Security

### Comprehensive Password Policy Implementation
```javascript
// lib/auth/passwordValidator.js
import zxcvbn from 'zxcvbn'
import { BreachedPasswordChecker } from './breachedPasswordChecker'
import { User, PasswordHistory, SecurityEvent } from '../models'

export class PasswordValidator {
  static passwordPolicy = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventPersonalInfo: true,
    preventReuse: true,
    reuseHistory: 12, // Last 12 passwords
    minStrengthScore: 3, // zxcvbn score 0-4
    preventBreachedPasswords: true,
    maxSequentialChars: 3,
    maxRepeatingChars: 3
  }

  static specialCharacters = '!@#$%^&*(),.?":{}|<>[]~`-_=+;'

  static async validatePassword(password, userInfo = {}) {
    const validation = {
      isValid: true,
      score: 0,
      errors: [],
      warnings: [],
      strength: 'unknown',
      entropy: 0
    }

    try {
      // Basic length validation
      if (password.length < this.passwordPolicy.minLength) {
        validation.errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters long`)
      }

      if (password.length > this.passwordPolicy.maxLength) {
        validation.errors.push(`Password must be no more than ${this.passwordPolicy.maxLength} characters long`)
      }

      // Character composition validation
      if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
        validation.errors.push('Password must contain at least one uppercase letter')
      }

      if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
        validation.errors.push('Password must contain at least one lowercase letter')
      }

      if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
        validation.errors.push('Password must contain at least one number')
      }

      if (this.passwordPolicy.requireSpecialChars) {
        const hasSpecialChar = this.specialCharacters.split('').some(char => 
          password.includes(char)
        )
        if (!hasSpecialChar) {
          validation.errors.push(`Password must contain at least one special character: ${this.specialCharacters}`)
        }
      }

      // Pattern-based validation
      if (this.hasExcessiveSequentialChars(password)) {
        validation.errors.push(`Password cannot contain more than ${this.passwordPolicy.maxSequentialChars} sequential characters`)
      }

      if (this.hasExcessiveRepeatingChars(password)) {
        validation.errors.push(`Password cannot contain more than ${this.passwordPolicy.maxRepeatingChars} repeating characters`)
      }

      // Strength analysis using zxcvbn
      const strengthAnalysis = zxcvbn(password, this.getUserDictionary(userInfo))
      validation.score = strengthAnalysis.score
      validation.entropy = strengthAnalysis.entropy
      validation.strength = this.getStrengthLabel(strengthAnalysis.score)

      if (strengthAnalysis.score < this.passwordPolicy.minStrengthScore) {
        validation.errors.push(`Password strength is too weak. ${strengthAnalysis.feedback.warning || 'Use a stronger password'}.`)
        
        if (strengthAnalysis.feedback.suggestions.length > 0) {
          validation.warnings.push(...strengthAnalysis.feedback.suggestions)
        }
      }

      // Personal information validation
      if (this.passwordPolicy.preventPersonalInfo && userInfo) {
        const personalInfoViolations = this.checkPersonalInfoUsage(password, userInfo)
        if (personalInfoViolations.length > 0) {
          validation.errors.push(...personalInfoViolations)
        }
      }

      // Common password validation
      if (this.passwordPolicy.preventCommonPasswords) {
        const isCommon = await this.isCommonPassword(password)
        if (isCommon) {
          validation.errors.push('Password is too common. Please choose a more unique password.')
        }
      }

      // Breached password validation
      if (this.passwordPolicy.preventBreachedPasswords) {
        const isBreached = await BreachedPasswordChecker.isPasswordBreached(password)
        if (isBreached.breached) {
          validation.errors.push(`Password has been found in ${isBreached.count} data breaches. Please choose a different password.`)
        }
      }

      // Password reuse validation
      if (this.passwordPolicy.preventReuse && userInfo.userId) {
        const isReused = await this.isPasswordReused(userInfo.userId, password)
        if (isReused) {
          validation.errors.push(`Password cannot be one of your last ${this.passwordPolicy.reuseHistory} passwords`)
        }
      }

      validation.isValid = validation.errors.length === 0

      return validation
    } catch (error) {
      validation.isValid = false
      validation.errors.push('Password validation failed due to technical error')
      console.error('Password validation error:', error)
      return validation
    }
  }

  static hasExcessiveSequentialChars(password) {
    const maxSequential = this.passwordPolicy.maxSequentialChars
    
    for (let i = 0; i <= password.length - maxSequential - 1; i++) {
      let isSequential = true
      
      for (let j = 1; j <= maxSequential; j++) {
        if (password.charCodeAt(i + j) !== password.charCodeAt(i) + j) {
          isSequential = false
          break
        }
      }
      
      if (isSequential) return true
    }
    
    return false
  }

  static hasExcessiveRepeatingChars(password) {
    const maxRepeating = this.passwordPolicy.maxRepeatingChars
    let currentChar = ''
    let currentCount = 1
    
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        currentCount++
        if (currentCount > maxRepeating) {
          return true
        }
      } else {
        currentCount = 1
      }
    }
    
    return false
  }

  static checkPersonalInfoUsage(password, userInfo) {
    const violations = []
    const passwordLower = password.toLowerCase()
    
    // Check common personal information fields
    const personalFields = ['name', 'email', 'username', 'firstName', 'lastName', 'displayName']
    
    personalFields.forEach(field => {
      const value = userInfo[field]
      if (value && typeof value === 'string' && value.length >= 3) {
        const valueLower = value.toLowerCase()
        if (passwordLower.includes(valueLower)) {
          violations.push(`Password cannot contain your ${field}`)
        }
      }
    })

    // Check email parts
    if (userInfo.email) {
      const emailParts = userInfo.email.split('@')
      if (emailParts[0].length >= 3 && passwordLower.includes(emailParts[0].toLowerCase())) {
        violations.push('Password cannot contain your email username')
      }
    }

    return violations
  }

  static getUserDictionary(userInfo) {
    const dictionary = []
    
    if (userInfo.name) dictionary.push(userInfo.name)
    if (userInfo.email) dictionary.push(userInfo.email.split('@')[0])
    if (userInfo.firstName) dictionary.push(userInfo.firstName)
    if (userInfo.lastName) dictionary.push(userInfo.lastName)
    
    return dictionary
  }

  static getStrengthLabel(score) {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    return labels[score] || 'Unknown'
  }

  static async isCommonPassword(password) {
    // Check against a list of common passwords
    const commonPasswords = await this.getCommonPasswordList()
    return commonPasswords.includes(password.toLowerCase())
  }

  static async getCommonPasswordList() {
    // In production, this would be a larger list loaded from a file or database
    return [
      'password', '123456', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', '1234567890', 'qwerty', 'abc123',
      'Password1', 'password1', '123456789', 'welcome1', 'password!',
      // Add more common passwords...
    ]
  }

  static async isPasswordReused(userId, newPassword) {
    try {
      const passwordHistory = await PasswordHistory
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(this.passwordPolicy.reuseHistory)

      for (const historicalPassword of passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, historicalPassword.hashedPassword)
        if (isMatch) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error checking password reuse:', error)
      return false
    }
  }

  static async savePasswordToHistory(userId, hashedPassword) {
    try {
      // Save new password to history
      await PasswordHistory.create({
        userId,
        hashedPassword,
        createdAt: new Date()
      })

      // Clean up old password history beyond the limit
      const allPasswords = await PasswordHistory
        .find({ userId })
        .sort({ createdAt: -1 })

      if (allPasswords.length > this.passwordPolicy.reuseHistory) {
        const passwordsToDelete = allPasswords.slice(this.passwordPolicy.reuseHistory)
        const idsToDelete = passwordsToDelete.map(p => p._id)
        await PasswordHistory.deleteMany({ _id: { $in: idsToDelete } })
      }
    } catch (error) {
      console.error('Error saving password to history:', error)
    }
  }

  static generateSecurePassword(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const specials = '!@#$%^&*(),.?":{}|<>'
    
    let password = ''
    let allChars = uppercase + lowercase + numbers + specials
    
    // Ensure at least one character from each required category
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += specials[Math.floor(Math.random() * specials.length)]
    
    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }
}
```

### Breached Password Detection
```javascript
// lib/auth/breachedPasswordChecker.js
import crypto from 'crypto'
import fetch from 'node-fetch'

export class BreachedPasswordChecker {
  static pwnedPasswordsApiUrl = 'https://api.pwnedpasswords.com/range/'
  
  static async isPasswordBreached(password) {
    try {
      // Create SHA-1 hash of the password
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
      
      // Use k-anonymity model - only send first 5 characters
      const prefix = hash.substring(0, 5)
      const suffix = hash.substring(5)
      
      // Query HaveIBeenPwned API
      const response = await fetch(`${this.pwnedPasswordsApiUrl}${prefix}`, {
        headers: {
          'User-Agent': '7P Education Platform Security Check'
        },
        timeout: 5000
      })
      
      if (!response.ok) {
        // If API is unavailable, allow password (fail open)
        console.warn('Pwned Passwords API unavailable, allowing password')
        return { breached: false, count: 0 }
      }
      
      const responseText = await response.text()
      const hashes = responseText.split('\n')
      
      for (const hashLine of hashes) {
        const [hashSuffix, count] = hashLine.split(':')
        if (hashSuffix === suffix) {
          return {
            breached: true,
            count: parseInt(count, 10)
          }
        }
      }
      
      return { breached: false, count: 0 }
    } catch (error) {
      console.error('Error checking breached passwords:', error)
      // Fail open - allow password if we can't check
      return { breached: false, count: 0 }
    }
  }
  
  static async checkPasswordBreachStatus(passwords) {
    const results = []
    
    for (const password of passwords) {
      const result = await this.isPasswordBreached(password)
      results.push({
        password: password.substring(0, 3) + '*'.repeat(password.length - 3),
        ...result
      })
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return results
  }
}
```

## 4. Biometric Authentication

### WebAuthn Implementation
```javascript
// lib/auth/webauthn.js
import { 
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server'
import { User, WebAuthnCredential, SecurityEvent } from '../models'

export class WebAuthnService {
  static rpID = process.env.WEBAUTHN_RP_ID || 'localhost'
  static rpName = '7P Education Platform'
  static origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'

  static async generateRegistrationOptions(userId) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Get existing credentials to exclude them
      const existingCredentials = await WebAuthnCredential.find({ userId })
      const excludeCredentials = existingCredentials.map(cred => ({
        id: Buffer.from(cred.credentialID, 'base64url'),
        type: 'public-key'
      }))

      const options = await generateRegistrationOptions({
        rpName: this.rpName,
        rpID: this.rpID,
        userID: user._id.toString(),
        userName: user.email,
        userDisplayName: user.name,
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred'
        },
        supportedAlgorithmIDs: [-7, -257] // ES256, RS256
      })

      // Store challenge for verification
      user.currentChallenge = options.challenge
      await user.save()

      // Log registration initiation
      await SecurityEvent.create({
        type: 'webauthn_registration_initiated',
        userId,
        severity: 'low',
        details: {
          authenticatorSelection: options.authenticatorSelection,
          initiatedAt: new Date()
        }
      })

      return options
    } catch (error) {
      throw new Error(`WebAuthn registration options generation failed: ${error.message}`)
    }
  }

  static async verifyRegistration(userId, registrationResponse) {
    try {
      const user = await User.findById(userId)
      if (!user || !user.currentChallenge) {
        throw new Error('Invalid registration state')
      }

      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true
      })

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('WebAuthn registration verification failed')
      }

      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo

      // Save credential
      const credential = new WebAuthnCredential({
        userId,
        credentialID: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        createdAt: new Date(),
        lastUsed: null,
        deviceInfo: {
          userAgent: registrationResponse.userAgent,
          platform: registrationResponse.platform
        }
      })

      await credential.save()

      // Clear challenge
      user.currentChallenge = undefined
      await user.save()

      // Log successful registration
      await SecurityEvent.create({
        type: 'webauthn_credential_registered',
        userId,
        severity: 'low',
        details: {
          credentialId: credential._id,
          registeredAt: new Date()
        }
      })

      return {
        success: true,
        credentialId: credential._id
      }
    } catch (error) {
      throw new Error(`WebAuthn registration verification failed: ${error.message}`)
    }
  }

  static async generateAuthenticationOptions(userId) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Get user's credentials
      const userCredentials = await WebAuthnCredential.find({ userId })
      
      if (userCredentials.length === 0) {
        throw new Error('No WebAuthn credentials registered')
      }

      const allowCredentials = userCredentials.map(cred => ({
        id: Buffer.from(cred.credentialID, 'base64url'),
        type: 'public-key'
      }))

      const options = await generateAuthenticationOptions({
        timeout: 60000,
        allowCredentials,
        userVerification: 'preferred',
        rpID: this.rpID
      })

      // Store challenge for verification
      user.currentChallenge = options.challenge
      await user.save()

      return options
    } catch (error) {
      throw new Error(`WebAuthn authentication options generation failed: ${error.message}`)
    }
  }

  static async verifyAuthentication(userId, authenticationResponse) {
    try {
      const user = await User.findById(userId)
      if (!user || !user.currentChallenge) {
        throw new Error('Invalid authentication state')
      }

      // Find the credential being used
      const credentialID = Buffer.from(authenticationResponse.id, 'base64url').toString('base64url')
      const credential = await WebAuthnCredential.findOne({
        userId,
        credentialID
      })

      if (!credential) {
        throw new Error('Credential not found')
      }

      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialID, 'base64url'),
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: credential.counter
        },
        requireUserVerification: true
      })

      if (!verification.verified) {
        // Log failed authentication attempt
        await SecurityEvent.create({
          type: 'webauthn_authentication_failed',
          userId,
          severity: 'medium',
          details: {
            credentialId: credential._id,
            failedAt: new Date()
          }
        })

        throw new Error('WebAuthn authentication verification failed')
      }

      // Update credential counter and last used
      credential.counter = verification.authenticationInfo.newCounter
      credential.lastUsed = new Date()
      await credential.save()

      // Clear challenge
      user.currentChallenge = undefined
      user.lastLoginAt = new Date()
      await user.save()

      // Log successful authentication
      await SecurityEvent.create({
        type: 'webauthn_authentication_success',
        userId,
        severity: 'low',
        details: {
          credentialId: credential._id,
          authenticatedAt: new Date()
        }
      })

      return {
        success: true,
        credentialId: credential._id
      }
    } catch (error) {
      throw new Error(`WebAuthn authentication verification failed: ${error.message}`)
    }
  }

  static async listUserCredentials(userId) {
    const credentials = await WebAuthnCredential.find({ userId }).select('-publicKey')
    
    return credentials.map(cred => ({
      id: cred._id,
      name: cred.name || 'Unnamed Device',
      createdAt: cred.createdAt,
      lastUsed: cred.lastUsed,
      deviceInfo: cred.deviceInfo
    }))
  }

  static async removeCredential(userId, credentialId) {
    const result = await WebAuthnCredential.deleteOne({
      _id: credentialId,
      userId
    })

    if (result.deletedCount === 0) {
      throw new Error('Credential not found')
    }

    // Log credential removal
    await SecurityEvent.create({
      type: 'webauthn_credential_removed',
      userId,
      severity: 'low',
      details: {
        credentialId,
        removedAt: new Date()
      }
    })

    return { success: true }
  }
}
```

## 5. Session Management and Security

### Advanced Session Management
```javascript
// lib/auth/sessionManager.js
import crypto from 'crypto'
import { SessionStore, SecurityEvent, User } from '../models'
import { DeviceFingerprinting } from './deviceFingerprinting'

export class SessionManager {
  static defaultSessionDuration = 24 * 60 * 60 * 1000 // 24 hours
  static maxConcurrentSessions = 5
  static sessionExtendThreshold = 0.75 // Extend when 75% of session time has elapsed

  static async createSession(user, clientInfo) {
    try {
      // Generate session ID and tokens
      const sessionId = crypto.randomBytes(32).toString('hex')
      const refreshToken = crypto.randomBytes(64).toString('hex')
      const csrfToken = crypto.randomBytes(32).toString('hex')

      // Generate device fingerprint
      const deviceFingerprint = await DeviceFingerprinting.generateFingerprint(clientInfo)

      // Calculate session expiry
      const expiresAt = new Date(Date.now() + this.defaultSessionDuration)

      // Create session record
      const session = new SessionStore({
        sessionId,
        userId: user.id,
        refreshToken: await this.hashToken(refreshToken),
        csrfToken,
        deviceFingerprint,
        clientInfo: {
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          location: await this.getLocationFromIP(clientInfo.ip)
        },
        createdAt: new Date(),
        expiresAt,
        lastActivity: new Date(),
        isActive: true,
        riskScore: await this.calculateInitialRiskScore(user, clientInfo)
      })

      await session.save()

      // Enforce concurrent session limit
      await this.enforceConcurrentSessionLimit(user.id)

      // Log session creation
      await SecurityEvent.create({
        type: 'session_created',
        userId: user.id,
        severity: 'low',
        details: {
          sessionId,
          deviceFingerprint,
          location: session.clientInfo.location,
          createdAt: new Date()
        }
      })

      return {
        sessionId,
        refreshToken,
        csrfToken,
        expiresAt
      }
    } catch (error) {
      throw new Error(`Session creation failed: ${error.message}`)
    }
  }

  static async validateSession(sessionId, clientInfo) {
    try {
      const session = await SessionStore.findOne({
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      })

      if (!session) {
        return { valid: false, reason: 'Session not found or expired' }
      }

      // Validate device fingerprint
      const currentFingerprint = await DeviceFingerprinting.generateFingerprint(clientInfo)
      const fingerprintMatch = await DeviceFingerprinting.compareFingerprints(
        session.deviceFingerprint,
        currentFingerprint
      )

      if (fingerprintMatch.score < 0.8) {
        // Log suspicious activity
        await SecurityEvent.create({
          type: 'session_fingerprint_mismatch',
          userId: session.userId,
          severity: 'high',
          details: {
            sessionId,
            expectedFingerprint: session.deviceFingerprint,
            actualFingerprint: currentFingerprint,
            matchScore: fingerprintMatch.score
          }
        })

        return { valid: false, reason: 'Device fingerprint mismatch' }
      }

      // Update session activity
      session.lastActivity = new Date()
      session.activityCount = (session.activityCount || 0) + 1

      // Recalculate risk score
      const newRiskScore = await this.calculateSessionRiskScore(session, clientInfo)
      session.riskScore = newRiskScore

      // Check if session should be extended
      const timeElapsed = Date.now() - session.createdAt.getTime()
      const totalDuration = session.expiresAt.getTime() - session.createdAt.getTime()
      
      if (timeElapsed / totalDuration > this.sessionExtendThreshold) {
        session.expiresAt = new Date(Date.now() + this.defaultSessionDuration)
        session.extended = true
        session.extendedAt = new Date()
      }

      await session.save()

      // High risk score requires additional verification
      if (newRiskScore > 70) {
        return {
          valid: true,
          requiresAdditionalAuth: true,
          riskScore: newRiskScore,
          session: session
        }
      }

      return {
        valid: true,
        session: session,
        riskScore: newRiskScore
      }
    } catch (error) {
      throw new Error(`Session validation failed: ${error.message}`)
    }
  }

  static async calculateSessionRiskScore(session, clientInfo) {
    let riskScore = session.riskScore || 0

    // IP address change
    if (session.clientInfo.ipAddress !== clientInfo.ip) {
      const ipRisk = await this.assessIPAddressRisk(
        session.clientInfo.ipAddress,
        clientInfo.ip
      )
      riskScore += ipRisk
    }

    // User agent change
    if (session.clientInfo.userAgent !== clientInfo.userAgent) {
      riskScore += 15
    }

    // Session age
    const sessionAge = Date.now() - session.createdAt.getTime()
    const ageHours = sessionAge / (60 * 60 * 1000)
    
    if (ageHours > 12) {
      riskScore += Math.min(20, ageHours - 12)
    }

    // Activity patterns
    const user = await User.findById(session.userId)
    if (user) {
      const unusualTime = await this.isUnusualAccessTime(user.id, new Date())
      if (unusualTime) {
        riskScore += 10
      }
    }

    return Math.min(100, Math.max(0, riskScore))
  }

  static async enforceConcurrentSessionLimit(userId) {
    const activeSessions = await SessionStore.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActivity: -1 })

    if (activeSessions.length > this.maxConcurrentSessions) {
      // Deactivate oldest sessions
      const sessionsToDeactivate = activeSessions.slice(this.maxConcurrentSessions)
      
      for (const session of sessionsToDeactivate) {
        session.isActive = false
        session.deactivatedAt = new Date()
        session.deactivationReason = 'concurrent_session_limit'
        await session.save()

        // Log session deactivation
        await SecurityEvent.create({
          type: 'session_deactivated',
          userId,
          severity: 'low',
          details: {
            sessionId: session.sessionId,
            reason: 'concurrent_session_limit',
            deactivatedAt: new Date()
          }
        })
      }
    }
  }

  static async terminateSession(sessionId, reason = 'user_logout') {
    const session = await SessionStore.findOne({ sessionId })
    
    if (session) {
      session.isActive = false
      session.deactivatedAt = new Date()
      session.deactivationReason = reason
      await session.save()

      // Log session termination
      await SecurityEvent.create({
        type: 'session_terminated',
        userId: session.userId,
        severity: 'low',
        details: {
          sessionId,
          reason,
          terminatedAt: new Date()
        }
      })
    }

    return { success: true }
  }

  static async terminateAllUserSessions(userId, excludeSessionId = null) {
    const sessions = await SessionStore.find({
      userId,
      isActive: true,
      sessionId: { $ne: excludeSessionId }
    })

    for (const session of sessions) {
      session.isActive = false
      session.deactivatedAt = new Date()
      session.deactivationReason = 'user_requested_logout_all'
      await session.save()
    }

    // Log bulk session termination
    await SecurityEvent.create({
      type: 'all_sessions_terminated',
      userId,
      severity: 'medium',
      details: {
        sessionCount: sessions.length,
        excludedSession: excludeSessionId,
        terminatedAt: new Date()
      }
    })

    return { success: true, terminatedCount: sessions.length }
  }

  static async hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  static async getActiveSessionsForUser(userId) {
    const sessions = await SessionStore.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActivity: -1 })

    return sessions.map(session => ({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      location: session.clientInfo.location,
      deviceInfo: this.parseUserAgent(session.clientInfo.userAgent),
      riskScore: session.riskScore,
      isCurrent: false // Will be set by client
    }))
  }
}
```

## Conclusion

This comprehensive authentication security guide establishes enterprise-grade authentication capabilities for the 7P Education Platform. Through multi-layered security implementations including advanced MFA, biometric authentication, robust password policies, and intelligent session management, the platform achieves optimal balance between security and user experience.

### Key Security Benefits:

1. **Multi-Factor Protection**: TOTP-based MFA with backup codes and biometric authentication
2. **Advanced Password Security**: Comprehensive policy enforcement with breach detection
3. **Intelligent Session Management**: Risk-based authentication with device fingerprinting
4. **Zero-Trust Architecture**: Continuous verification and adaptive security measures
5. **Compliance Ready**: Meets educational data protection and security regulations

### Implementation Timeline:

**Phase 1 (0-30 days)**: Enhanced password policies and basic MFA implementation
**Phase 2 (30-60 days)**: WebAuthn biometric authentication deployment
**Phase 3 (60-90 days)**: Advanced session management and risk analytics
**Phase 4 (90+ days)**: Behavioral analytics and adaptive authentication

The implementation provides a robust foundation for secure user authentication while maintaining seamless user experience across all platform interactions.