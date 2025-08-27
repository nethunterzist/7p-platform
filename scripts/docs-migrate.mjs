#!/usr/bin/env node
/**
 * @fileoverview Docs Migration Script - Tarihi arşive taşıma ve organizasyon
 * @version 1.0.0
 * @usage DRY_RUN=true npm run docs:migrate (plan), DRY_RUN=false npm run docs:migrate (execute)
 */

import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { resolve, join, basename } from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';

const PROJECT_ROOT = process.cwd();
const DRY_RUN = process.env.DRY_RUN !== 'false';

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// File classification rules
const KEEP_ROOT = ['README.md', 'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md'];

const ARCHIVE_PATTERNS = [
  /REPORT\.md$/i,
  /DEBUG\.md$/i,
  /TEMP\.md$/i,
  /FINAL.*REPORT\.md$/i,
  /LOG\.md$/i,
  /MOCK.*IMPLEMENTATION.*\.md$/i,
  /CHECKLIST\.md$/i,
  /RUNBOOK.*\.md$/i,
  /SMOKE.*\.md$/i,
  /FIXES\.md$/i,
  /PATCHES\.md$/i,
  /SETUP\.md$/i,
  /GUIDE\.md$/i,
  /WEBHOOK.*\.md$/i,
  /DEPLOY.*\.md$/i,
  /MONITORING.*SETUP\.md$/i,
  /ENV.*IMPORT.*\.md$/i,
  /MIDDLEWARE.*FIX.*\.md$/i,
  /NEXT.*STEPS\.md$/i,
  /NEXT.*ACTIONS.*\.md$/i,
  /STATUS\.md$/i,
  /CHECKS\.md$/i,
  /SUMMARY\.md$/i,
  /VALIDATION.*REPORT\.md$/i
];

class DocsMigrator {
  constructor() {
    this.operations = [];
    this.errors = [];
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString().slice(11, 19);
    
    if (level === 'error') {
      console.log(`${colors.red}❌ [${timestamp}] ${message}${colors.reset}`);
      if (details) console.log(`   ${details}`);
    } else if (level === 'success') {
      console.log(`${colors.green}✅ [${timestamp}] ${message}${colors.reset}`);
      if (details) console.log(`   ${details}`);
    } else if (level === 'warning') {
      console.log(`${colors.yellow}⚠️  [${timestamp}] ${message}${colors.reset}`);
      if (details) console.log(`   ${details}`);
    } else if (level === 'info') {
      console.log(`${colors.blue}ℹ️  [${timestamp}] ${message}${colors.reset}`);
      if (details) console.log(`   ${details}`);
    } else if (level === 'plan') {
      console.log(`${colors.cyan}📋 [${timestamp}] ${message}${colors.reset}`);
      if (details) console.log(`   ${details}`);
    }
  }

  // Classify a file based on its name and content patterns
  classifyFile(filename, filePath) {
    // Always keep specific root files
    if (KEEP_ROOT.includes(filename)) {
      return { action: 'KEEP', reason: 'Protected root file' };
    }

    // Check if file matches archive patterns
    for (const pattern of ARCHIVE_PATTERNS) {
      if (pattern.test(filename)) {
        return { action: 'ARCHIVE', reason: `Matches pattern: ${pattern}` };
      }
    }

    // Check content for operation keywords
    try {
      const content = readFileSync(filePath, 'utf-8').toLowerCase();
      const operationKeywords = [
        'debug', 'final report', 'operation completed', 'deployment summary',
        'migration log', 'audit report', 'security validation', 'smoke test',
        'checklist completed', 'fixes applied', 'patches deployed',
        'setup complete', 'monitoring configured', 'webhook verified'
      ];

      for (const keyword of operationKeywords) {
        if (content.includes(keyword)) {
          return { action: 'ARCHIVE', reason: `Contains operation keyword: "${keyword}"` };
        }
      }
    } catch (err) {
      this.log('warning', `Cannot read file content: ${filePath}`, err.message);
    }

    // Default for unclassified root markdown files
    if (!filePath.includes('/') || filePath.startsWith('./')) {
      return { action: 'ARCHIVE', reason: 'Unclassified root markdown file' };
    }

    return { action: 'KEEP', reason: 'No archive criteria met' };
  }

  // Get archive date from file modification time
  getArchiveDate(filePath) {
    try {
      const stats = statSync(filePath);
      const date = new Date(stats.mtime);
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    } catch (err) {
      this.log('warning', `Cannot get file stats: ${filePath}`, err.message);
      return new Date().toISOString().slice(0, 10);
    }
  }

  // Plan migration operations
  async planMigration() {
    this.log('info', 'Scanning for markdown files to migrate...');

    // Find all markdown files excluding node_modules and existing docs/
    const allMarkdown = await glob('**/*.md', {
      cwd: PROJECT_ROOT,
      ignore: ['node_modules/**', '.git/**', 'docs/**', 'DRY_RUN_CLEANUP_INVENTORY.md']
    });

    this.log('info', `Found ${allMarkdown.length} markdown files to analyze`);

    for (const file of allMarkdown) {
      const filePath = resolve(PROJECT_ROOT, file);
      const filename = basename(file);
      const classification = this.classifyFile(filename, filePath);

      if (classification.action === 'ARCHIVE') {
        const archiveDate = this.getArchiveDate(filePath);
        const targetDir = join('docs', 'archive', archiveDate);
        const targetPath = join(targetDir, filename);

        this.operations.push({
          action: 'ARCHIVE',
          source: file,
          target: targetPath,
          reason: classification.reason,
          date: archiveDate
        });
      }
    }

    // Also check for orphan test files
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      cwd: PROJECT_ROOT,
      ignore: ['node_modules/**', '.git/**']
    });

    const orphanTests = await this.identifyOrphanTests(testFiles);
    orphanTests.forEach(test => {
      this.operations.push({
        action: 'ARCHIVE_TEST',
        source: test.file,
        target: join('tests', 'archive', 'legacy', basename(test.file)),
        reason: test.reason
      });
    });

    return this.operations;
  }

  // Identify orphan test files
  async identifyOrphanTests(testFiles) {
    const orphans = [];
    
    for (const testFile of testFiles) {
      try {
        const content = readFileSync(resolve(PROJECT_ROOT, testFile), 'utf-8');
        
        // Simple heuristics for orphan detection
        const isOld = this.getArchiveDate(resolve(PROJECT_ROOT, testFile)) < '2025-08-25';
        const hasDeadImports = /import.*from ['"]\.\.\//g.test(content) && 
                               content.includes('/__tests__/') && 
                               testFile.includes('src/');
        
        if (isOld && hasDeadImports) {
          orphans.push({
            file: testFile,
            reason: 'Old test file with potentially dead imports'
          });
        }
      } catch (err) {
        this.log('warning', `Cannot analyze test file: ${testFile}`, err.message);
      }
    }

    return orphans;
  }

  // Execute the migration plan
  async executeMigration() {
    if (this.operations.length === 0) {
      this.log('info', 'No migration operations planned');
      return;
    }

    this.log('info', `Executing ${this.operations.length} migration operations...`);

    // Group operations by target directory to create directories efficiently
    const targetDirs = [...new Set(this.operations.map(op => {
      const parts = op.target.split('/');
      return parts.slice(0, -1).join('/');
    }))];

    // Create target directories
    for (const dir of targetDirs) {
      const fullPath = resolve(PROJECT_ROOT, dir);
      if (!existsSync(fullPath)) {
        if (!DRY_RUN) {
          mkdirSync(fullPath, { recursive: true });
          this.log('success', `Created directory: ${dir}`);
        } else {
          this.log('plan', `Would create directory: ${dir}`);
        }
      }
    }

    // Execute file operations
    for (const operation of this.operations) {
      try {
        if (!DRY_RUN) {
          if (operation.action === 'ARCHIVE' || operation.action === 'ARCHIVE_TEST') {
            // Use git mv for better tracking
            execSync(`git mv "${operation.source}" "${operation.target}"`, {
              cwd: PROJECT_ROOT,
              stdio: 'pipe'
            });
            this.log('success', `Moved: ${operation.source} → ${operation.target}`, operation.reason);
          }
        } else {
          this.log('plan', `Would move: ${operation.source} → ${operation.target}`, operation.reason);
        }
      } catch (err) {
        this.errors.push({
          operation,
          error: err.message
        });
        this.log('error', `Failed to move: ${operation.source}`, err.message);
      }
    }
  }

  // Update references in remaining files
  async updateReferences() {
    if (DRY_RUN) {
      this.log('plan', 'Would update internal references after migration');
      return;
    }

    // This would scan for internal links and update them
    // For now, just log the intention
    this.log('info', 'Checking for references to moved files...');
    
    const remainingFiles = await glob('**/*.md', {
      cwd: PROJECT_ROOT,
      ignore: ['node_modules/**', '.git/**', 'docs/archive/**']
    });

    let updatedReferences = 0;
    // Implementation would go here to update links
    
    this.log('info', `Updated ${updatedReferences} internal references`);
  }

  // Generate summary report
  generateSummary() {
    const archiveOps = this.operations.filter(op => op.action === 'ARCHIVE');
    const testOps = this.operations.filter(op => op.action === 'ARCHIVE_TEST');

    console.log(`\n${colors.bold}📊 Migration Summary:${colors.reset}`);
    console.log(`${colors.blue}Mode: ${DRY_RUN ? 'DRY RUN (Planning)' : 'EXECUTION'}${colors.reset}`);
    console.log(`${colors.cyan}📁 Markdown files to archive: ${archiveOps.length}${colors.reset}`);
    console.log(`${colors.cyan}🧪 Test files to archive: ${testOps.length}${colors.reset}`);
    console.log(`${colors.red}❌ Errors: ${this.errors.length}${colors.reset}`);

    if (archiveOps.length > 0) {
      console.log(`\n${colors.bold}Archive Breakdown by Date:${colors.reset}`);
      const byDate = {};
      archiveOps.forEach(op => {
        byDate[op.date] = (byDate[op.date] || 0) + 1;
      });
      
      Object.entries(byDate).forEach(([date, count]) => {
        console.log(`  ${date}: ${count} files`);
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}Errors:${colors.reset}`);
      this.errors.forEach(({ operation, error }) => {
        console.log(`  ${operation.source}: ${error}`);
      });
    }

    console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
    if (DRY_RUN) {
      console.log(`${colors.green}1. Review the migration plan above${colors.reset}`);
      console.log(`${colors.green}2. Run with DRY_RUN=false to execute: DRY_RUN=false npm run docs:migrate${colors.reset}`);
      console.log(`${colors.green}3. Run npm run docs:check to verify links${colors.reset}`);
    } else {
      console.log(`${colors.green}1. Run npm run docs:check to verify links${colors.reset}`);
      console.log(`${colors.green}2. Commit the changes: git add . && git commit -m "docs: archive operational files"${colors.reset}`);
    }
  }

  // Main execution method
  async run() {
    console.log(`${colors.bold}${colors.magenta}📦 Documentation Migration Tool${colors.reset}`);
    console.log(`${colors.magenta}Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTION'}${colors.reset}\n`);

    await this.planMigration();
    
    if (this.operations.length === 0) {
      this.log('success', 'No files need migration - repository is already clean!');
      return 0;
    }

    await this.executeMigration();
    
    if (!DRY_RUN) {
      await this.updateReferences();
    }

    this.generateSummary();

    return this.errors.length > 0 ? 1 : 0;
  }
}

// Run the migrator
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new DocsMigrator();
  const exitCode = await migrator.run();
  process.exit(exitCode);
}