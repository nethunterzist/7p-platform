import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { courseId, userId, amount, currency, paymentMethod } = await request.json();

    if (!courseId || !userId || !amount) {
      return NextResponse.json(
        { error: 'Missing required payment data' },
        { status: 400 }
      );
    }

    // Generate transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const paymentResult = await db.create('payments', {
      user_id: userId,
      course_id: courseId,
      amount: amount,
      currency: currency || 'TRY',
      payment_method: paymentMethod || 'local_payment',
      transaction_id: transactionId,
      status: 'completed',
      provider_response: { simulated: true }
    });

    // Create enrollment after successful payment
    await db.create('enrollments', {
      user_id: userId,
      course_id: courseId,
      payment_status: 'paid',
      payment_amount: amount,
      status: 'active'
    });

    return NextResponse.json({
      success: true,
      paymentId: paymentResult.rows[0].id,
      transactionId
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}