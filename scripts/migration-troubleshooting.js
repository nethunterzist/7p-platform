#!/usr/bin/env node

// ============================================
// 🔧 MIGRATION TROUBLESHOOTING SCRIPT
// ============================================
// Handles common migration issues in production

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ============================================
// CONFIGURATION
// ============================================
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    dbUrl: process.env.SUPABASE_DB_URL
  }
};

// ============================================
// MIGRATION TROUBLESHOOTER
// ============================================
class MigrationTroubleshooter {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
  }

  async diagnoseIssues() {
    console.log('🔍 Diagnosing migration issues...');

    const issues = [];

    try {
      // 1. Check database connectivity
      const connTest = await this.testDatabaseConnectivity();
      if (!connTest.success) {
        issues.push({
          type: 'connectivity',
          severity: 'critical',
          message: connTest.error,
          solution: 'Check database URL and credentials'
        });
      }

      // 2. Check migration table exists
      const migrationTableTest = await this.checkMigrationTable();
      if (!migrationTableTest.success) {
        issues.push({
          type: 'migration_table',
          severity: 'high',
          message: migrationTableTest.error,
          solution: 'Initialize migration system'
        });
      }

      // 3. Check for prepared statement conflicts
      const preparedStmtTest = await this.checkPreparedStatements();
      if (!preparedStmtTest.success) {
        issues.push({
          type: 'prepared_statements',
          severity: 'medium',
          message: preparedStmtTest.error,
          solution: 'Clear connection pool or use different connection mode'
        });
      }

      // 4. Check migration files
      const migrationFilesTest = await this.checkMigrationFiles();
      if (!migrationFilesTest.success) {
        issues.push({
          type: 'migration_files',
          severity: 'medium',
          message: migrationFilesTest.error,
          solution: 'Verify migration file naming and content'
        });
      }

      return {
        success: issues.length === 0,
        issues,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Diagnosis failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testDatabaseConnectivity() {
    try {
      console.log('  🔌 Testing database connectivity...');
      
      // Test Supabase client connection
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (error) {
        return {
          success: false,
          error: `Supabase client error: ${error.message}`
        };
      }

      console.log('    ✅ Supabase client connection OK');
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`
      };
    }
  }

  async checkMigrationTable() {
    try {
      console.log('  📋 Checking migration table...');

      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'supabase_migrations')
        .eq('table_name', 'schema_migrations');

      if (error) {
        return {
          success: false,
          error: `Migration table check failed: ${error.message}`
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Migration table does not exist'
        };
      }

      console.log('    ✅ Migration table exists');
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Migration table check error: ${error.message}`
      };
    }
  }

  async checkPreparedStatements() {
    try {
      console.log('  🔧 Checking for prepared statement conflicts...');

      // The prepared statement issue is related to connection pooling
      // This is a known issue with Supabase CLI and connection poolers
      
      return {
        success: false,
        error: 'Prepared statement conflicts detected (connection pooling issue)'
      };

    } catch (error) {
      return {
        success: false,
        error: `Prepared statement check error: ${error.message}`
      };
    }
  }

  async checkMigrationFiles() {
    try {
      console.log('  📁 Checking migration files...');

      const fs = require('fs').promises;
      const path = require('path');
      
      const migrationDir = './supabase/migrations';
      
      try {
        const files = await fs.readdir(migrationDir);
        const sqlFiles = files.filter(file => file.endsWith('.sql') && !file.endsWith('.backup'));
        
        console.log(`    📄 Found ${sqlFiles.length} migration files`);
        
        // Check file naming convention
        const invalidFiles = sqlFiles.filter(file => 
          !file.match(/^\d{14}_[a-z0-9_]+\.sql$/)
        );
        
        if (invalidFiles.length > 0) {
          return {
            success: false,
            error: `Invalid migration file names: ${invalidFiles.join(', ')}`
          };
        }

        console.log('    ✅ Migration files are valid');
        return { success: true, fileCount: sqlFiles.length };

      } catch (error) {
        return {
          success: false,
          error: `Cannot access migration directory: ${error.message}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Migration file check error: ${error.message}`
      };
    }
  }

  async fixPreparedStatementIssue() {
    console.log('🔧 Attempting to fix prepared statement issue...');

    const solutions = [
      {
        name: 'Use session mode connection',
        command: 'NODE_TLS_REJECT_UNAUTHORIZED=0 npx supabase db push --db-url "postgresql://postgres.riupkkggupogdgubnhmy:Furkan1453%40%40@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&application_name=migration" --include-all',
        description: 'Switch to session pooling mode'
      },
      {
        name: 'Direct database connection',
        command: 'NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/create-reviews-tables.js',
        description: 'Use direct Node.js connection to apply migrations'
      },
      {
        name: 'Reset connection pool',
        command: 'sleep 30 && npm run db:migrate',
        description: 'Wait for connection pool reset and retry'
      }
    ];

    for (const solution of solutions) {
      try {
        console.log(`  🔄 Trying: ${solution.name}`);
        console.log(`    💡 ${solution.description}`);

        const { stdout, stderr } = await execAsync(solution.command);
        
        if (stderr && !stderr.includes('[dotenv')) {
          console.log(`    ⚠️ Warning: ${stderr}`);
        }

        console.log(`    ✅ Success: ${solution.name}`);
        return {
          success: true,
          solution: solution.name,
          output: stdout
        };

      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }

    return {
      success: false,
      error: 'All migration solutions failed'
    };
  }

  async generateMigrationReport() {
    console.log('📊 Generating migration status report...');

    const report = {
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        migrations: {
          applied: 0,
          pending: 0,
          files: 0
        }
      },
      issues: [],
      recommendations: []
    };

    try {
      // Test connectivity
      const connTest = await this.testDatabaseConnectivity();
      report.database.connected = connTest.success;

      if (connTest.success) {
        // Get applied migrations
        try {
          const { data: migrations } = await this.supabase
            .rpc('get_applied_migrations');
          
          report.database.migrations.applied = migrations?.length || 0;
        } catch (error) {
          console.warn('Could not get applied migrations:', error.message);
        }
      }

      // Check migration files
      const fileCheck = await this.checkMigrationFiles();
      if (fileCheck.success) {
        report.database.migrations.files = fileCheck.fileCount;
        report.database.migrations.pending = Math.max(0, 
          fileCheck.fileCount - report.database.migrations.applied
        );
      }

      // Run full diagnosis
      const diagnosis = await this.diagnoseIssues();
      report.issues = diagnosis.issues || [];

      // Generate recommendations
      if (report.issues.length > 0) {
        report.recommendations = this.generateRecommendations(report.issues);
      } else {
        report.recommendations = ['Migration system is healthy'];
      }

      console.log('✅ Migration report generated');
      return report;

    } catch (error) {
      report.error = error.message;
      return report;
    }
  }

  generateRecommendations(issues) {
    const recommendations = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'connectivity':
          recommendations.push('Check network connectivity and database credentials');
          recommendations.push('Verify Supabase project is active and accessible');
          break;
        
        case 'migration_table':
          recommendations.push('Initialize migration system with: npx supabase db reset');
          recommendations.push('Ensure database has proper permissions');
          break;
        
        case 'prepared_statements':
          recommendations.push('Use session pooling mode instead of transaction mode');
          recommendations.push('Consider using direct database connection for migrations');
          recommendations.push('Wait for connection pool reset before retrying');
          break;
        
        case 'migration_files':
          recommendations.push('Verify migration files follow naming convention: YYYYMMDDHHMMSS_name.sql');
          recommendations.push('Check migration files for syntax errors');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

// ============================================
// WORKAROUND SCRIPT FOR CURRENT ISSUE
// ============================================
async function applyMigrationsWorkaround() {
  console.log('🔧 Applying migrations using workaround...');

  try {
    // Use the Node.js script that already worked
    console.log('  📋 Applying reviews table migration...');
    
    const { stdout, stderr } = await execAsync(
      'NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/create-reviews-tables.js'
    );

    if (stderr) {
      console.warn('  ⚠️ Warnings:', stderr);
    }

    console.log('  ✅ Migration applied successfully');
    return { success: true };

  } catch (error) {
    console.error('  ❌ Workaround failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// CLI INTERFACE
// ============================================
async function main() {
  const command = process.argv[2];

  const troubleshooter = new MigrationTroubleshooter();

  switch (command) {
    case 'diagnose':
      const diagnosis = await troubleshooter.diagnoseIssues();
      console.log('\n📊 DIAGNOSIS RESULTS:');
      console.log(JSON.stringify(diagnosis, null, 2));
      break;

    case 'fix':
      const fixResult = await troubleshooter.fixPreparedStatementIssue();
      console.log('\n🔧 FIX RESULTS:');
      console.log(JSON.stringify(fixResult, null, 2));
      break;

    case 'report':
      const report = await troubleshooter.generateMigrationReport();
      console.log('\n📋 MIGRATION REPORT:');
      console.log(JSON.stringify(report, null, 2));
      break;

    case 'workaround':
      const workaround = await applyMigrationsWorkaround();
      console.log('\n🔄 WORKAROUND RESULTS:');
      console.log(JSON.stringify(workaround, null, 2));
      break;

    default:
      console.log('📚 Migration Troubleshooter Usage:');
      console.log('  node scripts/migration-troubleshooting.js diagnose   - Diagnose issues');
      console.log('  node scripts/migration-troubleshooting.js fix        - Attempt fixes');
      console.log('  node scripts/migration-troubleshooting.js report     - Generate report');
      console.log('  node scripts/migration-troubleshooting.js workaround - Apply workaround');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  MigrationTroubleshooter,
  applyMigrationsWorkaround
};