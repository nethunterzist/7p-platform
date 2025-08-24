/**
 * 🍪 Secure Cookie Configuration
 * 7P Education Platform - Enhanced Token Storage Security
 * 
 * Implements httpOnly, secure, sameSite cookie configuration for JWT tokens
 */

import { NextResponse } from 'next/server';
import { ENHANCED_JWT_CONFIG } from './config';

export interface SecureCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  domain?: string;
  maxAge: number;
}

/**
 * 🔐 Secure Cookie Configuration for Authentication
 */
export const SECURE_COOKIE_CONFIG: SecureCookieOptions = {
  httpOnly: true,        // 🛡️ Prevent XSS attacks - no client-side JS access
  secure: process.env.NODE_ENV === 'production', // 🔒 HTTPS only in production
  sameSite: 'strict',    // 🚫 CSRF protection - strict same-site policy
  path: '/',             // 🌐 Available across entire application
  domain: process.env.NODE_ENV === 'production' 
    ? '.7peducation.com'  // 🏢 Production domain (allows subdomains)
    : undefined,          // 🧪 Development - use default domain
  maxAge: 60 * 60 * 1000 // ⏰ 1 hour (matches JWT expiry)
};

/**
 * 🍪 Refresh Token Cookie Configuration
 * More restrictive settings for longer-lived tokens
 */
export const REFRESH_COOKIE_CONFIG: SecureCookieOptions = {
  ...SECURE_COOKIE_CONFIG,
  maxAge: 7 * 24 * 60 * 60 * 1000, // ⏰ 7 days (matches refresh token expiry)
  path: '/auth',         // 🔒 Only available on auth endpoints
  sameSite: 'strict'     // 🛡️ Extra strict for refresh tokens
};

/**
 * Cookie Names
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'auth-token',
  REFRESH_TOKEN: 'refresh-token',
  SESSION_ID: 'session-id',
  DEVICE_ID: 'device-id',
  CSRF_TOKEN: 'csrf-token'
} as const;

/**
 * 🔐 Set Secure Authentication Cookie
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, token, SECURE_COOKIE_CONFIG);
  return response;
}

/**
 * 🔄 Set Secure Refresh Token Cookie
 */
export function setRefreshCookie(response: NextResponse, refreshToken: string): NextResponse {
  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_COOKIE_CONFIG);
  return response;
}

/**
 * 🆔 Set Session ID Cookie
 */
export function setSessionCookie(response: NextResponse, sessionId: string): NextResponse {
  const sessionConfig: SecureCookieOptions = {
    ...SECURE_COOKIE_CONFIG,
    maxAge: ENHANCED_JWT_CONFIG.ABSOLUTE_TIMEOUT // 8 hours
  };
  
  response.cookies.set(COOKIE_NAMES.SESSION_ID, sessionId, sessionConfig);
  return response;
}

/**
 * 📱 Set Device ID Cookie
 */
export function setDeviceCookie(response: NextResponse, deviceId: string): NextResponse {
  const deviceConfig: SecureCookieOptions = {
    ...SECURE_COOKIE_CONFIG,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days - persistent device tracking
    sameSite: 'lax' // Allow some cross-site for device recognition
  };
  
  response.cookies.set(COOKIE_NAMES.DEVICE_ID, deviceId, deviceConfig);
  return response;
}

/**
 * 🛡️ Set CSRF Token Cookie
 */
export function setCSRFCookie(response: NextResponse, csrfToken: string): NextResponse {
  const csrfConfig: SecureCookieOptions = {
    httpOnly: false,       // 📝 Client needs to read for form submission
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 1000 // 1 hour
  };
  
  response.cookies.set(COOKIE_NAMES.CSRF_TOKEN, csrfToken, csrfConfig);
  return response;
}

/**
 * 🧹 Clear Authentication Cookies (Logout)
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const expiredConfig = {
    ...SECURE_COOKIE_CONFIG,
    maxAge: 0,
    expires: new Date(0)
  };
  
  // Clear all authentication cookies
  Object.values(COOKIE_NAMES).forEach(cookieName => {
    response.cookies.set(cookieName, '', expiredConfig);
  });
  
  return response;
}

/**
 * 🔍 Extract Token from Request Cookies
 */
export function getTokenFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = parseCookies(cookieHeader);
  return cookies[COOKIE_NAMES.ACCESS_TOKEN] || null;
}

/**
 * 🔄 Extract Refresh Token from Cookies
 */
export function getRefreshTokenFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = parseCookies(cookieHeader);
  return cookies[COOKIE_NAMES.REFRESH_TOKEN] || null;
}

/**
 * 🆔 Extract Session ID from Cookies
 */
export function getSessionIdFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = parseCookies(cookieHeader);
  return cookies[COOKIE_NAMES.SESSION_ID] || null;
}

/**
 * 📱 Extract Device ID from Cookies
 */
export function getDeviceIdFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = parseCookies(cookieHeader);
  return cookies[COOKIE_NAMES.DEVICE_ID] || null;
}

/**
 * 🔧 Parse Cookie String into Object
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    }, {} as Record<string, string>);
}

/**
 * 🧪 Validate Cookie Security Configuration
 */
export function validateCookieConfig(): {
  isSecure: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check production security
  if (process.env.NODE_ENV === 'production') {
    if (!SECURE_COOKIE_CONFIG.secure) {
      issues.push('Cookies not marked as secure in production');
    }
    if (!SECURE_COOKIE_CONFIG.domain?.includes('7peducation.com')) {
      recommendations.push('Consider setting domain to .7peducation.com for subdomain support');
    }
  }
  
  // Check httpOnly for security cookies
  if (!SECURE_COOKIE_CONFIG.httpOnly) {
    issues.push('Auth tokens should be httpOnly to prevent XSS');
  }
  
  // Check sameSite setting
  if (SECURE_COOKIE_CONFIG.sameSite !== 'strict' && SECURE_COOKIE_CONFIG.sameSite !== 'lax') {
    issues.push('sameSite should be strict or lax for CSRF protection');
  }
  
  return {
    isSecure: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * 🔐 Security Headers for Cookie Enhancement
 */
export const COOKIE_SECURITY_HEADERS = {
  // Prevent client-side cookie access
  'Set-Cookie': 'HttpOnly; Secure; SameSite=Strict',
  
  // Additional security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Cookie-specific security
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export default {
  SECURE_COOKIE_CONFIG,
  REFRESH_COOKIE_CONFIG,
  COOKIE_NAMES,
  setAuthCookie,
  setRefreshCookie,
  clearAuthCookies,
  getTokenFromCookies,
  validateCookieConfig
};