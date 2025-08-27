#!/usr/bin/env node
/**
 * Environment Report - process.env kullanımlarını docs/ENVIRONMENT.md ile karşılaştırır
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { glob } from 'glob';

const PROJECT_ROOT = process.cwd();
const ENV_DOC_FILE = join(PROJECT_ROOT, 'docs/ENVIRONMENT.md');

const colors = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m'
};

class EnvironmentReporter {
  constructor() {
    this.envUsages = new Map();
    this.documentedVars = new Set();
    this.errors = [];
  }

  log(level, message, details = null) {
    const colorMap = { info: colors.blue, success: colors.green, warning: colors.yellow, error: colors.red, scan: colors.cyan };
    console.log(`${colorMap[level]}[ENV] ${message}${colors.reset}`);
    if (details) console.log(`   ${colors.blue}${details}${colors.reset}`);
  }

  async scanEnvironmentUsage() {
    this.log('scan', 'Scanning source files for environment variable usage...');
    try {
      const sourceFiles = await glob('**/*.{ts,tsx,js,jsx,mjs}', {
        cwd: PROJECT_ROOT,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', 'coverage/**']
      });

      for (const file of sourceFiles) {
        await this.analyzeFile(file);
      }
      this.log('success', `Scanned ${sourceFiles.length} files`);
    } catch (err) {
      this.errors.push(`File scanning error: ${err.message}`);
      this.log('error', `Failed to scan files: ${err.message}`);
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = readFileSync(resolve(PROJECT_ROOT, filePath), 'utf-8');
      const envRegex = /process\.env\.([A-Z][A-Z0-9_]*)/g;
      let match;
      
      while ((match = envRegex.exec(content)) !== null) {
        const varName = match[1];
        if (!this.envUsages.has(varName)) {
          this.envUsages.set(varName, { files: [], required: false, context: [] });
        }
        
        const usage = this.envUsages.get(varName);
        if (!usage.files.includes(filePath)) {
          usage.files.push(filePath);
        }

        const line = this.getLineContaining(content, match.index);
        const hasDefault = /\|\|\s*['"`]/.test(line) || /\?\?\s*['"`]/.test(line);
        
        if (!hasDefault) {
          usage.required = true;
        }

        usage.context.push({ file: filePath, line: line.trim(), hasDefault: hasDefault });
      }
    } catch (err) {
      this.errors.push(`Cannot analyze file ${filePath}: ${err.message}`);
    }
  }

  getLineContaining(content, index) {
    const lines = content.split('\n');
    let currentIndex = 0;
    for (const line of lines) {
      if (currentIndex + line.length >= index) {
        return line;
      }
      currentIndex += line.length + 1;
    }
    return '';
  }

  parseDocumentedVariables() {
    this.log('scan', 'Parsing documented environment variables...');
    if (!existsSync(ENV_DOC_FILE)) {
      this.log('warning', 'docs/ENVIRONMENT.md not found');
      return;
    }

    try {
      const content = readFileSync(ENV_DOC_FILE, 'utf-8');
      const envVarPatterns = [
        /^-?\s*\*?\*?`([A-Z][A-Z0-9_]*)`/gm,
        /^\|\s*`([A-Z][A-Z0-9_]*)`/gm,
        /^#{1,6}\s+([A-Z][A-Z0-9_]*)/gm,
        /\*\*([A-Z][A-Z0-9_]*)\*\*/gm
      ];

      envVarPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          this.documentedVars.add(match[1]);
        }
      });

      this.log('success', `Found ${this.documentedVars.size} documented environment variables`);
    } catch (err) {
      this.errors.push(`Cannot parse ENVIRONMENT.md: ${err.message}`);
      this.log('error', `Failed to parse environment documentation: ${err.message}`);
    }
  }

  generateReport() {
    const usedVars = Array.from(this.envUsages.keys()).sort();
    const documentedVars = Array.from(this.documentedVars).sort();
    const undocumented = usedVars.filter(v => !this.documentedVars.has(v));
    const unused = documentedVars.filter(v => !this.envUsages.has(v));
    const requiredVars = usedVars.filter(v => this.envUsages.get(v).required);

    console.log(`\n${colors.bold}📊 Environment Variables Report:${colors.reset}\n`);
    console.log(`${colors.cyan}📈 Summary Statistics:${colors.reset}`);
    console.log(`  Total Used: ${usedVars.length}`);
    console.log(`  Documented: ${documentedVars.length}`);
    console.log(`  Required: ${requiredVars.length}`);
    console.log(`  Undocumented: ${undocumented.length}`);
    console.log(`  Unused Documented: ${unused.length}`);
    
    if (usedVars.length > 0) {
      console.log(`\n${colors.green}✅ Used Environment Variables (${usedVars.length}):${colors.reset}`);
      usedVars.forEach((varName, index) => {
        const usage = this.envUsages.get(varName);
        const requiredIcon = usage.required ? '🔴' : '🟢';
        const documentedIcon = this.documentedVars.has(varName) ? '📝' : '❓';
        
        console.log(`\n${index + 1}. ${colors.bold}${varName}${colors.reset} ${requiredIcon} ${documentedIcon}`);
        console.log(`   Files: ${usage.files.length}`);
        console.log(`   Required: ${usage.required ? 'Yes' : 'No'}`);
        console.log(`   Documented: ${this.documentedVars.has(varName) ? 'Yes' : 'No'}`);
        
        if (usage.files.length <= 3) {
          usage.files.forEach(file => {
            console.log(`     • ${colors.blue}${file}${colors.reset}`);
          });
        } else {
          console.log(`     • ${colors.blue}${usage.files.slice(0, 2).join(', ')} and ${usage.files.length - 2} more...${colors.reset}`);
        }
      });
    }

    if (undocumented.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Undocumented Variables (${undocumented.length}):${colors.reset}`);
      undocumented.forEach((varName, index) => {
        const usage = this.envUsages.get(varName);
        console.log(`${index + 1}. ${colors.bold}${varName}${colors.reset} ${usage.required ? '🔴 Required' : '🟢 Optional'}`);
        console.log(`   Used in: ${usage.files.slice(0, 2).join(', ')}${usage.files.length > 2 ? '...' : ''}`);
      });
      console.log(`\n${colors.yellow}💡 Recommendation: Add these variables to docs/ENVIRONMENT.md${colors.reset}`);
    }

    if (unused.length > 0) {
      console.log(`\n${colors.magenta}🔍 Unused Documented Variables (${unused.length}):${colors.reset}`);
      unused.forEach((varName, index) => {
        console.log(`${index + 1}. ${colors.bold}${varName}${colors.reset}`);
      });
      console.log(`\n${colors.magenta}💡 These may be legacy variables or used in deployment configs${colors.reset}`);
    }

    const criticalUndocumented = undocumented.filter(v => this.envUsages.get(v).required);
    if (criticalUndocumented.length > 0) {
      console.log(`\n${colors.red}🚨 Critical: Required but Undocumented (${criticalUndocumented.length}):${colors.reset}`);
      criticalUndocumented.forEach((varName, index) => {
        const usage = this.envUsages.get(varName);
        console.log(`${index + 1}. ${colors.bold}${colors.red}${varName}${colors.reset}`);
        console.log(`   Files: ${usage.files.join(', ')}`);
        if (usage.context.length > 0) {
          console.log(`   Context: ${usage.context[0].line.slice(0, 60)}...`);
        }
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}❌ Errors (${this.errors.length}):${colors.reset}`);
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const hasIssues = criticalUndocumented.length > 0 || this.errors.length > 0;
    
    console.log(`\n${colors.bold}🎯 Next Steps:${colors.reset}`);
    if (undocumented.length > 0) {
      console.log(`${colors.yellow}1. Add undocumented variables to docs/ENVIRONMENT.md${colors.reset}`);
    }
    if (unused.length > 0) {
      console.log(`${colors.blue}2. Review if unused documented variables are still needed${colors.reset}`);
    }
    if (criticalUndocumented.length === 0 && undocumented.length === 0) {
      console.log(`${colors.green}✨ Environment documentation is up to date!${colors.reset}`);
    }

    return hasIssues ? 1 : 0;
  }

  async run() {
    console.log(`${colors.bold}${colors.cyan}🌍 Environment Variables Report Generator${colors.reset}\n`);
    await this.scanEnvironmentUsage();
    this.parseDocumentedVariables();
    const exitCode = this.generateReport();
    return exitCode;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new EnvironmentReporter();
  const exitCode = await reporter.run();
  process.exit(exitCode);
}