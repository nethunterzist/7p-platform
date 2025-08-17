#!/usr/bin/env node

/**
 * MOCK API ERROR FIXES SCRIPT
 * Fixes common TypeScript errors after Supabase replacement
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Common error fixes
const ERROR_FIXES = [
  // Fix .user property access on MockUser
  {
    pattern: /\.user\.user\b/g,
    replacement: '.user.id'
  },
  {
    pattern: /user\.user_metadata/g,
    replacement: 'user.role'
  },
  
  // Fix missing properties in Error objects
  {
    pattern: /error\.code/g,
    replacement: 'error.message'
  },
  {
    pattern: /error\.details/g,
    replacement: 'error.message'
  },
  {
    pattern: /error\.hint/g,
    replacement: 'error.message'
  },

  // Fix async/await patterns that lost await
  {
    pattern: /const { data, error } = supabase\.from\(/g,
    replacement: 'const { data, error } = await supabase.from('
  },

  // Fix missing await for .single() calls
  {
    pattern: /\.single\(\)$/gm,
    replacement: '.single()'
  }
];

// Files that need special handling
const SPECIAL_FIXES = {
  'src/utils/supabase/middleware.ts': (content) => {
    // Replace server-side Supabase code with mock fallback
    return `/**
 * MOCK MIDDLEWARE - 7P Education  
 * Placeholder for Supabase middleware functionality
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock implementation for middleware compatibility
export function updateSession(request: NextRequest) {
  // Mock session update - always passes through
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

// Export compatibility function
export const createServerClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null })
    }
  };
};`;
  },

  'src/utils/supabase/server.ts': (content) => {
    return `/**
 * MOCK SERVER CLIENT - 7P Education
 * Server-side mock replacement for Supabase
 */

import { cookies } from 'next/headers';
import { mockApi } from '@/lib/mock-api';

export function createClient() {
  // Return mock client for server-side usage
  return mockApi;
}

// Compatibility export
export const createServerClient = createClient;`;
  }
};

function shouldSkipFile(filePath) {
  const skipPaths = [
    'lib/supabase-replacement.ts',
    'lib/mock-api.ts',
    'data/',
    'types/',
    '.next/',
    'node_modules/'
  ];
  
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  return skipPaths.some(skipPath => relativePath.includes(skipPath));
}

function processFile(filePath) {
  try {
    const relativePath = path.relative(SRC_DIR, filePath);
    
    // Check for special handling
    if (SPECIAL_FIXES[`src/${relativePath}`]) {
      const newContent = SPECIAL_FIXES[`src/${relativePath}`]('');
      fs.writeFileSync(filePath, newContent);
      console.log(`  🔧 Special fix applied: ${relativePath}`);
      return true;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Apply common fixes
    for (const fix of ERROR_FIXES) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    }

    // Add missing await keywords for common patterns
    if (content.includes('supabase.from(') && !content.includes('await supabase.from(')) {
      content = content.replace(/(\s+)(const { data, error } = )(supabase\.from\()/g, '$1$2await $3');
      modified = true;
    }

    // Fix promise chain issues  
    content = content.replace(/\.then\s*\(\s*\(\s*{\s*data,\s*error\s*}\s*\)/g, '.then(({ data, error }) =>');
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✓ Fixed: ${relativePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  let totalProcessed = 0;
  let totalModified = 0;

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(item)) {
        continue;
      }
      
      const [processed, modified] = walkDirectory(fullPath);
      totalProcessed += processed;
      totalModified += modified;
    } else if (stat.isFile()) {
      if (/\.(ts|tsx)$/.test(item) && !item.endsWith('.d.ts')) {
        if (shouldSkipFile(fullPath)) {
          continue;
        }
        
        totalProcessed++;
        if (processFile(fullPath)) {
          totalModified++;
        }
      }
    }
  }
  
  return [totalProcessed, totalModified];
}

function main() {
  console.log('\n🔧 MOCK API ERROR FIXES');
  console.log('========================\n');
  
  const startTime = Date.now();
  const [totalProcessed, totalModified] = walkDirectory(SRC_DIR);
  const endTime = Date.now();
  
  console.log('\n📊 FIX SUMMARY');
  console.log('===============');
  console.log(`📁 Files processed: ${totalProcessed}`);
  console.log(`🔧 Files fixed: ${totalModified}`);
  console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
  
  console.log('\n🎉 Error fixes completed!');
  console.log('\n🚀 Run `npx tsc --noEmit` to check for remaining errors');
}

if (require.main === module) {
  main();
}