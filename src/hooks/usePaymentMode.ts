"use client";

import { useState, useEffect } from 'react';

interface PaymentModeInfo {
  paymentsEnabled: boolean;
  mode: 'stripe' | 'disabled';
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check if payments are enabled
 * @returns PaymentModeInfo object with payment status
 */
export function usePaymentMode(): PaymentModeInfo {
  const [paymentMode, setPaymentMode] = useState<PaymentModeInfo>({
    paymentsEnabled: false,
    mode: 'disabled',
    loading: true,
    error: null
  });

  useEffect(() => {
    // Check payment mode from environment or API
    const checkPaymentMode = async () => {
      try {
        // Option 1: Check via health endpoint (recommended)
        const response = await fetch('/api/health');
        const healthData = await response.json();
        
        const stripeEnabled = healthData.checks?.stripe !== null;
        
        setPaymentMode({
          paymentsEnabled: stripeEnabled,
          mode: stripeEnabled ? 'stripe' : 'disabled',
          loading: false,
          error: null
        });
      } catch (error) {
        // Option 2: Fallback - assume payments disabled if health check fails
        console.warn('Failed to check payment mode, defaulting to disabled:', error);
        setPaymentMode({
          paymentsEnabled: false,
          mode: 'disabled',
          loading: false,
          error: 'Failed to check payment status'
        });
      }
    };

    checkPaymentMode();
  }, []);

  return paymentMode;
}

/**
 * Simple hook to check if payments are enabled (without loading state)
 * @returns boolean indicating if payments are enabled
 */
export function usePaymentsEnabled(): boolean {
  const { paymentsEnabled } = usePaymentMode();
  return paymentsEnabled;
}

export default usePaymentMode;