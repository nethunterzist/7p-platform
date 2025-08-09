"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PricingCard from '@/components/payments/PricingCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan, UserSubscription } from '@/lib/payments';

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        router.push('/login');
        return;
      }

      setUser(user);
      await Promise.all([loadSubscriptionPlans(), loadCurrentSubscription()]);
    } catch (err: any) {
      setError(err.message || 'Fiyatlandırma verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    const response = await fetch('/api/payments/subscriptions');
    if (!response.ok) {
      throw new Error('Abonelik planları yüklenemedi');
    }
    const data = await response.json();
    setPlans(data.plans || []);
  };

  const loadCurrentSubscription = async () => {
    const response = await fetch('/api/payments/subscriptions');
    if (!response.ok) {
      throw new Error('Mevcut abonelik yüklenemedi');
    }
    const data = await response.json();
    setCurrentSubscription(data.subscription);
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'subscription',
          planId,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      setError('Abonelik işlemi başlatılamadı');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/payments/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      setError('Müşteri portalı açılamadı');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Kimlik Doğrulama Gerekli</h2>
          <p className="text-gray-600 mb-6">Fiyatlandırma seçeneklerini görüntülemek için lütfen giriş yapın.</p>
          <Button onClick={() => router.push('/login')}>
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Fiyatlandırma yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Öğrenme Planınızı Seçin
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tüm kurslara sınırsız erişim, her ay yeni içerik ve öncelikli destek alın. 
              Ücretsiz deneme ile başlayın ve istediğiniz zaman iptal edin.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Current Subscription Status */}
        {currentSubscription && (
          <Card className="mb-8 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Mevcut Abonelik
                </h3>
                <p className="text-gray-600">
                  Durum: <span className="font-medium capitalize">{currentSubscription.status}</span>
                </p>
                <p className="text-gray-600">
                  Mevcut dönem bitiyor: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                </p>
                {currentSubscription.cancel_at_period_end && (
                  <p className="text-orange-600 font-medium">
                    Abonelik mevcut dönem sonunda iptal edilecek
                  </p>
                )}
              </div>
              <Button onClick={handleManageSubscription} variant="outline">
                Aboneliği Yönet
              </Button>
            </div>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              type="subscription"
              data={plan}
              isPopular={index === 1} // Make the second plan popular
              isOwned={currentSubscription?.status === 'active'}
              onPurchase={handleSubscribe}
            />
          ))}
        </div>

        {/* Features Comparison */}
        <Card className="p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            What's Included
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">All Courses</h4>
              <p className="text-gray-600">
                Access to our complete library of courses with new content added regularly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Certificates</h4>
              <p className="text-gray-600">
                Earn certificates of completion for every course you finish.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Priority Support</h4>
              <p className="text-gray-600">
                Get help when you need it with priority email and chat support.
              </p>
            </div>
          </div>
        </Card>

        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                until the end of your current billing period.
              </p>
            </Card>

            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                What's included in the free trial?
              </h4>
              <p className="text-gray-600">
                The free trial gives you full access to all courses and features. 
                No credit card required for the trial period.
              </p>
            </Card>

            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee. If you're not satisfied, 
                contact support for a full refund.
              </p>
            </Card>

            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Can I purchase individual courses?
              </h4>
              <p className="text-gray-600">
                Yes, you can purchase individual courses for lifetime access. 
                Visit any course page to see pricing options.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-blue-50">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Start Learning?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of students who are already learning with 7P Education.
            </p>
            <Button
              onClick={() => router.push('/courses')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Tüm Kurslara Göz Atın
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}