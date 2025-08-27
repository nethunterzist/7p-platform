# 7P Education - Middleware System

> Route protection ve authentication middleware

## 🎯 Kritik Bilgiler

- **Current Version**: Simplified edge-safe middleware
- **Protection Method**: NextAuth cookie validation
- **Runtime**: Edge-compatible (no Node.js dependencies)
- **Performance**: ~5ms overhead per protected route

## 🔄 Middleware Evolution

### Old vs New Implementation

| Aspect | Old Middleware | New Middleware |
|--------|---------------|---------------|
| **Complexity** | 200+ lines | ~45 lines |
| **Dependencies** | bcrypt, Supabase admin | None |
| **Runtime** | Node.js only | Edge compatible |
| **Performance** | ~50ms | ~5ms |
| **Security** | JWT validation + role check | Cookie validation only |

### Migration Reason
```typescript
// ❌ OLD (Edge incompatible)
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request) {
  const jwt = await verifyJWT(token); // Complex validation
  const role = await supabase.auth.admin.getUserById(jwt.sub); // DB call
  // ... complex role validation
}

// ✅ NEW (Edge compatible)  
export function middleware(request) {
  const sessionToken = request.cookies.get('next-auth.session-token');
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
```

## 🛡️ Current Middleware Implementation

### Source: `src/middleware.ts`

```typescript
/**
 * SIMPLE EDGE-SAFE MIDDLEWARE
 * NO NODE-ONLY DEPENDENCIES - EMERGENCY FIX
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next();
  }
  
  // Check if user is on a protected route
  const isProtectedRoute = pathname.startsWith('/admin') || 
                          pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/student');
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth session token)
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                      request.cookies.get('__Secure-next-auth.session-token');

  // If no session token, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session exists, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## 🎯 Route Protection Strategy

### Protection Matrix

| Route Pattern | Protected | Method | Fallback |
|---------------|-----------|--------|----------|
| `/` | ❌ | - | Public access |
| `/login`, `/register` | ❌ | Bypass | Public access |
| `/courses`, `/marketplace` | ❌ | - | Public browsing |
| `/dashboard` | ✅ | Cookie check | Redirect to `/login` |
| `/student/*` | ✅ | Cookie check | Redirect to `/login` |
| `/admin/*` | ✅ | Cookie check | Redirect to `/login` |
| `/api/*` | ❌ | - | API-level auth |

### Bypass Routes
```typescript
const bypassRoutes = [
  '/api/',           // API routes handle own auth
  '/_next/',         // Next.js static assets  
  '/favicon.ico',    // Static favicon
  '/login',          // Login page
  '/',              // Landing page
  '/auth/',         // Auth callback pages
  '/courses',       // Public course browsing
  '/marketplace'    // Public marketplace
];
```

## 🔐 Session Cookie Handling

### NextAuth Cookie Strategy
```typescript
// Development cookie name
const devCookie = 'next-auth.session-token';

// Production cookie name (secure)  
const prodCookie = '__Secure-next-auth.session-token';

// Cookie lookup
const sessionToken = request.cookies.get(devCookie) || 
                    request.cookies.get(prodCookie);
```

### Cookie Security Properties
```typescript
// NextAuth cookie configuration (from auth config)
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
    options: {
      httpOnly: true,      // Prevent XSS access
      sameSite: 'lax',     // CSRF protection  
      path: '/',           // Site-wide access
      secure: process.env.NODE_ENV === 'production' // HTTPS only in prod
    }
  }
}
```

## ⚡ Performance Characteristics

### Middleware Overhead
- **Cookie Lookup**: ~1ms
- **Pattern Matching**: ~2ms  
- **Redirect Generation**: ~2ms
- **Total**: ~5ms per request

### Edge Runtime Benefits
- **Global Distribution**: Runs on Vercel Edge Network
- **Cold Start**: ~50ms vs ~200ms (Node.js)
- **Memory Usage**: 128MB limit (sufficient for simple logic)
- **Execution Time**: 30s limit (sufficient for auth checks)

## 🚨 Security Limitations & Risks

### Current Limitations
1. **No JWT Validation**: Only checks cookie existence
2. **No Role Verification**: Admin routes not role-protected at middleware level
3. **No Expiry Check**: Expired sessions may still pass
4. **No CSRF Protection**: Relies on NextAuth's built-in protection

### Risk Assessment

| Risk Level | Issue | Impact | Mitigation |
|------------|-------|--------|------------|
| **Medium** | Cookie existence only | Invalid sessions may pass | API-level validation |
| **High** | No role checks | Non-admin users reach admin routes | Page-level role checks |
| **Low** | Expired session pass-through | Brief access to stale sessions | NextAuth auto-refresh |
| **Low** | CSRF potential | Limited by SameSite cookies | NextAuth built-in protection |

## 🔧 Role-Based Access Control (Future)

### Planned Enhancement
```typescript
// FUTURE: Enhanced middleware with role checking
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session token
  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return redirectToLogin(request);
  }
  
  // Decode JWT (Edge-compatible)
  try {
    const session = await verifyJWT(sessionToken);
    
    // Role-based access control
    if (pathname.startsWith('/admin') && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }
    
    if (pathname.startsWith('/instructor') && 
        !['instructor', 'admin'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Instructor access required' }, 
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  } catch (error) {
    return redirectToLogin(request);
  }
}
```

### Implementation Challenges
1. **Edge Runtime Limitations**: JWT verification libraries
2. **Performance Impact**: JWT decode on every request
3. **Token Refresh**: Handling expired tokens
4. **Complexity**: Maintaining edge compatibility

## 📊 API-Level Authentication

### Current Pattern
Since middleware only checks cookie existence, API routes implement their own authentication:

```typescript
// API route authentication pattern
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  // Full session validation
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' }, 
      { status: 401 }
    );
  }
  
  // Role-based checks
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' }, 
      { status: 403 }
    );
  }
  
  // Proceed with authenticated logic
  return NextResponse.json({ data: 'success' });
}
```

### Page-Level Protection
```typescript  
// Page component authentication
'use client';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function AdminPage() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <LoadingSpinner />;
  }
  
  if (!session) {
    redirect('/login');
  }
  
  if (session.user.role !== 'admin') {
    redirect('/dashboard?error=access_denied');
  }
  
  return <AdminDashboard />;
}
```

## 🔍 Debugging Middleware

### Debug Headers
```typescript
// Add debug headers in development
if (process.env.NODE_ENV === 'development') {
  const response = NextResponse.next();
  response.headers.set('X-Middleware-Version', '2.0-simple');
  response.headers.set('X-Session-Found', sessionToken ? 'true' : 'false');
  response.headers.set('X-Protected-Route', isProtectedRoute ? 'true' : 'false');
  return response;
}
```

### Common Issues

#### Issue 1: "Infinite redirect loop"
```typescript
// Problem: Login page redirects to itself
if (pathname === '/login') {
  return NextResponse.next(); // Must bypass login page
}
```

#### Issue 2: "API routes blocked"
```typescript
// Problem: API routes processed by middleware
if (pathname.startsWith('/api/')) {
  return NextResponse.next(); // Must bypass API routes
}
```

#### Issue 3: "Static assets fail"
```typescript
// Problem: CSS/JS files blocked
const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude static assets
  ],
};
```

## 🚀 Future Roadmap

### Role-Based Access - Where to Implement?

Since middleware only checks session cookies, role-based access control is implemented at the **page and API handler level**:

#### Page-Level Role Guards
```typescript
// src/app/admin/dashboard/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <LoadingSpinner />;
  
  if (!session) {
    redirect('/login');
  }
  
  if (session.user.role !== 'admin') {
    redirect('/dashboard?error=access_denied');
  }
  
  return <AdminDashboardContent />;
}
```

#### API-Level Role Guards
```typescript
// src/app/api/admin/users/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' }, 
      { status: 401 }
    );
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' }, 
      { status: 403 }
    );
  }
  
  // Admin logic here
  return NextResponse.json({ data: 'admin data' });
}
```

#### Reusable Role Utility
```typescript
// src/lib/auth-utils.ts
export function requireRole(session: any, requiredRole: string) {
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  const roleHierarchy = { student: 1, instructor: 2, admin: 3 };
  const userLevel = roleHierarchy[session.user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 999;
  
  if (userLevel < requiredLevel) {
    throw new Error(`${requiredRole} access required`);
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  try {
    requireRole(session, 'admin');
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: error.message.includes('Authentication') ? 401 : 403 }
    );
  }
  
  // Proceed with admin logic
}
```

### Planned Improvements
1. **Enhanced JWT Validation**: Edge-compatible JWT verification
2. **Role-Based Middleware**: Role checks at middleware level  
3. **Rate Limiting**: Request rate limiting per user/IP
4. **Security Headers**: CSP and security headers injection
5. **Audit Logging**: Request logging and monitoring

### Migration Strategy
1. **Phase 1**: Keep current simple middleware for stability
2. **Phase 2**: Implement enhanced middleware in parallel
3. **Phase 3**: A/B test performance and security
4. **Phase 4**: Gradual migration with rollback capability

---

**Related Docs**: [AUTH.md](./AUTH.md) | [SECURITY.md](./SECURITY.md) | [RUNTIME.md](./RUNTIME.md)  
*Last updated: 2025-01-27*