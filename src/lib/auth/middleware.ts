import { NextRequest, NextResponse } from 'next/server';
import { authService } from './jwt-auth';

export async function authMiddleware(request: NextRequest) {
  // Get token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || 
                request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const user = await authService.verifyAccessToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Add user to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id.toString());
    requestHeaders.set('x-user-email', user.email);
    requestHeaders.set('x-user-role', user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function requireRole(request: NextRequest, requiredRoles: string[]) {
  const userRole = request.headers.get('x-user-role');
  
  if (!userRole || !requiredRoles.includes(userRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return null; // Continue
}

export function getUserFromRequest(request: NextRequest) {
  return {
    id: parseInt(request.headers.get('x-user-id') || '0'),
    email: request.headers.get('x-user-email') || '',
    role: request.headers.get('x-user-role') || 'student'
  };
}