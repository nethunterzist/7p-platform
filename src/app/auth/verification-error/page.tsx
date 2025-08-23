/**
 * EMAIL VERIFICATION ERROR PAGE - 7P Education
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, Mail, RefreshCw, Home } from 'lucide-react';

export default function VerificationErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message') || 'Doğrulama işlemi başarısız oldu.';
  
  const [isRequestingNew, setIsRequestingNew] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestNewVerification = async () => {
    setIsRequestingNew(true);
    
    try {
      // In a real implementation, you'd get the user ID from context/session
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          userId: 'current-user-id', // This should come from auth context
          email: 'user@example.com' // This should come from auth context
        })
      });

      const result = await response.json();

      if (result.success) {
        setRequestSent(true);
      } else {
        // Handle error
        alert(result.message || 'E-posta gönderilemedi.');
      }
    } catch (error) {
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsRequestingNew(false);
    }
  };

  const getErrorDetails = (message: string) => {
    if (message.includes('süres') || message.includes('expir')) {
      return {
        title: 'Doğrulama Bağlantısının Süresi Doldu',
        description: 'Doğrulama bağlantısının 24 saatlik geçerlilik süresi dolmuş. Yeni bir doğrulama e-postası talep edin.',
        canRequestNew: true,
        icon: '⏰'
      };
    } else if (message.includes('geçersiz') || message.includes('invalid')) {
      return {
        title: 'Geçersiz Doğrulama Bağlantısı',
        description: 'Doğrulama bağlantısı geçersiz veya daha önce kullanılmış. Yeni bir bağlantı talep edin.',
        canRequestNew: true,
        icon: '🔒'
      };
    } else if (message.includes('bulunamadı') || message.includes('not found')) {
      return {
        title: 'Doğrulama Bağlantısı Bulunamadı',
        description: 'Doğrulama bağlantısı sistemde bulunamadı. Yeni bir doğrulama e-postası talep edin.',
        canRequestNew: true,
        icon: '🔍'
      };
    } else {
      return {
        title: 'Doğrulama Hatası',
        description: 'E-posta doğrulama işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
        canRequestNew: true,
        icon: '❌'
      };
    }
  };

  const errorDetails = getErrorDetails(errorMessage);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            7P Education
          </h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>

            <CardTitle className="text-red-700">
              {errorDetails.title}
            </CardTitle>

            <CardDescription>
              {errorDetails.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Hata Detayı:</strong><br />
                {errorMessage}
              </AlertDescription>
            </Alert>

            {requestSent ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <Mail className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Yeni doğrulama e-postası gönderildi! E-posta kutunuzu kontrol edin.
                  </AlertDescription>
                </Alert>

                <Button 
                  variant="outline"
                  onClick={() => router.push('/login')} 
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Giriş Sayfasına Dön
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {errorDetails.canRequestNew && (
                  <Button
                    onClick={handleRequestNewVerification}
                    disabled={isRequestingNew}
                    className="w-full"
                  >
                    {isRequestingNew ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Yeni Doğrulama E-postası Gönder
                      </>
                    )}
                  </Button>
                )}

                <Button 
                  variant="outline"
                  onClick={() => router.push('/login')} 
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Giriş Sayfasına Dön
                </Button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                💡 Sorun Yaşıyor Musunuz?
              </h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Spam/junk klasörünüzü kontrol edin</li>
                <li>• E-posta adresinizi doğru yazdığınızdan emin olun</li>
                <li>• Farklı bir tarayıcı deneyin</li>
                <li>• Çerezleri ve önbelleği temizleyin</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Hâlâ sorun yaşıyorsanız{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              destek ekibiyle iletişime geçin
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}