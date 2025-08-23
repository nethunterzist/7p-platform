/**
 * EMAIL VERIFICATION BANNER COMPONENT - 7P Education
 * Reusable component for showing email verification status and actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  X 
} from 'lucide-react';

interface EmailVerificationBannerProps {
  userId: string;
  email?: string;
  onVerificationComplete?: () => void;
  variant?: 'banner' | 'card' | 'inline';
  dismissible?: boolean;
  autoCheck?: boolean;
  className?: string;
}

interface VerificationStatus {
  isVerified: boolean;
  canResend: boolean;
  nextResendTime?: number;
  remainingAttempts?: number;
}

export default function EmailVerificationBanner({
  userId,
  email,
  onVerificationComplete,
  variant = 'banner',
  dismissible = false,
  autoCheck = true,
  className = ''
}: EmailVerificationBannerProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(autoCheck);
  const [isSending, setIsSending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastSentMessage, setLastSentMessage] = useState('');

  // Check verification status on mount
  useEffect(() => {
    if (autoCheck && userId) {
      checkVerificationStatus();
    }
  }, [userId, autoCheck]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkVerificationStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/verify-email?userId=${userId}`);
      const result = await response.json();
      
      setStatus(result);
      
      if (result.isVerified && onVerificationComplete) {
        onVerificationComplete();
      }

      if (result.nextResendTime) {
        const waitSeconds = Math.ceil((result.nextResendTime - Date.now()) / 1000);
        setCountdown(Math.max(0, waitSeconds));
      }
    } catch (error) {
      console.error('Failed to check verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!userId || !email || isSending || countdown > 0) return;

    setIsSending(true);
    setLastSentMessage('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          userId,
          email
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setLastSentMessage(result.message);
        setStatus(prev => prev ? {
          ...prev,
          canResend: result.canResend,
          remainingAttempts: result.remainingAttempts
        } : null);

        if (!result.canResend && result.nextResendTime) {
          const waitSeconds = Math.ceil((result.nextResendTime - Date.now()) / 1000);
          setCountdown(Math.max(0, waitSeconds));
        }
      } else {
        setLastSentMessage(`Hata: ${result.message}`);
      }
    } catch (error) {
      setLastSentMessage('E-posta gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSending(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Don't show if dismissed or no status available
  if (isDismissed || isLoading || !status) {
    return null;
  }

  // Don't show if already verified
  if (status.isVerified) {
    return null;
  }

  const alertVariant = variant === 'banner' ? 'default' : 'destructive';
  const alertClassName = `${className} ${
    variant === 'banner' ? 'border-yellow-200 bg-yellow-50' : ''
  }`;

  return (
    <Alert className={alertClassName}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-semibold text-yellow-800">
                E-posta Doğrulama Gerekli
              </span>
              <Badge variant="outline" className="text-xs">
                {status.remainingAttempts || 0} deneme kaldı
              </Badge>
            </div>
            
            <AlertDescription className="text-yellow-700 mb-3">
              Hesabınızı tam olarak kullanabilmek için e-posta adresinizi doğrulayın.
              {email && (
                <span className="block mt-1 font-mono text-sm">
                  📧 {email}
                </span>
              )}
            </AlertDescription>

            {lastSentMessage && (
              <div className="mb-3 p-2 bg-white bg-opacity-50 rounded text-sm">
                {lastSentMessage}
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                onClick={handleResendEmail}
                disabled={!status.canResend || isSending || countdown > 0}
                variant={variant === 'banner' ? 'default' : 'secondary'}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {formatCountdown(countdown)}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {lastSentMessage ? 'Tekrar Gönder' : 'Doğrulama E-postası Gönder'}
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={checkVerificationStatus}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Durumu Kontrol Et'
                )}
              </Button>
            </div>
          </div>
        </div>

        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-yellow-600 hover:text-yellow-800"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}