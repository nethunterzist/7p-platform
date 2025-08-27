"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatAmount } from '@/lib/stripe';
import type { SubscriptionPlan, CoursePrice, CourseBundle } from '@/lib/payments';

interface PricingCardProps {
  type: 'subscription' | 'course' | 'bundle';
  data: SubscriptionPlan | CoursePrice | CourseBundle;
  isPopular?: boolean;
  isOwned?: boolean;
  onPurchase: (id: string) => Promise<void>;
  courseName?: string;
}

export default function PricingCard({
  type,
  data,
  isPopular = false,
  isOwned = false,
  onPurchase,
  courseName,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (isOwned) return;
    
    setIsLoading(true);
    try {
      await onPurchase(data.id);
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSubscriptionCard = (plan: SubscriptionPlan) => (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
          {isPopular && (
            <Badge className="bg-blue-100 text-blue-800">En Popüler</Badge>
          )}
        </div>
        
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">
            {formatAmount(plan.price_amount, plan.currency)}
          </span>
          <span className="text-gray-600 ml-2">
            /{plan.billing_interval}
          </span>
        </div>

        {plan.description && (
          <p className="text-gray-600 mb-6">{plan.description}</p>
        )}

        {plan.trial_period_days > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <p className="text-green-800 text-sm font-medium">
              {plan.trial_period_days} gün ücretsiz deneme dahil
            </p>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Tüm kurslara erişim
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Her ay yeni kurslar eklenir
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Öncelikli destek
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            İstediğiniz zaman iptal
          </div>
        </div>
      </div>
    </>
  );

  const renderCourseCard = (course: CoursePrice) => (
    <>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {courseName || 'Kurs Satın Alma'}
        </h3>
        
        <div className="mb-6">
          <span className="text-3xl font-bold text-gray-900">
            {formatAmount(course.price_amount, course.currency)}
          </span>
          <span className="text-gray-600 ml-2">tek seferlik</span>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Yaşam boyu erişim
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12-586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Tüm kurs materyalleri
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
                        Tamamlama sertifikası
          </div>
        </div>
      </div>
    </>
  );

  const renderBundleCard = (bundle: CourseBundle) => (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{bundle.name}</h3>
          {bundle.discount_percentage > 0 && (
            <Badge className="bg-red-100 text-red-800">
              %{bundle.discount_percentage} İNDİRİM
            </Badge>
          )}
        </div>
        
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">
            {formatAmount(bundle.price_amount, bundle.currency)}
          </span>
          <span className="text-gray-600 ml-2">paket fiyatı</span>
        </div>

        {bundle.description && (
          <p className="text-gray-600 mb-6">{bundle.description}</p>
        )}

        <div className="space-y-3 mb-8">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Birden fazla kurs dahil
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Yaşam boyu erişim to all
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Önemli tasarruf
          </div>
        </div>
      </div>
    </>
  );

  return (
    <Card className={`relative overflow-hidden ${
      isPopular ? 'ring-2 ring-blue-500 scale-105' : ''
    }`}>
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 text-sm font-medium">
          En Popüler
        </div>
      )}
      
      <div className={isPopular ? 'pt-8' : ''}>
        {type === 'subscription' && renderSubscriptionCard(data as SubscriptionPlan)}
        {type === 'course' && renderCourseCard(data as CoursePrice)}
        {type === 'bundle' && renderBundleCard(data as CourseBundle)}
        
        <div className="p-6 pt-0">
          <Button
            onClick={handlePurchase}
            disabled={isLoading || isOwned}
            className={`w-full ${
              isPopular 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-800 hover:bg-gray-900'
            }`}
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>İşleniyor...</span>
              </div>
            ) : isOwned ? (
              'Zaten Sahipsiniz'
            ) : type === 'subscription' ? (
              'Aboneliği Başlat'
            ) : (
              'Hemen Satın Al'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}