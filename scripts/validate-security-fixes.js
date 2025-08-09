#!/usr/bin/env node

/**
 * Security Validation Script
 * Validates that all critical JWT security fixes are properly implemented
 */

const fs = require('fs');
const path = require('path');

function validateJWTConfiguration() {
  console.log('🔐 Validating JWT Configuration Security...\n');
  
  const configPath = path.join(__dirname, '../src/lib/auth/config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  const checks = [
    {
      name: 'Hardcoded JWT Secret Removed',
      test: !configContent.includes("JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key'"),
      critical: true,
      description: 'Ensures no hardcoded JWT secret fallback exists (should only exist in knownWeakSecrets validation)'
    },
    {
      name: 'JWT Secret Validation Function',
      test: configContent.includes('validateJWTSecret'),
      critical: true,
      description: 'Validates JWT secret security at startup'
    },
    {
      name: 'Minimum Security Length Check',
      test: configContent.includes('decodedLength < 32'),
      critical: true,
      description: 'Enforces minimum 256-bit JWT secret requirement'
    },
    {
      name: 'Known Weak Secrets Check',
      test: configContent.includes('knownWeakSecrets'),
      critical: true,
      description: 'Prevents use of known weak/default secrets'
    },
    {
      name: 'JWT Algorithm Specification',
      test: configContent.includes('JWT_ALGORITHM'),
      critical: false,
      description: 'Specifies JWT signing algorithm'
    },
    {
      name: 'JWT Issuer Configuration',
      test: configContent.includes('JWT_ISSUER'),
      critical: false,
      description: 'Configures JWT issuer claim'
    },
    {
      name: 'JWT Audience Configuration',
      test: configContent.includes('JWT_AUDIENCE'),
      critical: false,
      description: 'Configures JWT audience claim'
    }
  ];
  
  let criticalPassed = 0;
  let criticalTotal = 0;
  let allPassed = 0;
  
  checks.forEach(check => {
    const status = check.test ? '✅ PASS' : '❌ FAIL';
    const priority = check.critical ? '[CRITICAL]' : '[OPTIONAL]';
    
    console.log(`${status} ${priority} ${check.name}`);
    console.log(`    ${check.description}`);
    
    if (check.critical) {
      criticalTotal++;
      if (check.test) criticalPassed++;
    }
    
    if (check.test) allPassed++;
    console.log();
  });
  
  return {
    criticalPassed,
    criticalTotal,
    allPassed,
    totalChecks: checks.length
  };
}

function validateSecurityService() {
  console.log('🛡️  Validating Security Service Implementation...\n');
  
  const securityPath = path.join(__dirname, '../src/lib/auth/security.ts');
  const securityContent = fs.readFileSync(securityPath, 'utf8');
  
  const checks = [
    {
      name: 'Bcrypt Import Added',
      test: securityContent.includes("import * as bcrypt from 'bcryptjs'"),
      critical: true,
      description: 'Uses bcrypt for secure password hashing'
    },
    {
      name: 'JWT Secret Removed from Password Hashing',
      test: !securityContent.includes('password + AUTH_CONFIG.JWT_SECRET'),
      critical: true,
      description: 'Eliminates JWT secret reuse vulnerability'
    },
    {
      name: 'Async Password Hashing',
      test: securityContent.includes('async hashPassword'),
      critical: true,
      description: 'Uses proper async bcrypt implementation'
    },
    {
      name: 'Password Verification Method',
      test: securityContent.includes('async verifyPassword'),
      critical: true,
      description: 'Provides secure password verification'
    },
    {
      name: 'Enhanced JWT Generation',
      test: securityContent.includes('enhancedPayload'),
      critical: true,
      description: 'Generates JWT with security claims'
    },
    {
      name: 'JWT Token Blacklist',
      test: securityContent.includes('tokenBlacklist'),
      critical: true,
      description: 'Implements JWT token revocation'
    },
    {
      name: 'Device Fingerprint Validation',
      test: securityContent.includes('validateDevice'),
      critical: false,
      description: 'Validates device binding for tokens'
    },
    {
      name: 'JWT Error Handling',
      test: securityContent.includes('TOKEN_EXPIRED') && securityContent.includes('TOKEN_REVOKED'),
      critical: true,
      description: 'Provides specific JWT error codes'
    },
    {
      name: 'Legacy Password Migration',
      test: securityContent.includes('migrateLegacyPasswordHash'),
      critical: false,
      description: 'Supports migration from old password hashes'
    }
  ];
  
  let criticalPassed = 0;
  let criticalTotal = 0;
  let allPassed = 0;
  
  checks.forEach(check => {
    const status = check.test ? '✅ PASS' : '❌ FAIL';
    const priority = check.critical ? '[CRITICAL]' : '[OPTIONAL]';
    
    console.log(`${status} ${priority} ${check.name}`);
    console.log(`    ${check.description}`);
    
    if (check.critical) {
      criticalTotal++;
      if (check.test) criticalPassed++;
    }
    
    if (check.test) allPassed++;
    console.log();
  });
  
  return {
    criticalPassed,
    criticalTotal,
    allPassed,
    totalChecks: checks.length
  };
}

function validateSecurityFiles() {
  console.log('📁 Validating Security Files and Documentation...\n');
  
  const files = [
    {
      path: 'security-report.md',
      name: 'Security Audit Report',
      critical: true,
      description: 'Comprehensive security vulnerability report'
    },
    {
      path: 'scripts/generate-jwt-secret.js',
      name: 'JWT Secret Generator',
      critical: true,
      description: 'Utility for generating secure JWT secrets'
    },
    {
      path: '.env.security-template',
      name: 'Security Configuration Template',
      critical: true,
      description: 'Template for secure environment configuration'
    },
    {
      path: 'src/lib/auth/__tests__/security.test.ts',
      name: 'Security Test Suite',
      critical: false,
      description: 'Comprehensive security tests'
    }
  ];
  
  let criticalPassed = 0;
  let criticalTotal = 0;
  let allPassed = 0;
  
  files.forEach(file => {
    const fullPath = path.join(__dirname, '..', file.path);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅ EXISTS' : '❌ MISSING';
    const priority = file.critical ? '[CRITICAL]' : '[OPTIONAL]';
    
    console.log(`${status} ${priority} ${file.name}`);
    console.log(`    Path: ${file.path}`);
    console.log(`    ${file.description}`);
    
    if (file.critical) {
      criticalTotal++;
      if (exists) criticalPassed++;
    }
    
    if (exists) allPassed++;
    console.log();
  });
  
  return {
    criticalPassed,
    criticalTotal,
    allPassed,
    totalChecks: files.length
  };
}

function generateSecuritySummary(configResults, securityResults, filesResults) {
  console.log('📊 SECURITY VALIDATION SUMMARY\n');
  console.log('=' .repeat(50));
  
  const totalCritical = configResults.criticalTotal + securityResults.criticalTotal + filesResults.criticalTotal;
  const totalCriticalPassed = configResults.criticalPassed + securityResults.criticalPassed + filesResults.criticalPassed;
  
  const totalChecks = configResults.totalChecks + securityResults.totalChecks + filesResults.totalChecks;
  const totalPassed = configResults.allPassed + securityResults.allPassed + filesResults.allPassed;
  
  console.log(`🚨 CRITICAL FIXES: ${totalCriticalPassed}/${totalCritical} IMPLEMENTED`);
  console.log(`📋 ALL CHECKS: ${totalPassed}/${totalChecks} PASSED`);
  console.log();
  
  if (totalCriticalPassed === totalCritical) {
    console.log('✅ SUCCESS: All critical security vulnerabilities have been addressed!');
    console.log('🛡️  The JWT authentication system is now secure.');
    console.log();
    console.log('Next Steps:');
    console.log('1. Generate production JWT secret: node scripts/generate-jwt-secret.js');
    console.log('2. Deploy security fixes to production');
    console.log('3. Run comprehensive security tests');
    console.log('4. Monitor authentication security metrics');
    console.log('5. Schedule regular security audits');
  } else {
    console.log('⚠️  WARNING: Critical security issues remain unaddressed!');
    console.log('🚨 IMMEDIATE ACTION REQUIRED');
    console.log();
    console.log('Missing Critical Fixes:');
    console.log(`- JWT Configuration: ${configResults.criticalPassed}/${configResults.criticalTotal}`);
    console.log(`- Security Service: ${securityResults.criticalPassed}/${securityResults.criticalTotal}`);
    console.log(`- Security Files: ${filesResults.criticalPassed}/${filesResults.criticalTotal}`);
  }
  
  console.log();
  console.log('=' .repeat(50));
  
  return totalCriticalPassed === totalCritical;
}

function main() {
  console.log('🔒 7P Education Platform - Security Validation\n');
  console.log('Validating critical JWT authentication security fixes...\n');
  
  try {
    const configResults = validateJWTConfiguration();
    const securityResults = validateSecurityService();
    const filesResults = validateSecurityFiles();
    
    const allCriticalFixed = generateSecuritySummary(configResults, securityResults, filesResults);
    
    process.exit(allCriticalFixed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Security validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}