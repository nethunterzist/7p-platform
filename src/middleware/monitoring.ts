import { NextRequest, NextResponse } from 'next/server';
import { log, logApiRequest } from '@/lib/monitoring/logger';
import PerformanceMonitor from '@/lib/monitoring/performance';

// Request/Response monitoring middleware
export function monitoringMiddleware(request: NextRequest) {
  const startTime = performance.now();
  const requestId = generateRequestId();
  
  // Log incoming request
  log.http('API request received', {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIP(request),
    logType: 'api-request-start',
  });

  // Add request ID header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Continue with the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Enhanced API route wrapper with monitoring
export function withApiMonitoring(handler: any, options: {
  operationName?: string;
  requireAuth?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
} = {}) {
  return async (req: NextRequest, res?: any) => {
    const startTime = performance.now();
    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const operationName = options.operationName || `${req.method} ${req.url}`;

    // Enhanced request context
    const requestContext = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      ip: getClientIP(req),
      operationName,
    };

    try {
      // Rate limiting check (if configured)
      if (options.rateLimit) {
        const rateLimitResult = await checkRateLimit(requestContext, options.rateLimit);
        if (!rateLimitResult.allowed) {
          const duration = performance.now() - startTime;
          
          log.warn('Rate limit exceeded', {
            ...requestContext,
            duration,
            remainingRequests: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            logType: 'rate-limit-exceeded',
          });

          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit': options.rateLimit.max.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
                'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              }
            }
          );
        }
      }

      // Authentication check (if required)
      if (options.requireAuth) {
        const authResult = await validateAuthentication(req);
        if (!authResult.valid) {
          const duration = performance.now() - startTime;
          
          log.security('Unauthorized API access attempt', {
            ...requestContext,
            duration,
            authError: authResult.error,
            severity: 'medium',
            logType: 'auth-failed',
          });

          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        
        requestContext.userId = authResult.userId;
        requestContext.userEmail = authResult.userEmail;
      }

      // Execute the handler
      const result = await PerformanceMonitor.measureApiCall(
        operationName,
        () => handler(req, res),
        requestContext
      );

      const duration = performance.now() - startTime;
      const statusCode = result?.status || 200;

      // Log successful request
      logApiRequest(
        req.method,
        req.url,
        statusCode,
        duration,
        requestContext
      );

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Log error
      log.error('API handler error', {
        ...requestContext,
        error: error as Error,
        duration,
        logType: 'api-error',
      });

      // Return error response
      return NextResponse.json(
        { 
          error: process.env.NODE_ENV === 'development' 
            ? (error as Error).message 
            : 'Internal server error',
          requestId 
        },
        { status: 500 }
      );
    }
  };
}

// Database operation monitoring
export async function withDatabaseMonitoring<T>(
  operation: string,
  query: () => Promise<T>,
  context: {
    table?: string;
    operation?: string;
    userId?: string;
    requestId?: string;
  } = {}
): Promise<T> {
  return PerformanceMonitor.measureDbQuery(
    operation,
    query,
    context
  );
}

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(request: NextRequest): string {
  // Try different headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Rate limiting implementation (simple in-memory store)
const rateLimitStore = new Map<string, {
  requests: number;
  resetTime: number;
}>();

async function checkRateLimit(
  context: any, 
  config: { windowMs: number; max: number }
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const key = `${context.ip}:${context.operationName}`;
  const now = Date.now();
  const resetTime = now + config.windowMs;
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    // Reset window
    rateLimitStore.set(key, {
      requests: 1,
      resetTime,
    });
    
    return {
      allowed: true,
      remaining: config.max - 1,
      resetTime,
    };
  }
  
  if (current.requests >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }
  
  // Increment request count
  current.requests++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: config.max - current.requests,
    resetTime: current.resetTime,
  };
}

// Authentication validation
async function validateAuthentication(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  userId?: string;
  userEmail?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { valid: false, error: 'No bearer token' };
    }

    const token = authHeader.substring(7);
    
    // Validate token (implement your own logic)
    // This is a placeholder - replace with your actual token validation
    const decoded = await validateJWTToken(token);
    
    if (!decoded) {
      return { valid: false, error: 'Invalid token' };
    }

    return {
      valid: true,
      userId: decoded.sub,
      userEmail: decoded.email,
    };
    
  } catch (error) {
    return { 
      valid: false, 
      error: (error as Error).message 
    };
  }
}

// JWT token validation (placeholder)
async function validateJWTToken(token: string): Promise<any> {
  // Implement your JWT validation logic here
  // This could use jsonwebtoken library or Supabase auth
  return null; // Placeholder
}

// Health check endpoint
export function createHealthCheckHandler() {
  return withApiMonitoring(async (req: NextRequest) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    };

    log.info('Health check performed', {
      healthStatus,
      logType: 'health-check',
    });

    return NextResponse.json(healthStatus);
  }, {
    operationName: 'health-check',
  });
}

export default {
  monitoringMiddleware,
  withApiMonitoring,
  withDatabaseMonitoring,
  createHealthCheckHandler,
};