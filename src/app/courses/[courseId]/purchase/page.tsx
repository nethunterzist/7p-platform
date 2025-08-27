"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import StripeProvider from '@/components/payments/StripeProvider';
import PaymentForm from '@/components/payments/PaymentForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatAmount } from '@/lib/stripe';
import { usePaymentMode } from '@/hooks/usePaymentMode';

interface Course {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
}

interface CoursePrice {
  id: string;
  course_id: string;
  stripe_price_id: string;
  price_amount: number;
  currency: string;
  is_active: boolean;
}

export default function CoursePurchasePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [coursePrice, setCoursePrice] = useState<CoursePrice | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const { paymentsEnabled } = usePaymentMode();

  useEffect(() => {
    checkAuthAndLoadData();
  }, [courseId]);

  useEffect(() => {
    // Redirect to course page if payments are disabled
    if (!paymentsEnabled && courseId) {
      router.push(`/courses/${courseId}?payments=disabled`);
    }
  }, [paymentsEnabled, courseId, router]);

  const checkAuthAndLoadData = async () => {
    try {
      // Always load course data first (public access)
      await Promise.all([
        loadCourse(),
        loadCoursePrice()
      ]);

      // Check for authentication (optional for viewing, required for purchasing)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && user) {
        setUser(user);
        await checkCourseAccess(user.id);
      }
      // If no user, they can still view the purchase page but will need to login to buy
      
    } catch (err: any) {
      setError(err.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const loadCourse = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error('Course not found');
    }

    setCourse(data);
  };

  const loadCoursePrice = async () => {
    const { data, error } = await supabase
      .from('course_prices')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error('Course pricing not available');
    }

    setCoursePrice(data);
  };

  const checkCourseAccess = async (userId: string) => {
    const { data, error } = await supabase
      .rpc('user_has_course_access', {
        user_uuid: userId,
        course_uuid: courseId,
      });

    if (!error && data === true) {
      setHasAccess(true);
    }
  };

  const createPaymentIntent = async () => {
    // Check authentication before creating payment intent
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setError('');
      
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setTransactionId(data.transactionId);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    }
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    // Redirect to course with success message
    router.push(`/courses/${courseId}?purchase=success`);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  const handleCheckoutRedirect = async () => {
    // Check authentication before proceeding to checkout
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'course',
          courseId,
          successUrl: `${window.location.origin}/courses/${courseId}?purchase=success`,
          cancelUrl: `${window.location.origin}/courses/${courseId}/purchase?canceled=true`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to redirect to checkout');
    }
  };

  // Remove the blocking for non-authenticated users - they can view the page

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading course...</span>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Already Purchased</h2>
            <p className="text-gray-600 mb-6">You already have access to this course.</p>
            <Button onClick={() => router.push(`/courses/${courseId}`)}>
              Go to Course
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!course || !coursePrice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Not Available</h2>
            <p className="text-gray-600 mb-6">{error || 'This course is not available for purchase.'}</p>
            <Button onClick={() => router.push('/courses')}>
              Browse Courses
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => router.push(`/courses/${courseId}`)} 
            variant="outline"
            className="mb-4"
          >
            ← Back to Course
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Course</h1>
          <p className="text-gray-600">Complete your purchase to get lifetime access</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Course Information */}
          <div>
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Details</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {course.name}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {course.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lifetime access to all course content
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  All future updates included
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Certificate of completion
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  30-day money-back guarantee
                </div>
              </div>
            </Card>

            {/* Pricing Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatAmount(coursePrice.price_amount, coursePrice.currency as any)}
              </div>
              <p className="text-gray-600 text-sm mb-4">One-time payment • Lifetime access</p>
              
              <Badge className="bg-blue-100 text-blue-800">
                30-day money-back guarantee
              </Badge>
            </Card>
          </div>

          {/* Payment Section */}
          <div>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Payment Options */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose Payment Method
              </h3>

              <div className="space-y-4">
                {!user && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <span className="font-medium">Sign in required:</span> Please sign in to purchase this course.
                    </p>
                    <Button 
                      onClick={() => router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))}
                      className="mt-3 w-full"
                      size="sm"
                    >
                      Sign In to Purchase
                    </Button>
                  </div>
                )}
                
                {/* Stripe Checkout (Recommended) */}
                <Button
                  onClick={handleCheckoutRedirect}
                  className="w-full justify-between"
                  size="lg"
                  disabled={!user}
                >
                  <span>Pay with Stripe Checkout</span>
                  <Badge variant="outline">Recommended</Badge>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                {/* Custom Payment Form */}
                <Button
                  onClick={createPaymentIntent}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={!!clientSecret || !user}
                >
                  {clientSecret ? 'Payment Form Ready' : 'Use Custom Payment Form'}
                </Button>
              </div>
            </Card>

            {/* Custom Payment Form */}
            {clientSecret && (
              <StripeProvider clientSecret={clientSecret}>
                <PaymentForm
                  clientSecret={clientSecret}
                  amount={coursePrice.price_amount}
                  currency={coursePrice.currency as any}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  returnUrl={`${window.location.origin}/courses/${courseId}?purchase=success`}
                />
              </StripeProvider>
            )}

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure payment processing by Stripe. Your payment information is encrypted and secure.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}