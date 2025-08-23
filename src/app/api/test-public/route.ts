import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/security';

/**
 * Public test endpoint for security system validation
 * This endpoint does NOT require authentication - for testing basic security features
 */

export async function GET(request: NextRequest) {
  try {
    // Return success response with security headers
    const response = NextResponse.json({
      success: true,
      message: 'Public test endpoint working correctly',
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries())
    });

    // Add security headers manually to test
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error: any) {
    const response = NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });

    // Add security headers even to error responses
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Return success response
    const response = NextResponse.json({
      success: true,
      message: 'POST request processed successfully',
      data: body,
      timestamp: new Date().toISOString()
    });

    // Add security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error: any) {
    const response = NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 400 });

    // Add security headers even to error responses
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}