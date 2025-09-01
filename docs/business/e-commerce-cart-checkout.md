# E-commerce Cart & Checkout System for 7P Education Platform

## Executive Summary

This comprehensive document details the complete e-commerce cart and checkout system for the 7P Education Platform, designed to handle complex educational commerce scenarios including course bundles, subscription combinations, team enrollments, flexible pricing models, and multi-step checkout processes. The system provides a seamless shopping experience while maintaining security, compliance, and performance standards for educational transactions.

## Table of Contents

1. [E-commerce Architecture Overview](#e-commerce-architecture-overview)
2. [Shopping Cart Management](#shopping-cart-management)
3. [Checkout Process Engine](#checkout-process-engine)
4. [Product Catalog Integration](#product-catalog-integration)
5. [Pricing Engine](#pricing-engine)
6. [Payment Processing Integration](#payment-processing-integration)
7. [Order Management System](#order-management-system)
8. [Inventory & Enrollment Management](#inventory--enrollment-management)
9. [Analytics & Conversion Optimization](#analytics--conversion-optimization)
10. [Security & Fraud Prevention](#security--fraud-prevention)
11. [Performance Optimization](#performance-optimization)
12. [Mobile Commerce](#mobile-commerce)

## E-commerce Architecture Overview

### Core E-commerce System Architecture

```javascript
// src/ecommerce/EcommerceSystem.js
const { EventEmitter } = require('events');
const { RedisClient } = require('../utils/RedisClient');

class EcommerceSystem extends EventEmitter {
    constructor() {
        super();
        this.cartManager = null;
        this.checkoutEngine = null;
        this.productCatalog = null;
        this.pricingEngine = null;
        this.orderManager = null;
        this.inventoryManager = null;
        this.analyticsTracker = null;
        this.securityManager = null;
        
        this.redis = new RedisClient();
        this.sessionStore = new Map();
        
        this.config = {
            cartExpiry: 72 * 60 * 60 * 1000, // 72 hours
            maxCartItems: 50,
            maxItemQuantity: 10,
            guestCheckout: true,
            minCheckoutAmount: 0,
            maxCheckoutAmount: 10000000, // $100,000
            supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
            defaultCurrency: 'USD',
            taxCalculation: 'automatic',
            inventoryReservation: 30 * 60 * 1000, // 30 minutes
            checkoutSteps: [
                'cart_review',
                'user_authentication',
                'shipping_billing',
                'payment_method',
                'order_confirmation'
            ],
            abandonedCartRecovery: {
                enabled: true,
                emailDelay: [60, 180, 1440], // minutes: 1h, 3h, 24h
                maxRecoveryAttempts: 3
            }
        };

        this.productTypes = {
            course: {
                name: 'Individual Course',
                features: ['Lifetime access', 'Certificate', 'Mobile app access'],
                restrictions: { maxEnrollments: 1 },
                fulfillment: 'instant'
            },
            bundle: {
                name: 'Course Bundle',
                features: ['Multiple courses', 'Bundle discount', 'Progress tracking'],
                restrictions: { minCourses: 2 },
                fulfillment: 'instant'
            },
            subscription: {
                name: 'Learning Subscription',
                features: ['Unlimited access', 'Monthly billing', 'Cancel anytime'],
                restrictions: { billingRequired: true },
                fulfillment: 'ongoing'
            },
            team_license: {
                name: 'Team License',
                features: ['Multi-user access', 'Admin dashboard', 'Bulk enrollment'],
                restrictions: { minUsers: 2, maxUsers: 1000 },
                fulfillment: 'instant'
            },
            certification: {
                name: 'Certification Program',
                features: ['Structured learning path', 'Proctored exams', 'Official certificate'],
                restrictions: { prerequisiteCheck: true },
                fulfillment: 'scheduled'
            }
        };

        this.initialize();
    }

    async initialize() {
        console.log('🛍️  Initializing E-commerce System...');

        await this.setupCartManager();
        await this.setupCheckoutEngine();
        await this.setupProductCatalog();
        await this.setupPricingEngine();
        await this.setupOrderManager();
        await this.setupInventoryManager();
        await this.setupAnalyticsTracker();
        await this.setupSecurityManager();
        await this.setupEventHandlers();

        console.log('✅ E-commerce System initialized successfully');
    }

    async setupCartManager() {
        const { CartManager } = require('./CartManager');
        this.cartManager = new CartManager({
            redis: this.redis,
            expiry: this.config.cartExpiry,
            maxItems: this.config.maxCartItems,
            maxItemQuantity: this.config.maxItemQuantity,
            persistentCart: true,
            cartValidation: true
        });

        await this.cartManager.initialize();
        console.log('✅ Cart Manager initialized');
    }

    async setupCheckoutEngine() {
        const { CheckoutEngine } = require('./CheckoutEngine');
        this.checkoutEngine = new CheckoutEngine({
            steps: this.config.checkoutSteps,
            guestCheckout: this.config.guestCheckout,
            paymentProcessors: ['stripe', 'paypal'],
            taxCalculation: this.config.taxCalculation,
            inventoryReservation: this.config.inventoryReservation,
            securityValidation: true,
            analytics: true
        });

        await this.checkoutEngine.initialize();
        console.log('✅ Checkout Engine initialized');
    }

    async setupProductCatalog() {
        const { ProductCatalog } = require('./ProductCatalog');
        this.productCatalog = new ProductCatalog({
            productTypes: this.productTypes,
            pricingModels: ['fixed', 'tiered', 'dynamic', 'subscription'],
            inventory: true,
            variants: true,
            bundling: true,
            categories: ['programming', 'design', 'business', 'marketing', 'data-science']
        });

        await this.productCatalog.initialize();
        console.log('✅ Product Catalog initialized');
    }

    async setupPricingEngine() {
        const { PricingEngine } = require('./PricingEngine');
        this.pricingEngine = new PricingEngine({
            currencies: this.config.supportedCurrencies,
            defaultCurrency: this.config.defaultCurrency,
            taxCalculation: this.config.taxCalculation,
            discountRules: true,
            bundleDiscounts: true,
            loyaltyProgram: true,
            regionalPricing: true,
            dynamicPricing: true
        });

        await this.pricingEngine.initialize();
        console.log('✅ Pricing Engine initialized');
    }

    // Main e-commerce workflows
    async addToCart(userId, productId, quantity = 1, options = {}) {
        try {
            console.log(`🛒 Adding to cart: ${productId} (quantity: ${quantity}) for user: ${userId}`);

            // Get or create cart
            const cart = await this.cartManager.getCart(userId) || await this.cartManager.createCart(userId);

            // Validate product
            const product = await this.productCatalog.getProduct(productId);
            if (!product) {
                throw new EcommerceError('Product not found', { 
                    code: 'PRODUCT_NOT_FOUND', 
                    productId 
                });
            }

            // Validate product availability
            await this.validateProductAvailability(product, quantity, options);

            // Check cart limits
            await this.validateCartLimits(cart, product, quantity);

            // Check for existing item in cart
            const existingItem = cart.items.find(item => 
                item.productId === productId && 
                JSON.stringify(item.options) === JSON.stringify(options)
            );

            let updatedCart;
            if (existingItem) {
                // Update existing item quantity
                const newQuantity = existingItem.quantity + quantity;
                await this.validateItemQuantity(product, newQuantity);
                
                updatedCart = await this.cartManager.updateItem(cart.id, existingItem.id, {
                    quantity: newQuantity
                });
            } else {
                // Add new item to cart
                const cartItem = {
                    productId,
                    productType: product.type,
                    name: product.name,
                    quantity,
                    options: options,
                    unitPrice: await this.pricingEngine.getPrice(product, userId, options),
                    addedAt: new Date()
                };

                updatedCart = await this.cartManager.addItem(cart.id, cartItem);
            }

            // Recalculate cart totals
            const recalculatedCart = await this.recalculateCart(updatedCart);

            // Track analytics event
            await this.analyticsTracker.trackEvent('cart_item_added', {
                userId,
                productId,
                productType: product.type,
                quantity,
                cartValue: recalculatedCart.total,
                timestamp: new Date()
            });

            console.log(`✅ Item added to cart successfully`);
            return recalculatedCart;

        } catch (error) {
            console.error('Add to cart failed:', error);
            throw new EcommerceError(`Failed to add item to cart: ${error.message}`, {
                code: error.code || 'ADD_TO_CART_FAILED',
                originalError: error,
                userId,
                productId
            });
        }
    }

    async removeFromCart(userId, itemId) {
        try {
            console.log(`🗑️  Removing from cart: item ${itemId} for user: ${userId}`);

            const cart = await this.cartManager.getCart(userId);
            if (!cart) {
                throw new EcommerceError('Cart not found', { code: 'CART_NOT_FOUND' });
            }

            const item = cart.items.find(item => item.id === itemId);
            if (!item) {
                throw new EcommerceError('Cart item not found', { code: 'CART_ITEM_NOT_FOUND' });
            }

            // Remove item from cart
            const updatedCart = await this.cartManager.removeItem(cart.id, itemId);

            // Recalculate cart totals
            const recalculatedCart = await this.recalculateCart(updatedCart);

            // Track analytics event
            await this.analyticsTracker.trackEvent('cart_item_removed', {
                userId,
                productId: item.productId,
                productType: item.productType,
                quantity: item.quantity,
                cartValue: recalculatedCart.total,
                timestamp: new Date()
            });

            console.log(`✅ Item removed from cart successfully`);
            return recalculatedCart;

        } catch (error) {
            console.error('Remove from cart failed:', error);
            throw new EcommerceError(`Failed to remove item from cart: ${error.message}`, {
                code: error.code || 'REMOVE_FROM_CART_FAILED',
                originalError: error,
                userId,
                itemId
            });
        }
    }

    async updateCartItem(userId, itemId, updates) {
        try {
            console.log(`🔄 Updating cart item: ${itemId} for user: ${userId}`);

            const cart = await this.cartManager.getCart(userId);
            if (!cart) {
                throw new EcommerceError('Cart not found', { code: 'CART_NOT_FOUND' });
            }

            const item = cart.items.find(item => item.id === itemId);
            if (!item) {
                throw new EcommerceError('Cart item not found', { code: 'CART_ITEM_NOT_FOUND' });
            }

            // Validate updates
            if (updates.quantity !== undefined) {
                const product = await this.productCatalog.getProduct(item.productId);
                await this.validateItemQuantity(product, updates.quantity);
            }

            // Update item
            const updatedCart = await this.cartManager.updateItem(cart.id, itemId, updates);

            // Recalculate cart totals
            const recalculatedCart = await this.recalculateCart(updatedCart);

            // Track analytics event
            await this.analyticsTracker.trackEvent('cart_item_updated', {
                userId,
                itemId,
                updates,
                cartValue: recalculatedCart.total,
                timestamp: new Date()
            });

            console.log(`✅ Cart item updated successfully`);
            return recalculatedCart;

        } catch (error) {
            console.error('Update cart item failed:', error);
            throw new EcommerceError(`Failed to update cart item: ${error.message}`, {
                code: error.code || 'UPDATE_CART_ITEM_FAILED',
                originalError: error,
                userId,
                itemId
            });
        }
    }

    async applyDiscountCode(userId, discountCode) {
        try {
            console.log(`🎫 Applying discount code: ${discountCode} for user: ${userId}`);

            const cart = await this.cartManager.getCart(userId);
            if (!cart) {
                throw new EcommerceError('Cart not found', { code: 'CART_NOT_FOUND' });
            }

            // Validate discount code
            const discount = await this.pricingEngine.validateDiscountCode(discountCode, cart, userId);
            if (!discount.valid) {
                throw new EcommerceError('Invalid or expired discount code', { 
                    code: 'INVALID_DISCOUNT_CODE',
                    reason: discount.reason
                });
            }

            // Apply discount to cart
            const updatedCart = await this.cartManager.applyDiscount(cart.id, discount);

            // Recalculate cart totals
            const recalculatedCart = await this.recalculateCart(updatedCart);

            // Track analytics event
            await this.analyticsTracker.trackEvent('discount_applied', {
                userId,
                discountCode,
                discountAmount: discount.amount,
                cartValue: recalculatedCart.total,
                timestamp: new Date()
            });

            console.log(`✅ Discount code applied successfully`);
            return {
                cart: recalculatedCart,
                discount,
                savings: discount.amount
            };

        } catch (error) {
            console.error('Apply discount code failed:', error);
            throw new EcommerceError(`Failed to apply discount code: ${error.message}`, {
                code: error.code || 'APPLY_DISCOUNT_FAILED',
                originalError: error,
                userId,
                discountCode
            });
        }
    }

    // Advanced cart calculations
    async recalculateCart(cart) {
        try {
            const calculation = {
                items: [],
                subtotal: 0,
                discountAmount: 0,
                taxAmount: 0,
                total: 0,
                currency: this.config.defaultCurrency,
                appliedDiscounts: cart.discounts || [],
                calculatedAt: new Date()
            };

            // Calculate item totals
            for (const item of cart.items) {
                const product = await this.productCatalog.getProduct(item.productId);
                const itemPrice = await this.pricingEngine.getPrice(product, cart.userId, item.options);
                const itemTotal = itemPrice * item.quantity;

                const calculatedItem = {
                    ...item,
                    unitPrice: itemPrice,
                    total: itemTotal
                };

                calculation.items.push(calculatedItem);
                calculation.subtotal += itemTotal;
            }

            // Apply discounts
            if (cart.discounts && cart.discounts.length > 0) {
                const discountResult = await this.pricingEngine.calculateDiscounts(
                    calculation.subtotal,
                    cart.discounts,
                    cart.userId
                );
                calculation.discountAmount = discountResult.totalDiscount;
                calculation.appliedDiscounts = discountResult.appliedDiscounts;
            }

            // Calculate taxes
            const taxableAmount = calculation.subtotal - calculation.discountAmount;
            if (taxableAmount > 0) {
                const taxResult = await this.pricingEngine.calculateTaxes(
                    taxableAmount,
                    cart.userId,
                    cart.shippingAddress
                );
                calculation.taxAmount = taxResult.totalTax;
            }

            // Calculate final total
            calculation.total = Math.max(0, 
                calculation.subtotal - calculation.discountAmount + calculation.taxAmount
            );

            // Update cart with calculated values
            const updatedCart = await this.cartManager.updateCalculation(cart.id, calculation);

            return updatedCart;

        } catch (error) {
            console.error('Cart recalculation failed:', error);
            throw new EcommerceError(`Failed to recalculate cart: ${error.message}`, {
                code: 'CART_CALCULATION_FAILED',
                originalError: error,
                cartId: cart.id
            });
        }
    }

    // Checkout process initiation
    async initiateCheckout(userId, cartId, checkoutOptions = {}) {
        try {
            console.log(`🛒 Initiating checkout: cart ${cartId} for user: ${userId}`);

            // Get and validate cart
            const cart = await this.cartManager.getCart(userId);
            if (!cart || cart.id !== cartId) {
                throw new EcommerceError('Cart not found or mismatch', { code: 'CART_NOT_FOUND' });
            }

            if (!cart.items || cart.items.length === 0) {
                throw new EcommerceError('Cart is empty', { code: 'EMPTY_CART' });
            }

            // Validate minimum/maximum order amount
            if (cart.total < this.config.minCheckoutAmount) {
                throw new EcommerceError(
                    `Minimum order amount is ${this.formatCurrency(this.config.minCheckoutAmount)}`,
                    { code: 'MIN_ORDER_AMOUNT_NOT_MET' }
                );
            }

            if (cart.total > this.config.maxCheckoutAmount) {
                throw new EcommerceError(
                    `Maximum order amount is ${this.formatCurrency(this.config.maxCheckoutAmount)}`,
                    { code: 'MAX_ORDER_AMOUNT_EXCEEDED' }
                );
            }

            // Reserve inventory for limited products
            const reservationResult = await this.reserveInventory(cart);

            // Create checkout session
            const checkoutSession = await this.checkoutEngine.createSession({
                userId,
                cartId: cart.id,
                cart: cart,
                options: checkoutOptions,
                reservations: reservationResult.reservations,
                expiresAt: new Date(Date.now() + this.config.inventoryReservation)
            });

            // Track analytics event
            await this.analyticsTracker.trackEvent('checkout_initiated', {
                userId,
                cartId: cart.id,
                cartValue: cart.total,
                itemCount: cart.items.length,
                checkoutSessionId: checkoutSession.id,
                timestamp: new Date()
            });

            console.log(`✅ Checkout initiated successfully: session ${checkoutSession.id}`);

            return {
                checkoutSession,
                cart,
                nextStep: checkoutSession.nextStep,
                reservations: reservationResult.reservations
            };

        } catch (error) {
            console.error('Checkout initiation failed:', error);
            throw new EcommerceError(`Failed to initiate checkout: ${error.message}`, {
                code: error.code || 'CHECKOUT_INITIATION_FAILED',
                originalError: error,
                userId,
                cartId
            });
        }
    }

    // Complete checkout process
    async completeCheckout(checkoutSessionId, paymentDetails) {
        try {
            console.log(`💳 Completing checkout: session ${checkoutSessionId}`);

            // Get checkout session
            const session = await this.checkoutEngine.getSession(checkoutSessionId);
            if (!session) {
                throw new EcommerceError('Checkout session not found', { 
                    code: 'CHECKOUT_SESSION_NOT_FOUND' 
                });
            }

            // Validate session hasn't expired
            if (session.expiresAt && new Date() > session.expiresAt) {
                throw new EcommerceError('Checkout session has expired', { 
                    code: 'CHECKOUT_SESSION_EXPIRED' 
                });
            }

            // Process payment
            const paymentResult = await this.checkoutEngine.processPayment(session, paymentDetails);

            if (!paymentResult.success) {
                throw new EcommerceError('Payment processing failed', {
                    code: 'PAYMENT_PROCESSING_FAILED',
                    paymentError: paymentResult.error
                });
            }

            // Create order
            const order = await this.orderManager.createOrder({
                userId: session.userId,
                checkoutSessionId: session.id,
                cart: session.cart,
                paymentResult: paymentResult,
                billingAddress: session.billingAddress,
                shippingAddress: session.shippingAddress
            });

            // Fulfill order (enroll in courses, activate subscriptions, etc.)
            const fulfillmentResult = await this.fulfillOrder(order);

            // Clear cart
            await this.cartManager.clearCart(session.userId);

            // Release inventory reservations
            await this.releaseInventoryReservations(session.reservations);

            // Complete checkout session
            await this.checkoutEngine.completeSession(checkoutSessionId, {
                orderId: order.id,
                paymentResult,
                fulfillmentResult
            });

            // Track analytics event
            await this.analyticsTracker.trackEvent('checkout_completed', {
                userId: session.userId,
                orderId: order.id,
                orderValue: order.total,
                paymentMethod: paymentResult.paymentMethod,
                checkoutSessionId: session.id,
                timestamp: new Date()
            });

            // Send order confirmation
            await this.sendOrderConfirmation(order);

            console.log(`✅ Checkout completed successfully: order ${order.id}`);

            return {
                order,
                paymentResult,
                fulfillmentResult,
                checkoutSession: session
            };

        } catch (error) {
            console.error('Checkout completion failed:', error);
            
            // Handle failed checkout cleanup
            await this.handleFailedCheckout(checkoutSessionId, error);

            throw new EcommerceError(`Failed to complete checkout: ${error.message}`, {
                code: error.code || 'CHECKOUT_COMPLETION_FAILED',
                originalError: error,
                checkoutSessionId
            });
        }
    }

    // Order fulfillment
    async fulfillOrder(order) {
        try {
            console.log(`📦 Fulfilling order: ${order.id}`);

            const fulfillmentResults = {
                successful: [],
                failed: [],
                pending: []
            };

            for (const item of order.items) {
                try {
                    const product = await this.productCatalog.getProduct(item.productId);
                    const fulfillmentResult = await this.fulfillOrderItem(order, item, product);
                    
                    if (fulfillmentResult.success) {
                        fulfillmentResults.successful.push({
                            itemId: item.id,
                            productId: item.productId,
                            result: fulfillmentResult
                        });
                    } else {
                        fulfillmentResults.failed.push({
                            itemId: item.id,
                            productId: item.productId,
                            error: fulfillmentResult.error
                        });
                    }

                } catch (error) {
                    fulfillmentResults.failed.push({
                        itemId: item.id,
                        productId: item.productId,
                        error: error.message
                    });
                }
            }

            // Update order status based on fulfillment results
            let orderStatus = 'completed';
            if (fulfillmentResults.failed.length > 0) {
                orderStatus = fulfillmentResults.successful.length > 0 ? 'partially_fulfilled' : 'failed';
            }

            await this.orderManager.updateOrderStatus(order.id, orderStatus, {
                fulfillmentResults
            });

            console.log(`✅ Order fulfillment completed: ${order.id} (${orderStatus})`);

            return {
                status: orderStatus,
                results: fulfillmentResults,
                fulfilledAt: new Date()
            };

        } catch (error) {
            console.error('Order fulfillment failed:', error);
            throw new EcommerceError(`Order fulfillment failed: ${error.message}`, {
                code: 'ORDER_FULFILLMENT_FAILED',
                originalError: error,
                orderId: order.id
            });
        }
    }

    async fulfillOrderItem(order, item, product) {
        switch (product.type) {
            case 'course':
                return await this.enrollUserInCourse(order.userId, product.id, item.options);

            case 'bundle':
                return await this.enrollUserInBundle(order.userId, product.courseIds, item.options);

            case 'subscription':
                return await this.activateSubscription(order.userId, product.subscriptionPlanId, item.options);

            case 'team_license':
                return await this.createTeamLicense(order.userId, product.id, item.quantity, item.options);

            case 'certification':
                return await this.enrollInCertificationProgram(order.userId, product.id, item.options);

            default:
                throw new Error(`Unknown product type: ${product.type}`);
        }
    }

    // Validation methods
    async validateProductAvailability(product, quantity, options) {
        // Check product status
        if (product.status !== 'active') {
            throw new EcommerceError('Product is not available', { 
                code: 'PRODUCT_NOT_AVAILABLE',
                productStatus: product.status
            });
        }

        // Check inventory for limited products
        if (product.inventory && product.inventory.limited) {
            const available = await this.inventoryManager.getAvailableQuantity(product.id);
            if (available < quantity) {
                throw new EcommerceError('Insufficient inventory', {
                    code: 'INSUFFICIENT_INVENTORY',
                    requested: quantity,
                    available
                });
            }
        }

        // Check enrollment limits for courses
        if (product.type === 'course' && product.enrollmentLimit) {
            const currentEnrollments = await this.getProductEnrollmentCount(product.id);
            if (currentEnrollments >= product.enrollmentLimit) {
                throw new EcommerceError('Course enrollment limit reached', {
                    code: 'ENROLLMENT_LIMIT_REACHED',
                    limit: product.enrollmentLimit,
                    current: currentEnrollments
                });
            }
        }

        // Validate prerequisites for certification programs
        if (product.type === 'certification' && product.prerequisites) {
            const hasPrerequisites = await this.checkUserPrerequisites(options.userId, product.prerequisites);
            if (!hasPrerequisites) {
                throw new EcommerceError('Prerequisites not met', {
                    code: 'PREREQUISITES_NOT_MET',
                    prerequisites: product.prerequisites
                });
            }
        }
    }

    async validateCartLimits(cart, product, quantity) {
        // Check maximum cart items
        if (cart.items.length >= this.config.maxCartItems) {
            throw new EcommerceError('Maximum cart items exceeded', {
                code: 'MAX_CART_ITEMS_EXCEEDED',
                limit: this.config.maxCartItems,
                current: cart.items.length
            });
        }

        // Check for duplicate course enrollment
        if (product.type === 'course') {
            const existingCourse = cart.items.find(item => 
                item.productType === 'course' && item.productId === product.id
            );
            if (existingCourse) {
                throw new EcommerceError('Course already in cart', {
                    code: 'DUPLICATE_COURSE_IN_CART',
                    productId: product.id
                });
            }
        }

        // Check subscription conflicts
        if (product.type === 'subscription') {
            const existingSubscription = cart.items.find(item => item.productType === 'subscription');
            if (existingSubscription && existingSubscription.productId !== product.id) {
                throw new EcommerceError('Only one subscription allowed per order', {
                    code: 'MULTIPLE_SUBSCRIPTIONS_NOT_ALLOWED'
                });
            }
        }
    }

    async validateItemQuantity(product, quantity) {
        if (quantity <= 0) {
            throw new EcommerceError('Quantity must be greater than 0', {
                code: 'INVALID_QUANTITY'
            });
        }

        if (quantity > this.config.maxItemQuantity) {
            throw new EcommerceError('Maximum item quantity exceeded', {
                code: 'MAX_ITEM_QUANTITY_EXCEEDED',
                limit: this.config.maxItemQuantity,
                requested: quantity
            });
        }

        // Product-specific quantity validation
        if (product.type === 'course' && quantity > 1) {
            throw new EcommerceError('Courses can only be purchased once', {
                code: 'COURSE_QUANTITY_LIMIT'
            });
        }

        if (product.type === 'subscription' && quantity > 1) {
            throw new EcommerceError('Subscriptions can only be purchased once', {
                code: 'SUBSCRIPTION_QUANTITY_LIMIT'
            });
        }
    }

    // Inventory management
    async reserveInventory(cart) {
        const reservations = [];
        
        for (const item of cart.items) {
            const product = await this.productCatalog.getProduct(item.productId);
            
            if (product.inventory && product.inventory.limited) {
                const reservation = await this.inventoryManager.reserveQuantity(
                    product.id,
                    item.quantity,
                    cart.userId,
                    this.config.inventoryReservation
                );
                reservations.push(reservation);
            }
        }

        return { reservations };
    }

    async releaseInventoryReservations(reservations) {
        if (!reservations || reservations.length === 0) return;

        for (const reservation of reservations) {
            try {
                await this.inventoryManager.releaseReservation(reservation.id);
            } catch (error) {
                console.error(`Failed to release inventory reservation ${reservation.id}:`, error);
            }
        }
    }

    // Fulfillment methods
    async enrollUserInCourse(userId, courseId, options) {
        const { EnrollmentService } = require('../services/EnrollmentService');
        try {
            const enrollment = await EnrollmentService.enrollUser(userId, courseId, {
                source: 'purchase',
                accessLevel: 'full',
                ...options
            });
            return { success: true, enrollmentId: enrollment.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async enrollUserInBundle(userId, courseIds, options) {
        const enrollments = [];
        const errors = [];

        for (const courseId of courseIds) {
            try {
                const result = await this.enrollUserInCourse(userId, courseId, options);
                if (result.success) {
                    enrollments.push(result.enrollmentId);
                } else {
                    errors.push({ courseId, error: result.error });
                }
            } catch (error) {
                errors.push({ courseId, error: error.message });
            }
        }

        return {
            success: errors.length === 0,
            enrollments,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    async activateSubscription(userId, subscriptionPlanId, options) {
        const { SubscriptionService } = require('../services/SubscriptionService');
        try {
            const subscription = await SubscriptionService.createSubscription(userId, subscriptionPlanId, {
                source: 'purchase',
                ...options
            });
            return { success: true, subscriptionId: subscription.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createTeamLicense(userId, productId, quantity, options) {
        const { TeamLicenseService } = require('../services/TeamLicenseService');
        try {
            const license = await TeamLicenseService.createLicense(userId, productId, {
                userCount: quantity,
                ...options
            });
            return { success: true, licenseId: license.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async enrollInCertificationProgram(userId, programId, options) {
        const { CertificationService } = require('../services/CertificationService');
        try {
            const enrollment = await CertificationService.enrollUser(userId, programId, options);
            return { success: true, enrollmentId: enrollment.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    formatCurrency(amount, currency = this.config.defaultCurrency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    async handleFailedCheckout(checkoutSessionId, error) {
        try {
            const session = await this.checkoutEngine.getSession(checkoutSessionId);
            if (session && session.reservations) {
                await this.releaseInventoryReservations(session.reservations);
            }
            await this.checkoutEngine.markSessionFailed(checkoutSessionId, error);
        } catch (cleanupError) {
            console.error('Failed checkout cleanup error:', cleanupError);
        }
    }

    async sendOrderConfirmation(order) {
        const { EmailService } = require('../services/EmailService');
        try {
            await EmailService.sendOrderConfirmation(order.userId, {
                orderId: order.id,
                orderNumber: order.orderNumber,
                total: order.total,
                items: order.items,
                paymentMethod: order.paymentMethod
            });
        } catch (error) {
            console.error('Failed to send order confirmation:', error);
        }
    }

    async setupEventHandlers() {
        // Cart abandonment tracking
        this.cartManager.on('cart_abandoned', async (cartData) => {
            if (this.config.abandonedCartRecovery.enabled) {
                await this.scheduleAbandonedCartRecovery(cartData);
            }
        });

        // Order events
        this.orderManager.on('order_created', async (orderData) => {
            await this.analyticsTracker.trackEvent('order_created', orderData);
        });

        console.log('✅ Event handlers setup completed');
    }

    async scheduleAbandonedCartRecovery(cartData) {
        const { EmailService } = require('../services/EmailService');
        const delays = this.config.abandonedCartRecovery.emailDelay;

        for (let i = 0; i < Math.min(delays.length, this.config.abandonedCartRecovery.maxRecoveryAttempts); i++) {
            setTimeout(async () => {
                try {
                    await EmailService.sendAbandonedCartEmail(cartData.userId, {
                        cartId: cartData.id,
                        items: cartData.items,
                        total: cartData.total,
                        recoveryUrl: `${process.env.APP_URL}/cart/recover/${cartData.id}`,
                        attemptNumber: i + 1
                    });
                } catch (error) {
                    console.error('Abandoned cart email failed:', error);
                }
            }, delays[i] * 60 * 1000); // Convert minutes to milliseconds
        }
    }

    async shutdown() {
        console.log('🛑 Shutting down E-commerce System...');

        if (this.cartManager) await this.cartManager.shutdown();
        if (this.checkoutEngine) await this.checkoutEngine.shutdown();
        if (this.orderManager) await this.orderManager.shutdown();
        if (this.inventoryManager) await this.inventoryManager.shutdown();
        if (this.analyticsTracker) await this.analyticsTracker.shutdown();

        console.log('✅ E-commerce System shutdown completed');
    }
}

class EcommerceError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'EcommerceError';
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

module.exports = { EcommerceSystem, EcommerceError };
```

## Shopping Cart Management

### Advanced Cart Management System

```javascript
// src/ecommerce/CartManager.js
const { EventEmitter } = require('events');

class CartManager extends EventEmitter {
    constructor(config) {
        super();
        this.redis = config.redis;
        this.config = {
            expiry: config.expiry || 72 * 60 * 60 * 1000, // 72 hours
            maxItems: config.maxItems || 50,
            maxItemQuantity: config.maxItemQuantity || 10,
            persistentCart: config.persistentCart || true,
            cartValidation: config.cartValidation || true,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            autoSave: true,
            conflictResolution: 'merge' // merge, replace, reject
        };

        this.activeCarts = new Map();
        this.cartSessions = new Map();
        this.abandonmentTimers = new Map();
    }

    async initialize() {
        // Load persistent carts from Redis
        await this.loadPersistentCarts();
        
        // Setup cart cleanup job
        this.setupCleanupJob();
        
        // Setup abandonment tracking
        this.setupAbandonmentTracking();

        console.log('✅ Cart Manager initialized');
    }

    async createCart(userId, options = {}) {
        try {
            const cartId = this.generateCartId(userId);
            
            const cart = {
                id: cartId,
                userId: userId,
                sessionId: options.sessionId || this.generateSessionId(),
                items: [],
                discounts: [],
                subtotal: 0,
                discountAmount: 0,
                taxAmount: 0,
                total: 0,
                currency: options.currency || 'USD',
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.expiry),
                metadata: options.metadata || {},
                status: 'active',
                version: 1
            };

            // Store in memory for fast access
            this.activeCarts.set(cartId, cart);

            // Persist to Redis if enabled
            if (this.config.persistentCart) {
                await this.persistCart(cart);
            }

            // Track cart session
            this.cartSessions.set(cartId, {
                lastActivity: new Date(),
                sessionId: cart.sessionId
            });

            console.log(`🛒 Cart created: ${cartId} for user: ${userId}`);
            
            this.emit('cart_created', { cartId, userId, cart });
            
            return cart;

        } catch (error) {
            console.error('Cart creation failed:', error);
            throw new Error(`Failed to create cart: ${error.message}`);
        }
    }

    async getCart(userId, sessionId = null) {
        try {
            // First try to get from memory
            const cartId = this.findCartByUser(userId, sessionId);
            if (cartId && this.activeCarts.has(cartId)) {
                const cart = this.activeCarts.get(cartId);
                
                // Check if cart has expired
                if (cart.expiresAt && new Date() > cart.expiresAt) {
                    await this.expireCart(cartId);
                    return null;
                }

                // Update last activity
                this.updateCartActivity(cartId);
                return cart;
            }

            // Try to load from Redis
            if (this.config.persistentCart) {
                const persistedCart = await this.loadCartFromRedis(userId, sessionId);
                if (persistedCart) {
                    // Load into memory
                    this.activeCarts.set(persistedCart.id, persistedCart);
                    this.updateCartActivity(persistedCart.id);
                    return persistedCart;
                }
            }

            return null;

        } catch (error) {
            console.error('Get cart failed:', error);
            throw new Error(`Failed to get cart: ${error.message}`);
        }
    }

    async addItem(cartId, item) {
        try {
            const cart = await this.getCartById(cartId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            // Validate item
            await this.validateCartItem(item);

            // Check cart limits
            if (cart.items.length >= this.config.maxItems) {
                throw new Error('Maximum cart items exceeded');
            }

            // Generate item ID
            const itemId = this.generateItemId();
            const cartItem = {
                id: itemId,
                ...item,
                addedAt: new Date()
            };

            // Add item to cart
            cart.items.push(cartItem);
            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            // Cancel abandonment timer
            this.cancelAbandonmentTimer(cartId);

            this.emit('item_added', { cartId, item: cartItem, cart });

            return cart;

        } catch (error) {
            console.error('Add item failed:', error);
            throw new Error(`Failed to add item to cart: ${error.message}`);
        }
    }

    async updateItem(cartId, itemId, updates) {
        try {
            const cart = await this.getCartById(cartId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            const itemIndex = cart.items.findIndex(item => item.id === itemId);
            if (itemIndex === -1) {
                throw new Error('Cart item not found');
            }

            const currentItem = cart.items[itemIndex];

            // Validate updates
            if (updates.quantity !== undefined) {
                if (updates.quantity <= 0) {
                    // Remove item if quantity is 0 or negative
                    return await this.removeItem(cartId, itemId);
                }

                if (updates.quantity > this.config.maxItemQuantity) {
                    throw new Error('Maximum item quantity exceeded');
                }
            }

            // Apply updates
            const updatedItem = {
                ...currentItem,
                ...updates,
                updatedAt: new Date()
            };

            cart.items[itemIndex] = updatedItem;
            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            this.emit('item_updated', { cartId, itemId, updates, cart });

            return cart;

        } catch (error) {
            console.error('Update item failed:', error);
            throw new Error(`Failed to update cart item: ${error.message}`);
        }
    }

    async removeItem(cartId, itemId) {
        try {
            const cart = await this.getCartById(cartId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            const itemIndex = cart.items.findIndex(item => item.id === itemId);
            if (itemIndex === -1) {
                throw new Error('Cart item not found');
            }

            const removedItem = cart.items[itemIndex];

            // Remove item from cart
            cart.items.splice(itemIndex, 1);
            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            // Set abandonment timer if cart becomes empty
            if (cart.items.length === 0) {
                this.setAbandonmentTimer(cartId);
            }

            this.emit('item_removed', { cartId, itemId, removedItem, cart });

            return cart;

        } catch (error) {
            console.error('Remove item failed:', error);
            throw new Error(`Failed to remove cart item: ${error.message}`);
        }
    }

    async clearCart(userId) {
        try {
            const cart = await this.getCart(userId);
            if (!cart) {
                return null;
            }

            const clearedItems = [...cart.items];

            // Clear all items
            cart.items = [];
            cart.discounts = [];
            cart.subtotal = 0;
            cart.discountAmount = 0;
            cart.taxAmount = 0;
            cart.total = 0;
            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            this.emit('cart_cleared', { cartId: cart.id, userId, clearedItems });

            return cart;

        } catch (error) {
            console.error('Clear cart failed:', error);
            throw new Error(`Failed to clear cart: ${error.message}`);
        }
    }

    async applyDiscount(cartId, discount) {
        try {
            const cart = await this.getCartById(cartId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            // Check if discount already applied
            const existingDiscount = cart.discounts.find(d => d.code === discount.code);
            if (existingDiscount) {
                throw new Error('Discount already applied');
            }

            // Add discount to cart
            cart.discounts.push({
                id: this.generateItemId(),
                ...discount,
                appliedAt: new Date()
            });

            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            this.emit('discount_applied', { cartId, discount, cart });

            return cart;

        } catch (error) {
            console.error('Apply discount failed:', error);
            throw new Error(`Failed to apply discount: ${error.message}`);
        }
    }

    async removeDiscount(cartId, discountId) {
        try {
            const cart = await this.getCartById(cartId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            const discountIndex = cart.discounts.findIndex(d => d.id === discountId);
            if (discountIndex === -1) {
                throw new Error('Discount not found');
            }

            const removedDiscount = cart.discounts[discountIndex];

            // Remove discount from cart
            cart.discounts.splice(discountIndex, 1);
            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            this.emit('discount_removed', { cartId, discountId, removedDiscount, cart });

            return cart;

        } catch (error) {
            console.error('Remove discount failed:', error);
            throw new Error(`Failed to remove discount: ${error.message}`);
        }
    }

    async updateCalculation(cartId, calculation) {
        try {
            const cart = await this.getCartById(cartId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            // Update cart with calculation results
            cart.items = calculation.items;
            cart.subtotal = calculation.subtotal;
            cart.discountAmount = calculation.discountAmount;
            cart.taxAmount = calculation.taxAmount;
            cart.total = calculation.total;
            cart.appliedDiscounts = calculation.appliedDiscounts;
            cart.calculatedAt = calculation.calculatedAt;
            cart.updatedAt = new Date();
            cart.version++;

            // Update cart in memory and storage
            await this.updateCart(cart);

            this.emit('calculation_updated', { cartId, calculation, cart });

            return cart;

        } catch (error) {
            console.error('Update calculation failed:', error);
            throw new Error(`Failed to update cart calculation: ${error.message}`);
        }
    }

    // Cart merging for user login
    async mergeCarts(guestCartId, userCartId) {
        try {
            const guestCart = await this.getCartById(guestCartId);
            const userCart = await this.getCartById(userCartId);

            if (!guestCart) {
                return userCart;
            }

            if (!userCart) {
                // Convert guest cart to user cart
                guestCart.userId = userCart?.userId || guestCart.userId;
                return await this.updateCart(guestCart);
            }

            // Merge strategy based on configuration
            let mergedCart;
            switch (this.config.conflictResolution) {
                case 'merge':
                    mergedCart = await this.performCartMerge(guestCart, userCart);
                    break;
                case 'replace':
                    mergedCart = guestCart;
                    mergedCart.userId = userCart.userId;
                    break;
                case 'reject':
                default:
                    mergedCart = userCart;
                    break;
            }

            // Clean up old carts
            await this.deleteCart(guestCartId);
            if (mergedCart.id !== userCartId) {
                await this.deleteCart(userCartId);
            }

            await this.updateCart(mergedCart);

            this.emit('carts_merged', { 
                guestCartId, 
                userCartId, 
                mergedCartId: mergedCart.id,
                strategy: this.config.conflictResolution
            });

            return mergedCart;

        } catch (error) {
            console.error('Cart merge failed:', error);
            throw new Error(`Failed to merge carts: ${error.message}`);
        }
    }

    async performCartMerge(guestCart, userCart) {
        const mergedCart = { ...userCart };
        const mergedItems = [...userCart.items];

        // Merge items from guest cart
        for (const guestItem of guestCart.items) {
            const existingItemIndex = mergedItems.findIndex(item =>
                item.productId === guestItem.productId &&
                JSON.stringify(item.options) === JSON.stringify(guestItem.options)
            );

            if (existingItemIndex >= 0) {
                // Update quantity for existing item
                const existingItem = mergedItems[existingItemIndex];
                const newQuantity = Math.min(
                    existingItem.quantity + guestItem.quantity,
                    this.config.maxItemQuantity
                );
                mergedItems[existingItemIndex] = {
                    ...existingItem,
                    quantity: newQuantity,
                    updatedAt: new Date()
                };
            } else {
                // Add new item if within limits
                if (mergedItems.length < this.config.maxItems) {
                    mergedItems.push({
                        ...guestItem,
                        id: this.generateItemId()
                    });
                }
            }
        }

        // Merge discounts (avoid duplicates)
        const mergedDiscounts = [...userCart.discounts];
        for (const guestDiscount of guestCart.discounts) {
            const existingDiscount = mergedDiscounts.find(d => d.code === guestDiscount.code);
            if (!existingDiscount) {
                mergedDiscounts.push({
                    ...guestDiscount,
                    id: this.generateItemId()
                });
            }
        }

        mergedCart.items = mergedItems;
        mergedCart.discounts = mergedDiscounts;
        mergedCart.updatedAt = new Date();
        mergedCart.version++;

        return mergedCart;
    }

    // Cart abandonment tracking
    setupAbandonmentTracking() {
        this.abandonmentCheckInterval = setInterval(() => {
            this.checkAbandonedCarts();
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    async checkAbandonedCarts() {
        const now = new Date();
        const abandonmentThreshold = new Date(now.getTime() - this.config.sessionTimeout);

        for (const [cartId, session] of this.cartSessions) {
            if (session.lastActivity < abandonmentThreshold) {
                const cart = this.activeCarts.get(cartId);
                if (cart && cart.items.length > 0 && cart.status === 'active') {
                    await this.markCartAbandoned(cartId);
                }
            }
        }
    }

    async markCartAbandoned(cartId) {
        try {
            const cart = this.activeCarts.get(cartId);
            if (!cart) return;

            cart.status = 'abandoned';
            cart.abandonedAt = new Date();

            await this.updateCart(cart);

            this.emit('cart_abandoned', {
                cartId,
                userId: cart.userId,
                cart,
                abandonedAt: cart.abandonedAt
            });

            console.log(`🕐 Cart abandoned: ${cartId}`);

        } catch (error) {
            console.error('Mark cart abandoned failed:', error);
        }
    }

    setAbandonmentTimer(cartId) {
        // Clear existing timer
        this.cancelAbandonmentTimer(cartId);

        // Set new timer
        const timer = setTimeout(() => {
            this.markCartAbandoned(cartId);
        }, this.config.sessionTimeout);

        this.abandonmentTimers.set(cartId, timer);
    }

    cancelAbandonmentTimer(cartId) {
        const timer = this.abandonmentTimers.get(cartId);
        if (timer) {
            clearTimeout(timer);
            this.abandonmentTimers.delete(cartId);
        }
    }

    updateCartActivity(cartId) {
        const session = this.cartSessions.get(cartId);
        if (session) {
            session.lastActivity = new Date();
        }
    }

    // Utility methods
    async getCartById(cartId) {
        if (this.activeCarts.has(cartId)) {
            return this.activeCarts.get(cartId);
        }

        if (this.config.persistentCart) {
            const cart = await this.loadCartByIdFromRedis(cartId);
            if (cart) {
                this.activeCarts.set(cartId, cart);
                return cart;
            }
        }

        return null;
    }

    findCartByUser(userId, sessionId = null) {
        for (const [cartId, cart] of this.activeCarts) {
            if (cart.userId === userId) {
                if (!sessionId || cart.sessionId === sessionId) {
                    return cartId;
                }
            }
        }
        return null;
    }

    async updateCart(cart) {
        this.activeCarts.set(cart.id, cart);
        this.updateCartActivity(cart.id);

        if (this.config.persistentCart) {
            await this.persistCart(cart);
        }
    }

    async validateCartItem(item) {
        const required = ['productId', 'productType', 'name', 'quantity', 'unitPrice'];
        const missing = required.filter(field => item[field] === undefined);

        if (missing.length > 0) {
            throw new Error(`Missing required item fields: ${missing.join(', ')}`);
        }

        if (item.quantity <= 0) {
            throw new Error('Item quantity must be greater than 0');
        }

        if (item.quantity > this.config.maxItemQuantity) {
            throw new Error('Item quantity exceeds maximum allowed');
        }

        if (item.unitPrice < 0) {
            throw new Error('Item price cannot be negative');
        }
    }

    generateCartId(userId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `cart_${userId}_${timestamp}_${random}`;
    }

    generateItemId() {
        return `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }

    // Redis persistence methods
    async persistCart(cart) {
        const key = `cart:${cart.id}`;
        const userKey = `user_cart:${cart.userId}`;
        const sessionKey = `session_cart:${cart.sessionId}`;

        try {
            await this.redis.setex(key, this.config.expiry / 1000, JSON.stringify(cart));
            await this.redis.setex(userKey, this.config.expiry / 1000, cart.id);
            await this.redis.setex(sessionKey, this.config.expiry / 1000, cart.id);
        } catch (error) {
            console.error('Cart persistence failed:', error);
        }
    }

    async loadCartFromRedis(userId, sessionId = null) {
        try {
            let cartId = null;

            // Try to find by user ID first
            const userCartId = await this.redis.get(`user_cart:${userId}`);
            if (userCartId) {
                cartId = userCartId;
            }

            // Try by session ID if provided
            if (!cartId && sessionId) {
                const sessionCartId = await this.redis.get(`session_cart:${sessionId}`);
                if (sessionCartId) {
                    cartId = sessionCartId;
                }
            }

            if (!cartId) return null;

            return await this.loadCartByIdFromRedis(cartId);

        } catch (error) {
            console.error('Load cart from Redis failed:', error);
            return null;
        }
    }

    async loadCartByIdFromRedis(cartId) {
        try {
            const cartData = await this.redis.get(`cart:${cartId}`);
            if (!cartData) return null;

            const cart = JSON.parse(cartData);
            
            // Convert date strings back to Date objects
            cart.createdAt = new Date(cart.createdAt);
            cart.updatedAt = new Date(cart.updatedAt);
            cart.expiresAt = cart.expiresAt ? new Date(cart.expiresAt) : null;
            cart.abandonedAt = cart.abandonedAt ? new Date(cart.abandonedAt) : null;

            cart.items.forEach(item => {
                item.addedAt = new Date(item.addedAt);
                if (item.updatedAt) item.updatedAt = new Date(item.updatedAt);
            });

            cart.discounts.forEach(discount => {
                discount.appliedAt = new Date(discount.appliedAt);
            });

            return cart;

        } catch (error) {
            console.error('Load cart by ID from Redis failed:', error);
            return null;
        }
    }

    async loadPersistentCarts() {
        // Implementation would load active carts from Redis on startup
        console.log('✅ Persistent carts loaded');
    }

    async deleteCart(cartId) {
        try {
            const cart = this.activeCarts.get(cartId);
            
            // Remove from memory
            this.activeCarts.delete(cartId);
            this.cartSessions.delete(cartId);
            this.cancelAbandonmentTimer(cartId);

            // Remove from Redis
            if (this.config.persistentCart && cart) {
                await this.redis.del(`cart:${cartId}`);
                await this.redis.del(`user_cart:${cart.userId}`);
                await this.redis.del(`session_cart:${cart.sessionId}`);
            }

        } catch (error) {
            console.error('Delete cart failed:', error);
        }
    }

    async expireCart(cartId) {
        try {
            const cart = this.activeCarts.get(cartId);
            if (cart) {
                cart.status = 'expired';
                cart.expiredAt = new Date();
                
                this.emit('cart_expired', {
                    cartId,
                    userId: cart.userId,
                    cart,
                    expiredAt: cart.expiredAt
                });
            }

            await this.deleteCart(cartId);
            console.log(`⏰ Cart expired: ${cartId}`);

        } catch (error) {
            console.error('Expire cart failed:', error);
        }
    }

    setupCleanupJob() {
        // Run cleanup every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredCarts();
        }, 60 * 60 * 1000);
    }

    async cleanupExpiredCarts() {
        const now = new Date();
        const expiredCarts = [];

        for (const [cartId, cart] of this.activeCarts) {
            if (cart.expiresAt && now > cart.expiresAt) {
                expiredCarts.push(cartId);
            }
        }

        for (const cartId of expiredCarts) {
            await this.expireCart(cartId);
        }

        if (expiredCarts.length > 0) {
            console.log(`🧹 Cleaned up ${expiredCarts.length} expired carts`);
        }
    }

    async shutdown() {
        // Clear intervals
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        if (this.abandonmentCheckInterval) clearInterval(this.abandonmentCheckInterval);

        // Clear all timers
        for (const timer of this.abandonmentTimers.values()) {
            clearTimeout(timer);
        }
        this.abandonmentTimers.clear();

        // Clear memory
        this.activeCarts.clear();
        this.cartSessions.clear();

        console.log('✅ Cart Manager shutdown completed');
    }
}

module.exports = CartManager;
```

This comprehensive e-commerce cart and checkout system provides enterprise-grade shopping capabilities for the 7P Education Platform. The system handles complex educational commerce scenarios including course bundles, subscription combinations, team enrollments, and flexible pricing models while maintaining security, performance, and user experience standards.

The system continues with checkout process engineering, product catalog integration, order management, and comprehensive analytics capabilities in the following sections.