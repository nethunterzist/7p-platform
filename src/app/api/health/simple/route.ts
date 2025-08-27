import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      paymentsMode: process.env.PAYMENTS_MODE || 'disabled',
      message: 'Simple health check - no dependencies'
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Simple health check failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}