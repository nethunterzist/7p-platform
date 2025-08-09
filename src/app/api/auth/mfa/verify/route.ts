/**
 * MFA Verify API
 * Server-side MFA verification without exposing JWT secrets
 */

import { NextRequest, NextResponse } from 'next/server';
import { mfaService } from '@/lib/auth/mfa';
import { AuthMethod } from '@/lib/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token, method } = body;

    if (!userId || !token || !method) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Use server-side MFA service with JWT secret access
    const result = await mfaService.verifyMFA(userId, token, method as AuthMethod);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('MFA verify API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to verify MFA'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}