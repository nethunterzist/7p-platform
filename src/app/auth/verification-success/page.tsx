/**
 * EMAIL VERIFICATION SUCCESS PAGE - 7P Education
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function VerificationSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

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
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>

            <CardTitle className="text-green-700">
              E-posta Doğrulandı! 🎉
            </CardTitle>

            <CardDescription>
              E-posta adresiniz başarıyla doğrulandı. 
              Artık tüm özellikleri kullanabilirsiniz.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                Hesabınız aktif! ✅
              </h3>
              <p className="text-green-700 text-sm">
                • Tüm kurslara erişim<br />
                • Profil ayarları<br />
                • İlerleme takibi<br />
                • Sertifika alma
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Panele Git
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button 
                variant="outline"
                onClick={() => router.push('/profile')} 
                className="w-full"
              >
                Profilimi Tamamla
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>5 saniye içinde otomatik olarak yönlendirileceksiniz...</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Hoş geldiniz! 7P Education'da başarılı bir öğrenme deneyimi dileriz.
          </p>
        </div>
      </div>
    </div>
  );
}