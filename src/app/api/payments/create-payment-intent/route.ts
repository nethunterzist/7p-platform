import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent, handleStripeError } from '@/lib/stripe';
import { 
  getOrCreateStripeCustomer, 
  createPaymentTransaction, 
  getCoursePrice, 
  logPaymentEvent 
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { withPaymentGuard } from '@/lib/payment-guard';
import Stripe from 'stripe';

export const POST = withPaymentGuard(async (request: NextRequest) => {
  try {
    const { courseId, bundleId } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate input
    if (!courseId && !bundleId) {
      return NextResponse.json(
        { error: 'Either courseId or bundleId is required' },
        { status: 400 }
      );
    }

    if (courseId && bundleId) {
      return NextResponse.json(
        { error: 'Cannot specify both courseId and bundleId' },
        { status: 400 }
      );
    }

    let amount: number;
    let currency = 'USD';
    let description: string;
    let type: 'course_purchase' | 'bundle_purchase';

    if (courseId) {
      // Get course price
      const coursePrice = await getCoursePrice(courseId);
      if (!coursePrice) {
        return NextResponse.json(
          { error: 'Course price not found' },
          { status: 404 }
        );
      }

      amount = coursePrice.price_amount;
      currency = coursePrice.currency;
      description = `Course purchase: ${courseId}`;
      type = 'course_purchase';
    } else {
      // Get bundle price
      const { data: bundle, error: bundleError } = await supabase
        .from('course_bundles')
        .select('*')
        .eq('id', bundleId)
        .eq('is_active', true)
        .single();

      if (bundleError || !bundle) {
        return NextResponse.json(
          { error: 'Bundle not found' },
          { status: 404 }
        );
      }

      amount = bundle.price_amount;
      currency = bundle.currency;
      description = `Bundle purchase: ${bundle.name}`;
      type = 'bundle_purchase';
    }

    // Get or create Stripe customer
    const stripeCustomer = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      user.role?.full_name
    );

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amount,
      currency as any,
      stripeCustomer.stripe_customer_id,
      {
        userId: user.id,
        courseId: courseId || '',
        bundleId: bundleId || '',
        type,
      }
    );

    // Create transaction record
    const transaction = await createPaymentTransaction({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      type,
      status: 'pending',
      amount,
      currency: currency as any,
      description,
      course_id: courseId || undefined,
      bundle_id: bundleId || undefined,
    });

    // Log the event
    await logPaymentEvent({
      user_id: user.id,
      transaction_id: transaction.id,
      event_type: 'payment_intent_created',
      message: `Payment intent created for ${type}`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: transaction.id,
      amount,
      currency,
    });

  } catch (error) {
    console.error('Create payment intent error:', error);

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
});