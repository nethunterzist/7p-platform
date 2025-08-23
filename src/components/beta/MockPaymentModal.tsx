"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Sparkles, X, Gift, AlertCircle } from 'lucide-react';

interface MockPaymentModalProps {
  course: {
    id: string;
    title: string;
    price: number;
    currency?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MockPaymentModal: React.FC<MockPaymentModalProps> = ({ 
  course, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [processing, setProcessing] = useState(false);

  const formatPrice = (price: number, currency: string = 'TRY') => {
    const symbol = currency === 'TRY' ? '₺' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  const handleMockPayment = async () => {
    setProcessing(true);
    
    try {
      // Mock payment intent ID (beta döneminde)
      const mockPaymentIntentId = `mock_pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Call existing enrollment API with mock payment ID
      const response = await fetch(`/api/courses/${course.id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: mockPaymentIntentId,
          paymentMethod: 'paid' // Mock payment as paid enrollment
        }),
      });

      if (response.ok) {
        // Small delay for better UX
        setTimeout(() => {
          setProcessing(false);
          onSuccess();
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Enrollment failed');
      }
    } catch (error) {
      console.error('Mock payment error:', error);
      setProcessing(false);
      alert(`Bir hata oluştu: ${error instanceof Error ? error.message : 'Lütfen tekrar deneyin.'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={processing}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            🎉 Beta Döneminde Ücretsiz!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Course Info */}
          <div className="bg-slate-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-900 text-sm mb-2">{course.title}</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Normal Fiyat: <span className="line-through font-medium">{formatPrice(course.price, course.currency)}</span>
                </p>
                <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Beta Fiyat: ÜCRETSİZ!
                </p>
              </div>
            </div>
          </div>

          {/* Beta Info */}
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  Beta Bilgi
                </p>
                <p className="text-sm text-amber-700">
                  Platform test aşamasında olduğu için tüm kurslar geçici olarak ücretsiz! 
                  Feedback'lerinizi bekliyoruz.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Beta kullanıcısı olarak alacağınız avantajlar:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Tam kurs erişimi
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Tüm özellikler aktif
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Öncelikli destek
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Gelecek güncellemeler dahil
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              İptal
            </Button>
            <Button 
              onClick={handleMockPayment}
              disabled={processing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Ücretsiz Erişim Al
                </>
              )}
            </Button>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            Devam ederek <span className="underline">Kullanım Şartları</span> ve 
            <span className="underline"> Gizlilik Politikası</span>'nı kabul etmiş olursunuz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockPaymentModal;