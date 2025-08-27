export const runtime = 'nodejs'; // Force Node.js runtime for Supabase

/**
 * Password Reset Request API
 * Integrated with NextAuth.js authentication system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Environment validation
const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
}

// Supabase admin client
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Request schema
const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
})

// Rate limiting for password reset requests
const resetRateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RESET_RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_RESET_ATTEMPTS = 3

function checkResetRateLimit(identifier: string): boolean {
  const now = Date.now()
  const current = resetRateLimitMap.get(identifier)
  
  if (!current || now - current.timestamp > RESET_RATE_LIMIT_WINDOW) {
    resetRateLimitMap.set(identifier, { count: 1, timestamp: now })
    return true
  }
  
  if (current.count >= MAX_RESET_ATTEMPTS) {
    return false
  }
  
  current.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = passwordResetRequestSchema.parse(body)

    // Rate limiting by email
    const rateLimitKey = `password_reset:${email.toLowerCase()}`
    
    if (!checkResetRateLimit(rateLimitKey)) {
      return NextResponse.json({
        success: false,
        error: 'Too many password reset attempts. Please try again later.'
      }, { status: 429 })
    }

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, status')
      .eq('email', email.toLowerCase())
      .eq('status', 'active')
      .is('deleted_at', null)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists for security
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      })
    }

    // Generate secure reset token (using crypto-random approach)
    const resetToken = generateSecureToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store password reset token
    const { error: insertError } = await supabaseAdmin
      .from('password_resets')
      .insert({
        user_id: user.id,
        email: user.email,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        ip_address: clientIP,
        used_at: null
      })

    if (insertError) {
      console.error('Error storing password reset token:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to process password reset request'
      }, { status: 500 })
    }

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.full_name, resetToken)

    // Log the password reset request
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'password_reset_requested',
        details: {
          email: user.email,
          ip_address: clientIP,
          expires_at: expiresAt.toISOString()
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore audit log errors
      .catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Password reset request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Complete password reset with token
 */
const passwordResetCompleteSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character')
})

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = passwordResetCompleteSchema.parse(body)

    // Get password reset record
    const { data: resetData, error: resetError } = await supabaseAdmin
      .from('password_resets')
      .select('user_id, email, expires_at, used_at')
      .eq('token', token)
      .single()

    if (resetError || !resetData) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired reset token'
      }, { status: 400 })
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Reset token has expired'
      }, { status: 400 })
    }

    // Check if token was already used
    if (resetData.used_at) {
      return NextResponse.json({
        success: false,
        error: 'Reset token has already been used'
      }, { status: 400 })
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, password_hash')
      .eq('id', resetData.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 400 })
    }

    // Check if new password is different from current (optional security measure)
    if (user.password_hash) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash)
      if (isSamePassword) {
        return NextResponse.json({
          success: false,
          error: 'New password must be different from current password'
        }, { status: 400 })
      }
    }

    // Hash new password
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update user password and reset failed attempts
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        password_hash: newPasswordHash,
        failed_login_attempts: 0,
        account_locked_until: null,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update password'
      }, { status: 500 })
    }

    // Mark reset token as used
    await supabaseAdmin
      .from('password_resets')
      .update({
        used_at: new Date().toISOString(),
        used_by_ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      .eq('token', token)

    // Log password change
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'password_reset_completed',
        details: {
          email: resetData.email,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          reset_method: 'email_token'
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore audit log errors
      .catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new password.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Password reset completion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Validate reset token
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: 'Reset token is required'
      }, { status: 400 })
    }

    // Check token validity
    const { data: resetData, error: resetError } = await supabaseAdmin
      .from('password_resets')
      .select('expires_at, used_at')
      .eq('token', token)
      .single()

    if (resetError || !resetData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid reset token'
      }, { status: 400 })
    }

    // Check if expired
    if (new Date(resetData.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Reset token has expired'
      }, { status: 400 })
    }

    // Check if already used
    if (resetData.used_at) {
      return NextResponse.json({
        valid: false,
        error: 'Reset token has already been used'
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      message: 'Reset token is valid'
    })

  } catch (error) {
    console.error('Reset token validation error:', error)
    return NextResponse.json({
      valid: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper functions
function generateSecureToken(): string {
  // Use crypto.randomBytes for secure token generation
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

async function sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
  try {
    // TODO: Implement actual email sending (SendGrid, AWS SES, etc.)
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
    
    console.log(`📧 Password reset email would be sent to: ${email}`)
    console.log(`🔗 Reset URL: ${resetUrl}`)
    
    // In production, integrate with your email service:
    // await emailService.sendPasswordResetEmail({
    //   to: email,
    //   name,
    //   resetUrl,
    //   expiresIn: '1 hour'
    // })
    
  } catch (error) {
    console.error('Password reset email sending error:', error)
  }
}