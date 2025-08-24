/**
 * 🧹 Admin Session Cleanup API
 * 7P Education Platform - Manual Session Maintenance
 * 
 * Provides admin endpoints for session management and cleanup reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAPI } from '@/lib/validation/middleware';
import { AuthProtectionMiddleware } from '@/middleware/auth-protection';
import { EnhancedSessionSecurity } from '@/lib/auth/session-security-enhancements';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';
import { kv } from '@vercel/kv';

interface CleanupResponse {
  success: boolean;
  cleaned: number;
  executionTime: number;
  timestamp: string;
  error?: string;
}

interface CleanupReport {
  timestamp: string;
  totalCleaned: number;
  totalErrors: number;
  executionTime: number;
  details?: {
    enhancedSessions: number;
    legacySessions: number;
    rateLimitEntries: number;
    csrfTokens: number;
  };
  error?: string;
}

/**
 * 🧹 Trigger Manual Session Cleanup
 */
export const POST = validateAPI.adminOnly()(
  async (request): Promise<NextResponse<CleanupResponse>> => {
    const startTime = Date.now();
    
    try {
      console.log('🧹 Manual session cleanup triggered by admin');
      
      // Perform comprehensive session cleanup
      const cleanupResult = await AuthProtectionMiddleware.performSessionCleanup();
      const executionTime = Date.now() - startTime;
      
      // Log admin action
      await auditLogger.logAuth(
        AUDIT_EVENTS.ADMIN_ACTION,
        request.user?.id || 'unknown',
        {
          action: 'manual_session_cleanup',
          cleaned_sessions: cleanupResult.cleaned,
          execution_time: executionTime,
          timestamp: new Date().toISOString()
        }
      );
      
      return NextResponse.json<CleanupResponse>({
        success: true,
        cleaned: cleanupResult.cleaned,
        executionTime,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Manual session cleanup failed:', error);
      
      // Log cleanup failure
      await auditLogger.logError('CLEANUP_FAILED', request.user?.id, {
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time: executionTime,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json<CleanupResponse>(
        {
          success: false,
          cleaned: 0,
          executionTime,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Cleanup failed'
        },
        { status: 500 }
      );
    }
  }
);

/**
 * 📊 Get Cleanup Reports
 */
export const GET = validateAPI.adminOnly()(
  async (request): Promise<NextResponse> => {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const limitCapped = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
      
      console.log(`📊 Fetching last ${limitCapped} cleanup reports`);
      
      // Get recent cleanup reports
      const reports: CleanupReport[] = [];
      let count = 0;
      
      // Scan for cleanup reports (newest first)
      const keys: string[] = [];
      for await (const key of kv.scanIterator({ match: 'cleanup_report:*' })) {
        keys.push(key);
      }
      
      // Sort keys by timestamp (descending)
      keys.sort((a, b) => {
        const timestampA = parseInt(a.split(':')[1]);
        const timestampB = parseInt(b.split(':')[1]);
        return timestampB - timestampA;
      });
      
      // Fetch the most recent reports
      for (const key of keys.slice(0, limitCapped)) {
        try {
          const report = await kv.get<CleanupReport>(key);
          if (report) {
            reports.push({
              ...report,
              timestamp: report.timestamp || new Date(parseInt(key.split(':')[1])).toISOString()
            });
            count++;
          }
        } catch (error) {
          console.warn(`Failed to fetch report ${key}:`, error);
        }
      }
      
      // Get current session statistics
      const sessionStats = await getSessionStatistics();
      
      // Log admin action
      await auditLogger.logAuth(
        AUDIT_EVENTS.ADMIN_ACTION,
        request.user?.id || 'unknown',
        {
          action: 'view_cleanup_reports',
          reports_count: count,
          limit: limitCapped,
          timestamp: new Date().toISOString()
        }
      );
      
      return NextResponse.json({
        success: true,
        reports,
        count,
        sessionStats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to fetch cleanup reports:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch reports',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  }
);

/**
 * 📈 Get Current Session Statistics
 */
async function getSessionStatistics(): Promise<{
  enhancedSessions: number;
  legacySessions: number;
  rateLimitEntries: number;
  csrfTokens: number;
}> {
  let enhancedSessions = 0;
  let legacySessions = 0;
  let rateLimitEntries = 0;
  let csrfTokens = 0;
  
  try {
    // Count different types of session data
    for await (const key of kv.scanIterator({ match: '*' })) {
      if (key.startsWith('enhanced_session:')) {
        enhancedSessions++;
      } else if (key.startsWith('session:')) {
        legacySessions++;
      } else if (key.startsWith('rate_limit:')) {
        rateLimitEntries++;
      } else if (key.startsWith('csrf:')) {
        csrfTokens++;
      }
    }
  } catch (error) {
    console.error('Failed to get session statistics:', error);
  }
  
  return {
    enhancedSessions,
    legacySessions,
    rateLimitEntries,
    csrfTokens
  };
}

/**
 * 🗑️ Force Cleanup All Sessions (Emergency)
 */
export const DELETE = validateAPI.adminOnly()(
  async (request): Promise<NextResponse> => {
    try {
      console.log('🚨 Emergency session cleanup triggered by admin');
      
      let totalDeleted = 0;
      const startTime = Date.now();
      
      // Delete all session-related keys
      const patterns = [
        'enhanced_session:*',
        'session:*', 
        'rate_limit:*',
        'csrf:*'
      ];
      
      for (const pattern of patterns) {
        for await (const key of kv.scanIterator({ match: pattern })) {
          try {
            await kv.del(key);
            totalDeleted++;
          } catch (error) {
            console.warn(`Failed to delete ${key}:`, error);
          }
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      // Log emergency cleanup
      await auditLogger.logSecurity(
        'EMERGENCY_CLEANUP',
        request.user?.id || 'unknown',
        {
          action: 'force_cleanup_all_sessions',
          deleted_count: totalDeleted,
          execution_time: executionTime,
          timestamp: new Date().toISOString()
        },
        'high'
      );
      
      console.log(`🗑️ Emergency cleanup completed: ${totalDeleted} items deleted in ${executionTime}ms`);
      
      return NextResponse.json({
        success: true,
        message: 'Emergency cleanup completed',
        deleted: totalDeleted,
        executionTime,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Emergency cleanup failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  }
);