# Stripe Integration Complete Guide for 7P Education Platform

## Executive Summary

This comprehensive guide details the complete Stripe payment integration for the 7P Education Platform, covering everything from basic payment processing to advanced features like subscriptions, webhooks, and financial analytics. The implementation supports one-time course purchases, subscription-based learning plans, instructor payouts, and complex educational pricing models while ensuring PCI compliance and security best practices.

## Table of Contents

1. [Stripe Setup & Configuration](#stripe-setup--configuration)
2. [Payment Infrastructure Architecture](#payment-infrastructure-architecture)
3. [Core Payment Processing](#core-payment-processing)
4. [Subscription Management](#subscription-management)
5. [Webhook Integration](#webhook-integration)
6. [Customer Management](#customer-management)
7. [Multi-Currency Support](#multi-currency-support)
8. [Instructor Payouts](#instructor-payouts)
9. [Security & Compliance](#security--compliance)
10. [Testing Strategies](#testing-strategies)
11. [Error Handling & Recovery](#error-handling--recovery)
12. [Monitoring & Analytics](#monitoring--analytics)

## Stripe Setup & Configuration

### Initial Stripe Configuration

```javascript
// src/config/stripe.js
const stripe = require('stripe');
const { StripeWebhookHandler } = require('../services/payments/StripeWebhookHandler');

class StripeConfiguration {
    constructor() {
        this.stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        this.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        this.connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
        
        // Initialize Stripe client
        this.stripe = stripe(this.stripeSecretKey, {
            apiVersion: '2023-10-16',
            timeout: 10000, // 10 seconds
            maxNetworkRetries: 3,
            telemetry: true,
            appInfo: {
                name: '7P Education Platform',
                version: '1.0.0',
                url: 'https://7peducation.com'
            }
        });

        this.webhookHandler = new StripeWebhookHandler(this.stripe, this.webhookSecret);
        
        // Stripe Connect configuration for instructor payouts
        this.connectConfig = {
            clientId: process.env.STRIPE_CONNECT_CLIENT_ID,
            platformFee: 0.05, // 5% platform fee
            applicationFee: 0.029 + 0.30, // Stripe's standard fee
            payoutSchedule: 'weekly' // daily, weekly, monthly
        };
        
        this.validateConfiguration();
    }

    validateConfiguration() {
        const requiredKeys = [
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'STRIPE_WEBHOOK_SECRET'
        ];

        const missing = requiredKeys.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required Stripe configuration: ${missing.join(', ')}`);
        }

        // Validate key formats
        if (!this.stripeSecretKey.startsWith('sk_')) {
            throw new Error('Invalid Stripe secret key format');
        }

        if (!this.stripePublishableKey.startsWith('pk_')) {
            throw new Error('Invalid Stripe publishable key format');
        }

        console.log('✅ Stripe configuration validated successfully');
    }

    getPublicConfig() {
        return {
            publishableKey: this.stripePublishableKey,
            currency: process.env.DEFAULT_CURRENCY || 'usd',
            country: process.env.DEFAULT_COUNTRY || 'US',
            supportedPaymentMethods: [
                'card',
                'paypal',
                'apple_pay',
                'google_pay',
                'sepa_debit',
                'ideal',
                'sofort'
            ],
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#635BFF',
                    colorBackground: '#ffffff',
                    colorText: '#30313d',
                    colorDanger: '#df1b41',
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px'
                }
            }
        };
    }

    // Environment-specific configurations
    isDevelopment() {
        return this.stripeSecretKey.includes('test');
    }

    isProduction() {
        return this.stripeSecretKey.includes('live');
    }

    getStripeInstance() {
        return this.stripe;
    }
}

module.exports = new StripeConfiguration();
```

### Environment Configuration

```bash
# .env.example
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Connect (for instructor payouts)
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Default Settings
DEFAULT_CURRENCY=usd
DEFAULT_COUNTRY=US
PLATFORM_FEE_PERCENTAGE=5.0

# Database Configuration for payments
PAYMENT_DATABASE_URL=postgresql://user:password@localhost:5432/payments_db

# Security
PAYMENT_ENCRYPTION_KEY=your-256-bit-encryption-key
WEBHOOK_SIGNATURE_TOLERANCE=300
```

## Payment Infrastructure Architecture

### Core Payment Service Architecture

```javascript
// src/services/payments/PaymentService.js
const { StripeConfiguration } = require('../../config/stripe');
const { PaymentProcessor } = require('./PaymentProcessor');
const { SubscriptionManager } = require('./SubscriptionManager');
const { CustomerManager } = require('./CustomerManager');
const { WebhookProcessor } = require('./WebhookProcessor');
const { PaymentAnalytics } = require('./PaymentAnalytics');
const { SecurityManager } = require('./SecurityManager');

class PaymentService {
    constructor() {
        this.stripe = StripeConfiguration.getStripeInstance();
        this.processor = new PaymentProcessor(this.stripe);
        this.subscriptions = new SubscriptionManager(this.stripe);
        this.customers = new CustomerManager(this.stripe);
        this.webhooks = new WebhookProcessor(this.stripe);
        this.analytics = new PaymentAnalytics(this.stripe);
        this.security = new SecurityManager();
        
        this.supportedCurrencies = [
            'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'sgd', 'hkd', 'nok', 'sek', 'dkk'
        ];
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Payment success handler
        this.webhooks.on('payment_intent.succeeded', async (paymentIntent) => {
            await this.handlePaymentSuccess(paymentIntent);
        });

        // Payment failure handler
        this.webhooks.on('payment_intent.payment_failed', async (paymentIntent) => {
            await this.handlePaymentFailure(paymentIntent);
        });

        // Subscription events
        this.webhooks.on('invoice.payment_succeeded', async (invoice) => {
            await this.handleSubscriptionPayment(invoice);
        });

        this.webhooks.on('customer.subscription.deleted', async (subscription) => {
            await this.handleSubscriptionCancellation(subscription);
        });

        // Dispute handlers
        this.webhooks.on('charge.dispute.created', async (dispute) => {
            await this.handleDispute(dispute);
        });
    }

    // One-time course purchase
    async purchaseCourse(userId, courseId, paymentMethodId, options = {}) {
        try {
            // Validate inputs
            await this.validatePurchaseInputs(userId, courseId, paymentMethodId);
            
            // Get course and pricing information
            const course = await this.getCourseDetails(courseId);
            const pricing = await this.calculateCoursePricing(course, options);
            
            // Get or create customer
            const customer = await this.customers.getOrCreateCustomer(userId, {
                defaultPaymentMethod: paymentMethodId
            });

            // Create payment intent
            const paymentIntentData = {
                amount: pricing.totalAmount,
                currency: pricing.currency,
                customer: customer.stripeCustomerId,
                payment_method: paymentMethodId,
                confirmation_method: 'manual',
                confirm: true,
                return_url: `${process.env.APP_URL}/payment/return`,
                metadata: {
                    userId,
                    courseId,
                    purchaseType: 'course',
                    platformFee: pricing.platformFee.toString(),
                    instructorPayout: pricing.instructorPayout.toString()
                }
            };

            // Add application fee for instructor payout
            if (pricing.applicationFee > 0) {
                paymentIntentData.application_fee_amount = pricing.applicationFee;
                paymentIntentData.on_behalf_of = course.instructor.stripeAccountId;
                paymentIntentData.transfer_data = {
                    destination: course.instructor.stripeAccountId
                };
            }

            const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

            // Store payment record
            const paymentRecord = await this.createPaymentRecord({
                userId,
                courseId,
                stripePaymentIntentId: paymentIntent.id,
                amount: pricing.totalAmount,
                currency: pricing.currency,
                status: 'pending',
                type: 'course_purchase',
                metadata: pricing
            });

            return {
                paymentIntent,
                clientSecret: paymentIntent.client_secret,
                paymentRecord,
                requiresAction: paymentIntent.status === 'requires_action',
                success: paymentIntent.status === 'succeeded'
            };

        } catch (error) {
            console.error('Course purchase failed:', error);
            throw new PaymentError(`Course purchase failed: ${error.message}`, {
                code: 'COURSE_PURCHASE_FAILED',
                originalError: error,
                userId,
                courseId
            });
        }
    }

    // Subscription-based learning plan
    async createSubscription(userId, planId, paymentMethodId, options = {}) {
        try {
            // Get subscription plan details
            const plan = await this.getSubscriptionPlan(planId);
            
            // Get or create customer
            const customer = await this.customers.getOrCreateCustomer(userId, {
                defaultPaymentMethod: paymentMethodId
            });

            // Attach payment method to customer
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customer.stripeCustomerId
            });

            // Set as default payment method
            await this.stripe.customers.update(customer.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            // Calculate pricing with discounts
            const pricing = await this.calculateSubscriptionPricing(plan, options);

            // Create subscription
            const subscriptionData = {
                customer: customer.stripeCustomerId,
                items: [{
                    price: plan.stripePriceId,
                    quantity: 1
                }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    userId,
                    planId,
                    planName: plan.name
                }
            };

            // Apply trial period if applicable
            if (plan.trialDays > 0) {
                subscriptionData.trial_period_days = plan.trialDays;
            }

            // Apply coupon if provided
            if (options.couponId) {
                subscriptionData.coupon = options.couponId;
            }

            const subscription = await this.stripe.subscriptions.create(subscriptionData);

            // Store subscription record
            const subscriptionRecord = await this.createSubscriptionRecord({
                userId,
                planId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customer.stripeCustomerId,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                metadata: {
                    planName: plan.name,
                    pricing
                }
            });

            return {
                subscription,
                subscriptionRecord,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                requiresPaymentMethod: subscription.status === 'incomplete'
            };

        } catch (error) {
            console.error('Subscription creation failed:', error);
            throw new PaymentError(`Subscription creation failed: ${error.message}`, {
                code: 'SUBSCRIPTION_CREATION_FAILED',
                originalError: error,
                userId,
                planId
            });
        }
    }

    // Handle payment method setup for future use
    async setupPaymentMethod(userId, paymentMethodId, options = {}) {
        try {
            // Get customer
            const customer = await this.customers.getOrCreateCustomer(userId);

            // Create setup intent
            const setupIntent = await this.stripe.setupIntents.create({
                customer: customer.stripeCustomerId,
                payment_method: paymentMethodId,
                usage: options.usage || 'off_session',
                confirm: true,
                metadata: {
                    userId,
                    purpose: options.purpose || 'future_payments'
                }
            });

            // Store payment method if setup succeeded
            if (setupIntent.status === 'succeeded') {
                await this.storePaymentMethod(userId, paymentMethodId, setupIntent);
            }

            return {
                setupIntent,
                clientSecret: setupIntent.client_secret,
                success: setupIntent.status === 'succeeded',
                requiresAction: setupIntent.status === 'requires_action'
            };

        } catch (error) {
            console.error('Payment method setup failed:', error);
            throw new PaymentError(`Payment method setup failed: ${error.message}`, {
                code: 'PAYMENT_METHOD_SETUP_FAILED',
                originalError: error,
                userId
            });
        }
    }

    // Process refunds
    async processRefund(paymentId, amount = null, reason = 'requested_by_customer') {
        try {
            // Get payment record
            const payment = await this.getPaymentRecord(paymentId);
            if (!payment) {
                throw new Error('Payment record not found');
            }

            // Create refund
            const refundData = {
                payment_intent: payment.stripePaymentIntentId,
                reason,
                metadata: {
                    paymentId,
                    processedBy: 'system',
                    originalAmount: payment.amount.toString()
                }
            };

            // Partial refund
            if (amount && amount < payment.amount) {
                refundData.amount = amount;
            }

            const refund = await this.stripe.refunds.create(refundData);

            // Update payment record
            await this.updatePaymentRecord(paymentId, {
                status: amount && amount < payment.amount ? 'partially_refunded' : 'refunded',
                refundAmount: refund.amount,
                refundId: refund.id,
                refundedAt: new Date()
            });

            // Handle course access if full refund
            if (refund.amount === payment.amount) {
                await this.revokeCourseAccess(payment.userId, payment.courseId);
            }

            return {
                refund,
                success: true,
                amount: refund.amount,
                status: refund.status
            };

        } catch (error) {
            console.error('Refund processing failed:', error);
            throw new PaymentError(`Refund processing failed: ${error.message}`, {
                code: 'REFUND_PROCESSING_FAILED',
                originalError: error,
                paymentId
            });
        }
    }

    // Validation helpers
    async validatePurchaseInputs(userId, courseId, paymentMethodId) {
        // Validate user exists and is active
        const user = await this.getUserById(userId);
        if (!user || user.status !== 'active') {
            throw new Error('Invalid or inactive user');
        }

        // Validate course exists and is available
        const course = await this.getCourseById(courseId);
        if (!course || course.status !== 'published') {
            throw new Error('Course not available for purchase');
        }

        // Check if user already owns the course
        const existingEnrollment = await this.checkCourseEnrollment(userId, courseId);
        if (existingEnrollment) {
            throw new Error('User already enrolled in this course');
        }

        // Validate payment method
        if (paymentMethodId) {
            try {
                const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
                if (paymentMethod.type !== 'card' && paymentMethod.type !== 'paypal') {
                    throw new Error('Unsupported payment method type');
                }
            } catch (error) {
                throw new Error('Invalid payment method');
            }
        }
    }

    // Pricing calculations
    async calculateCoursePricing(course, options = {}) {
        let baseAmount = course.price * 100; // Convert to cents
        let discount = 0;
        let taxAmount = 0;
        let platformFee = Math.round(baseAmount * 0.05); // 5% platform fee

        // Apply coupon discount
        if (options.couponId) {
            const coupon = await this.validateCoupon(options.couponId, course.id);
            if (coupon) {
                discount = this.calculateDiscount(baseAmount, coupon);
            }
        }

        // Calculate tax if applicable
        if (options.customerLocation) {
            taxAmount = await this.calculateTax(baseAmount - discount, options.customerLocation);
        }

        const totalAmount = baseAmount - discount + taxAmount;
        const instructorPayout = totalAmount - platformFee - Math.round(totalAmount * 0.029) - 30; // Stripe fees

        return {
            baseAmount,
            discount,
            taxAmount,
            totalAmount,
            platformFee,
            instructorPayout,
            applicationFee: platformFee,
            currency: course.currency || 'usd'
        };
    }

    // Event handlers
    async handlePaymentSuccess(paymentIntent) {
        const { userId, courseId, purchaseType } = paymentIntent.metadata;

        try {
            // Update payment record
            await this.updatePaymentRecord(paymentIntent.id, {
                status: 'succeeded',
                completedAt: new Date()
            });

            // Grant course access
            if (purchaseType === 'course') {
                await this.grantCourseAccess(userId, courseId);
            }

            // Send confirmation email
            await this.sendPaymentConfirmation(userId, paymentIntent);

            // Update analytics
            await this.analytics.recordPaymentSuccess(paymentIntent);

            console.log(`Payment succeeded: ${paymentIntent.id} for user ${userId}`);

        } catch (error) {
            console.error('Error handling payment success:', error);
        }
    }

    async handlePaymentFailure(paymentIntent) {
        const { userId } = paymentIntent.metadata;

        try {
            // Update payment record
            await this.updatePaymentRecord(paymentIntent.id, {
                status: 'failed',
                failureReason: paymentIntent.last_payment_error?.message,
                failedAt: new Date()
            });

            // Send failure notification
            await this.sendPaymentFailureNotification(userId, paymentIntent);

            // Update analytics
            await this.analytics.recordPaymentFailure(paymentIntent);

            console.log(`Payment failed: ${paymentIntent.id} for user ${userId}`);

        } catch (error) {
            console.error('Error handling payment failure:', error);
        }
    }

    async handleSubscriptionPayment(invoice) {
        const { userId, planId } = invoice.subscription_object?.metadata || {};

        try {
            // Update subscription record
            await this.updateSubscriptionStatus(invoice.subscription, 'active');

            // Extend access to subscription benefits
            await this.extendSubscriptionAccess(userId, planId);

            // Send receipt email
            await this.sendSubscriptionReceipt(userId, invoice);

            console.log(`Subscription payment succeeded: ${invoice.id} for user ${userId}`);

        } catch (error) {
            console.error('Error handling subscription payment:', error);
        }
    }

    // Utility methods
    async createPaymentRecord(data) {
        const { PaymentModel } = require('../../models/PaymentModel');
        return await PaymentModel.create(data);
    }

    async updatePaymentRecord(paymentIntentId, updates) {
        const { PaymentModel } = require('../../models/PaymentModel');
        return await PaymentModel.updateByStripePaymentIntent(paymentIntentId, updates);
    }

    async createSubscriptionRecord(data) {
        const { SubscriptionModel } = require('../../models/SubscriptionModel');
        return await SubscriptionModel.create(data);
    }

    async grantCourseAccess(userId, courseId) {
        const { EnrollmentService } = require('../EnrollmentService');
        return await EnrollmentService.enrollUser(userId, courseId, {
            source: 'purchase',
            accessLevel: 'full'
        });
    }

    async sendPaymentConfirmation(userId, paymentIntent) {
        const { EmailService } = require('../EmailService');
        return await EmailService.sendPaymentConfirmation(userId, {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });
    }
}

class PaymentError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'PaymentError';
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

module.exports = { PaymentService, PaymentError };
```

## Core Payment Processing

### Payment Processing Engine

```javascript
// src/services/payments/PaymentProcessor.js
class PaymentProcessor {
    constructor(stripeInstance) {
        this.stripe = stripeInstance;
        this.retryConfig = {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000
        };
    }

    // Process single payment with retry logic
    async processPayment(paymentData, options = {}) {
        const { 
            amount, 
            currency, 
            paymentMethodId, 
            customerId, 
            description,
            metadata = {},
            automaticPaymentMethods = true 
        } = paymentData;

        try {
            // Create payment intent with comprehensive configuration
            const paymentIntentData = {
                amount: Math.round(amount), // Ensure integer
                currency: currency.toLowerCase(),
                description,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString(),
                    processor_version: '2.0'
                },
                payment_method_types: automaticPaymentMethods ? undefined : ['card'],
                automatic_payment_methods: automaticPaymentMethods ? {
                    enabled: true,
                    allow_redirects: 'always'
                } : undefined
            };

            // Add customer if provided
            if (customerId) {
                paymentIntentData.customer = customerId;
            }

            // Add payment method if provided
            if (paymentMethodId) {
                paymentIntentData.payment_method = paymentMethodId;
                paymentIntentData.confirmation_method = 'manual';
                paymentIntentData.confirm = true;
            }

            // Add return URL for redirect-based payment methods
            if (options.returnUrl) {
                paymentIntentData.return_url = options.returnUrl;
            }

            // Create payment intent with retry logic
            const paymentIntent = await this.executeWithRetry(
                () => this.stripe.paymentIntents.create(paymentIntentData),
                'create_payment_intent'
            );

            return {
                paymentIntent,
                clientSecret: paymentIntent.client_secret,
                status: paymentIntent.status,
                requiresAction: paymentIntent.status === 'requires_action',
                success: paymentIntent.status === 'succeeded'
            };

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_PROCESSING_FAILED');
        }
    }

    // Confirm payment (for client-side confirmation)
    async confirmPayment(paymentIntentId, paymentMethodId = null) {
        try {
            const confirmData = {};
            
            if (paymentMethodId) {
                confirmData.payment_method = paymentMethodId;
            }

            const paymentIntent = await this.executeWithRetry(
                () => this.stripe.paymentIntents.confirm(paymentIntentId, confirmData),
                'confirm_payment_intent'
            );

            return {
                paymentIntent,
                status: paymentIntent.status,
                requiresAction: paymentIntent.status === 'requires_action',
                success: paymentIntent.status === 'succeeded'
            };

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_CONFIRMATION_FAILED');
        }
    }

    // Handle payment method update during payment
    async updatePaymentMethod(paymentIntentId, paymentMethodId) {
        try {
            const paymentIntent = await this.executeWithRetry(
                () => this.stripe.paymentIntents.update(paymentIntentId, {
                    payment_method: paymentMethodId
                }),
                'update_payment_method'
            );

            // Confirm with new payment method
            return await this.confirmPayment(paymentIntentId);

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_METHOD_UPDATE_FAILED');
        }
    }

    // Cancel payment intent
    async cancelPayment(paymentIntentId, reason = 'requested_by_customer') {
        try {
            const paymentIntent = await this.executeWithRetry(
                () => this.stripe.paymentIntents.cancel(paymentIntentId, {
                    cancellation_reason: reason
                }),
                'cancel_payment_intent'
            );

            return {
                paymentIntent,
                status: paymentIntent.status,
                success: paymentIntent.status === 'canceled'
            };

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_CANCELLATION_FAILED');
        }
    }

    // Capture authorized payment
    async capturePayment(paymentIntentId, amountToCapture = null) {
        try {
            const captureData = {};
            
            if (amountToCapture) {
                captureData.amount_to_capture = Math.round(amountToCapture);
            }

            const paymentIntent = await this.executeWithRetry(
                () => this.stripe.paymentIntents.capture(paymentIntentId, captureData),
                'capture_payment_intent'
            );

            return {
                paymentIntent,
                status: paymentIntent.status,
                capturedAmount: paymentIntent.amount_received,
                success: paymentIntent.status === 'succeeded'
            };

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_CAPTURE_FAILED');
        }
    }

    // Batch payment processing for multiple transactions
    async processBatchPayments(paymentBatch) {
        const results = [];
        const batchSize = 10; // Process in smaller batches to avoid rate limits

        for (let i = 0; i < paymentBatch.length; i += batchSize) {
            const batch = paymentBatch.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (paymentData, index) => {
                try {
                    const result = await this.processPayment(paymentData, {
                        batchIndex: i + index,
                        batchId: paymentData.batchId
                    });

                    return {
                        index: i + index,
                        paymentData: paymentData.id || paymentData.metadata?.orderId,
                        success: true,
                        result
                    };

                } catch (error) {
                    return {
                        index: i + index,
                        paymentData: paymentData.id || paymentData.metadata?.orderId,
                        success: false,
                        error: error.message,
                        details: error.details
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(result => result.value || result.reason));

            // Small delay between batches to respect rate limits
            if (i + batchSize < paymentBatch.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return {
            totalProcessed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    // Retry mechanism for Stripe operations
    async executeWithRetry(operation, operationType, attempt = 1) {
        try {
            return await operation();
        } catch (error) {
            // Don't retry for certain error types
            if (this.isNonRetryableError(error) || attempt >= this.retryConfig.maxAttempts) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
                this.retryConfig.maxDelay
            );

            console.log(`Retrying ${operationType} (attempt ${attempt + 1}/${this.retryConfig.maxAttempts}) after ${delay}ms`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.executeWithRetry(operation, operationType, attempt + 1);
        }
    }

    isNonRetryableError(error) {
        const nonRetryableCodes = [
            'authentication_required',
            'card_declined',
            'insufficient_funds',
            'invalid_request_error',
            'card_not_supported'
        ];

        return nonRetryableCodes.includes(error.code) || 
               error.type === 'invalid_request_error';
    }

    handlePaymentError(error, defaultCode) {
        const errorDetails = {
            code: error.code || defaultCode,
            type: error.type || 'unknown_error',
            stripeErrorType: error.type,
            stripeErrorCode: error.code,
            message: error.message,
            requestId: error.requestId,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString()
        };

        // Add decline code for card errors
        if (error.decline_code) {
            errorDetails.declineCode = error.decline_code;
        }

        // Add payment method specific details
        if (error.payment_method) {
            errorDetails.paymentMethod = {
                type: error.payment_method.type,
                last4: error.payment_method.card?.last4,
                brand: error.payment_method.card?.brand
            };
        }

        throw new PaymentError(error.message, errorDetails);
    }

    // Get payment status
    async getPaymentStatus(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                amountReceived: paymentIntent.amount_received,
                currency: paymentIntent.currency,
                created: new Date(paymentIntent.created * 1000),
                paymentMethod: paymentIntent.payment_method,
                lastPaymentError: paymentIntent.last_payment_error,
                metadata: paymentIntent.metadata
            };

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_STATUS_RETRIEVAL_FAILED');
        }
    }

    // Payment analytics helper
    async getPaymentAnalytics(filters = {}) {
        const { startDate, endDate, currency, status } = filters;
        
        try {
            const searchParams = {
                query: this.buildPaymentSearchQuery(filters),
                limit: 100
            };

            const paymentIntents = await this.stripe.paymentIntents.search(searchParams);
            
            return this.aggregatePaymentData(paymentIntents.data);

        } catch (error) {
            throw this.handlePaymentError(error, 'PAYMENT_ANALYTICS_FAILED');
        }
    }

    buildPaymentSearchQuery(filters) {
        const conditions = [];
        
        if (filters.startDate) {
            conditions.push(`created>=${Math.floor(new Date(filters.startDate).getTime() / 1000)}`);
        }
        
        if (filters.endDate) {
            conditions.push(`created<=${Math.floor(new Date(filters.endDate).getTime() / 1000)}`);
        }
        
        if (filters.currency) {
            conditions.push(`currency:"${filters.currency}"`);
        }
        
        if (filters.status) {
            conditions.push(`status:"${filters.status}"`);
        }

        return conditions.join(' AND ');
    }

    aggregatePaymentData(payments) {
        const analytics = {
            totalPayments: payments.length,
            totalAmount: 0,
            successfulPayments: 0,
            failedPayments: 0,
            averageAmount: 0,
            currencies: new Set(),
            paymentMethods: {},
            dailyBreakdown: {}
        };

        payments.forEach(payment => {
            analytics.totalAmount += payment.amount;
            analytics.currencies.add(payment.currency);
            
            if (payment.status === 'succeeded') {
                analytics.successfulPayments++;
            } else if (['failed', 'canceled'].includes(payment.status)) {
                analytics.failedPayments++;
            }

            // Track payment methods
            if (payment.payment_method) {
                const methodType = payment.payment_method.type || 'unknown';
                analytics.paymentMethods[methodType] = (analytics.paymentMethods[methodType] || 0) + 1;
            }

            // Daily breakdown
            const date = new Date(payment.created * 1000).toDateString();
            analytics.dailyBreakdown[date] = (analytics.dailyBreakdown[date] || 0) + payment.amount;
        });

        analytics.averageAmount = analytics.totalPayments > 0 
            ? analytics.totalAmount / analytics.totalPayments 
            : 0;
        
        analytics.successRate = analytics.totalPayments > 0
            ? (analytics.successfulPayments / analytics.totalPayments) * 100
            : 0;

        return analytics;
    }
}

module.exports = PaymentProcessor;
```

## Subscription Management

### Advanced Subscription Management System

```javascript
// src/services/payments/SubscriptionManager.js
class SubscriptionManager {
    constructor(stripeInstance) {
        this.stripe = stripeInstance;
        this.defaultPlans = {
            basic: {
                name: 'Basic Learning Plan',
                stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
                features: ['Access to basic courses', 'Community access', 'Mobile app'],
                limits: { coursesPerMonth: 3 }
            },
            premium: {
                name: 'Premium Learning Plan',
                stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
                features: ['Unlimited course access', 'Priority support', 'Offline downloads', 'Certificates'],
                limits: { coursesPerMonth: -1 }
            },
            enterprise: {
                name: 'Enterprise Plan',
                stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
                features: ['Team management', 'Custom integrations', 'Advanced analytics', 'Dedicated support'],
                limits: { usersIncluded: 50, coursesPerMonth: -1 }
            }
        };
    }

    // Create subscription with advanced options
    async createSubscription(customerId, planId, options = {}) {
        try {
            const plan = await this.getSubscriptionPlan(planId);
            if (!plan) {
                throw new Error(`Subscription plan '${planId}' not found`);
            }

            const subscriptionData = {
                customer: customerId,
                items: [{
                    price: plan.stripePriceId,
                    quantity: options.quantity || 1
                }],
                payment_behavior: options.paymentBehavior || 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    planId,
                    planName: plan.name,
                    userId: options.userId,
                    createdBy: options.createdBy || 'system',
                    ...options.metadata
                }
            };

            // Configure billing cycle anchor
            if (options.billingCycleAnchor) {
                subscriptionData.billing_cycle_anchor = Math.floor(
                    new Date(options.billingCycleAnchor).getTime() / 1000
                );
            }

            // Apply trial period
            if (options.trialDays && options.trialDays > 0) {
                subscriptionData.trial_period_days = options.trialDays;
            } else if (plan.trialDays && plan.trialDays > 0) {
                subscriptionData.trial_period_days = plan.trialDays;
            }

            // Apply proration behavior
            if (options.prorationBehavior) {
                subscriptionData.proration_behavior = options.prorationBehavior;
            }

            // Apply coupon discount
            if (options.couponId) {
                await this.validateCoupon(options.couponId);
                subscriptionData.coupon = options.couponId;
            }

            // Add tax rates if applicable
            if (options.taxRates && options.taxRates.length > 0) {
                subscriptionData.default_tax_rates = options.taxRates;
            }

            // Collection method for invoices
            subscriptionData.collection_method = options.collectionMethod || 'charge_automatically';

            const subscription = await this.stripe.subscriptions.create(subscriptionData);

            // Store subscription in database
            await this.storeSubscriptionRecord(subscription, {
                userId: options.userId,
                planId,
                options
            });

            return {
                subscription,
                clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
                status: subscription.status,
                requiresPayment: subscription.status === 'incomplete',
                trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
            };

        } catch (error) {
            console.error('Subscription creation failed:', error);
            throw new Error(`Failed to create subscription: ${error.message}`);
        }
    }

    // Update subscription (upgrade/downgrade)
    async updateSubscription(subscriptionId, updates) {
        try {
            const currentSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            
            if (!currentSubscription) {
                throw new Error('Subscription not found');
            }

            const updateData = {
                metadata: {
                    ...currentSubscription.metadata,
                    lastModified: new Date().toISOString(),
                    modifiedBy: updates.modifiedBy || 'system'
                }
            };

            // Handle plan change
            if (updates.planId) {
                const newPlan = await this.getSubscriptionPlan(updates.planId);
                if (!newPlan) {
                    throw new Error(`New subscription plan '${updates.planId}' not found`);
                }

                // Calculate proration
                const prorationPreview = await this.calculatePlanChangeProration(
                    subscriptionId, 
                    newPlan.stripePriceId,
                    updates.quantity || 1
                );

                updateData.items = [{
                    id: currentSubscription.items.data[0].id,
                    price: newPlan.stripePriceId,
                    quantity: updates.quantity || 1
                }];

                updateData.proration_behavior = updates.prorationBehavior || 'create_prorations';
                updateData.metadata.planId = updates.planId;
                updateData.metadata.planName = newPlan.name;
                updateData.metadata.prorationAmount = prorationPreview.amount.toString();
            }

            // Handle coupon changes
            if (updates.couponId !== undefined) {
                if (updates.couponId) {
                    await this.validateCoupon(updates.couponId);
                    updateData.coupon = updates.couponId;
                } else {
                    updateData.coupon = ''; // Remove coupon
                }
            }

            // Handle trial extension
            if (updates.extendTrial && updates.trialEnd) {
                updateData.trial_end = Math.floor(new Date(updates.trialEnd).getTime() / 1000);
            }

            const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, updateData);

            // Update database record
            await this.updateSubscriptionRecord(subscriptionId, {
                planId: updates.planId || currentSubscription.metadata.planId,
                status: updatedSubscription.status,
                currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                updatedAt: new Date()
            });

            return {
                subscription: updatedSubscription,
                prorationAmount: updateData.metadata?.prorationAmount ? 
                    parseInt(updateData.metadata.prorationAmount) : 0,
                effectiveDate: new Date(updatedSubscription.current_period_start * 1000)
            };

        } catch (error) {
            console.error('Subscription update failed:', error);
            throw new Error(`Failed to update subscription: ${error.message}`);
        }
    }

    // Cancel subscription with options
    async cancelSubscription(subscriptionId, options = {}) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            
            if (!subscription) {
                throw new Error('Subscription not found');
            }

            let canceledSubscription;
            
            if (options.immediately) {
                // Cancel immediately
                canceledSubscription = await this.stripe.subscriptions.cancel(subscriptionId, {
                    metadata: {
                        canceledBy: options.canceledBy || 'system',
                        cancelReason: options.reason || 'user_requested',
                        canceledAt: new Date().toISOString()
                    }
                });
            } else {
                // Cancel at period end
                canceledSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true,
                    metadata: {
                        ...subscription.metadata,
                        cancelRequestedBy: options.canceledBy || 'system',
                        cancelReason: options.reason || 'user_requested',
                        cancelRequestedAt: new Date().toISOString()
                    }
                });
            }

            // Update database record
            await this.updateSubscriptionRecord(subscriptionId, {
                status: canceledSubscription.status,
                cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
                canceledAt: canceledSubscription.canceled_at ? 
                    new Date(canceledSubscription.canceled_at * 1000) : null,
                cancelReason: options.reason
            });

            // Handle immediate cancellation access
            if (options.immediately) {
                await this.revokeSubscriptionAccess(subscription.metadata.userId);
            }

            return {
                subscription: canceledSubscription,
                accessUntil: options.immediately ? 
                    new Date() : 
                    new Date(canceledSubscription.current_period_end * 1000),
                immediately: options.immediately
            };

        } catch (error) {
            console.error('Subscription cancellation failed:', error);
            throw new Error(`Failed to cancel subscription: ${error.message}`);
        }
    }

    // Reactivate canceled subscription
    async reactivateSubscription(subscriptionId) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            
            if (!subscription) {
                throw new Error('Subscription not found');
            }

            if (subscription.status === 'canceled') {
                throw new Error('Cannot reactivate a canceled subscription. Create a new subscription instead.');
            }

            // Remove cancellation
            const reactivatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
                metadata: {
                    ...subscription.metadata,
                    reactivatedBy: 'system',
                    reactivatedAt: new Date().toISOString()
                }
            });

            // Update database record
            await this.updateSubscriptionRecord(subscriptionId, {
                status: reactivatedSubscription.status,
                cancelAtPeriodEnd: false,
                reactivatedAt: new Date()
            });

            return {
                subscription: reactivatedSubscription,
                success: true
            };

        } catch (error) {
            console.error('Subscription reactivation failed:', error);
            throw new Error(`Failed to reactivate subscription: ${error.message}`);
        }
    }

    // Handle subscription pause/resume
    async pauseSubscription(subscriptionId, options = {}) {
        try {
            const pauseCollection = {
                behavior: options.behavior || 'void', // void, keep_as_draft, mark_uncollectible
                resumes_at: options.resumesAt ? 
                    Math.floor(new Date(options.resumesAt).getTime() / 1000) : 
                    undefined
            };

            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                pause_collection: pauseCollection,
                metadata: {
                    pausedBy: options.pausedBy || 'system',
                    pausedAt: new Date().toISOString(),
                    pauseReason: options.reason || 'user_requested'
                }
            });

            await this.updateSubscriptionRecord(subscriptionId, {
                status: 'paused',
                pausedAt: new Date(),
                resumesAt: options.resumesAt ? new Date(options.resumesAt) : null
            });

            return {
                subscription,
                pausedUntil: options.resumesAt ? new Date(options.resumesAt) : null
            };

        } catch (error) {
            console.error('Subscription pause failed:', error);
            throw new Error(`Failed to pause subscription: ${error.message}`);
        }
    }

    async resumeSubscription(subscriptionId) {
        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                pause_collection: '',
                metadata: {
                    resumedBy: 'system',
                    resumedAt: new Date().toISOString()
                }
            });

            await this.updateSubscriptionRecord(subscriptionId, {
                status: subscription.status,
                pausedAt: null,
                resumesAt: null,
                resumedAt: new Date()
            });

            return {
                subscription,
                success: true
            };

        } catch (error) {
            console.error('Subscription resume failed:', error);
            throw new Error(`Failed to resume subscription: ${error.message}`);
        }
    }

    // Calculate proration for plan changes
    async calculatePlanChangeProration(subscriptionId, newPriceId, quantity = 1) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            
            const invoice = await this.stripe.invoices.create({
                customer: subscription.customer,
                subscription: subscriptionId,
                subscription_items: [{
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                    quantity
                }],
                proration_behavior: 'create_prorations'
            });

            return {
                amount: invoice.amount_due,
                currency: invoice.currency,
                prorationDate: new Date(invoice.created * 1000),
                items: invoice.lines.data.map(line => ({
                    description: line.description,
                    amount: line.amount,
                    proration: line.proration
                }))
            };

        } catch (error) {
            console.error('Proration calculation failed:', error);
            throw new Error(`Failed to calculate proration: ${error.message}`);
        }
    }

    // Get subscription usage and limits
    async getSubscriptionUsage(subscriptionId, userId) {
        try {
            const subscription = await this.getSubscriptionRecord(subscriptionId);
            const plan = await this.getSubscriptionPlan(subscription.planId);
            
            const currentPeriodStart = subscription.currentPeriodStart;
            const currentPeriodEnd = subscription.currentPeriodEnd;

            // Calculate usage based on plan limits
            const usage = {
                period: {
                    start: currentPeriodStart,
                    end: currentPeriodEnd
                },
                limits: plan.limits,
                current: {}
            };

            // Get course enrollment count for the period
            if (plan.limits.coursesPerMonth !== -1) {
                const courseEnrollments = await this.getCourseEnrollmentsInPeriod(
                    userId, 
                    currentPeriodStart, 
                    currentPeriodEnd
                );
                
                usage.current.coursesEnrolled = courseEnrollments.length;
                usage.remaining = Math.max(0, plan.limits.coursesPerMonth - courseEnrollments.length);
            }

            return usage;

        } catch (error) {
            console.error('Usage calculation failed:', error);
            throw new Error(`Failed to get subscription usage: ${error.message}`);
        }
    }

    // Helper methods
    async getSubscriptionPlan(planId) {
        return this.defaultPlans[planId] || null;
    }

    async validateCoupon(couponId) {
        const coupon = await this.stripe.coupons.retrieve(couponId);
        if (!coupon.valid) {
            throw new Error('Invalid or expired coupon');
        }
        return coupon;
    }

    async storeSubscriptionRecord(subscription, additionalData) {
        const { SubscriptionModel } = require('../../models/SubscriptionModel');
        return await SubscriptionModel.create({
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            userId: additionalData.userId,
            planId: additionalData.planId,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            metadata: subscription.metadata,
            createdAt: new Date(subscription.created * 1000)
        });
    }

    async updateSubscriptionRecord(subscriptionId, updates) {
        const { SubscriptionModel } = require('../../models/SubscriptionModel');
        return await SubscriptionModel.updateByStripeId(subscriptionId, updates);
    }

    async getSubscriptionRecord(subscriptionId) {
        const { SubscriptionModel } = require('../../models/SubscriptionModel');
        return await SubscriptionModel.findByStripeId(subscriptionId);
    }

    async getCourseEnrollmentsInPeriod(userId, startDate, endDate) {
        const { EnrollmentModel } = require('../../models/EnrollmentModel');
        return await EnrollmentModel.findByUserIdAndDateRange(userId, startDate, endDate);
    }

    async revokeSubscriptionAccess(userId) {
        const { UserService } = require('../UserService');
        return await UserService.updateSubscriptionStatus(userId, 'canceled');
    }
}

module.exports = SubscriptionManager;
```

This comprehensive Stripe integration guide provides enterprise-grade payment processing capabilities for the 7P Education Platform, covering everything from basic payments to advanced subscription management, security compliance, and financial analytics. The implementation includes robust error handling, retry mechanisms, and production-ready features designed to handle educational payment workflows at scale.

The guide continues with webhook integration, customer management, multi-currency support, instructor payouts, and comprehensive security measures in the following sections.