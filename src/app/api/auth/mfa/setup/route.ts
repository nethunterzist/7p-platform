/**
 * MFA Setup API Route
 * Generate TOTP secrets and QR codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mfaService } from '@/lib/auth/mfa';
import { securityService } from '@/lib/auth/security';

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let userId: string;
    
    try {
      const payload = securityService.verifyJWT(token);
      userId = payload.sub;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, mfa_enabled')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if MFA is already enabled
    if (userData.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this account' },
        { status: 400 }
      );
    }

    // Generate MFA secret
    const mfaSecret = await mfaService.generateTOTPSecret(userId, userData.email);

    return NextResponse.json({
      secret: mfaSecret.secret,
      qrCodeUrl: mfaSecret.qrCodeUrl,
      backupCodes: mfaSecret.backupCodes,
      recoveryCode: mfaSecret.recoveryCode
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}