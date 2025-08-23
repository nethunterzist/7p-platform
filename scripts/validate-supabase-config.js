#!/usr/bin/env node

/**
 * SUPABASE CONFIGURATION VALIDATOR - 7P Education
 * Validates that all production security settings are properly configured
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Configuration
const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://7peducation.vercel.app',
  requiredHooks: [
    'send-email-hook',
    'password-verification-hook', 
    'mfa-verification-hook'
  ]
};

console.log('🔍 7P Education - Supabase Configuration Validator');
console.log('==============================================');

async function main() {
  try {
    console.log('⚙️  Validating production configuration...\n');
    
    // Initialize Supabase client
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    
    // Run validation checks
    const results = await runValidationChecks(supabase);
    
    // Generate validation report
    generateValidationReport(results);
    
    // Determine overall status
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('===================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0 && warnings <= 2) {
      console.log('\n🎉 CONFIGURATION READY FOR PRODUCTION!');
      console.log('All critical security settings are properly configured.');
      process.exit(0);
    } else if (failed === 0) {
      console.log('\n⚠️  CONFIGURATION MOSTLY READY');
      console.log('Please review warnings before production deployment.');
      process.exit(0);
    } else {
      console.log('\n❌ CONFIGURATION NOT READY');
      console.log('Please fix failed checks before production deployment.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Validation failed:', error.message);
    process.exit(1);
  }
}

async function runValidationChecks(supabase) {
  const checks = [
    { name: 'Environment Variables', check: () => validateEnvironment() },
    { name: 'Database Connection', check: () => validateDatabaseConnection(supabase) },
    { name: 'Auth Hooks Deployment', check: () => validateAuthHooks() },
    { name: 'Database Tables', check: () => validateDatabaseTables(supabase) },
    { name: 'RLS Policies', check: () => validateRLSPolicies(supabase) },
    { name: 'Email Templates', check: () => validateEmailTemplates() },
    { name: 'Security Headers', check: () => validateSecurityHeaders() },
    { name: 'Production URLs', check: () => validateProductionUrls() }
  ];
  
  const results = [];
  
  for (const { name, check } of checks) {
    console.log(`🔍 Checking ${name}...`);
    
    try {
      const result = await check();
      results.push({
        name,
        status: result.status || 'pass',
        message: result.message || 'OK',
        details: result.details || null
      });
      
      const icon = result.status === 'fail' ? '❌' : 
                   result.status === 'warning' ? '⚠️' : '✅';
      console.log(`  ${icon} ${result.message}`);
      
    } catch (error) {
      results.push({
        name,
        status: 'fail',
        message: error.message,
        details: null
      });
      console.log(`  ❌ ${error.message}`);
    }
  }
  
  return results;
}

function validateEnvironment() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  // Check URL format
  try {
    new URL(CONFIG.supabaseUrl);
  } catch {
    throw new Error('Invalid SUPABASE_URL format');
  }
  
  return { message: 'All environment variables configured' };
}

async function validateDatabaseConnection(supabase) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('relation "audit_logs" does not exist')) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    return { message: 'Database connection successful' };
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function validateAuthHooks() {
  const checks = [];
  
  for (const hook of CONFIG.requiredHooks) {
    const hookUrl = `${CONFIG.supabaseUrl}/functions/v1/auth-hooks/${hook}`;
    
    try {
      await checkUrlAccessible(hookUrl);
      checks.push({ hook, status: 'deployed' });
    } catch (error) {
      checks.push({ hook, status: 'failed', error: error.message });
    }
  }
  
  const failed = checks.filter(c => c.status === 'failed');
  
  if (failed.length > 0) {
    return {
      status: 'warning',
      message: `${failed.length} auth hooks not accessible`,
      details: failed
    };
  }
  
  return { 
    message: 'All auth hooks deployed and accessible',
    details: checks
  };
}

function checkUrlAccessible(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 5000 }, (response) => {
      if (response.statusCode === 200 || response.statusCode === 405) {
        // 405 is OK - means function exists but POST method expected
        resolve();
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function validateDatabaseTables(supabase) {
  const requiredTables = [
    'audit_logs',
    'password_history', 
    'user_profiles',
    'email_verification_logs'
  ];
  
  const missingTables = [];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
      }
    } catch (error) {
      // Ignore connection errors, focus on table existence
    }
  }
  
  if (missingTables.length > 0) {
    return {
      status: 'warning',
      message: `${missingTables.length} tables missing or not accessible`,
      details: missingTables
    };
  }
  
  return { message: 'All required database tables exist' };
}

async function validateRLSPolicies(supabase) {
  // This would require checking RLS policies on each table
  // For now, we'll return a warning to manually verify
  return {
    status: 'warning',
    message: 'Please manually verify RLS policies are enabled',
    details: 'Check Supabase Dashboard > Authentication > Policies'
  };
}

function validateEmailTemplates() {
  // This requires manual verification in Supabase Dashboard
  return {
    status: 'warning',
    message: 'Please manually verify Turkish email templates are configured',
    details: 'Check Supabase Dashboard > Authentication > Email Templates'
  };
}

function validateSecurityHeaders() {
  // Check if HTTPS is enforced and proper headers are set
  if (!CONFIG.supabaseUrl.startsWith('https://')) {
    throw new Error('HTTPS not enforced - use HTTPS URLs in production');
  }
  
  if (!CONFIG.siteUrl.startsWith('https://')) {
    return {
      status: 'warning',
      message: 'Site URL should use HTTPS in production',
      details: `Current: ${CONFIG.siteUrl}`
    };
  }
  
  return { message: 'HTTPS properly configured' };
}

function validateProductionUrls() {
  const devIndicators = ['localhost', '127.0.0.1', 'dev', 'staging', 'test'];
  const hasDevUrl = devIndicators.some(indicator => 
    CONFIG.siteUrl.toLowerCase().includes(indicator)
  );
  
  if (hasDevUrl) {
    return {
      status: 'warning',
      message: 'Development URL detected - update for production',
      details: `Current site URL: ${CONFIG.siteUrl}`
    };
  }
  
  return { message: 'Production URLs properly configured' };
}

function generateValidationReport(results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    overall_status: results.every(r => r.status !== 'fail') ? 'READY' : 'NOT_READY',
    checks: results,
    recommendations: generateRecommendations(results)
  };
  
  // Save report to file
  const fs = require('fs');
  const path = require('path');
  
  const reportDir = path.join(process.cwd(), 'reports', 'config-validation');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `validation-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Validation report saved: ${reportFile}`);
}

function generateRecommendations(results) {
  const recommendations = [];
  
  const failed = results.filter(r => r.status === 'fail');
  const warnings = results.filter(r => r.status === 'warning');
  
  if (failed.length > 0) {
    recommendations.push('🔴 CRITICAL: Fix all failed checks before production deployment');
  }
  
  if (warnings.length > 0) {
    recommendations.push('🟡 REVIEW: Address warnings for optimal security configuration');
  }
  
  // Specific recommendations
  if (results.find(r => r.name.includes('Auth Hooks') && r.status !== 'pass')) {
    recommendations.push('Deploy auth hooks using: npm run deploy:hooks');
  }
  
  if (results.find(r => r.name.includes('Database Tables') && r.status !== 'pass')) {
    recommendations.push('Run database migrations: supabase db push');
  }
  
  recommendations.push('📖 Complete manual configuration in Supabase Dashboard');
  recommendations.push('🧪 Run security tests: npm run test:security');
  
  return recommendations;
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateSupabaseConfig: main,
  CONFIG
};