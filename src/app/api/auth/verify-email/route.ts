/**
 * EMAIL VERIFICATION API ROUTE - 7P Education
 * Handle email verification and resend requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationService } from '@/lib/auth/email-verification';
import { createClient } from '@/utils/supabase/server';
import { auditLogger } from '@/lib/auth/audit-logger';

// Handle POST requests for sending/resending verification emails
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, email, token } = body;
    
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    if (action === 'send' || action === 'resend') {
      // Send or resend verification email
      if (!userId || !email) {
        return NextResponse.json(
          { error: 'User ID ve e-posta adresi gereklidir.' },
          { status: 400 }
        );
      }

      // Verify user exists
      const supabase = createClient();
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('user_id', userId)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Kullanıcı bulunamadı.' },
          { status: 404 }
        );
      }

      // Check if already verified
      const isVerified = await EmailVerificationService.isEmailVerified(userId);
      if (isVerified) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'E-posta adresi zaten doğrulanmış.',
            isVerified: true
          }
        );
      }

      // Send verification email
      const result = await EmailVerificationService.sendVerificationEmail({
        userId,
        email,
        ipAddress: clientIP,
        userAgent
      });

      return NextResponse.json(result);

    } else if (action === 'verify') {
      // Verify email with token
      if (!token) {
        return NextResponse.json(
          { error: 'Doğrulama token gereklidir.' },
          { status: 400 }
        );
      }

      const result = await EmailVerificationService.verifyEmail(
        token,
        clientIP,
        userAgent
      );

      return NextResponse.json(result);

    } else {
      return NextResponse.json(
        { error: 'Geçersiz işlem.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Email verification API error:', error);
    
    await auditLogger.logSuspiciousActivity(
      null,
      getClientIP(request),
      request.headers.get('user-agent') || '',
      'email_verification_api_error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: request.url,
        method: request.method
      }
    );

    return NextResponse.json(
      { error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}

// Handle GET requests for verification status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const token = searchParams.get('token');

    if (token) {
      // Direct verification via URL token
      const result = await EmailVerificationService.verifyEmail(
        token,
        getClientIP(request),
        request.headers.get('user-agent') || ''
      );
      
      if (result.success) {
        // Redirect to success page
        const successUrl = new URL('/auth/verification-success', request.url);
        return NextResponse.redirect(successUrl);
      } else {
        // Redirect to error page with message
        const errorUrl = new URL('/auth/verification-error', request.url);
        errorUrl.searchParams.set('message', encodeURIComponent(result.message));
        return NextResponse.redirect(errorUrl);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID gereklidir.' },
        { status: 400 }
      );
    }

    // Get verification status
    const status = await EmailVerificationService.getVerificationStatus(userId);
    return NextResponse.json(status);

  } catch (error) {
    console.error('Email verification status error:', error);
    return NextResponse.json(
      { error: 'Durum sorgulanırken hata oluştu.' },
      { status: 500 }
    );
  }
}

// Utility function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || 'unknown';
}