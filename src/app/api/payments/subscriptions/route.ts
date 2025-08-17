import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { 
  cancelSubscription, 
  createPortalSession, 
  handleStripeError 
} from '@/lib/stripe';
import { 
  getUserSubscription, 
  getSubscriptionPlans,
  getStripeCustomerByUserId,
  logPaymentEvent 
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

// GET - Get user's subscription and available plans
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's current subscription
    const subscription = await getUserSubscription(user.id);

    // Get available subscription plans
    const plans = await getSubscriptionPlans();

    return NextResponse.json({
      subscription,
      plans,
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update subscription (cancel, reactivate, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const { action, cancelAtPeriodEnd = true } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's current subscription
    const subscription = await getUserSubscription(user.id);
    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    let updatedSubscription: Stripe.Subscription;

    switch (action) {
      case 'cancel':
        updatedSubscription = await cancelSubscription(
          subscription.stripe_subscription_id,
          cancelAtPeriodEnd
        );

        // Log the cancellation
        await logPaymentEvent({
          user_id: user.id,
          event_type: 'subscription_canceled',
          message: `Subscription canceled (at period end: ${cancelAtPeriodEnd})`,
          metadata: {
            subscriptionId: subscription.stripe_subscription_id,
            cancelAtPeriodEnd,
          },
        });
        break;

      case 'reactivate':
        // Remove cancellation
        updatedSubscription = await cancelSubscription(
          subscription.stripe_subscription_id,
          false
        );

        // Update to remove cancel_at_period_end
        const { stripe } = await import('@/lib/stripe');
        updatedSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: false,
          }
        );

        await logPaymentEvent({
          user_id: user.id,
          event_type: 'subscription_reactivated',
          message: 'Subscription reactivated',
          metadata: {
            subscriptionId: subscription.stripe_subscription_id,
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update database record
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        canceled_at: updatedSubscription.canceled_at 
          ? new Date(updatedSubscription.canceled_at * 1000).toISOString()
          : null,
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    if (updateError) {
      console.error('Error updating subscription in database:', updateError);
    }

    return NextResponse.json({
      subscription: updatedSubscription,
    });

  } catch (error) {
    console.error('Update subscription error:', error);

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