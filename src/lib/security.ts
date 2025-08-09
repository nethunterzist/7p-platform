import { NextRequest } from 'next/server';
import { supabase } from './supabase';

// =====================================
// RATE LIMITING
// =====================================

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// Rate limiting configurations for different endpoints
export const RATE_LIMITS = {
  // Payment endpoints - more restrictive
  payment: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
  checkout: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 requests per minute
  webhook: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  
  // General API endpoints
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  auth: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  
  // Admin endpoints - moderate restrictions
  admin: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
} as const;

// Simple in-memory rate limiting (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if request exceeds rate limit
 * @param identifier Unique identifier (IP address, user ID, etc.)
 * @param config Rate limit configuration
 * @returns true if rate limit exceeded
 */
export function isRateLimited(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const key = identifier;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }
  
  if (existing.count >= config.maxRequests) {
    return true; // Rate limit exceeded
  }
  
  // Increment count
  existing.count++;
  rateLimitStore.set(key, existing);
  return false;
}

/**
 * Get client identifier for rate limiting
 * @param request Next.js request object
 * @returns Client identifier
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for production behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIP || 'unknown';
  
  return ip;
}

/**
 * Apply rate limiting to request
 * @param request Next.js request object
 * @param config Rate limit configuration
 * @param userIdentifier Optional user identifier (more specific than IP)
 * @throws Error if rate limit exceeded
 */
export function applyRateLimit(
  request: NextRequest, 
  config: RateLimitConfig,
  userIdentifier?: string
): void {
  const identifier = userIdentifier || getClientIdentifier(request);
  
  if (isRateLimited(identifier, config)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}

// =====================================
// INPUT VALIDATION & SANITIZATION
// =====================================

/**
 * Validate UUID format
 * @param uuid UUID string to validate
 * @returns true if valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 * @param email Email string to validate
 * @returns true if valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate currency code
 * @param currency Currency code to validate
 * @returns true if valid currency
 */
export function isValidCurrency(currency: string): boolean {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'TRY'];
  return validCurrencies.includes(currency.toUpperCase());
}

/**
 * Validate amount (positive integer in cents)
 * @param amount Amount to validate
 * @returns true if valid amount
 */
export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= 99999999; // Max $999,999.99
}

/**
 * Sanitize string input
 * @param input String to sanitize
 * @param maxLength Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.trim().substring(0, maxLength);
}

/**
 * Validate request payload structure
 * @param payload Request payload
 * @param requiredFields Array of required field names
 * @throws Error if validation fails
 */
export function validatePayload(payload: any, requiredFields: string[]): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request payload');
  }
  
  for (const field of requiredFields) {
    if (!(field in payload) || payload[field] === null || payload[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

// =====================================
// AUTHENTICATION & AUTHORIZATION
// =====================================

/**
 * Verify user authentication
 * @param request Next.js request object
 * @returns User object if authenticated
 * @throws Error if not authenticated
 */
export async function requireAuth(request?: NextRequest) {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Verify admin authorization
 * @param userId User ID to check
 * @returns true if user is admin
 * @throws Error if not authorized
 */
export async function requireAdmin(userId: string): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error || profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return true;
}

/**
 * Check if user owns resource
 * @param userId User ID
 * @param resourceUserId Resource owner ID
 * @throws Error if not authorized
 */
export function requireOwnership(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw new Error('Access denied: insufficient permissions');
  }
}

// =====================================
// SECURITY HEADERS
// =====================================

/**
 * Get security headers for API responses
 * @returns Object with security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': 'no-store, max-age=0',
  };
}

// =====================================
// WEBHOOK SECURITY
// =====================================

/**
 * Validate webhook signature (already implemented in stripe.ts)
 * This is a wrapper for consistency
 */
export { verifyWebhookSignature } from './stripe';

// =====================================
// LOGGING & MONITORING
// =====================================

/**
 * Log security event
 * @param event Security event details
 */
export async function logSecurityEvent(event: {
  type: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'unauthorized_access' | 'admin_action';
  message: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('security_logs')
      .insert({
        event_type: event.type,
        message: event.message,
        user_id: event.userId,
        ip_address: event.ip,
        user_agent: event.userAgent,
        metadata: event.metadata,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Security logging error:', error);
  }
}

// =====================================
// ENVIRONMENT VALIDATION
// =====================================

/**
 * Validate required environment variables
 * @throws Error if required variables are missing
 */
export function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate key formats
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
  
  if (!stripeSecretKey.startsWith('sk_')) {
    throw new Error('Invalid Stripe secret key format');
  }
  
  if (!stripePublishableKey.startsWith('pk_')) {
    throw new Error('Invalid Stripe publishable key format');
  }
  
  // Warn about development vs production keys
  const isProduction = process.env.NODE_ENV === 'production';
  const usingTestKeys = stripeSecretKey.includes('test') || stripePublishableKey.includes('test');
  
  if (isProduction && usingTestKeys) {
    console.warn('WARNING: Using test Stripe keys in production environment');
  }
  
  if (!isProduction && !usingTestKeys) {
    console.warn('WARNING: Using live Stripe keys in development environment');
  }
}

// =====================================
// PCI DSS COMPLIANCE HELPERS
// =====================================

/**
 * Mask sensitive data for logging
 * @param data Data to mask
 * @returns Masked data
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveFields = [
    'password',
    'secret',
    'key',
    'token',
    'card',
    'ssn',
    'credit',
    'payment',
  ];
  
  const masked = { ...data };
  
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive && typeof masked[key] === 'string') {
      masked[key] = '*'.repeat(masked[key].length);
    }
  }
  
  return masked;
}

/**
 * Check if request is from allowed origin
 * @param request Next.js request object
 * @returns true if origin is allowed
 */
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter(Boolean);
  
  return !origin || allowedOrigins.includes(origin);
}

// Initialize environment validation on module load
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error);
  // Don't throw in development to allow gradual setup
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}