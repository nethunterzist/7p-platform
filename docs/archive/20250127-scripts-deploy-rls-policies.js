#!/usr/bin/env node

/**
 * 🛡️ RLS Policy Deployment Script
 * 7P Education Platform - Security Implementation
 * 
 * This script deploys Row Level Security policies to the production database.
 * Run this after updating database credentials and verifying connection.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL environment variable');
  console.error('   Update .env.local with the new secure database connection string');
  process.exit(1);
}

console.log('🛡️  7P Education - RLS Policy Deployment');
console.log('==========================================');
console.log('');

/**
 * Deploy RLS policies to database
 */
async function deployRLSPolicies() {
  const sqlFilePath = path.join(__dirname, '..', 'supabase', 'rls-policies-production.sql');
  
  // Check if SQL file exists
  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ RLS policies file not found:', sqlFilePath);
    process.exit(1);
  }
  
  console.log('📋 Found RLS policies file:', sqlFilePath);
  console.log('🔗 Connecting to database...');
  
  // Execute the SQL file
  const command = `psql "${DB_URL}" -f "${sqlFilePath}"`;
  
  console.log('🚀 Deploying RLS policies...');
  console.log('   This may take a few minutes...');
  console.log('');
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Deployment failed:', error.message);
        console.error('');
        console.error('Common issues:');
        console.error('1. Database credentials are incorrect');
        console.error('2. Network access to database is blocked');
        console.error('3. PostgreSQL client (psql) not installed');
        console.error('4. Service role permissions insufficient');
        console.error('');
        console.error('Solutions:');
        console.error('• Run: ./scripts/generate-secure-credentials.sh');
        console.error('• Update database password in Supabase Dashboard');
        console.error('• Install PostgreSQL: https://www.postgresql.org/download/');
        console.error('• Grant necessary permissions to service role');
        reject(error);
        return;
      }
      
      if (stderr) {
        console.log('⚠️  Warnings during deployment:');
        console.log(stderr);
        console.log('');
      }
      
      console.log('✅ RLS policies deployed successfully!');
      console.log('');
      console.log('Deployment output:');
      console.log(stdout);
      
      resolve();
    });
  });
}

/**
 * Verify deployment
 */
async function verifyDeployment() {
  console.log('🧪 Verifying deployment...');
  
  const verifyCommand = `psql "${DB_URL}" -c "SELECT schemaname, tablename, enablerls FROM pg_tables WHERE schemaname = 'public' AND enablerls = true;"`;
  
  return new Promise((resolve, reject) => {
    exec(verifyCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Cannot verify deployment automatically');
        console.log('   Manual verification required');
        resolve(false);
        return;
      }
      
      console.log('📊 Tables with RLS enabled:');
      console.log(stdout);
      
      // Count enabled tables
      const lines = stdout.split('\\n').filter(line => line.trim() && !line.includes('---') && !line.includes('schemaname'));
      const enabledCount = lines.length - 1; // Subtract header
      
      if (enabledCount >= 8) { // Expect at least 8 core tables
        console.log(`✅ Verification successful: ${enabledCount} tables have RLS enabled`);
        resolve(true);
      } else {
        console.log(`⚠️  Verification incomplete: Only ${enabledCount} tables have RLS enabled`);
        console.log('   Expected at least 8 core tables');
        resolve(false);
      }
    });
  });
}

/**
 * Main deployment function
 */
async function main() {
  try {
    // Deploy policies
    await deployRLSPolicies();
    
    // Verify deployment
    const verified = await verifyDeployment();
    
    console.log('');
    console.log('='.repeat(50));
    
    if (verified) {
      console.log('🎉 RLS DEPLOYMENT COMPLETE!');
      console.log('');
      console.log('✅ All Row Level Security policies have been deployed');
      console.log('✅ Database tables are properly protected');
      console.log('✅ User data access is now restricted by role');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test authentication flows in application');
      console.log('2. Verify API endpoints respect user permissions');
      console.log('3. Monitor application for RLS-related errors');
      console.log('4. Run integration tests with different user roles');
    } else {
      console.log('⚠️  RLS DEPLOYMENT NEEDS ATTENTION');
      console.log('');
      console.log('Some policies may not have deployed correctly.');
      console.log('Manual verification and debugging required.');
      console.log('');
      console.log('Troubleshooting steps:');
      console.log('1. Check database connection and credentials');
      console.log('2. Verify service role has sufficient permissions');
      console.log('3. Review error messages above');
      console.log('4. Manually run SQL commands from rls-policies-production.sql');
    }
    
  } catch (error) {
    console.error('💥 Deployment failed with error:', error.message);
    console.error('');
    console.error('Emergency manual deployment:');
    console.error('1. Open Supabase Dashboard → SQL Editor');
    console.error('2. Copy contents of supabase/rls-policies-production.sql');
    console.error('3. Execute the SQL manually');
    console.error('4. Verify tables have RLS enabled');
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployRLSPolicies, verifyDeployment };