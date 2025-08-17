import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/stripe';
import { 
  logWebhookEvent, 
  markWebhookEventProcessed, 
  isWebhookEventProcessed,
  upsertSubscription,
  updatePaymentTransaction,
  createCoursePurchase,
  getPaymentTransactionByStripeId,
  logPaymentEvent,
  getSubscriptionPlan,
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, endpointSecret);

    // Check if event was already processed
    const alreadyProcessed = await isWebhookEventProcessed(event.id);
    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true });
    }

    // Log the webhook event
    await logWebhookEvent({
      stripe_event_id: event.id,
      event_type: event.type,
      data: event.data,
      processed: false,
    });

    // Process the event based on type
    await processWebhookEvent(event);

    // Mark event as processed
    await markWebhookEventProcessed(event.id);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

async function processWebhookEvent(event: Stripe.Event) {
  console.log(`Processing webhook event: ${event.type}`);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;

    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const transaction = await getPaymentTransactionByStripeId(paymentIntent.id);
    
    if (!transaction) {
      console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update transaction status
    await updatePaymentTransaction(transaction.id, {
      status: 'succeeded',
      stripe_charge_id: paymentIntent.charges?.data[0]?.id || null,
    });

    // Create course purchase record
    if (transaction.type === 'course_purchase' && transaction.course_id) {
      await createCoursePurchase({
        user_id: transaction.user_id,
        course_id: transaction.course_id,
        transaction_id: transaction.id,
        purchase_type: 'individual',
        amount_paid: transaction.amount,
        currency: transaction.currency,
      });

      // Automatically enroll user in the course
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .upsert({
          user_id: transaction.user_id,
          course_id: transaction.course_id,
          status: 'active',
        }, {
          onConflict: 'user_id,course_id'
        });

      if (enrollmentError) {
        console.error('Error creating enrollment:', enrollmentError);
      }

    } else if (transaction.type === 'bundle_purchase' && transaction.bundle_id) {
      await createCoursePurchase({
        user_id: transaction.user_id,
        bundle_id: transaction.bundle_id,
        transaction_id: transaction.id,
        purchase_type: 'bundle',
        amount_paid: transaction.amount,
        currency: transaction.currency,
      });

      // Enroll user in all bundle courses
      const { data: bundleCourses } = await supabase
        .from('bundle_courses')
        .select('course_id')
        .eq('bundle_id', transaction.bundle_id);

      if (bundleCourses) {
        for (const course of bundleCourses) {
          await supabase
            .from('enrollments')
            .upsert({
              user_id: transaction.user_id,
              course_id: course.course_id,
              status: 'active',
            }, {
              onConflict: 'user_id,course_id'
            });
        }
      }
    }

    await logPaymentEvent({
      user_id: transaction.user_id,
      transaction_id: transaction.id,
      event_type: 'payment_succeeded',
      message: `Payment succeeded for ${transaction.type}`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        amount: transaction.amount,
      },
    });

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const transaction = await getPaymentTransactionByStripeId(paymentIntent.id);
    
    if (!transaction) {
      console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update transaction status
    await updatePaymentTransaction(transaction.id, {
      status: 'failed',
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
    });

    await logPaymentEvent({
      user_id: transaction.user_id,
      transaction_id: transaction.id,
      event_type: 'payment_failed',
      message: `Payment failed for ${transaction.type}`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
      },
      level: 'error',
    });

  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    // Get customer info to find user_id
    const { stripe } = await import('@/lib/stripe');
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      console.error('Customer not found for subscription:', subscription.id);
      return;
    }

    // Find user by email or customer metadata
    const { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('stripe_customer_id', customer.id)
      .single();

    if (!stripeCustomer) {
      console.error('User not found for customer:', customer.id);
      return;
    }

    // Find the subscription plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', subscription.items.data[0].price.id)
      .single();

    if (!plan) {
      console.error('Subscription plan not found for price:', subscription.items.data[0].price.id);
      return;
    }

    // Create subscription record
    await upsertSubscription({
      user_id: stripeCustomer.user_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customer.id,
      plan_id: plan.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start 
        ? new Date(subscription.trial_start * 1000).toISOString() 
        : undefined,
      trial_end: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : undefined,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    await logPaymentEvent({
      user_id: stripeCustomer.user_id,
      event_type: 'subscription_created',
      message: 'Subscription created',
      metadata: {
        subscriptionId: subscription.id,
        planId: plan.id,
        status: subscription.status,
      },
    });

  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find existing subscription record
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!existingSubscription) {
      console.error('Subscription record not found:', subscription.id);
      return;
    }

    // Update subscription record
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        canceled_at: subscription.canceled_at 
          ? new Date(subscription.canceled_at * 1000).toISOString() 
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
    }

    await logPaymentEvent({
      user_id: existingSubscription.user_id,
      event_type: 'subscription_updated',
      message: 'Subscription updated',
      metadata: {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Find existing subscription record
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!existingSubscription) {
      console.error('Subscription record not found:', subscription.id);
      return;
    }

    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating canceled subscription:', error);
    }

    await logPaymentEvent({
      user_id: existingSubscription.user_id,
      event_type: 'subscription_canceled',
      message: 'Subscription canceled',
      metadata: {
        subscriptionId: subscription.id,
      },
    });

  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    // Find existing subscription record
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!existingSubscription) {
      console.error('Subscription record not found:', subscription.id);
      return;
    }

    await logPaymentEvent({
      user_id: existingSubscription.user_id,
      event_type: 'trial_will_end',
      message: 'Trial period will end soon',
      metadata: {
        subscriptionId: subscription.id,
        trialEnd: subscription.trial_end,
      },
    });

    // Here you could send email notifications or other actions

  } catch (error) {
    console.error('Error handling trial will end:', error);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    if (session.mode === 'subscription') {
      // Subscription checkout completed - subscription.created event will handle database updates
      console.log('Subscription checkout completed:', session.id);
    } else if (session.mode === 'payment') {
      // One-time payment checkout completed - payment_intent.succeeded event will handle database updates
      console.log('Payment checkout completed:', session.id);
    }

    // Log the checkout completion
    if (session.metadata?.userId) {
      await logPaymentEvent({
        user_id: session.metadata.userId,
        event_type: 'checkout_completed',
        message: `Checkout session completed (${session.mode})`,
        metadata: {
          sessionId: session.id,
          mode: session.mode,
          amountTotal: session.amount_total,
        },
      });
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      return; // Not a subscription invoice
    }

    // Find subscription record
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (!subscription) {
      console.error('Subscription not found for invoice:', invoice.id);
      return;
    }

    // Create invoice record
    const { error } = await supabase
      .from('invoices')
      .insert({
        user_id: subscription.user_id,
        stripe_invoice_id: invoice.id,
        subscription_id: invoice.subscription as string,
        status: invoice.status || 'paid',
        amount_paid: invoice.amount_paid || 0,
        amount_due: invoice.amount_due || 0,
        currency: invoice.currency || 'usd',
        invoice_pdf_url: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_date: new Date(invoice.created * 1000).toISOString(),
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        paid_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating invoice record:', error);
    }

    await logPaymentEvent({
      user_id: subscription.user_id,
      event_type: 'invoice_payment_succeeded',
      message: 'Invoice payment succeeded',
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        amountPaid: invoice.amount_paid,
      },
    });

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      return; // Not a subscription invoice
    }

    // Find subscription record
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (!subscription) {
      console.error('Subscription not found for invoice:', invoice.id);
      return;
    }

    await logPaymentEvent({
      user_id: subscription.user_id,
      event_type: 'invoice_payment_failed',
      message: 'Invoice payment failed',
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        amountDue: invoice.amount_due,
      },
      level: 'error',
    });

  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}