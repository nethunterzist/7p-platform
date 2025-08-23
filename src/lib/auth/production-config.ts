/**
 * PRODUCTION AUTH CONFIGURATION - 7P Education
 * Enterprise-grade security settings for Supabase Auth
 */

export interface ProductionAuthConfig {
  jwt: {
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
    signatureAlgorithm: string;
  };
  session: {
    inactivityTimeout: number;
    absoluteTimeout: number;
    maxConcurrentSessions: number;
    requireReauth: boolean;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    historyLimit: number;
    maxAge: number; // 90 days in milliseconds
  };
  rateLimit: {
    loginAttempts: {
      maxAttempts: number;
      windowMs: number;
      lockoutDuration: number;
    };
    progressiveDelay: number[];
    ipBlacklist: string[];
  };
  verification: {
    email: {
      required: boolean;
      linkExpiry: number;
      resendLimit: number;
      resendWindow: number;
    };
  };
  audit: {
    enabled: boolean;
    events: string[];
    retention: number;
  };
}

export const PRODUCTION_AUTH_CONFIG: ProductionAuthConfig = {
  jwt: {
    accessTokenExpiry: 15 * 60, // 15 minutes
    refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
    signatureAlgorithm: 'HS256'
  },
  session: {
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours max session
    maxConcurrentSessions: 3,
    requireReauth: true
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    historyLimit: 5,
    maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
  },
  rateLimit: {
    loginAttempts: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      lockoutDuration: 15 * 60 * 1000 // 15 minutes
    },
    progressiveDelay: [1000, 2000, 4000, 8000], // 1s, 2s, 4s, 8s then lock
    ipBlacklist: []
  },
  verification: {
    email: {
      required: true,
      linkExpiry: 24 * 60 * 60 * 1000, // 24 hours
      resendLimit: 3,
      resendWindow: 60 * 60 * 1000 // 1 hour
    }
  },
  audit: {
    enabled: true,
    events: [
      'login',
      'logout',
      'registration',
      'password_change',
      'password_reset',
      'failed_login',
      'account_locked',
      'session_expired',
      'suspicious_activity'
    ],
    retention: 365 * 24 * 60 * 60 * 1000 // 1 year
  }
};

// Security headers for authentication
export const AUTH_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// Password strength validation regex patterns
export const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  numbers: /\d/,
  specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  sequential: /(.)\1{2,}/, // 3 or more repeated characters
  common: [
    'password', '123456', 'password123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'qwerty', 'abc123'
  ]
};

// Turkish error messages for localization
export const AUTH_MESSAGES_TR = {
  PASSWORD_TOO_WEAK: 'Şifre çok zayıf. En az 8 karakter, 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir.',
  PASSWORD_REUSED: 'Bu şifre son 5 şifrenizden biri. Lütfen farklı bir şifre seçin.',
  PASSWORD_EXPIRED: 'Şifrenizin süresi dolmuş. Lütfen yeni bir şifre belirleyin.',
  EMAIL_NOT_VERIFIED: 'E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu kontrol edin.',
  ACCOUNT_LOCKED: 'Hesabınız geçici olarak kilitlendi. 15 dakika sonra tekrar deneyin.',
  TOO_MANY_ATTEMPTS: 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.',
  INVALID_CREDENTIALS: 'E-posta veya şifre hatalı.',
  SESSION_EXPIRED: 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
  CSRF_TOKEN_INVALID: 'Güvenlik token geçersiz. Sayfayı yenileyip tekrar deneyin.',
  CAPTCHA_REQUIRED: 'Güvenlik doğrulaması gerekiyor. Lütfen robot olmadığınızı kanıtlayın.'
};

// Supabase Auth configuration for production
export const getSupabaseAuthConfig = () => ({
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    // Production security settings
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth',
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: PRODUCTION_AUTH_CONFIG.jwt.accessTokenExpiry,
      domain: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_DOMAIN : undefined,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false // Client needs access
    }
  },
  global: {
    headers: {
      'X-Client-Info': '7p-education-frontend'
    }
  }
});

export default PRODUCTION_AUTH_CONFIG;