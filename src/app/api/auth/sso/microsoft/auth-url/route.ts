/**
 * Microsoft SSO Auth URL API
 * Secure server-side endpoint to generate auth URLs without exposing secrets
 */

import { NextRequest, NextResponse } from 'next/server';
import { microsoftSSO } from '@/lib/auth/providers/microsoft';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state } = body;

    // Generate auth URL server-side with access to secrets
    const authUrl = microsoftSSO.getAuthorizationUrl(state);

    return NextResponse.json({
      success: true,
      authUrl
    });

  } catch (error) {
    console.error('Microsoft auth URL generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Microsoft auth URL'
    }, { status: 500 });
  }
}

// Handle CORS for cross-origin requests
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