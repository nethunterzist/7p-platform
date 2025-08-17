#!/usr/bin/env node

/**
 * 7P Education - Quick Integrity Check
 * 
 * A lightweight script for rapid data integrity validation.
 * Perfect for CI/CD pipelines and daily health checks.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function quickIntegrityCheck() {
    console.log('⚡ 7P Education - Quick Integrity Check');
    console.log('=' + '='.repeat(45));
    console.log('Timestamp:', new Date().toISOString());
    
    let issues = 0;
    let checks = 0;
    
    try {
        // 1. Check basic table accessibility
        console.log('\n📋 Basic Table Access:');
        const tables = ['courses', 'course_categories', 'instructors', 'course_modules', 'course_lessons'];
        
        for (const table of tables) {
            checks++;
            const { data, error } = await supabase.from(table).select('id').limit(1);
            if (error) {
                console.log(`   ❌ ${table}: Access error`);
                issues++;
            } else {
                console.log(`   ✅ ${table}: Accessible`);
            }
        }
        
        // 2. Quick referential integrity check
        console.log('\n🔗 Key Relationships:');
        
        // Check courses have valid categories
        checks++;
        const { data: coursesWithCategories } = await supabase
            .from('courses')
            .select('id, title, category_id')
            .not('category_id', 'is', null);
        
        if (coursesWithCategories) {
            const { data: categories } = await supabase
                .from('course_categories')
                .select('id');
            
            const categoryIds = new Set(categories?.map(c => c.id) || []);
            const orphanedCourses = coursesWithCategories.filter(c => !categoryIds.has(c.category_id));
            
            if (orphanedCourses.length > 0) {
                console.log(`   ❌ Courses with invalid categories: ${orphanedCourses.length}`);
                issues++;
            } else {
                console.log(`   ✅ Course-Category relationships: Valid`);
            }
        }
        
        // Check modules belong to courses
        checks++;
        const { data: modules } = await supabase
            .from('course_modules')
            .select('id, title, course_id');
        
        if (modules && modules.length > 0) {
            const { data: courses } = await supabase
                .from('courses')
                .select('id');
            
            const courseIds = new Set(courses?.map(c => c.id) || []);
            const orphanedModules = modules.filter(m => !courseIds.has(m.course_id));
            
            if (orphanedModules.length > 0) {
                console.log(`   ❌ Orphaned modules: ${orphanedModules.length}`);
                issues++;
            } else {
                console.log(`   ✅ Module-Course relationships: Valid`);
            }
        } else {
            console.log(`   ✅ Module-Course relationships: No data to check`);
        }
        
        // 3. Quick constraint validation
        console.log('\n📊 Data Constraints:');
        
        // Check course prices are non-negative
        checks++;
        const { data: coursePrices } = await supabase
            .from('courses')
            .select('id, title, price')
            .lt('price', 0);
        
        if (coursePrices && coursePrices.length > 0) {
            console.log(`   ❌ Courses with negative prices: ${coursePrices.length}`);
            issues++;
        } else {
            console.log(`   ✅ Course prices: All valid`);
        }
        
        // Check course ratings are in valid range
        checks++;
        const { data: invalidRatings } = await supabase
            .from('courses')
            .select('id, title, rating')
            .or('rating.lt.0,rating.gt.5')
            .not('rating', 'is', null);
        
        if (invalidRatings && invalidRatings.length > 0) {
            console.log(`   ❌ Courses with invalid ratings: ${invalidRatings.length}`);
            issues++;
        } else {
            console.log(`   ✅ Course ratings: All valid`);
        }
        
        // 4. Basic timestamp check
        console.log('\n⏰ Timestamp Validation:');
        
        checks++;
        const { data: timestampIssues } = await supabase
            .from('courses')
            .select('id, title, created_at, published_at')
            .not('published_at', 'is', null);
        
        if (timestampIssues) {
            const inconsistent = timestampIssues.filter(course => 
                new Date(course.published_at) < new Date(course.created_at)
            );
            
            if (inconsistent.length > 0) {
                console.log(`   ❌ Courses with timestamp issues: ${inconsistent.length}`);
                issues++;
            } else {
                console.log(`   ✅ Course timestamps: All consistent`);
            }
        }
        
        // 5. Record count summary
        console.log('\n📈 Record Counts:');
        const recordCounts = {};
        
        for (const table of ['courses', 'course_categories', 'instructors', 'course_modules', 'course_lessons']) {
            const { count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            recordCounts[table] = count || 0;
            console.log(`   📊 ${table}: ${count || 0} records`);
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📋 QUICK CHECK SUMMARY');
        console.log('='.repeat(50));
        
        const successRate = ((checks - issues) / checks * 100).toFixed(1);
        
        if (issues === 0) {
            console.log('✅ ALL CHECKS PASSED - Database is healthy');
        } else if (issues <= 2) {
            console.log('⚠️  MINOR ISSUES FOUND - Review and fix recommended');
        } else {
            console.log('❌ MULTIPLE ISSUES FOUND - Immediate attention required');
        }
        
        console.log(`\n📊 Results: ${checks - issues}/${checks} checks passed (${successRate}%)`);
        console.log(`🔍 Issues found: ${issues}`);
        console.log(`📅 Next full validation recommended: ${issues > 2 ? 'Immediately' : 'Next week'}`);
        
        // Save quick report
        const quickReport = {
            timestamp: new Date().toISOString(),
            checksPerformed: checks,
            issuesFound: issues,
            successRate: parseFloat(successRate),
            status: issues === 0 ? 'HEALTHY' : issues <= 2 ? 'MINOR_ISSUES' : 'NEEDS_ATTENTION',
            recordCounts,
            recommendation: issues > 2 ? 'Run full validation immediately' : 'Continue regular monitoring'
        };
        
        const fs = require('fs');
        const path = require('path');
        
        const reportPath = path.join(__dirname, '..', 'quick-integrity-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(quickReport, null, 2));
        
        console.log(`\n📄 Quick report saved: quick-integrity-report.json`);
        
        // Exit with appropriate code
        process.exit(issues > 2 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Quick check failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    quickIntegrityCheck();
}

module.exports = { quickIntegrityCheck };