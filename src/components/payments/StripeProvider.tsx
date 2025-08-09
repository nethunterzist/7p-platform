"use client";

import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
  options?: any;
}

export default function StripeProvider({ 
  children, 
  clientSecret, 
  options = {} 
}: StripeProviderProps) {
  const stripePromise = getStripe();

  const defaultOptions = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px',
      },
      rules: {
        '.Tab': {
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
        },
        '.Tab--selected': {
          borderColor: '#2563eb',
          backgroundColor: '#f8fafc',
        },
        '.Input': {
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          padding: '12px',
          fontSize: '14px',
        },
        '.Input:focus': {
          borderColor: '#2563eb',
          boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)',
        },
        '.Label': {
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
        },
      },
    },
    loader: 'auto' as const,
    ...options,
  };

  // If clientSecret is provided, include it in options
  const elementsOptions = clientSecret 
    ? { clientSecret, ...defaultOptions }
    : defaultOptions;

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {children}
    </Elements>
  );
}