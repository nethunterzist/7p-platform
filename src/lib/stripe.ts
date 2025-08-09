import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// =====================================
// SERVER-SIDE STRIPE CONFIGURATION
// =====================================

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// =====================================
// CLIENT-SIDE STRIPE CONFIGURATION
// =====================================

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required');
}

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// =====================================
// STRIPE CONFIGURATION CONSTANTS
// =====================================

export const STRIPE_CONFIG = {
  // Supported currencies
  CURRENCIES: ['USD', 'EUR', 'GBP', 'TRY'] as const,
  
  // Payment method types
  PAYMENT_METHODS: [
    'card',
    'paypal',
    'apple_pay',
    'google_pay',
  ] as const,
  
  // Subscription statuses
  SUBSCRIPTION_STATUSES: [
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ] as const,
  
  // Payment intent statuses
  PAYMENT_STATUSES: [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
    'canceled',
    'succeeded',
  ] as const,
  
  // Webhook events we handle
  WEBHOOK_EVENTS: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'checkout.session.completed',
    'payment_method.attached',
  ] as const,
} as const;

// =====================================
// TYPE DEFINITIONS
// =====================================

export type Currency = typeof STRIPE_CONFIG.CURRENCIES[number];
export type PaymentMethodType = typeof STRIPE_CONFIG.PAYMENT_METHODS[number];
export type SubscriptionStatus = typeof STRIPE_CONFIG.SUBSCRIPTION_STATUSES[number];
export type PaymentStatus = typeof STRIPE_CONFIG.PAYMENT_STATUSES[number];
export type WebhookEvent = typeof STRIPE_CONFIG.WEBHOOK_EVENTS[number];

// =====================================
// UTILITY FUNCTIONS
// =====================================

/**
 * Format amount from cents to display format
 * @param amount Amount in cents
 * @param currency Currency code
 * @returns Formatted amount string
 */
export function formatAmount(amount: number, currency: Currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

/**
 * Convert amount to cents for Stripe
 * @param amount Amount in dollars
 * @returns Amount in cents
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert amount from cents to dollars
 * @param cents Amount in cents
 * @returns Amount in dollars
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Validate Stripe webhook signature
 * @param payload Webhook payload
 * @param signature Stripe signature header
 * @param secret Webhook endpoint secret
 * @returns Verified event or throws error
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Create or retrieve Stripe customer
 * @param userId User ID from Supabase Auth
 * @param email User email
 * @param name Optional user name
 * @returns Stripe customer
 */
export async function createOrGetCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // First, try to find existing customer by metadata
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
}

/**
 * Create payment intent for course purchase
 * @param amount Amount in cents
 * @param currency Currency
 * @param customerId Stripe customer ID
 * @param metadata Additional metadata
 * @returns Payment intent
 */
export async function createPaymentIntent(
  amount: number,
  currency: Currency,
  customerId: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    customer: customerId,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Create subscription checkout session
 * @param priceId Stripe price ID
 * @param customerId Stripe customer ID
 * @param successUrl Success redirect URL
 * @param cancelUrl Cancel redirect URL
 * @param trialPeriodDays Trial period in days
 * @returns Checkout session
 */
export async function createSubscriptionCheckout(
  priceId: string,
  customerId: string,
  successUrl: string,
  cancelUrl: string,
  trialPeriodDays?: number
): Promise<Stripe.Checkout.Session> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  };

  if (trialPeriodDays && trialPeriodDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: trialPeriodDays,
    };
  }

  return await stripe.checkout.sessions.create(sessionParams);
}

/**
 * Create one-time payment checkout session
 * @param priceId Stripe price ID
 * @param customerId Stripe customer ID
 * @param successUrl Success redirect URL
 * @param cancelUrl Cancel redirect URL
 * @param metadata Additional metadata
 * @returns Checkout session
 */
export async function createOneTimeCheckout(
  priceId: string,
  customerId: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    metadata,
  });
}

/**
 * Cancel subscription
 * @param subscriptionId Stripe subscription ID
 * @param cancelAtPeriodEnd Whether to cancel at period end
 * @returns Updated subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
}

/**
 * Create customer portal session
 * @param customerId Stripe customer ID
 * @param returnUrl Return URL after portal session
 * @returns Portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Process refund
 * @param paymentIntentId Payment intent ID
 * @param amount Amount to refund in cents (optional, full refund if not provided)
 * @param reason Refund reason
 * @returns Refund object
 */
export async function processRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundParams.amount = amount;
  }

  if (reason) {
    refundParams.reason = reason;
  }

  return await stripe.refunds.create(refundParams);
}

/**
 * Apply discount code to checkout session
 * @param sessionId Checkout session ID
 * @param couponId Stripe coupon ID
 * @returns Updated session
 */
export async function applyDiscountCode(
  sessionId: string,
  couponId: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.update(sessionId, {
    discounts: [
      {
        coupon: couponId,
      },
    ],
  });
}

// =====================================
// ERROR HANDLING UTILITIES
// =====================================

export class StripeError extends Error {
  constructor(
    message: string,
    public stripeError?: Stripe.StripeError,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

/**
 * Handle Stripe errors consistently
 * @param error Stripe error
 * @returns Formatted error response
 */
export function handleStripeError(error: Stripe.StripeError): {
  message: string;
  statusCode: number;
  type: string;
} {
  switch (error.type) {
    case 'StripeCardError':
      return {
        message: error.message || 'Your card was declined.',
        statusCode: 402,
        type: 'card_error',
      };
    case 'StripeRateLimitError':
      return {
        message: 'Too many requests made to the API too quickly.',
        statusCode: 429,
        type: 'rate_limit_error',
      };
    case 'StripeInvalidRequestError':
      return {
        message: error.message || 'Invalid request.',
        statusCode: 400,
        type: 'invalid_request_error',
      };
    case 'StripeAPIError':
      return {
        message: 'An error occurred with our API.',
        statusCode: 500,
        type: 'api_error',
      };
    case 'StripeConnectionError':
      return {
        message: 'A network error occurred.',
        statusCode: 500,
        type: 'connection_error',
      };
    case 'StripeAuthenticationError':
      return {
        message: 'Authentication with Stripe failed.',
        statusCode: 401,
        type: 'authentication_error',
      };
    default:
      return {
        message: 'An unknown error occurred.',
        statusCode: 500,
        type: 'unknown_error',
      };
  }
}