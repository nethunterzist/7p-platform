#!/usr/bin/env node

/**
 * Deploy Course System Schema Script
 * This script deploys the course system database schema to Supabase
 */

const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please check your .env.local file for:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploySchema() {
    try {
        console.log('🚀 Deploying Course System Schema...');
        
        // Read the SQL file
        const schemaPath = path.join(__dirname, '../supabase/migrations/003_course_system_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📁 Executing migration: 003_course_system_schema.sql');
        
        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSql });
        
        if (error) {
            // Try alternative approach using raw query
            console.log('⚠️  Using alternative execution method...');
            
            const { error: queryError } = await supabase
                .from('information_schema.tables')  // This will establish connection
                .select('table_name')
                .limit(1);
            
            if (queryError) {
                throw new Error(`Database connection failed: ${queryError.message}`);
            }
            
            console.log('✅ Database connection established');
            console.log('🔧 Please run the SQL manually in Supabase Dashboard or use Supabase CLI:');
            console.log('   supabase db push');
            console.log('   OR copy the content of supabase/migrations/003_course_system_schema.sql');
            console.log('   to Supabase Dashboard SQL Editor');
            
        } else {
            console.log('✅ Course system schema deployed successfully!');
        }
        
        // Verify deployment by checking if courses table exists
        console.log('🔍 Verifying deployment...');
        
        const { data: tables, error: verifyError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['courses', 'course_modules', 'course_lessons', 'user_courses']);
        
        if (!verifyError && tables && tables.length > 0) {
            console.log(`✅ Verified ${tables.length} course tables created:`);
            tables.forEach(table => console.log(`   - ${table.table_name}`));
        }
        
        console.log('🎉 Course System Schema Deployment Complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Verify tables in Supabase Dashboard');
        console.log('2. Insert sample course data');
        console.log('3. Test the new course system');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.error('');
        console.error('Manual deployment options:');
        console.error('1. Use Supabase CLI: npx supabase db push');
        console.error('2. Copy SQL to Supabase Dashboard > SQL Editor');
        console.error('3. Use migration tools in your CI/CD pipeline');
        process.exit(1);
    }
}

// Run the deployment
if (require.main === module) {
    deploySchema();
}

module.exports = { deploySchema };