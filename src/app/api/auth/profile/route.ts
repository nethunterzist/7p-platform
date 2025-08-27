export const runtime = 'nodejs'; // Force Node.js runtime for Supabase

/**
 * User Profile Management API
 * Handles profile updates, role management, and user preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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

// Profile update schema
const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[\d\s-()]{10,}$/).optional().or(z.literal('')),
  avatar_url: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
  language: z.enum(['tr', 'en']).optional(),
  preferences: z.object({
    email_notifications: z.boolean().optional(),
    course_updates: z.boolean().optional(),
    marketing_emails: z.boolean().optional(),
    assignment_reminders: z.boolean().optional(),
  }).optional()
})

// Password change schema
const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character')
})

// Get authentication session
async function getAuthSession(request: NextRequest) {
  try {
    // For NextAuth.js, we need to import the auth options
    const session = await getServerSession()
    return session
  } catch (error) {
    console.error('Session retrieval error:', error)
    return null
  }
}

// GET - Retrieve user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get user profile with detailed information
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        phone,
        role,
        status,
        timezone,
        language,
        preferences,
        email_verified_at,
        created_at,
        updated_at,
        last_active_at,
        failed_login_attempts,
        account_locked_until
      `)
      .eq('id', session.user.id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single()

    if (error || !profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 })
    }

    // Get additional profile statistics
    const [enrollmentStats, activityStats] = await Promise.all([
      // Get enrollment statistics
      supabaseAdmin
        .from('enrollments')
        .select('status')
        .eq('user_id', session.user.id),
      
      // Get recent activity (lesson progress)
      supabaseAdmin
        .from('lesson_progress')
        .select('created_at, completed_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    const stats = {
      total_enrollments: enrollmentStats.data?.length || 0,
      completed_courses: enrollmentStats.data?.filter(e => e.status === 'completed').length || 0,
      active_courses: enrollmentStats.data?.filter(e => e.status === 'active').length || 0,
      recent_activity: activityStats.data || []
    }

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        email_verified: !!profile.email_verified_at,
        is_locked: profile.account_locked_until && new Date(profile.account_locked_until) > new Date(),
        stats
      }
    })

  } catch (error) {
    console.error('Profile retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = profileUpdateSchema.parse(body)

    // Update user profile
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', session.user.id)
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        phone,
        role,
        timezone,
        language,
        preferences,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update profile'
      }, { status: 500 })
    }

    // Log profile update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: session.user.id,
        action: 'profile_updated',
        details: {
          updated_fields: Object.keys(validatedData),
          ip_address: request.headers.get('x-forwarded-for') || 'unknown'
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore audit log errors
      .catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Profile update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PATCH - Change password
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = passwordChangeSchema.parse(body)

    // Get current user with password hash
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('password_hash, failed_login_attempts')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.current_password, 
      user.password_hash
    )

    if (!isCurrentPasswordValid) {
      // Increment failed attempts
      await supabaseAdmin
        .from('user_profiles')
        .update({ 
          failed_login_attempts: (user.failed_login_attempts || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      return NextResponse.json({
        success: false,
        error: 'Current password is incorrect'
      }, { status: 400 })
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(
      validatedData.new_password, 
      user.password_hash
    )

    if (isSamePassword) {
      return NextResponse.json({
        success: false,
        error: 'New password must be different from current password'
      }, { status: 400 })
    }

    // Hash new password
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(validatedData.new_password, saltRounds)

    // Update password and reset failed attempts
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        password_hash: newPasswordHash,
        failed_login_attempts: 0,
        account_locked_until: null,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update password'
      }, { status: 500 })
    }

    // Update password in Supabase Auth as well
    try {
      await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
        password: validatedData.new_password
      })
    } catch (authError) {
      console.error('Supabase Auth password update error:', authError)
      // Continue even if Auth update fails, as the database update succeeded
    }

    // Log password change
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: session.user.id,
        action: 'password_changed',
        details: {
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent')
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore audit log errors
      .catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Password change error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE - Delete user account (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({
        success: false,
        error: 'Password confirmation required'
      }, { status: 400 })
    }

    // Verify password before deletion
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('password_hash')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Password is incorrect'
      }, { status: 400 })
    }

    // Soft delete the user account
    const { error: deleteError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: session.user.id,
        email: `deleted_${Date.now()}_${session.user.email}`, // Anonymize email
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)

    if (deleteError) {
      console.error('Account deletion error:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete account'
      }, { status: 500 })
    }

    // Delete from Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(session.user.id)
    } catch (authError) {
      console.error('Supabase Auth deletion error:', authError)
    }

    // Log account deletion
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: session.user.id,
        action: 'account_deleted',
        details: {
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          deletion_reason: 'user_requested'
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore audit log errors
      .catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}