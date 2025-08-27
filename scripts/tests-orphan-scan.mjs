#!/usr/bin/env node
/**
 * @fileoverview Test Orphan Scanner - Yetim testleri tespit eder ve arşivler
 * @version 1.0.0
 * @usage npm run tests:orphan-scan
 */

import { readFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { resolve, join, dirname, basename } from 'path';
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

class TestOrphanScanner {
  constructor() {
    this.testFiles = [];
    this.orphans = [];
    this.activeTests = [];
    this.errors = [];
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString().slice(11, 19);
    
    const formats = {
      error: `${colors.red}❌`,
      success: `${colors.green}✅`,
      warning: `${colors.yellow}⚠️ `,
      info: `${colors.blue}ℹ️ `,
      scan: `${colors.cyan}🔍`,
      orphan: `${colors.magenta}🏚️ `
    };

    console.log(`${formats[level]} [${timestamp}] ${message}${colors.reset}`);
    if (details) console.log(`   ${colors.blue}${details}${colors.reset}`);
  }

  // Discover all test files
  async discoverTestFiles() {
    this.log('scan', 'Discovering test files...');
    
    const patterns = [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{ts,tsx,js,jsx}'
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: PROJECT_ROOT,
        ignore: ['node_modules/**', '.git/**', 'coverage/**', 'dist/**', 'build/**']
      });
      this.testFiles.push(...files);
    }

    // Remove duplicates
    this.testFiles = [...new Set(this.testFiles)];
    
    this.log('info', `Found ${this.testFiles.length} test files`);
    return this.testFiles;
  }

  // Analyze a test file for orphan indicators
  async analyzeTestFile(testFile) {
    const filePath = resolve(PROJECT_ROOT, testFile);
    const analysis = {
      file: testFile,
      path: filePath,
      isOrphan: false,
      reasons: [],
      score: 0,
      imports: [],
      deadImports: [],
      lastModified: null,
      size: 0
    };

    try {
      // Get file stats
      const stats = statSync(filePath);
      analysis.lastModified = stats.mtime;
      analysis.size = stats.size;

      // Read and analyze content
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract import statements
      const importRegex = /(?:import|require)\s*\(?[^'"]*['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        analysis.imports.push(match[1]);
      }

      // Check for dead imports
      for (const importPath of analysis.imports) {
        if (this.isRelativeImport(importPath)) {
          const resolvedPath = this.resolveImport(testFile, importPath);
          if (!existsSync(resolvedPath)) {
            analysis.deadImports.push(importPath);
            analysis.score += 3; // Heavy penalty for dead imports
            analysis.reasons.push(`Dead import: ${importPath}`);
          }
        }
      }

      // Age analysis
      const ageInDays = (Date.now() - analysis.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 30) {
        analysis.score += 2;
        analysis.reasons.push(`Old test (${Math.floor(ageInDays)} days)`);
      }

      // Location analysis
      if (testFile.includes('src/') && testFile.includes('/__tests__/')) {
        analysis.score += 1;
        analysis.reasons.push('Located in src/__tests__ (potentially obsolete)');
      }

      // Content analysis
      const contentChecks = {
        'skip': /\.(skip|todo)\(/g,
        'comment': /^\s*\/\/.*test/gm,
        'empty': content.trim().length < 100,
        'placeholder': /TODO|FIXME|placeholder/gi.test(content)
      };

      if (contentChecks.skip.test(content)) {
        analysis.score += 2;
        analysis.reasons.push('Contains skipped tests');
      }

      if (contentChecks.empty) {
        analysis.score += 3;
        analysis.reasons.push('Very small file (likely incomplete)');
      }

      if (contentChecks.placeholder) {
        analysis.score += 1;
        analysis.reasons.push('Contains TODO/FIXME comments');
      }

      // Framework compatibility check
      if (!this.hasValidTestFramework(content)) {
        analysis.score += 2;
        analysis.reasons.push('No valid test framework detected');
      }

      // Determine if orphan
      analysis.isOrphan = analysis.score >= 4 || analysis.deadImports.length > 0;

    } catch (err) {
      this.errors.push({ file: testFile, error: err.message });
      this.log('error', `Cannot analyze: ${testFile}`, err.message);
    }

    return analysis;
  }

  // Check if import is relative
  isRelativeImport(importPath) {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  // Resolve relative import path
  resolveImport(testFile, importPath) {
    const testDir = dirname(resolve(PROJECT_ROOT, testFile));
    let resolvedPath = resolve(testDir, importPath);
    
    // Try common extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext;
      if (existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    // Try index files
    for (const ext of ['ts', 'tsx', 'js', 'jsx']) {
      const indexPath = join(resolvedPath, `index.${ext}`);
      if (existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return resolvedPath;
  }

  // Check if file has valid test framework imports/usage
  hasValidTestFramework(content) {
    const frameworks = [
      'jest', 'vitest', 'mocha', 'jasmine', '@testing-library',
      'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach'
    ];
    
    return frameworks.some(framework => content.includes(framework));
  }

  // Generate archive operations
  generateArchiveOperations() {
    const operations = [];
    
    for (const orphan of this.orphans) {
      const filename = basename(orphan.file);
      const archiveDir = 'tests/archive/orphans';
      const targetPath = join(archiveDir, filename);
      
      operations.push({
        action: 'ARCHIVE',
        source: orphan.file,
        target: targetPath,
        reasons: orphan.reasons,
        score: orphan.score,
        deadImports: orphan.deadImports
      });
    }
    
    return operations;
  }

  // Execute archive operations
  async executeArchive(operations) {
    if (operations.length === 0) {
      this.log('success', 'No orphan tests found - all tests appear active!');
      return;
    }

    this.log('info', `${DRY_RUN ? 'Planning' : 'Executing'} ${operations.length} archive operations...`);

    // Create archive directory
    const archiveDir = resolve(PROJECT_ROOT, 'tests/archive/orphans');
    if (!existsSync(archiveDir)) {
      if (!DRY_RUN) {
        mkdirSync(archiveDir, { recursive: true });
        this.log('success', 'Created archive directory: tests/archive/orphans');
      } else {
        this.log('info', 'Would create archive directory: tests/archive/orphans');
      }
    }

    // Execute moves
    for (const operation of operations) {
      try {
        if (!DRY_RUN) {
          execSync(`git mv "${operation.source}" "${operation.target}"`, {
            cwd: PROJECT_ROOT,
            stdio: 'pipe'
          });
          this.log('success', `Archived: ${operation.source} → ${operation.target}`);
        } else {
          this.log('info', `Would archive: ${operation.source} → ${operation.target}`);
        }
        
        console.log(`   Reasons: ${operation.reasons.join(', ')}`);
        if (operation.deadImports.length > 0) {
          console.log(`   Dead imports: ${operation.deadImports.join(', ')}`);
        }
        
      } catch (err) {
        this.errors.push({ operation, error: err.message });
        this.log('error', `Failed to archive: ${operation.source}`, err.message);
      }
    }
  }

  // Generate report
  generateReport() {
    const activeCount = this.activeTests.length;
    const orphanCount = this.orphans.length;
    const totalCount = this.testFiles.length;

    console.log(`\n${colors.bold}📊 Test Orphan Scan Results:${colors.reset}`);
    console.log(`${colors.blue}Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTION'}${colors.reset}`);
    console.log(`${colors.green}✅ Active Tests: ${activeCount}${colors.reset}`);
    console.log(`${colors.magenta}🏚️  Orphan Tests: ${orphanCount}${colors.reset}`);
    console.log(`${colors.cyan}📊 Total Analyzed: ${totalCount}${colors.reset}`);
    console.log(`${colors.red}❌ Errors: ${this.errors.length}${colors.reset}`);

    if (orphanCount > 0) {
      console.log(`\n${colors.bold}Orphan Test Details:${colors.reset}`);
      this.orphans.forEach((orphan, index) => {
        console.log(`\n${index + 1}. ${colors.magenta}${orphan.file}${colors.reset}`);
        console.log(`   Score: ${orphan.score}/10`);
        console.log(`   Age: ${Math.floor((Date.now() - orphan.lastModified.getTime()) / (1000 * 60 * 60 * 24))} days`);
        console.log(`   Size: ${Math.floor(orphan.size / 1024)}KB`);
        console.log(`   Reasons: ${orphan.reasons.join(', ')}`);
        if (orphan.deadImports.length > 0) {
          console.log(`   Dead Imports: ${orphan.deadImports.join(', ')}`);
        }
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}Analysis Errors:${colors.reset}`);
      this.errors.forEach(({ file, error }) => {
        console.log(`  ${file}: ${error}`);
      });
    }

    console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
    if (DRY_RUN && orphanCount > 0) {
      console.log(`${colors.green}1. Review the orphan tests above${colors.reset}`);
      console.log(`${colors.green}2. Run with DRY_RUN=false to archive: DRY_RUN=false npm run tests:orphan-scan${colors.reset}`);
    } else if (!DRY_RUN && orphanCount > 0) {
      console.log(`${colors.green}1. Verify archived tests don't contain important logic${colors.reset}`);
      console.log(`${colors.green}2. Commit changes: git add . && git commit -m "test: archive orphan tests"${colors.reset}`);
    } else {
      console.log(`${colors.green}✨ All tests appear to be active and healthy!${colors.reset}`);
    }
  }

  // Main runner
  async run() {
    console.log(`${colors.bold}${colors.cyan}🧪 Test Orphan Scanner${colors.reset}`);
    console.log(`${colors.cyan}Mode: ${DRY_RUN ? 'SCAN ONLY' : 'SCAN & ARCHIVE'}${colors.reset}\n`);

    await this.discoverTestFiles();

    this.log('scan', 'Analyzing test files for orphan indicators...');
    
    for (const testFile of this.testFiles) {
      const analysis = await this.analyzeTestFile(testFile);
      
      if (analysis.isOrphan) {
        this.orphans.push(analysis);
        this.log('orphan', `Found orphan: ${testFile}`, `Score: ${analysis.score}, Reasons: ${analysis.reasons.join(', ')}`);
      } else {
        this.activeTests.push(analysis);
      }
    }

    const operations = this.generateArchiveOperations();
    await this.executeArchive(operations);
    
    this.generateReport();

    return this.errors.length > 0 ? 1 : 0;
  }
}

// Run the scanner
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new TestOrphanScanner();
  const exitCode = await scanner.run();
  process.exit(exitCode);
}