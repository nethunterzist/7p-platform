import * as Sentry from '@sentry/nextjs';
import { log } from './logger';

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1,  // Cumulative Layout Shift
  
  // API Response Times
  API_FAST: 200,
  API_ACCEPTABLE: 500,
  API_SLOW: 1000,
  
  // Database Queries
  DB_QUERY_FAST: 100,
  DB_QUERY_ACCEPTABLE: 500,
  DB_QUERY_SLOW: 1000,
  
  // Page Load Times
  PAGE_LOAD_FAST: 1000,
  PAGE_LOAD_ACCEPTABLE: 3000,
  PAGE_LOAD_SLOW: 5000,
} as const;

// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  // Start a performance timer
  static startTimer(id: string): void {
    this.timers.set(id, performance.now());
  }

  // End a performance timer and return duration
  static endTimer(id: string): number {
    const startTime = this.timers.get(id);
    if (!startTime) {
      console.warn(`Timer "${id}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(id);
    return duration;
  }

  // Measure and log API performance
  static async measureApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>,
    context: {
      endpoint?: string;
      method?: string;
      userId?: string;
      payload?: any;
    } = {}
  ): Promise<T> {
    const timerId = `api-${operation}-${Date.now()}`;
    this.startTimer(timerId);

    try {
      const result = await apiCall();
      const duration = this.endTimer(timerId);

      // Log performance metrics
      this.logApiPerformance(operation, duration, { ...context, success: true });

      return result;
    } catch (error) {
      const duration = this.endTimer(timerId);
      
      // Log error with performance data
      log.error(`API call failed: ${operation}`, {
        ...context,
        error: error as Error,
        duration,
        logType: 'api-error',
      });

      throw error;
    }
  }

  // Measure database query performance
  static async measureDbQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    context: {
      table?: string;
      operation?: string;
      userId?: string;
    } = {}
  ): Promise<T> {
    const timerId = `db-${queryName}-${Date.now()}`;
    this.startTimer(timerId);

    try {
      const result = await query();
      const duration = this.endTimer(timerId);

      // Log database performance
      this.logDbPerformance(queryName, duration, { ...context, success: true });

      return result;
    } catch (error) {
      const duration = this.endTimer(timerId);
      
      log.error(`Database query failed: ${queryName}`, {
        ...context,
        error: error as Error,
        duration,
        logType: 'db-error',
      });

      throw error;
    }
  }

  // Log API performance metrics
  private static logApiPerformance(
    operation: string,
    duration: number,
    context: any = {}
  ): void {
    const severity = this.getApiPerformanceSeverity(duration);
    
    // Log to application logger
    log.performance(`API ${operation} completed`, {
      ...context,
      duration,
      severity,
      threshold: {
        fast: PERFORMANCE_THRESHOLDS.API_FAST,
        acceptable: PERFORMANCE_THRESHOLDS.API_ACCEPTABLE,
        slow: PERFORMANCE_THRESHOLDS.API_SLOW,
      },
    });

    // Send to Sentry for slow operations
    if (severity === 'slow' || severity === 'critical') {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Slow API call: ${operation}`,
        level: 'warning',
        data: {
          operation,
          duration,
          ...context,
        },
      });
    }
  }

  // Log database performance metrics
  private static logDbPerformance(
    queryName: string,
    duration: number,
    context: any = {}
  ): void {
    const severity = this.getDbPerformanceSeverity(duration);
    
    log.performance(`DB query ${queryName} completed`, {
      ...context,
      duration,
      severity,
      threshold: {
        fast: PERFORMANCE_THRESHOLDS.DB_QUERY_FAST,
        acceptable: PERFORMANCE_THRESHOLDS.DB_QUERY_ACCEPTABLE,
        slow: PERFORMANCE_THRESHOLDS.DB_QUERY_SLOW,
      },
    });

    // Alert on slow database queries
    if (severity === 'slow' || severity === 'critical') {
      Sentry.captureMessage(`Slow database query: ${queryName}`, 'warning', {
        tags: {
          performanceIssue: true,
          queryType: 'database',
        },
        extra: {
          queryName,
          duration,
          ...context,
        },
      });
    }
  }

  // Get API performance severity level
  private static getApiPerformanceSeverity(duration: number): 'fast' | 'acceptable' | 'slow' | 'critical' {
    if (duration < PERFORMANCE_THRESHOLDS.API_FAST) return 'fast';
    if (duration < PERFORMANCE_THRESHOLDS.API_ACCEPTABLE) return 'acceptable';
    if (duration < PERFORMANCE_THRESHOLDS.API_SLOW) return 'slow';
    return 'critical';
  }

  // Get database performance severity level
  private static getDbPerformanceSeverity(duration: number): 'fast' | 'acceptable' | 'slow' | 'critical' {
    if (duration < PERFORMANCE_THRESHOLDS.DB_QUERY_FAST) return 'fast';
    if (duration < PERFORMANCE_THRESHOLDS.DB_QUERY_ACCEPTABLE) return 'acceptable';
    if (duration < PERFORMANCE_THRESHOLDS.DB_QUERY_SLOW) return 'slow';
    return 'critical';
  }
}

// Web Vitals monitoring
export const reportWebVitals = (metric: any) => {
  const { name, value, id, rating } = metric;

  // Log all web vitals
  log.performance(`Web Vital: ${name}`, {
    metric: name,
    value,
    id,
    rating,
    logType: 'web-vitals',
  });

  // Send poor ratings to Sentry
  if (rating === 'poor') {
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `Poor ${name} score`,
      level: 'warning',
      data: {
        metric: name,
        value,
        rating,
        threshold: getWebVitalThreshold(name),
      },
    });
  }
};

// Get Web Vital threshold for comparison
function getWebVitalThreshold(name: string): number {
  switch (name) {
    case 'LCP':
      return PERFORMANCE_THRESHOLDS.LCP;
    case 'FID':
      return PERFORMANCE_THRESHOLDS.FID;
    case 'CLS':
      return PERFORMANCE_THRESHOLDS.CLS;
    default:
      return 0;
  }
}

// Higher-order function for monitoring React component render performance
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
    
    React.useEffect(() => {
      const timerId = `component-${name}-${Date.now()}`;
      PerformanceMonitor.startTimer(timerId);
      
      return () => {
        const duration = PerformanceMonitor.endTimer(timerId);
        if (duration > 100) { // Only log if render took more than 100ms
          log.performance(`Component render: ${name}`, {
            componentName: name,
            duration,
            logType: 'component-render',
          });
        }
      };
    }, []);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Custom hooks for performance monitoring
export function usePerformanceTimer(operation: string) {
  const [startTime, setStartTime] = React.useState<number | null>(null);

  const start = React.useCallback(() => {
    setStartTime(performance.now());
  }, []);

  const end = React.useCallback(() => {
    if (startTime) {
      const duration = performance.now() - startTime;
      log.performance(`Operation completed: ${operation}`, {
        operation,
        duration,
        logType: 'custom-timer',
      });
      setStartTime(null);
      return duration;
    }
    return 0;
  }, [startTime, operation]);

  return { start, end };
}

// Performance decorator for API routes
export function withApiPerformanceMonitoring(handler: any, operationName?: string) {
  return async (req: any, res: any) => {
    const operation = operationName || `${req.method} ${req.url}`;
    const timerId = `api-${operation}-${Date.now()}`;
    
    PerformanceMonitor.startTimer(timerId);
    
    try {
      const result = await handler(req, res);
      const duration = PerformanceMonitor.endTimer(timerId);
      
      PerformanceMonitor.logApiPerformance(operation, duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      });
      
      return result;
    } catch (error) {
      const duration = PerformanceMonitor.endTimer(timerId);
      
      log.error(`API handler failed: ${operation}`, {
        error: error as Error,
        duration,
        method: req.method,
        url: req.url,
      });
      
      throw error;
    }
  };
}

export default PerformanceMonitor;