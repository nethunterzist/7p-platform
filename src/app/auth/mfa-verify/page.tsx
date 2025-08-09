/**
 * Enhanced MFA Verification Page
 * TOTP and Backup Code Verification with Corporate Styling
 */

"use client";

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { AuthMethod } from '@/lib/types/auth';
import { 
  Shield, 
  Smartphone, 
  Key, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  QrCode,
  Download,
  Copy,
  Users,
  Star,
  Globe,
  Building2,
  Lock
} from 'lucide-react';
import { Button } from '@/design-system/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/ui/Card';
import { Input } from '@/design-system/components/ui/Input';

export default function MFAVerifyPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [timeLeft, setTimeLeft] = useState(30);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, verifyMFA } = useAuth();
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Timer for TOTP code refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login/enhanced');
    }
  }, [user, router]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\s/g, '');
    if (pastedText.length === 6 && /^\d+$/.test(pastedText)) {
      const newCode = pastedText.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleTOTPVerification = async () => {
    const totpCode = code.join('');
    if (totpCode.length !== 6) {
      setMessage('Please enter a valid 6-digit code');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const success = await verifyMFA(totpCode, AuthMethod.MFA_TOTP);
      
      if (success) {
        setMessage('Verification successful! Redirecting...');
        setMessageType('success');
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1500);
      } else {
        setMessage('Invalid verification code. Please try again.');
        setMessageType('error');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setMessage('Verification failed. Please try again.');
      setMessageType('error');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerification = async () => {
    if (!backupCode.trim()) {
      setMessage('Please enter a backup code');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const success = await verifyMFA(backupCode.trim().toUpperCase(), AuthMethod.MFA_TOTP);
      
      if (success) {
        setMessage('Backup code verified! Redirecting...');
        setMessageType('success');
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1500);
      } else {
        setMessage('Invalid backup code. Please try again.');
        setMessageType('error');
        setBackupCode('');
      }
    } catch (error) {
      setMessage('Verification failed. Please try again.');
      setMessageType('error');
      setBackupCode('');
    } finally {
      setLoading(false);
    }
  };

  const MessageDisplay = () => {
    if (!message) return null;

    const icons = {
      success: <CheckCircle className="w-5 h-5" />,
      error: <AlertCircle className="w-5 h-5" />,
      info: <Shield className="w-5 h-5" />,
    };

    const styles = {
      success: 'bg-green-50 text-green-800 border-green-200',
      error: 'bg-red-50 text-red-800 border-red-200',
      info: 'bg-corporate-50 text-corporate-800 border-corporate-200',
    };

    return (
      <div className={`mb-6 p-4 rounded-lg border flex items-center space-x-3 ${styles[messageType as keyof typeof styles] || styles.info}`}>
        {icons[messageType as keyof typeof icons] || icons.info}
        <span className="text-sm font-medium">{message}</span>
      </div>
    );
  };

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white">
            Secure Verification
          </h1>
          <p className="mt-3 text-lg text-white/90">
            Two-factor authentication provides an extra layer of security
          </p>
          <p className="mt-2 text-sm text-white/80">
            Your account security is our top priority
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center items-center space-x-8 text-white/70 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Bank-level security</span>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>SOC 2 certified</span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Zero-trust architecture</span>
          </div>
        </div>

        <Card variant="elevated" className="bg-white/95 backdrop-blur-sm border-white/20">
          <CardContent className="p-8">
            <MessageDisplay />

            {!showBackupCodes ? (
              <>
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-corporate-100 mb-4">
                    <Smartphone className="w-6 h-6 text-corporate-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Enter Authenticator Code
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Open your authenticator app and enter the 6-digit code
                  </p>
                </CardHeader>

                {/* TOTP Code Input */}
                <div className="space-y-6">
                  <div className="flex justify-center space-x-3" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-14 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-accent focus:border-corporate-primary transition-all"
                        placeholder="0"
                      />
                    ))}
                  </div>

                  {/* Timer */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <RefreshCw className="w-4 h-4" />
                      <span>Code refreshes in <span className="font-semibold text-corporate-primary">{timeLeft}s</span></span>
                    </div>
                  </div>

                  <Button
                    onClick={handleTOTPVerification}
                    disabled={loading || code.join('').length !== 6}
                    variant="corporate"
                    size="xl"
                    loading={loading}
                    leftIcon={!loading && <Shield className="w-5 h-5" />}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>

                  {/* Backup codes link */}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => setShowBackupCodes(true)}
                      leftIcon={<Key className="w-4 h-4" />}
                    >
                      Use backup code instead
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-corporate-100 mb-4">
                    <Key className="w-6 h-6 text-corporate-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Use Backup Code
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Enter one of your backup recovery codes
                  </p>
                </CardHeader>

                {/* Backup Code Input */}
                <div className="space-y-6">
                  <Input
                    label="Backup code"
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    leftIcon={<Key className="h-5 w-5" />}
                    className="text-center font-mono tracking-wider"
                    maxLength={12}
                    size="lg"
                    helperText="Backup codes are 8-12 characters long"
                  />

                  <Button
                    onClick={handleBackupCodeVerification}
                    disabled={loading || !backupCode.trim()}
                    variant="corporate"
                    size="xl"
                    loading={loading}
                    leftIcon={!loading && <Key className="w-5 h-5" />}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify Backup Code'}
                  </Button>

                  {/* Back to TOTP */}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowBackupCodes(false);
                        setBackupCode('');
                        inputRefs.current[0]?.focus();
                      }}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Back to authenticator code
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Security Notice */}
            <div className="bg-corporate-50 p-4 rounded-lg border border-corporate-200 mt-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="w-5 h-5 text-corporate-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-corporate-800">
                    Enhanced Security Active
                  </h4>
                  <p className="text-xs text-corporate-600 mt-1">
                    Two-factor authentication provides an additional layer of protection for your account
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
                <span>FIDO Alliance</span>
              </div>
              <div className="flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Zero Trust</span>
              </div>
            </div>

            {/* Help */}
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                                Sorun mu yaşıyorsunuz?{' '}
                <a href="/support" className="text-corporate-primary hover:text-corporate-deep font-medium">
                  Destekle iletişime geçin
                </a>
                {' veya '}
                <a href="/help/mfa" className="text-corporate-primary hover:text-corporate-deep font-medium">
                  MFA kılavuzunu görüntüleyin
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}