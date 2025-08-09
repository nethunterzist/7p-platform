/**
 * Authentication System Types
 * Enterprise SSO Integration for 7P Education Platform
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret?: string;
  backup_codes?: string[];
  sso_provider?: SSOProvider;
  sso_id?: string;
  domain?: string;
  status: UserStatus;
  session_timeout?: number;
  force_password_reset: boolean;
  password_last_changed?: string;
  failed_login_attempts: number;
  locked_until?: string;
  metadata?: Record<string, any>;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  STUDENT = 'student',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum SSOProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  AZURE_AD = 'azure_ad',
  SAML = 'saml'
}

export enum AuthMethod {
  EMAIL_PASSWORD = 'email_password',
  GOOGLE_SSO = 'google_sso',
  MICROSOFT_SSO = 'microsoft_sso',
  SAML_SSO = 'saml_sso',
  MFA_TOTP = 'mfa_totp',
  MFA_SMS = 'mfa_sms',
  BIOMETRIC = 'biometric'
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  logo_url?: string;
  sso_enabled: boolean;
  sso_provider?: SSOProvider;
  sso_config?: SSOConfig;
  mfa_required: boolean;
  mfa_methods: AuthMethod[];
  domain_verified: boolean;
  auto_provisioning: boolean;
  default_role: UserRole;
  session_timeout: number;
  password_policy: PasswordPolicy;
  audit_logging: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface SSOConfig {
  provider: SSOProvider;
  client_id: string;
  client_secret?: string;
  tenant_id?: string; // For Azure AD
  domain?: string; // For Google Workspace
  authority?: string; // For Azure AD
  redirect_uri: string;
  scopes: string[];
  claims_mapping?: Record<string, string>;
  group_mapping?: Record<string, UserRole>;
  auto_create_users: boolean;
  sync_profile: boolean;
  metadata?: Record<string, any>;
}

export interface SAMLConfig extends SSOConfig {
  idp_entity_id: string;
  idp_sso_url: string;
  idp_certificate: string;
  sp_entity_id: string;
  sp_acs_url: string;
  attribute_mapping: Record<string, string>;
  signature_algorithm: string;
  digest_algorithm: string;
}

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_symbols: boolean;
  prevent_reuse: number;
  expiry_days?: number;
  complexity_score: number;
}

export interface MFAConfig {
  enabled: boolean;
  methods: AuthMethod[];
  backup_codes_count: number;
  totp_issuer: string;
  sms_provider?: string;
  required_for_roles: UserRole[];
  grace_period_hours: number;
}

export interface LoginAttempt {
  id: string;
  user_id?: string;
  email: string;
  ip_address: string;
  user_agent: string;
  method: AuthMethod;
  success: boolean;
  failure_reason?: string;
  location?: string;
  device_fingerprint?: string;
  created_at: string;
  session_id?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  organization_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint?: string;
  is_active: boolean;
  mfa_verified: boolean;
  sso_session_id?: string;
}

export interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  connectionType: string;
  effectiveType?: string;
}

export interface OfflineQueueStatus {
  count: number;
  items: Array<{
    id: string;
    operation: string;
    data: any;
    timestamp: Date;
    priority: 'high' | 'medium' | 'low';
    retryCount: number;
  }>;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithSSO: (provider: SSOProvider, options?: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  enableMFA: (secret: string, token: string) => Promise<void>;
  disableMFA: (password: string, token: string) => Promise<void>;
  verifyMFA: (token: string, method: AuthMethod) => Promise<boolean>;
  generateBackupCodes: () => Promise<string[]>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  // Network resilience features
  networkStatus: NetworkStatus;
  offlineQueue: OfflineQueueStatus;
}

export class AuthError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly retry_after?: number;

  constructor(
    message: string, 
    options: {
      code: string;
      details?: Record<string, any>;
      retry_after?: number;
    }
  ) {
    super(message);
    
    // Set the prototype explicitly to maintain proper inheritance
    Object.setPrototypeOf(this, AuthError.prototype);
    
    // Set the name property to the class name
    this.name = 'AuthError';
    
    // Assign properties from options
    this.code = options.code;
    this.details = options.details;
    this.retry_after = options.retry_after;
    
    // Ensure proper stack trace in V8 environments (Node.js, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

// Security Headers
export interface SecurityHeaders {
  'X-Content-Type-Options': 'nosniff';
  'X-Frame-Options': 'DENY';
  'X-XSS-Protection': '1; mode=block';
  'Strict-Transport-Security': string;
  'Content-Security-Policy': string;
  'Referrer-Policy': 'strict-origin-when-cross-origin';
  'Permissions-Policy': string;
}

// Rate Limiting
export interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
  skip_successful_requests?: boolean;
  skip_failed_requests?: boolean;
  message?: string;
}

// Domain Verification
export interface DomainVerification {
  id: string;
  organization_id: string;
  domain: string;
  verification_token: string;
  verification_method: 'dns' | 'file' | 'meta';
  verified: boolean;
  verified_at?: string;
  created_at: string;
  expires_at: string;
}

// SSO Metadata
export interface SSOMetadata {
  provider: SSOProvider;
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  scopes_supported: string[];
  response_types_supported: string[];
  claims_supported: string[];
}