# Subscription Billing System for 7P Education Platform

## Executive Summary

This comprehensive document outlines the subscription billing system for the 7P Education Platform, designed to handle complex recurring payment scenarios, educational pricing models, team subscriptions, usage-based billing, and advanced billing operations. The system supports multiple subscription tiers, proration calculations, dunning management, revenue recognition, and compliance with educational pricing standards.

## Table of Contents

1. [Subscription Architecture Overview](#subscription-architecture-overview)
2. [Billing Engine Core](#billing-engine-core)
3. [Subscription Lifecycle Management](#subscription-lifecycle-management)
4. [Pricing Models & Plans](#pricing-models--plans)
5. [Proration & Billing Calculations](#proration--billing-calculations)
6. [Dunning Management](#dunning-management)
7. [Usage-Based Billing](#usage-based-billing)
8. [Team & Enterprise Subscriptions](#team--enterprise-subscriptions)
9. [Revenue Recognition](#revenue-recognition)
10. [Billing Analytics & Reporting](#billing-analytics--reporting)
11. [Tax Management](#tax-management)
12. [Compliance & Audit](#compliance--audit)

## Subscription Architecture Overview

### Core Subscription System Architecture

```javascript
// src/billing/SubscriptionBillingSystem.js
const { EventEmitter } = require('events');
const cron = require('node-cron');

class SubscriptionBillingSystem extends EventEmitter {
    constructor() {
        super();
        this.billingEngine = null;
        this.subscriptionManager = null;
        this.pricingCalculator = null;
        this.dunningManager = null;
        this.usageTracker = null;
        this.revenueRecognition = null;
        this.taxManager = null;
        
        this.billingCycles = new Map();
        this.scheduledJobs = new Map();
        
        this.config = {
            gracePeriodDays: 7,
            maxRetryAttempts: 3,
            prorationPrecision: 2,
            invoiceRetentionDays: 2555, // 7 years
            defaultCurrency: 'usd',
            supportedCurrencies: ['usd', 'eur', 'gbp', 'cad', 'aud'],
            taxCalculation: 'automatic',
            revenueRecognitionMethod: 'monthly_accrual'
        };

        this.subscriptionPlans = {
            individual: {
                basic: {
                    id: 'individual_basic',
                    name: 'Individual Basic',
                    price: 29.99,
                    billingPeriod: 'monthly',
                    features: ['5 courses per month', 'Mobile access', 'Community support'],
                    limits: { coursesPerMonth: 5, downloadableContent: false, certificates: false }
                },
                premium: {
                    id: 'individual_premium',
                    name: 'Individual Premium',
                    price: 59.99,
                    billingPeriod: 'monthly',
                    features: ['Unlimited courses', 'Offline downloads', 'Certificates', 'Priority support'],
                    limits: { coursesPerMonth: -1, downloadableContent: true, certificates: true }
                },
                annual_basic: {
                    id: 'individual_annual_basic',
                    name: 'Individual Basic (Annual)',
                    price: 299.99,
                    billingPeriod: 'yearly',
                    savings: 16.67,
                    features: ['5 courses per month', 'Mobile access', 'Community support', '2 months free'],
                    limits: { coursesPerMonth: 5, downloadableContent: false, certificates: false }
                },
                annual_premium: {
                    id: 'individual_annual_premium',
                    name: 'Individual Premium (Annual)',
                    price: 599.99,
                    billingPeriod: 'yearly',
                    savings: 16.67,
                    features: ['Unlimited courses', 'Offline downloads', 'Certificates', 'Priority support', '2 months free'],
                    limits: { coursesPerMonth: -1, downloadableContent: true, certificates: true }
                }
            },
            team: {
                startup: {
                    id: 'team_startup',
                    name: 'Team Startup',
                    basePrice: 199.99,
                    perUserPrice: 19.99,
                    billingPeriod: 'monthly',
                    minUsers: 5,
                    maxUsers: 25,
                    features: ['Team dashboard', 'Progress tracking', 'Bulk enrollment', 'Admin controls'],
                    limits: { coursesPerUser: -1, adminUsers: 3, integrations: 5 }
                },
                business: {
                    id: 'team_business',
                    name: 'Team Business',
                    basePrice: 399.99,
                    perUserPrice: 24.99,
                    billingPeriod: 'monthly',
                    minUsers: 10,
                    maxUsers: 100,
                    features: ['Advanced analytics', 'Custom branding', 'SSO integration', 'API access'],
                    limits: { coursesPerUser: -1, adminUsers: 10, integrations: -1 }
                }
            },
            enterprise: {
                custom: {
                    id: 'enterprise_custom',
                    name: 'Enterprise',
                    pricing: 'custom',
                    billingPeriod: 'monthly',
                    features: ['Custom implementation', 'Dedicated support', 'SLA guarantee', 'On-premise option'],
                    limits: { customizable: true }
                }
            }
        };

        this.initialize();
    }

    async initialize() {
        console.log('💳 Initializing Subscription Billing System...');

        await this.setupBillingEngine();
        await this.setupSubscriptionManager();
        await this.setupPricingCalculator();
        await this.setupDunningManager();
        await this.setupUsageTracker();
        await this.setupRevenueRecognition();
        await this.setupTaxManager();
        await this.scheduleBillingJobs();

        console.log('✅ Subscription Billing System initialized successfully');
    }

    async setupBillingEngine() {
        const { BillingEngine } = require('./BillingEngine');
        this.billingEngine = new BillingEngine({
            currency: this.config.defaultCurrency,
            precision: this.config.prorationPrecision,
            gracePeriod: this.config.gracePeriodDays,
            retryPolicy: {
                maxAttempts: this.config.maxRetryAttempts,
                backoffMultiplier: 2,
                initialDelay: 24 * 60 * 60 * 1000 // 24 hours
            }
        });

        await this.billingEngine.initialize();
        console.log('✅ Billing Engine initialized');
    }

    async setupSubscriptionManager() {
        const { SubscriptionLifecycleManager } = require('./SubscriptionLifecycleManager');
        this.subscriptionManager = new SubscriptionLifecycleManager({
            plans: this.subscriptionPlans,
            paymentGateway: 'stripe',
            webhookHandling: true,
            stateTransitions: {
                'trial': ['active', 'canceled'],
                'active': ['paused', 'canceled', 'past_due'],
                'past_due': ['active', 'canceled', 'unpaid'],
                'paused': ['active', 'canceled'],
                'canceled': ['active'], // Reactivation possible
                'unpaid': ['canceled']
            }
        });

        await this.subscriptionManager.initialize();
        console.log('✅ Subscription Manager initialized');
    }

    async setupPricingCalculator() {
        const { PricingCalculator } = require('./PricingCalculator');
        this.pricingCalculator = new PricingCalculator({
            plans: this.subscriptionPlans,
            taxCalculation: this.config.taxCalculation,
            prorationAccuracy: this.config.prorationPrecision,
            discountEngine: true,
            currencyConversion: true,
            regionalPricing: {
                'emerging_markets': 0.3, // 70% discount for emerging markets
                'student_discount': 0.5,  // 50% discount for students
                'educator_discount': 0.3  // 70% discount for educators
            }
        });

        await this.pricingCalculator.initialize();
        console.log('✅ Pricing Calculator initialized');
    }

    async setupDunningManager() {
        const { DunningManager } = require('./DunningManager');
        this.dunningManager = new DunningManager({
            retrySchedule: [1, 3, 7, 14], // Days to retry
            gracePeriod: this.config.gracePeriodDays,
            communicationTemplates: {
                'payment_failed': 'payment_failed_template',
                'retry_attempt': 'retry_payment_template',
                'final_notice': 'final_notice_template',
                'subscription_canceled': 'cancellation_template'
            },
            automatedRetry: true,
            smartRetry: true // Use ML to optimize retry timing
        });

        await this.dunningManager.initialize();
        console.log('✅ Dunning Manager initialized');
    }

    async setupUsageTracker() {
        const { UsageTracker } = require('./UsageTracker');
        this.usageTracker = new UsageTracker({
            trackingMetrics: [
                'courses_accessed',
                'content_downloads',
                'api_calls',
                'storage_usage',
                'bandwidth_usage',
                'live_sessions_attended'
            ],
            aggregationPeriods: ['daily', 'weekly', 'monthly'],
            usageLimits: true,
            overage: {
                billing: true,
                alerts: true,
                softLimits: true
            }
        });

        await this.usageTracker.initialize();
        console.log('✅ Usage Tracker initialized');
    }

    // Main subscription creation method
    async createSubscription(userId, planId, options = {}) {
        try {
            console.log(`🔄 Creating subscription: ${planId} for user ${userId}`);

            // Validate plan and user
            const plan = await this.validatePlan(planId);
            const user = await this.validateUser(userId);

            // Check for existing subscriptions
            const existingSubscription = await this.getActiveSubscription(userId);
            if (existingSubscription && !options.allowMultiple) {
                throw new SubscriptionError('User already has an active subscription', {
                    code: 'SUBSCRIPTION_EXISTS',
                    existingSubscriptionId: existingSubscription.id
                });
            }

            // Calculate pricing with discounts and taxes
            const pricingDetails = await this.pricingCalculator.calculateSubscriptionPricing(
                plan, 
                user, 
                options
            );

            // Create customer in payment gateway if needed
            const customer = await this.ensureCustomerExists(user);

            // Create subscription record
            const subscriptionData = {
                userId,
                planId,
                customerId: customer.id,
                status: 'pending',
                billingPeriod: plan.billingPeriod,
                amount: pricingDetails.totalAmount,
                currency: pricingDetails.currency,
                taxRate: pricingDetails.taxRate,
                discountAmount: pricingDetails.discountAmount,
                metadata: {
                    planName: plan.name,
                    features: plan.features,
                    limits: plan.limits,
                    createdBy: options.createdBy || 'user',
                    ...options.metadata
                }
            };

            // Apply trial period if applicable
            if (plan.trialDays && plan.trialDays > 0) {
                subscriptionData.trialEnd = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);
                subscriptionData.status = 'trial';
            }

            // Create subscription in database
            const subscription = await this.createSubscriptionRecord(subscriptionData);

            // Create subscription in payment gateway
            const paymentGatewaySubscription = await this.subscriptionManager.createGatewaySubscription({
                customerId: customer.paymentGatewayId,
                planId: plan.paymentGatewayPlanId || planId,
                trialDays: plan.trialDays,
                discountCoupon: options.couponCode,
                metadata: {
                    subscriptionId: subscription.id,
                    userId,
                    planId
                }
            });

            // Update subscription with gateway information
            await this.updateSubscriptionRecord(subscription.id, {
                paymentGatewaySubscriptionId: paymentGatewaySubscription.id,
                status: paymentGatewaySubscription.status,
                currentPeriodStart: paymentGatewaySubscription.currentPeriodStart,
                currentPeriodEnd: paymentGatewaySubscription.currentPeriodEnd
            });

            // Set up usage tracking
            await this.usageTracker.initializeUserTracking(userId, subscription.id, plan);

            // Schedule first billing if not in trial
            if (subscription.status !== 'trial') {
                await this.scheduleBilling(subscription.id);
            }

            // Emit subscription created event
            this.emit('subscription_created', {
                subscriptionId: subscription.id,
                userId,
                planId,
                pricingDetails
            });

            console.log(`✅ Subscription created successfully: ${subscription.id}`);

            return {
                subscription: {
                    ...subscription,
                    paymentGatewaySubscriptionId: paymentGatewaySubscription.id,
                    status: paymentGatewaySubscription.status
                },
                pricingDetails,
                customer,
                paymentSetupRequired: paymentGatewaySubscription.status === 'incomplete'
            };

        } catch (error) {
            console.error('Subscription creation failed:', error);
            throw new SubscriptionError(`Failed to create subscription: ${error.message}`, {
                code: error.code || 'SUBSCRIPTION_CREATION_FAILED',
                userId,
                planId,
                originalError: error
            });
        }
    }

    // Subscription upgrade/downgrade
    async modifySubscription(subscriptionId, newPlanId, options = {}) {
        try {
            console.log(`🔄 Modifying subscription: ${subscriptionId} to plan: ${newPlanId}`);

            // Get current subscription
            const currentSubscription = await this.getSubscription(subscriptionId);
            if (!currentSubscription) {
                throw new SubscriptionError('Subscription not found', { code: 'SUBSCRIPTION_NOT_FOUND' });
            }

            // Validate new plan
            const newPlan = await this.validatePlan(newPlanId);
            const currentPlan = await this.validatePlan(currentSubscription.planId);

            // Calculate proration
            const prorationDetails = await this.pricingCalculator.calculatePlanChange({
                currentSubscription,
                newPlan,
                changeDate: options.changeDate || new Date(),
                prorationBehavior: options.prorationBehavior || 'create_prorations'
            });

            // Update subscription in payment gateway
            const gatewayUpdate = await this.subscriptionManager.updateGatewaySubscription(
                currentSubscription.paymentGatewaySubscriptionId,
                {
                    newPlanId: newPlan.paymentGatewayPlanId || newPlanId,
                    prorationBehavior: options.prorationBehavior,
                    effectiveDate: options.changeDate
                }
            );

            // Update subscription record
            const updatedSubscription = await this.updateSubscriptionRecord(subscriptionId, {
                planId: newPlanId,
                amount: prorationDetails.newAmount,
                lastModified: new Date(),
                changeHistory: [
                    ...currentSubscription.changeHistory || [],
                    {
                        date: new Date(),
                        action: 'plan_change',
                        fromPlan: currentSubscription.planId,
                        toPlan: newPlanId,
                        prorationAmount: prorationDetails.prorationAmount,
                        effectiveDate: gatewayUpdate.effectiveDate
                    }
                ]
            });

            // Update usage tracking limits
            await this.usageTracker.updateUserLimits(
                currentSubscription.userId,
                subscriptionId,
                newPlan
            );

            // Create proration invoice if needed
            if (prorationDetails.prorationAmount !== 0) {
                await this.createProrationInvoice(subscriptionId, prorationDetails);
            }

            // Emit subscription modified event
            this.emit('subscription_modified', {
                subscriptionId,
                fromPlan: currentSubscription.planId,
                toPlan: newPlanId,
                prorationDetails,
                userId: currentSubscription.userId
            });

            console.log(`✅ Subscription modified successfully: ${subscriptionId}`);

            return {
                subscription: updatedSubscription,
                prorationDetails,
                effectiveDate: gatewayUpdate.effectiveDate,
                changeType: this.determineChangeType(currentPlan, newPlan)
            };

        } catch (error) {
            console.error('Subscription modification failed:', error);
            throw new SubscriptionError(`Failed to modify subscription: ${error.message}`, {
                code: error.code || 'SUBSCRIPTION_MODIFICATION_FAILED',
                subscriptionId,
                originalError: error
            });
        }
    }

    // Subscription cancellation with options
    async cancelSubscription(subscriptionId, options = {}) {
        try {
            console.log(`🔄 Canceling subscription: ${subscriptionId}`);

            const subscription = await this.getSubscription(subscriptionId);
            if (!subscription) {
                throw new SubscriptionError('Subscription not found', { code: 'SUBSCRIPTION_NOT_FOUND' });
            }

            const cancelOptions = {
                immediately: options.immediately || false,
                reason: options.reason || 'user_requested',
                refundType: options.refundType || 'none', // none, partial, full
                accessUntil: options.accessUntil || null
            };

            // Calculate refund if applicable
            let refundDetails = null;
            if (cancelOptions.refundType !== 'none') {
                refundDetails = await this.calculateCancellationRefund(subscription, cancelOptions);
            }

            // Cancel in payment gateway
            const gatewayCancellation = await this.subscriptionManager.cancelGatewaySubscription(
                subscription.paymentGatewaySubscriptionId,
                {
                    immediately: cancelOptions.immediately,
                    reason: cancelOptions.reason
                }
            );

            // Determine access end date
            const accessEndDate = cancelOptions.immediately 
                ? new Date()
                : cancelOptions.accessUntil || gatewayCancellation.accessUntil;

            // Update subscription record
            const canceledSubscription = await this.updateSubscriptionRecord(subscriptionId, {
                status: 'canceled',
                canceledAt: new Date(),
                cancelReason: cancelOptions.reason,
                canceledBy: options.canceledBy || 'user',
                accessUntil: accessEndDate,
                cancelOptions: cancelOptions
            });

            // Process refund if applicable
            if (refundDetails && refundDetails.refundAmount > 0) {
                await this.processRefund(subscription, refundDetails);
            }

            // Schedule access revocation
            if (!cancelOptions.immediately && accessEndDate > new Date()) {
                await this.scheduleAccessRevocation(subscriptionId, accessEndDate);
            } else {
                // Revoke access immediately
                await this.revokeSubscriptionAccess(subscription.userId, subscriptionId);
            }

            // Stop usage tracking
            await this.usageTracker.stopUserTracking(subscription.userId, subscriptionId);

            // Send cancellation confirmation
            await this.sendCancellationConfirmation(subscription, cancelOptions, refundDetails);

            // Emit subscription canceled event
            this.emit('subscription_canceled', {
                subscriptionId,
                userId: subscription.userId,
                reason: cancelOptions.reason,
                refundDetails,
                accessUntil: accessEndDate
            });

            console.log(`✅ Subscription canceled successfully: ${subscriptionId}`);

            return {
                subscription: canceledSubscription,
                refundDetails,
                accessUntil: accessEndDate,
                immediately: cancelOptions.immediately
            };

        } catch (error) {
            console.error('Subscription cancellation failed:', error);
            throw new SubscriptionError(`Failed to cancel subscription: ${error.message}`, {
                code: error.code || 'SUBSCRIPTION_CANCELLATION_FAILED',
                subscriptionId,
                originalError: error
            });
        }
    }

    // Billing cycle processing
    async processBillingCycle(subscriptionId) {
        try {
            console.log(`💳 Processing billing cycle for subscription: ${subscriptionId}`);

            const subscription = await this.getSubscription(subscriptionId);
            if (!subscription || subscription.status !== 'active') {
                console.log(`⚠️  Skipping billing for inactive subscription: ${subscriptionId}`);
                return;
            }

            // Calculate usage-based charges
            const usageCharges = await this.calculateUsageCharges(subscriptionId);

            // Generate invoice
            const invoice = await this.generateInvoice(subscription, usageCharges);

            // Attempt payment
            const paymentResult = await this.attemptPayment(invoice);

            if (paymentResult.success) {
                // Payment successful
                await this.handleSuccessfulPayment(subscription, invoice, paymentResult);
            } else {
                // Payment failed - initiate dunning process
                await this.dunningManager.initiateProcess(subscription, invoice, paymentResult.error);
            }

            // Update billing cycle
            await this.updateBillingCycle(subscriptionId);

            console.log(`✅ Billing cycle processed for subscription: ${subscriptionId}`);

        } catch (error) {
            console.error(`Billing cycle processing failed for subscription ${subscriptionId}:`, error);
            
            // Emit billing error event
            this.emit('billing_error', {
                subscriptionId,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async calculateUsageCharges(subscriptionId) {
        const subscription = await this.getSubscription(subscriptionId);
        const plan = await this.validatePlan(subscription.planId);

        // Get usage data for current billing period
        const usageData = await this.usageTracker.getUsageForPeriod(
            subscription.userId,
            subscriptionId,
            subscription.currentPeriodStart,
            subscription.currentPeriodEnd
        );

        const usageCharges = {
            totalAmount: 0,
            currency: subscription.currency,
            items: []
        };

        // Calculate overage charges for metered billing
        if (plan.meteredBilling) {
            for (const [metric, usage] of Object.entries(usageData.usage)) {
                const limit = plan.limits[metric];
                if (limit > 0 && usage > limit) {
                    const overage = usage - limit;
                    const rate = plan.overage?.[metric]?.rate || 0;
                    const amount = overage * rate;

                    if (amount > 0) {
                        usageCharges.items.push({
                            metric,
                            usage,
                            limit,
                            overage,
                            rate,
                            amount
                        });
                        usageCharges.totalAmount += amount;
                    }
                }
            }
        }

        return usageCharges;
    }

    async generateInvoice(subscription, usageCharges) {
        const plan = await this.validatePlan(subscription.planId);
        
        const invoiceData = {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            customerId: subscription.customerId,
            invoiceNumber: this.generateInvoiceNumber(),
            billingPeriod: {
                start: subscription.currentPeriodStart,
                end: subscription.currentPeriodEnd
            },
            items: [
                {
                    type: 'subscription',
                    description: `${plan.name} - ${this.formatBillingPeriod(subscription.currentPeriodStart, subscription.currentPeriodEnd)}`,
                    amount: subscription.amount,
                    quantity: 1
                }
            ],
            subtotal: subscription.amount,
            taxAmount: subscription.taxAmount || 0,
            discountAmount: subscription.discountAmount || 0,
            currency: subscription.currency,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            status: 'draft'
        };

        // Add usage charges
        if (usageCharges.totalAmount > 0) {
            usageCharges.items.forEach(item => {
                invoiceData.items.push({
                    type: 'usage',
                    description: `${item.metric} overage (${item.overage} units)`,
                    amount: item.amount,
                    quantity: item.overage,
                    rate: item.rate
                });
            });
            invoiceData.subtotal += usageCharges.totalAmount;
        }

        // Calculate total
        invoiceData.total = invoiceData.subtotal + invoiceData.taxAmount - invoiceData.discountAmount;

        // Create invoice record
        const invoice = await this.createInvoiceRecord(invoiceData);

        return invoice;
    }

    // Scheduled billing jobs
    async scheduleBillingJobs() {
        // Daily billing cycle processing
        const dailyBillingJob = cron.schedule('0 2 * * *', async () => {
            console.log('🕐 Running daily billing cycle processing...');
            await this.processDailyBilling();
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        // Weekly dunning management
        const weeklyDunningJob = cron.schedule('0 3 * * 1', async () => {
            console.log('🕐 Running weekly dunning management...');
            await this.dunningManager.processWeeklyDunning();
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        // Monthly revenue recognition
        const monthlyRevenueJob = cron.schedule('0 4 1 * *', async () => {
            console.log('🕐 Running monthly revenue recognition...');
            await this.revenueRecognition.processMonthlyRecognition();
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        // Start all jobs
        dailyBillingJob.start();
        weeklyDunningJob.start();
        monthlyRevenueJob.start();

        this.scheduledJobs.set('daily_billing', dailyBillingJob);
        this.scheduledJobs.set('weekly_dunning', weeklyDunningJob);
        this.scheduledJobs.set('monthly_revenue', monthlyRevenueJob);

        console.log('✅ Billing jobs scheduled successfully');
    }

    async processDailyBilling() {
        try {
            // Get subscriptions due for billing
            const subscriptionsDue = await this.getSubscriptionsDueForBilling();
            
            console.log(`📊 Processing ${subscriptionsDue.length} subscriptions for daily billing`);

            const results = {
                processed: 0,
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const subscription of subscriptionsDue) {
                try {
                    await this.processBillingCycle(subscription.id);
                    results.successful++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        subscriptionId: subscription.id,
                        error: error.message
                    });
                    console.error(`Failed to process billing for subscription ${subscription.id}:`, error);
                }
                results.processed++;
            }

            console.log(`✅ Daily billing completed: ${results.successful} successful, ${results.failed} failed`);

            // Emit daily billing completed event
            this.emit('daily_billing_completed', results);

            return results;

        } catch (error) {
            console.error('Daily billing processing failed:', error);
            throw error;
        }
    }

    // Helper methods
    determineChangeType(currentPlan, newPlan) {
        // Simple price comparison - in reality, this could be more sophisticated
        if (newPlan.price > currentPlan.price) {
            return 'upgrade';
        } else if (newPlan.price < currentPlan.price) {
            return 'downgrade';
        } else {
            return 'lateral_change';
        }
    }

    generateInvoiceNumber() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `INV-${timestamp}-${random}`.toUpperCase();
    }

    formatBillingPeriod(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }

    // Data access methods (would typically interact with database)
    async createSubscriptionRecord(subscriptionData) {
        const { SubscriptionModel } = require('../models/SubscriptionModel');
        return await SubscriptionModel.create({
            ...subscriptionData,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    async updateSubscriptionRecord(subscriptionId, updates) {
        const { SubscriptionModel } = require('../models/SubscriptionModel');
        return await SubscriptionModel.update(subscriptionId, {
            ...updates,
            updatedAt: new Date()
        });
    }

    async getSubscription(subscriptionId) {
        const { SubscriptionModel } = require('../models/SubscriptionModel');
        return await SubscriptionModel.findById(subscriptionId);
    }

    async getActiveSubscription(userId) {
        const { SubscriptionModel } = require('../models/SubscriptionModel');
        return await SubscriptionModel.findActiveByUserId(userId);
    }

    async getSubscriptionsDueForBilling() {
        const { SubscriptionModel } = require('../models/SubscriptionModel');
        return await SubscriptionModel.findDueForBilling(new Date());
    }

    async createInvoiceRecord(invoiceData) {
        const { InvoiceModel } = require('../models/InvoiceModel');
        return await InvoiceModel.create({
            ...invoiceData,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    async validatePlan(planId) {
        // Navigate nested plan structure
        for (const category of Object.values(this.subscriptionPlans)) {
            if (category[planId]) {
                return { id: planId, ...category[planId] };
            }
        }
        throw new SubscriptionError(`Plan not found: ${planId}`, { code: 'PLAN_NOT_FOUND' });
    }

    async validateUser(userId) {
        const { UserModel } = require('../models/UserModel');
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new SubscriptionError(`User not found: ${userId}`, { code: 'USER_NOT_FOUND' });
        }
        return user;
    }

    generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `${timestamp}_${random}`;
    }

    async shutdown() {
        console.log('🛑 Shutting down Subscription Billing System...');

        // Stop all scheduled jobs
        for (const [jobName, job] of this.scheduledJobs) {
            job.stop();
            console.log(`✅ Stopped job: ${jobName}`);
        }

        // Shutdown components
        if (this.billingEngine) await this.billingEngine.shutdown();
        if (this.subscriptionManager) await this.subscriptionManager.shutdown();
        if (this.dunningManager) await this.dunningManager.shutdown();
        if (this.usageTracker) await this.usageTracker.shutdown();
        if (this.revenueRecognition) await this.revenueRecognition.shutdown();

        console.log('✅ Subscription Billing System shutdown completed');
    }
}

class SubscriptionError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'SubscriptionError';
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

module.exports = { SubscriptionBillingSystem, SubscriptionError };
```

## Billing Engine Core

### Advanced Billing Calculation Engine

```javascript
// src/billing/BillingEngine.js
class BillingEngine {
    constructor(config) {
        this.config = {
            currency: config.currency || 'usd',
            precision: config.precision || 2,
            gracePeriod: config.gracePeriod || 7,
            retryPolicy: config.retryPolicy || {
                maxAttempts: 3,
                backoffMultiplier: 2,
                initialDelay: 86400000 // 24 hours
            },
            rounding: 'round', // round, floor, ceiling
            prorationMethod: 'daily', // daily, hourly, monthly
            taxMode: 'inclusive' // inclusive, exclusive
        };

        this.calculationCache = new Map();
        this.exchangeRates = new Map();
    }

    async initialize() {
        await this.loadExchangeRates();
        await this.setupCalculationEngines();
        console.log('✅ Billing Engine initialized');
    }

    // Core billing calculation with comprehensive proration
    async calculateBilling(subscription, billingPeriod, options = {}) {
        try {
            const cacheKey = this.generateCacheKey(subscription.id, billingPeriod, options);
            
            // Check cache first
            if (this.calculationCache.has(cacheKey) && !options.skipCache) {
                return this.calculationCache.get(cacheKey);
            }

            const calculation = {
                subscriptionId: subscription.id,
                billingPeriod,
                baseAmount: 0,
                prorations: [],
                discounts: [],
                taxes: [],
                usage: [],
                credits: [],
                totalAmount: 0,
                currency: subscription.currency,
                calculatedAt: new Date(),
                breakdown: {}
            };

            // Calculate base subscription amount
            calculation.baseAmount = await this.calculateBaseAmount(subscription, billingPeriod);
            calculation.breakdown.base = calculation.baseAmount;

            // Apply proration if mid-cycle changes occurred
            if (subscription.planChanges && subscription.planChanges.length > 0) {
                calculation.prorations = await this.calculateProrations(
                    subscription, 
                    billingPeriod, 
                    subscription.planChanges
                );
                calculation.breakdown.prorations = calculation.prorations.reduce((sum, p) => sum + p.amount, 0);
            }

            // Apply discounts and coupons
            if (subscription.discounts && subscription.discounts.length > 0) {
                calculation.discounts = await this.calculateDiscounts(
                    subscription, 
                    calculation.baseAmount, 
                    subscription.discounts
                );
                calculation.breakdown.discounts = calculation.discounts.reduce((sum, d) => sum + d.amount, 0);
            }

            // Calculate usage-based charges
            if (subscription.plan.usageBased) {
                calculation.usage = await this.calculateUsageCharges(subscription, billingPeriod);
                calculation.breakdown.usage = calculation.usage.reduce((sum, u) => sum + u.amount, 0);
            }

            // Apply credits
            if (subscription.credits && subscription.credits.length > 0) {
                calculation.credits = await this.applyCredits(
                    subscription, 
                    calculation.baseAmount + calculation.breakdown.usage
                );
                calculation.breakdown.credits = calculation.credits.reduce((sum, c) => sum + c.amount, 0);
            }

            // Calculate taxes
            const taxableAmount = calculation.baseAmount 
                + calculation.breakdown.prorations
                + calculation.breakdown.usage
                - calculation.breakdown.discounts
                - calculation.breakdown.credits;

            if (taxableAmount > 0 && subscription.taxRate > 0) {
                calculation.taxes = await this.calculateTaxes(subscription, taxableAmount);
                calculation.breakdown.taxes = calculation.taxes.reduce((sum, t) => sum + t.amount, 0);
            }

            // Calculate final total
            calculation.totalAmount = this.roundAmount(
                taxableAmount + calculation.breakdown.taxes,
                this.config.precision
            );

            // Cache the calculation
            this.calculationCache.set(cacheKey, calculation);

            return calculation;

        } catch (error) {
            console.error('Billing calculation failed:', error);
            throw new Error(`Billing calculation failed: ${error.message}`);
        }
    }

    async calculateProrations(subscription, billingPeriod, planChanges) {
        const prorations = [];
        
        for (const change of planChanges) {
            const proration = await this.calculateProratedAmount({
                fromPlan: change.fromPlan,
                toPlan: change.toPlan,
                changeDate: change.changeDate,
                billingPeriod: billingPeriod,
                prorationMethod: this.config.prorationMethod
            });

            prorations.push({
                changeId: change.id,
                fromPlan: change.fromPlan.name,
                toPlan: change.toPlan.name,
                changeDate: change.changeDate,
                amount: proration.amount,
                description: proration.description,
                type: proration.amount >= 0 ? 'charge' : 'credit'
            });
        }

        return prorations;
    }

    async calculateProratedAmount(options) {
        const { fromPlan, toPlan, changeDate, billingPeriod, prorationMethod } = options;
        
        const periodStart = new Date(billingPeriod.start);
        const periodEnd = new Date(billingPeriod.end);
        const changeDateTime = new Date(changeDate);

        // Validate change date is within billing period
        if (changeDateTime < periodStart || changeDateTime > periodEnd) {
            throw new Error('Change date must be within billing period');
        }

        const totalPeriodDays = this.getDaysBetween(periodStart, periodEnd);
        const remainingDays = this.getDaysBetween(changeDateTime, periodEnd);

        let proratedAmount = 0;
        let description = '';

        switch (prorationMethod) {
            case 'daily':
                const dailyRateOld = fromPlan.price / totalPeriodDays;
                const dailyRateNew = toPlan.price / totalPeriodDays;
                const dailyDifference = dailyRateNew - dailyRateOld;
                proratedAmount = this.roundAmount(dailyDifference * remainingDays, this.config.precision);
                description = `Daily proration: ${remainingDays} days at ${this.formatCurrency(dailyDifference)}/day`;
                break;

            case 'hourly':
                const totalPeriodHours = totalPeriodDays * 24;
                const remainingHours = Math.ceil(this.getHoursBetween(changeDateTime, periodEnd));
                const hourlyRateOld = fromPlan.price / totalPeriodHours;
                const hourlyRateNew = toPlan.price / totalPeriodHours;
                const hourlyDifference = hourlyRateNew - hourlyRateOld;
                proratedAmount = this.roundAmount(hourlyDifference * remainingHours, this.config.precision);
                description = `Hourly proration: ${remainingHours} hours at ${this.formatCurrency(hourlyDifference)}/hour`;
                break;

            case 'monthly':
                // For monthly proration, calculate based on remaining portion of month
                const monthProgress = (changeDateTime - periodStart) / (periodEnd - periodStart);
                const remainingPortion = 1 - monthProgress;
                proratedAmount = this.roundAmount((toPlan.price - fromPlan.price) * remainingPortion, this.config.precision);
                description = `Monthly proration: ${(remainingPortion * 100).toFixed(1)}% of period remaining`;
                break;

            default:
                throw new Error(`Unsupported proration method: ${prorationMethod}`);
        }

        return {
            amount: proratedAmount,
            description,
            method: prorationMethod,
            calculationDetails: {
                totalPeriodDays,
                remainingDays,
                fromPlanPrice: fromPlan.price,
                toPlanPrice: toPlan.price,
                changeDate: changeDateTime
            }
        };
    }

    async calculateDiscounts(subscription, baseAmount, discounts) {
        const appliedDiscounts = [];

        for (const discount of discounts) {
            let discountAmount = 0;
            let description = '';

            switch (discount.type) {
                case 'percentage':
                    discountAmount = baseAmount * (discount.value / 100);
                    description = `${discount.value}% discount`;
                    break;

                case 'fixed':
                    discountAmount = Math.min(discount.value, baseAmount);
                    description = `${this.formatCurrency(discount.value)} fixed discount`;
                    break;

                case 'coupon':
                    const couponDiscount = await this.applyCoupon(discount.couponCode, baseAmount);
                    discountAmount = couponDiscount.amount;
                    description = `Coupon: ${discount.couponCode}`;
                    break;

                case 'loyalty':
                    const loyaltyDiscount = await this.calculateLoyaltyDiscount(subscription, baseAmount);
                    discountAmount = loyaltyDiscount.amount;
                    description = `Loyalty discount: ${loyaltyDiscount.description}`;
                    break;

                default:
                    console.warn(`Unknown discount type: ${discount.type}`);
                    continue;
            }

            if (discountAmount > 0) {
                appliedDiscounts.push({
                    id: discount.id,
                    type: discount.type,
                    amount: this.roundAmount(discountAmount, this.config.precision),
                    description,
                    appliedAt: new Date()
                });
            }
        }

        return appliedDiscounts;
    }

    async calculateUsageCharges(subscription, billingPeriod) {
        const usageCharges = [];
        const plan = subscription.plan;

        if (!plan.usageBased || !plan.usageMetrics) {
            return usageCharges;
        }

        // Get usage data for billing period
        const usageData = await this.getUsageData(subscription.id, billingPeriod);

        for (const [metric, usage] of Object.entries(usageData)) {
            const metricConfig = plan.usageMetrics[metric];
            if (!metricConfig) continue;

            let chargeAmount = 0;
            let description = '';

            switch (metricConfig.billingModel) {
                case 'tiered':
                    const tierResult = this.calculateTieredUsage(usage, metricConfig.tiers);
                    chargeAmount = tierResult.amount;
                    description = `${metric}: ${usage} units (${tierResult.description})`;
                    break;

                case 'per_unit':
                    const includedUnits = metricConfig.includedUnits || 0;
                    const billableUnits = Math.max(0, usage - includedUnits);
                    chargeAmount = billableUnits * metricConfig.pricePerUnit;
                    description = `${metric}: ${billableUnits} overage units at ${this.formatCurrency(metricConfig.pricePerUnit)}/unit`;
                    break;

                case 'block':
                    const blocks = Math.ceil(usage / metricConfig.blockSize);
                    chargeAmount = blocks * metricConfig.pricePerBlock;
                    description = `${metric}: ${blocks} blocks of ${metricConfig.blockSize} units`;
                    break;

                default:
                    console.warn(`Unknown usage billing model: ${metricConfig.billingModel}`);
                    continue;
            }

            if (chargeAmount > 0) {
                usageCharges.push({
                    metric,
                    usage,
                    amount: this.roundAmount(chargeAmount, this.config.precision),
                    description,
                    billingModel: metricConfig.billingModel,
                    calculatedAt: new Date()
                });
            }
        }

        return usageCharges;
    }

    calculateTieredUsage(usage, tiers) {
        let totalAmount = 0;
        let remainingUsage = usage;
        const tierDetails = [];

        // Sort tiers by upTo value
        const sortedTiers = tiers.sort((a, b) => (a.upTo || Infinity) - (b.upTo || Infinity));

        for (const tier of sortedTiers) {
            if (remainingUsage <= 0) break;

            const tierLimit = tier.upTo || Infinity;
            const tierStart = tier.from || 0;
            const tierUsage = Math.min(remainingUsage, tierLimit - tierStart);

            if (tierUsage > 0) {
                const tierAmount = tierUsage * tier.pricePerUnit;
                totalAmount += tierAmount;
                
                tierDetails.push({
                    tier: `${tierStart}-${tierLimit === Infinity ? '∞' : tierLimit}`,
                    usage: tierUsage,
                    rate: tier.pricePerUnit,
                    amount: tierAmount
                });

                remainingUsage -= tierUsage;
            }
        }

        return {
            amount: totalAmount,
            description: tierDetails.map(t => `${t.usage} at ${this.formatCurrency(t.rate)}`).join(', '),
            tierBreakdown: tierDetails
        };
    }

    async calculateTaxes(subscription, taxableAmount) {
        const taxes = [];
        const taxCalculation = await this.getTaxCalculation(subscription, taxableAmount);

        if (taxCalculation.taxes && taxCalculation.taxes.length > 0) {
            for (const tax of taxCalculation.taxes) {
                taxes.push({
                    name: tax.name,
                    rate: tax.rate,
                    amount: this.roundAmount(tax.amount, this.config.precision),
                    jurisdiction: tax.jurisdiction,
                    type: tax.type // sales_tax, vat, gst, etc.
                });
            }
        }

        return taxes;
    }

    async applyCredits(subscription, chargeableAmount) {
        const appliedCredits = [];
        const availableCredits = await this.getAvailableCredits(subscription.id);

        let remainingAmount = chargeableAmount;

        for (const credit of availableCredits) {
            if (remainingAmount <= 0) break;

            const creditToApply = Math.min(credit.amount, remainingAmount);
            
            if (creditToApply > 0) {
                appliedCredits.push({
                    id: credit.id,
                    amount: this.roundAmount(creditToApply, this.config.precision),
                    description: credit.description,
                    expiresAt: credit.expiresAt,
                    appliedAt: new Date()
                });

                remainingAmount -= creditToApply;
            }
        }

        return appliedCredits;
    }

    // Utility methods
    roundAmount(amount, precision) {
        const multiplier = Math.pow(10, precision);
        
        switch (this.config.rounding) {
            case 'floor':
                return Math.floor(amount * multiplier) / multiplier;
            case 'ceiling':
                return Math.ceil(amount * multiplier) / multiplier;
            case 'round':
            default:
                return Math.round(amount * multiplier) / multiplier;
        }
    }

    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDifference = end.getTime() - start.getTime();
        return Math.ceil(timeDifference / (1000 * 3600 * 24));
    }

    getHoursBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDifference = end.getTime() - start.getTime();
        return timeDifference / (1000 * 3600);
    }

    formatCurrency(amount, currency = this.config.currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount);
    }

    generateCacheKey(subscriptionId, billingPeriod, options) {
        const key = JSON.stringify({
            subscriptionId,
            start: billingPeriod.start,
            end: billingPeriod.end,
            options: {
                skipCache: undefined, // Exclude from cache key
                ...options
            }
        });
        return require('crypto').createHash('md5').update(key).digest('hex');
    }

    // Data access methods (would integrate with actual services)
    async getUsageData(subscriptionId, billingPeriod) {
        // Implementation would fetch usage data from usage tracking service
        return {};
    }

    async getTaxCalculation(subscription, taxableAmount) {
        // Implementation would integrate with tax calculation service (Avalara, TaxJar, etc.)
        return { taxes: [] };
    }

    async getAvailableCredits(subscriptionId) {
        // Implementation would fetch available credits from database
        return [];
    }

    async applyCoupon(couponCode, baseAmount) {
        // Implementation would validate and apply coupon
        return { amount: 0, description: '' };
    }

    async calculateLoyaltyDiscount(subscription, baseAmount) {
        // Implementation would calculate loyalty-based discounts
        return { amount: 0, description: '' };
    }

    async loadExchangeRates() {
        // Implementation would load current exchange rates
        console.log('✅ Exchange rates loaded');
    }

    async setupCalculationEngines() {
        // Initialize any calculation engines or services
        console.log('✅ Calculation engines setup');
    }

    async shutdown() {
        this.calculationCache.clear();
        console.log('✅ Billing Engine shutdown completed');
    }
}

module.exports = BillingEngine;
```

This comprehensive subscription billing system provides enterprise-grade recurring billing capabilities for the 7P Education Platform. The system handles complex subscription scenarios including proration calculations, usage-based billing, dunning management, and revenue recognition while maintaining compliance with educational pricing standards and financial regulations.

The system continues with subscription lifecycle management, dunning processes, usage tracking, and comprehensive reporting capabilities in the following sections.