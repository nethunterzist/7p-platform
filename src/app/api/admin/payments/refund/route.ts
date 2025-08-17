import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { processRefund, handleStripeError } from '@/lib/stripe';
import { 
  updatePaymentTransaction, 
  getPaymentTransactionByStripeId,
  logPaymentEvent 
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { transactionId, paymentIntentId, amount, reason } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Get transaction details
    const transaction = await getPaymentTransactionByStripeId(paymentIntentId);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Only successful payments can be refunded' },
        { status: 400 }
      );
    }

    // Process refund through Stripe
    const refund = await processRefund(
      paymentIntentId,
      amount, // Optional partial refund amount
      reason as 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined
    );

    // Update transaction status
    await updatePaymentTransaction(transaction.id, {
      status: 'refunded',
    });

    // Create refund record
    const { error: refundError } = await supabase
      .from('refunds')
      .insert({
        transaction_id: transaction.id,
        stripe_refund_id: refund.id,
        amount: refund.amount,
        currency: refund.currency || 'usd',
        reason: reason || 'requested_by_customer',
        status: refund.status,
      });

    if (refundError) {
      console.error('Error creating refund record:', refundError);
    }

    // Log the refund
    await logPaymentEvent({
      user_id: transaction.user_id,
      transaction_id: transaction.id,
      event_type: 'refund_processed',
      message: `Refund processed by admin (${user.email})`,
      metadata: {
        refundId: refund.id,
        amount: refund.amount,
        reason: reason || 'requested_by_customer',
        adminId: user.id,
      },
    });

    return NextResponse.json({
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
    });

  } catch (error) {
    console.error('Refund processing error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = handleStripeError(error);
      return NextResponse.json(
        { error: stripeError.message },
        { status: stripeError.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}