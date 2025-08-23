/**
 * EMAIL VERIFICATION PAGE - 7P Education
 * Page for handling email verification links and resend requests
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Mail, Clock, RefreshCw } from 'lucide-react';

interface VerificationState {
  status: 'loading' | 'success' | 'error' | 'expired' | 'resend';
  message: string;
  canResend: boolean;
  remainingAttempts?: number;
  nextResendTime?: number;
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');
  
  const [state, setState] = useState<VerificationState>({
    status: 'loading',
    message: 'E-posta doğrulanıyor...',
    canResend: false
  });
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (token) {
      // Auto-verify if token is present
      verifyEmailToken(token);
    } else if (userId) {
      // Check verification status
      checkVerificationStatus(userId);
    } else {
      setState({
        status: 'error',
        message: 'Geçersiz doğrulama bağlantısı.',
        canResend: false
      });
    }
  }, [token, userId]);

  // Countdown timer for resend waiting
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyEmailToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          token
        })
      });

      const result = await response.json();

      if (result.success) {
        setState({
          status: 'success',
          message: result.message,
          canResend: false
        });
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        const isExpired = result.message.includes('süres');
        setState({
          status: isExpired ? 'expired' : 'error',
          message: result.message,
          canResend: isExpired,
          remainingAttempts: 3 // Default for expired tokens
        });
      }
    } catch (error) {
      setState({
        status: 'error',
        message: 'Doğrulama işlemi sırasında hata oluştu.',
        canResend: false
      });
    }
  };

  const checkVerificationStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?userId=${userId}`);
      const result = await response.json();

      if (result.isVerified) {
        setState({
          status: 'success',
          message: 'E-posta adresiniz zaten doğrulanmış.',
          canResend: false
        });
      } else {
        setState({
          status: 'resend',
          message: 'E-posta doğrulaması gerekiyor.',
          canResend: result.canResend,
          remainingAttempts: result.remainingAttempts
        });

        if (result.nextResendTime) {
          const waitSeconds = Math.ceil((result.nextResendTime - Date.now()) / 1000);
          setCountdown(Math.max(0, waitSeconds));
        }
      }
    } catch (error) {
      setState({
        status: 'error',
        message: 'Durum sorgulanırken hata oluştu.',
        canResend: false
      });
    }
  };

  const handleResendEmail = async () => {
    if (!userId || isResending || countdown > 0) return;

    setIsResending(true);

    try {
      // Get user email from profile
      const response = await fetch(`/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          userId,
          email: 'user@example.com' // This should come from user context
        })
      });

      const result = await response.json();

      if (result.success) {
        setState({
          status: 'resend',
          message: result.message,
          canResend: result.canResend,
          remainingAttempts: result.remainingAttempts
        });

        // Set countdown if needed
        if (!result.canResend && result.nextResendTime) {
          const waitSeconds = Math.ceil((result.nextResendTime - Date.now()) / 1000);
          setCountdown(Math.max(0, waitSeconds));
        }
      } else {
        setState({
          status: 'error',
          message: result.message,
          canResend: false
        });
      }
    } catch (error) {
      setState({
        status: 'error',
        message: 'E-posta gönderilemedi. Lütfen tekrar deneyin.',
        canResend: true
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            7P Education
          </h1>
          <h2 className="mt-2 text-xl font-semibold text-gray-700">
            E-posta Doğrulama
          </h2>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {state.status === 'loading' && (
                <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
              )}
              {state.status === 'success' && (
                <CheckCircle className="h-12 w-12 text-green-500" />
              )}
              {(state.status === 'error' || state.status === 'expired') && (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              {state.status === 'resend' && (
                <Mail className="h-12 w-12 text-blue-500" />
              )}
            </div>

            <CardTitle>
              {state.status === 'loading' && 'Doğrulanıyor...'}
              {state.status === 'success' && 'Başarılı!'}
              {state.status === 'error' && 'Hata Oluştu'}
              {state.status === 'expired' && 'Link Süresi Doldu'}
              {state.status === 'resend' && 'Doğrulama Gerekli'}
            </CardTitle>

            <CardDescription>
              {state.message}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {state.status === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  3 saniye içinde ana sayfaya yönlendirileceksiniz...
                </AlertDescription>
              </Alert>
            )}

            {(state.status === 'expired' || state.status === 'resend') && (
              <div className="space-y-4">
                {state.remainingAttempts !== undefined && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Kalan gönderim hakkınız: <strong>{state.remainingAttempts}</strong>
                      {countdown > 0 && (
                        <span className="block mt-1">
                          Tekrar gönderebilmek için: <strong>{formatCountdown(countdown)}</strong>
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleResendEmail}
                  disabled={!state.canResend || isResending || countdown > 0}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : countdown > 0 ? (
                    `Bekleyin (${formatCountdown(countdown)})`
                  ) : (
                    'Tekrar Gönder'
                  )}
                </Button>
              </div>
            )}

            {state.status === 'error' && !state.canResend && (
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                Giriş Sayfasına Dön
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>
            Sorun yaşıyorsanız{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              destek ekibiyle
            </a>{' '}
            iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}