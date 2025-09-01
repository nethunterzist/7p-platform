"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { paymentService } from '@/lib/payments';
import { format } from 'date-fns';

interface PaymentTransaction {
  id: number;
  user_id: number;
  course_id: number;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  course_title?: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
}

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Check if user is admin (mock for now)
      const token = document.cookie.split(';').find(cookie => cookie.trim().startsWith('access_token='));
      if (token) {
        setIsAdmin(true);
        await loadPaymentData();
      } else {
        setError('Admin access required');
      }
    } catch (err) {
      setError('Failed to verify admin access');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentData = async () => {
    try {
      // Mock payment data for demonstration
      const mockStats: PaymentStats = {
        totalRevenue: 15750.00,
        totalTransactions: 67,
        successfulPayments: 64,
        failedPayments: 3
      };

      const mockTransactions: PaymentTransaction[] = [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          transaction_id: 'txn_1234567890',
          amount: 299.99,
          currency: 'TRY',
          status: 'completed',
          payment_method: 'local_payment',
          created_at: new Date().toISOString(),
          course_title: 'React Masterclass'
        },
        {
          id: 2,
          user_id: 2,
          course_id: 2,
          transaction_id: 'txn_0987654321',
          amount: 199.99,
          currency: 'TRY',
          status: 'completed',
          payment_method: 'local_payment',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          course_title: 'JavaScript Fundamentals'
        }
      ];

      setStats(mockStats);
      setTransactions(mockTransactions);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading payment data...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.href = '/admin'}>
              Go to Admin
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-2">Track and manage all payment transactions</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue, 'TRY')}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successfulPayments}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-4">
            {['all', 'completed', 'pending', 'failed'].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.course_title || 'Unknown Course'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadgeColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}