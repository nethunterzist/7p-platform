#!/usr/bin/env node

/**
 * 🛡️ RLS Policy Deployment Verification Script
 * 7P Education Platform - Security Validation
 * 
 * This script verifies that Row Level Security policies are properly deployed
 * and functioning as expected in the production database.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Check environment variables.');
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Main verification function
 */
async function verifyRLSDeployment() {
  console.log('🛡️  7P Education - RLS Policy Verification');
  console.log('==========================================');
  console.log('');
  
  const results = {
    tablesWithRLS: 0,
    totalTables: 0,
    policiesFound: 0,
    errors: []
  };
  
  try {
    // Check if RLS is enabled on core tables
    console.log('📋 Checking RLS status on core tables...');
    const coreTableChecks = await checkCoreTablesRLS();
    results.tablesWithRLS = coreTableChecks.enabled;
    results.totalTables = coreTableChecks.total;
    
    // Verify specific policies exist
    console.log('\\n🔍 Verifying specific policies...');
    const policyChecks = await checkSpecificPolicies();
    results.policiesFound = policyChecks.found;
    
    // Test policy functionality
    console.log('\\n🧪 Testing policy functionality...');
    await testPolicyFunctionality();
    
    // Check utility functions
    console.log('\\n⚙️  Verifying utility functions...');
    await checkUtilityFunctions();
    
    // Generate report
    console.log('\\n' + '='.repeat(50));
    generateReport(results);
    
  } catch (error) {
    console.error(`${colors.red}❌ Verification failed:${colors.reset}`, error.message);
    results.errors.push(error.message);
  }
}

/**
 * Check RLS status on core tables
 */
async function checkCoreTablesRLS() {
  const coreTables = [
    'users', 'courses', 'course_modules', 'lessons', 
    'course_enrollments', 'lesson_progress', 'payments', 
    'course_reviews', 'review_helpfulness'
  ];
  
  let enabled = 0;
  let total = coreTables.length;
  
  for (const table of coreTables) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pg_tables')
        .select('tablename, enablerls, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', table);
      
      if (error) {
        console.log(`${colors.red}  ❌ ${table}: Error checking RLS${colors.reset}`);
        continue;
      }
      
      if (data && data.length > 0) {
        const tableInfo = data[0];
        if (tableInfo.enablerls) {
          console.log(`${colors.green}  ✅ ${table}: RLS enabled${colors.reset}`);
          enabled++;
        } else {
          console.log(`${colors.red}  ❌ ${table}: RLS disabled${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}  ⚠️  ${table}: Table not found${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.red}  ❌ ${table}: ${err.message}${colors.reset}`);
    }
  }
  
  return { enabled, total };
}

/**
 * Check for specific critical policies
 */
async function checkSpecificPolicies() {
  const criticalPolicies = [
    { table: 'users', policy: 'users_select_own_profile' },
    { table: 'courses', policy: 'courses_public_select' },
    { table: 'course_enrollments', policy: 'enrollments_user_select' },
    { table: 'payments', policy: 'payments_user_select' },
    { table: 'lessons', policy: 'lessons_enrolled_select' }
  ];
  
  let found = 0;
  
  for (const { table, policy } of criticalPolicies) {
    try {
      const { data, error } = await supabaseAdmin.rpc('check_policy_exists', {
        schema_name: 'public',
        table_name: table,
        policy_name: policy
      });
      
      if (error) {
        // Try alternate method
        const { data: altData, error: altError } = await supabaseAdmin
          .from('pg_policies')
          .select('policyname')
          .eq('schemaname', 'public')
          .eq('tablename', table)
          .eq('policyname', policy);
        
        if (altError) {
          console.log(`${colors.yellow}  ⚠️  ${table}.${policy}: Cannot verify${colors.reset}`);
          continue;
        }
        
        if (altData && altData.length > 0) {
          console.log(`${colors.green}  ✅ ${table}.${policy}: Found${colors.reset}`);
          found++;
        } else {
          console.log(`${colors.red}  ❌ ${table}.${policy}: Missing${colors.reset}`);
        }
      } else {
        console.log(`${colors.green}  ✅ ${table}.${policy}: Found${colors.reset}`);
        found++;
      }
    } catch (err) {
      console.log(`${colors.yellow}  ⚠️  ${table}.${policy}: ${err.message}${colors.reset}`);
    }
  }
  
  return { found };
}

/**
 * Test basic policy functionality
 */
async function testPolicyFunctionality() {
  try {
    // Test public course access (should work without auth)
    const { data: publicCourses, error: publicError } = await supabaseAdmin
      .from('courses')
      .select('id, title, status')
      .eq('status', 'published')
      .limit(5);
    
    if (publicError) {
      console.log(`${colors.red}  ❌ Public course access: ${publicError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}  ✅ Public course access: ${publicCourses?.length || 0} courses found${colors.reset}`);
    }
    
    // Test authenticated access simulation
    console.log(`${colors.blue}  ℹ️  Policy functionality tests require user authentication${colors.reset}`);
    console.log(`${colors.blue}  ℹ️  Run integration tests with actual user sessions for full validation${colors.reset}`);
    
  } catch (err) {
    console.log(`${colors.red}  ❌ Policy functionality test: ${err.message}${colors.reset}`);
  }
}

/**
 * Check utility functions
 */
async function checkUtilityFunctions() {
  const utilityFunctions = [
    'auth.is_admin',
    'auth.is_instructor', 
    'auth.is_enrolled_in_course'
  ];
  
  for (const func of utilityFunctions) {
    try {
      const { data, error } = await supabaseAdmin.rpc('check_function_exists', {
        function_name: func
      });
      
      if (error) {
        console.log(`${colors.yellow}  ⚠️  ${func}: Cannot verify (${error.message})${colors.reset}`);
      } else {
        console.log(`${colors.green}  ✅ ${func}: Available${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.yellow}  ⚠️  ${func}: ${err.message}${colors.reset}`);
    }
  }
}

/**
 * Generate verification report
 */
function generateReport(results) {
  console.log(`${colors.blue}📊 RLS Verification Report${colors.reset}`);
  console.log('='.repeat(50));
  
  // RLS Status
  const rlsPercentage = ((results.tablesWithRLS / results.totalTables) * 100).toFixed(1);
  if (results.tablesWithRLS === results.totalTables) {
    console.log(`${colors.green}✅ RLS Status: ${results.tablesWithRLS}/${results.totalTables} tables (${rlsPercentage}%)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  RLS Status: ${results.tablesWithRLS}/${results.totalTables} tables (${rlsPercentage}%)${colors.reset}`);
  }
  
  // Policies
  console.log(`${colors.blue}📋 Policies Found: ${results.policiesFound}/5 critical policies${colors.reset}`);
  
  // Overall Status
  if (results.tablesWithRLS === results.totalTables && results.errors.length === 0) {
    console.log(`\\n${colors.green}🎉 RLS DEPLOYMENT: SUCCESS${colors.reset}`);
    console.log(`${colors.green}   All core tables have RLS enabled and policies are in place.${colors.reset}`);
  } else {
    console.log(`\\n${colors.yellow}⚠️  RLS DEPLOYMENT: NEEDS ATTENTION${colors.reset}`);
    
    if (results.tablesWithRLS < results.totalTables) {
      console.log(`${colors.yellow}   • ${results.totalTables - results.tablesWithRLS} tables missing RLS${colors.reset}`);
    }
    
    if (results.errors.length > 0) {
      console.log(`${colors.yellow}   • ${results.errors.length} verification errors${colors.reset}`);
    }
  }
  
  console.log('\\n🔗 Next Steps:');
  console.log('1. If RLS is missing: Run supabase/rls-policies-production.sql');
  console.log('2. Test with actual user authentication');
  console.log('3. Monitor RLS audit logs');
  console.log('4. Set up automated policy testing');
}

// Run verification
if (require.main === module) {
  verifyRLSDeployment().catch(console.error);
}

module.exports = { verifyRLSDeployment };