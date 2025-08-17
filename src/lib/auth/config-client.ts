/**
 * Client-Safe Authentication Configuration
 * Constants that can be safely accessed on the client-side
 */

import { SSOProvider, AuthMethod, UserRole, PasswordPolicy, MFAConfig, RateLimitConfig } from '@/lib/types/auth';

// Default Password Policy
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_symbols: true,
  prevent_reuse: 5,
  expiry_days: 90,
  complexity_score: 3
};

// Default MFA Configuration
export const DEFAULT_MFA_CONFIG: MFAConfig = {
  enabled: false,
  methods: [AuthMethod.MFA_TOTP],
  backup_codes_count: 10,
  totp_issuer: '7P Education',
  required_for_roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  grace_period_hours: 24
};

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  login: {
    window_ms: 15 * 60 * 1000, // 15 minutes
    max_requests: 5,
    skip_successful_requests: false,
    message: 'Too many login attempts, please try again later.'
  },
  register: {
    window_ms: 60 * 60 * 1000, // 1 hour
    max_requests: 3,
    skip_successful_requests: true,
    message: 'Too many registration attempts, please try again later.'
  },
  password_reset: {
    window_ms: 60 * 60 * 1000, // 1 hour
    max_requests: 3,
    skip_successful_requests: true,
    message: 'Too many password reset attempts, please try again later.'
  },
  mfa_verify: {
    window_ms: 5 * 60 * 1000, // 5 minutes
    max_requests: 10,
    skip_successful_requests: false,
    message: 'Too many MFA verification attempts, please try again later.'
  },
  api: {
    window_ms: 15 * 60 * 1000, // 15 minutes
    max_requests: 100,
    skip_successful_requests: true,
    message: 'Too many API requests, please try again later.'
  }
};

// Security Headers Configuration (client-safe, public information)
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://login.microsoftonline.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://accounts.google.com https://login.microsoftonline.com https://riupkkggupogdgubnhmy.supabase.co wss:",
    "frame-src 'self' https://accounts.google.com https://login.microsoftonline.com"
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Supported SSO Providers (client-safe metadata)
export const SSO_PROVIDERS = {
  [SSOProvider.GOOGLE]: {
    name: 'Google Workspace',
    icon: '/icons/google.svg',
    color: '#4285F4',
    description: 'Sign in with your Google Workspace account',
    // Note: enabled status will be determined by server-side config
    enabled: false
  },
  [SSOProvider.MICROSOFT]: {
    name: 'Microsoft 365',
    icon: '/icons/microsoft.svg',
    color: '#0078D4',
    description: 'Sign in with your Microsoft 365 account',
    enabled: false
  },
  [SSOProvider.AZURE_AD]: {
    name: 'Azure Active Directory',
    icon: '/icons/azure.svg',
    color: '#0078D4',
    description: 'Sign in with your Azure AD account',
    enabled: false
  },
  [SSOProvider.SAML]: {
    name: 'SAML SSO',
    icon: '/icons/saml.svg',
    color: '#FF6B35',
    description: 'Sign in with your enterprise SAML provider',
    enabled: true
  }
};

// Audit Event Types (client-safe constants)
export const AUDIT_EVENTS = {
  // Authentication Events
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  SESSION_EXPIRED: 'auth.session.expired',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET: 'auth.password.reset',
  
  // MFA Events
  MFA_ENABLED: 'auth.mfa.enabled',
  MFA_DISABLED: 'auth.mfa.disabled',
  MFA_VERIFIED: 'auth.mfa.verified',
  MFA_FAILED: 'auth.mfa.failed',
  BACKUP_CODES_GENERATED: 'auth.backup_codes.generated',
  BACKUP_CODE_USED: 'auth.backup_code.used',
  
  // SSO Events
  SSO_LOGIN_SUCCESS: 'auth.sso.login.success',
  SSO_LOGIN_FAILURE: 'auth.sso.login.failure',
  SSO_PROVIDER_CONFIGURED: 'auth.sso.provider.configured',
  SSO_PROVIDER_DISABLED: 'auth.sso.provider.disabled',
  
  // User Management Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',
  USER_UNSUSPENDED: 'user.unsuspended',
  USER_ROLE_CHANGED: 'user.role.changed',
  
  // Organization Events
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  DOMAIN_VERIFIED: 'organization.domain.verified',
  SSO_CONFIGURED: 'organization.sso.configured',
  
  // Security Events
  ACCOUNT_LOCKED: 'security.account.locked',
  ACCOUNT_UNLOCKED: 'security.account.unlocked',
  SUSPICIOUS_LOGIN: 'security.login.suspicious',
  BRUTE_FORCE_DETECTED: 'security.brute_force.detected',
  SECURITY_POLICY_VIOLATION: 'security.policy.violation'
};

// Default Organization Settings (client-safe)
export const DEFAULT_ORGANIZATION_CONFIG = {
  sso_enabled: false,
  mfa_required: false,
  mfa_methods: [AuthMethod.MFA_TOTP],
  auto_provisioning: false,
  default_role: UserRole.STUDENT,
  session_timeout: 3600000, // 1 hour
  password_policy: DEFAULT_PASSWORD_POLICY,
  audit_logging: true,
  domain_verification_required: true
};

// Feature Flags (client-safe, will be populated by server)
export const FEATURE_FLAGS = {
  GOOGLE_SSO: false,
  MICROSOFT_SSO: false,
  SAML_SSO: false,
  MFA_TOTP: false,
  MFA_SMS: false,
  BIOMETRIC_AUTH: false,
  AUDIT_LOGGING: true,
  DOMAIN_VERIFICATION: true,
  AUTO_PROVISIONING: false,
  SESSION_MANAGEMENT: true
};

// Client-safe SSO Configuration (without secrets)
export const SSO_CLIENT_CONFIG = {
  GOOGLE: {
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/google`,
    scopes: [
      'openid',
      'profile',
      'email'
    ]
  },
  MICROSOFT: {
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/microsoft`,
    scopes: [
      'openid',
      'profile',
      'email'
    ]
  }
};