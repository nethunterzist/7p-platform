import { NextRequest, NextResponse } from 'next/server';

export class APISecurityMiddleware {
  static async protect(request: NextRequest): Promise<NextResponse | null> {
    // Security headers
    const headers = new Headers(request.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Check for suspicious patterns
    const url = request.nextUrl.pathname;
    const suspiciousPatterns = [
      /\.\./g, // Path traversal
      /<script/gi, // XSS attempt
      /union.*select/gi, // SQL injection
      /exec\(/gi, // Code execution
      /eval\(/gi, // Code evaluation
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(request.url)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }
    
    return null;
  }
  
  static async validateInput(request: NextRequest): Promise<NextResponse | null> {
    // Input validation for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const contentType = request.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return NextResponse.json(
            { error: 'Invalid content type' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid request' },
          { status: 400 }
        );
      }
    }
    
    return null;
  }
}