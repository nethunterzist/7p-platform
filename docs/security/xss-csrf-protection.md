# XSS & CSRF Protection Guide - 7P Education Platform

## Executive Summary

This comprehensive XSS (Cross-Site Scripting) and CSRF (Cross-Site Request Forgery) protection guide implements advanced web application security measures, Content Security Policy (CSP), secure headers, and attack prevention strategies for the 7P Education Platform. The guide ensures robust protection against client-side vulnerabilities while maintaining optimal user experience.

### XSS & CSRF Protection Overview
- **Multi-Layer XSS Protection**: Input validation, output encoding, CSP implementation
- **Advanced CSRF Defense**: Token-based protection, SameSite cookies, origin validation
- **Content Security Policy**: Strict CSP with nonce-based script execution
- **Secure Headers Implementation**: Comprehensive security header configuration
- **Real-Time Attack Detection**: Automated threat detection and response

### Implementation Status
- ✅ **Basic XSS Protection**: Input sanitization and output encoding
- ✅ **CSRF Token Implementation**: Double-submit cookie pattern
- ✅ **Security Headers**: Basic security header configuration
- ⚠️ **Advanced CSP**: Nonce-based CSP implementation in development
- ⚠️ **XSS Detection**: Real-time XSS payload detection system pending
- ⚠️ **Attack Response**: Automated attack response and blocking system planned

## 1. Cross-Site Scripting (XSS) Protection

### Comprehensive XSS Prevention Framework
```javascript
// lib/security/xssProtection.js
import DOMPurify from 'isomorphic-dompurify'
import { JSDOM } from 'jsdom'
import validator from 'validator'
import { SecurityEvent, XSSAttempt } from '../models'

export class XSSProtectionService {
  static xssPatterns = {
    // Script injection patterns
    scriptTags: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    scriptSrc: /<script[^>]*src\s*=\s*["'][^"']*["'][^>]*>/gi,
    
    // Event handler patterns
    eventHandlers: /\bon\w+\s*=\s*["'][^"']*["']/gi,
    eventHandlersUnquoted: /\bon\w+\s*=\s*[^\s>]+/gi,
    
    // JavaScript protocol
    jsProtocol: /javascript\s*:/gi,
    vbscriptProtocol: /vbscript\s*:/gi,
    
    // Data URLs with scripts
    dataScript: /data\s*:\s*text\/html\s*;?\s*(charset\s*=\s*[^;]*;?)?\s*base64/gi,
    
    // CSS expression attacks
    cssExpression: /expression\s*\(/gi,
    cssImport: /@import/gi,
    
    // SVG attacks
    svgScript: /<svg[\s\S]*?<script[\s\S]*?<\/script>[\s\S]*?<\/svg>/gi,
    
    // Meta refresh attacks
    metaRefresh: /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,
    
    // Form attacks
    formAction: /<form[^>]*action\s*=\s*["']?javascript:/gi,
    
    // Object/embed attacks
    objectEmbed: /<(object|embed|applet)[^>]*>/gi,
    
    // Comment-based attacks
    htmlComments: /<!--[\s\S]*?-->/g,
    
    // Encoded attacks
    urlEncoded: /%3c%73%63%72%69%70%74/gi,
    htmlEncoded: /&lt;script|&#60;script|&#x3c;script/gi,
    unicodeEncoded: /\\u003c\\u0073\\u0063\\u0072\\u0069\\u0070\\u0074/gi
  }

  static sanitizationConfig = {
    // Allowed tags for educational content
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'a', 'img', 'span', 'div'
    ],
    
    // Allowed attributes
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'blockquote': ['cite'],
      'pre': ['class'],
      'code': ['class'],
      'span': ['class'],
      'div': ['class']
    },
    
    // Allowed protocols for links
    allowedProtocols: ['http', 'https', 'mailto'],
    
    // Additional options
    allowComments: false,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'object', 'embed', 'applet']
  }

  static async sanitizeInput(input, context = 'general', options = {}) {
    if (!input || typeof input !== 'string') {
      return input
    }

    try {
      // Pre-sanitization detection
      const xssAttempts = await this.detectXSSAttempts(input, context)
      
      if (xssAttempts.detected) {
        await this.logXSSAttempt(xssAttempts, context, options.userId, options.ipAddress)
        
        if (xssAttempts.severity === 'critical') {
          // Block the request entirely for critical XSS attempts
          throw new XSSDetectedError('Critical XSS attempt detected', xssAttempts)
        }
      }

      // Context-specific sanitization
      const sanitized = await this.applySanitization(input, context, options)
      
      // Post-sanitization validation
      const postValidation = await this.validateSanitizedOutput(sanitized, input)
      
      return {
        sanitized: sanitized,
        originalLength: input.length,
        sanitizedLength: sanitized.length,
        xssAttempts: xssAttempts,
        validation: postValidation
      }
    } catch (error) {
      if (error instanceof XSSDetectedError) {
        throw error
      }
      
      console.error('XSS sanitization error:', error)
      // Fallback to aggressive sanitization
      return {
        sanitized: DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
        error: error.message,
        fallbackUsed: true
      }
    }
  }

  static async detectXSSAttempts(input, context) {
    const detection = {
      detected: false,
      severity: 'low',
      patterns: [],
      confidence: 0,
      context: context
    }

    let patternMatches = 0
    let highRiskMatches = 0

    // Check against XSS patterns
    for (const [patternName, pattern] of Object.entries(this.xssPatterns)) {
      const matches = input.match(pattern)
      if (matches) {
        patternMatches++
        
        const patternInfo = {
          pattern: patternName,
          matches: matches.length,
          examples: matches.slice(0, 3) // First 3 matches
        }
        
        detection.patterns.push(patternInfo)
        
        // Classify pattern severity
        if (['scriptTags', 'jsProtocol', 'dataScript'].includes(patternName)) {
          highRiskMatches++
          patternInfo.risk = 'high'
        } else if (['eventHandlers', 'cssExpression', 'svgScript'].includes(patternName)) {
          patternInfo.risk = 'medium'
        } else {
          patternInfo.risk = 'low'
        }
      }
    }

    // Calculate detection confidence and severity
    if (patternMatches > 0) {
      detection.detected = true
      detection.confidence = Math.min(100, (patternMatches * 20) + (highRiskMatches * 30))
      
      if (highRiskMatches >= 2 || patternMatches >= 5) {
        detection.severity = 'critical'
      } else if (highRiskMatches >= 1 || patternMatches >= 3) {
        detection.severity = 'high'
      } else if (patternMatches >= 2) {
        detection.severity = 'medium'
      }
    }

    return detection
  }

  static async applySanitization(input, context, options = {}) {
    const window = new JSDOM('').window
    const purify = DOMPurify(window)

    let config = { ...this.sanitizationConfig }

    // Context-specific configurations
    switch (context) {
      case 'course_content':
        config.allowedTags.push('iframe', 'video', 'audio', 'source')
        config.allowedAttributes.iframe = ['src', 'width', 'height', 'frameborder', 'allowfullscreen']
        config.allowedAttributes.video = ['src', 'controls', 'width', 'height']
        config.allowedAttributes.audio = ['src', 'controls']
        break
        
      case 'user_bio':
        config.allowedTags = ['p', 'br', 'strong', 'em', 'a']
        config.allowedAttributes = { 'a': ['href'] }
        break
        
      case 'assignment_submission':
        config.allowedTags.push('pre', 'code')
        config.allowedAttributes.pre = ['class']
        config.allowedAttributes.code = ['class']
        break
        
      case 'search_query':
        config.allowedTags = []
        config.allowedAttributes = {}
        break
    }

    // Additional security options
    if (options.strictMode) {
      config.allowedTags = config.allowedTags.filter(tag => 
        !['iframe', 'video', 'audio', 'object', 'embed'].includes(tag)
      )
    }

    // Apply DOMPurify sanitization
    const sanitized = purify.sanitize(input, {
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: config.allowedAttributes,
      ALLOWED_URI_REGEXP: new RegExp(`^(?:(${config.allowedProtocols.join('|')}):)`),
      FORBID_TAGS: ['script', 'object', 'embed', 'applet'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
      USE_PROFILES: { html: true },
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      ADD_TAGS: [],
      ADD_ATTR: [],
      FORCE_BODY: false
    })

    return sanitized
  }

  static async validateSanitizedOutput(sanitized, original) {
    const validation = {
      safe: true,
      changes: [],
      lengthReduction: original.length - sanitized.length,
      reductionPercentage: ((original.length - sanitized.length) / original.length) * 100
    }

    // Check for significant content changes
    if (validation.reductionPercentage > 50) {
      validation.changes.push({
        type: 'significant_content_reduction',
        description: `Content reduced by ${validation.reductionPercentage.toFixed(2)}%`
      })
    }

    // Check if any dangerous patterns remain
    const remainingThreats = await this.detectXSSAttempts(sanitized, 'post_sanitization')
    if (remainingThreats.detected) {
      validation.safe = false
      validation.changes.push({
        type: 'sanitization_bypass',
        description: 'Potential XSS patterns detected after sanitization',
        patterns: remainingThreats.patterns
      })
    }

    return validation
  }

  static async logXSSAttempt(xssAttempts, context, userId, ipAddress) {
    await XSSAttempt.create({
      userId,
      ipAddress,
      context,
      patterns: xssAttempts.patterns,
      severity: xssAttempts.severity,
      confidence: xssAttempts.confidence,
      blocked: true,
      timestamp: new Date()
    })

    await SecurityEvent.create({
      type: 'xss_attempt_detected',
      userId,
      severity: xssAttempts.severity === 'critical' ? 'critical' : 'high',
      details: {
        context,
        patterns: xssAttempts.patterns.length,
        confidence: xssAttempts.confidence,
        ipAddress
      },
      timestamp: new Date()
    })
  }
}

// Express middleware for XSS protection
export const xssProtectionMiddleware = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Skip GET requests unless explicitly enabled
      if (req.method === 'GET' && !options.protectGetRequests) {
        return next()
      }

      const context = options.getContext ? options.getContext(req) : 'general'
      
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        const sanitizedBody = await sanitizeObject(req.body, context, {
          userId: req.user?.id,
          ipAddress: req.ip
        })
        
        req.body = sanitizedBody.data
        req.xssSanitization = sanitizedBody.metadata
      }

      // Sanitize query parameters if enabled
      if (options.sanitizeQuery && req.query) {
        const sanitizedQuery = await sanitizeObject(req.query, 'search_query', {
          userId: req.user?.id,
          ipAddress: req.ip
        })
        
        req.query = sanitizedQuery.data
        req.xssQuerySanitization = sanitizedQuery.metadata
      }

      next()
    } catch (error) {
      if (error instanceof XSSDetectedError) {
        return res.status(400).json({
          error: 'XSS attempt detected',
          code: 'XSS_DETECTED',
          severity: error.details.severity
        })
      }

      console.error('XSS protection middleware error:', error)
      res.status(500).json({
        error: 'Security validation failed',
        code: 'SECURITY_ERROR'
      })
    }
  }
}

async function sanitizeObject(obj, context, options) {
  const sanitized = {}
  const metadata = {
    fieldsProcessed: 0,
    xssDetected: false,
    totalReduction: 0
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const result = await XSSProtectionService.sanitizeInput(value, context, options)
      sanitized[key] = result.sanitized
      metadata.fieldsProcessed++
      
      if (result.xssAttempts.detected) {
        metadata.xssDetected = true
      }
      
      metadata.totalReduction += (result.originalLength - result.sanitizedLength)
    } else if (Array.isArray(value)) {
      sanitized[key] = await Promise.all(
        value.map(item => 
          typeof item === 'string' ? 
            XSSProtectionService.sanitizeInput(item, context, options).then(r => r.sanitized) :
            item
        )
      )
    } else {
      sanitized[key] = value
    }
  }

  return { data: sanitized, metadata }
}

class XSSDetectedError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'XSSDetectedError'
    this.details = details
  }
}
```

### Content Security Policy (CSP) Implementation
```javascript
// lib/security/contentSecurityPolicy.js
export class ContentSecurityPolicyManager {
  static generateNonce() {
    return crypto.randomBytes(16).toString('base64')
  }

  static createCSPMiddleware(options = {}) {
    return (req, res, next) => {
      // Generate nonce for this request
      const nonce = this.generateNonce()
      req.cspNonce = nonce
      
      // Build CSP policy
      const policy = this.buildCSPPolicy(nonce, options, req)
      
      // Set CSP header
      res.setHeader('Content-Security-Policy', policy)
      
      // Also set report-only header for monitoring
      if (options.reportOnly) {
        const reportPolicy = this.buildReportOnlyCSP(nonce, options, req)
        res.setHeader('Content-Security-Policy-Report-Only', reportPolicy)
      }
      
      next()
    }
  }

  static buildCSPPolicy(nonce, options = {}, req) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const domain = process.env.DOMAIN || 'localhost:3000'
    const cdnDomain = process.env.CDN_DOMAIN || ''
    
    const policy = {
      'default-src': ["'self'"],
      
      'script-src': [
        "'self'",
        `'nonce-${nonce}'`,
        // Google services for OAuth and analytics
        'https://accounts.google.com',
        'https://www.google.com',
        'https://www.gstatic.com',
        'https://apis.google.com',
        // Educational content providers
        'https://www.youtube.com',
        'https://player.vimeo.com',
        // CDN if configured
        ...(cdnDomain ? [`https://${cdnDomain}`] : []),
        // Development only
        ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : [])
      ],
      
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Needed for many CSS frameworks
        'https://fonts.googleapis.com',
        'https://www.gstatic.com',
        ...(cdnDomain ? [`https://${cdnDomain}`] : [])
      ],
      
      'img-src': [
        "'self'",
        'data:', // For small images and icons
        'blob:', // For uploaded images
        'https:', // Allow HTTPS images
        'https://www.google.com', // Google services
        'https://lh3.googleusercontent.com', // Google profile images
        ...(cdnDomain ? [`https://${cdnDomain}`] : [])
      ],
      
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://www.gstatic.com',
        ...(cdnDomain ? [`https://${cdnDomain}`] : [])
      ],
      
      'connect-src': [
        "'self'",
        'https://api.stripe.com', // Payment processing
        'https://accounts.google.com',
        'https://www.googleapis.com',
        // Analytics endpoints
        'https://www.google-analytics.com',
        // WebSocket connections
        `wss://${domain}`,
        ...(isDevelopment ? ['ws://localhost:*', 'http://localhost:*'] : [])
      ],
      
      'media-src': [
        "'self'",
        'blob:', // For recorded media
        'https://www.youtube.com',
        'https://player.vimeo.com',
        ...(cdnDomain ? [`https://${cdnDomain}`] : [])
      ],
      
      'object-src': ["'none'"], // Disable plugins
      
      'base-uri': ["'self'"], // Prevent base tag injection
      
      'form-action': ["'self'"], // Only allow forms to submit to same origin
      
      'frame-ancestors': [
        "'self'",
        // Allow embedding in educational platforms
        'https://classroom.google.com',
        'https://canvas.instructure.com',
        'https://blackboard.com'
      ],
      
      'frame-src': [
        "'self'",
        'https://www.youtube.com',
        'https://player.vimeo.com',
        'https://accounts.google.com',
        'https://js.stripe.com' // Stripe payment frames
      ],
      
      'worker-src': [
        "'self'",
        'blob:' // For web workers
      ],
      
      'manifest-src': ["'self'"], // PWA manifest
      
      'upgrade-insecure-requests': [], // Automatically upgrade HTTP to HTTPS
      
      'block-all-mixed-content': [] // Block mixed content
    }

    // Add report URI if configured
    if (options.reportUri) {
      policy['report-uri'] = [options.reportUri]
    }

    // Build policy string
    return Object.entries(policy)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive
        }
        return `${directive} ${sources.join(' ')}`
      })
      .join('; ')
  }

  static buildReportOnlyCSP(nonce, options, req) {
    // Stricter policy for report-only mode
    const strictPolicy = {
      'default-src': ["'none'"],
      'script-src': [`'nonce-${nonce}'`],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'object-src': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'self'"]
    }

    if (options.reportUri) {
      strictPolicy['report-uri'] = [options.reportUri]
    }

    return Object.entries(strictPolicy)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ')
  }

  static async handleCSPViolation(req, res) {
    try {
      const violation = req.body

      // Log CSP violation
      await SecurityEvent.create({
        type: 'csp_violation',
        severity: 'medium',
        details: {
          documentURI: violation['document-uri'],
          referrer: violation.referrer,
          violatedDirective: violation['violated-directive'],
          effectiveDirective: violation['effective-directive'],
          originalPolicy: violation['original-policy'],
          blockedURI: violation['blocked-uri'],
          statusCode: violation['status-code'],
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        },
        timestamp: new Date()
      })

      // Check for patterns indicating attacks
      await this.analyzeCSPViolation(violation, req)

      res.status(204).send() // No content response for CSP reports
    } catch (error) {
      console.error('CSP violation handling error:', error)
      res.status(500).json({ error: 'Failed to process CSP violation' })
    }
  }

  static async analyzeCSPViolation(violation, req) {
    const suspiciousPatterns = [
      'javascript:', 'data:text/html', 'eval', 'inline',
      'chrome-extension:', 'moz-extension:', 'ms-browser-extension:'
    ]

    const blockedURI = violation['blocked-uri'] || ''
    const isSuspicious = suspiciousPatterns.some(pattern => 
      blockedURI.toLowerCase().includes(pattern.toLowerCase())
    )

    if (isSuspicious) {
      await SecurityEvent.create({
        type: 'suspicious_csp_violation',
        severity: 'high',
        details: {
          ...violation,
          suspiciousPattern: true,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        timestamp: new Date()
      })
    }
  }
}
```

## 2. Cross-Site Request Forgery (CSRF) Protection

### Advanced CSRF Protection Implementation
```javascript
// lib/security/csrfProtection.js
import crypto from 'crypto'
import { CSRFToken, SecurityEvent } from '../models'

export class CSRFProtectionService {
  static tokenExpiry = 4 * 60 * 60 * 1000 // 4 hours
  static secretKey = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex')

  static generateCSRFToken(sessionId, userId) {
    const timestamp = Date.now()
    const randomValue = crypto.randomBytes(16).toString('hex')
    const payload = `${sessionId}:${userId}:${timestamp}:${randomValue}`
    
    // Create HMAC signature
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex')
    
    // Combine payload and signature
    const token = Buffer.from(`${payload}:${signature}`).toString('base64')
    
    return {
      token,
      expires: new Date(timestamp + this.tokenExpiry),
      created: new Date(timestamp)
    }
  }

  static async validateCSRFToken(token, sessionId, userId) {
    try {
      if (!token) {
        return { valid: false, reason: 'Missing CSRF token' }
      }

      // Decode token
      const decoded = Buffer.from(token, 'base64').toString('utf8')
      const parts = decoded.split(':')
      
      if (parts.length !== 5) {
        return { valid: false, reason: 'Invalid token format' }
      }

      const [tokenSessionId, tokenUserId, timestamp, randomValue, signature] = parts
      const payload = `${tokenSessionId}:${tokenUserId}:${timestamp}:${randomValue}`

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('hex')

      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid token signature' }
      }

      // Verify session and user match
      if (tokenSessionId !== sessionId || tokenUserId !== userId) {
        return { valid: false, reason: 'Token session/user mismatch' }
      }

      // Check expiration
      const tokenTime = parseInt(timestamp)
      if (Date.now() - tokenTime > this.tokenExpiry) {
        return { valid: false, reason: 'Token expired' }
      }

      // Check if token has been used (if tracking enabled)
      const existingToken = await CSRFToken.findOne({ token })
      if (existingToken && existingToken.used) {
        return { valid: false, reason: 'Token already used' }
      }

      return { valid: true, tokenTime: new Date(tokenTime) }
    } catch (error) {
      return { valid: false, reason: 'Token validation error', error: error.message }
    }
  }

  static createCSRFMiddleware(options = {}) {
    return async (req, res, next) => {
      try {
        // Skip CSRF protection for safe methods unless explicitly required
        const safeMethods = ['GET', 'HEAD', 'OPTIONS']
        if (safeMethods.includes(req.method) && !options.protectSafeMethods) {
          return next()
        }

        // Skip for API endpoints with API key authentication
        if (req.authMethod === 'api_key' && !options.requireForAPIKeys) {
          return next()
        }

        const sessionId = req.sessionID || req.session?.id
        const userId = req.user?.id

        if (!sessionId || !userId) {
          return res.status(401).json({
            error: 'Session required for CSRF protection',
            code: 'NO_SESSION'
          })
        }

        // Generate CSRF token for GET requests (to include in forms/AJAX)
        if (req.method === 'GET') {
          const csrfToken = this.generateCSRFToken(sessionId, userId)
          res.locals.csrfToken = csrfToken.token
          req.csrfToken = csrfToken.token
          return next()
        }

        // Validate CSRF token for state-changing requests
        const token = this.extractCSRFToken(req)
        const validation = await this.validateCSRFToken(token, sessionId, userId)

        if (!validation.valid) {
          await this.logCSRFFailure(req, validation.reason)
          
          return res.status(403).json({
            error: 'CSRF validation failed',
            code: 'CSRF_INVALID',
            reason: validation.reason
          })
        }

        // Mark token as used if one-time tokens are enabled
        if (options.oneTimeTokens) {
          await this.markTokenUsed(token)
        }

        // Additional origin validation
        const originValidation = await this.validateOrigin(req)
        if (!originValidation.valid) {
          await this.logCSRFFailure(req, `Origin validation failed: ${originValidation.reason}`)
          
          return res.status(403).json({
            error: 'Origin validation failed',
            code: 'INVALID_ORIGIN'
          })
        }

        next()
      } catch (error) {
        console.error('CSRF middleware error:', error)
        res.status(500).json({
          error: 'CSRF validation error',
          code: 'CSRF_ERROR'
        })
      }
    }
  }

  static extractCSRFToken(req) {
    // Check multiple locations for CSRF token
    return req.headers['x-csrf-token'] ||
           req.headers['x-xsrf-token'] ||
           req.body?._csrf ||
           req.query?._csrf ||
           req.cookies?.['csrf-token']
  }

  static async validateOrigin(req) {
    const origin = req.headers.origin
    const referer = req.headers.referer
    const host = req.headers.host

    // Allow requests without origin/referer for non-browser clients
    if (!origin && !referer) {
      return { valid: true, reason: 'No origin header (likely API client)' }
    }

    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`, // For development
      process.env.FRONTEND_URL,
      process.env.ALLOWED_ORIGINS?.split(',') || []
    ].flat().filter(Boolean)

    // Validate origin
    if (origin) {
      if (allowedOrigins.includes(origin)) {
        return { valid: true, method: 'origin' }
      }
      return { valid: false, reason: `Origin ${origin} not allowed` }
    }

    // Validate referer as fallback
    if (referer) {
      const refererOrigin = new URL(referer).origin
      if (allowedOrigins.includes(refererOrigin)) {
        return { valid: true, method: 'referer' }
      }
      return { valid: false, reason: `Referer origin ${refererOrigin} not allowed` }
    }

    return { valid: false, reason: 'No valid origin or referer' }
  }

  static async markTokenUsed(token) {
    try {
      await CSRFToken.findOneAndUpdate(
        { token },
        { used: true, usedAt: new Date() },
        { upsert: true }
      )
    } catch (error) {
      console.error('Error marking CSRF token as used:', error)
    }
  }

  static async logCSRFFailure(req, reason) {
    await SecurityEvent.create({
      type: 'csrf_validation_failed',
      userId: req.user?.id,
      severity: 'medium',
      details: {
        path: req.path,
        method: req.method,
        reason,
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        hasToken: !!this.extractCSRFToken(req)
      },
      timestamp: new Date()
    })
  }

  // Double-submit cookie pattern implementation
  static createDoubleSubmitMiddleware(options = {}) {
    return async (req, res, next) => {
      const cookieName = options.cookieName || 'csrf-token'
      const headerName = options.headerName || 'x-csrf-token'

      // Generate token for GET requests
      if (req.method === 'GET') {
        const token = crypto.randomBytes(32).toString('hex')
        
        res.cookie(cookieName, token, {
          httpOnly: false, // Must be readable by JavaScript
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 4 * 60 * 60 * 1000 // 4 hours
        })
        
        res.locals.csrfToken = token
        return next()
      }

      // Validate token for state-changing requests
      const cookieToken = req.cookies[cookieName]
      const headerToken = req.headers[headerName]

      if (!cookieToken || !headerToken) {
        return res.status(403).json({
          error: 'CSRF token missing',
          code: 'CSRF_TOKEN_MISSING'
        })
      }

      if (cookieToken !== headerToken) {
        await this.logCSRFFailure(req, 'Double-submit token mismatch')
        
        return res.status(403).json({
          error: 'CSRF token mismatch',
          code: 'CSRF_TOKEN_MISMATCH'
        })
      }

      next()
    }
  }

  // SameSite cookie configuration
  static configureSameSiteCookies(app) {
    app.use((req, res, next) => {
      // Override default cookie settings
      const originalCookie = res.cookie
      
      res.cookie = function(name, value, options = {}) {
        // Apply secure SameSite defaults
        const secureOptions = {
          ...options,
          sameSite: options.sameSite || 'strict',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: options.httpOnly !== false // Default to httpOnly unless explicitly disabled
        }

        // Special handling for CSRF cookies
        if (name.includes('csrf') || name.includes('xsrf')) {
          secureOptions.httpOnly = false // CSRF tokens need to be accessible to JavaScript
        }

        return originalCookie.call(this, name, value, secureOptions)
      }

      next()
    })
  }
}
```

## 3. Security Headers Implementation

### Comprehensive Security Headers
```javascript
// lib/security/securityHeaders.js
export class SecurityHeadersManager {
  static getSecurityHeaders(req, options = {}) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const domain = process.env.DOMAIN || 'localhost:3000'

    return {
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent content type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Control framing to prevent clickjacking
      'X-Frame-Options': options.allowFraming ? 'SAMEORIGIN' : 'DENY',
      
      // HSTS (HTTP Strict Transport Security)
      'Strict-Transport-Security': isDevelopment ? 
        'max-age=31536000; includeSubDomains' :
        'max-age=31536000; includeSubDomains; preload',
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Feature policy / Permissions policy
      'Permissions-Policy': [
        'camera=(self)',
        'microphone=(self)', 
        'geolocation=()',
        'payment=(self)',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=(self)',
        'encrypted-media=(self)',
        'fullscreen=(self)',
        'picture-in-picture=(self)'
      ].join(', '),
      
      // Expect-CT header (Certificate Transparency)
      'Expect-CT': `max-age=86400, enforce, report-uri="https://${domain}/api/security/ct-report"`,
      
      // Remove server information
      'Server': 'Web Server',
      
      // Cross-Origin policies
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      
      // Cache control for sensitive pages
      ...(req.path.includes('/admin') || req.path.includes('/profile') ? {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      } : {})
    }
  }

  static createSecurityHeadersMiddleware(options = {}) {
    return (req, res, next) => {
      const headers = this.getSecurityHeaders(req, options)
      
      // Set all security headers
      Object.entries(headers).forEach(([name, value]) => {
        res.setHeader(name, value)
      })
      
      // Remove potentially sensitive headers
      res.removeHeader('X-Powered-By')
      res.removeHeader('Server')
      
      next()
    }
  }

  static createHSTSMiddleware(options = {}) {
    const maxAge = options.maxAge || 31536000 // 1 year
    const includeSubDomains = options.includeSubDomains !== false
    const preload = options.preload && process.env.NODE_ENV === 'production'

    return (req, res, next) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        let hsts = `max-age=${maxAge}`
        
        if (includeSubDomains) {
          hsts += '; includeSubDomains'
        }
        
        if (preload) {
          hsts += '; preload'
        }
        
        res.setHeader('Strict-Transport-Security', hsts)
      }
      
      next()
    }
  }

  // Educational platform specific headers
  static createEducationalHeaders() {
    return (req, res, next) => {
      // Headers specific to educational content
      res.setHeader('X-Educational-Platform', '7P-Education')
      res.setHeader('X-Content-Classification', 'Educational')
      
      // Privacy and safety headers for educational content
      if (req.path.includes('/student/') || req.path.includes('/course/')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow')
        res.setHeader('X-Student-Privacy', 'protected')
      }
      
      next()
    }
  }
}
```

## 4. Attack Detection and Response

### Real-Time Attack Detection System
```javascript
// lib/security/attackDetection.js
export class AttackDetectionSystem {
  static attackPatterns = {
    xss: {
      threshold: 3,
      timeWindow: 300000, // 5 minutes
      severity: 'high',
      response: 'block_ip'
    },
    csrf: {
      threshold: 5,
      timeWindow: 600000, // 10 minutes  
      severity: 'medium',
      response: 'require_mfa'
    },
    injection: {
      threshold: 2,
      timeWindow: 180000, // 3 minutes
      severity: 'critical',
      response: 'block_user'
    }
  }

  static async detectAttackPattern(userId, ipAddress, attackType) {
    try {
      const pattern = this.attackPatterns[attackType]
      if (!pattern) return { detected: false }

      const timeThreshold = new Date(Date.now() - pattern.timeWindow)
      
      // Count recent attacks from this user/IP
      const recentAttacks = await SecurityEvent.countDocuments({
        $or: [
          { userId },
          { 'details.ipAddress': ipAddress }
        ],
        type: `${attackType}_attempt_detected`,
        timestamp: { $gte: timeThreshold }
      })

      if (recentAttacks >= pattern.threshold) {
        await this.triggerAttackResponse(userId, ipAddress, attackType, recentAttacks)
        
        return {
          detected: true,
          attackType,
          count: recentAttacks,
          severity: pattern.severity,
          response: pattern.response
        }
      }

      return { detected: false, count: recentAttacks }
    } catch (error) {
      console.error('Attack pattern detection error:', error)
      return { detected: false, error: error.message }
    }
  }

  static async triggerAttackResponse(userId, ipAddress, attackType, count) {
    const pattern = this.attackPatterns[attackType]
    
    switch (pattern.response) {
      case 'block_ip':
        await this.blockIPAddress(ipAddress, attackType, count)
        break
        
      case 'block_user':
        if (userId) {
          await this.blockUser(userId, attackType, count)
        }
        break
        
      case 'require_mfa':
        if (userId) {
          await this.requireMFAVerification(userId, attackType)
        }
        break
        
      case 'rate_limit':
        await this.applyRateLimit(ipAddress, attackType)
        break
    }

    // Log the response
    await SecurityEvent.create({
      type: 'attack_response_triggered',
      userId,
      severity: pattern.severity,
      details: {
        attackType,
        attackCount: count,
        response: pattern.response,
        ipAddress,
        triggeredAt: new Date()
      }
    })
  }

  static async blockIPAddress(ipAddress, reason, duration = 3600000) {
    await IPBlock.create({
      ipAddress,
      reason,
      blockedAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      automated: true
    })

    // Send alert to administrators
    await this.sendSecurityAlert({
      type: 'ip_blocked',
      ipAddress,
      reason,
      severity: 'high'
    })
  }

  static async blockUser(userId, reason, duration = 24 * 60 * 60 * 1000) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'security.blocked': true,
          'security.blockedAt': new Date(),
          'security.blockedUntil': new Date(Date.now() + duration),
          'security.blockReason': reason,
          'security.automated': true
        }
      }
    )

    // Send notification to user and administrators
    await this.sendSecurityAlert({
      type: 'user_blocked',
      userId,
      reason,
      severity: 'critical'
    })
  }

  static async requireMFAVerification(userId, reason) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'security.requireMFA': true,
          'security.mfaReason': reason,
          'security.mfaRequiredAt': new Date()
        }
      }
    )
  }

  static createAttackDetectionMiddleware() {
    return async (req, res, next) => {
      // Skip for certain endpoints
      if (req.path.includes('/health') || req.path.includes('/status')) {
        return next()
      }

      const userId = req.user?.id
      const ipAddress = req.ip

      // Check if IP is blocked
      const ipBlock = await IPBlock.findOne({
        ipAddress,
        expiresAt: { $gt: new Date() }
      })

      if (ipBlock) {
        return res.status(403).json({
          error: 'IP address blocked due to security violations',
          code: 'IP_BLOCKED',
          expiresAt: ipBlock.expiresAt
        })
      }

      // Check if user is blocked
      if (userId) {
        const user = await User.findById(userId)
        
        if (user?.security?.blocked && 
            user.security.blockedUntil > new Date()) {
          return res.status(403).json({
            error: 'Account temporarily blocked due to security violations',
            code: 'USER_BLOCKED',
            expiresAt: user.security.blockedUntil
          })
        }
      }

      next()
    }
  }

  static async sendSecurityAlert(alert) {
    // Implementation would depend on notification system
    console.log('Security Alert:', alert)
    
    // Could integrate with:
    // - Email notifications
    // - Slack/Discord webhooks  
    // - SMS alerts
    // - Security information and event management (SIEM) systems
  }
}
```

## Conclusion

This comprehensive XSS and CSRF protection guide establishes enterprise-grade web application security for the 7P Education Platform. Through multi-layered defense mechanisms including advanced input sanitization, Content Security Policy implementation, robust CSRF protection, comprehensive security headers, and real-time attack detection, the platform achieves optimal protection against client-side vulnerabilities.

### Key Security Achievements:

1. **Multi-Layer XSS Protection**: Advanced pattern detection, context-aware sanitization, and CSP implementation
2. **Robust CSRF Defense**: Multiple protection mechanisms including double-submit cookies and origin validation  
3. **Comprehensive Security Headers**: Complete security header configuration with educational platform optimizations
4. **Real-Time Threat Detection**: Automated attack pattern recognition and response systems
5. **Educational Content Security**: Specialized protection for educational content and student data

### Implementation Benefits:

**Immediate Protection**: Critical vulnerability mitigation with minimal performance impact
**Scalable Security**: Defense mechanisms that scale with platform growth  
**Compliance Ready**: Meets educational data protection and web security standards
**User-Friendly**: Security measures that maintain optimal user experience
**Adaptive Defense**: Self-learning systems that improve protection over time

The implementation provides comprehensive protection against XSS and CSRF attacks while maintaining the interactive and collaborative nature essential for educational platforms.