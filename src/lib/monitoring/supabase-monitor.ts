import { createClient } from '@supabase/supabase-js';
import { log } from './logger';
import PerformanceMonitor from './performance';
import * as Sentry from '@sentry/nextjs';

// Enhanced Supabase client with monitoring
export function createMonitoredSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  context: {
    userId?: string;
    userEmail?: string;
    service?: string;
  } = {}
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Proxy the client to add monitoring
  return new Proxy(supabase, {
    get(target, prop) {
      const originalMethod = target[prop as keyof typeof target];

      // Monitor specific Supabase methods
      if (typeof originalMethod === 'function' && shouldMonitorMethod(prop as string)) {
        return function (...args: any[]) {
          return monitorSupabaseOperation(
            prop as string,
            () => originalMethod.apply(target, args),
            context
          );
        };
      }

      return originalMethod;
    },
  });
}

// Methods to monitor
function shouldMonitorMethod(methodName: string): boolean {
  const monitoredMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'rpc',
    'auth',
  ];
  
  return monitoredMethods.some(method => methodName.includes(method));
}

// Monitor Supabase operations
async function monitorSupabaseOperation<T>(
  operation: string,
  supabaseCall: () => Promise<T>,
  context: any = {}
): Promise<T> {
  const timerId = `supabase-${operation}-${Date.now()}`;
  PerformanceMonitor.startTimer(timerId);

  try {
    const result = await supabaseCall();
    const duration = PerformanceMonitor.endTimer(timerId);

    // Log successful operation
    log.info(`Supabase operation: ${operation}`, {
      ...context,
      operation,
      duration,
      logType: 'supabase-operation',
    });

    // Check for slow operations
    if (duration > 1000) {
      log.warn(`Slow Supabase operation: ${operation}`, {
        ...context,
        operation,
        duration,
        logType: 'supabase-slow',
      });

      Sentry.addBreadcrumb({
        category: 'database',
        message: `Slow Supabase operation: ${operation}`,
        level: 'warning',
        data: {
          operation,
          duration,
          ...context,
        },
      });
    }

    return result;
  } catch (error) {
    const duration = PerformanceMonitor.endTimer(timerId);
    
    // Log error with context
    log.error(`Supabase operation failed: ${operation}`, {
      ...context,
      error: error as Error,
      operation,
      duration,
      logType: 'supabase-error',
    });

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        supabaseOperation: true,
        operation,
      },
      user: {
        id: context.userId,
        email: context.userEmail,
      },
      extra: {
        operation,
        duration,
        ...context,
      },
    });

    throw error;
  }
}

// Auth event monitoring
export function setupAuthMonitoring(supabase: any, context: any = {}) {
  supabase.auth.onAuthStateChange((event: string, session: any) => {
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    // Log auth events
    log.auth(`Auth event: ${event}`, {
      ...context,
      event,
      userId,
      userEmail,
      sessionExists: !!session,
    });

    // Track auth metrics
    switch (event) {
      case 'SIGNED_IN':
        log.audit('User signed in', {
          ...context,
          userId,
          userEmail,
          action: 'sign_in',
        });
        
        // Set user context in Sentry
        Sentry.setUser({
          id: userId,
          email: userEmail,
        });
        break;

      case 'SIGNED_OUT':
        log.audit('User signed out', {
          ...context,
          userId,
          userEmail,
          action: 'sign_out',
        });
        
        // Clear user context in Sentry
        Sentry.setUser(null);
        break;

      case 'TOKEN_REFRESHED':
        log.debug('Auth token refreshed', {
          ...context,
          userId,
          userEmail,
        });
        break;

      case 'USER_UPDATED':
        log.audit('User profile updated', {
          ...context,
          userId,
          userEmail,
          action: 'profile_update',
        });
        break;

      default:
        log.info(`Auth event: ${event}`, {
          ...context,
          event,
          userId,
          userEmail,
        });
    }
  });
}

// Connection monitoring
export class SupabaseConnectionMonitor {
  private static connectionCount = 0;
  private static maxConnections = 0;
  private static connectionErrors = 0;
  private static lastHealthCheck = Date.now();

  static incrementConnection() {
    this.connectionCount++;
    this.maxConnections = Math.max(this.maxConnections, this.connectionCount);
    
    log.debug('Supabase connection opened', {
      currentConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      logType: 'connection-monitor',
    });
  }

  static decrementConnection() {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    
    log.debug('Supabase connection closed', {
      currentConnections: this.connectionCount,
      logType: 'connection-monitor',
    });
  }

  static recordConnectionError(error: Error) {
    this.connectionErrors++;
    
    log.error('Supabase connection error', {
      error,
      totalErrors: this.connectionErrors,
      logType: 'connection-error',
    });

    // Alert on high error rate
    if (this.connectionErrors > 10) {
      Sentry.captureMessage('High Supabase connection error rate', 'error', {
        tags: {
          connectionIssue: true,
        },
        extra: {
          errorCount: this.connectionErrors,
          currentConnections: this.connectionCount,
        },
      });
    }
  }

  static async performHealthCheck(supabase: any): Promise<boolean> {
    const now = Date.now();
    
    // Only perform health check every 5 minutes
    if (now - this.lastHealthCheck < 300000) {
      return true;
    }

    try {
      const timerId = `health-check-${now}`;
      PerformanceMonitor.startTimer(timerId);
      
      // Simple query to test connection
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();

      const duration = PerformanceMonitor.endTimer(timerId);
      this.lastHealthCheck = now;

      if (error) {
        throw error;
      }

      log.info('Supabase health check passed', {
        duration,
        logType: 'health-check',
      });

      return true;
    } catch (error) {
      log.error('Supabase health check failed', {
        error: error as Error,
        logType: 'health-check-failed',
      });

      Sentry.captureException(error, {
        tags: {
          healthCheck: true,
          supabaseIssue: true,
        },
      });

      return false;
    }
  }

  static getConnectionStats() {
    return {
      currentConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      connectionErrors: this.connectionErrors,
      lastHealthCheck: this.lastHealthCheck,
    };
  }
}

// Query performance analyzer
export class SupabaseQueryAnalyzer {
  private static slowQueries: Map<string, {
    count: number;
    totalDuration: number;
    avgDuration: number;
    maxDuration: number;
  }> = new Map();

  static analyzeQuery(query: string, duration: number, operation: string) {
    const queryKey = this.normalizeQuery(query);
    const stats = this.slowQueries.get(queryKey) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
    };

    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    this.slowQueries.set(queryKey, stats);

    // Alert on consistently slow queries
    if (stats.avgDuration > 500 && stats.count > 5) {
      log.warn('Consistently slow query detected', {
        query: queryKey,
        operation,
        stats,
        logType: 'slow-query-pattern',
      });

      Sentry.captureMessage('Consistently slow query pattern', 'warning', {
        tags: {
          performanceIssue: true,
          queryOptimization: true,
        },
        extra: {
          query: queryKey,
          operation,
          stats,
        },
      });
    }
  }

  private static normalizeQuery(query: string): string {
    // Normalize query for pattern matching
    return query
      .replace(/\d+/g, '?') // Replace numbers with placeholders
      .replace(/'/g, '') // Remove quotes
      .toLowerCase()
      .trim();
  }

  static getSlowQueryReport() {
    const report = Array.from(this.slowQueries.entries())
      .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
      .slice(0, 10); // Top 10 slowest queries

    return report.map(([query, stats]) => ({
      query,
      ...stats,
    }));
  }
}

export default {
  createMonitoredSupabaseClient,
  setupAuthMonitoring,
  SupabaseConnectionMonitor,
  SupabaseQueryAnalyzer,
};