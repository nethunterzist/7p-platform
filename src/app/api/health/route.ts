import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiMonitoring } from '@/middleware/monitoring';
import { log } from '@/lib/monitoring/logger';

export const GET = withApiMonitoring(async (request: NextRequest) => {
  const startTime = performance.now();
  
  try {
    // Basic health check data
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: false,
        memory: false,
        disk: false,
      },
      metrics: {
        responseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      }
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    healthData.metrics.memoryUsage = memUsageMB.heapUsed;
    healthData.checks.memory = memUsageMB.heapUsed < 500; // Alert if over 500MB

    // Check database connection
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        // Simple query to test connection
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
          log.warn('Database health check failed', {
            error,
            logType: 'health-check-db-fail',
          });
          healthData.checks.database = false;
        } else {
          healthData.checks.database = true;
        }
      } else {
        healthData.checks.database = false;
      }
    } catch (dbError) {
      log.error('Database health check error', {
        error: dbError as Error,
        logType: 'health-check-db-error',
      });
      healthData.checks.database = false;
    }

    // Basic disk check (always true in serverless)
    healthData.checks.disk = true;

    // Calculate response time
    const duration = performance.now() - startTime;
    healthData.metrics.responseTime = Math.round(duration);

    // Determine overall health status
    const allChecksHealthy = Object.values(healthData.checks).every(check => check === true);
    healthData.status = allChecksHealthy ? 'healthy' : 'unhealthy';

    // Log health check
    log.info('Health check performed', {
      healthData,
      duration,
      logType: 'health-check',
    });

    // Return appropriate status code
    const statusCode = allChecksHealthy ? 200 : 503;
    
    return NextResponse.json(healthData, { status: statusCode });

  } catch (error) {
    const duration = performance.now() - startTime;
    
    log.error('Health check failed', {
      error: error as Error,
      duration,
      logType: 'health-check-failed',
    });

    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}, {
  operationName: 'health-check',
});

// Also support HEAD requests for simple checks
export const HEAD = withApiMonitoring(async (request: NextRequest) => {
  return new NextResponse(null, { status: 200 });
}, {
  operationName: 'health-check-head',
});