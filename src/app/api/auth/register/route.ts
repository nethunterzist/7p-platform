/**
 * User Registration API Endpoint
 * Secure user registration with password validation and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/auth/security';
import { supabase } from '@/lib/supabase';
import { AUTH_CONFIG, RATE_LIMIT_CONFIG, DEFAULT_PASSWORD_POLICY } from '@/lib/auth/config';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organization?: string;
  invite_code?: string;
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  message?: string;
  error?: string;
  password_feedback?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<RegisterResponse>> {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name, organization, invite_code } = body;

    // Input validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = securityService.sanitizeInput(email.toLowerCase());
    const sanitizedName = securityService.sanitizeInput(name);

    if (!securityService.isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get client information for security tracking
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Rate limiting check
    const rateLimit = await securityService.checkRateLimit(
      `register:${ipAddress}`,
      RATE_LIMIT_CONFIG.register
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many registration attempts. Please try again later.',
          retry_after: rateLimit.retry_after
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimit.retry_after?.toString() || '60'
          }
        }
      );
    }

    // Validate password strength
    const passwordValidation = securityService.validatePassword(password, DEFAULT_PASSWORD_POLICY);
    if (!passwordValidation.meets_policy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password does not meet security requirements',
          password_feedback: passwordValidation.feedback
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', sanitizedEmail)
      .single();

    if (existingUser) {
      // Log registration attempt with existing email (potential reconnaissance)
      await auditLogger.logSecurity(
        'auth.register.email_exists',
        undefined,
        {
          email: sanitizedEmail,
          ip_address: ipAddress,
          user_agent: userAgent
        },
        'high'
      );

      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Validate invite code if provided
    if (invite_code) {
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('id, organization_id, role, used_at')
        .eq('code', invite_code)
        .eq('email', sanitizedEmail)
        .single();

      if (inviteError || !inviteData) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired invitation code' },
          { status: 400 }
        );
      }

      if (inviteData.used_at) {
        return NextResponse.json(
          { success: false, error: 'Invitation code has already been used' },
          { status: 400 }
        );
      }
    }

    // Hash password securely
    const passwordHash = await securityService.hashPassword(password);

    // Create user account
    const userData = {
      email: sanitizedEmail,
      password_hash: passwordHash,
      name: sanitizedName,
      role: invite_code ? 'teacher' : 'student', // Default role based on invitation
      email_verified: false,
      mfa_enabled: false,
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([userData])
      .select('id, email, name, role')
      .single();

    if (createError) {
      console.error('User creation error:', createError);
      
      // Check if it's a unique constraint violation (race condition)
      if (createError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Store password in history for future reuse prevention
    await securityService.storePasswordHistory(newUser.id, passwordHash);

    // Mark invitation as used if provided
    if (invite_code) {
      await supabase
        .from('invitations')
        .update({ 
          used_at: new Date().toISOString(),
          used_by: newUser.id
        })
        .eq('code', invite_code);
    }

    // Send email verification (implement based on your email service)
    await sendVerificationEmail(newUser.email, newUser.id);

    // Log successful registration
    await auditLogger.logAuth(
      AUDIT_EVENTS.USER_CREATED,
      newUser.id,
      {
        ip_address: ipAddress,
        user_agent: userAgent,
        registration_method: invite_code ? 'invitation' : 'self_registration',
        organization: organization
      }
    );

    return NextResponse.json<RegisterResponse>({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      },
      message: 'Account created successfully. Please check your email to verify your account.'
    });

  } catch (error) {
    console.error('Registration API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send email verification (placeholder implementation)
 */
async function sendVerificationEmail(email: string, userId: string): Promise<void> {
  try {
    // Generate verification token
    const verificationToken = securityService.generateSecureId();
    
    // Store verification token in database
    await supabase
      .from('email_verifications')
      .insert([{
        user_id: userId,
        token: verificationToken,
        email: email,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString()
      }]);

    // TODO: Send actual email using your email service
    // Example: SendGrid, AWS SES, Resend, etc.
    console.log(`📧 Email verification sent to ${email} with token: ${verificationToken}`);
    
    // In production, send email with verification link:
    // const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email?token=${verificationToken}`;
    
  } catch (error) {
    console.error('Email verification sending error:', error);
  }
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  return realIP || clientIP || '127.0.0.1';
}