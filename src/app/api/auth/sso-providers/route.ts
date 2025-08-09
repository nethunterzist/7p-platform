/**
 * SSO Providers Status API
 * Secure server-side endpoint for SSO provider availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSSO_PROVIDER_STATUS } from '@/lib/auth/config';
import { SSO_PROVIDERS } from '@/lib/auth/config-client';
import { SSOProvider } from '@/lib/types/auth';

export async function GET(request: NextRequest) {
  try {
    // Get server-side provider status (environment-based)
    const providerStatus = getSSO_PROVIDER_STATUS();
    
    // Combine client-safe metadata with server-side status
    const providers = Object.entries(SSO_PROVIDERS).map(([provider, config]) => ({
      provider: provider as SSOProvider,
      name: config.name,
      icon: config.icon,
      color: config.color,
      description: config.description,
      enabled: providerStatus[provider as SSOProvider]?.enabled || false,
      configured: providerStatus[provider as SSOProvider]?.configured || false
    }));

    return NextResponse.json({
      success: true,
      providers,
      total: providers.length,
      enabled_count: providers.filter(p => p.enabled).length
    });

  } catch (error) {
    console.error('SSO providers API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch SSO provider status',
      providers: [],
      total: 0,
      enabled_count: 0
    }, { status: 500 });
  }
}

// Handle CORS for cross-origin requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}