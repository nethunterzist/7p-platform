import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession, handleStripeError } from '@/lib/stripe';
import { getStripeCustomerByUserId, logPaymentEvent } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { returnUrl } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get Stripe customer
    const stripeCustomer = await getStripeCustomerByUserId(user.id);
    if (!stripeCustomer) {
      return NextResponse.json(
        { error: 'No customer record found' },
        { status: 404 }
      );
    }

    // Create portal session
    const portalSession = await createPortalSession(
      stripeCustomer.stripe_customer_id,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );

    // Log the portal access
    await logPaymentEvent({
      user_id: user.id,
      event_type: 'customer_portal_accessed',
      message: 'Customer portal session created',
      metadata: {
        portalSessionId: portalSession.id,
        returnUrl,
      },
    });

    return NextResponse.json({
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Create portal session error:', error);

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