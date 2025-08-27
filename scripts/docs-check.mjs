#!/usr/bin/env node

/**
 * Documentation Link Checker and Validation
 * Checks all markdown files in docs/ for broken links and proper heading hierarchy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

let hasErrors = false;

console.log('🔍 Checking documentation links and structure...\n');

/**
 * Get all markdown files in docs directory
 */
function getMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip archive directories as they contain historical files
      if (entry.name === 'archive') {
        continue;
      }
      getMarkdownFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract markdown links from content
 */
function extractLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, text, url] = match;
    links.push({ text, url, fullMatch });
  }
  
  return links;
}

/**
 * Extract headings from content
 */
function extractHeadings(content) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const [fullMatch, hashes, text] = match;
    headings.push({ level: hashes.length, text: text.trim(), fullMatch });
  }
  
  return headings;
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Validate internal links
 */
function validateInternalLinks(filePath, links) {
  const fileDir = path.dirname(filePath);
  const errors = [];
  
  for (const link of links) {
    const { url, text } = link;
    
    // Skip external links
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      continue;
    }
    
    // Skip anchors only (same page)
    if (url.startsWith('#')) {
      continue;
    }
    
    // Skip false positive patterns (code examples, not real links)
    const falsePositivePatterns = [
      /^value$/,
      /^etc\|proc\|sys\|root\|home\|var\|usr\|opt\|tmp$/,
      /^windows\|winnt\|system32\|syswow64$/
    ];
    
    if (falsePositivePatterns.some(pattern => pattern.test(url))) {
      continue;
    }
    
    // Resolve relative path
    let targetPath;
    if (url.startsWith('./')) {
      targetPath = path.resolve(fileDir, url);
    } else if (url.startsWith('../')) {
      targetPath = path.resolve(fileDir, url);
    } else if (url.startsWith('/')) {
      // Absolute path from root
      targetPath = path.join(ROOT_DIR, url.substring(1));
    } else {
      // Relative from current directory
      targetPath = path.resolve(fileDir, url);
    }
    
    // Remove anchor from path
    const [filePart] = targetPath.split('#');
    
    if (!fileExists(filePart)) {
      errors.push(`❌ Broken link: "${text}" -> ${url} (resolved to: ${filePart})`);
    }
  }
  
  return errors;
}

/**
 * Validate heading hierarchy
 */
function validateHeadingHierarchy(headings) {
  const errors = [];
  let previousLevel = 0;
  
  for (let i = 0; i < headings.length; i++) {
    const { level, text } = headings[i];
    
    // First heading should be H1
    if (i === 0 && level !== 1) {
      errors.push(`⚠️  First heading should be H1, found H${level}: "${text}"`);
    }
    
    // Check for skipped levels
    if (level > previousLevel + 1) {
      errors.push(`⚠️  Skipped heading levels: H${previousLevel} -> H${level} for "${text}"`);
    }
    
    previousLevel = level;
  }
  
  return errors;
}

/**
 * Check single markdown file
 */
function checkMarkdownFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  console.log(`📄 Checking: ${relativePath}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const links = extractLinks(content);
  const headings = extractHeadings(content);
  
  // Check links
  const linkErrors = validateInternalLinks(filePath, links);
  
  // Check heading hierarchy
  const headingErrors = validateHeadingHierarchy(headings);
  
  const totalErrors = linkErrors.length + headingErrors.length;
  
  if (totalErrors > 0) {
    hasErrors = true;
    console.log(`  🚨 ${totalErrors} issue(s) found:`);
    
    for (const error of [...linkErrors, ...headingErrors]) {
      console.log(`    ${error}`);
    }
  } else {
    console.log('  ✅ All checks passed');
  }
  
  console.log(`  📊 Stats: ${links.length} links, ${headings.length} headings\n`);
  
  return totalErrors;
}

/**
 * Main function
 */
function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error('❌ docs/ directory not found');
    process.exit(1);
  }
  
  const markdownFiles = getMarkdownFiles(DOCS_DIR);
  
  if (markdownFiles.length === 0) {
    console.log('⚠️  No markdown files found in docs/ directory');
    return;
  }
  
  let totalFiles = 0;
  let totalErrors = 0;
  
  for (const filePath of markdownFiles) {
    totalFiles++;
    totalErrors += checkMarkdownFile(filePath);
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`  📁 Files checked: ${totalFiles}`);
  console.log(`  ${hasErrors ? '❌' : '✅'} Total issues: ${totalErrors}`);
  
  if (hasErrors) {
    console.log('\n🚨 Documentation validation failed!');
    console.log('Please fix the issues above before proceeding.');
    process.exit(1);
  } else {
    console.log('\n✅ All documentation checks passed!');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}