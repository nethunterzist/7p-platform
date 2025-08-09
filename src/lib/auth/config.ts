/**
 * Server-Side Authentication Configuration
 * Enterprise SSO and Security Settings (Server-Only)
 */

import { SSOProvider, AuthMethod, UserRole } from '@/lib/types/auth';

// Import and re-export client-safe constants
export {
  DEFAULT_PASSWORD_POLICY,
  DEFAULT_MFA_CONFIG,
  RATE_LIMIT_CONFIG,
  SECURITY_HEADERS,
  AUDIT_EVENTS,
  DEFAULT_ORGANIZATION_CONFIG,
  FEATURE_FLAGS as CLIENT_FEATURE_FLAGS,
  SSO_PROVIDERS,
  SSO_CLIENT_CONFIG
} from './config-client';

// JWT Security Validation (Server-Only)
function validateJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
}

// Server-Only Configuration
export const SERVER_CONFIG = {
  // Legacy field for backward compatibility
  JWT_SECRET: validateJWTSecret(),
  BACKUP_CODES_COUNT: 10,
  jwt: {
    secret: validateJWTSecret(),
    algorithm: 'HS256' as const,
    expiresIn: '15m',
    refreshExpiresIn: '7d'
  },
  session: {
    maxAge: 15 * 60 * 1000, // 15 minutes
    refreshMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secureCookies: process.env.NODE_ENV === 'production'
  }
};

// Legacy AUTH_CONFIG alias for backward compatibility
export const AUTH_CONFIG = SERVER_CONFIG;

// Google SSO Configuration (Server-Only)
export const GOOGLE_SSO_CONFIG = {
  client_id: process.env.GOOGLE_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/auth/callback/google`,
  scopes: ['openid', 'email', 'profile'],
  hosted_domain: process.env.GOOGLE_HOSTED_DOMAIN
};

// Microsoft SSO Configuration (Server-Only)
export const MICROSOFT_SSO_CONFIG = {
  client_id: process.env.MICROSOFT_CLIENT_ID || '',
  client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
  tenant_id: process.env.MICROSOFT_TENANT_ID || 'common',
  authority: process.env.MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common',
  redirect_uri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/auth/callback/microsoft`,
  scopes: ['openid', 'email', 'profile']
};

// SSO Provider Status Check Functions (Server-Only)
export const getSSO_PROVIDER_STATUS = () => ({
  [SSOProvider.GOOGLE]: {
    enabled: !!process.env.GOOGLE_CLIENT_ID,
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  },
  [SSOProvider.MICROSOFT]: {
    enabled: !!process.env.MICROSOFT_CLIENT_ID,
    configured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
  },
  [SSOProvider.AZURE_AD]: {
    enabled: !!process.env.MICROSOFT_CLIENT_ID,
    configured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
  },
  [SSOProvider.SAML]: {
    enabled: !!process.env.SAML_CERT,
    configured: !!(process.env.SAML_CERT && process.env.SAML_ENTRY_POINT)
  }
});

// Server Feature Flags
export const FEATURE_FLAGS = {
  sso_enabled: true,
  mfa_enabled: true,
  audit_logging: true,
  rate_limiting: true,
  session_management: true,
  password_history: true,
  account_lockout: true,
  domain_verification: true,
  backup_codes: true,
  remember_device: true
};