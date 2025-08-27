#!/usr/bin/env node

/**
 * 🧹 Session Cleanup Script
 * 7P Education Platform - Automated Session Maintenance
 * 
 * This script should be run periodically (e.g., every hour via cron) to:
 * - Clean up expired sessions from Vercel KV
 * - Remove stale authentication data
 * - Maintain database performance
 * - Generate cleanup reports
 * 
 * Usage:
 *   node scripts/session-cleanup.js
 * 
 * Cron example (run every hour):
 *   0 * * * * cd /path/to/project && node scripts/session-cleanup.js
 */

const { kv } = require('@vercel/kv');

async function performSessionCleanup() {
  console.log('🧹 Starting session cleanup...');
  console.log('Timestamp:', new Date().toISOString());
  
  let totalCleaned = 0;
  let totalErrors = 0;
  const startTime = Date.now();
  
  try {
    // Import the enhanced session security after environment is loaded
    const { EnhancedSessionSecurity } = await import('../src/lib/auth/session-security-enhancements.ts');
    
    // Clean up enhanced sessions
    console.log('🔍 Scanning for expired enhanced sessions...');
    const enhancedCleanup = await EnhancedSessionSecurity.cleanupExpiredSessions();
    totalCleaned += enhancedCleanup;
    console.log(`✅ Cleaned ${enhancedCleanup} enhanced sessions`);
    
    // Clean up legacy sessions
    console.log('🔍 Scanning for expired legacy sessions...');
    const legacyCleanup = await cleanupLegacySessions();
    totalCleaned += legacyCleanup;
    console.log(`✅ Cleaned ${legacyCleanup} legacy sessions`);
    
    // Clean up rate limit data
    console.log('🔍 Cleaning up expired rate limit data...');
    const rateLimitCleanup = await cleanupRateLimitData();
    totalCleaned += rateLimitCleanup;
    console.log(`✅ Cleaned ${rateLimitCleanup} rate limit entries`);
    
    // Clean up CSRF tokens
    console.log('🔍 Cleaning up expired CSRF tokens...');
    const csrfCleanup = await cleanupCSRFTokens();
    totalCleaned += csrfCleanup;
    console.log(`✅ Cleaned ${csrfCleanup} CSRF tokens`);
    
    const executionTime = Date.now() - startTime;
    
    console.log('🎉 Session cleanup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • Total items cleaned: ${totalCleaned}`);
    console.log(`   • Execution time: ${executionTime}ms`);
    console.log(`   • Errors: ${totalErrors}`);
    
    // Report results
    await reportCleanupResults({
      timestamp: new Date().toISOString(),
      totalCleaned,
      totalErrors,
      executionTime,
      details: {
        enhancedSessions: enhancedCleanup,
        legacySessions: legacyCleanup,
        rateLimitEntries: rateLimitCleanup,
        csrfTokens: csrfCleanup
      }
    });
    
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
    totalErrors++;
    
    // Report error
    await reportCleanupResults({
      timestamp: new Date().toISOString(),
      totalCleaned,
      totalErrors,
      executionTime: Date.now() - startTime,
      error: error.message
    });
    
    process.exit(1);
  }
}

/**
 * Clean up legacy session entries
 */
async function cleanupLegacySessions() {
  let cleanedCount = 0;
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  try {
    // Scan for legacy session patterns
    for await (const key of kv.scanIterator({ match: 'session:*' })) {
      try {
        const sessionData = await kv.get(key);
        if (!sessionData) {
          await kv.del(key);
          cleanedCount++;
          continue;
        }
        
        // Check if session is expired based on timestamp
        if (typeof sessionData === 'object' && sessionData.lastActivity) {
          const age = now - sessionData.lastActivity;
          if (age > maxAge) {
            await kv.del(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        console.warn(`Failed to process session ${key}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup legacy sessions:', error);
  }
  
  return cleanedCount;
}

/**
 * Clean up rate limit data
 */
async function cleanupRateLimitData() {
  let cleanedCount = 0;
  
  try {
    for await (const key of kv.scanIterator({ match: 'rate_limit:*' })) {
      try {
        const rateLimitData = await kv.get(key);
        if (!rateLimitData) {
          await kv.del(key);
          cleanedCount++;
        }
      } catch (error) {
        console.warn(`Failed to process rate limit ${key}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup rate limit data:', error);
  }
  
  return cleanedCount;
}

/**
 * Clean up CSRF tokens
 */
async function cleanupCSRFTokens() {
  let cleanedCount = 0;
  
  try {
    for await (const key of kv.scanIterator({ match: 'csrf:*' })) {
      try {
        const csrfData = await kv.get(key);
        if (!csrfData) {
          await kv.del(key);
          cleanedCount++;
        }
      } catch (error) {
        console.warn(`Failed to process CSRF token ${key}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup CSRF tokens:', error);
  }
  
  return cleanedCount;
}

/**
 * Report cleanup results
 */
async function reportCleanupResults(results) {
  try {
    // Store cleanup report in KV for monitoring
    const reportKey = `cleanup_report:${Date.now()}`;
    await kv.set(reportKey, results, { ex: 7 * 24 * 60 * 60 }); // Keep for 7 days
    
    // You could also send to monitoring service here
    console.log('📊 Cleanup report stored:', reportKey);
    
  } catch (error) {
    console.error('Failed to store cleanup report:', error);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  performSessionCleanup()
    .then(() => {
      console.log('✅ Session cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Session cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  performSessionCleanup,
  cleanupLegacySessions,
  cleanupRateLimitData,
  cleanupCSRFTokens
};