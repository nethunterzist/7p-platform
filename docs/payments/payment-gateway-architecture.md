# Payment Gateway Architecture for 7P Education Platform

## Executive Summary

This document outlines the comprehensive payment gateway architecture for the 7P Education Platform, designed to handle multiple payment processors, ensure high availability, provide seamless failover capabilities, and maintain PCI DSS compliance. The architecture supports global payment processing, multi-currency transactions, and advanced fraud detection while maintaining optimal performance and security standards for educational commerce.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Gateway Abstraction Layer](#gateway-abstraction-layer)
3. [Multi-Provider Strategy](#multi-provider-strategy)
4. [Failover & Load Balancing](#failover--load-balancing)
5. [Payment Orchestration Engine](#payment-orchestration-engine)
6. [Security Architecture](#security-architecture)
7. [Fraud Detection System](#fraud-detection-system)
8. [Transaction Processing Pipeline](#transaction-processing-pipeline)
9. [Data Architecture & Storage](#data-architecture--storage)
10. [Monitoring & Observability](#monitoring--observability)
11. [Compliance & Audit Framework](#compliance--audit-framework)
12. [Performance Optimization](#performance-optimization)

## Architecture Overview

### High-Level System Architecture

```javascript
// src/architecture/PaymentGatewayArchitecture.js
const { EventEmitter } = require('events');
const { CircuitBreaker } = require('./CircuitBreaker');
const { LoadBalancer } = require('./LoadBalancer');
const { SecurityManager } = require('./SecurityManager');
const { FraudDetector } = require('./FraudDetector');

class PaymentGatewayArchitecture extends EventEmitter {
    constructor() {
        super();
        this.providers = new Map();
        this.orchestrator = null;
        this.loadBalancer = null;
        this.security = null;
        this.fraudDetector = null;
        this.circuitBreakers = new Map();
        
        this.config = {
            defaultProvider: 'stripe',
            fallbackProviders: ['paypal', 'braintree'],
            maxRetries: 3,
            timeoutMs: 30000,
            circuitBreakerThreshold: 5,
            fraudScoreThreshold: 75,
            complianceLevel: 'PCI_DSS_L1'
        };

        this.initializeArchitecture();
    }

    async initializeArchitecture() {
        console.log('🏗️  Initializing Payment Gateway Architecture...');

        // Initialize core components
        await this.setupProviders();
        await this.setupOrchestrator();
        await this.setupLoadBalancer();
        await this.setupSecurity();
        await this.setupFraudDetection();
        await this.setupCircuitBreakers();
        await this.setupMonitoring();

        console.log('✅ Payment Gateway Architecture initialized successfully');
    }

    async setupProviders() {
        // Register payment providers with their configurations
        const providerConfigs = {
            stripe: {
                class: require('../providers/StripeProvider'),
                priority: 1,
                capabilities: ['cards', 'bank_transfers', 'digital_wallets', 'subscriptions'],
                regions: ['US', 'EU', 'APAC'],
                maxAmount: 99999999, // $999,999.99
                currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
                features: ['3ds', 'installments', 'saved_cards', 'webhooks']
            },
            paypal: {
                class: require('../providers/PayPalProvider'),
                priority: 2,
                capabilities: ['digital_wallets', 'bank_transfers'],
                regions: ['GLOBAL'],
                maxAmount: 10000000, // $100,000.00
                currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
                features: ['buyer_protection', 'express_checkout']
            },
            braintree: {
                class: require('../providers/BraintreeProvider'),
                priority: 3,
                capabilities: ['cards', 'digital_wallets', 'bank_transfers'],
                regions: ['US', 'EU'],
                maxAmount: 99999999,
                currencies: ['USD', 'EUR', 'GBP'],
                features: ['3ds', 'fraud_detection', 'vault']
            },
            adyen: {
                class: require('../providers/AdyenProvider'),
                priority: 4,
                capabilities: ['cards', 'bank_transfers', 'digital_wallets', 'local_payments'],
                regions: ['GLOBAL'],
                maxAmount: 999999999,
                currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'HKD'],
                features: ['3ds', 'local_methods', 'real_time_fraud']
            }
        };

        for (const [providerId, config] of Object.entries(providerConfigs)) {
            try {
                const ProviderClass = config.class;
                const provider = new ProviderClass(config);
                
                await provider.initialize();
                this.providers.set(providerId, {
                    instance: provider,
                    config: config,
                    status: 'active',
                    lastHealthCheck: new Date(),
                    errorCount: 0,
                    successCount: 0,
                    avgResponseTime: 0
                });

                console.log(`✅ Provider initialized: ${providerId}`);
            } catch (error) {
                console.error(`❌ Failed to initialize provider ${providerId}:`, error);
            }
        }
    }

    async setupOrchestrator() {
        const { PaymentOrchestrator } = require('./PaymentOrchestrator');
        this.orchestrator = new PaymentOrchestrator({
            providers: this.providers,
            defaultStrategy: 'smart_routing',
            fallbackStrategy: 'round_robin',
            retryPolicy: {
                maxAttempts: this.config.maxRetries,
                backoffMultiplier: 2,
                maxBackoffTime: 30000
            }
        });

        await this.orchestrator.initialize();
        console.log('✅ Payment Orchestrator initialized');
    }

    async setupLoadBalancer() {
        this.loadBalancer = new LoadBalancer({
            providers: this.providers,
            algorithm: 'weighted_round_robin',
            healthCheckInterval: 30000,
            weights: {
                stripe: 70,
                paypal: 20,
                braintree: 5,
                adyen: 5
            }
        });

        await this.loadBalancer.initialize();
        console.log('✅ Load Balancer initialized');
    }

    async setupSecurity() {
        this.security = new SecurityManager({
            encryptionAlgorithm: 'AES-256-GCM',
            keyRotationInterval: 86400000, // 24 hours
            tokenizationProvider: 'internal',
            pciCompliance: true,
            dataRetentionPolicy: {
                transactionData: 2555, // 7 years in days
                personalData: 1095,    // 3 years in days
                paymentMethods: 365    // 1 year in days
            }
        });

        await this.security.initialize();
        console.log('✅ Security Manager initialized');
    }

    async setupFraudDetection() {
        this.fraudDetector = new FraudDetector({
            providers: ['stripe_radar', 'signifyd', 'internal'],
            riskThreshold: this.config.fraudScoreThreshold,
            rules: [
                'velocity_check',
                'geolocation_check',
                'device_fingerprinting',
                'behavioral_analysis',
                'transaction_pattern_analysis'
            ],
            machinelearning: {
                enabled: true,
                model: 'fraud_detection_v2.1',
                updateInterval: 86400000 // 24 hours
            }
        });

        await this.fraudDetector.initialize();
        console.log('✅ Fraud Detection initialized');
    }

    async setupCircuitBreakers() {
        for (const [providerId, providerData] of this.providers) {
            const circuitBreaker = new CircuitBreaker({
                timeout: this.config.timeoutMs,
                errorThreshold: this.config.circuitBreakerThreshold,
                resetTimeout: 60000, // 1 minute
                monitoringPeriod: 300000, // 5 minutes
                name: `payment_${providerId}`
            });

            this.circuitBreakers.set(providerId, circuitBreaker);

            // Setup circuit breaker events
            circuitBreaker.on('open', () => {
                console.warn(`🚨 Circuit breaker opened for provider: ${providerId}`);
                this.emit('provider_unavailable', { providerId, reason: 'circuit_breaker_open' });
            });

            circuitBreaker.on('halfOpen', () => {
                console.info(`🔄 Circuit breaker half-open for provider: ${providerId}`);
            });

            circuitBreaker.on('close', () => {
                console.info(`✅ Circuit breaker closed for provider: ${providerId}`);
                this.emit('provider_available', { providerId });
            });
        }

        console.log('✅ Circuit Breakers initialized');
    }

    async setupMonitoring() {
        const { MonitoringSystem } = require('./MonitoringSystem');
        this.monitoring = new MonitoringSystem({
            providers: this.providers,
            metrics: [
                'transaction_volume',
                'success_rate',
                'response_time',
                'error_rate',
                'fraud_detection_rate',
                'provider_availability'
            ],
            alerting: {
                channels: ['slack', 'email', 'pagerduty'],
                thresholds: {
                    error_rate: 5.0,        // 5% error rate
                    response_time: 5000,    // 5 seconds
                    success_rate: 95.0,     // 95% success rate
                    fraud_rate: 2.0         // 2% fraud rate
                }
            },
            dashboards: ['grafana', 'datadog'],
            logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        });

        await this.monitoring.initialize();
        console.log('✅ Monitoring System initialized');
    }

    // Main payment processing method
    async processPayment(paymentRequest) {
        const startTime = Date.now();
        const transactionId = this.generateTransactionId();

        try {
            // Log transaction start
            this.monitoring.recordTransactionStart(transactionId, paymentRequest);

            // Security validation
            await this.security.validateRequest(paymentRequest);

            // Fraud detection
            const fraudScore = await this.fraudDetector.analyzeTransaction(paymentRequest);
            if (fraudScore > this.config.fraudScoreThreshold) {
                throw new PaymentError('Transaction flagged for fraud', {
                    code: 'FRAUD_DETECTED',
                    fraudScore,
                    transactionId
                });
            }

            // Payment orchestration
            const result = await this.orchestrator.processPayment({
                ...paymentRequest,
                transactionId,
                fraudScore
            });

            // Log successful transaction
            const duration = Date.now() - startTime;
            this.monitoring.recordTransactionSuccess(transactionId, result, duration);

            return {
                ...result,
                transactionId,
                fraudScore,
                processingTime: duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.recordTransactionFailure(transactionId, error, duration);

            throw new PaymentError(`Payment processing failed: ${error.message}`, {
                code: error.code || 'PAYMENT_PROCESSING_FAILED',
                transactionId,
                originalError: error,
                processingTime: duration
            });
        }
    }

    // Health check for all providers
    async performHealthCheck() {
        const healthResults = {
            overall: 'healthy',
            providers: {},
            timestamp: new Date().toISOString(),
            issues: []
        };

        for (const [providerId, providerData] of this.providers) {
            try {
                const healthCheck = await providerData.instance.healthCheck();
                
                healthResults.providers[providerId] = {
                    status: healthCheck.status,
                    responseTime: healthCheck.responseTime,
                    lastCheck: healthCheck.timestamp,
                    errorCount: providerData.errorCount,
                    successCount: providerData.successCount
                };

                // Update provider metrics
                providerData.lastHealthCheck = new Date();
                providerData.avgResponseTime = healthCheck.responseTime;

                if (healthCheck.status !== 'healthy') {
                    healthResults.issues.push({
                        provider: providerId,
                        issue: healthCheck.error || 'Unknown issue'
                    });
                }

            } catch (error) {
                healthResults.providers[providerId] = {
                    status: 'unhealthy',
                    error: error.message,
                    lastCheck: new Date().toISOString()
                };

                healthResults.issues.push({
                    provider: providerId,
                    issue: error.message
                });

                providerData.errorCount++;
            }
        }

        // Determine overall health
        const unhealthyProviders = Object.values(healthResults.providers)
            .filter(p => p.status !== 'healthy').length;
        
        if (unhealthyProviders === this.providers.size) {
            healthResults.overall = 'critical';
        } else if (unhealthyProviders > 0) {
            healthResults.overall = 'degraded';
        }

        return healthResults;
    }

    // Provider failover mechanism
    async handleProviderFailover(failedProviderId, paymentRequest) {
        console.warn(`🔄 Initiating failover from provider: ${failedProviderId}`);

        // Mark provider as temporarily unavailable
        const providerData = this.providers.get(failedProviderId);
        if (providerData) {
            providerData.status = 'failover';
            providerData.errorCount++;
        }

        // Get fallback providers
        const fallbackProviders = this.config.fallbackProviders
            .filter(id => id !== failedProviderId && this.providers.has(id))
            .sort((a, b) => {
                const providerA = this.providers.get(a);
                const providerB = this.providers.get(b);
                return providerA.config.priority - providerB.config.priority;
            });

        if (fallbackProviders.length === 0) {
            throw new PaymentError('No fallback providers available', {
                code: 'NO_FALLBACK_PROVIDERS',
                failedProvider: failedProviderId
            });
        }

        // Try each fallback provider
        for (const fallbackId of fallbackProviders) {
            try {
                console.log(`🔄 Attempting fallback to provider: ${fallbackId}`);
                
                const fallbackProvider = this.providers.get(fallbackId);
                if (fallbackProvider.status !== 'active') {
                    continue;
                }

                // Process payment with fallback provider
                const result = await fallbackProvider.instance.processPayment({
                    ...paymentRequest,
                    providerOverride: fallbackId,
                    isFailover: true,
                    originalProvider: failedProviderId
                });

                console.log(`✅ Failover successful to provider: ${fallbackId}`);
                return result;

            } catch (fallbackError) {
                console.error(`❌ Failover failed for provider ${fallbackId}:`, fallbackError);
                continue;
            }
        }

        throw new PaymentError('All failover attempts failed', {
            code: 'FAILOVER_EXHAUSTED',
            failedProvider: failedProviderId,
            attemptedFallbacks: fallbackProviders
        });
    }

    // Transaction routing logic
    async routeTransaction(paymentRequest) {
        const routingCriteria = {
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            paymentMethod: paymentRequest.paymentMethod,
            customerRegion: paymentRequest.customerRegion,
            merchantCategory: paymentRequest.merchantCategory
        };

        // Smart routing based on multiple factors
        const availableProviders = Array.from(this.providers.entries())
            .filter(([id, data]) => data.status === 'active')
            .map(([id, data]) => ({ id, ...data }))
            .filter(provider => this.isProviderSuitable(provider, routingCriteria))
            .sort((a, b) => this.calculateProviderScore(b, routingCriteria) - 
                           this.calculateProviderScore(a, routingCriteria));

        if (availableProviders.length === 0) {
            throw new PaymentError('No suitable providers available', {
                code: 'NO_SUITABLE_PROVIDERS',
                criteria: routingCriteria
            });
        }

        return availableProviders[0].id;
    }

    isProviderSuitable(provider, criteria) {
        // Check amount limits
        if (criteria.amount > provider.config.maxAmount) {
            return false;
        }

        // Check currency support
        if (!provider.config.currencies.includes(criteria.currency)) {
            return false;
        }

        // Check regional support
        if (criteria.customerRegion && !provider.config.regions.includes(criteria.customerRegion) && 
            !provider.config.regions.includes('GLOBAL')) {
            return false;
        }

        // Check payment method capabilities
        const methodCapabilities = {
            'card': 'cards',
            'bank_transfer': 'bank_transfers',
            'digital_wallet': 'digital_wallets',
            'local_payment': 'local_payments'
        };

        const requiredCapability = methodCapabilities[criteria.paymentMethod];
        if (requiredCapability && !provider.config.capabilities.includes(requiredCapability)) {
            return false;
        }

        return true;
    }

    calculateProviderScore(provider, criteria) {
        let score = 0;

        // Base priority score (higher priority = higher score)
        score += (5 - provider.config.priority) * 20;

        // Success rate score
        const totalTransactions = provider.successCount + provider.errorCount;
        if (totalTransactions > 0) {
            const successRate = provider.successCount / totalTransactions;
            score += successRate * 30;
        }

        // Response time score (lower is better)
        const responseTimeScore = Math.max(0, 20 - (provider.avgResponseTime / 100));
        score += responseTimeScore;

        // Feature matching score
        const featureBonus = this.calculateFeatureBonus(provider.config.features, criteria);
        score += featureBonus;

        return score;
    }

    calculateFeatureBonus(features, criteria) {
        let bonus = 0;
        
        // Bonus for 3DS support with high-value transactions
        if (features.includes('3ds') && criteria.amount > 10000) {
            bonus += 10;
        }

        // Bonus for fraud detection capabilities
        if (features.includes('fraud_detection') || features.includes('real_time_fraud')) {
            bonus += 5;
        }

        // Bonus for subscription support
        if (features.includes('subscriptions') && criteria.merchantCategory === 'subscription') {
            bonus += 15;
        }

        return bonus;
    }

    generateTransactionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `txn_${timestamp}_${random}`;
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🛑 Shutting down Payment Gateway Architecture...');

        // Close circuit breakers
        for (const circuitBreaker of this.circuitBreakers.values()) {
            circuitBreaker.destroy();
        }

        // Shutdown providers
        for (const [providerId, providerData] of this.providers) {
            try {
                await providerData.instance.shutdown();
                console.log(`✅ Provider ${providerId} shut down successfully`);
            } catch (error) {
                console.error(`❌ Error shutting down provider ${providerId}:`, error);
            }
        }

        // Shutdown monitoring
        if (this.monitoring) {
            await this.monitoring.shutdown();
        }

        console.log('✅ Payment Gateway Architecture shut down completed');
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

module.exports = { PaymentGatewayArchitecture, PaymentError };
```

## Gateway Abstraction Layer

### Universal Payment Interface

```javascript
// src/providers/BasePaymentProvider.js
class BasePaymentProvider {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.isInitialized = false;
        this.metrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            totalAmount: 0,
            averageResponseTime: 0,
            lastResponseTimes: []
        };
    }

    // Abstract methods that must be implemented by providers
    async initialize() {
        throw new Error('initialize() must be implemented by provider');
    }

    async processPayment(paymentData) {
        throw new Error('processPayment() must be implemented by provider');
    }

    async createCustomer(customerData) {
        throw new Error('createCustomer() must be implemented by provider');
    }

    async createSubscription(subscriptionData) {
        throw new Error('createSubscription() must be implemented by provider');
    }

    async processRefund(refundData) {
        throw new Error('processRefund() must be implemented by provider');
    }

    async healthCheck() {
        throw new Error('healthCheck() must be implemented by provider');
    }

    // Common utility methods
    recordTransaction(success, amount, responseTime) {
        this.metrics.totalTransactions++;
        this.metrics.totalAmount += amount || 0;
        
        if (success) {
            this.metrics.successfulTransactions++;
        } else {
            this.metrics.failedTransactions++;
        }

        // Update response time metrics
        if (responseTime) {
            this.metrics.lastResponseTimes.push(responseTime);
            if (this.metrics.lastResponseTimes.length > 100) {
                this.metrics.lastResponseTimes.shift();
            }
            
            this.metrics.averageResponseTime = 
                this.metrics.lastResponseTimes.reduce((sum, time) => sum + time, 0) / 
                this.metrics.lastResponseTimes.length;
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalTransactions > 0 
                ? (this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100 
                : 0,
            errorRate: this.metrics.totalTransactions > 0
                ? (this.metrics.failedTransactions / this.metrics.totalTransactions) * 100
                : 0
        };
    }

    // Standardized response format
    createStandardResponse(providerResponse, transactionId) {
        return {
            transactionId,
            providerId: this.config.id,
            status: this.normalizeStatus(providerResponse.status),
            amount: providerResponse.amount,
            currency: providerResponse.currency,
            paymentMethodId: providerResponse.paymentMethodId,
            customerId: providerResponse.customerId,
            providerTransactionId: providerResponse.id || providerResponse.transactionId,
            providerResponse,
            timestamp: new Date().toISOString(),
            fees: this.extractFees(providerResponse),
            metadata: providerResponse.metadata || {}
        };
    }

    normalizeStatus(providerStatus) {
        // Map provider-specific statuses to standard statuses
        const statusMap = {
            // Stripe statuses
            'succeeded': 'completed',
            'requires_payment_method': 'pending',
            'requires_confirmation': 'pending',
            'requires_action': 'pending',
            'processing': 'processing',
            'requires_capture': 'authorized',
            'canceled': 'canceled',
            'failed': 'failed',
            
            // PayPal statuses
            'COMPLETED': 'completed',
            'APPROVED': 'authorized',
            'CREATED': 'pending',
            'SAVED': 'pending',
            'EXPIRED': 'failed',
            'CANCELLED': 'canceled',
            
            // Braintree statuses
            'submitted_for_settlement': 'completed',
            'authorized': 'authorized',
            'settlement_pending': 'processing',
            'settled': 'completed',
            'settlement_declined': 'failed',
            'voided': 'canceled'
        };

        return statusMap[providerStatus] || 'unknown';
    }

    extractFees(providerResponse) {
        // Extract fee information in a standardized format
        const fees = {
            processing: 0,
            platform: 0,
            total: 0,
            currency: providerResponse.currency
        };

        // This would be implemented differently for each provider
        if (providerResponse.fees) {
            fees.processing = providerResponse.fees.processing || 0;
            fees.platform = providerResponse.fees.platform || 0;
            fees.total = fees.processing + fees.platform;
        }

        return fees;
    }

    // Error handling and normalization
    normalizeError(providerError) {
        const errorMap = {
            // Common error categories
            'card_declined': {
                category: 'payment_declined',
                retryable: false,
                userMessage: 'Your card was declined. Please try a different payment method.'
            },
            'insufficient_funds': {
                category: 'payment_declined',
                retryable: false,
                userMessage: 'Insufficient funds. Please check your account balance.'
            },
            'expired_card': {
                category: 'payment_declined',
                retryable: false,
                userMessage: 'Your card has expired. Please update your payment method.'
            },
            'incorrect_cvc': {
                category: 'payment_declined',
                retryable: true,
                userMessage: 'The security code is incorrect. Please check and try again.'
            },
            'processing_error': {
                category: 'system_error',
                retryable: true,
                userMessage: 'A processing error occurred. Please try again.'
            },
            'authentication_required': {
                category: 'authentication_required',
                retryable: true,
                userMessage: 'Additional authentication required. Please complete the verification.'
            }
        };

        const normalizedError = errorMap[providerError.code] || {
            category: 'unknown_error',
            retryable: false,
            userMessage: 'An unexpected error occurred. Please contact support.'
        };

        return {
            ...normalizedError,
            originalCode: providerError.code,
            originalMessage: providerError.message,
            providerId: this.config.id,
            timestamp: new Date().toISOString()
        };
    }

    // Validation helpers
    validatePaymentData(paymentData) {
        const required = ['amount', 'currency', 'paymentMethod'];
        const missing = required.filter(field => !paymentData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (paymentData.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (!this.config.currencies.includes(paymentData.currency)) {
            throw new Error(`Currency ${paymentData.currency} not supported by provider`);
        }

        if (paymentData.amount > this.config.maxAmount) {
            throw new Error(`Amount exceeds provider limit of ${this.config.maxAmount}`);
        }
    }

    validateCustomerData(customerData) {
        const required = ['email'];
        const missing = required.filter(field => !customerData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required customer fields: ${missing.join(', ')}`);
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
            throw new Error('Invalid email format');
        }
    }

    // Logging helper
    log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            providerId: this.config.id,
            message,
            data
        };

        console.log(`[${level.toUpperCase()}] ${this.config.id}: ${message}`, data);
        
        // In production, this would integrate with your logging system
        // this.logger.log(logEntry);
    }

    async shutdown() {
        this.log('info', 'Shutting down payment provider');
        this.isInitialized = false;
        
        if (this.client && typeof this.client.destroy === 'function') {
            await this.client.destroy();
        }
    }
}

module.exports = BasePaymentProvider;
```

### Concrete Provider Implementation - Enhanced Stripe Provider

```javascript
// src/providers/StripeProvider.js
const stripe = require('stripe');
const BasePaymentProvider = require('./BasePaymentProvider');

class StripeProvider extends BasePaymentProvider {
    constructor(config) {
        super({ ...config, id: 'stripe' });
        this.stripe = null;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.stripe = stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2023-10-16',
                timeout: this.config.timeout || 10000,
                maxNetworkRetries: 3,
                telemetry: true,
                appInfo: {
                    name: '7P Education Platform',
                    version: '1.0.0'
                }
            });

            // Test the connection
            await this.healthCheck();
            
            this.isInitialized = true;
            this.log('info', 'Stripe provider initialized successfully');

        } catch (error) {
            this.log('error', 'Failed to initialize Stripe provider', { error: error.message });
            throw error;
        }
    }

    async processPayment(paymentData) {
        const startTime = Date.now();
        
        try {
            this.validatePaymentData(paymentData);

            const paymentIntentData = {
                amount: Math.round(paymentData.amount), // Convert to cents
                currency: paymentData.currency.toLowerCase(),
                payment_method: paymentData.paymentMethodId,
                confirmation_method: 'manual',
                confirm: true,
                return_url: paymentData.returnUrl,
                metadata: {
                    transactionId: paymentData.transactionId,
                    userId: paymentData.userId,
                    courseId: paymentData.courseId,
                    ...paymentData.metadata
                }
            };

            if (paymentData.customerId) {
                paymentIntentData.customer = paymentData.customerId;
            }

            // Add Connect account for marketplace payments
            if (paymentData.connectAccountId) {
                paymentIntentData.on_behalf_of = paymentData.connectAccountId;
                paymentIntentData.application_fee_amount = paymentData.applicationFee;
                paymentIntentData.transfer_data = {
                    destination: paymentData.connectAccountId
                };
            }

            const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

            const responseTime = Date.now() - startTime;
            this.recordTransaction(true, paymentData.amount, responseTime);

            return this.createStandardResponse(paymentIntent, paymentData.transactionId);

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.recordTransaction(false, paymentData.amount, responseTime);
            
            const normalizedError = this.normalizeError(error);
            this.log('error', 'Payment processing failed', normalizedError);
            throw normalizedError;
        }
    }

    async createCustomer(customerData) {
        try {
            this.validateCustomerData(customerData);

            const customer = await this.stripe.customers.create({
                email: customerData.email,
                name: customerData.name,
                phone: customerData.phone,
                address: customerData.address,
                metadata: {
                    userId: customerData.userId,
                    createdAt: new Date().toISOString(),
                    ...customerData.metadata
                }
            });

            this.log('info', 'Customer created successfully', { customerId: customer.id });
            return {
                customerId: customer.id,
                email: customer.email,
                created: new Date(customer.created * 1000)
            };

        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.log('error', 'Customer creation failed', normalizedError);
            throw normalizedError;
        }
    }

    async createSubscription(subscriptionData) {
        try {
            const subscription = await this.stripe.subscriptions.create({
                customer: subscriptionData.customerId,
                items: [{
                    price: subscriptionData.priceId,
                    quantity: subscriptionData.quantity || 1
                }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                trial_period_days: subscriptionData.trialDays,
                metadata: {
                    transactionId: subscriptionData.transactionId,
                    userId: subscriptionData.userId,
                    planId: subscriptionData.planId,
                    ...subscriptionData.metadata
                }
            });

            this.log('info', 'Subscription created successfully', { subscriptionId: subscription.id });
            return this.createStandardResponse(subscription, subscriptionData.transactionId);

        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.log('error', 'Subscription creation failed', normalizedError);
            throw normalizedError;
        }
    }

    async processRefund(refundData) {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: refundData.paymentIntentId,
                amount: refundData.amount ? Math.round(refundData.amount) : undefined,
                reason: refundData.reason || 'requested_by_customer',
                metadata: {
                    transactionId: refundData.transactionId,
                    refundReason: refundData.reason,
                    ...refundData.metadata
                }
            });

            this.log('info', 'Refund processed successfully', { refundId: refund.id });
            return this.createStandardResponse(refund, refundData.transactionId);

        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.log('error', 'Refund processing failed', normalizedError);
            throw normalizedError;
        }
    }

    async healthCheck() {
        const startTime = Date.now();
        
        try {
            // Simple API call to test connectivity
            await this.stripe.balance.retrieve();
            
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                responseTime,
                timestamp: new Date().toISOString(),
                provider: 'stripe'
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
                provider: 'stripe'
            };
        }
    }

    // Stripe-specific error normalization
    normalizeError(stripeError) {
        const stripeErrorMap = {
            'card_declined': 'card_declined',
            'insufficient_funds': 'insufficient_funds',
            'expired_card': 'expired_card',
            'incorrect_cvc': 'incorrect_cvc',
            'processing_error': 'processing_error',
            'authentication_required': 'authentication_required'
        };

        const mappedError = {
            ...stripeError,
            code: stripeErrorMap[stripeError.code] || stripeError.code
        };

        return super.normalizeError(mappedError);
    }

    // Stripe-specific fee extraction
    extractFees(stripeResponse) {
        const fees = {
            processing: 0,
            platform: 0,
            total: 0,
            currency: stripeResponse.currency
        };

        if (stripeResponse.charges && stripeResponse.charges.data[0]) {
            const charge = stripeResponse.charges.data[0];
            if (charge.balance_transaction) {
                fees.processing = charge.balance_transaction.fee;
                fees.total = fees.processing;
            }
            
            if (stripeResponse.application_fee_amount) {
                fees.platform = stripeResponse.application_fee_amount;
                fees.total += fees.platform;
            }
        }

        return fees;
    }

    // Webhook processing
    async processWebhook(rawBody, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                rawBody, 
                signature, 
                process.env.STRIPE_WEBHOOK_SECRET
            );

            this.log('info', 'Webhook received', { eventType: event.type, eventId: event.id });
            return event;

        } catch (error) {
            this.log('error', 'Webhook verification failed', { error: error.message });
            throw new Error('Invalid webhook signature');
        }
    }

    async getPaymentDetails(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['payment_method', 'charges.data.balance_transaction']
            });

            return this.createStandardResponse(paymentIntent, paymentIntent.metadata.transactionId);

        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.log('error', 'Payment details retrieval failed', normalizedError);
            throw normalizedError;
        }
    }
}

module.exports = StripeProvider;
```

## Multi-Provider Strategy

### Payment Orchestrator

```javascript
// src/architecture/PaymentOrchestrator.js
class PaymentOrchestrator {
    constructor(config) {
        this.providers = config.providers;
        this.defaultStrategy = config.defaultStrategy || 'smart_routing';
        this.fallbackStrategy = config.fallbackStrategy || 'round_robin';
        this.retryPolicy = config.retryPolicy;
        this.routingRules = new Map();
        
        this.setupRoutingRules();
    }

    setupRoutingRules() {
        // Amount-based routing
        this.routingRules.set('amount_based', {
            priority: 1,
            evaluate: (paymentData) => {
                if (paymentData.amount > 100000) { // $1000+
                    return ['stripe', 'adyen'];
                } else if (paymentData.amount > 10000) { // $100+
                    return ['stripe', 'braintree', 'paypal'];
                } else {
                    return ['paypal', 'stripe'];
                }
            }
        });

        // Region-based routing
        this.routingRules.set('region_based', {
            priority: 2,
            evaluate: (paymentData) => {
                const regionMap = {
                    'US': ['stripe', 'braintree', 'paypal'],
                    'EU': ['stripe', 'adyen', 'paypal'],
                    'APAC': ['stripe', 'adyen'],
                    'OTHER': ['paypal', 'stripe']
                };
                return regionMap[paymentData.customerRegion] || regionMap['OTHER'];
            }
        });

        // Payment method routing
        this.routingRules.set('payment_method_based', {
            priority: 3,
            evaluate: (paymentData) => {
                const methodMap = {
                    'card': ['stripe', 'braintree', 'adyen'],
                    'paypal': ['paypal'],
                    'bank_transfer': ['stripe', 'adyen'],
                    'digital_wallet': ['stripe', 'paypal', 'adyen']
                };
                return methodMap[paymentData.paymentMethod] || ['stripe'];
            }
        });

        // Success rate routing
        this.routingRules.set('success_rate_based', {
            priority: 4,
            evaluate: (paymentData) => {
                const providerMetrics = Array.from(this.providers.entries())
                    .map(([id, data]) => ({
                        id,
                        successRate: data.instance.getMetrics().successRate
                    }))
                    .sort((a, b) => b.successRate - a.successRate);
                
                return providerMetrics.slice(0, 3).map(p => p.id);
            }
        });
    }

    async processPayment(paymentData) {
        const routingDecision = await this.makeRoutingDecision(paymentData);
        
        let lastError = null;
        let attemptCount = 0;
        const maxAttempts = this.retryPolicy.maxAttempts;

        for (const providerId of routingDecision.providers) {
            attemptCount++;
            
            try {
                console.log(`💳 Attempting payment with provider: ${providerId} (attempt ${attemptCount})`);
                
                const provider = this.providers.get(providerId);
                if (!provider || provider.status !== 'active') {
                    throw new Error(`Provider ${providerId} not available`);
                }

                const result = await this.executePayment(provider.instance, paymentData);
                
                // Log successful routing decision
                await this.logRoutingSuccess(providerId, paymentData, result);
                
                return {
                    ...result,
                    providerId,
                    routingDecision,
                    attemptCount
                };

            } catch (error) {
                lastError = error;
                console.error(`❌ Payment failed with provider ${providerId}:`, error.message);
                
                // Log failed attempt
                await this.logRoutingFailure(providerId, paymentData, error);
                
                // Check if error is retryable
                if (!this.isRetryableError(error) || attemptCount >= maxAttempts) {
                    break;
                }

                // Apply backoff delay
                if (attemptCount < routingDecision.providers.length) {
                    const delay = this.calculateBackoffDelay(attemptCount);
                    await this.sleep(delay);
                }
            }
        }

        throw new PaymentError('All payment providers failed', {
            code: 'ALL_PROVIDERS_FAILED',
            lastError,
            attemptCount,
            providersAttempted: routingDecision.providers.slice(0, attemptCount)
        });
    }

    async makeRoutingDecision(paymentData) {
        const strategy = paymentData.routingStrategy || this.defaultStrategy;
        
        switch (strategy) {
            case 'smart_routing':
                return await this.smartRouting(paymentData);
            case 'cost_optimization':
                return await this.costOptimizedRouting(paymentData);
            case 'success_rate_optimization':
                return await this.successRateRouting(paymentData);
            case 'round_robin':
                return await this.roundRobinRouting(paymentData);
            default:
                return await this.smartRouting(paymentData);
        }
    }

    async smartRouting(paymentData) {
        const ruleResults = new Map();
        
        // Apply all routing rules
        for (const [ruleName, rule] of this.routingRules) {
            try {
                const providers = rule.evaluate(paymentData);
                ruleResults.set(ruleName, {
                    providers,
                    priority: rule.priority,
                    weight: this.calculateRuleWeight(ruleName, paymentData)
                });
            } catch (error) {
                console.warn(`Routing rule ${ruleName} failed:`, error.message);
            }
        }

        // Combine results using weighted scoring
        const providerScores = new Map();
        
        for (const [ruleName, result] of ruleResults) {
            result.providers.forEach((providerId, index) => {
                const score = (result.providers.length - index) * result.weight * result.priority;
                providerScores.set(providerId, (providerScores.get(providerId) || 0) + score);
            });
        }

        // Sort providers by score
        const sortedProviders = Array.from(providerScores.entries())
            .filter(([providerId]) => this.providers.has(providerId) && 
                    this.providers.get(providerId).status === 'active')
            .sort(([,scoreA], [,scoreB]) => scoreB - scoreA)
            .map(([providerId]) => providerId);

        return {
            strategy: 'smart_routing',
            providers: sortedProviders.length > 0 ? sortedProviders : ['stripe'], // fallback
            reasoning: 'Multi-factor intelligent routing based on amount, region, success rates, and costs',
            ruleResults: Object.fromEntries(ruleResults)
        };
    }

    async costOptimizedRouting(paymentData) {
        const providers = Array.from(this.providers.entries())
            .filter(([id, data]) => data.status === 'active')
            .map(([id, data]) => ({
                id,
                cost: this.calculateTransactionCost(id, paymentData)
            }))
            .sort((a, b) => a.cost - b.cost)
            .map(p => p.id);

        return {
            strategy: 'cost_optimization',
            providers,
            reasoning: 'Providers ordered by lowest transaction cost'
        };
    }

    async successRateRouting(paymentData) {
        const providers = Array.from(this.providers.entries())
            .filter(([id, data]) => data.status === 'active')
            .map(([id, data]) => ({
                id,
                successRate: data.instance.getMetrics().successRate,
                responseTime: data.avgResponseTime
            }))
            .sort((a, b) => {
                // Primary sort by success rate, secondary by response time
                if (Math.abs(a.successRate - b.successRate) < 1) {
                    return a.responseTime - b.responseTime;
                }
                return b.successRate - a.successRate;
            })
            .map(p => p.id);

        return {
            strategy: 'success_rate_optimization',
            providers,
            reasoning: 'Providers ordered by highest success rate and fastest response time'
        };
    }

    async roundRobinRouting(paymentData) {
        const activeProviders = Array.from(this.providers.entries())
            .filter(([id, data]) => data.status === 'active')
            .map(([id]) => id);

        // Simple round-robin implementation
        const timestamp = Date.now();
        const index = timestamp % activeProviders.length;
        const selectedProvider = activeProviders[index];
        
        // Reorder to put selected provider first
        const orderedProviders = [selectedProvider, ...activeProviders.filter(id => id !== selectedProvider)];

        return {
            strategy: 'round_robin',
            providers: orderedProviders,
            reasoning: 'Round-robin selection based on timestamp'
        };
    }

    calculateRuleWeight(ruleName, paymentData) {
        const weights = {
            'amount_based': paymentData.amount > 50000 ? 1.5 : 1.0,
            'region_based': paymentData.customerRegion ? 1.2 : 0.8,
            'payment_method_based': 1.1,
            'success_rate_based': 1.3
        };
        
        return weights[ruleName] || 1.0;
    }

    calculateTransactionCost(providerId, paymentData) {
        // Simplified cost calculation - in reality, this would be more complex
        const costStructures = {
            'stripe': { fixed: 30, percentage: 2.9 },
            'paypal': { fixed: 30, percentage: 3.49 },
            'braintree': { fixed: 30, percentage: 2.9 },
            'adyen': { fixed: 10, percentage: 2.5 }
        };

        const structure = costStructures[providerId] || costStructures['stripe'];
        return structure.fixed + (paymentData.amount * structure.percentage / 100);
    }

    async executePayment(provider, paymentData) {
        const startTime = Date.now();
        
        try {
            const result = await provider.processPayment(paymentData);
            const duration = Date.now() - startTime;
            
            return {
                ...result,
                processingTime: duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            error.processingTime = duration;
            throw error;
        }
    }

    isRetryableError(error) {
        const nonRetryableCodes = [
            'card_declined',
            'insufficient_funds',
            'invalid_request_error',
            'authentication_required'
        ];

        return !nonRetryableCodes.includes(error.code);
    }

    calculateBackoffDelay(attemptNumber) {
        const baseDelay = this.retryPolicy.baseDelay || 1000;
        const maxDelay = this.retryPolicy.maxBackoffTime || 30000;
        const multiplier = this.retryPolicy.backoffMultiplier || 2;
        
        const delay = Math.min(baseDelay * Math.pow(multiplier, attemptNumber - 1), maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return Math.round(delay + jitter);
    }

    async logRoutingSuccess(providerId, paymentData, result) {
        // Log successful routing for analytics
        console.log(`✅ Routing success: ${providerId}`, {
            transactionId: paymentData.transactionId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            processingTime: result.processingTime
        });
    }

    async logRoutingFailure(providerId, paymentData, error) {
        // Log failed routing attempt for analytics
        console.log(`❌ Routing failure: ${providerId}`, {
            transactionId: paymentData.transactionId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            error: error.message,
            code: error.code
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async initialize() {
        console.log('🎯 Payment Orchestrator initialized');
    }
}

module.exports = PaymentOrchestrator;
```

This comprehensive payment gateway architecture provides enterprise-grade payment processing capabilities for the 7P Education Platform. The system includes multi-provider support, intelligent routing, failover mechanisms, security compliance, and monitoring capabilities designed to handle educational commerce at scale.

The architecture continues with load balancing, fraud detection, security measures, and compliance frameworks in the following sections.