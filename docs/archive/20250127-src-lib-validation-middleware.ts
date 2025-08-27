/**
 * 🛡️ API Validation Middleware
 * 7P Education Platform - Request Validation & Security Middleware
 * 
 * Implements comprehensive input validation with rate limiting and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { securityService } from '@/lib/auth/security';
import { RATE_LIMIT_CONFIG } from '@/lib/auth/config';

export interface ValidationConfig<TBody = any, TQuery = any> {
  body?: z.ZodSchema<TBody>;
  query?: z.ZodSchema<TQuery>;
  requireAuth?: boolean;
  rateLimit?: {
    key: string;
    config: typeof RATE_LIMIT_CONFIG.api;
  };
  permissions?: string[];
}

export interface ValidatedRequest<TBody = any, TQuery = any> extends NextRequest {
  validatedBody?: TBody;
  validatedQuery?: TQuery;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * 🛡️ Create validation middleware for API routes
 */
export function withValidation<TBody = any, TQuery = any>(
  config: ValidationConfig<TBody, TQuery>
) {
  return function (
    handler: (request: ValidatedRequest<TBody, TQuery>) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        // 1. Security Headers
        const response = new NextResponse();
        addSecurityHeaders(response);

        // 2. Rate Limiting
        if (config.rateLimit) {
          const rateLimitResult = await checkRateLimit(request, config.rateLimit);
          if (!rateLimitResult.allowed) {
            return createErrorResponse('Rate limit exceeded', 429, {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
              'X-RateLimit-Limit': config.rateLimit.config.max_requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime || Date.now() + 60000).toISOString()
            });
          }
        }

        // 3. Authentication Check
        if (config.requireAuth) {
          const authResult = await validateAuthentication(request);
          if (!authResult.success) {
            return createErrorResponse('Authentication required', 401);
          }
          
          // Add user to request
          (request as ValidatedRequest<TBody, TQuery>).user = authResult.user;
          
          // 4. Permission Check
          if (config.permissions) {
            const hasPermission = checkPermissions(authResult.user.role, config.permissions);
            if (!hasPermission) {
              return createErrorResponse('Insufficient permissions', 403);
            }
          }
        }

        // 5. Body Validation
        if (config.body) {
          const bodyResult = await validateRequestBody(request, config.body);
          if (!bodyResult.success) {
            return createErrorResponse('Validation failed', 400, {}, {
              errors: bodyResult.errors,
              message: 'Request body validation failed'
            });
          }
          (request as ValidatedRequest<TBody, TQuery>).validatedBody = bodyResult.data;
        }

        // 6. Query Validation
        if (config.query) {
          const queryResult = validateQueryParams(request, config.query);
          if (!queryResult.success) {
            return createErrorResponse('Validation failed', 400, {}, {
              errors: queryResult.errors,
              message: 'Query parameter validation failed'
            });
          }
          (request as ValidatedRequest<TBody, TQuery>).validatedQuery = queryResult.data;
        }

        // 7. Content-Type Validation
        if (config.body && request.method !== 'GET') {
          const contentType = request.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            return createErrorResponse('Invalid Content-Type. Expected application/json', 400);
          }
        }

        // 8. Request Size Validation
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
          return createErrorResponse('Request too large', 413);
        }

        // 9. Execute Handler
        return await handler(request as ValidatedRequest<TBody, TQuery>);

      } catch (error) {
        console.error('Validation middleware error:', error);
        
        // Don't expose internal errors in production
        const isDevelopment = process.env.NODE_ENV === 'development';
        const errorMessage = isDevelopment 
          ? (error as Error).message 
          : 'Internal server error';
          
        return createErrorResponse(errorMessage, 500);
      }
    };
  };
}

/**
 * 🛡️ Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  const headers = securityService.getSecurityHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  
  // API-specific security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
}

/**
 * ⚡ Check rate limiting
 */
async function checkRateLimit(
  request: NextRequest, 
  rateLimit: { key: string; config: typeof RATE_LIMIT_CONFIG.api }
): Promise<{
  allowed: boolean;
  retryAfter?: number;
  resetTime?: number;
}> {
  const clientIP = getClientIP(request);
  const rateLimitKey = `${rateLimit.key}:${clientIP}`;
  
  const result = await securityService.checkRateLimit(rateLimitKey, rateLimit.config);
  
  return {
    allowed: result.allowed,
    retryAfter: result.retry_after,
    resetTime: result.reset_time
  };
}

/**
 * 🔐 Validate authentication
 */
async function validateAuthentication(request: NextRequest): Promise<{
  success: boolean;
  user?: { id: string; email: string; role: string };
  error?: string;
}> {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Try to get from cookies
      const cookies = request.cookies;
      token = cookies.get('access_token')?.value || null;
    }
    
    if (!token) {
      return { success: false, error: 'No authentication token provided' };
    }
    
    // Verify JWT token
    const decoded = securityService.verifyJWT(token, { checkBlacklist: true });
    
    return {
      success: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
}

/**
 * 🔒 Check user permissions
 */
function checkPermissions(userRole: string, requiredPermissions: string[]): boolean {
  const rolePermissions: Record<string, string[]> = {
    admin: ['*'], // Admin has all permissions
    instructor: ['course:read', 'course:write', 'student:read', 'assessment:read', 'assessment:write'],
    student: ['course:read', 'enrollment:read', 'enrollment:write', 'assessment:read', 'progress:write']
  };
  
  const userPermissions = rolePermissions[userRole] || [];
  
  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check if user has all required permissions
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * 📝 Validate request body
 */
async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{
  success: boolean;
  data?: T;
  errors?: string[];
}> {
  try {
    const body = await request.json();
    
    // Additional security: Check for suspicious patterns
    const bodyString = JSON.stringify(body);
    if (containsSuspiciousPatterns(bodyString)) {
      return {
        success: false,
        errors: ['Request contains potentially malicious content']
      };
    }
    
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    
    return { 
      success: false, 
      errors: ['Invalid request body format'] 
    };
  }
}

/**
 * 🔍 Validate query parameters
 */
function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const { searchParams } = new URL(request.url);
    const queryObject: Record<string, any> = {};
    
    // Convert URLSearchParams to object
    for (const [key, value] of searchParams.entries()) {
      // Handle numeric values
      if (value && !isNaN(Number(value))) {
        queryObject[key] = Number(value);
      } else if (value === 'true') {
        queryObject[key] = true;
      } else if (value === 'false') {
        queryObject[key] = false;
      } else {
        queryObject[key] = value;
      }
    }
    
    const data = schema.parse(queryObject);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    
    return { 
      success: false, 
      errors: ['Invalid query parameters'] 
    };
  }
}

/**
 * 🚨 Check for suspicious patterns
 */
function containsSuspiciousPatterns(content: string): boolean {
  const suspiciousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
    /insert\s+into/gi,
    /delete\s+from/gi,
    /update\s+.*set/gi,
    /__proto__/gi,
    /constructor/gi,
    /prototype/gi
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(content));
}

/**
 * 🌐 Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  return realIP || clientIP || '127.0.0.1';
}

/**
 * ❌ Create standardized error response
 */
function createErrorResponse(
  message: string,
  status: number,
  headers: Record<string, string> = {},
  data: any = {}
): NextResponse {
  const response = NextResponse.json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...data
  }, { status });
  
  // Add security headers
  addSecurityHeaders(response);
  
  // Add custom headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * 🚀 Quick validation helpers for common use cases
 */
export const validateAPI = {
  /**
   * Public API (no auth required)
   */
  public: <TBody = any, TQuery = any>(config: Omit<ValidationConfig<TBody, TQuery>, 'requireAuth'>) =>
    withValidation({ ...config, requireAuth: false }),
    
  /**
   * Authenticated API (auth required)
   */
  authenticated: <TBody = any, TQuery = any>(config: Omit<ValidationConfig<TBody, TQuery>, 'requireAuth'>) =>
    withValidation({ ...config, requireAuth: true }),
    
  /**
   * Admin-only API
   */
  adminOnly: <TBody = any, TQuery = any>(config: Omit<ValidationConfig<TBody, TQuery>, 'requireAuth' | 'permissions'>) =>
    withValidation({ ...config, requireAuth: true, permissions: ['*'] }),
    
  /**
   * Instructor API
   */
  instructor: <TBody = any, TQuery = any>(config: Omit<ValidationConfig<TBody, TQuery>, 'requireAuth' | 'permissions'>) =>
    withValidation({ ...config, requireAuth: true, permissions: ['course:write'] })
};

export default withValidation;