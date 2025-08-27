export const runtime = 'nodejs'; // Edge çakışmasın
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.NODE_ENV,
    payments: process.env.PAYMENTS_MODE,
    ts: new Date().toISOString()
  });
}