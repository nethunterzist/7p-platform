/**
 * Professional Password Reset Flow
 * Email request and new password creation with corporate styling
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle,
  AlertCircle,
  Check,
  X,
  Users,
  Star,
  Globe,
  ArrowLeft,
  RefreshCw,
  Building2
} from 'lucide-react';
import { Button } from '@/design-system/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/ui/Card';
import { Input } from '@/design-system/components/ui/Input';
import { Progress } from '@/design-system/components/ui/Progress';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, user } = useAuth();
  
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
    { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
    { label: 'Contains a number', test: (pwd) => /\d/.test(pwd) },
    { label: 'Contains special character', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/dashboard');
    }

    // If we have a token, we're in reset mode
    if (token) {
      setStep('reset');
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [user, token, emailParam, router]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      if (!email) {
        setMessage('Email is required');
        setMessageType('error');
        return;
      }

      await resetPassword(email);
      setMessage('Password reset email sent! Please check your inbox.');
      setMessageType('success');
      setStep('success');
    } catch (error: any) {
      setMessage(error.message || 'Failed to send reset email. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      // Validate passwords
      if (!password || !confirmPassword) {
        setMessage('Both password fields are required');
        setMessageType('error');
        return;
      }

      if (password !== confirmPassword) {
        setMessage('Passwords do not match');
        setMessageType('error');
        return;
      }

      const failedRequirements = passwordRequirements.filter(req => !req.test(password));
      if (failedRequirements.length > 0) {
        setMessage('Password does not meet all requirements');
        setMessageType('error');
        return;
      }

      // In a real implementation, this would use the token to reset the password
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setMessage('Password successfully reset! Redirecting to login...');
      setMessageType('success');
      
      setTimeout(() => {
        router.push('/login/enhanced?message=' + encodeURIComponent('Password reset successfully. Please sign in with your new password.'));
      }, 2000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to reset password. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const passed = passwordRequirements.filter(req => req.test(password)).length;
    const total = passwordRequirements.length;
    return Math.round((passed / total) * 100);
  };

  const getStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength < 40) return 'error';
    if (strength < 80) return 'warning';
    return 'success';
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

  const PasswordRequirements = () => {
    if (!password || step !== 'reset') return null;

    return (
      <div className="mt-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Password strength</span>
            <span className="text-sm text-gray-600">{getPasswordStrength()}%</span>
          </div>
          <Progress 
            value={getPasswordStrength()} 
            variant={getStrengthColor()}
            size="sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {passwordRequirements.map((req, index) => {
            const passed = req.test(password);
            return (
              <div key={index} className={`flex items-center space-x-2 text-sm ${
                passed ? 'text-green-600' : 'text-gray-500'
              }`}>
                {passed ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white">
            {step === 'request' ? 'Reset Password' : step === 'reset' ? 'Create New Password' : 'Password Reset'}
          </h1>
          <p className="mt-3 text-lg text-white/90">
            {step === 'request' 
              ? 'Enter your email to receive reset instructions'
              : step === 'reset' 
              ? 'Choose a strong password for your account'
              : 'Your password has been successfully reset'
            }
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center items-center space-x-8 text-white/70 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Secure process</span>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Protected</span>
          </div>
        </div>

        <Card variant="elevated" className="bg-white/95 backdrop-blur-sm border-white/20">
          <CardContent className="p-8">
            <MessageDisplay />

            {step === 'request' && (
              <>
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-corporate-100 mb-4">
                    <Mail className="w-6 h-6 text-corporate-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Request Password Reset
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    We'll send you a secure link to reset your password
                  </p>
                </CardHeader>

                <form onSubmit={handleRequestReset} className="space-y-6">
                  <Input
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    leftIcon={<Mail className="h-5 w-5" />}
                    required
                    autoComplete="email"
                    size="lg"
                  />

                  <Button
                    type="submit"
                    variant="corporate"
                    size="xl"
                    loading={loading}
                    leftIcon={!loading && <Mail className="w-5 h-5" />}
                    className="w-full"
                  >
                    {loading ? 'Sending...' : 'Send Reset Email'}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/login/enhanced"
                      className="text-sm text-corporate-primary hover:text-corporate-deep transition-colors inline-flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </>
            )}

            {step === 'reset' && (
              <>
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-corporate-100 mb-4">
                    <Lock className="w-6 h-6 text-corporate-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Create New Password
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Choose a strong password to secure your account
                  </p>
                </CardHeader>

                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="relative">
                    <Input
                      label="New password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      leftIcon={<Lock className="h-5 w-5" />}
                      required
                      autoComplete="new-password"
                      size="lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  <PasswordRequirements />

                  <div className="relative">
                    <Input
                      label="Confirm new password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      leftIcon={<Lock className="h-5 w-5" />}
                      required
                      autoComplete="new-password"
                      size="lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="corporate"
                    size="xl"
                    loading={loading}
                    leftIcon={!loading && <Shield className="w-5 h-5" />}
                    className="w-full"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </>
            )}

            {step === 'success' && !token && (
              <>
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-green-100 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Check Your Email
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    We've sent password reset instructions to your email
                  </p>
                </CardHeader>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">What's next?</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Check your email inbox for our message</li>
                      <li>• Click the secure reset link in the email</li>
                      <li>• Create your new password</li>
                      <li>• Sign in with your new credentials</li>
                    </ul>
                  </div>

                  <div className="text-center space-y-3">
                    <p className="text-sm text-gray-500">
                      Didn't receive the email? Check your spam folder or{' '}
                      <button
                        onClick={() => {
                          setStep('request');
                          setMessage('');
                        }}
                        className="text-corporate-primary hover:text-corporate-deep font-medium"
                      >
                        try again
                      </button>
                    </p>
                    
                    <Link
                      href="/login/enhanced"
                      className="text-sm text-corporate-primary hover:text-corporate-deep transition-colors inline-flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to sign in
                    </Link>
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
                    Security Notice
                  </h4>
                  <p className="text-xs text-corporate-600 mt-1">
                    {step === 'request' 
                      ? 'Reset links expire in 1 hour for your security'
                      : step === 'reset'
                      ? 'Choose a password you haven\'t used before'
                      : 'Your account security is our top priority'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-sm text-corporate-primary hover:text-corporate-deep transition-colors"
              >
                Ana sayfaya geri dön
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}