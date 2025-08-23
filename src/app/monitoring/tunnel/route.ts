// Sentry tunnel to avoid ad-blockers
import { NextRequest, NextResponse } from 'next/server';

const SENTRY_HOST = 'o4507896309989376.ingest.de.sentry.io';
const SENTRY_PROJECT_IDS = ['4507896309989377']; // Add your actual project ID here

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    
    // Parse the envelope to extract the DSN
    const pieces = envelope.split('\n');
    const header = JSON.parse(pieces[0]);
    
    // Verify the DSN is for our project
    const dsn = header?.dsn;
    if (!dsn) {
      return new NextResponse('Bad request', { status: 400 });
    }
    
    const projectId = dsn.split('/').pop();
    if (!SENTRY_PROJECT_IDS.includes(projectId)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Forward to Sentry
    const upstreamUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;
    
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Sentry tunnel error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}