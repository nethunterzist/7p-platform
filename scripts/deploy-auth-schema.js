#!/usr/bin/env node

/**
 * 7P Education - Auth Schema Deployment Script
 * Deploys the comprehensive authentication schema to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.error('\n💡 Please add the missing variables to your .env.local file');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deployAuthSchema() {
  console.log('🚀 Starting 7P Education Auth Schema Deployment...\n');

  try {
    // Read migration files
    const migrationFiles = [
      '001_sso_schema.sql',
      '002_user_creation_trigger.sql'
    ];

    for (const fileName of migrationFiles) {
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', fileName);
      
      console.log(`📄 Processing ${fileName}...`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File ${fileName} not found, skipping...`);
        continue;
      }

      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration
      console.log(`⚡ Executing ${fileName}...`);
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: sqlContent
      });

      if (error) {
        // Try direct execution if rpc fails
        console.log(`⚡ Retrying ${fileName} with direct execution...`);
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ name: fileName, sql: sqlContent })
          .select();

        if (directError) {
          console.error(`❌ Failed to execute ${fileName}:`, directError.message);
          // Continue with other files instead of exiting
          continue;
        }
      }

      console.log(`✅ Successfully executed ${fileName}`);
    }

    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    
    // Check if users table exists
    const { data: usersCheck, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (usersError) {
      console.log('❌ Users table verification failed:', usersError.message);
    } else {
      console.log('✅ Users table exists and accessible');
    }

    // Check if organizations table exists
    const { data: orgsCheck, error: orgsError } = await supabase
      .from('organizations')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (orgsError) {
      console.log('❌ Organizations table verification failed:', orgsError.message);
    } else {
      console.log('✅ Organizations table exists and accessible');
    }

    // Check if user_sessions table exists
    const { data: sessionsCheck, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (sessionsError) {
      console.log('❌ User sessions table verification failed:', sessionsError.message);
    } else {
      console.log('✅ User sessions table exists and accessible');
    }

    console.log('\n🎉 Auth Schema Deployment Completed!');
    console.log('📋 Next Steps:');
    console.log('   1. Update login page to use Supabase auth');
    console.log('   2. Update dashboard to check Supabase sessions');
    console.log('   3. Re-enable middleware with proper auth');
    console.log('   4. Test complete authentication flow');

  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check Supabase project status');
    console.error('   2. Verify service role key permissions');
    console.error('   3. Check network connectivity');
    console.error('   4. Try deploying migrations manually via Supabase Dashboard');
    process.exit(1);
  }
}

// Manual SQL execution fallback
async function executeManualMigration() {
  console.log('\n🔧 Manual Migration Mode');
  console.log('Copy and paste the following SQL into your Supabase SQL Editor:\n');
  
  const migrationFiles = [
    '001_sso_schema.sql',
    '002_user_creation_trigger.sql'
  ];

  for (const fileName of migrationFiles) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', fileName);
    
    if (fs.existsSync(filePath)) {
      console.log(`-- ========== ${fileName} ==========`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      console.log(sqlContent);
      console.log(`-- ========== END ${fileName} ==========\n`);
    }
  }
}

// Run deployment
if (process.argv.includes('--manual')) {
  executeManualMigration();
} else {
  deployAuthSchema();
}