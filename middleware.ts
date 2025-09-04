import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Only protect explicit routes; everything else passes
const PROTECTED_ROUTES = ['/dashboard', '/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal and static routes early
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check if route needs authentication
  const needsAuth = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (!needsAuth) return NextResponse.next();

  // Validate NextAuth JWT cookie
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
