import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const session = await getServerSession(authOptions);

  const cookieNames = req.cookies ? Array.from(req.cookies.keys ? req.cookies.keys() : []).slice(0, 10) : [];

  return NextResponse.json({
    hasToken: !!token,
    tokenKeys: token ? Object.keys(token).slice(0, 10) : [],
    hasSession: !!session,
    sessionUser: session?.user ? { email: session.user.email, name: session.user.name } : null,
    envCheck: {
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      hasUrl: !!process.env.NEXTAUTH_URL,
      trustHost: process.env.AUTH_TRUST_HOST === 'true',
    },
    cookies: cookieNames,
  });
}

