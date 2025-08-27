export const runtime = 'nodejs'; // Force Node.js runtime for Supabase

/**
 * Send Email Verification API Route
 * Handles verification email sending for authenticated users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { EmailVerificationService } from '@/lib/auth/email-verification'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession()
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Please log in first.'
      }, { status: 401 })
    }

    // Check if email is already verified
    const isAlreadyVerified = await EmailVerificationService.isEmailVerified(session.user.id)
    
    if (isAlreadyVerified) {
      return NextResponse.json({
        success: false,
        error: 'Email is already verified.'
      }, { status: 400 })
    }

    // Get client info
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Send verification email
    const result = await EmailVerificationService.sendVerificationEmail({
      userId: session.user.id,
      email: session.user.email,
      ipAddress: clientIP,
      userAgent
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Send verification email error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send verification email. Please try again.'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get verification status
    const status = await EmailVerificationService.getVerificationStatus(session.user.id)
    
    return NextResponse.json({
      success: true,
      ...status
    })

  } catch (error) {
    console.error('Get verification status error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get verification status'
    }, { status: 500 })
  }
}