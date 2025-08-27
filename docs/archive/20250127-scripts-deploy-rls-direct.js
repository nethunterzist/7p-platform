#!/usr/bin/env node

/**
 * 🛡️ Direct RLS Policy Deployment
 * 7P Education Platform - Alternative Deployment Method
 * 
 * This script deploys RLS policies directly via SQL without requiring psql client.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Check environment variables.');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🛡️  7P Education - Direct RLS Deployment');
console.log('=========================================');
console.log('');

/**
 * Check current RLS status
 */
async function checkCurrentRLSStatus() {
  console.log('📋 Checking current RLS status...');
  
  try {
    // First, let's check if we can connect and see what tables exist
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`❌ Cannot connect to users table: ${error.message}`);
      return false;
    } else {
      console.log('✅ Database connection successful');
      return true;
    }
  } catch (err) {
    console.log(`❌ Connection error: ${err.message}`);
    return false;
  }
}

/**
 * Deploy essential RLS policies using Supabase client
 */
async function deployEssentialRLS() {
  console.log('🚀 Deploying essential RLS policies...');
  
  const policies = [
    {
      name: 'Enable RLS on users table',
      sql: 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;'
    },
    {
      name: 'Users can view own profile',
      sql: `
        CREATE POLICY IF NOT EXISTS "users_select_own_profile" ON public.users
        FOR SELECT USING (auth.uid() = id);
      `
    },
    {
      name: 'Enable RLS on courses table', 
      sql: 'ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;'
    },
    {
      name: 'Public can view published courses',
      sql: `
        CREATE POLICY IF NOT EXISTS "courses_public_select" ON public.courses
        FOR SELECT USING (
          status = 'published' 
          AND deleted_at IS NULL
          AND published_at <= NOW()
        );
      `
    },
    {
      name: 'Enable RLS on payments table',
      sql: 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;'
    },
    {
      name: 'Users can view own payments',
      sql: `
        CREATE POLICY IF NOT EXISTS "payments_user_select" ON public.payments
        FOR SELECT USING (user_id = auth.uid());
      `
    }
  ];
  
  let successCount = 0;
  let errors = [];
  
  for (const policy of policies) {
    try {
      console.log(`   Applying: ${policy.name}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        query: policy.sql
      });
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        errors.push({ name: policy.name, error: error.message });
      } else {
        console.log(`   ✅ Success: ${policy.name}`);
        successCount++;
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errors.push({ name: policy.name, error: err.message });
    }
  }
  
  return { successCount, total: policies.length, errors };
}

/**
 * Alternative deployment using manual Supabase Dashboard instructions
 */
function provideDashboardInstructions() {
  console.log('📋 Manual Deployment Instructions');
  console.log('=================================');
  console.log('');
  console.log('Since direct deployment failed, please follow these steps:');
  console.log('');
  console.log('1. 🌐 Open Supabase Dashboard: https://app.supabase.com');
  console.log('2. 📂 Navigate to your project: riupkkggupogdgubnhmy');
  console.log('3. 🔧 Go to SQL Editor');
  console.log('4. 📄 Copy the contents of: supabase/rls-policies-production.sql');
  console.log('5. ▶️  Paste and execute the SQL');
  console.log('6. ✅ Verify no errors occurred');
  console.log('');
  console.log('Essential policies to apply first:');
  console.log('');
  console.log('-- Enable RLS on core tables');
  console.log('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;');
  console.log('ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;'); 
  console.log('ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;');
  console.log('ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('-- Basic user protection');
  console.log('CREATE POLICY "users_own_data" ON public.users');
  console.log('  FOR ALL USING (auth.uid() = id);');
  console.log('');
  console.log('-- Public course access');
  console.log('CREATE POLICY "courses_public" ON public.courses');
  console.log('  FOR SELECT USING (status = \'published\');');
  console.log('');
  console.log('🔗 After deployment, test with: npm run test:security');
}

/**
 * Main function
 */
async function main() {
  // Check connection first
  const connected = await checkCurrentRLSStatus();
  
  if (!connected) {
    console.log('');
    console.log('❌ Cannot establish database connection');
    console.log('   This could be due to:');
    console.log('   • Invalid or expired service role key');
    console.log('   • Network connectivity issues');
    console.log('   • Database credentials changed');
    console.log('');
    provideDashboardInstructions();
    return;
  }
  
  // Try direct deployment
  const result = await deployEssentialRLS();
  
  console.log('');
  console.log('='.repeat(50));
  console.log('📊 Deployment Results');
  console.log('='.repeat(50));
  
  if (result.successCount === result.total) {
    console.log('✅ SUCCESS: All essential RLS policies deployed!');
    console.log(`   ${result.successCount}/${result.total} policies applied`);
    console.log('');
    console.log('🔐 Your database is now protected with:');
    console.log('   • Users can only access their own data');
    console.log('   • Public courses are accessible to everyone'); 
    console.log('   • Payment data is user-restricted');
    console.log('   • Row Level Security is enabled');
    console.log('');
    console.log('Next steps:');
    console.log('1. Deploy full policy set via Supabase Dashboard');
    console.log('2. Test API endpoints with different user roles');
    console.log('3. Monitor for RLS-related errors');
  } else {
    console.log(`⚠️  PARTIAL SUCCESS: ${result.successCount}/${result.total} policies deployed`);
    console.log('');
    
    if (result.errors.length > 0) {
      console.log('❌ Errors encountered:');
      result.errors.forEach(err => {
        console.log(`   • ${err.name}: ${err.error}`);
      });
      console.log('');
    }
    
    provideDashboardInstructions();
  }
}

// Run deployment
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkCurrentRLSStatus, deployEssentialRLS };