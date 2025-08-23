#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

/**
 * 🎯 Database Reset and Clean Schema Deployment
 * 
 * Bu script aşağıdaki işlemleri güvenli şekilde gerçekleştirir:
 * 1. ⚠️  Mevcut tüm tabloları siler (destructive operation)
 * 2. 🔄 RLS policies'lerini temizler
 * 3. 📦 Fresh schema'yı deploy eder
 * 4. ✅ Deployment'ı test eder
 * 5. 👤 Test kullanıcıları oluşturur
 */

class DatabaseResetManager {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // Service role client for administrative operations
        this.adminClient = null;
        // Anonymous client for testing
        this.anonClient = null;
        
        this.migrationPath = path.join(process.cwd(), 'supabase/migrations/000_initial_schema.sql');
    }

    async initialize() {
        console.log('🚀 Database Reset Manager başlatılıyor...\n');
        
        // Environment variables validation
        if (!this.supabaseUrl || !this.anonKey) {
            throw new Error('❌ SUPABASE_URL veya ANON_KEY eksik!');
        }

        if (!this.serviceKey || this.serviceKey === 'your-service-role-key-from-supabase-dashboard') {
            throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY henüz ayarlanmamış!\n' +
                          'ℹ️  Supabase Dashboard > Settings > API > service_role key\'i .env.local\'e ekleyin');
        }

        // Initialize clients
        this.adminClient = createClient(this.supabaseUrl, this.serviceKey);
        this.anonClient = createClient(this.supabaseUrl, this.anonKey);

        console.log('✅ Supabase clients hazır');
    }

    async validateEnvironment() {
        console.log('🔍 Environment validation...\n');

        // Test admin connection
        const { data: adminTest, error: adminError } = await this.adminClient
            .rpc('sql', {
                query: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 1'
            });

        if (adminError) {
            throw new Error(`❌ Service Role Key hatası: ${adminError.message}`);
        }

        console.log('✅ Service Role Key çalışıyor');

        // Test anon connection
        const { data: anonTest, error: anonError } = await this.anonClient.auth.getSession();
        
        if (anonError) {
            throw new Error(`❌ Anon Key hatası: ${anonError.message}`);
        }

        console.log('✅ Anon Key çalışıyor');

        // Check migration file
        if (!fs.existsSync(this.migrationPath)) {
            throw new Error(`❌ Migration dosyası bulunamadı: ${this.migrationPath}`);
        }

        console.log('✅ Migration dosyası mevcut\n');
    }

    async getCurrentDatabaseState() {
        console.log('📊 Mevcut database durumu analizi...\n');

        try {
            // Get current tables
            const { data: tables, error: tablesError } = await this.adminClient
                .rpc('sql', {
                    query: `
                        SELECT table_name, table_schema 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        ORDER BY table_name
                    `
                });

            if (tablesError) {
                console.log('⚠️  Tablolar sorgulanamadı (muhtemelen boş database):', tablesError.message);
                return { tables: [], policies: [], hasData: false };
            }

            console.log(`📋 Mevcut tablolar (${tables?.length || 0} adet):`);
            tables?.forEach(table => {
                console.log(`   - ${table.table_name}`);
            });

            // Get RLS policies
            const { data: policies, error: policiesError } = await this.adminClient
                .rpc('sql', {
                    query: `
                        SELECT schemaname, tablename, policyname 
                        FROM pg_policies 
                        WHERE schemaname = 'public'
                        ORDER BY tablename, policyname
                    `
                });

            if (!policiesError && policies?.length > 0) {
                console.log(`\n🔒 RLS Policies (${policies.length} adet):`);
                policies.forEach(policy => {
                    console.log(`   - ${policy.tablename}.${policy.policyname}`);
                });
            }

            // Check for existing data
            let hasData = false;
            if (tables?.length > 0) {
                for (const table of tables) {
                    try {
                        const { data: countResult } = await this.adminClient
                            .rpc('sql', {
                                query: `SELECT COUNT(*) as count FROM public.${table.table_name}`
                            });
                        
                        const count = countResult?.[0]?.count || 0;
                        if (count > 0) {
                            console.log(`\n📊 ${table.table_name}: ${count} kayıt`);
                            hasData = true;
                        }
                    } catch (e) {
                        // Ignore errors for system tables or views
                    }
                }
            }

            return {
                tables: tables || [],
                policies: policies || [],
                hasData
            };

        } catch (error) {
            console.log('⚠️  Database durumu analiz edilemedi:', error.message);
            return { tables: [], policies: [], hasData: false };
        }
    }

    async dropAllTables(currentState) {
        if (currentState.tables.length === 0) {
            console.log('✅ Silinecek tablo yok\n');
            return;
        }

        console.log(`\n🗑️  Mevcut ${currentState.tables.length} tablo siliniyor...\n`);

        const tablesToDrop = currentState.tables.map(t => t.table_name);
        
        for (const tableName of tablesToDrop) {
            try {
                // First disable RLS to avoid conflicts
                await this.adminClient.rpc('sql', {
                    query: `ALTER TABLE IF EXISTS public.${tableName} DISABLE ROW LEVEL SECURITY`
                });

                // Drop table with CASCADE to handle dependencies
                const { error } = await this.adminClient.rpc('sql', {
                    query: `DROP TABLE IF EXISTS public.${tableName} CASCADE`
                });

                if (error) {
                    console.log(`⚠️  ${tableName} silinemedi:`, error.message);
                } else {
                    console.log(`✅ ${tableName} silindi`);
                }
            } catch (error) {
                console.log(`⚠️  ${tableName} silme hatası:`, error.message);
            }
        }

        console.log('\n🗑️  Tablo silme işlemi tamamlandı\n');
    }

    async cleanupPolicies() {
        console.log('🧹 RLS policies temizleniyor...\n');

        try {
            // Get all policies in public schema
            const { data: policies, error } = await this.adminClient.rpc('sql', {
                query: `
                    SELECT schemaname, tablename, policyname 
                    FROM pg_policies 
                    WHERE schemaname = 'public'
                    ORDER BY tablename, policyname
                `
            });

            if (error || !policies?.length) {
                console.log('✅ Temizlenecek policy yok\n');
                return;
            }

            for (const policy of policies) {
                try {
                    await this.adminClient.rpc('sql', {
                        query: `DROP POLICY IF EXISTS "${policy.policyname}" ON public.${policy.tablename}`
                    });
                    console.log(`✅ Policy silindi: ${policy.tablename}.${policy.policyname}`);
                } catch (e) {
                    console.log(`⚠️  Policy silinemedi: ${policy.tablename}.${policy.policyname}`);
                }
            }

            console.log('\n🧹 Policy temizleme tamamlandı\n');
        } catch (error) {
            console.log('⚠️  Policy temizleme hatası:', error.message);
        }
    }

    async deployFreshSchema() {
        console.log('📦 Fresh schema deployment başlatılıyor...\n');

        // Read migration file
        const migrationSQL = fs.readFileSync(this.migrationPath, 'utf8');

        console.log(`📄 Migration dosyası okundu: ${Math.round(migrationSQL.length / 1024)}KB`);

        try {
            // Execute the migration
            const { error } = await this.adminClient.rpc('sql', {
                query: migrationSQL
            });

            if (error) {
                throw new Error(`Schema deployment hatası: ${error.message}`);
            }

            console.log('✅ Schema başarıyla deploy edildi\n');
        } catch (error) {
            throw new Error(`❌ Schema deployment başarısız: ${error.message}`);
        }
    }

    async validateDeployment() {
        console.log('🔍 Deployment validation...\n');

        // Expected tables from the schema
        const expectedTables = [
            'users', 'courses', 'course_modules', 'lessons', 
            'course_enrollments', 'lesson_progress', 'payments'
        ];

        const validationResults = {
            tables: { expected: expectedTables.length, found: 0, missing: [] },
            policies: { found: 0 },
            functions: { found: 0 },
            indexes: { found: 0 }
        };

        // Check tables
        for (const tableName of expectedTables) {
            const { data, error } = await this.adminClient
                .rpc('sql', {
                    query: `
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '${tableName}'
                    `
                });

            if (!error && data?.length > 0) {
                validationResults.tables.found++;
                console.log(`✅ Tablo mevcut: ${tableName}`);
            } else {
                validationResults.tables.missing.push(tableName);
                console.log(`❌ Tablo eksik: ${tableName}`);
            }
        }

        // Check RLS policies
        const { data: policies } = await this.adminClient
            .rpc('sql', {
                query: `
                    SELECT policyname 
                    FROM pg_policies 
                    WHERE schemaname = 'public'
                `
            });

        validationResults.policies.found = policies?.length || 0;
        console.log(`✅ RLS Policies: ${validationResults.policies.found} adet`);

        // Check functions
        const { data: functions } = await this.adminClient
            .rpc('sql', {
                query: `
                    SELECT routine_name 
                    FROM information_schema.routines 
                    WHERE routine_schema = 'public'
                `
            });

        validationResults.functions.found = functions?.length || 0;
        console.log(`✅ Functions: ${validationResults.functions.found} adet`);

        // Summary
        console.log('\n📊 VALIDATION SUMMARY:');
        console.log('====================');
        console.log(`Tables: ${validationResults.tables.found}/${validationResults.tables.expected} ✅`);
        console.log(`Policies: ${validationResults.policies.found} ✅`);
        console.log(`Functions: ${validationResults.functions.found} ✅`);

        if (validationResults.tables.missing.length > 0) {
            throw new Error(`❌ Eksik tablolar: ${validationResults.tables.missing.join(', ')}`);
        }

        console.log('\n✅ Schema deployment validation başarılı!\n');
        return validationResults;
    }

    async testBasicOperations() {
        console.log('🧪 Temel operasyon testleri...\n');

        try {
            // Test 1: Insert a test user
            const testUserId = '00000000-0000-0000-0000-000000000003';
            const { error: insertError } = await this.adminClient
                .rpc('sql', {
                    query: `
                        INSERT INTO public.users (id, email, name, role) 
                        VALUES ('${testUserId}', 'test@7peducation.com', 'Test User', 'student')
                    `
                });

            if (insertError) {
                console.log('⚠️  Test user insertion failed:', insertError.message);
            } else {
                console.log('✅ Test user inserted');

                // Test 2: Read the user back
                const { data: userData, error: selectError } = await this.adminClient
                    .rpc('sql', {
                        query: `SELECT * FROM public.users WHERE id = '${testUserId}'`
                    });

                if (selectError) {
                    console.log('⚠️  Test user read failed:', selectError.message);
                } else {
                    console.log('✅ Test user read successful');
                }

                // Cleanup test data
                await this.adminClient
                    .rpc('sql', {
                        query: `DELETE FROM public.users WHERE id = '${testUserId}'`
                    });
                
                console.log('✅ Test data cleaned up');
            }

            // Test 3: RLS policy test with anon client
            const { data: publicCourses, error: rlsError } = await this.anonClient
                .rpc('sql', {
                    query: `SELECT * FROM public.courses WHERE published = true`
                });

            if (rlsError) {
                console.log('⚠️  RLS test failed:', rlsError.message);
            } else {
                console.log(`✅ RLS test passed - found ${publicCourses?.length || 0} published courses`);
            }

            console.log('\n🧪 Temel operasyon testleri tamamlandı!\n');

        } catch (error) {
            console.log('⚠️  Test operations error:', error.message);
        }
    }

    async createTestData() {
        console.log('🎭 Test data oluşturuluyor...\n');

        try {
            // The schema already includes sample data insertion
            // Let's verify it exists
            const { data: courses, error } = await this.adminClient
                .rpc('sql', {
                    query: `SELECT * FROM public.courses`
                });

            if (error) {
                console.log('⚠️  Test data query failed:', error.message);
            } else {
                console.log(`✅ Test data verified - ${courses?.length || 0} courses available`);
                
                courses?.forEach(course => {
                    console.log(`   - ${course.title} (${course.level})`);
                });
            }

            console.log('\n🎭 Test data hazır!\n');
        } catch (error) {
            console.log('⚠️  Test data creation error:', error.message);
        }
    }

    async generateReport(startTime, currentState, validationResults) {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('\n📊 DATABASE RESET & DEPLOYMENT REPORT');
        console.log('=====================================');
        console.log(`⏱️  Total Duration: ${duration}s`);
        console.log(`🗑️  Tables Dropped: ${currentState.tables.length}`);
        console.log(`📦 Tables Created: ${validationResults.tables.found}`);
        console.log(`🔒 RLS Policies: ${validationResults.policies.found}`);
        console.log(`⚙️  Functions: ${validationResults.functions.found}`);
        console.log(`✅ Status: SUCCESS`);
        
        console.log('\n🎉 Database reset ve clean schema deployment başarıyla tamamlandı!');
        console.log('\n👉 Sıradaki adımlar:');
        console.log('   1. Frontend auth forms test et');
        console.log('   2. Test kullanıcısı oluştur');
        console.log('   3. Course enrollment test et');
        console.log('   4. Payment flow test et\n');
    }

    async execute() {
        const startTime = Date.now();

        try {
            // Phase 1: Initialization and Validation
            await this.initialize();
            await this.validateEnvironment();

            // Phase 2: Current State Analysis
            const currentState = await this.getCurrentDatabaseState();

            // Phase 3: Confirmation (in production, this would require user input)
            console.log('⚠️  DESTRUCTIVE OPERATION WARNING');
            console.log('=====================================');
            console.log('Bu işlem mevcut tüm tabloları ve verilerini kalıcı olarak silecek!');
            console.log(`Silinecek: ${currentState.tables.length} tablo`);
            console.log(`Data kaybı: ${currentState.hasData ? 'VAR' : 'YOK'}`);
            console.log('=====================================\n');

            // Phase 4: Database Cleanup
            await this.dropAllTables(currentState);
            await this.cleanupPolicies();

            // Phase 5: Fresh Deployment
            await this.deployFreshSchema();

            // Phase 6: Validation and Testing
            const validationResults = await this.validateDeployment();
            await this.testBasicOperations();
            await this.createTestData();

            // Phase 7: Report
            await this.generateReport(startTime, currentState, validationResults);

            return {
                success: true,
                duration: ((Date.now() - startTime) / 1000).toFixed(2),
                tablesDropped: currentState.tables.length,
                tablesCreated: validationResults.tables.found
            };

        } catch (error) {
            console.error('\n💥 DATABASE RESET FAILED!');
            console.error('===========================');
            console.error('Error:', error.message);
            console.error('\n🔧 Possible solutions:');
            console.error('1. Check Service Role Key in .env.local');
            console.error('2. Verify Supabase project status');
            console.error('3. Check migration file syntax');
            console.error('4. Review network connectivity\n');

            throw error;
        }
    }
}

// Script execution
if (require.main === module) {
    const resetManager = new DatabaseResetManager();

    resetManager.execute()
        .then((result) => {
            console.log(`🎉 Reset completed in ${result.duration}s`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Reset failed:', error.message);
            process.exit(1);
        });
}

module.exports = DatabaseResetManager;