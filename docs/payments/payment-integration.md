# Payment System Integration - 7P Education Platform

## 📋 Özet

7P Education Platform'un payment sistemi, Stripe'ın güçlü altyapısını kullanarak güvenli, hızlı ve kullanıcı dostu ödeme deneyimi sunar. Bu dokümantasyon, Stripe entegrasyonunun detaylı analizi, webhook handling, subscription management ve fraud prevention stratejilerini kapsamlı olarak inceler.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun kapsamı:
- Stripe Payment Integration mimarisinin detaylı incelemesi
- Checkout Sessions ve Payment Intents implementation
- Webhook handling ve event processing strategies
- Subscription ve recurring payment management
- Multi-currency support ve localization
- Fraud prevention ve security implementations
- Financial reporting ve analytics integration
- Tax calculation ve compliance requirements

## 🏗️ Mevcut Durum Analizi

### ✅ Aktif Payment Özellikleri
- **Stripe Integration**: Complete payment gateway integration
- **Checkout Sessions**: Secure hosted checkout pages
- **Payment Intents**: Advanced payment flow control
- **Customer Portal**: Self-service subscription management
- **Webhook Processing**: Real-time payment event handling
- **Payment History**: Comprehensive transaction tracking
- **Refund Management**: Automated ve manual refund processing
- **Multi-currency**: TRY, USD, EUR currency support

### ⚠️ Geliştirilmesi Gereken Alanlar
- Advanced subscription tiers ve pricing models
- Installment payment options
- Cryptocurrency payment support
- Advanced fraud detection algorithms
- Tax automation ve compliance
- Revenue recognition automation
- Advanced analytics ve reporting

## 🔧 Teknik Detaylar

### 💳 Stripe Configuration

#### Core Stripe Setup
```typescript
// src/lib/stripe/config.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  appInfo: {
    name: '7P Education Platform',
    version: '1.0.0',
    url: 'https://7peducation.com'
  },
  maxNetworkRetries: 3,
  timeout: 10000
})

export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  currency: 'try',
  supportedCurrencies: ['try', 'usd', 'eur'],
  features: {
    automaticTax: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true',
    customerPortal: process.env.STRIPE_CUSTOMER_PORTAL_ENABLED === 'true',
    subscriptions: process.env.STRIPE_SUBSCRIPTIONS_ENABLED === 'true'
  },
  webhookEndpoints: {
    checkout: '/api/webhooks/stripe/checkout',
    subscription: '/api/webhooks/stripe/subscription',
    invoice: '/api/webhooks/stripe/invoice'
  }
}

// Stripe client-side configuration
export const getStripeClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('Stripe client can only be used in browser environment')
  }

  return loadStripe(stripeConfig.publishableKey, {
    locale: 'tr',
    stripeAccount: process.env.NEXT_PUBLIC_STRIPE_ACCOUNT_ID
  })
}
```

#### Advanced Payment Configuration
```typescript
// src/lib/stripe/payment-config.ts
export interface PaymentConfig {
  allowedPaymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
  billingAddressCollection: 'auto' | 'required'
  shippingAddressCollection?: {
    allowedCountries: string[]
  }
  phoneNumberCollection: {
    enabled: boolean
  }
  taxIdCollection: {
    enabled: boolean
  }
  customFields: Stripe.Checkout.SessionCreateParams.CustomField[]
}

export const defaultPaymentConfig: PaymentConfig = {
  allowedPaymentMethods: ['card', 'klarna', 'sofort', 'bancontact'],
  billingAddressCollection: 'auto',
  phoneNumberCollection: {
    enabled: true
  },
  taxIdCollection: {
    enabled: false
  },
  customFields: [
    {
      key: 'company_name',
      label: {
        custom: 'Company Name (Optional)',
        type: 'custom'
      },
      type: 'text',
      optional: true
    },
    {
      key: 'vat_number',
      label: {
        custom: 'VAT Number (Optional)',
        type: 'custom'
      },
      type: 'text',
      optional: true
    }
  ]
}

export const getPaymentConfigForRegion = (countryCode: string): PaymentConfig => {
  const baseConfig = { ...defaultPaymentConfig }

  switch (countryCode) {
    case 'TR':
      return {
        ...baseConfig,
        allowedPaymentMethods: ['card'],
        billingAddressCollection: 'required'
      }
    
    case 'DE':
      return {
        ...baseConfig,
        allowedPaymentMethods: ['card', 'klarna', 'sofort'],
        taxIdCollection: { enabled: true }
      }
    
    case 'FR':
      return {
        ...baseConfig,
        allowedPaymentMethods: ['card', 'klarna', 'bancontact']
      }
    
    default:
      return baseConfig
  }
}
```

### 🛒 Checkout Session Management

#### Advanced Checkout Implementation
```typescript
// src/lib/stripe/checkout.ts
import { stripe, stripeConfig } from './config'
import { createPaymentRecord, updatePaymentRecord } from '../database/payments'
import { getCourseById, validateCourseAccess } from '../database/courses'
import { createAuditLog } from '../audit/logger'

export interface CheckoutSessionParams {
  courseId: string
  userId: string
  userEmail: string
  successUrl: string
  cancelUrl: string
  couponCode?: string
  metadata?: Record<string, string>
  paymentConfig?: Partial<PaymentConfig>
}

export interface CheckoutResult {
  sessionId: string
  checkoutUrl: string
  paymentRecordId: string
  expiresAt: Date
}

export class CheckoutManager {
  static async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutResult> {
    try {
      // Validate course and user
      const course = await getCourseById(params.courseId)
      if (!course) {
        throw new Error('Course not found')
      }

      if (!course.published) {
        throw new Error('Course is not available for purchase')
      }

      // Check if user already has access
      const hasAccess = await validateCourseAccess(params.userId, params.courseId)
      if (hasAccess) {
        throw new Error('User already has access to this course')
      }

      // Calculate pricing with potential discounts
      const pricing = await this.calculatePricing(course, params.couponCode)

      // Create payment record before checkout
      const paymentRecord = await createPaymentRecord({
        userId: params.userId,
        courseId: params.courseId,
        amount: pricing.finalAmount,
        currency: pricing.currency,
        originalAmount: pricing.originalAmount,
        discountAmount: pricing.discountAmount,
        couponCode: params.couponCode,
        status: 'pending',
        paymentMethod: 'stripe',
        metadata: {
          ...params.metadata,
          courseTitle: course.title,
          instructorId: course.instructorId
        }
      })

      // Get payment configuration
      const paymentConfig = this.getPaymentConfiguration(params.paymentConfig)

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: paymentConfig.allowedPaymentMethods,
        billing_address_collection: paymentConfig.billingAddressCollection,
        phone_number_collection: paymentConfig.phoneNumberCollection,
        tax_id_collection: paymentConfig.taxIdCollection,
        custom_fields: paymentConfig.customFields,
        
        customer_email: params.userEmail,
        client_reference_id: params.userId,
        
        line_items: [
          {
            price_data: {
              currency: pricing.currency,
              product_data: {
                name: course.title,
                description: course.shortDescription || course.description.substring(0, 200),
                images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
                metadata: {
                  courseId: course.id,
                  instructorId: course.instructorId,
                  category: course.category,
                  level: course.level
                }
              },
              unit_amount: Math.round(pricing.finalAmount * 100) // Convert to cents
            },
            quantity: 1
          }
        ],

        // Discounts and coupons
        ...(params.couponCode && { discounts: [{ coupon: params.couponCode }] }),

        // Tax configuration
        automatic_tax: {
          enabled: stripeConfig.features.automaticTax
        },

        // Metadata for webhook processing
        metadata: {
          userId: params.userId,
          courseId: params.courseId,
          paymentRecordId: paymentRecord.id,
          type: 'course_purchase',
          ...params.metadata
        },

        // URLs
        success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.cancelUrl,

        // Session configuration
        expires_at: Math.floor((Date.now() + (30 * 60 * 1000)) / 1000), // 30 minutes
        payment_intent_data: {
          description: `Course purchase: ${course.title}`,
          statement_descriptor: '7P Education',
          metadata: {
            userId: params.userId,
            courseId: params.courseId
          }
        },

        // Customer portal configuration
        ...(stripeConfig.features.customerPortal && {
          customer_creation: 'always'
        })
      })

      // Update payment record with session ID
      await updatePaymentRecord(paymentRecord.id, {
        stripeSessionId: session.id,
        checkoutUrl: session.url,
        expiresAt: new Date(session.expires_at! * 1000)
      })

      // Create audit log
      await createAuditLog({
        action: 'CHECKOUT_SESSION_CREATED',
        userId: params.userId,
        details: {
          courseId: params.courseId,
          sessionId: session.id,
          amount: pricing.finalAmount,
          currency: pricing.currency
        },
        category: 'payment'
      })

      return {
        sessionId: session.id,
        checkoutUrl: session.url!,
        paymentRecordId: paymentRecord.id,
        expiresAt: new Date(session.expires_at! * 1000)
      }

    } catch (error) {
      await createAuditLog({
        action: 'CHECKOUT_SESSION_FAILED',
        userId: params.userId,
        details: {
          courseId: params.courseId,
          error: (error as Error).message
        },
        category: 'payment',
        severity: 'high'
      })

      throw error
    }
  }

  private static async calculatePricing(
    course: any,
    couponCode?: string
  ): Promise<{
    originalAmount: number
    finalAmount: number
    discountAmount: number
    currency: string
  }> {
    let finalAmount = course.pricing.amount
    let discountAmount = 0
    const currency = course.pricing.currency

    // Apply course-specific discount if active
    if (course.pricing.discount && 
        course.pricing.discount.validUntil && 
        new Date(course.pricing.discount.validUntil) > new Date()) {
      
      const courseDiscount = (course.pricing.amount * course.pricing.discount.percentage) / 100
      finalAmount -= courseDiscount
      discountAmount += courseDiscount
    }

    // Apply coupon code if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode)
        if (coupon.valid) {
          if (coupon.percent_off) {
            const couponDiscount = (finalAmount * coupon.percent_off) / 100
            finalAmount -= couponDiscount
            discountAmount += couponDiscount
          } else if (coupon.amount_off) {
            // Convert amount to course currency if different
            const couponDiscount = coupon.amount_off / 100 // Stripe amounts are in cents
            finalAmount -= couponDiscount
            discountAmount += couponDiscount
          }
        }
      } catch (error) {
        console.warn('Invalid coupon code:', couponCode)
      }
    }

    return {
      originalAmount: course.pricing.amount,
      finalAmount: Math.max(finalAmount, 0), // Ensure non-negative
      discountAmount,
      currency
    }
  }

  private static getPaymentConfiguration(overrides?: Partial<PaymentConfig>): PaymentConfig {
    return {
      ...defaultPaymentConfig,
      ...overrides
    }
  }
}
```

### 📱 Client-Side Payment Integration

#### React Payment Components
```typescript
// src/components/payments/CheckoutForm.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  courseId: string
  courseTitle: string
  amount: number
  currency: string
  onSuccess: (sessionId: string) => void
  onCancel: () => void
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  courseId,
  courseTitle,
  amount,
  currency,
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !user) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create checkout session
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId,
          successUrl: `${window.location.origin}/courses/${courseId}/success`,
          cancelUrl: `${window.location.origin}/courses/${courseId}/purchase`
        })
      })

      const { sessionId, checkoutUrl } = await response.json()

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({ sessionId })

      if (result.error) {
        throw new Error(result.error.message)
      }

    } catch (err) {
      setError((err as Error).message)
      toast.error('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [stripe, elements, user, courseId, onSuccess])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Purchase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">{courseTitle}</h3>
            <p className="text-2xl font-bold text-primary mt-2">
              {amount.toLocaleString('tr-TR', {
                style: 'currency',
                currency: currency.toUpperCase()
              })}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Purchase Course'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

// Main checkout wrapper component
export const PaymentCheckout: React.FC<CheckoutFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}
```

### 🔔 Webhook Event Processing

#### Comprehensive Webhook Handler
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { updatePaymentRecord, createRefundRecord } from '@/lib/database/payments'
import { createEnrollment, updateEnrollmentStatus } from '@/lib/database/enrollments'
import { sendPaymentConfirmation, sendPaymentFailure } from '@/lib/email/notifications'
import { createAuditLog } from '@/lib/audit/logger'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    await createAuditLog({
      action: 'WEBHOOK_RECEIVED',
      details: {
        type: event.type,
        id: event.id,
        created: event.created
      },
      category: 'payment'
    })

    // Process the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    await createAuditLog({
      action: 'WEBHOOK_PROCESSING_FAILED',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack
      },
      category: 'payment',
      severity: 'critical'
    })

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, courseId, paymentRecordId } = session.metadata!

  try {
    // Update payment record
    await updatePaymentRecord(paymentRecordId, {
      status: 'completed',
      stripePaymentIntentId: session.payment_intent as string,
      stripeCustomerId: session.customer as string,
      completedAt: new Date(),
      paymentDetails: {
        amount: session.amount_total! / 100,
        currency: session.currency!,
        paymentMethodTypes: session.payment_method_types,
        customerDetails: session.customer_details
      }
    })

    // Create course enrollment
    const enrollment = await createEnrollment({
      userId,
      courseId,
      paymentId: paymentRecordId,
      enrolledAt: new Date(),
      status: 'active',
      enrollmentType: 'paid'
    })

    // Send confirmation email
    await sendPaymentConfirmation({
      userId,
      courseId,
      paymentAmount: session.amount_total! / 100,
      currency: session.currency!,
      enrollmentId: enrollment.id
    })

    await createAuditLog({
      action: 'PAYMENT_COMPLETED',
      userId,
      details: {
        courseId,
        paymentId: paymentRecordId,
        amount: session.amount_total! / 100,
        currency: session.currency!
      },
      category: 'payment'
    })

  } catch (error) {
    await createAuditLog({
      action: 'CHECKOUT_COMPLETION_FAILED',
      userId,
      details: {
        courseId,
        paymentId: paymentRecordId,
        error: (error as Error).message
      },
      category: 'payment',
      severity: 'critical'
    })

    throw error
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { userId, courseId } = paymentIntent.metadata

  try {
    // Update payment record
    if (paymentIntent.metadata.paymentRecordId) {
      await updatePaymentRecord(paymentIntent.metadata.paymentRecordId, {
        status: 'failed',
        failedAt: new Date(),
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
      })
    }

    // Send failure notification
    await sendPaymentFailure({
      userId,
      courseId,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
    })

    await createAuditLog({
      action: 'PAYMENT_FAILED',
      userId,
      details: {
        courseId,
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message
      },
      category: 'payment',
      severity: 'high'
    })

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  try {
    const charge = await stripe.charges.retrieve(dispute.charge as string)
    const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string)
    const { userId, courseId } = paymentIntent.metadata

    await createAuditLog({
      action: 'CHARGE_DISPUTE_CREATED',
      userId,
      details: {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        courseId
      },
      category: 'payment',
      severity: 'critical'
    })

    // Notify finance team about dispute
    await notifyFinanceTeam({
      type: 'dispute',
      disputeId: dispute.id,
      userId,
      courseId,
      amount: dispute.amount / 100,
      currency: dispute.currency,
      reason: dispute.reason
    })

  } catch (error) {
    console.error('Error handling charge dispute:', error)
  }
}
```

### 💰 Subscription Management

#### Advanced Subscription Handling
```typescript
// src/lib/stripe/subscriptions.ts
import { stripe } from './config'
import { createSubscriptionRecord, updateSubscriptionRecord } from '../database/subscriptions'
import { createAuditLog } from '../audit/logger'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  priceId: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Access to basic courses and features',
    priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID!,
    amount: 99,
    currency: 'try',
    interval: 'month',
    features: [
      'Access to basic courses',
      'Email support',
      'Mobile access'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    description: 'All courses plus advanced features',
    priceId: process.env.STRIPE_PREMIUM_PLAN_PRICE_ID!,
    amount: 199,
    currency: 'try',
    interval: 'month',
    features: [
      'Access to all courses',
      'Priority support',
      'Certificates',
      'Offline downloads',
      '1-on-1 mentoring sessions'
    ],
    popular: true
  },
  {
    id: 'annual',
    name: 'Annual Plan',
    description: 'Premium features with annual billing',
    priceId: process.env.STRIPE_ANNUAL_PLAN_PRICE_ID!,
    amount: 1999,
    currency: 'try',
    interval: 'year',
    features: [
      'All Premium features',
      '2 months free',
      'Priority course access',
      'Exclusive webinars'
    ]
  }
]

export class SubscriptionManager {
  static async createSubscription(
    userId: string,
    userEmail: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; checkoutUrl: string }> {
    try {
      const plan = subscriptionPlans.find(p => p.id === planId)
      if (!plan) {
        throw new Error('Invalid subscription plan')
      }

      // Create or retrieve customer
      const customer = await this.getOrCreateCustomer(userId, userEmail)

      // Create checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        payment_method_types: ['card'],
        
        line_items: [
          {
            price: plan.priceId,
            quantity: 1
          }
        ],

        subscription_data: {
          metadata: {
            userId,
            planId,
            planName: plan.name
          },
          trial_period_days: planId === 'premium' ? 7 : undefined
        },

        metadata: {
          userId,
          planId,
          type: 'subscription'
        },

        success_url: successUrl,
        cancel_url: cancelUrl,

        // Automatic tax calculation
        automatic_tax: {
          enabled: true
        },

        // Customer portal configuration
        customer_update: {
          address: 'auto',
          name: 'auto'
        },

        // Billing configuration
        billing_address_collection: 'auto',
        
        expires_at: Math.floor((Date.now() + (30 * 60 * 1000)) / 1000) // 30 minutes
      })

      await createAuditLog({
        action: 'SUBSCRIPTION_CHECKOUT_CREATED',
        userId,
        details: {
          planId,
          sessionId: session.id,
          customerId: customer.id
        },
        category: 'subscription'
      })

      return {
        sessionId: session.id,
        checkoutUrl: session.url!
      }

    } catch (error) {
      await createAuditLog({
        action: 'SUBSCRIPTION_CHECKOUT_FAILED',
        userId,
        details: {
          planId,
          error: (error as Error).message
        },
        category: 'subscription',
        severity: 'high'
      })

      throw error
    }
  }

  static async updateSubscription(
    subscriptionId: string,
    newPlanId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const newPlan = subscriptionPlans.find(p => p.id === newPlanId)
      
      if (!newPlan) {
        throw new Error('Invalid subscription plan')
      }

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPlan.priceId
          }
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          ...subscription.metadata,
          planId: newPlan.id,
          planName: newPlan.name,
          updatedAt: new Date().toISOString()
        }
      })

      await updateSubscriptionRecord(subscriptionId, {
        planId: newPlan.id,
        amount: newPlan.amount,
        currency: newPlan.currency,
        updatedAt: new Date()
      })

      await createAuditLog({
        action: 'SUBSCRIPTION_UPDATED',
        userId: subscription.metadata.userId,
        details: {
          subscriptionId,
          oldPlanId: subscription.metadata.planId,
          newPlanId: newPlan.id,
          prorationAmount: updatedSubscription.latest_invoice
        },
        category: 'subscription'
      })

      return updatedSubscription

    } catch (error) {
      await createAuditLog({
        action: 'SUBSCRIPTION_UPDATE_FAILED',
        details: {
          subscriptionId,
          newPlanId,
          error: (error as Error).message
        },
        category: 'subscription',
        severity: 'high'
      })

      throw error
    }
  }

  static async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      let cancelledSubscription: Stripe.Subscription
      
      if (immediate) {
        // Cancel immediately
        cancelledSubscription = await stripe.subscriptions.cancel(subscriptionId)
      } else {
        // Cancel at period end
        cancelledSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        })
      }

      await updateSubscriptionRecord(subscriptionId, {
        status: immediate ? 'cancelled' : 'cancel_at_period_end',
        cancelledAt: immediate ? new Date() : null,
        cancelAtPeriodEnd: !immediate
      })

      await createAuditLog({
        action: immediate ? 'SUBSCRIPTION_CANCELLED_IMMEDIATE' : 'SUBSCRIPTION_CANCELLED_AT_PERIOD_END',
        userId: subscription.metadata.userId,
        details: {
          subscriptionId,
          immediate,
          periodEnd: new Date(subscription.current_period_end * 1000)
        },
        category: 'subscription'
      })

      return cancelledSubscription

    } catch (error) {
      await createAuditLog({
        action: 'SUBSCRIPTION_CANCELLATION_FAILED',
        details: {
          subscriptionId,
          immediate,
          error: (error as Error).message
        },
        category: 'subscription',
        severity: 'high'
      })

      throw error
    }
  }

  private static async getOrCreateCustomer(
    userId: string,
    email: string
  ): Promise<Stripe.Customer> {
    // First, try to find existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId
      }
    })

    return customer
  }

  static async getCustomerPortalUrl(
    customerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    })

    return session.url
  }
}
```

## 💡 Öneriler ve Best Practices

### 🔒 Fraud Prevention Implementation

```typescript
// src/lib/stripe/fraud-prevention.ts
export interface FraudAssessment {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  flags: string[]
  recommendations: string[]
}

export class FraudPrevention {
  static async assessPaymentRisk(
    userId: string,
    amount: number,
    paymentMethod: any,
    deviceFingerprint: string
  ): Promise<FraudAssessment> {
    const flags: string[] = []
    let riskScore = 0

    // Check payment amount
    if (amount > 5000) { // High amount threshold
      flags.push('HIGH_AMOUNT')
      riskScore += 30
    }

    // Check user history
    const userHistory = await this.getUserPaymentHistory(userId)
    if (userHistory.failedPayments > 3) {
      flags.push('MULTIPLE_FAILED_PAYMENTS')
      riskScore += 40
    }

    // Check device fingerprint
    const deviceRisk = await this.assessDeviceRisk(deviceFingerprint)
    if (deviceRisk > 0.7) {
      flags.push('SUSPICIOUS_DEVICE')
      riskScore += 25
    }

    // Check payment method
    if (paymentMethod.type === 'card') {
      const cardRisk = await this.assessCardRisk(paymentMethod.card)
      riskScore += cardRisk
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high'
    if (riskScore < 30) {
      riskLevel = 'low'
    } else if (riskScore < 70) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'high'
    }

    const recommendations = this.generateRecommendations(flags, riskLevel)

    return {
      riskScore,
      riskLevel,
      flags,
      recommendations
    }
  }

  private static async getUserPaymentHistory(userId: string) {
    // Implementation to get user payment history
    return {
      totalPayments: 0,
      failedPayments: 0,
      chargebacks: 0,
      avgAmount: 0
    }
  }

  private static async assessDeviceRisk(fingerprint: string): Promise<number> {
    // Implementation to assess device risk based on fingerprint
    return 0.1 // Low risk by default
  }

  private static async assessCardRisk(card: any): Promise<number> {
    let risk = 0

    // Check card country vs user location
    if (card.country !== 'TR') {
      risk += 10
    }

    // Check if it's a prepaid card
    if (card.funding === 'prepaid') {
      risk += 15
    }

    return risk
  }

  private static generateRecommendations(
    flags: string[],
    riskLevel: string
  ): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'high') {
      recommendations.push('Manual review required')
      recommendations.push('Additional verification needed')
    }

    if (flags.includes('HIGH_AMOUNT')) {
      recommendations.push('Verify payment intent with customer')
    }

    if (flags.includes('SUSPICIOUS_DEVICE')) {
      recommendations.push('Request additional authentication')
    }

    return recommendations
  }
}
```

### 📊 Financial Analytics

```typescript
// src/lib/stripe/analytics.ts
export interface PaymentAnalytics {
  totalRevenue: number
  transactionCount: number
  averageTransactionValue: number
  successRate: number
  refundRate: number
  chargeBacks: number
  topCourses: Array<{
    courseId: string
    title: string
    revenue: number
    sales: number
  }>
  revenueByPeriod: Array<{
    period: string
    revenue: number
    transactions: number
  }>
}

export class PaymentAnalytics {
  static async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<PaymentAnalytics> {
    // Implementation to generate comprehensive payment analytics
    return {
      totalRevenue: 0,
      transactionCount: 0,
      averageTransactionValue: 0,
      successRate: 0,
      refundRate: 0,
      chargeBacks: 0,
      topCourses: [],
      revenueByPeriod: []
    }
  }
}
```

## 📊 Implementation Roadmap

### Phase 1: Core Enhancement (2 weeks)
- [ ] Advanced fraud prevention implementation
- [ ] Multi-currency optimization
- [ ] Subscription management enhancement
- [ ] Advanced analytics dashboard

### Phase 2: Advanced Features (2 weeks)
- [ ] Installment payment options
- [ ] Cryptocurrency payment support
- [ ] Advanced tax automation
- [ ] Revenue recognition automation

### Phase 3: Compliance & Optimization (1 week)
- [ ] PCI DSS compliance audit
- [ ] Payment flow optimization
- [ ] Performance monitoring
- [ ] Documentation updates

## 🔗 İlgili Dosyalar

- [Backend API Design](backend-api-design.md) - Payment API implementation
- [Database Schema](database-schema.md) - Payment data structures
- [Security Audit](../security/security-audit.md) - Payment security review
- [Stripe Integration](../payments/stripe-integration.md) - Detailed Stripe guide
- [Fraud Prevention](../payments/fraud-prevention.md) - Fraud detection strategies

## 📚 Kaynaklar

### 📖 Stripe Documentation
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)

### 🔒 Security & Compliance
- [PCI DSS Compliance](https://stripe.com/docs/security)
- [SCA Requirements](https://stripe.com/docs/strong-customer-authentication)
- [Fraud Prevention](https://stripe.com/docs/radar/rules)

### 🛠️ Development Tools
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe React Components](https://stripe.com/docs/stripe-js/react)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*