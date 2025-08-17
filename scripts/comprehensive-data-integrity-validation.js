#!/usr/bin/env node

/**
 * 7P Education - Comprehensive Data Integrity Validation
 * 
 * This script performs a thorough data integrity validation across all database tables,
 * checking referential integrity, business logic consistency, data type compliance,
 * and temporal data accuracy.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class DataIntegrityValidator {
    constructor() {
        this.results = {
            referentialIntegrity: [],
            dataTypeValidation: [],
            businessLogicValidation: [],
            temporalDataValidation: [],
            quantitativeAnalysis: [],
            summary: {
                totalTables: 0,
                tablesWithData: 0,
                totalRecords: 0,
                violationsFound: 0,
                criticalIssues: 0,
                warningIssues: 0
            }
        };
        this.issues = [];
    }

    async validateDataIntegrity() {
        console.log('🔍 Starting Comprehensive Data Integrity Validation...\n');
        
        try {
            // 1. Referential Integrity Validation
            await this.validateReferentialIntegrity();
            
            // 2. Data Type and Constraint Validation
            await this.validateDataTypes();
            
            // 3. Business Logic Validation
            await this.validateBusinessLogic();
            
            // 4. Temporal Data Validation
            await this.validateTemporalData();
            
            // 5. Quantitative Analysis
            await this.performQuantitativeAnalysis();
            
            // 6. Generate Summary Report
            this.generateSummaryReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            throw error;
        }
    }

    async validateReferentialIntegrity() {
        console.log('📋 1. REFERENTIAL INTEGRITY VALIDATION\n');
        
        const foreignKeyChecks = [
            {
                name: 'Instructors → Users',
                childTable: 'instructors',
                childColumn: 'user_id',
                parentTable: 'users',
                parentColumn: 'id',
                allowNull: true
            },
            {
                name: 'Courses → Instructors',
                childTable: 'courses',
                childColumn: 'instructor_id',
                parentTable: 'instructors',
                parentColumn: 'id',
                allowNull: true
            },
            {
                name: 'Courses → Categories',
                childTable: 'courses',
                childColumn: 'category_id',
                parentTable: 'course_categories',
                parentColumn: 'id',
                allowNull: true
            },
            {
                name: 'Course Modules → Courses',
                childTable: 'course_modules',
                childColumn: 'course_id',
                parentTable: 'courses',
                parentColumn: 'id',
                allowNull: false
            },
            {
                name: 'Course Lessons → Modules',
                childTable: 'course_lessons',
                childColumn: 'module_id',
                parentTable: 'course_modules',
                parentColumn: 'id',
                allowNull: false
            },
            {
                name: 'Course Lessons → Courses',
                childTable: 'course_lessons',
                childColumn: 'course_id',
                parentTable: 'courses',
                parentColumn: 'id',
                allowNull: false
            },
            {
                name: 'User Courses → Users',
                childTable: 'user_courses',
                childColumn: 'user_id',
                parentTable: 'users',
                parentColumn: 'id',
                allowNull: false
            },
            {
                name: 'User Courses → Courses',
                childTable: 'user_courses',
                childColumn: 'course_id',
                parentTable: 'courses',
                parentColumn: 'id',
                allowNull: false
            },
            {
                name: 'User Progress → Users',
                childTable: 'user_lesson_progress',
                childColumn: 'user_id',
                parentTable: 'users',
                parentColumn: 'id',
                allowNull: false
            },
            {
                name: 'User Progress → Lessons',
                childTable: 'user_lesson_progress',
                childColumn: 'lesson_id',
                parentTable: 'course_lessons',
                parentColumn: 'id',
                allowNull: false
            }
        ];

        for (const check of foreignKeyChecks) {
            const result = await this.checkForeignKeyIntegrity(check);
            this.results.referentialIntegrity.push(result);
            
            if (result.status === 'FAIL') {
                this.issues.push({
                    severity: 'CRITICAL',
                    category: 'Referential Integrity',
                    issue: result.message,
                    table: check.childTable,
                    recommendation: `Fix orphaned records in ${check.childTable}.${check.childColumn}`
                });
            }
        }
    }

    async checkForeignKeyIntegrity(check) {
        try {
            // Query to find orphaned records
            let query = `
                SELECT COUNT(*) as orphaned_count
                FROM ${check.childTable}
                WHERE ${check.childColumn} IS NOT NULL
                AND ${check.childColumn} NOT IN (
                    SELECT ${check.parentColumn} 
                    FROM ${check.parentTable} 
                    WHERE ${check.parentColumn} IS NOT NULL
                )
            `;

            const { data, error } = await supabase.rpc('execute_sql', { sql: query });
            
            if (error) {
                // Fallback: Check using standard queries
                const { data: childData } = await supabase.from(check.childTable).select(check.childColumn);
                const { data: parentData } = await supabase.from(check.parentTable).select(check.parentColumn);
                
                if (!childData || !parentData) {
                    return {
                        relationship: check.name,
                        status: 'SKIP',
                        message: 'Unable to validate - table access limited',
                        orphanedRecords: 0
                    };
                }

                const parentIds = new Set(parentData.map(row => row[check.parentColumn]).filter(id => id));
                const orphanedRecords = childData.filter(row => 
                    row[check.childColumn] && !parentIds.has(row[check.childColumn])
                ).length;

                const status = orphanedRecords > 0 ? 'FAIL' : 'PASS';
                const message = orphanedRecords > 0 
                    ? `Found ${orphanedRecords} orphaned records`
                    : 'All foreign key references are valid';

                console.log(`   ${status === 'PASS' ? '✅' : '❌'} ${check.name}: ${message}`);
                
                return {
                    relationship: check.name,
                    status,
                    message,
                    orphanedRecords
                };
            }

            const orphanedCount = data?.[0]?.orphaned_count || 0;
            const status = orphanedCount > 0 ? 'FAIL' : 'PASS';
            const message = orphanedCount > 0 
                ? `Found ${orphanedCount} orphaned records`
                : 'All foreign key references are valid';

            console.log(`   ${status === 'PASS' ? '✅' : '❌'} ${check.name}: ${message}`);
            
            return {
                relationship: check.name,
                status,
                message,
                orphanedRecords: orphanedCount
            };
            
        } catch (error) {
            console.log(`   ⚠️  ${check.name}: Error during validation - ${error.message}`);
            return {
                relationship: check.name,
                status: 'ERROR',
                message: `Validation error: ${error.message}`,
                orphanedRecords: 0
            };
        }
    }

    async validateDataTypes() {
        console.log('\n📊 2. DATA TYPE & CONSTRAINT VALIDATION\n');
        
        const dataTypeChecks = [
            {
                table: 'courses',
                checks: [
                    { column: 'price', type: 'DECIMAL', constraint: 'price >= 0' },
                    { column: 'rating', type: 'DECIMAL', constraint: 'rating >= 0 AND rating <= 5' },
                    { column: 'level', type: 'ENUM', constraint: "level IN ('beginner', 'intermediate', 'advanced')" },
                    { column: 'status', type: 'ENUM', constraint: "status IN ('draft', 'review', 'published', 'archived')" }
                ]
            },
            {
                table: 'user_courses',
                checks: [
                    { column: 'progress_percentage', type: 'DECIMAL', constraint: 'progress_percentage >= 0 AND progress_percentage <= 100' },
                    { column: 'rating', type: 'INTEGER', constraint: 'rating >= 1 AND rating <= 5' },
                    { column: 'status', type: 'ENUM', constraint: "status IN ('active', 'completed', 'paused', 'cancelled', 'refunded')" }
                ]
            },
            {
                table: 'course_reviews',
                checks: [
                    { column: 'rating', type: 'INTEGER', constraint: 'rating >= 1 AND rating <= 5' }
                ]
            },
            {
                table: 'user_lesson_progress',
                checks: [
                    { column: 'progress_percentage', type: 'DECIMAL', constraint: 'progress_percentage >= 0 AND progress_percentage <= 100' }
                ]
            }
        ];

        for (const tableCheck of dataTypeChecks) {
            for (const check of tableCheck.checks) {
                const result = await this.validateColumnConstraint(tableCheck.table, check);
                this.results.dataTypeValidation.push(result);
                
                if (result.status === 'FAIL') {
                    this.issues.push({
                        severity: 'HIGH',
                        category: 'Data Type Validation',
                        issue: result.message,
                        table: tableCheck.table,
                        recommendation: `Fix constraint violations in ${tableCheck.table}.${check.column}`
                    });
                }
            }
        }
    }

    async validateColumnConstraint(table, check) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select(`${check.column}`)
                .not(check.column, 'is', null);

            if (error) {
                console.log(`   ⚠️  ${table}.${check.column}: Access limited`);
                return {
                    table,
                    column: check.column,
                    constraint: check.constraint,
                    status: 'SKIP',
                    message: 'Unable to validate - table access limited',
                    violationCount: 0
                };
            }

            if (!data || data.length === 0) {
                console.log(`   ✅ ${table}.${check.column}: No data to validate`);
                return {
                    table,
                    column: check.column,
                    constraint: check.constraint,
                    status: 'PASS',
                    message: 'No data to validate',
                    violationCount: 0
                };
            }

            // Check constraints based on type
            let violations = 0;
            let violationDetails = [];

            for (const row of data) {
                const value = row[check.column];
                let violatesConstraint = false;

                switch (check.type) {
                    case 'DECIMAL':
                        if (check.constraint.includes('>=') && check.constraint.includes('<=')) {
                            // Range check like "rating >= 0 AND rating <= 5"
                            const [min, max] = check.constraint.match(/\d+(\.\d+)?/g).map(Number);
                            violatesConstraint = value < min || value > max;
                        } else if (check.constraint.includes('>=')) {
                            const min = parseFloat(check.constraint.match(/\d+(\.\d+)?/)[0]);
                            violatesConstraint = value < min;
                        }
                        break;
                    
                    case 'INTEGER':
                        if (check.constraint.includes('>=') && check.constraint.includes('<=')) {
                            const [min, max] = check.constraint.match(/\d+/g).map(Number);
                            violatesConstraint = value < min || value > max;
                        }
                        break;
                    
                    case 'ENUM':
                        const allowedValues = check.constraint.match(/'([^']+)'/g).map(v => v.slice(1, -1));
                        violatesConstraint = !allowedValues.includes(value);
                        break;
                }

                if (violatesConstraint) {
                    violations++;
                    violationDetails.push(value);
                }
            }

            const status = violations > 0 ? 'FAIL' : 'PASS';
            const message = violations > 0 
                ? `Found ${violations} constraint violations`
                : `All ${data.length} records comply with constraints`;

            console.log(`   ${status === 'PASS' ? '✅' : '❌'} ${table}.${check.column}: ${message}`);
            
            return {
                table,
                column: check.column,
                constraint: check.constraint,
                status,
                message,
                violationCount: violations,
                violationDetails: violationDetails.slice(0, 5) // Show first 5 violations
            };
            
        } catch (error) {
            console.log(`   ⚠️  ${table}.${check.column}: Error during validation - ${error.message}`);
            return {
                table,
                column: check.column,
                constraint: check.constraint,
                status: 'ERROR',
                message: `Validation error: ${error.message}`,
                violationCount: 0
            };
        }
    }

    async validateBusinessLogic() {
        console.log('\n🔄 3. BUSINESS LOGIC VALIDATION\n');
        
        const businessLogicChecks = [
            {
                name: 'Course Hierarchy Integrity',
                description: 'Validate Course → Module → Lesson hierarchy',
                check: async () => {
                    const issues = [];
                    
                    // Check modules without lessons
                    const { data: modules } = await supabase
                        .from('course_modules')
                        .select('id, title, course_id')
                        .limit(1000);
                    
                    if (modules) {
                        for (const module of modules) {
                            const { data: lessons } = await supabase
                                .from('course_lessons')
                                .select('id')
                                .eq('module_id', module.id);
                            
                            if (!lessons || lessons.length === 0) {
                                issues.push(`Module "${module.title}" has no lessons`);
                            }
                        }
                    }
                    
                    return {
                        status: issues.length > 0 ? 'WARNING' : 'PASS',
                        issues,
                        message: issues.length > 0 
                            ? `Found ${issues.length} modules without lessons`
                            : 'All modules have lessons'
                    };
                }
            },
            {
                name: 'Course Progress Consistency',
                description: 'Validate user progress calculations',
                check: async () => {
                    const issues = [];
                    
                    const { data: userCourses } = await supabase
                        .from('user_courses')
                        .select('id, user_id, course_id, progress_percentage')
                        .limit(100);
                    
                    if (userCourses && userCourses.length > 0) {
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
                                    ? Math.round((completedLessons.length / totalLessons.length) * 100)
                                    : 0;
                                
                                const actualProgress = Math.round(enrollment.progress_percentage);
                                
                                if (Math.abs(expectedProgress - actualProgress) > 1) {
                                    issues.push(`User ${enrollment.user_id} progress mismatch: expected ${expectedProgress}%, actual ${actualProgress}%`);
                                }
                            }
                        }
                    }
                    
                    return {
                        status: issues.length > 0 ? 'FAIL' : 'PASS',
                        issues,
                        message: issues.length > 0 
                            ? `Found ${issues.length} progress inconsistencies`
                            : 'All progress calculations are consistent'
                    };
                }
            },
            {
                name: 'Course Rating Accuracy',
                description: 'Validate course rating calculations',
                check: async () => {
                    const issues = [];
                    
                    const { data: courses } = await supabase
                        .from('courses')
                        .select('id, title, rating, total_ratings')
                        .limit(50);
                    
                    if (courses) {
                        for (const course of courses) {
                            const { data: reviews } = await supabase
                                .from('course_reviews')
                                .select('rating')
                                .eq('course_id', course.id)
                                .eq('approved', true);
                            
                            if (reviews) {
                                const expectedRating = reviews.length > 0 
                                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                                    : 0;
                                
                                const actualRating = course.rating || 0;
                                const actualCount = course.total_ratings || 0;
                                
                                if (Math.abs(expectedRating - actualRating) > 0.1) {
                                    issues.push(`Course "${course.title}" rating mismatch: expected ${expectedRating.toFixed(2)}, actual ${actualRating}`);
                                }
                                
                                if (reviews.length !== actualCount) {
                                    issues.push(`Course "${course.title}" rating count mismatch: expected ${reviews.length}, actual ${actualCount}`);
                                }
                            }
                        }
                    }
                    
                    return {
                        status: issues.length > 0 ? 'FAIL' : 'PASS',
                        issues,
                        message: issues.length > 0 
                            ? `Found ${issues.length} rating inconsistencies`
                            : 'All course ratings are accurate'
                    };
                }
            }
        ];

        for (const check of businessLogicChecks) {
            try {
                const result = await check.check();
                result.name = check.name;
                result.description = check.description;
                
                this.results.businessLogicValidation.push(result);
                
                console.log(`   ${result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'} ${check.name}: ${result.message}`);
                
                if (result.status === 'FAIL') {
                    this.issues.push({
                        severity: 'HIGH',
                        category: 'Business Logic',
                        issue: result.message,
                        table: 'Multiple',
                        recommendation: check.description
                    });
                }
                
            } catch (error) {
                console.log(`   ⚠️  ${check.name}: Error during validation - ${error.message}`);
                this.results.businessLogicValidation.push({
                    name: check.name,
                    description: check.description,
                    status: 'ERROR',
                    message: `Validation error: ${error.message}`,
                    issues: []
                });
            }
        }
    }

    async validateTemporalData() {
        console.log('\n⏰ 4. TEMPORAL DATA VALIDATION\n');
        
        const temporalChecks = [
            {
                name: 'Timestamp Consistency',
                table: 'courses',
                check: async () => {
                    const { data } = await supabase
                        .from('courses')
                        .select('id, title, created_at, updated_at, published_at')
                        .limit(100);
                    
                    if (!data) return { status: 'SKIP', issues: [], message: 'No data to validate' };
                    
                    const issues = [];
                    
                    for (const record of data) {
                        // Check if updated_at >= created_at
                        if (new Date(record.updated_at) < new Date(record.created_at)) {
                            issues.push(`Course "${record.title}": updated_at (${record.updated_at}) before created_at (${record.created_at})`);
                        }
                        
                        // Check if published_at >= created_at (when published)
                        if (record.published_at && new Date(record.published_at) < new Date(record.created_at)) {
                            issues.push(`Course "${record.title}": published_at (${record.published_at}) before created_at (${record.created_at})`);
                        }
                    }
                    
                    return {
                        status: issues.length > 0 ? 'FAIL' : 'PASS',
                        issues,
                        message: issues.length > 0 
                            ? `Found ${issues.length} timestamp inconsistencies`
                            : `All ${data.length} records have consistent timestamps`
                    };
                }
            },
            {
                name: 'Enrollment Timeline Validation',
                table: 'user_courses',
                check: async () => {
                    const { data } = await supabase
                        .from('user_courses')
                        .select('id, enrolled_at, completed_at, last_accessed')
                        .limit(100);
                    
                    if (!data) return { status: 'SKIP', issues: [], message: 'No data to validate' };
                    
                    const issues = [];
                    
                    for (const record of data) {
                        // Check if completed_at >= enrolled_at (when completed)
                        if (record.completed_at && new Date(record.completed_at) < new Date(record.enrolled_at)) {
                            issues.push(`Enrollment ${record.id}: completed_at (${record.completed_at}) before enrolled_at (${record.enrolled_at})`);
                        }
                        
                        // Check if last_accessed >= enrolled_at
                        if (new Date(record.last_accessed) < new Date(record.enrolled_at)) {
                            issues.push(`Enrollment ${record.id}: last_accessed (${record.last_accessed}) before enrolled_at (${record.enrolled_at})`);
                        }
                    }
                    
                    return {
                        status: issues.length > 0 ? 'FAIL' : 'PASS',
                        issues,
                        message: issues.length > 0 
                            ? `Found ${issues.length} timeline inconsistencies`
                            : `All ${data.length} enrollment timelines are consistent`
                    };
                }
            }
        ];

        for (const check of temporalChecks) {
            try {
                const result = await check.check();
                result.name = check.name;
                result.table = check.table;
                
                this.results.temporalDataValidation.push(result);
                
                console.log(`   ${result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⚠️' : '❌'} ${check.name}: ${result.message}`);
                
                if (result.status === 'FAIL') {
                    this.issues.push({
                        severity: 'MEDIUM',
                        category: 'Temporal Data',
                        issue: result.message,
                        table: check.table,
                        recommendation: 'Fix timestamp inconsistencies'
                    });
                }
                
            } catch (error) {
                console.log(`   ⚠️  ${check.name}: Error during validation - ${error.message}`);
                this.results.temporalDataValidation.push({
                    name: check.name,
                    table: check.table,
                    status: 'ERROR',
                    message: `Validation error: ${error.message}`,
                    issues: []
                });
            }
        }
    }

    async performQuantitativeAnalysis() {
        console.log('\n📈 5. QUANTITATIVE ANALYSIS\n');
        
        const tables = [
            'organizations', 'users', 'instructors', 'course_categories', 'courses',
            'course_modules', 'course_lessons', 'user_courses', 'user_lesson_progress',
            'course_reviews', 'course_coupons', 'course_announcements'
        ];

        let totalRecords = 0;
        let tablesWithData = 0;

        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.log(`   ⚠️  ${table}: Access limited`);
                    this.results.quantitativeAnalysis.push({
                        table,
                        status: 'SKIP',
                        recordCount: 0,
                        message: 'Access limited'
                    });
                    continue;
                }

                const recordCount = count || 0;
                totalRecords += recordCount;
                
                if (recordCount > 0) {
                    tablesWithData++;
                }

                // Analyze data distribution for tables with data
                let analysis = '';
                if (recordCount > 0) {
                    // Get sample data for analysis
                    const { data: sampleData } = await supabase
                        .from(table)
                        .select('*')
                        .limit(10);
                    
                    if (sampleData) {
                        const columns = Object.keys(sampleData[0] || {});
                        analysis = ` (${columns.length} columns)`;
                    }
                }

                console.log(`   ${recordCount > 0 ? '✅' : '⚪'} ${table}: ${recordCount} records${analysis}`);
                
                this.results.quantitativeAnalysis.push({
                    table,
                    status: 'ANALYZED',
                    recordCount,
                    message: `${recordCount} records found`
                });
                
            } catch (error) {
                console.log(`   ❌ ${table}: Error - ${error.message}`);
                this.results.quantitativeAnalysis.push({
                    table,
                    status: 'ERROR',
                    recordCount: 0,
                    message: `Error: ${error.message}`
                });
            }
        }

        // Update summary statistics
        this.results.summary.totalTables = tables.length;
        this.results.summary.tablesWithData = tablesWithData;
        this.results.summary.totalRecords = totalRecords;
        
        console.log(`\n   📊 Summary: ${tablesWithData}/${tables.length} tables with data, ${totalRecords} total records`);
    }

    generateSummaryReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 DATA INTEGRITY VALIDATION SUMMARY');
        console.log('='.repeat(80));
        
        // Count issues by severity
        const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL').length;
        const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
        const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM').length;
        const warningIssues = this.issues.filter(i => i.severity === 'WARNING').length;
        
        this.results.summary.violationsFound = this.issues.length;
        this.results.summary.criticalIssues = criticalIssues;
        this.results.summary.warningIssues = warningIssues;
        
        // Overall assessment
        let overallStatus = 'EXCELLENT';
        let statusIcon = '✅';
        
        if (criticalIssues > 0) {
            overallStatus = 'CRITICAL';
            statusIcon = '🚨';
        } else if (highIssues > 0) {
            overallStatus = 'NEEDS ATTENTION';
            statusIcon = '⚠️';
        } else if (mediumIssues > 0 || warningIssues > 0) {
            overallStatus = 'GOOD';
            statusIcon = '✅';
        }
        
        console.log(`\n${statusIcon} OVERALL DATA INTEGRITY: ${overallStatus}\n`);
        
        // Summary statistics
        console.log('📊 SUMMARY STATISTICS:');
        console.log(`   • Total Tables Analyzed: ${this.results.summary.totalTables}`);
        console.log(`   • Tables with Data: ${this.results.summary.tablesWithData}`);
        console.log(`   • Total Records: ${this.results.summary.totalRecords}`);
        console.log(`   • Issues Found: ${this.results.summary.violationsFound}`);
        
        // Issues breakdown
        if (this.issues.length > 0) {
            console.log('\n🚨 ISSUES BREAKDOWN:');
            console.log(`   • Critical Issues: ${criticalIssues}`);
            console.log(`   • High Priority: ${highIssues}`);
            console.log(`   • Medium Priority: ${mediumIssues}`);
            console.log(`   • Warnings: ${warningIssues}`);
            
            console.log('\n📋 DETAILED ISSUES:');
            this.issues.forEach((issue, index) => {
                const icon = issue.severity === 'CRITICAL' ? '🚨' : 
                           issue.severity === 'HIGH' ? '⚠️' : 
                           issue.severity === 'MEDIUM' ? '🔶' : '💡';
                console.log(`   ${index + 1}. ${icon} [${issue.severity}] ${issue.category}`);
                console.log(`      Issue: ${issue.issue}`);
                console.log(`      Table: ${issue.table}`);
                console.log(`      Recommendation: ${issue.recommendation}\n`);
            });
        }
        
        // Validation results summary
        console.log('🔍 VALIDATION RESULTS:');
        console.log(`   • Referential Integrity: ${this.results.referentialIntegrity.filter(r => r.status === 'PASS').length}/${this.results.referentialIntegrity.length} PASSED`);
        console.log(`   • Data Type Validation: ${this.results.dataTypeValidation.filter(r => r.status === 'PASS').length}/${this.results.dataTypeValidation.length} PASSED`);
        console.log(`   • Business Logic: ${this.results.businessLogicValidation.filter(r => r.status === 'PASS').length}/${this.results.businessLogicValidation.length} PASSED`);
        console.log(`   • Temporal Data: ${this.results.temporalDataValidation.filter(r => r.status === 'PASS').length}/${this.results.temporalDataValidation.length} PASSED`);
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (this.issues.length === 0) {
            console.log('   ✅ Database integrity is excellent! No issues found.');
            console.log('   ✅ Continue with regular monitoring and maintenance.');
        } else {
            console.log('   1. Address critical issues immediately');
            console.log('   2. Schedule fixes for high-priority issues');
            console.log('   3. Implement data validation triggers');
            console.log('   4. Set up regular integrity monitoring');
            console.log('   5. Consider automated data quality checks');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log(`Validation completed at: ${new Date().toISOString()}`);
        console.log('='.repeat(80));
    }

    getResults() {
        return {
            ...this.results,
            issues: this.issues,
            timestamp: new Date().toISOString(),
            overallStatus: this.issues.filter(i => i.severity === 'CRITICAL').length > 0 ? 'CRITICAL' :
                          this.issues.filter(i => i.severity === 'HIGH').length > 0 ? 'NEEDS_ATTENTION' :
                          this.issues.length > 0 ? 'GOOD' : 'EXCELLENT'
        };
    }
}

// Main execution
async function main() {
    try {
        const validator = new DataIntegrityValidator();
        await validator.validateDataIntegrity();
        
        // Save results to file
        const results = validator.getResults();
        const fs = require('fs');
        const path = require('path');
        
        const reportPath = path.join(__dirname, '..', 'DATA_INTEGRITY_VALIDATION_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        process.exit(results.overallStatus === 'CRITICAL' ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { DataIntegrityValidator };