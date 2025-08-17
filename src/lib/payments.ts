import { supabase } from './supabase';
import { stripe, createOrGetCustomer } from './stripe';
import type { Currency } from './stripe';

// =====================================
// TYPE DEFINITIONS
// =====================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  stripe_product_id: string;
  price_amount: number;
  currency: Currency;
  billing_interval: 'month' | 'year';
  billing_interval_count: number;
  trial_period_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoursePrice {
  id: string;
  course_id: string;
  stripe_price_id: string;
  stripe_product_id: string;
  price_amount: number;
  currency: Currency;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseBundle {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  stripe_product_id: string;
  price_amount: number;
  currency: Currency;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  type: 'course_purchase' | 'bundle_purchase' | 'subscription' | 'subscription_renewal';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  amount: number;
  currency: Currency;
  description: string | null;
  course_id: string | null;
  bundle_id: string | null;
  subscription_id: string | null;
  payment_method_id: string | null;
  discount_code_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface StripeCustomer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface CoursePurchase {
  id: string;
  user_id: string;
  course_id: string | null;
  bundle_id: string | null;
  transaction_id: string;
  purchase_type: 'individual' | 'bundle';
  amount_paid: number;
  currency: Currency;
  created_at: string;
}

// =====================================
// CUSTOMER MANAGEMENT
// =====================================

/**
 * Get or create Stripe customer for user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<StripeCustomer> {
  // Check if customer already exists in database
  const { data: existingCustomer } = await supabase
    .from('stripe_customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingCustomer) {
    return existingCustomer;
  }

  // Create Stripe customer
  const stripeCustomer = await createOrGetCustomer(userId, email, name);

  // Save to database
  const { data: newCustomer, error } = await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      stripe_customer_id: stripeCustomer.id,
      email,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save customer: ${error.message}`);
  }

  return newCustomer;
}

/**
 * Get Stripe customer by user ID
 */
export async function getStripeCustomerByUserId(userId: string): Promise<StripeCustomer | null> {
  const { data, error } = await supabase
    .from('stripe_customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.message !== 'PGRST116') {
    throw new Error(`Failed to get customer: ${error.message}`);
  }

  return data;
}

// =====================================
// SUBSCRIPTION MANAGEMENT
// =====================================

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_amount');

  if (error) {
    throw new Error(`Failed to get subscription plans: ${error.message}`);
  }

  return data || [];
}

/**
 * Get subscription plan by ID
 */
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single();

  if (error && error.message !== 'PGRST116') {
    throw new Error(`Failed to get subscription plan: ${error.message}`);
  }

  return data;
}

/**
 * Get user's active subscription
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.message !== 'PGRST116') {
    throw new Error(`Failed to get user subscription: ${error.message}`);
  }

  return data;
}

/**
 * Create or update subscription record
 */
export async function upsertSubscription(subscriptionData: {
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  canceled_at?: string;
  cancel_at_period_end?: boolean;
}): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  return data;
}

// =====================================
// COURSE PRICING MANAGEMENT
// =====================================

/**
 * Get course price by course ID
 */
export async function getCoursePrice(courseId: string): Promise<CoursePrice | null> {
  const { data, error } = await supabase
    .from('course_prices')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .single();

  if (error && error.message !== 'PGRST116') {
    throw new Error(`Failed to get course price: ${error.message}`);
  }

  return data;
}

/**
 * Get all course bundles
 */
export async function getCourseBundles(): Promise<CourseBundle[]> {
  const { data, error } = await supabase
    .from('course_bundles')
    .select('*')
    .eq('is_active', true)
    .order('price_amount');

  if (error) {
    throw new Error(`Failed to get course bundles: ${error.message}`);
  }

  return data || [];
}

/**
 * Get bundle courses
 */
export async function getBundleCourses(bundleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('bundle_courses')
    .select('course_id')
    .eq('bundle_id', bundleId);

  if (error) {
    throw new Error(`Failed to get bundle courses: ${error.message}`);
  }

  return data?.map(item => item.course_id) || [];
}

// =====================================
// PAYMENT TRANSACTION MANAGEMENT
// =====================================

/**
 * Create payment transaction record
 */
export async function createPaymentTransaction(transactionData: {
  user_id: string;
  stripe_payment_intent_id?: string;
  type: PaymentTransaction['type'];
  status: PaymentTransaction['status'];
  amount: number;
  currency: Currency;
  description?: string;
  course_id?: string;
  bundle_id?: string;
  subscription_id?: string;
  payment_method_id?: string;
  discount_code_id?: string;
}): Promise<PaymentTransaction> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create payment transaction: ${error.message}`);
  }

  return data;
}

/**
 * Update payment transaction
 */
export async function updatePaymentTransaction(
  transactionId: string,
  updates: Partial<PaymentTransaction>
): Promise<PaymentTransaction> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update payment transaction: ${error.message}`);
  }

  return data;
}

/**
 * Get payment transaction by Stripe payment intent ID
 */
export async function getPaymentTransactionByStripeId(
  stripePaymentIntentId: string
): Promise<PaymentTransaction | null> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .single();

  if (error && error.message !== 'PGRST116') {
    throw new Error(`Failed to get payment transaction: ${error.message}`);
  }

  return data;
}

/**
 * Get user's payment history
 */
export async function getUserPaymentHistory(
  userId: string,
  limit: number = 10
): Promise<PaymentTransaction[]> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get payment history: ${error.message}`);
  }

  return data || [];
}

// =====================================
// COURSE PURCHASE MANAGEMENT
// =====================================

/**
 * Create course purchase record
 */
export async function createCoursePurchase(purchaseData: {
  user_id: string;
  course_id?: string;
  bundle_id?: string;
  transaction_id: string;
  purchase_type: 'individual' | 'bundle';
  amount_paid: number;
  currency: Currency;
}): Promise<CoursePurchase> {
  const { data, error } = await supabase
    .from('course_purchases')
    .insert(purchaseData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create course purchase: ${error.message}`);
  }

  return data;
}

/**
 * Check if user has access to course
 */
export async function userHasCourseAccess(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('user_has_course_access', {
      user_uuid: userId,
      course_uuid: courseId,
    });

  if (error) {
    console.error('Error checking course access:', error);
    return false;
  }

  return data === true;
}

/**
 * Get user's purchased courses
 */
export async function getUserPurchasedCourses(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_purchases')
    .select('course_id, bundle_courses!inner(course_id)')
    .eq('user_id', userId)
    .not('course_id', 'is', null);

  if (error) {
    throw new Error(`Failed to get purchased courses: ${error.message}`);
  }

  const courseIds = new Set<string>();

  // Add individual course purchases
  data?.forEach(purchase => {
    if (purchase.course_id) {
      courseIds.add(purchase.course_id);
    }
  });

  // Add bundle course purchases
  const { data: bundlePurchases } = await supabase
    .from('course_purchases')
    .select(`
      bundle_courses!inner(course_id)
    `)
    .eq('user_id', userId)
    .not('bundle_id', 'is', null);

  bundlePurchases?.forEach(purchase => {
    // @ts-ignore - Supabase types are complex here
    purchase.bundle_courses.forEach((bc: any) => {
      courseIds.add(bc.course_id);
    });
  });

  return Array.from(courseIds);
}

// =====================================
// WEBHOOK EVENT LOGGING
// =====================================

/**
 * Log webhook event
 */
export async function logWebhookEvent(eventData: {
  stripe_event_id: string;
  event_type: string;
  data: any;
  processed?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('webhook_events')
    .insert(eventData);

  if (error) {
    console.error('Failed to log webhook event:', error);
  }
}

/**
 * Mark webhook event as processed
 */
export async function markWebhookEventProcessed(stripeEventId: string): Promise<void> {
  const { error } = await supabase
    .from('webhook_events')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', stripeEventId);

  if (error) {
    console.error('Failed to mark webhook event as processed:', error);
  }
}

/**
 * Check if webhook event was already processed
 */
export async function isWebhookEventProcessed(stripeEventId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('processed')
    .eq('stripe_event_id', stripeEventId)
    .single();

  if (error) {
    return false;
  }

  return data?.processed === true;
}

// =====================================
// PAYMENT LOGGING
// =====================================

/**
 * Log payment event
 */
export async function logPaymentEvent(logData: {
  user_id?: string;
  transaction_id?: string;
  event_type: string;
  message: string;
  metadata?: any;
  level?: 'info' | 'warning' | 'error';
}): Promise<void> {
  const { error } = await supabase
    .from('payment_logs')
    .insert({
      ...logData,
      level: logData.level || 'info',
    });

  if (error) {
    console.error('Failed to log payment event:', error);
  }
}