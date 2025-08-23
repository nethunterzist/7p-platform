import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class RateLimitMiddleware {
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS = 60; // 60 requests per minute
  
  static async check(request: NextRequest): Promise<NextResponse | null> {
    // Skip rate limiting if disabled
    if (process.env.ENABLE_RATE_LIMITING !== 'true') {
      return null;
    }
    
    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    const key = `${ip}:${request.nextUrl.pathname}`;
    
    // Clean up old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k);
      }
    }
    
    // Check rate limit
    const limit = rateLimitMap.get(key);
    
    if (!limit) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.WINDOW_MS
      });
      return null;
    }
    
    if (limit.resetTime < now) {
      limit.count = 1;
      limit.resetTime = now + this.WINDOW_MS;
      return null;
    }
    
    if (limit.count >= this.MAX_REQUESTS) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          retryAfter: Math.ceil((limit.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((limit.resetTime - now) / 1000)),
            'X-RateLimit-Limit': String(this.MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(limit.resetTime).toISOString()
          }
        }
      );
    }
    
    limit.count++;
    return null;
  }
}