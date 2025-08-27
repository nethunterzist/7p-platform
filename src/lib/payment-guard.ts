import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_ENABLED } from '@/lib/env';
import { getSecurityHeaders } from '@/lib/security';

/**
 * 7P Education - Payment Guard Middleware
 * 
 * Guards payment-related routes when payments are disabled
 * Returns 501 Not Implemented when PAYMENTS_MODE !== 'stripe'
 */

interface PaymentDisabledResponse {
  success: false;
  message: 'payments_disabled';
  error: string;
  mode: string;
}

/**
 * Create a standardized response when payments are disabled
 */
export function createPaymentDisabledResponse(): NextResponse<PaymentDisabledResponse> {
  return NextResponse.json(
    {
      success: false,
      message: 'payments_disabled',
      error: 'Payment processing is currently disabled. Contact support for assistance.',
      mode: 'disabled',
    },
    {
      status: 501,
      headers: getSecurityHeaders(),
    }
  );
}

/**
 * Middleware wrapper that guards payment routes
 * @param handler The original route handler
 * @returns Guarded route handler
 */
export function withPaymentGuard<T = any>(
  handler: (request: NextRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    // Check if payments are enabled
    if (!STRIPE_ENABLED) {
      return createPaymentDisabledResponse();
    }

    // Payments are enabled, proceed with original handler
    return handler(request, context);
  };
}

/**
 * Check if payments are enabled (for use in components)
 * @returns boolean indicating if payments are enabled
 */
export function isPaymentsEnabled(): boolean {
  return STRIPE_ENABLED;
}

/**
 * Get payment mode information (for debugging/monitoring)
 */
export function getPaymentModeInfo() {
  return {
    enabled: STRIPE_ENABLED,
    mode: STRIPE_ENABLED ? 'stripe' : 'disabled',
    timestamp: new Date().toISOString(),
  };
}