import { log } from './lib/monitoring/logger';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    const { log } = await import('./lib/monitoring/logger');
    
    // Log application startup
    log.info('7P Education platform starting', {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      logType: 'startup',
    });

    // Setup global error handlers
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection', {
        error: reason as Error,
        promise: promise.toString(),
        logType: 'unhandled-rejection',
      });
    });

    process.on('uncaughtException', (error) => {
      log.error('Uncaught Exception', {
        error,
        logType: 'uncaught-exception',
      });
      
      // Graceful shutdown
      process.exit(1);
    });

    // Memory usage monitoring
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        };

        // Log memory usage every 5 minutes
        log.info('Memory usage', {
          memory: memUsageMB,
          logType: 'memory-monitor',
        });

        // Alert on high memory usage
        if (memUsageMB.heapUsed > 500) { // Alert if heap usage > 500MB
          log.warn('High memory usage detected', {
            memory: memUsageMB,
            logType: 'memory-alert',
          });
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    }
  }
}