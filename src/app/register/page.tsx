/**
 * Professional Registration Flow
 * Multi-step process with corporate styling
 */

"use client";

// Force dynamic rendering to prevent prerendering issues
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  User,
  Building,
  CheckCircle,
  AlertCircle,
  Check,
  X,
  Users,
  Star,
  Globe,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/design-system/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/ui/Card';
import { Input } from '@/design-system/components/ui/Input';
import { Progress, StepProgress } from '@/design-system/components/ui/Progress';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

interface SSOProviderInfo {
  provider: SSOProvider;
  name: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  configured: boolean;
}

export default function RegisterPage() {
  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSSOLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [ssoProviders, setSSOProviders] = useState<SSOProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  
  const router = useRouter();
  const { user, signInWithSSO } = useAuth();

  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'En az 8 karakter', test: (pwd) => pwd.length >= 8 },
    { label: 'Büyük harf içerir', test: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'Küçük harf içerir', test: (pwd) => /[a-z]/.test(pwd) },
    { label: 'Rakam içerir', test: (pwd) => /\d/.test(pwd) },
    { label: 'Özel karakter içerir', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  // Registration steps
  const steps = [
    { id: '1', title: 'Hesap', completed: currentStep > 1, current: currentStep === 1 },
    { id: '2', title: 'Profil', completed: currentStep > 2, current: currentStep === 2 },
    { id: '3', title: 'Onay', completed: currentStep > 3, current: currentStep === 3 },
  ];

  // Auto-detect corporate domains
  const corporateDomains = ['company.com', 'corp.com', 'enterprise.com'];
  const isCorporateEmail = corporateDomains.some(domain => email.endsWith(`@${domain}`));

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/dashboard');
    }

    // Fetch SSO provider status
    fetchSSOProviders();
  }, [user, router]);

  const fetchSSOProviders = async () => {
    try {
      const response = await fetch('/api/auth/sso-providers');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSSOProviders(data.providers);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch SSO provider status:', error);
      setSSOProviders(Object.entries(SSO_PROVIDERS).map(([provider, config]) => ({
        provider: provider as SSOProvider,
        name: config.name,
        icon: config.icon,
        color: config.color,
        description: config.description,
        enabled: false,
        configured: false
      })));
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      // Validate all steps
      if (!validateCurrentStep()) {
        setLoading(false);
        return;
      }

      // Create account with full profile data
      const { data, error } = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          organizationName,
          marketingOptIn
        })
      }).then(res => res.json());

      if (error) {
        setMessage(error.message || 'Kayıt başarısız');
        setMessageType('error');
      } else {
                setMessage('Hesap başarıyla oluşturuldu! Lütfen doğrulama için e-postanızı kontrol edin.');
        setMessageType('success');
        
        // Advance to confirmation step
        setCurrentStep(4);
        
        // Redirect after delay
        setTimeout(() => {
          router.push('/auth/verify-email?email=' + encodeURIComponent(email));
        }, 3000);
      }
    } catch (error) {
      setMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSSORegister = async (provider: SSOProvider) => {
    if (ssoLoading) return;

    setSSOLoading(provider);
    setMessage('');

    try {
      await signInWithSSO(provider);
      // Redirect will be handled by the SSO callback
    } catch (error) {
      const authError = error as AuthError;
      setMessage(authError.message || 'SSO kaydı başarısız');
      setMessageType('error');
      setSSOLoading(null);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!email) {
          setMessage('E-posta gerekli');
          setMessageType('error');
          return false;
        }
        if (!password) {
          setMessage('Şifre gerekli');
          setMessageType('error');
          return false;
        }
        if (password !== confirmPassword) {
          setMessage('Şifreler eşleşmiyor');
          setMessageType('error');
          return false;
        }
        const failedRequirements = passwordRequirements.filter(req => !req.test(password));
        if (failedRequirements.length > 0) {
          setMessage('Şifre tüm gereksinimleri karşılamıyor');
          setMessageType('error');
          return false;
        }
        break;
      
      case 2:
        if (!firstName || !lastName) {
          setMessage('Ad ve soyad gerekli');
          setMessageType('error');
          return false;
        }
        break;
      
      case 3:
        if (!termsAccepted) {
          setMessage('Kullanım Şartları ve Gizlilik Politikasını kabul etmelisiniz');
          setMessageType('error');
          return false;
        }
        break;
    }
    
    setMessage('');
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setMessage('');
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

  const SSOButton = ({ providerInfo }: { providerInfo: SSOProviderInfo }) => {
    if (!providerInfo.enabled) return null;

    const isLoading = ssoLoading === providerInfo.provider;

    return (
      <Button
        variant="outline"
        size="lg"
        onClick={() => handleSSORegister(providerInfo.provider)}
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
        {isLoading ? 'Ayarlanıyor...' : `${providerInfo.name} ile devam et`}
      </Button>
    );
  };

  const PasswordRequirements = () => {
    if (!password) return null;

    return (
      <div className="mt-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Şifre gücü</span>
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

  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <Card variant="elevated" className="bg-white/95 backdrop-blur-sm border-white/20">
            <CardContent className="p-8">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                7P Eğitime Hoş Geldiniz!
              </h2>
              <p className="text-gray-600 mb-6">
                Hesabınız başarıyla oluşturuldu. <strong>{email}</strong> adresine doğrulama e-postası gönderdik.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Lütfen e-postanızı kontrol edin ve hesabınızı aktifleştirmek için doğrulama bağlantısına tıklayın.
              </p>
              <Button
                variant="corporate"
                size="lg"
                onClick={() => router.push('/auth/verify-email?email=' + encodeURIComponent(email))}
                className="w-full"
              >
                Doğrulamaya devam et
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white">
            7P Eğitime Katılın
          </h1>
          <p className="mt-3 text-lg text-white/90">
            En iyi online kurslarla öğrenme yolculuğunuzu başlatın
          </p>
          <p className="mt-2 text-sm text-white/80">
            Zaten hesabınız var mı?{' '}
            <Link
              href="/login/enhanced"
              className="font-medium text-white hover:text-white/90 underline underline-offset-4 transition-colors"
            >
              Buradan giriş yapın
            </Link>
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center items-center space-x-8 text-white/70 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>10.000+ öğrenci</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>4.9/5 puan</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>50+ ülke</span>
          </div>
        </div>

        <Card variant="elevated" className="bg-white/95 backdrop-blur-sm border-white/20">
          <CardContent className="p-8">
            {/* Progress Steps */}
            <div className="mb-8">
              <StepProgress steps={steps} />
            </div>

            <MessageDisplay />

            {/* SSO Options - Only show on first step */}
            {currentStep === 1 && (
              <>
                <div className="space-y-3 mb-6">
                  {providersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-corporate-primary"></div>
                      <span className="ml-2 text-sm text-gray-500">Kayıt seçenekleri yüklenıyor...</span>
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

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">
                      veya e-posta ile devam et
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Multi-step Form */}
            <form onSubmit={currentStep === 3 ? handleEmailRegister : (e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
              {/* Step 1: Account Creation */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <Input
                    label="E-posta adresi"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-posta adresinizi girin"
                    leftIcon={<Mail className="h-5 w-5" />}
                    required
                    autoComplete="email"
                    size="lg"
                  />
                  
                  {isCorporateEmail && (
                    <div className="bg-corporate-50 p-4 rounded-lg border border-corporate-200">
                      <div className="flex items-center space-x-2">
                        <Building className="w-5 h-5 text-corporate-primary" />
                        <span className="text-sm font-medium text-corporate-800">
                          Kurumsal e-posta tespit edildi! Kurumsal özellikler için uygun olabilirsiniz.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      label="Şifre"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Güvenli bir şifre oluşturun"
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
                      label="Şifre onayla"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Şifrenizi onaylayın"
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
                </div>
              )}

              {/* Step 2: Profile Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Kendinizden bahsedin
                  </CardTitle>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Ad"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Adınız"
                      leftIcon={<User className="h-5 w-5" />}
                      required
                      autoComplete="given-name"
                      size="lg"
                    />
                    
                    <Input
                      label="Soyad"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Soyadınız"
                      leftIcon={<User className="h-5 w-5" />}
                      required
                      autoComplete="family-name"
                      size="lg"
                    />
                  </div>

                  <Input
                    label="Kurum (isteğe bağlı)"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Şirketiniz veya kurumunuz"
                    leftIcon={<Building className="h-5 w-5" />}
                    autoComplete="organization"
                    size="lg"
                    helperText="Deneyiminizi kişiselleştirmemize yardımcı olun"
                  />

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="marketing-opt-in"
                        name="marketing-opt-in"
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        className="h-4 w-4 text-corporate-primary focus:ring-corporate-accent border-gray-300 rounded"
                      />
                      <label htmlFor="marketing-opt-in" className="ml-3 block text-sm text-gray-700">
                        Bana kurs önerileri ve öğrenme ipuçları gönderin
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Terms and Confirmation */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Gözden geçir ve onayla
                  </CardTitle>
                  
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">E-posta:</span>
                      <span className="text-sm font-medium text-gray-900">{email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ad:</span>
                      <span className="text-sm font-medium text-gray-900">{firstName} {lastName}</span>
                    </div>
                    {organizationName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Kurum:</span>
                        <span className="text-sm font-medium text-gray-900">{organizationName}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        id="terms-accepted"
                        name="terms-accepted"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="h-4 w-4 text-corporate-primary focus:ring-corporate-accent border-gray-300 rounded mt-0.5"
                        required
                      />
                      <label htmlFor="terms-accepted" className="ml-3 block text-sm text-gray-700">
                        {' '}
                        <Link href="/terms" className="text-corporate-primary hover:text-corporate-deep font-medium">
                          Kullanım Şartları
                        </Link>{' '}
                        ve{' '}
                        <Link href="/privacy" className="text-corporate-primary hover:text-corporate-deep font-medium">
                          Gizlilik Politikası
                        </Link>{'nı kabul ediyorum'}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={prevStep}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Geri
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  {currentStep < 3 ? (
                    <Button
                      type="submit"
                      variant="corporate"
                      size="lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Devam et
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="corporate"
                      size="lg"
                      loading={loading}
                      disabled={!termsAccepted}
                      leftIcon={!loading && <Sparkles className="w-4 h-4" />}
                    >
                      {loading ? 'Hesap oluşturuluyor...' : 'Hesap oluştur'}
                    </Button>
                  )}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="text-sm text-corporate-primary hover:text-corporate-deep transition-colors"
              >
                ← Ana sayfaya dön
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}