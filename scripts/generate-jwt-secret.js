#!/usr/bin/env node

/**
 * JWT Secret Generation Utility
 * Generates cryptographically secure JWT secrets for production use
 */

const crypto = require('crypto');

function generateSecureJWTSecret() {
  // Generate 64 bytes (512 bits) of cryptographically secure random data
  const randomBytes = crypto.randomBytes(64);
  
  // Convert to base64 for easy environment variable storage
  const base64Secret = randomBytes.toString('base64');
  
  return {
    secret: base64Secret,
    length: randomBytes.length,
    bits: randomBytes.length * 8,
    entropy: calculateEntropy(randomBytes)
  };
}

function calculateEntropy(buffer) {
  // Simple entropy calculation (more sophisticated methods exist)
  const frequencies = {};
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    frequencies[byte] = (frequencies[byte] || 0) + 1;
  }
  
  let entropy = 0;
  const length = buffer.length;
  for (const frequency of Object.values(frequencies)) {
    const probability = frequency / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy.toFixed(2);
}

function validateSecretStrength(secret) {
  const issues = [];
  
  // Check minimum length (256 bits = 32 bytes = 44 base64 chars minimum)
  if (secret.length < 44) {
    issues.push(`Secret too short: ${secret.length} chars (minimum 44 for 256-bit security)`);
  }
  
  // Check for common patterns (basic validation)
  if (/^(.)\1+$/.test(secret)) {
    issues.push('Secret contains only repeated characters');
  }
  
  if (/^[a-zA-Z0-9]+$/.test(secret) && secret.length < 64) {
    issues.push('Secret may lack sufficient entropy for its length');
  }
  
  return {
    isStrong: issues.length === 0,
    issues
  };
}

function main() {
  console.log('🔐 JWT Secret Generator - 7P Education Platform\n');
  
  try {
    // Generate new secure secret
    const result = generateSecureJWTSecret();
    
    console.log('✅ Generated cryptographically secure JWT secret:\n');
    console.log(`Secret: ${result.secret}\n`);
    console.log(`Security Details:`);
    console.log(`  - Length: ${result.length} bytes`);
    console.log(`  - Security: ${result.bits} bits`);
    console.log(`  - Entropy: ${result.entropy} bits per byte`);
    
    // Validate the generated secret
    const validation = validateSecretStrength(result.secret);
    if (validation.isStrong) {
      console.log(`  - Strength: ✅ STRONG - Production ready`);
    } else {
      console.log(`  - Strength: ⚠️  Issues found:`);
      validation.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    console.log('\n🔧 Environment Setup Instructions:');
    console.log('1. Add to your .env file:');
    console.log(`   JWT_SECRET="${result.secret}"`);
    console.log('\n2. For Docker deployments:');
    console.log(`   -e JWT_SECRET="${result.secret}"`);
    console.log('\n3. For Kubernetes:');
    console.log('   Create secret: kubectl create secret generic jwt-secret --from-literal=JWT_SECRET="<secret>"');
    
    console.log('\n⚠️  SECURITY WARNINGS:');
    console.log('- Store this secret securely (password manager, key vault)');
    console.log('- Never commit this secret to version control');
    console.log('- Use different secrets for different environments');
    console.log('- Rotate secrets regularly (recommended: every 90 days)');
    console.log('- Monitor for unauthorized secret usage');
    
    console.log('\n🛡️  Additional Security Recommendations:');
    console.log('- Set up secret rotation mechanism');
    console.log('- Implement JWT token revocation');
    console.log('- Monitor authentication anomalies');
    console.log('- Use HTTPS everywhere');
    console.log('- Implement proper session management');
    
  } catch (error) {
    console.error('❌ Error generating JWT secret:', error.message);
    process.exit(1);
  }
}

// Additional utility functions for secret management
function rotateSecret(currentSecret) {
  console.log('\n🔄 JWT Secret Rotation Process:\n');
  
  const newResult = generateSecureJWTSecret();
  
  console.log('1. Generated new secret (keep current secret active)');
  console.log('2. Deploy new secret to environment with grace period');
  console.log('3. Update application to accept both secrets temporarily');
  console.log('4. Gradually migrate all tokens to new secret');
  console.log('5. Remove old secret after migration complete');
  
  return newResult;
}

function auditSecret() {
  const currentSecret = process.env.JWT_SECRET;
  
  if (!currentSecret) {
    console.log('❌ No JWT_SECRET found in environment');
    return false;
  }
  
  const validation = validateSecretStrength(currentSecret);
  
  console.log('\n🔍 JWT Secret Audit Results:\n');
  console.log(`Current secret length: ${currentSecret.length} characters`);
  console.log(`Security strength: ${validation.isStrong ? '✅ STRONG' : '⚠️  WEAK'}`);
  
  if (!validation.isStrong) {
    console.log('Issues found:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('\n⚠️  Recommendation: Generate new secret immediately');
  }
  
  return validation.isStrong;
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  switch (args[0]) {
    case 'rotate':
      rotateSecret();
      break;
    case 'audit':
      auditSecret();
      break;
    case 'help':
      console.log('JWT Secret Management Utility\n');
      console.log('Usage:');
      console.log('  node generate-jwt-secret.js        Generate new secret');
      console.log('  node generate-jwt-secret.js rotate Generate rotation plan');
      console.log('  node generate-jwt-secret.js audit  Audit current secret');
      console.log('  node generate-jwt-secret.js help   Show this help');
      break;
    default:
      main();
      break;
  }
}

module.exports = {
  generateSecureJWTSecret,
  validateSecretStrength,
  rotateSecret,
  auditSecret
};