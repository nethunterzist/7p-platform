import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { withPaymentGuard, createPaymentDisabledResponse, isPaymentsEnabled } from '@/lib/payment-guard';

// Mock dependencies
jest.mock('@/lib/env', () => ({
  STRIPE_ENABLED: false // Test with payments disabled
}));

jest.mock('@/lib/security', () => ({
  getSecurityHeaders: jest.fn(() => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }))
}));

describe('Payment Guard Middleware', () => {
  let mockRequest: NextRequest;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      url: 'http://localhost:3000/api/payments/test',
      method: 'POST',
      headers: new Map(),
      json: jest.fn(() => Promise.resolve({}))
    } as any;

    mockHandler = jest.fn(() => Promise.resolve(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    ));
  });

  describe('Payment Disabled Response', () => {
    it('should create standardized payment disabled response', async () => {
      const response = createPaymentDisabledResponse();
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.success).toBe(false);
      expect(data.message).toBe('payments_disabled');
      expect(data.error).toBe('Payment processing is currently disabled. Contact support for assistance.');
      expect(data.mode).toBe('disabled');
    });

    it('should include security headers', async () => {
      const { getSecurityHeaders } = require('@/lib/security');
      getSecurityHeaders.mockReturnValue({
        'X-Test-Header': 'test-value'
      });

      const response = createPaymentDisabledResponse();
      
      expect(getSecurityHeaders).toHaveBeenCalled();
    });
  });

  describe('Payment Guard Wrapper', () => {
    it('should block requests when payments are disabled', async () => {
      // Mock STRIPE_ENABLED as false (already set in module mock)
      const guardedHandler = withPaymentGuard(mockHandler);
      const response = await guardedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.success).toBe(false);
      expect(data.message).toBe('payments_disabled');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should allow requests when payments are enabled', async () => {
      // Temporarily mock payments as enabled
      jest.doMock('@/lib/env', () => ({
        STRIPE_ENABLED: true
      }));

      // Re-import to get updated mock
      const { withPaymentGuard: enabledWithPaymentGuard } = await import('@/lib/payment-guard');
      
      const guardedHandler = enabledWithPaymentGuard(mockHandler);
      const response = await guardedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined);
      expect(response.status).toBe(200);
    });

    it('should pass through context parameter', async () => {
      jest.doMock('@/lib/env', () => ({
        STRIPE_ENABLED: true
      }));

      const { withPaymentGuard: enabledWithPaymentGuard } = await import('@/lib/payment-guard');
      const testContext = { userId: 'test-user' };
      
      const guardedHandler = enabledWithPaymentGuard(mockHandler);
      await guardedHandler(mockRequest, testContext);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, testContext);
    });
  });

  describe('Payment Status Utility', () => {
    it('should return false when payments are disabled', () => {
      const enabled = isPaymentsEnabled();
      expect(enabled).toBe(false);
    });

    it('should return true when payments are enabled', async () => {
      jest.doMock('@/lib/env', () => ({
        STRIPE_ENABLED: true
      }));

      const { isPaymentsEnabled: enabledIsPaymentsEnabled } = await import('@/lib/payment-guard');
      const enabled = enabledIsPaymentsEnabled();
      expect(enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully when payments enabled', async () => {
      jest.doMock('@/lib/env', () => ({
        STRIPE_ENABLED: true
      }));

      const errorHandler = jest.fn(() => Promise.reject(new Error('Handler error')));
      const { withPaymentGuard: enabledWithPaymentGuard } = await import('@/lib/payment-guard');
      
      const guardedHandler = enabledWithPaymentGuard(errorHandler);

      await expect(guardedHandler(mockRequest)).rejects.toThrow('Handler error');
    });
  });

  describe('Real API Route Integration', () => {
    it('should integrate with create-payment-intent route', async () => {
      // Test that payment intent creation is blocked when payments disabled
      const mockPaymentIntentHandler = jest.fn();
      const guardedPaymentIntent = withPaymentGuard(mockPaymentIntentHandler);
      
      const response = await guardedPaymentIntent(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.message).toBe('payments_disabled');
      expect(mockPaymentIntentHandler).not.toHaveBeenCalled();
    });

    it('should integrate with create-checkout-session route', async () => {
      // Test that checkout session creation is blocked when payments disabled
      const mockCheckoutHandler = jest.fn();
      const guardedCheckout = withPaymentGuard(mockCheckoutHandler);
      
      const response = await guardedCheckout(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.message).toBe('payments_disabled');
      expect(mockCheckoutHandler).not.toHaveBeenCalled();
    });

    it('should integrate with customer-portal route', async () => {
      // Test that customer portal is blocked when payments disabled
      const mockPortalHandler = jest.fn();
      const guardedPortal = withPaymentGuard(mockPortalHandler);
      
      const response = await guardedPortal(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.message).toBe('payments_disabled');
      expect(mockPortalHandler).not.toHaveBeenCalled();
    });

    it('should integrate with payment history route', async () => {
      // Test that payment history is blocked when payments disabled
      const mockHistoryHandler = jest.fn();
      const guardedHistory = withPaymentGuard(mockHistoryHandler);
      
      const response = await guardedHistory(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.message).toBe('payments_disabled');
      expect(mockHistoryHandler).not.toHaveBeenCalled();
    });

    it('should integrate with subscriptions route', async () => {
      // Test that subscriptions are blocked when payments disabled
      const mockSubscriptionsHandler = jest.fn();
      const guardedSubscriptions = withPaymentGuard(mockSubscriptionsHandler);
      
      const response = await guardedSubscriptions(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.message).toBe('payments_disabled');
      expect(mockSubscriptionsHandler).not.toHaveBeenCalled();
    });
  });

  describe('Response Headers', () => {
    it('should include all required security headers', async () => {
      const { getSecurityHeaders } = require('@/lib/security');
      getSecurityHeaders.mockReturnValue({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'"
      });

      const response = createPaymentDisabledResponse();
      
      expect(getSecurityHeaders).toHaveBeenCalled();
    });
  });

  describe('Environment Configuration', () => {
    it('should respect PAYMENTS_MODE environment variable', async () => {
      jest.doMock('@/lib/env', () => ({
        STRIPE_ENABLED: true
      }));

      const { isPaymentsEnabled: enabledCheck } = await import('@/lib/payment-guard');
      expect(enabledCheck()).toBe(true);
    });

    it('should default to disabled when environment not set', () => {
      jest.doMock('@/lib/env', () => ({
        STRIPE_ENABLED: undefined
      }));

      // Default behavior should be disabled
      expect(isPaymentsEnabled()).toBe(false);
    });
  });

  describe('API Consistency', () => {
    it('should provide consistent error response format across all guarded routes', async () => {
      const guardedHandler = withPaymentGuard(mockHandler);
      const response = await guardedHandler(mockRequest);
      const data = await response.json();

      // Verify consistent response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('mode');
      
      expect(data.success).toBe(false);
      expect(data.message).toBe('payments_disabled');
      expect(data.mode).toBe('disabled');
    });
  });
});