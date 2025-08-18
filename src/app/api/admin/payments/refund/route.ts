import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transactionId, paymentIntentId, amount, reason } = await request.json();

    // Mock implementation for demo purposes
    return NextResponse.json({
      success: true,
      data: {
        refund: {
          id: `re_mock_${Date.now()}`,
          amount: amount || 1000,
          currency: 'usd',
          status: 'succeeded',
          reason: reason || 'requested_by_customer'
        }
      },
      message: 'Refund processed successfully (demo mode)'
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}