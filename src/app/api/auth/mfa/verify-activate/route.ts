/**
 * MFA Verify and Activate API
 * Server-side MFA verification without exposing JWT secrets
 */

import { NextRequest, NextResponse } from 'next/server';
import { mfaService } from '@/lib/auth/mfa';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token, secret } = body;

    if (!userId || !token || !secret) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Use server-side MFA service with JWT secret access
    const success = await mfaService.verifyAndActivateTOTP(userId, token, secret);

    return NextResponse.json({
      success,
      error: success ? null : 'Invalid TOTP token'
    });

  } catch (error) {
    console.error('MFA verify activate API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to verify and activate MFA'
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