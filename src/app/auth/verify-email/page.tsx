/**
 * Professional Email Verification Page
 * Email verification flow with corporate styling
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { 
  Shield, 
  Mail, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Building2,
  Lock,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/design-system/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/ui/Card';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error' | 'expired'>('pending');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerification, user } = useAuth();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    // If user is already verified, redirect to dashboard
    if (user && user.email_verified) {
      router.push('/dashboard');
      return;
    }

    // If we have a token, verify it
    if (token) {
      handleTokenVerification();
    } else if (!email) {
      // If no email provided, redirect to login
      router.push('/login/enhanced');
    }
  }, [token, email, user, router]);

  // Countdown timer for resend functionality
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleTokenVerification = async () => {
    if (!token) return;

    setStatus('verifying');
    setMessage('E-posta adresiniz doğrulanıyor...');

    try {
      await verifyEmail(token);
      setStatus('success');
      setMessage('E-posta başarıyla doğrulandı! Kontrol panelinize yönlendiriliyorsunuz...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error: any) {
      if (error.message?.includes('expired')) {
        setStatus('expired');
        setMessage('Doğrulama bağlantısı süresi dolmuş. Lütfen yeni bir tane talep edin.');
      } else {
        setStatus('error');
        setMessage(error.message || 'E-posta doğrulama başarısız. Lütfen tekrar deneyin.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (loading || countdown > 0) return;

    setLoading(true);
    setMessage('');

    try {
      await resendVerification();
      setMessage('Yeni doğrulama e-postası gönderildi! Lütfen gelen kutunuzu kontrol edin.');
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      setMessage(error.message || 'Doğrulama e-postası yeniden gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'verifying':
        return {
          icon: <RefreshCw className="w-8 h-8 text-corporate-primary animate-spin" />,
          title: 'E-posta Doğrulanıyor',
          description: 'E-posta adresinizi doğrularken lütfen bekleyin...',
          bgColor: 'bg-corporate-100'
        };
      
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-600" />,
          title: 'E-posta Doğrulandı!',
          description: 'E-postanız başarıyla doğrulandı. 7P Eğitime hoş geldiniz!',
          bgColor: 'bg-green-100'
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-600" />,
          title: 'Doğrulama Başarısız',
          description: 'E-postanızı doğrularken bir sorun oluştu. Lütfen tekrar deneyin.',
          bgColor: 'bg-red-100'
        };
      
      case 'expired':
        return {
          icon: <Clock className="w-8 h-8 text-orange-600" />,
          title: 'Bağlantı Süresi Doldu',
          description: 'Doğrulama bağlantınızın süresi doldu. Size yeni bir tane gönderebiliriz.',
          bgColor: 'bg-orange-100'
        };
      
      default:
        return {
          icon: <Mail className="w-8 h-8 text-corporate-primary" />,
          title: 'E-postanızı Kontrol Edin',
          description: 'E-posta adresinize bir doğrulama bağlantısı gönderdik.',
          bgColor: 'bg-corporate-100'
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white">
            E-posta Doğrulama
          </h1>
          <p className="mt-3 text-lg text-white/90">
            Hesabınızı e-posta doğrulama ile güvence altına alın
          </p>
          <p className="mt-2 text-sm text-white/80">
            Bu, hesabınızı güvenli tutmamıza yardımcı olur
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center items-center space-x-8 text-white/70 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Binlerce kişi tarafından güvenilir</span>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Kurumsal güvenlik</span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Gizlilik korunur</span>
          </div>
        </div>

        <Card variant="elevated" className="bg-white/95 backdrop-blur-sm border-white/20">
          <CardContent className="p-8">
            <CardHeader className="text-center pb-6">
              <div className={`mx-auto h-16 w-16 flex items-center justify-center rounded-lg ${statusContent.bgColor} mb-4`}>
                {statusContent.icon}
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {statusContent.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                {statusContent.description}
              </p>
            </CardHeader>

            {/* Message Display */}
            {message && (
              <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-700 text-center">{message}</p>
              </div>
            )}

            {/* Email Display */}
            {email && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">{email}</span>
                </div>
              </div>
            )}

            {/* Status-specific content */}
            {status === 'pending' && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Next Steps:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                                      <li>• E-posta gelen kutunuzu doğrulama mesajımız için kontrol edin</li>
                  <li>• Göremiyorsanız spam veya gereksiz posta klasörünüze bakın</li>
                  <li>• E-postadaki doğrulama bağlantısına tıklayın</li>
                  <li>• İşlemi tamamlamak için buraya geri dönün</li>
                  </ul>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Didn't receive the email?
                  </p>
                  <Button
                    onClick={handleResendVerification}
                    disabled={loading || countdown > 0}
                    variant="corporate"
                    size="lg"
                    loading={loading}
                    leftIcon={!loading && <RefreshCw className="w-4 h-4" />}
                    className="w-full"
                  >
                    {countdown > 0 
                      ? `Resend in ${countdown}s` 
                      : loading 
                      ? 'Sending...' 
                      : 'Resend Verification Email'
                    }
                  </Button>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">
                        Verification Complete
                      </h4>
                      <p className="text-xs text-green-700 mt-1">
                        Your account is now fully activated and ready to use
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="corporate"
                  size="xl"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Continue to Dashboard
                </Button>
              </div>
            )}

            {(status === 'error' || status === 'expired') && (
              <div className="space-y-6">
                <div className="text-center">
                  <Button
                    onClick={handleResendVerification}
                    disabled={loading || countdown > 0}
                    variant="corporate"
                    size="lg"
                    loading={loading}
                    leftIcon={!loading && <RefreshCw className="w-4 h-4" />}
                    className="w-full"
                  >
                    {countdown > 0 
                      ? `Resend in ${countdown}s` 
                      : loading 
                      ? 'Sending...' 
                      : 'Send New Verification Email'
                    }
                  </Button>
                </div>

                <div className="text-center">
                  <Link
                    href="/login/enhanced"
                    className="text-sm text-corporate-primary hover:text-corporate-deep transition-colors"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-corporate-50 p-4 rounded-lg border border-corporate-200 mt-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="w-5 h-5 text-corporate-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-corporate-800">
                    Why verify your email?
                  </h4>
                  <p className="text-xs text-corporate-600 mt-1">
                    Email verification helps protect your account and ensures you receive important updates
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center items-center space-x-6 text-xs text-gray-500 mt-4">
              <div className="flex items-center space-x-1">
                <Building2 className="w-3 h-3" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>256-bit SSL</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-sm text-corporate-primary hover:text-corporate-deep transition-colors"
              >
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}