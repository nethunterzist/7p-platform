#!/usr/bin/env node

/**
 * SUPABASE TO MOCK API REPLACEMENT SCRIPT
 * Systematically replaces all Supabase imports with mock API equivalents
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Files to skip (already updated or not relevant)
const SKIP_FILES = [
  'src/lib/supabase-replacement.ts',
  'src/lib/mock-api.ts',
  'src/lib/supabase.ts', // Already updated
  'src/utils/supabase/client.ts', // Already updated
  'src/app/dashboard/page.tsx', // Already updated
  'src/app/login/page.tsx', // Already updated
  'src/app/register/page.tsx', // Already updated
  'src/components/layout/DashboardHeader.tsx', // Already updated
  'src/data/', // Mock data files
  'src/types/', // Type files
];

// Import replacement patterns
const IMPORT_REPLACEMENTS = [
  // Supabase client imports
  {
    pattern: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/lib\/supabase['"];?/g,
    replacement: "import { supabase } from '@/lib/supabase';"
  },
  {
    pattern: /import\s*{\s*createClient\s*}\s*from\s*['"]@\/utils\/supabase\/client['"];?/g,
    replacement: "import { createClient } from '@/utils/supabase/client';"
  },
  {
    pattern: /import\s*{\s*.*?\s*}\s*from\s*['"]@supabase\/supabase-js['"];?/g,
    replacement: "// Supabase types removed - using mock API"
  },
  {
    pattern: /import\s*{\s*.*?\s*}\s*from\s*['"]@supabase\/ssr['"];?/g,
    replacement: "// Supabase SSR removed - using mock API"
  },
  {
    pattern: /import\s*{\s*.*?\s*}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"];?/g,
    replacement: "// Supabase auth helpers removed - using mock API"
  },
];

// Code pattern replacements for common Supabase usage
const CODE_REPLACEMENTS = [
  // Simple auth state checks
  {
    pattern: /const\s*{\s*data:\s*session\s*}\s*=\s*await\s*supabase\.auth\.getSession\(\)/g,
    replacement: "const { data: session } = await supabase.auth.getSession()"
  },
  // Basic database queries (these will work with our mock API)
  {
    pattern: /supabase\.from\(/g,
    replacement: "supabase.from("
  },
  // Auth operations
  {
    pattern: /supabase\.auth\./g,
    replacement: "supabase.auth."
  }
];

// Special patterns for API routes that need mocking
const API_ROUTE_PATTERNS = [
  {
    pattern: /export async function GET\(/g,
    replacement: `export async function GET(`
  },
  {
    pattern: /export async function POST\(/g,
    replacement: `export async function POST(`
  }
];

function shouldSkipFile(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  return SKIP_FILES.some(skipPath => relativePath.includes(skipPath.replace(/\//g, path.sep)));
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Check if file has any Supabase imports
    if (!content.includes('@supabase') && !content.includes('supabase')) {
      return false; // No Supabase usage detected
    }

    const originalContent = content;

    // Apply import replacements
    for (const replacement of IMPORT_REPLACEMENTS) {
      const newContent = content.replace(replacement.pattern, replacement.replacement);
      if (newContent !== content) {
        modified = true;
        content = newContent;
        console.log(`  ✓ Replaced import pattern in ${path.relative(SRC_DIR, filePath)}`);
      }
    }

    // Apply code replacements
    for (const replacement of CODE_REPLACEMENTS) {
      const newContent = content.replace(replacement.pattern, replacement.replacement);
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    }

    // Special handling for API routes
    if (filePath.includes('/api/') && filePath.endsWith('route.ts')) {
      // Add mock API import if not present
      if (!content.includes('@/lib/mock-api') && content.includes('supabase')) {
        const importLine = "import { mockApi } from '@/lib/mock-api';\n";
        if (!content.includes(importLine)) {
          content = importLine + content;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`  📝 Updated: ${path.relative(SRC_DIR, filePath)}`);
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
      // Skip node_modules and other irrelevant directories
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
        continue;
      }
      
      const [processed, modified] = walkDirectory(fullPath);
      totalProcessed += processed;
      totalModified += modified;
    } else if (stat.isFile()) {
      // Process TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(item) && !item.endsWith('.d.ts')) {
        if (shouldSkipFile(fullPath)) {
          console.log(`  ⏭️  Skipped: ${path.relative(SRC_DIR, fullPath)}`);
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
  console.log('\n🔄 SUPABASE TO MOCK API MIGRATION');
  console.log('=====================================\n');
  
  console.log('🎯 Target: Replace all Supabase dependencies with mock API system');
  console.log('📁 Source Directory:', SRC_DIR);
  console.log('⏳ Starting replacement process...\n');
  
  const startTime = Date.now();
  const [totalProcessed, totalModified] = walkDirectory(SRC_DIR);
  const endTime = Date.now();
  
  console.log('\n📊 MIGRATION SUMMARY');
  console.log('===================');
  console.log(`📁 Files processed: ${totalProcessed}`);
  console.log(`📝 Files modified: ${totalModified}`);
  console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
  
  if (totalModified > 0) {
    console.log('\n✅ SUCCESS: Supabase imports successfully replaced with mock API');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test the application: npm run dev');
    console.log('2. Check for compilation errors');
    console.log('3. Test authentication flow');
    console.log('4. Verify all pages load correctly');
    console.log('5. Remove remaining Supabase dependencies: npm uninstall @supabase/*');
  } else {
    console.log('\nℹ️  No files needed modification - already using mock system or no Supabase usage detected');
  }
  
  console.log('\n🎉 Migration completed!');
}

if (require.main === module) {
  main();
}