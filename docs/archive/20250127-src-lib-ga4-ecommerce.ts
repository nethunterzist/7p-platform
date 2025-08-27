/**
 * GA4 Enhanced E-commerce Integration
 * 
 * Specialized tracking for course purchases, subscriptions, and payment events
 * Integrates with Stripe payment system and Supabase data
 */

import { 
  trackEvent,
  trackPurchase,
  trackSubscriptionStart,
  type UserEvent 
} from './ga4';

// Enhanced e-commerce event types
export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_category: string;
  item_category2?: string;
  item_brand?: string;
  price: number;
  quantity?: number;
  item_variant?: string;
  coupon?: string;
  discount?: number;
}

export interface PurchaseData {
  transaction_id: string;
  value: number;
  currency: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  items: EcommerceItem[];
}

export interface SubscriptionData {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'yearly' | 'lifetime';
  trial_period_days?: number;
  coupon?: string;
  discount_amount?: number;
}

export interface RefundData {
  transaction_id: string;
  value: number;
  currency: string;
  items: EcommerceItem[];
  refund_reason?: string;
}

/**
 * COURSE PURCHASE FUNNEL TRACKING
 */

/**
 * Track when user views a course purchase page
 */
export function trackCourseViewPurchasePage(
  courseId: string,
  courseName: string,
  price: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('view_item', {
    currency,
    value: price,
    items: [{
      item_id: courseId,
      item_name: courseName,
      item_category: 'course',
      price,
      quantity: 1,
    }],
    ...userData,
  });
}

/**
 * Track when user adds course to cart (or starts purchase process)
 */
export function trackCourseAddToCart(
  courseId: string,
  courseName: string,
  price: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('add_to_cart', {
    currency,
    value: price,
    items: [{
      item_id: courseId,
      item_name: courseName,
      item_category: 'course',
      price,
      quantity: 1,
    }],
    ...userData,
  });
}

/**
 * Track when user begins checkout process
 */
export function trackCourseBeginCheckout(
  courseId: string,
  courseName: string,
  price: number,
  currency = 'USD',
  couponCode?: string,
  userData: UserEvent = {}
): void {
  trackEvent('begin_checkout', {
    currency,
    value: price,
    coupon: couponCode,
    items: [{
      item_id: courseId,
      item_name: courseName,
      item_category: 'course',
      price,
      quantity: 1,
      coupon: couponCode,
    }],
    ...userData,
  });
}

/**
 * Track successful course purchase
 */
export function trackCoursePurchase(
  purchaseData: PurchaseData,
  userData: UserEvent = {}
): void {
  trackPurchase(
    purchaseData.transaction_id,
    purchaseData.items.map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      item_category: item.item_category,
      price: item.price,
      quantity: item.quantity,
    })),
    {
      ...userData,
      total_value: purchaseData.value,
      currency: purchaseData.currency,
    }
  );

  // Additional purchase details
  trackEvent('purchase_details', {
    transaction_id: purchaseData.transaction_id,
    value: purchaseData.value,
    currency: purchaseData.currency,
    tax: purchaseData.tax,
    shipping: purchaseData.shipping,
    coupon: purchaseData.coupon,
    items_count: purchaseData.items.length,
    ...userData,
  });
}

/**
 * SUBSCRIPTION TRACKING
 */

/**
 * Track subscription plan view
 */
export function trackSubscriptionPlanView(
  planId: string,
  planName: string,
  price: number,
  billingPeriod: 'monthly' | 'yearly' | 'lifetime',
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('view_subscription_plan', {
    plan_id: planId,
    plan_name: planName,
    price,
    billing_period: billingPeriod,
    currency,
    value: price,
    ...userData,
  });
}

/**
 * Track subscription purchase
 */
export function trackSubscriptionPurchase(
  subscriptionData: SubscriptionData,
  userData: UserEvent = {}
): void {
  trackSubscriptionStart({
    subscription_id: subscriptionData.subscription_id,
    plan_name: subscriptionData.plan_name,
    plan_price: subscriptionData.price,
    billing_cycle: subscriptionData.billing_period === 'lifetime' ? 'yearly' : subscriptionData.billing_period,
    currency: subscriptionData.currency,
    ...userData,
  });

  // Additional subscription details
  trackEvent('subscription_details', {
    subscription_id: subscriptionData.subscription_id,
    plan_id: subscriptionData.plan_id,
    plan_name: subscriptionData.plan_name,
    price: subscriptionData.price,
    currency: subscriptionData.currency,
    billing_period: subscriptionData.billing_period,
    trial_period_days: subscriptionData.trial_period_days,
    coupon: subscriptionData.coupon,
    discount_amount: subscriptionData.discount_amount,
    ...userData,
  });
}

/**
 * Track subscription renewal
 */
export function trackSubscriptionRenewal(
  subscriptionId: string,
  planName: string,
  price: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('subscription_renewal', {
    subscription_id: subscriptionId,
    plan_name: planName,
    price,
    currency,
    value: price,
    ...userData,
  });
}

/**
 * Track subscription cancellation
 */
export function trackSubscriptionCancellation(
  subscriptionId: string,
  planName: string,
  cancellationReason?: string,
  userData: UserEvent = {}
): void {
  trackEvent('subscription_cancel', {
    subscription_id: subscriptionId,
    plan_name: planName,
    cancellation_reason: cancellationReason,
    ...userData,
  });
}

/**
 * PAYMENT METHOD TRACKING
 */

/**
 * Track payment method selection
 */
export function trackPaymentMethodSelected(
  paymentMethod: string,
  transactionValue: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('payment_method_selected', {
    payment_method: paymentMethod,
    transaction_value: transactionValue,
    currency,
    ...userData,
  });
}

/**
 * Track payment attempt
 */
export function trackPaymentAttempt(
  transactionId: string,
  paymentMethod: string,
  amount: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('payment_attempt', {
    transaction_id: transactionId,
    payment_method: paymentMethod,
    amount,
    currency,
    ...userData,
  });
}

/**
 * Track payment failure
 */
export function trackPaymentFailure(
  transactionId: string,
  paymentMethod: string,
  amount: number,
  errorCode?: string,
  errorMessage?: string,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('payment_failure', {
    transaction_id: transactionId,
    payment_method: paymentMethod,
    amount,
    currency,
    error_code: errorCode,
    error_message: errorMessage,
    ...userData,
  });
}

/**
 * REFUND TRACKING
 */

/**
 * Track refund processed
 */
export function trackRefund(
  refundData: RefundData,
  userData: UserEvent = {}
): void {
  trackEvent('refund', {
    transaction_id: refundData.transaction_id,
    value: refundData.value,
    currency: refundData.currency,
    refund_reason: refundData.refund_reason,
    items: refundData.items.map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      item_category: item.item_category,
      price: item.price,
      quantity: item.quantity,
    })),
    ...userData,
  });
}

/**
 * COUPON AND PROMOTION TRACKING
 */

/**
 * Track coupon usage
 */
export function trackCouponUsed(
  couponCode: string,
  discountAmount: number,
  discountType: 'percentage' | 'fixed',
  transactionValue: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('coupon_used', {
    coupon_code: couponCode,
    discount_amount: discountAmount,
    discount_type: discountType,
    transaction_value: transactionValue,
    currency,
    ...userData,
  });
}

/**
 * Track promotion view
 */
export function trackPromotionView(
  promotionId: string,
  promotionName: string,
  discountAmount: number,
  userData: UserEvent = {}
): void {
  trackEvent('view_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
    discount_amount: discountAmount,
    ...userData,
  });
}

/**
 * CONVERSION FUNNEL ANALYSIS
 */

/**
 * Track checkout step progression
 */
export function trackCheckoutStep(
  step: number,
  stepName: string,
  transactionValue: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('checkout_progress', {
    checkout_step: step,
    checkout_step_name: stepName,
    value: transactionValue,
    currency,
    ...userData,
  });
}

/**
 * Track checkout abandonment
 */
export function trackCheckoutAbandonment(
  step: number,
  stepName: string,
  transactionValue: number,
  abandonmentReason?: string,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('checkout_abandon', {
    checkout_step: step,
    checkout_step_name: stepName,
    value: transactionValue,
    currency,
    abandonment_reason: abandonmentReason,
    ...userData,
  });
}

/**
 * REVENUE ATTRIBUTION
 */

/**
 * Track revenue attribution to marketing channels
 */
export function trackRevenueAttribution(
  transactionId: string,
  revenue: number,
  currency: string,
  source: string,
  medium: string,
  campaign?: string,
  userData: UserEvent = {}
): void {
  trackEvent('revenue_attribution', {
    transaction_id: transactionId,
    revenue,
    currency,
    attribution_source: source,
    attribution_medium: medium,
    attribution_campaign: campaign,
    ...userData,
  });
}

/**
 * CUSTOMER LIFETIME VALUE
 */

/**
 * Track customer lifetime value milestone
 */
export function trackCustomerLTVMilestone(
  customerId: string,
  currentLTV: number,
  milestone: number,
  currency = 'USD',
  userData: UserEvent = {}
): void {
  trackEvent('customer_ltv_milestone', {
    customer_id: customerId,
    current_ltv: currentLTV,
    ltv_milestone: milestone,
    currency,
    ...userData,
  });
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Create course item from course data
 */
export function createCourseItem(
  courseId: string,
  courseName: string,
  price: number,
  category = 'course',
  instructorName?: string,
  couponCode?: string,
  discount?: number
): EcommerceItem {
  return {
    item_id: courseId,
    item_name: courseName,
    item_category: category,
    item_brand: instructorName || '7P Education',
    price: discount ? price - discount : price,
    quantity: 1,
    coupon: couponCode,
    discount,
  };
}

/**
 * Create subscription item from subscription data
 */
export function createSubscriptionItem(
  planId: string,
  planName: string,
  price: number,
  billingPeriod: string,
  couponCode?: string,
  discount?: number
): EcommerceItem {
  return {
    item_id: planId,
    item_name: planName,
    item_category: 'subscription',
    item_category2: billingPeriod,
    item_brand: '7P Education',
    price: discount ? price - discount : price,
    quantity: 1,
    item_variant: billingPeriod,
    coupon: couponCode,
    discount,
  };
}

/**
 * Calculate transaction value with tax and shipping
 */
export function calculateTransactionValue(
  basePrice: number,
  tax = 0,
  shipping = 0,
  discount = 0
): number {
  return Math.max(0, basePrice + tax + shipping - discount);
}

// Export types for use in other files
export type {
  EcommerceItem,
  PurchaseData,
  SubscriptionData,
  RefundData,
};