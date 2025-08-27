import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // Simple health check data without dependencies
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      paymentsMode: process.env.PAYMENTS_MODE || 'disabled',
      freeEnrollmentEnabled: process.env.FEATURE_ENROLL_FREE === 'true',
      version: '1.0.0',
      checks: {
        basic: true,
      },
      metrics: {
        responseTime: 0,
      }
    };

    // Simple memory check without complex operations
    try {
      const memUsage = process.memoryUsage();
      healthData.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
      healthData.checks.memory = memUsage.heapUsed < 500 * 1024 * 1024; // 500MB limit
    } catch (memError) {
      console.warn('Memory check failed:', memError);
      healthData.checks.memory = false;
    }

    // Calculate response time
    const duration = performance.now() - startTime;
    healthData.metrics.responseTime = Math.round(duration);

    // Determine overall health status
    const allChecksHealthy = Object.values(healthData.checks).every(check => check === true || check === null);
    healthData.status = allChecksHealthy ? 'healthy' : 'unhealthy';

    // Log health check
    console.log('Health check performed:', {
      status: healthData.status,
      duration,
      paymentsMode: healthData.paymentsMode,
      environment: healthData.environment,
    });

    // Return appropriate status code
    const statusCode = allChecksHealthy ? 200 : 503;
    
    return NextResponse.json(healthData, { status: statusCode });

  } catch (error) {
    const duration = performance.now() - startTime;
    
    console.error('Health check failed:', {
      error: (error as Error).message,
      duration,
    });

    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Also support HEAD requests for simple checks
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}