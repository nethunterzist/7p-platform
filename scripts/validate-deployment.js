/**
 * 7P Education - Database Deployment Validation Script
 * Validates if database schema matches expected structure
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

class DeploymentValidator {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // Expected tables from migrations
        this.expectedTables = [
            'organizations',
            'users',
            'user_mfa_secrets',
            'user_sessions',
            'login_attempts',
            'audit_logs',
            'password_history',
            'sms_tokens',
            'domain_verifications',
            'sso_configurations',
            'rate_limits',
            'instructors',
            'course_categories',
            'courses',
            'course_modules',
            'course_lessons',
            'user_courses',
            'user_lesson_progress',
            'course_reviews',
            'course_coupons',
            'course_announcements',
            'user_bookmarks'
        ];

        if (this.supabaseUrl && this.supabaseKey) {
            this.client = createClient(this.supabaseUrl, this.supabaseKey);
        }
    }

    async validateEnvironment() {
        console.log('🔧 Validating environment configuration...');
        
        const validation = {
            supabaseUrl: !!this.supabaseUrl,
            anonKey: !!this.supabaseKey,
            serviceKey: !!(this.serviceRoleKey && this.serviceRoleKey !== 'your-service-role-key-from-supabase-dashboard'),
            urlFormat: this.supabaseUrl?.includes('supabase.co'),
            keyFormat: this.supabaseKey?.startsWith('eyJ')
        };

        console.log('Environment Validation:');
        console.log(`  ✅ Supabase URL: ${validation.supabaseUrl ? 'Present' : 'Missing'}`);
        console.log(`  ✅ Anonymous Key: ${validation.anonKey ? 'Present' : 'Missing'}`);
        console.log(`  ${validation.serviceKey ? '✅' : '❌'} Service Role Key: ${validation.serviceKey ? 'Present' : 'Missing/Placeholder'}`);
        console.log(`  ✅ URL Format: ${validation.urlFormat ? 'Valid' : 'Invalid'}`);
        console.log(`  ✅ Key Format: ${validation.keyFormat ? 'Valid' : 'Invalid'}`);

        return validation;
    }

    async validateTables() {
        console.log('\n📋 Validating database tables...');
        
        if (!this.client) {
            console.log('❌ Cannot validate tables - no database client');
            return { existingTables: [], missingTables: this.expectedTables };
        }

        const existingTables = [];
        const missingTables = [];

        for (const tableName of this.expectedTables) {
            try {
                const { count, error } = await this.client
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });

                if (!error) {
                    existingTables.push(tableName);
                    console.log(`  ✅ ${tableName} (${count || 0} records)`);
                } else {
                    missingTables.push(tableName);
                    console.log(`  ❌ ${tableName} - ${error.message}`);
                }
            } catch (e) {
                missingTables.push(tableName);
                console.log(`  ❌ ${tableName} - ${e.message}`);
            }
        }

        return { existingTables, missingTables };
    }

    async validateSampleData() {
        console.log('\n🧪 Validating sample data...');
        
        const sampleDataTables = ['organizations', 'course_categories', 'instructors'];
        const results = [];

        for (const tableName of sampleDataTables) {
            try {
                const { data, error } = await this.client
                    .from(tableName)
                    .select('*')
                    .limit(3);

                if (!error && data && data.length > 0) {
                    console.log(`  ✅ ${tableName} has sample data (${data.length} records)`);
                    results.push({ table: tableName, hasData: true, count: data.length });
                } else {
                    console.log(`  ⚠️ ${tableName} exists but has no sample data`);
                    results.push({ table: tableName, hasData: false, count: 0 });
                }
            } catch (e) {
                console.log(`  ❌ ${tableName} validation failed: ${e.message}`);
                results.push({ table: tableName, hasData: false, error: e.message });
            }
        }

        return results;
    }

    generateDeploymentInstructions(validation, tableValidation) {
        console.log('\n📋 Generating deployment instructions...');

        let instructions = `
# 7P Education - Database Deployment Instructions

## Current Status
- Environment: ${validation.supabaseUrl && validation.anonKey ? '✅ Configured' : '❌ Incomplete'}
- Service Role Key: ${validation.serviceKey ? '✅ Available' : '❌ Required'}
- Database Tables: ${tableValidation.existingTables.length}/${this.expectedTables.length} present
- Missing Tables: ${tableValidation.missingTables.length}

## Required Actions

### 1. Configure Service Role Key (CRITICAL)
${!validation.serviceKey ? `
⚠️ **Service Role Key is missing or using placeholder value**

**Steps to get Service Role Key:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: riupkkggupogdgubnhmy
3. Go to Settings → API
4. Copy the "service_role" key (starts with "eyJ...")
5. Update .env.local file:

\`\`\`
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
\`\`\`
` : '✅ Service Role Key is properly configured'}

### 2. Deploy Database Schema
${tableValidation.missingTables.length > 0 ? `
⚠️ **${tableValidation.missingTables.length} tables are missing from database**

**Option A: Automated Deployment (Recommended)**
\`\`\`bash
# Deploy auth schema
node scripts/deploy-auth-schema.js

# Deploy course schema  
node scripts/deploy-course-schema.js
\`\`\`

**Option B: Manual Deployment**
If automated deployment fails:
\`\`\`bash
# Get SQL for manual deployment
node scripts/deploy-auth-schema.js --manual
node scripts/deploy-course-schema.js --manual
\`\`\`

Copy the SQL output and run it in Supabase SQL Editor.
` : '✅ All expected tables are present'}

### 3. Verification
After deployment, run validation:
\`\`\`bash
node scripts/validate-deployment.js
\`\`\`

### 4. Test Application
1. Start development server: \`npm run dev\`
2. Test user registration/login
3. Verify course data display
4. Check database connections

## Missing Tables
${tableValidation.missingTables.length > 0 ? 
    tableValidation.missingTables.map(t => `- ${t}`).join('\n') :
    'None - all tables present'
}

## Troubleshooting

### Connection Issues
- Verify Supabase project is active
- Check environment variables are correct
- Ensure no firewall blocking Supabase

### Permission Issues  
- Verify service role key has admin permissions
- Check RLS policies allow expected operations
- Review Supabase project settings

### Schema Issues
- Run migrations in correct order
- Check for SQL syntax errors in migrations
- Verify foreign key dependencies
`;

        const instructionsPath = path.join(__dirname, '../DATABASE_DEPLOYMENT_INSTRUCTIONS.md');
        fs.writeFileSync(instructionsPath, instructions);
        console.log(`📄 Instructions saved: ${instructionsPath}`);

        return instructionsPath;
    }

    async run() {
        console.log('🚀 7P Education Database Deployment Validation\n');

        try {
            // Validate environment
            const envValidation = await this.validateEnvironment();
            
            // Validate tables
            const tableValidation = await this.validateTables();
            
            // Validate sample data
            const sampleDataValidation = await this.validateSampleData();
            
            // Generate instructions
            const instructionsPath = this.generateDeploymentInstructions(envValidation, tableValidation);
            
            // Summary
            console.log('\n📊 Validation Summary:');
            console.log(`Environment: ${envValidation.supabaseUrl && envValidation.anonKey ? '✅' : '❌'} Configured`);
            console.log(`Service Key: ${envValidation.serviceKey ? '✅' : '❌'} Available`);
            console.log(`Tables: ${tableValidation.existingTables.length}/${this.expectedTables.length} present`);
            console.log(`Instructions: ${instructionsPath}`);

            if (tableValidation.missingTables.length === 0 && envValidation.serviceKey) {
                console.log('\n🎉 Database is properly deployed and configured!');
            } else {
                console.log('\n⚠️ Database requires deployment or configuration updates');
                console.log('📋 Follow the generated instructions to complete setup');
            }

            return {
                environment: envValidation,
                tables: tableValidation,
                sampleData: sampleDataValidation,
                instructions: instructionsPath
            };

        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            throw error;
        }
    }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const validator = new DeploymentValidator();
    validator.run().catch(console.error);
}

export default DeploymentValidator;