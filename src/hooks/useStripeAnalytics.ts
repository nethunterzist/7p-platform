/**
 * Stripe Analytics Integration Hook
 * 
 * Integrates Stripe payment events with GA4 e-commerce tracking
 * Tracks the complete purchase funnel from product view to successful payment
 */

'use client';

import { useCallback } from 'react';
import { useEducationAnalytics } from './useEducationAnalytics';
import {
  trackCourseViewPurchasePage,
  trackCourseAddToCart,
  trackCourseBeginCheckout,
  trackCoursePurchase,
  trackSubscriptionPurchase,
  trackPaymentMethodSelected,
  trackPaymentAttempt,
  trackPaymentFailure,
  trackRefund,
  trackCouponUsed,
  trackCheckoutStep,
  trackCheckoutAbandonment,
  createCourseItem,
  createSubscriptionItem,
  type PurchaseData,
  type SubscriptionData,
} from '@/lib/ga4-ecommerce';

export interface StripeAnalyticsProps {
  userId?: string;
  userRole?: 'student' | 'instructor' | 'admin';
  subscriptionTier?: 'free' | 'premium' | 'enterprise';
}

export interface CourseData {
  id: string;
  name: string;
  price: number;
  category?: string;
  instructorId?: string;
  instructorName?: string;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  trialDays?: number;
}

export function useStripeAnalytics(props: StripeAnalyticsProps = {}) {
  const { trackPurchase, trackSubscriptionStart } = useEducationAnalytics(props);

  // Helper to get user context
  const getUserContext = useCallback(() => ({
    user_id: props.userId,
    user_role: props.userRole,
    subscription_tier: props.subscriptionTier,
    is_anonymous: !props.userId,
  }), [props.userId, props.userRole, props.subscriptionTier]);

  /**
   * COURSE PURCHASE FUNNEL
   */

  /**
   * Track when user views course purchase page
   */
  const trackCourseViewPurchase = useCallback((courseData: CourseData) => {
    trackCourseViewPurchasePage(
      courseData.id,
      courseData.name,
      courseData.price,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * Track when user adds course to cart (begins purchase intent)
   */
  const trackCourseAddToCartEvent = useCallback((courseData: CourseData) => {
    trackCourseAddToCart(
      courseData.id,
      courseData.name,
      courseData.price,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * Track when user begins Stripe checkout
   */
  const trackCourseCheckoutBegin = useCallback((
    courseData: CourseData,
    couponCode?: string
  ) => {
    trackCourseBeginCheckout(
      courseData.id,
      courseData.name,
      courseData.price,
      'USD',
      couponCode,
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * Track successful course purchase
   */
  const trackCoursePurchaseSuccess = useCallback((
    transactionId: string,
    courseData: CourseData,
    finalPrice: number,
    couponCode?: string,
    tax?: number
  ) => {
    const purchaseData: PurchaseData = {
      transaction_id: transactionId,
      value: finalPrice,
      currency: 'USD',
      tax,
      coupon: couponCode,
      items: [createCourseItem(
        courseData.id,
        courseData.name,
        courseData.price,
        courseData.category || 'course',
        courseData.instructorName,
        couponCode,
        courseData.price - finalPrice // discount amount
      )],
    };

    trackCoursePurchase(purchaseData, getUserContext());

    // Also track through education analytics
    trackPurchase(
      transactionId,
      [{
        itemId: courseData.id,
        itemName: courseData.name,
        itemCategory: courseData.category || 'course',
        price: finalPrice,
        quantity: 1,
      }],
      finalPrice,
      'USD'
    );
  }, [getUserContext, trackPurchase]);

  /**
   * SUBSCRIPTION TRACKING
   */

  /**
   * Track subscription purchase
   */
  const trackSubscriptionPurchaseEvent = useCallback((
    subscriptionId: string,
    planData: SubscriptionPlan,
    finalPrice: number,
    couponCode?: string,
    discountAmount?: number
  ) => {
    const subscriptionData: SubscriptionData = {
      subscription_id: subscriptionId,
      plan_id: planData.id,
      plan_name: planData.name,
      price: finalPrice,
      currency: 'USD',
      billing_period: planData.billingPeriod,
      trial_period_days: planData.trialDays,
      coupon: couponCode,
      discount_amount: discountAmount,
    };

    trackSubscriptionPurchase(subscriptionData, getUserContext());

    // Also track through education analytics
    trackSubscriptionStart(
      subscriptionId,
      planData.name,
      finalPrice,
      planData.billingPeriod,
      'USD'
    );
  }, [getUserContext, trackSubscriptionStart]);

  /**
   * PAYMENT PROCESS TRACKING
   */

  /**
   * Track payment method selection
   */
  const trackPaymentMethodSelection = useCallback((
    paymentMethod: string,
    amount: number
  ) => {
    trackPaymentMethodSelected(
      paymentMethod,
      amount,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * Track payment attempt
   */
  const trackPaymentAttemptEvent = useCallback((
    transactionId: string,
    paymentMethod: string,
    amount: number
  ) => {
    trackPaymentAttempt(
      transactionId,
      paymentMethod,
      amount,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * Track payment failure
   */
  const trackPaymentFailureEvent = useCallback((
    transactionId: string,
    paymentMethod: string,
    amount: number,
    errorCode?: string,
    errorMessage?: string
  ) => {
    trackPaymentFailure(
      transactionId,
      paymentMethod,
      amount,
      errorCode,
      errorMessage,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * CHECKOUT FUNNEL TRACKING
   */

  /**
   * Track checkout step progression
   */
  const trackCheckoutStepEvent = useCallback((
    step: number,
    stepName: string,
    amount: number
  ) => {
    trackCheckoutStep(
      step,
      stepName,
      amount,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * Track checkout abandonment
   */
  const trackCheckoutAbandonmentEvent = useCallback((
    step: number,
    stepName: string,
    amount: number,
    reason?: string
  ) => {
    trackCheckoutAbandonment(
      step,
      stepName,
      amount,
      reason,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * COUPON AND PROMOTION TRACKING
   */

  /**
   * Track coupon usage
   */
  const trackCouponUsage = useCallback((
    couponCode: string,
    discountAmount: number,
    discountType: 'percentage' | 'fixed',
    transactionValue: number
  ) => {
    trackCouponUsed(
      couponCode,
      discountAmount,
      discountType,
      transactionValue,
      'USD',
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * REFUND TRACKING
   */

  /**
   * Track refund processed
   */
  const trackRefundEvent = useCallback((
    transactionId: string,
    refundAmount: number,
    courseData: CourseData,
    refundReason?: string
  ) => {
    trackRefund(
      {
        transaction_id: transactionId,
        value: refundAmount,
        currency: 'USD',
        refund_reason: refundReason,
        items: [createCourseItem(
          courseData.id,
          courseData.name,
          courseData.price,
          courseData.category || 'course',
          courseData.instructorName
        )],
      },
      getUserContext()
    );
  }, [getUserContext]);

  /**
   * COMPREHENSIVE PURCHASE FLOW HELPERS
   */

  /**
   * Complete course purchase flow tracking
   * Call this with the appropriate step as the user progresses
   */
  const trackCoursePurchaseFlow = useCallback((
    step: 'view' | 'add_to_cart' | 'begin_checkout' | 'payment_method' | 'payment_attempt' | 'success' | 'failure',
    courseData: CourseData,
    additionalData?: {
      transactionId?: string;
      paymentMethod?: string;
      finalPrice?: number;
      couponCode?: string;
      errorCode?: string;
      errorMessage?: string;
    }
  ) => {
    switch (step) {
      case 'view':
        trackCourseViewPurchase(courseData);
        break;
        
      case 'add_to_cart':
        trackCourseAddToCartEvent(courseData);
        break;
        
      case 'begin_checkout':
        trackCourseCheckoutBegin(courseData, additionalData?.couponCode);
        trackCheckoutStepEvent(1, 'Begin Checkout', additionalData?.finalPrice || courseData.price);
        break;
        
      case 'payment_method':
        if (additionalData?.paymentMethod) {
          trackPaymentMethodSelection(additionalData.paymentMethod, additionalData?.finalPrice || courseData.price);
          trackCheckoutStepEvent(2, 'Payment Method', additionalData?.finalPrice || courseData.price);
        }
        break;
        
      case 'payment_attempt':
        if (additionalData?.transactionId && additionalData?.paymentMethod) {
          trackPaymentAttemptEvent(
            additionalData.transactionId,
            additionalData.paymentMethod,
            additionalData?.finalPrice || courseData.price
          );
          trackCheckoutStepEvent(3, 'Payment Processing', additionalData?.finalPrice || courseData.price);
        }
        break;
        
      case 'success':
        if (additionalData?.transactionId) {
          trackCoursePurchaseSuccess(
            additionalData.transactionId,
            courseData,
            additionalData?.finalPrice || courseData.price,
            additionalData?.couponCode
          );
        }
        break;
        
      case 'failure':
        if (additionalData?.transactionId && additionalData?.paymentMethod) {
          trackPaymentFailureEvent(
            additionalData.transactionId,
            additionalData.paymentMethod,
            additionalData?.finalPrice || courseData.price,
            additionalData?.errorCode,
            additionalData?.errorMessage
          );
          trackCheckoutAbandonmentEvent(
            3,
            'Payment Failed',
            additionalData?.finalPrice || courseData.price,
            additionalData?.errorMessage
          );
        }
        break;
    }
  }, [
    trackCourseViewPurchase,
    trackCourseAddToCartEvent,
    trackCourseCheckoutBegin,
    trackPaymentMethodSelection,
    trackPaymentAttemptEvent,
    trackCoursePurchaseSuccess,
    trackPaymentFailureEvent,
    trackCheckoutStepEvent,
    trackCheckoutAbandonmentEvent,
  ]);

  return {
    // Course purchase tracking
    trackCourseViewPurchase,
    trackCourseAddToCart: trackCourseAddToCartEvent,
    trackCourseCheckoutBegin,
    trackCoursePurchaseSuccess,
    
    // Subscription tracking
    trackSubscriptionPurchase: trackSubscriptionPurchaseEvent,
    
    // Payment process tracking
    trackPaymentMethodSelection,
    trackPaymentAttempt: trackPaymentAttemptEvent,
    trackPaymentFailure: trackPaymentFailureEvent,
    
    // Checkout funnel tracking
    trackCheckoutStep: trackCheckoutStepEvent,
    trackCheckoutAbandonment: trackCheckoutAbandonmentEvent,
    
    // Coupon tracking
    trackCouponUsage,
    
    // Refund tracking
    trackRefund: trackRefundEvent,
    
    // Complete flow helpers
    trackCoursePurchaseFlow,
    
    // User context
    getUserContext,
  };
}