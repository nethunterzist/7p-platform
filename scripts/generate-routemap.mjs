#!/usr/bin/env node

/**
 * Route Map Generator
 * Scans src/app for pages and API routes, generates docs/ROUTEMAP.md table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'src', 'app');
const ROUTEMAP_FILE = path.join(ROOT_DIR, 'docs', 'ROUTEMAP.md');

console.log('🗺️  Generating route map from src/app...\n');

/**
 * Recursively scan directory for route files
 */
function scanRoutes(dir, basePath = '') {
  const routes = [];
  
  if (!fs.existsSync(dir)) {
    console.log('⚠️  src/app directory not found');
    return routes;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const routePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip special Next.js directories
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        // Route groups - don't affect URL path
        routes.push(...scanRoutes(fullPath, basePath));
      } else if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        // Dynamic routes
        const paramName = entry.name.slice(1, -1);
        const dynamicPath = path.join(basePath, `[${paramName}]`);
        routes.push(...scanRoutes(fullPath, dynamicPath));
      } else {
        // Regular directories
        routes.push(...scanRoutes(fullPath, routePath));
      }
    } else if (entry.isFile()) {
      // Check for route files
      if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        const route = analyzePageRoute(fullPath, basePath);
        if (route) routes.push(route);
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        const route = analyzeAPIRoute(fullPath, basePath);
        if (route) routes.push(route);
      } else if (entry.name === 'layout.tsx' || entry.name === 'layout.ts') {
        // Layouts don't create routes but are important for structure
        // We can track them for context but don't add to routes table
      }
    }
  }
  
  return routes;
}

/**
 * Analyze page route file
 */
function analyzePageRoute(filePath, routePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Convert file path to URL path
  const urlPath = routePath === '' ? '/' : `/${routePath}`;
  
  // Determine runtime
  const runtime = detectRuntime(content);
  
  // Determine protection level
  const protection = detectProtection(content, urlPath);
  
  return {
    path: urlPath,
    type: 'Page',
    method: 'GET',
    runtime: runtime,
    protection: protection,
    file: path.relative(ROOT_DIR, filePath)
  };
}

/**
 * Analyze API route file
 */
function analyzeAPIRoute(filePath, routePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Convert file path to URL path
  const urlPath = `/api${routePath === '' ? '' : `/${routePath}`}`;
  
  // Detect HTTP methods
  const methods = detectHTTPMethods(content);
  
  // Determine runtime
  const runtime = detectRuntime(content);
  
  // Determine protection level
  const protection = detectProtection(content, urlPath);
  
  return {
    path: urlPath,
    type: 'API',
    method: methods.join(', '),
    runtime: runtime,
    protection: protection,
    file: path.relative(ROOT_DIR, filePath)
  };
}

/**
 * Detect runtime configuration
 */
function detectRuntime(content) {
  // Check for explicit runtime export
  if (content.includes('export const runtime = "edge"')) {
    return 'Edge';
  }
  if (content.includes('export const runtime = "nodejs"')) {
    return 'Node.js';
  }
  
  // Heuristic detection
  const nodeIndicators = [
    'require(',
    'process.env',
    'fs.',
    'path.',
    'crypto.',
    'NextAuth',
    'bcrypt',
    'winston',
    'stripe',
    '@supabase/supabase-js',
    'getServerSession'
  ];
  
  const hasNodeIndicators = nodeIndicators.some(indicator => content.includes(indicator));
  
  if (hasNodeIndicators) {
    return 'Node.js';
  }
  
  return 'Edge';
}

/**
 * Detect HTTP methods from API route
 */
function detectHTTPMethods(content) {
  const methods = [];
  
  if (content.includes('export async function GET') || content.includes('export function GET')) {
    methods.push('GET');
  }
  if (content.includes('export async function POST') || content.includes('export function POST')) {
    methods.push('POST');
  }
  if (content.includes('export async function PUT') || content.includes('export function PUT')) {
    methods.push('PUT');
  }
  if (content.includes('export async function DELETE') || content.includes('export function DELETE')) {
    methods.push('DELETE');
  }
  if (content.includes('export async function PATCH') || content.includes('export function PATCH')) {
    methods.push('PATCH');
  }
  if (content.includes('export async function OPTIONS') || content.includes('export function OPTIONS')) {
    methods.push('OPTIONS');
  }
  
  return methods.length > 0 ? methods : ['GET'];
}

/**
 * Detect protection level based on path and content
 */
function detectProtection(content, urlPath) {
  // Public paths (no protection)
  const publicPaths = ['/', '/login', '/register', '/courses', '/marketplace'];
  if (publicPaths.includes(urlPath) || urlPath.startsWith('/auth/')) {
    return 'Public';
  }
  
  // API routes - check for auth
  if (urlPath.startsWith('/api/')) {
    if (content.includes('getServerSession') || content.includes('auth.')) {
      return 'Auth Required';
    }
    if (urlPath.includes('/admin/')) {
      return 'Admin Only';
    }
    if (urlPath.startsWith('/api/health') || urlPath.startsWith('/api/diag')) {
      return 'Public';
    }
    return 'Public';
  }
  
  // Page routes
  if (urlPath.startsWith('/admin')) {
    return 'Admin Only';
  }
  if (urlPath.startsWith('/dashboard') || urlPath.startsWith('/student')) {
    return 'Auth Required';
  }
  if (urlPath.startsWith('/instructor')) {
    return 'Instructor Only';
  }
  
  return 'Middleware';
}

/**
 * Generate route map table
 */
function generateRouteMapTable(routes) {
  // Sort routes
  routes.sort((a, b) => {
    // Sort by type (Pages first, then API)
    if (a.type !== b.type) {
      return a.type === 'Page' ? -1 : 1;
    }
    // Then by path
    return a.path.localeCompare(b.path);
  });
  
  let table = '| Route | Type | Method | Runtime | Protection | File |\n';
  table += '|-------|------|--------|---------|------------|------|\n';
  
  for (const route of routes) {
    table += `| \`${route.path}\` | ${route.type} | ${route.method} | ${route.runtime} | ${route.protection} | \`${route.file}\` |\n`;
  }
  
  return table;
}

/**
 * Update ROUTEMAP.md file
 */
function updateRouteMap(routes) {
  if (!fs.existsSync(ROUTEMAP_FILE)) {
    console.log('❌ ROUTEMAP.md not found');
    process.exit(1);
  }
  
  let content = fs.readFileSync(ROUTEMAP_FILE, 'utf-8');
  
  // Find the route table section
  const startMarker = '<!-- AUTO-GENERATED ROUTE TABLE START -->';
  const endMarker = '<!-- AUTO-GENERATED ROUTE TABLE END -->';
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.log('⚠️  Route table markers not found in ROUTEMAP.md');
    console.log('Adding markers and table at the end...');
    
    const routeTable = generateRouteMapTable(routes);
    const newSection = `\\n## 🗺️ Auto-Generated Route Map\\n\\n${startMarker}\\n${routeTable}\\n${endMarker}\\n`;
    
    content += newSection;
  } else {
    // Replace existing table
    const routeTable = generateRouteMapTable(routes);
    const before = content.substring(0, startIndex + startMarker.length);
    const after = content.substring(endIndex);
    
    content = `${before}\\n${routeTable}\\n${after}`;
  }
  
  fs.writeFileSync(ROUTEMAP_FILE, content);
  console.log('✅ ROUTEMAP.md updated with auto-generated route table');
}

/**
 * Main function
 */
function main() {
  console.log('📁 Scanning src/app directory...');
  
  const routes = scanRoutes(APP_DIR);
  
  console.log(`\\n📊 Found ${routes.length} routes:`);
  console.log(`  📄 Pages: ${routes.filter(r => r.type === 'Page').length}`);
  console.log(`  🔗 API routes: ${routes.filter(r => r.type === 'API').length}`);
  console.log(`  ⚡ Edge runtime: ${routes.filter(r => r.runtime === 'Edge').length}`);
  console.log(`  🟢 Node.js runtime: ${routes.filter(r => r.runtime === 'Node.js').length}`);
  console.log(`  🔒 Protected routes: ${routes.filter(r => r.protection !== 'Public').length}\\n`);
  
  // Debug: Show all routes
  if (process.argv.includes('--debug')) {
    console.log('🐛 Debug: All routes found:');
    for (const route of routes) {
      console.log(`  ${route.path} (${route.type}, ${route.method}, ${route.runtime}, ${route.protection})`);
    }
    console.log();
  }
  
  updateRouteMap(routes);
  
  console.log('🎉 Route map generation complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}