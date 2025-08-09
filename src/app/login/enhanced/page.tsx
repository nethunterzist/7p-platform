/**
 * Enhanced Login Page with SSO Integration
 * Google, Microsoft, and MFA Support
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { SSOProvider, AuthError } from '@/lib/types/auth';
import { SSO_PROVIDERS } from '@/lib/auth/config-client';
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Building2,
  Users,
  Star,
  Globe
} from 'lucide-react';
import { Button } from '@/design-system/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/design-system/components/ui/Card';
import { Input } from '@/design-system/components/ui/Input';

interface SSOProviderInfo {
  provider: SSOProvider;
  name: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  configured: boolean;
}

export default function EnhancedLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSSOLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [ssoProviders, setSSOProviders] = useState<SSOProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithSSO, user } = useAuth();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const errorParam = searchParams.get('error');

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push(redirectUrl);
    }

    // Show error from URL params
    if (errorParam) {
      setMessage(decodeURIComponent(errorParam));
      setMessageType('error');
    }

    // Fetch SSO provider status securely from server
    fetchSSOProviders();
  }, [user, redirectUrl, errorParam, router]);

  const fetchSSOProviders = async () => {
    try {
      const response = await fetch('/api/auth/sso-providers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSSOProviders(data.providers);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch SSO provider status:', error);
      // Fallback to client-safe defaults
      setSSOProviders(Object.entries(SSO_PROVIDERS).map(([provider, config]) => ({
        provider: provider as SSOProvider,
        name: config.name,
        icon: config.icon,
        color: config.color,
        description: config.description,
        enabled: false, // Safe default
        configured: false
      })));
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      await signIn(email, password);
      setMessage('Successfully logged in!');
      setMessageType('success');
      
      // Small delay to show success message
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1000);
    } catch (error) {
      const authError = error as AuthError;
      setMessage(authError.message);
      setMessageType('error');
      
      // Handle specific error cases
      if (authError.code === 'ACCOUNT_LOCKED') {
        setMessage('Your account has been temporarily locked due to too many failed attempts. Please try again later.');
      } else if (authError.code === 'RATE_LIMIT_EXCEEDED') {
        setMessage(`Too many attempts. Please wait ${authError.retry_after || 60} seconds before trying again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = async (provider: SSOProvider) => {
    if (ssoLoading) return;

    setSSOLoading(provider);
    setMessage('');

    try {
      await signInWithSSO(provider);
      // Redirect will be handled by the SSO callback
    } catch (error) {
      const authError = error as AuthError;
      setMessage(authError.message);
      setMessageType('error');
      setSSOLoading(null);
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

  const SSOButton = ({ providerInfo }: { providerInfo: SSOProviderInfo }) => {
    if (!providerInfo.enabled) return null;

    const isLoading = ssoLoading === providerInfo.provider;

    return (
      <Button
        variant="outline"
        size="lg"
        onClick={() => handleSSOLogin(providerInfo.provider)}
        disabled={loading || !!ssoLoading}
        className="w-full justify-center"
        loading={isLoading}
        leftIcon={
          !isLoading && (
            <div 
              className="w-5 h-5 rounded"
              style={{ backgroundColor: providerInfo.color }}
            />
          )
        }
      >
        {isLoading ? 'Connecting...' : `Continue with ${providerInfo.name}`}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white">
            Welcome back
          </h1>
          <p className="mt-3 text-lg text-white/90">
            Sign in to your account to continue learning
          </p>
          <p className="mt-2 text-sm text-white/80">
            New to our platform?{' '}
            <Link
              href="/register"
              className="font-medium text-white hover:text-white/90 underline underline-offset-4 transition-colors"
            >
              Create your account
            </Link>
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center items-center space-x-8 mt-8 text-white/70 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>10,000+ students</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>4.9/5 rating</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>50+ countries</span>
          </div>
        </div>

        <Card variant="elevated" className="bg-white/95 backdrop-blur-sm border-white/20">
          <CardContent className="space-y-6">
            <MessageDisplay />

          {/* SSO Providers */}
          <div className="space-y-3 mb-6">
            {providersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading sign-in options...</span>
              </div>
            ) : (
              ssoProviders.map((providerInfo) => (
                <SSOButton 
                  key={providerInfo.provider} 
                  providerInfo={providerInfo} 
                />
              ))
            )}
          </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                leftIcon={<Mail className="h-5 w-5" />}
                required
                autoComplete="email"
                size="lg"
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  leftIcon={<Lock className="h-5 w-5" />}
                  required
                  autoComplete="current-password"
                  size="lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-corporate-primary focus:ring-corporate-accent border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    href="/auth/reset-password"
                    className="font-medium text-corporate-primary hover:text-corporate-deep transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="corporate"
                size="xl"
                disabled={loading || !!ssoLoading}
                loading={loading}
                leftIcon={!loading && <Lock className="w-5 h-5" />}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign in to your account'}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="bg-corporate-50 p-4 rounded-lg border border-corporate-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="w-5 h-5 text-corporate-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-corporate-800">
                    Enterprise Security
                  </h4>
                  <p className="text-xs text-corporate-600 mt-1">
                    Your data is protected with bank-level encryption and enterprise-grade security
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
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

            {/* Footer Links */}
            <div className="text-center space-y-3">
              <Link
                href="/"
                className="inline-block text-sm text-corporate-primary hover:text-corporate-deep transition-colors"
              >
                ← Back to home
              </Link>
              <div className="text-xs text-gray-500">
                Giriş yaparak,{' '}
                <Link href="/terms" className="text-corporate-primary hover:text-corporate-deep">
                  Hizmet Şartları
                </Link>{' '}
                ve{' '}
                <Link href="/privacy" className="text-corporate-primary hover:text-corporate-deep">
                  Gizlilik Politikası
                </Link>'nı kabul etmiş olursunuz.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}