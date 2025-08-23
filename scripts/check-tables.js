#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const REQUIRED_TABLES = [
  'users',
  'courses', 
  'course_modules',
  'lessons',
  'course_enrollments',
  'lesson_progress',
  'payments',
  'course_reviews',
  'review_helpfulness'
];

async function checkTables() {
  // Fallback to Supabase client if pg fails
  if (!process.env.SUPABASE_DB_URL) {
    console.log('⚠️  No SUPABASE_DB_URL, using Supabase client...');
    return checkTablesWithSupabase();
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 DATABASE TABLE CHECK');
    console.log('==================================================');
    console.log();

    await client.connect();
    console.log('✅ Connected to database');
    console.log();

    console.log('📋 Checking tables...');
    
    let foundCount = 0;
    const results = [];

    for (const table of REQUIRED_TABLES) {
      try {
        const query = `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `;
        
        const result = await client.query(query, [table]);
        const exists = result.rows[0].exists;
        
        if (exists) {
          console.log(`✅ ${table} - OK`);
          results.push({ table, status: 'OK' });
          foundCount++;
        } else {
          console.log(`❌ ${table} - MISSING`);
          results.push({ table, status: 'MISSING' });
        }
      } catch (err) {
        console.log(`❌ ${table} - ERROR: ${err.message}`);
        results.push({ table, status: 'ERROR', error: err.message });
      }
    }

    console.log();
    console.log('📊 RESULTS:');
    console.log(`✅ Found tables: ${foundCount}/${REQUIRED_TABLES.length}`);
    console.log(`❌ Missing tables: ${REQUIRED_TABLES.length - foundCount}/${REQUIRED_TABLES.length}`);
    console.log();

    if (foundCount === REQUIRED_TABLES.length) {
      console.log('🎉 ALL TABLES FOUND! Database is ready.');
      console.log('✅ Migration was successful');
      process.exit(0);
    } else {
      console.log('❌ MISSING TABLES DETECTED');
      console.log('Next steps:');
      console.log('1. Run: npm run db:migrate');
      console.log('2. Check migration files in supabase/migrations/');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 CONNECTION ERROR:', error.message);
    console.error('Falling back to Supabase client...');
    await client.end().catch(() => {});
    return checkTablesWithSupabase();
  } finally {
    if (client._connected) {
      await client.end();
    }
  }
}

// Fallback using Supabase client
async function checkTablesWithSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  
  console.log('🔍 DATABASE TABLE CHECK (Supabase Client)');
  console.log('==================================================');
  console.log();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log('✅ Connected via Supabase client');
  console.log();
  console.log('📋 Checking tables...');
  
  let foundCount = 0;
  
  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`❌ ${table} - MISSING`);
      } else {
        console.log(`✅ ${table} - OK`);
        foundCount++;
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err.message}`);
    }
  }

  console.log();
  console.log('📊 RESULTS:');
  console.log(`✅ Found tables: ${foundCount}/${REQUIRED_TABLES.length}`);
  console.log(`❌ Missing tables: ${REQUIRED_TABLES.length - foundCount}/${REQUIRED_TABLES.length}`);
  
  if (foundCount === REQUIRED_TABLES.length) {
    console.log('🎉 ALL TABLES FOUND! Database is ready.');
    process.exit(0);
  } else {
    console.log('❌ MISSING TABLES DETECTED');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkTables().catch(err => {
    console.error('⚠️  Primary check failed, trying Supabase client...');
    checkTablesWithSupabase().catch(console.error);
  });
}

module.exports = { checkTables, checkTablesWithSupabase };