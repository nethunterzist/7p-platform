"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { paymentService } from '@/lib/payments';

interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  is_active: boolean;
}

export default function CoursePurchasePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = parseInt(params.courseId as string);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      // Mock course data for now
      const mockCourse: Course = {
        id: courseId,
        title: "React & Next.js Masterclass",
        description: "Comprehensive React and Next.js course for modern web development",
        price: 299.99,
        currency: "TRY",
        is_active: true
      };
      
      setCourse(mockCourse);
      
      // Check if user is logged in
      const token = document.cookie.split(';').find(cookie => cookie.trim().startsWith('access_token='));
      if (token) {
        // Mock user data
        setUser({ id: 1, email: 'user@example.com' });
        
        // Check course access
        const hasAccess = await paymentService.checkCourseAccess(1, courseId);
        setHasAccess(hasAccess);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!course) return;

    setProcessing(true);
    setError('');

    try {
      const result = await paymentService.processPayment({
        courseId: course.id,
        userId: user.id,
        amount: course.price,
        currency: course.currency,
        paymentMethod: 'local_payment'
      });

      if (result.success) {
        router.push(`/courses/${courseId}?purchase=success`);
      } else {
        setError(result.error || 'Payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

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

  if (!course) {
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
                {course.title}
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
              </div>
            </Card>

            {/* Pricing Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">
                ₺{course.price.toFixed(2)}
              </div>
              <p className="text-gray-600 text-sm mb-4">One-time payment • Lifetime access</p>
              
              <Badge className="bg-blue-100 text-blue-800">
                Local payment processing
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

            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Complete Purchase
              </h3>

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

              <Button
                onClick={handlePurchase}
                className="w-full"
                size="lg"
                disabled={!user || processing}
              >
                {processing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Purchase for ₺${course.price.toFixed(2)}`
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By purchasing, you agree to our terms of service
              </p>
            </Card>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure local payment processing. Your data is safe and encrypted.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}