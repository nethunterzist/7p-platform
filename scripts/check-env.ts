#!/usr/bin/env tsx

/**
 * 7P Education - Environment Variables Validation Script
 * 
 * Validates all required environment variables for production deployment
 * Usage: npm run check-env
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

interface EnvVariable {
  name: string;
  description: string;
  required: boolean;
  public: boolean;
  sensitive: boolean;
  validationFn?: (value: string) => boolean | string;
}

const REQUIRED_VARIABLES: EnvVariable[] = [
  // Supabase Configuration
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL',
    required: true,
    public: true,
    sensitive: false,
    validationFn: (value) => {
      if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
        return 'Must be a valid Supabase URL (https://xxx.supabase.co)';
      }
      return true;
    },
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key',
    required: true,
    public: true,
    sensitive: false,
    validationFn: (value) => {
      if (!value.startsWith('eyJ') || value.length < 100) {
        return 'Must be a valid JWT token';
      }
      return true;
    },
  },
  {
    name: 'SUPABASE_SERVICE_KEY',
    description: 'Supabase service role key',
    required: true,
    public: false,
    sensitive: true,
    validationFn: (value) => {
      if (!value.startsWith('eyJ') || value.length < 100) {
        return 'Must be a valid JWT token';
      }
      return true;
    },
  },

  // Authentication
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth.js session encryption secret',
    required: true,
    public: false,
    sensitive: true,
    validationFn: (value) => {
      if (value.length < 32) {
        return 'Must be at least 32 characters long';
      }
      return true;
    },
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'NextAuth.js application URL',
    required: true,
    public: false,
    sensitive: false,
    validationFn: (value) => {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && !value.includes('localhost')) {
          return 'Must use HTTPS in production';
        }
        return true;
      } catch {
        return 'Must be a valid URL';
      }
    },
  },

  // Stripe Configuration
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key',
    required: true,
    public: true,
    sensitive: false,
    validationFn: (value) => {
      if (!value.startsWith('pk_')) {
        return 'Must start with pk_';
      }
      return true;
    },
  },
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key',
    required: true,
    public: false,
    sensitive: true,
    validationFn: (value) => {
      if (!value.startsWith('sk_')) {
        return 'Must start with sk_';
      }
      return true;
    },
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    description: 'Stripe webhook secret',
    required: true,
    public: false,
    sensitive: true,
    validationFn: (value) => {
      if (!value.startsWith('whsec_')) {
        return 'Must start with whsec_';
      }
      return true;
    },
  },

  // Application Settings
  {
    name: 'NODE_ENV',
    description: 'Node.js environment',
    required: true,
    public: false,
    sensitive: false,
    validationFn: (value) => {
      if (!['development', 'production', 'test'].includes(value)) {
        return 'Must be development, production, or test';
      }
      return true;
    },
  },
  {
    name: 'NEXT_PUBLIC_APP_ENV',
    description: 'Application environment',
    required: true,
    public: true,
    sensitive: false,
    validationFn: (value) => {
      if (!['development', 'production', 'staging'].includes(value)) {
        return 'Must be development, production, or staging';
      }
      return true;
    },
  },

  // Monitoring (Optional but recommended)
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    description: 'Sentry error monitoring DSN',
    required: false,
    public: true,
    sensitive: false,
    validationFn: (value) => {
      if (value && (!value.startsWith('https://') || !value.includes('sentry.io'))) {
        return 'Must be a valid Sentry DSN';
      }
      return true;
    },
  },
  {
    name: 'SENTRY_ORG',
    description: 'Sentry organization slug',
    required: false,
    public: false,
    sensitive: false,
  },
  {
    name: 'SENTRY_PROJECT',
    description: 'Sentry project slug',
    required: false,
    public: false,
    sensitive: false,
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    description: 'Sentry authentication token',
    required: false,
    public: false,
    sensitive: true,
    validationFn: (value) => {
      if (value && !value.startsWith('sntrys_')) {
        return 'Must start with sntrys_';
      }
      return true;
    },
  },
];

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    total: number;
    present: number;
    missing: number;
    required_missing: number;
    invalid: number;
  };
}

function validateEnvironmentVariables(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    summary: {
      total: REQUIRED_VARIABLES.length,
      present: 0,
      missing: 0,
      required_missing: 0,
      invalid: 0,
    },
  };

  console.log('🔍 7P Education - Environment Variables Validation\n');
  console.log('=' .repeat(60));

  for (const variable of REQUIRED_VARIABLES) {
    const value = process.env[variable.name];
    const isPresent = value !== undefined && value !== '';

    if (isPresent) {
      result.summary.present++;
    } else {
      result.summary.missing++;
      if (variable.required) {
        result.summary.required_missing++;
      }
    }

    // Check if variable is present
    if (!isPresent) {
      const message = `${variable.name}: Missing${variable.required ? ' (REQUIRED)' : ' (optional)'}`;
      
      if (variable.required) {
        result.errors.push(message);
        console.log(`❌ ${message}`);
      } else {
        result.warnings.push(message);
        console.log(`⚠️  ${message}`);
      }
      continue;
    }

    // Validate value format if validation function exists
    if (variable.validationFn) {
      const validationResult = variable.validationFn(value!);
      if (validationResult !== true) {
        result.summary.invalid++;
        const message = `${variable.name}: ${validationResult}`;
        result.errors.push(message);
        console.log(`❌ ${message}`);
        continue;
      }
    }

    // Variable is valid
    const maskValue = variable.sensitive 
      ? value!.substring(0, 8) + '***' 
      : value!.substring(0, 50) + (value!.length > 50 ? '...' : '');
    
    console.log(`✅ ${variable.name}: ${maskValue}`);
  }

  result.success = result.errors.length === 0;

  return result;
}

function checkEnvironmentConsistency(): string[] {
  const issues: string[] = [];
  const nodeEnv = process.env.NODE_ENV;
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripePublic = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Check environment consistency
  if (nodeEnv === 'production' && appEnv !== 'production') {
    issues.push('NODE_ENV is production but NEXT_PUBLIC_APP_ENV is not production');
  }

  // Check Stripe key consistency
  if (stripeSecret && stripePublic) {
    const isSecretTest = stripeSecret.includes('test');
    const isPublicTest = stripePublic.includes('test');
    
    if (isSecretTest !== isPublicTest) {
      issues.push('Stripe secret and publishable keys are from different environments (test/live)');
    }
    
    if (nodeEnv === 'production' && isSecretTest) {
      issues.push('Using test Stripe keys in production environment');
    }
  }

  // Check URL consistency
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    if (nodeEnv === 'production' && nextAuthUrl.includes('localhost')) {
      issues.push('NEXTAUTH_URL points to localhost in production');
    }
  }

  return issues;
}

function generateReport(result: ValidationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`Total variables: ${result.summary.total}`);
  console.log(`Present: ${result.summary.present}`);
  console.log(`Missing: ${result.summary.missing}`);
  console.log(`Required missing: ${result.summary.required_missing}`);
  console.log(`Invalid: ${result.summary.invalid}`);

  if (result.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(warning => console.log(`  • ${warning}`));
  }

  // Check consistency
  const consistencyIssues = checkEnvironmentConsistency();
  if (consistencyIssues.length > 0) {
    console.log('\n⚠️  CONSISTENCY ISSUES:');
    consistencyIssues.forEach(issue => console.log(`  • ${issue}`));
  }

  console.log('\n' + '='.repeat(60));
  
  if (result.success && consistencyIssues.length === 0) {
    console.log('🎉 VALIDATION PASSED - All required environment variables are configured correctly!');
    
    if (result.warnings.length > 0) {
      console.log(`\n💡 Consider configuring ${result.warnings.length} optional variable(s) for enhanced functionality.`);
    }
  } else {
    console.log('❌ VALIDATION FAILED - Please fix the issues above before deployment.');
  }

  console.log('='.repeat(60));
}

function generateEnvTemplate(): void {
  console.log('\n📝 Environment Variables Template:');
  console.log('-'.repeat(40));
  
  REQUIRED_VARIABLES.forEach(variable => {
    const comment = `# ${variable.description}${variable.required ? ' (REQUIRED)' : ' (optional)'}`;
    console.log(comment);
    console.log(`${variable.name}=`);
    console.log();
  });
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.includes('--template')) {
    generateEnvTemplate();
    return;
  }

  const result = validateEnvironmentVariables();
  generateReport(result);

  if (args.includes('--template-on-fail') && !result.success) {
    generateEnvTemplate();
  }

  // Exit with error code if validation failed
  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateEnvironmentVariables, checkEnvironmentConsistency };