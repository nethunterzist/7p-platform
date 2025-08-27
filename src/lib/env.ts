/**
 * 7P Education - Environment Configuration
 * 
 * Centralized environment variables and feature flags
 * for payment modes, free enrollment, and feature toggles
 */

// Payment system configuration
export const PAYMENTS_MODE = process.env.PAYMENTS_MODE ?? 'disabled';
export const STRIPE_ENABLED = PAYMENTS_MODE === 'stripe';

// Free enrollment feature flags
export const FEATURE_ENROLL_FREE = process.env.FEATURE_ENROLL_FREE === 'true';
export const FREE_ENROLLMENT_CODE = process.env.FREE_ENROLLMENT_CODE ?? null;

// Application environment
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Authentication
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

// Supabase configuration
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Stripe configuration (only used when PAYMENTS_MODE === 'stripe')
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = STRIPE_ENABLED ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined;
export const STRIPE_SECRET_KEY = STRIPE_ENABLED ? process.env.STRIPE_SECRET_KEY : undefined;
export const STRIPE_WEBHOOK_SECRET = STRIPE_ENABLED ? process.env.STRIPE_WEBHOOK_SECRET : undefined;

// Monitoring
export const NEXT_PUBLIC_SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
export const SENTRY_ORG = process.env.SENTRY_ORG;
export const SENTRY_PROJECT = process.env.SENTRY_PROJECT;

// Feature flags validation
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Core required variables
  if (!NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  if (!SUPABASE_SERVICE_KEY) {
    errors.push('SUPABASE_SERVICE_KEY is required');
  }
  
  if (!NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }

  // Stripe validation (only when enabled)
  if (STRIPE_ENABLED) {
    if (!NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required when PAYMENTS_MODE=stripe');
    }
    
    if (!STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is required when PAYMENTS_MODE=stripe');
    }
    
    if (!STRIPE_WEBHOOK_SECRET && IS_PRODUCTION) {
      errors.push('STRIPE_WEBHOOK_SECRET is required in production when PAYMENTS_MODE=stripe');
    }
  }

  // Free enrollment validation
  if (FEATURE_ENROLL_FREE && FREE_ENROLLMENT_CODE && FREE_ENROLLMENT_CODE.length < 4) {
    errors.push('FREE_ENROLLMENT_CODE must be at least 4 characters when specified');
  }

  // Payment mode validation
  if (!['stripe', 'disabled'].includes(PAYMENTS_MODE)) {
    errors.push('PAYMENTS_MODE must be either "stripe" or "disabled"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  payments_mode: PAYMENTS_MODE,
  stripe_enabled: STRIPE_ENABLED,
  free_enrollment_enabled: FEATURE_ENROLL_FREE,
  has_enrollment_code: !!FREE_ENROLLMENT_CODE,
  environment: NODE_ENV,
  is_production: IS_PRODUCTION,
});

// Public environment variables (safe to expose to client)
export const getPublicEnvironmentInfo = () => ({
  payments_mode: PAYMENTS_MODE,
  free_enrollment_enabled: FEATURE_ENROLL_FREE,
  has_enrollment_code: !!FREE_ENROLLMENT_CODE,
  environment: NODE_ENV,
});