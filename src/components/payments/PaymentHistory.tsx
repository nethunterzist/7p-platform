"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAmount } from '@/lib/stripe';
import { format } from 'date-fns';
import type { PaymentTransaction } from '@/lib/payments';

export default function PaymentHistory() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      succeeded: { label: 'Completed', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      canceled: { label: 'Canceled', color: 'bg-gray-100 text-gray-800' },
      refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      course_purchase: 'Course Purchase',
      bundle_purchase: 'Bundle Purchase',
      subscription: 'Subscription',
      subscription_renewal: 'Subscription Renewal',
    };

    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const downloadInvoice = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/payments/invoice/${transactionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${transactionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading payment history...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={fetchPaymentHistory} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
        <Button onClick={fetchPaymentHistory} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h4>
          <p className="text-gray-600">Your payment history will appear here after you make a purchase.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {transaction.description || getTypeLabel(transaction.type)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {format(new Date(transaction.created_at), 'PPP')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </div>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    Type: {getTypeLabel(transaction.type)}
                  </span>
                  {transaction.stripe_payment_intent_id && (
                    <span className="text-gray-600">
                      <span className="text-gray-600">
                    ID: {transaction.stripe_payment_intent_id.substring(0, 16)}...
                  </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {transaction.status === 'succeeded' && (
                    <Button
                      onClick={() => downloadInvoice(transaction.id)}
                      variant="outline"
                      size="sm"
                    >
                      Download Invoice
                    </Button>
                  )}
                  
                  {transaction.failure_reason && (
                    <span className="text-red-600 text-xs">
                      {transaction.failure_reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}