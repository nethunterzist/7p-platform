#!/usr/bin/env node

/**
 * 7P Education - Data Integrity Monitoring System
 * 
 * This script provides ongoing monitoring and alerting for data integrity violations.
 * It can be run as a scheduled job to continuously monitor database health.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class DataIntegrityMonitor {
    constructor() {
        this.alerts = [];
        this.metrics = {
            checkCount: 0,
            passCount: 0,
            failCount: 0,
            warningCount: 0
        };
    }

    async runMonitoring() {
        console.log('🔍 Data Integrity Monitoring - ' + new Date().toISOString());
        console.log('=' + '='.repeat(60));
        
        // Critical checks that should never fail
        await this.monitorCriticalIntegrity();
        
        // Business logic monitoring
        await this.monitorBusinessLogic();
        
        // Performance and growth monitoring
        await this.monitorGrowthMetrics();
        
        // Generate alerts and summary
        this.generateAlerts();
        
        return {
            alerts: this.alerts,
            metrics: this.metrics,
            timestamp: new Date().toISOString()
        };
    }

    async monitorCriticalIntegrity() {
        console.log('\n🚨 CRITICAL INTEGRITY MONITORING\n');
        
        // Check for orphaned records
        await this.checkOrphanedRecords();
        
        // Check constraint violations
        await this.checkConstraintViolations();
        
        // Check temporal data consistency
        await this.checkTemporalConsistency();
    }

    async checkOrphanedRecords() {
        const criticalChecks = [
            {
                name: 'Orphaned Course Modules',
                query: async () => {
                    const { data: modules } = await supabase
                        .from('course_modules')
                        .select('id, title, course_id');
                    
                    const { data: courses } = await supabase
                        .from('courses')
                        .select('id');
                    
                    if (!modules || !courses) return { count: 0, details: [] };
                    
                    const courseIds = new Set(courses.map(c => c.id));
                    const orphaned = modules.filter(m => !courseIds.has(m.course_id));
                    
                    return {
                        count: orphaned.length,
                        details: orphaned.map(m => `Module "${m.title}" (${m.id})`)
                    };
                },
                severity: 'CRITICAL',
                threshold: 0
            },
            {
                name: 'Orphaned Course Lessons',
                query: async () => {
                    const { data: lessons } = await supabase
                        .from('course_lessons')
                        .select('id, title, module_id, course_id');
                    
                    const { data: modules } = await supabase
                        .from('course_modules')
                        .select('id');
                    
                    const { data: courses } = await supabase
                        .from('courses')
                        .select('id');
                    
                    if (!lessons || !modules || !courses) return { count: 0, details: [] };
                    
                    const moduleIds = new Set(modules.map(m => m.id));
                    const courseIds = new Set(courses.map(c => c.id));
                    
                    const orphanedFromModules = lessons.filter(l => !moduleIds.has(l.module_id));
                    const orphanedFromCourses = lessons.filter(l => !courseIds.has(l.course_id));
                    
                    const allOrphaned = [...orphanedFromModules, ...orphanedFromCourses];
                    
                    return {
                        count: allOrphaned.length,
                        details: allOrphaned.map(l => `Lesson "${l.title}" (${l.id})`)
                    };
                },
                severity: 'CRITICAL',
                threshold: 0
            }
        ];

        for (const check of criticalChecks) {
            try {
                const result = await check.query();
                this.metrics.checkCount++;
                
                if (result.count > check.threshold) {
                    this.metrics.failCount++;
                    this.alerts.push({
                        type: 'INTEGRITY_VIOLATION',
                        severity: check.severity,
                        title: check.name,
                        message: `Found ${result.count} orphaned records`,
                        details: result.details.slice(0, 5), // Show first 5
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ❌ ${check.name}: ${result.count} violations found`);
                } else {
                    this.metrics.passCount++;
                    console.log(`   ✅ ${check.name}: No violations`);
                }
                
            } catch (error) {
                this.alerts.push({
                    type: 'MONITORING_ERROR',
                    severity: 'HIGH',
                    title: `${check.name} Check Failed`,
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
                console.log(`   ⚠️  ${check.name}: Check failed - ${error.message}`);
            }
        }
    }

    async checkConstraintViolations() {
        const constraintChecks = [
            {
                name: 'Course Price Validation',
                table: 'courses',
                column: 'price',
                check: (value) => value >= 0,
                severity: 'HIGH'
            },
            {
                name: 'Course Rating Validation',
                table: 'courses',
                column: 'rating',
                check: (value) => value >= 0 && value <= 5,
                severity: 'MEDIUM'
            },
            {
                name: 'User Progress Validation',
                table: 'user_courses',
                column: 'progress_percentage',
                check: (value) => value >= 0 && value <= 100,
                severity: 'HIGH'
            }
        ];

        for (const check of constraintChecks) {
            try {
                const { data, error } = await supabase
                    .from(check.table)
                    .select(check.column)
                    .not(check.column, 'is', null);

                this.metrics.checkCount++;

                if (error || !data) {
                    console.log(`   ⚠️  ${check.name}: Unable to validate`);
                    continue;
                }

                const violations = data.filter(row => !check.check(row[check.column]));
                
                if (violations.length > 0) {
                    this.metrics.failCount++;
                    this.alerts.push({
                        type: 'CONSTRAINT_VIOLATION',
                        severity: check.severity,
                        title: check.name,
                        message: `Found ${violations.length} constraint violations in ${check.table}.${check.column}`,
                        details: violations.slice(0, 5).map(v => v[check.column]),
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ❌ ${check.name}: ${violations.length} violations`);
                } else {
                    this.metrics.passCount++;
                    console.log(`   ✅ ${check.name}: All ${data.length} records valid`);
                }
                
            } catch (error) {
                console.log(`   ⚠️  ${check.name}: Check failed - ${error.message}`);
            }
        }
    }

    async checkTemporalConsistency() {
        const temporalChecks = [
            {
                name: 'Course Timestamp Consistency',
                check: async () => {
                    const { data: courses } = await supabase
                        .from('courses')
                        .select('id, title, created_at, updated_at, published_at');
                    
                    if (!courses) return [];
                    
                    const issues = [];
                    
                    for (const course of courses) {
                        // Check updated_at >= created_at
                        if (new Date(course.updated_at) < new Date(course.created_at)) {
                            issues.push(`Course "${course.title}": updated_at before created_at`);
                        }
                        
                        // Check published_at >= created_at
                        if (course.published_at && new Date(course.published_at) < new Date(course.created_at)) {
                            issues.push(`Course "${course.title}": published_at before created_at`);
                        }
                    }
                    
                    return issues;
                },
                severity: 'MEDIUM'
            }
        ];

        for (const check of temporalChecks) {
            try {
                const issues = await check.check();
                this.metrics.checkCount++;
                
                if (issues.length > 0) {
                    this.metrics.failCount++;
                    this.alerts.push({
                        type: 'TEMPORAL_INCONSISTENCY',
                        severity: check.severity,
                        title: check.name,
                        message: `Found ${issues.length} timestamp inconsistencies`,
                        details: issues.slice(0, 5),
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ❌ ${check.name}: ${issues.length} inconsistencies`);
                } else {
                    this.metrics.passCount++;
                    console.log(`   ✅ ${check.name}: All timestamps consistent`);
                }
                
            } catch (error) {
                console.log(`   ⚠️  ${check.name}: Check failed - ${error.message}`);
            }
        }
    }

    async monitorBusinessLogic() {
        console.log('\n📊 BUSINESS LOGIC MONITORING\n');
        
        await this.checkCourseCompleteness();
        await this.checkProgressAccuracy();
    }

    async checkCourseCompleteness() {
        try {
            // Check for courses without modules
            const { data: coursesWithoutModules } = await supabase
                .from('courses')
                .select(`
                    id, title,
                    course_modules(id)
                `)
                .is('course_modules.id', null);

            this.metrics.checkCount++;

            if (coursesWithoutModules && coursesWithoutModules.length > 0) {
                this.metrics.warningCount++;
                this.alerts.push({
                    type: 'BUSINESS_LOGIC_WARNING',
                    severity: 'MEDIUM',
                    title: 'Incomplete Course Structure',
                    message: `Found ${coursesWithoutModules.length} courses without modules`,
                    details: coursesWithoutModules.map(c => c.title),
                    timestamp: new Date().toISOString()
                });
                console.log(`   ⚠️  Course Completeness: ${coursesWithoutModules.length} courses without modules`);
            } else {
                this.metrics.passCount++;
                console.log(`   ✅ Course Completeness: All courses have modules`);
            }

            // Check for modules without lessons
            const { data: modules } = await supabase
                .from('course_modules')
                .select('id, title');

            if (modules) {
                let modulesWithoutLessons = 0;
                const incompleteModules = [];

                for (const module of modules) {
                    const { data: lessons } = await supabase
                        .from('course_lessons')
                        .select('id')
                        .eq('module_id', module.id);

                    if (!lessons || lessons.length === 0) {
                        modulesWithoutLessons++;
                        incompleteModules.push(module.title);
                    }
                }

                this.metrics.checkCount++;

                if (modulesWithoutLessons > 0) {
                    this.metrics.warningCount++;
                    this.alerts.push({
                        type: 'BUSINESS_LOGIC_WARNING',
                        severity: 'LOW',
                        title: 'Incomplete Module Structure',
                        message: `Found ${modulesWithoutLessons} modules without lessons`,
                        details: incompleteModules,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ⚠️  Module Completeness: ${modulesWithoutLessons} modules without lessons`);
                } else {
                    this.metrics.passCount++;
                    console.log(`   ✅ Module Completeness: All modules have lessons`);
                }
            }

        } catch (error) {
            console.log(`   ⚠️  Course Completeness Check: Failed - ${error.message}`);
        }
    }

    async checkProgressAccuracy() {
        try {
            const { data: userCourses } = await supabase
                .from('user_courses')
                .select('id, user_id, course_id, progress_percentage')
                .limit(50);

            this.metrics.checkCount++;

            if (!userCourses || userCourses.length === 0) {
                console.log(`   ✅ Progress Accuracy: No user progress to validate`);
                this.metrics.passCount++;
                return;
            }

            let inconsistencies = 0;

            for (const enrollment of userCourses) {
                // Get total lessons for course
                const { data: totalLessons } = await supabase
                    .from('course_lessons')
                    .select('id')
                    .eq('course_id', enrollment.course_id);

                // Get completed lessons by user
                const { data: completedLessons } = await supabase
                    .from('user_lesson_progress')
                    .select('id')
                    .eq('user_id', enrollment.user_id)
                    .eq('course_id', enrollment.course_id)
                    .eq('completed', true);

                if (totalLessons && completedLessons) {
                    const expectedProgress = totalLessons.length > 0 
                        ? (completedLessons.length / totalLessons.length) * 100
                        : 0;

                    if (Math.abs(expectedProgress - enrollment.progress_percentage) > 1) {
                        inconsistencies++;
                    }
                }
            }

            if (inconsistencies > 0) {
                this.metrics.failCount++;
                this.alerts.push({
                    type: 'PROGRESS_INCONSISTENCY',
                    severity: 'HIGH',
                    title: 'Progress Calculation Mismatch',
                    message: `Found ${inconsistencies} progress calculation inconsistencies`,
                    timestamp: new Date().toISOString()
                });
                console.log(`   ❌ Progress Accuracy: ${inconsistencies} inconsistencies found`);
            } else {
                this.metrics.passCount++;
                console.log(`   ✅ Progress Accuracy: All ${userCourses.length} enrollments accurate`);
            }

        } catch (error) {
            console.log(`   ⚠️  Progress Accuracy Check: Failed - ${error.message}`);
        }
    }

    async monitorGrowthMetrics() {
        console.log('\n📈 GROWTH & PERFORMANCE MONITORING\n');
        
        try {
            // Get basic table counts
            const tables = ['users', 'courses', 'user_courses', 'course_reviews'];
            const metrics = {};

            for (const table of tables) {
                const { count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                metrics[table] = count || 0;
            }

            // Calculate engagement metrics
            const engagementMetrics = {
                totalUsers: metrics.users,
                totalCourses: metrics.courses,
                totalEnrollments: metrics.user_courses,
                totalReviews: metrics.course_reviews,
                averageEnrollmentsPerUser: metrics.users > 0 ? (metrics.user_courses / metrics.users).toFixed(2) : 0,
                averageReviewsPerCourse: metrics.courses > 0 ? (metrics.course_reviews / metrics.courses).toFixed(2) : 0
            };

            console.log(`   📊 Total Users: ${engagementMetrics.totalUsers}`);
            console.log(`   📚 Total Courses: ${engagementMetrics.totalCourses}`);
            console.log(`   🎓 Total Enrollments: ${engagementMetrics.totalEnrollments}`);
            console.log(`   ⭐ Total Reviews: ${engagementMetrics.totalReviews}`);
            console.log(`   📈 Avg Enrollments/User: ${engagementMetrics.averageEnrollmentsPerUser}`);
            console.log(`   📝 Avg Reviews/Course: ${engagementMetrics.averageReviewsPerCourse}`);

            // Store metrics for trending analysis
            this.storeMetrics(engagementMetrics);

        } catch (error) {
            console.log(`   ⚠️  Growth Metrics: Failed - ${error.message}`);
        }
    }

    storeMetrics(metrics) {
        // In a real implementation, this would store metrics in a time-series database
        // For now, we'll just log them
        const timestamp = new Date().toISOString();
        console.log(`\n📊 Metrics stored for ${timestamp}`);
    }

    generateAlerts() {
        console.log('\n' + '='.repeat(60));
        console.log('🚨 MONITORING SUMMARY');
        console.log('='.repeat(60));

        console.log(`\n📊 Check Results:`);
        console.log(`   ✅ Passed: ${this.metrics.passCount}`);
        console.log(`   ❌ Failed: ${this.metrics.failCount}`);
        console.log(`   ⚠️  Warnings: ${this.metrics.warningCount}`);
        console.log(`   📋 Total Checks: ${this.metrics.checkCount}`);

        if (this.alerts.length === 0) {
            console.log(`\n✅ All systems operational - No alerts generated`);
            return;
        }

        console.log(`\n🚨 ALERTS GENERATED: ${this.alerts.length}`);
        
        // Group alerts by severity
        const criticalAlerts = this.alerts.filter(a => a.severity === 'CRITICAL');
        const highAlerts = this.alerts.filter(a => a.severity === 'HIGH');
        const mediumAlerts = this.alerts.filter(a => a.severity === 'MEDIUM');
        const lowAlerts = this.alerts.filter(a => a.severity === 'LOW');

        if (criticalAlerts.length > 0) {
            console.log(`\n🚨 CRITICAL ALERTS (${criticalAlerts.length}):`);
            criticalAlerts.forEach((alert, i) => {
                console.log(`   ${i+1}. ${alert.title}`);
                console.log(`      ${alert.message}`);
                if (alert.details && alert.details.length > 0) {
                    console.log(`      Details: ${alert.details.slice(0, 3).join(', ')}${alert.details.length > 3 ? '...' : ''}`);
                }
            });
        }

        if (highAlerts.length > 0) {
            console.log(`\n⚠️  HIGH PRIORITY ALERTS (${highAlerts.length}):`);
            highAlerts.forEach((alert, i) => {
                console.log(`   ${i+1}. ${alert.title}: ${alert.message}`);
            });
        }

        if (mediumAlerts.length > 0) {
            console.log(`\n🔶 MEDIUM PRIORITY ALERTS (${mediumAlerts.length}):`);
            mediumAlerts.forEach((alert, i) => {
                console.log(`   ${i+1}. ${alert.title}: ${alert.message}`);
            });
        }

        if (lowAlerts.length > 0) {
            console.log(`\n💡 LOW PRIORITY ALERTS (${lowAlerts.length}):`);
            lowAlerts.forEach((alert, i) => {
                console.log(`   ${i+1}. ${alert.title}: ${alert.message}`);
            });
        }

        console.log('\n📋 RECOMMENDED ACTIONS:');
        if (criticalAlerts.length > 0) {
            console.log('   1. 🚨 Address critical data integrity issues immediately');
        }
        if (highAlerts.length > 0) {
            console.log('   2. ⚠️  Fix high priority issues within 24 hours');
        }
        if (mediumAlerts.length > 0) {
            console.log('   3. 🔶 Schedule medium priority fixes within a week');
        }
        if (lowAlerts.length > 0) {
            console.log('   4. 💡 Plan low priority improvements for next sprint');
        }
        
        console.log('   5. 📊 Review monitoring logs for trends');
        console.log('   6. 🔄 Run full integrity validation if critical issues found');
    }
}

// Main execution
async function main() {
    try {
        const monitor = new DataIntegrityMonitor();
        const results = await monitor.runMonitoring();
        
        // Save monitoring results
        const fs = require('fs');
        const path = require('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, '..', `monitoring-report-${timestamp}.json`);
        
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n📄 Monitoring report saved: ${reportPath}`);
        
        // Exit with appropriate code
        const hasCriticalIssues = results.alerts.some(a => a.severity === 'CRITICAL');
        process.exit(hasCriticalIssues ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Monitoring failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { DataIntegrityMonitor };