import { NextRequest, NextResponse } from 'next/server';
import { 
  createSubscriptionCheckout, 
  createOneTimeCheckout, 
  handleStripeError 
} from '@/lib/stripe';
import { 
  getOrCreateStripeCustomer, 
  getSubscriptionPlan, 
  getCoursePrice 
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { 
      type, 
      planId, 
      courseId, 
      bundleId, 
      successUrl, 
      cancelUrl 
    } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate type
    if (!['subscription', 'course', 'bundle'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid checkout type' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const stripeCustomer = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      user.user_metadata?.full_name
    );

    let session: Stripe.Checkout.Session;

    if (type === 'subscription') {
      if (!planId) {
        return NextResponse.json(
          { error: 'Plan ID is required for subscription checkout' },
          { status: 400 }
        );
      }

      // Get subscription plan
      const plan = await getSubscriptionPlan(planId);
      if (!plan) {
        return NextResponse.json(
          { error: 'Subscription plan not found' },
          { status: 404 }
        );
      }

      // Create subscription checkout session
      session = await createSubscriptionCheckout(
        plan.stripe_price_id,
        stripeCustomer.stripe_customer_id,
        successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
        cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        plan.trial_period_days > 0 ? plan.trial_period_days : undefined
      );

    } else if (type === 'course') {
      if (!courseId) {
        return NextResponse.json(
          { error: 'Course ID is required for course checkout' },
          { status: 400 }
        );
      }

      // Get course price
      const coursePrice = await getCoursePrice(courseId);
      if (!coursePrice) {
        return NextResponse.json(
          { error: 'Course price not found' },
          { status: 404 }
        );
      }

      // Create one-time checkout session
      session = await createOneTimeCheckout(
        coursePrice.stripe_price_id,
        stripeCustomer.stripe_customer_id,
        successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}?purchase=success`,
        cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}?canceled=true`,
        {
          userId: user.id,
          courseId,
          type: 'course_purchase',
        }
      );

    } else if (type === 'bundle') {
      if (!bundleId) {
        return NextResponse.json(
          { error: 'Bundle ID is required for bundle checkout' },
          { status: 400 }
        );
      }

      // Get bundle
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

      // Create one-time checkout session
      session = await createOneTimeCheckout(
        bundle.stripe_price_id,
        stripeCustomer.stripe_customer_id,
        successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bundles/${bundleId}?purchase=success`,
        cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bundles?canceled=true`,
        {
          userId: user.id,
          bundleId,
          type: 'bundle_purchase',
        }
      );
    }

    return NextResponse.json({
      sessionId: session!.id,
      url: session!.url,
    });

  } catch (error) {
    console.error('Create checkout session error:', error);

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