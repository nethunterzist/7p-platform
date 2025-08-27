import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { STRIPE_ENABLED, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/env';

export async function GET(request: NextRequest) {
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
        stripe: STRIPE_ENABLED ? false : null, // Only check Stripe if enabled
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
      if (NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const supabase = createClient(
          NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_KEY
        );

        // Simple query to test connection - use courses table instead of user_profiles
        const { data, error } = await supabase.from('courses').select('id').limit(1);
        
        if (error) {
          console.warn('Database health check failed:', error);
          healthData.checks.database = false;
        } else {
          healthData.checks.database = true;
        }
      } else {
        healthData.checks.database = false;
      }
    } catch (dbError) {
      console.error('Database health check error:', dbError);
      healthData.checks.database = false;
    }

    // Basic disk check (always true in serverless)
    healthData.checks.disk = true;

    // Check Stripe connection (only if payments are enabled)
    if (STRIPE_ENABLED) {
      try {
        // Only check if we have Stripe configuration
        if (process.env.STRIPE_SECRET_KEY) {
          // Simple Stripe connection test - we'll just verify the key format
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          healthData.checks.stripe = stripeKey.startsWith('sk_');
          
          if (!healthData.checks.stripe) {
            console.warn('Stripe health check failed - invalid key format');
          }
        } else {
          healthData.checks.stripe = false;
          console.warn('Stripe health check failed - missing secret key');
        }
      } catch (stripeError) {
        console.error('Stripe health check error:', stripeError);
        healthData.checks.stripe = false;
      }
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
      checks: healthData.checks,
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