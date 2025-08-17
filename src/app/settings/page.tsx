"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import {
  getUserProfile,
  getPlatformPreferences,
  getNotificationSettings,
  getActiveDevices,
  getSubscription,
  getInvoices,
  getPaymentMethods,
  getSecuritySettings,
  AVAILABLE_LANGUAGES,
  AVAILABLE_TIMEZONES,
  LANDING_PAGE_OPTIONS,
  THEME_OPTIONS,
  type UserProfile,
  type PlatformPreferences,
  type NotificationSettings,
  type SecuritySettings,
  type ActiveDevice,
  type Subscription,
  type Invoice,
  type PaymentMethod
} from '@/data';

import { 
  Settings,
  User,
  Save,
  Camera,
  Mail,
  Smartphone,
  Sun,
  Moon,
  Bell,
  Shield,
  CreditCard,
  Lock,
  Monitor,
  Download,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  X
} from 'lucide-react';

// Security interface for password changes
interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, disabled = false, label }) => {
  return (
    <label className="flex items-center space-x-3 cursor-pointer">
      <div
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          enabled ? "bg-green-500" : "bg-gray-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && onChange(!enabled)}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </div>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
};

export default function SettingsPage() {
  // Load organized mock data
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [platform, setPlatform] = useState<PlatformPreferences>(getPlatformPreferences());
  const [notifications, setNotifications] = useState<NotificationSettings>(getNotificationSettings());
  
  // Password change form state (separate from user profile)
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Static data from organized mock data
  const [activeDevices] = useState<ActiveDevice[]>(getActiveDevices());
  const [subscription] = useState<Subscription>(getSubscription());
  const [invoices] = useState<Invoice[]>(getInvoices());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(getPaymentMethods());

  // Modal state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCard, setNewCard] = useState({
    card_number: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'profile' | 'platform' | 'notifications' | 'security' | 'billing'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  // Toast bildirimleri için saveMessage state'i artık gerekmiyor

  // Save handlers
  const saveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulated save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profil bilgileri başarıyla kaydedildi!');
    } catch (error) {
      toast.error('Profil kaydedilirken bir hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  const savePlatform = async () => {
    setIsLoading(true);
    try {
      // Simulated save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Platform ayarları başarıyla kaydedildi!');
    } catch (error) {
      toast.error('Platform ayarları kaydedilirken bir hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotifications = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Bildirim ayarları başarıyla kaydedildi!');
    } catch (error) {
      toast.error('Bildirim ayarları kaydedilirken bir hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Yeni şifreler eşleşmiyor!');
      return;
    }
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Şifre başarıyla değiştirildi!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error('Şifre değiştirilemedi!');
    } finally {
      setIsLoading(false);
    }
  };

  const logoutDevice = async (deviceId: string) => {
    try {
      toast.success('Cihaz oturumu başarıyla kapatıldı!');
    } catch (error) {
      toast.error('Oturum kapatılamadı!');
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    // Simulated download
    toast.success('Fatura indiriliyor...');
  };

  const removePaymentMethod = async (methodId: string) => {
    try {
      setPaymentMethods(methods => methods.filter(method => method.id !== methodId));
      toast.success('Ödeme yöntemi başarıyla kaldırıldı!');
    } catch (error) {
      toast.error('Ödeme yöntemi kaldırılamadı!');
    }
  };

  const addPaymentMethod = async () => {
    setIsLoading(true);
    try {
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: 'card',
        last_four: newCard.card_number.slice(-4),
        brand: 'Visa', // In real app, detect from card number
        expires: newCard.expiry,
        is_default: paymentMethods.length === 0
      };
      
      setPaymentMethods(methods => [...methods, newMethod]);
      setNewCard({ card_number: '', expiry: '', cvc: '', name: '' });
      setShowAddCardModal(false);
      toast.success('Kart başarıyla eklendi!');
    } catch (error) {
      toast.error('Kart eklenemedi!');
    } finally {
      setIsLoading(false);
    }
  };

  // Load additional options from organized data
  const securitySettings = getSecuritySettings();

  return (
    <DashboardLayout
      title="Ayarlar"
      subtitle="Profil ve platform tercihlerinizi yönetin"
    >
      {/* Toast bildirimleri artık burada değil, sol üstte görünecek */}

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'profile' as const, label: 'Kişisel Bilgiler', icon: User },
              { id: 'platform' as const, label: 'Platform Ayarları', icon: Settings },
              { id: 'notifications' as const, label: 'Bildirimler', icon: Bell },
              { id: 'security' as const, label: 'Güvenlik', icon: Shield },
              { id: 'billing' as const, label: 'Faturalandırma', icon: CreditCard }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    isActive
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <Icon className={cn(
                    "mr-2 h-5 w-5",
                    isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Temel Bilgiler</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Avatar Section */}
                <div className="md:col-span-2 flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="Profil fotoğrafı"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Profil Fotoğrafı</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">JPG, PNG dosyaları desteklenir. Maksimum 2MB.</p>
                  </div>
                </div>

                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ad Soyad *
                  </label>
                  <Input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full"
                    placeholder="Ad ve soyadınızı girin"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-posta Adresi *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="pl-10 w-full"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefon Numarası
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="pl-10 w-full"
                      placeholder="+90 555 123 45 67"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <Button 
                  onClick={saveProfile} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Platform Tab */}
      {activeTab === 'platform' && (
        <div className="space-y-6">
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Settings className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Tercihleri</h3>
              </div>

              <div className="space-y-6">
                {/* Theme Settings */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Görünüm Teması</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {THEME_OPTIONS.map((theme) => {
                      const isSelected = platform.theme === theme.value;
                      
                      return (
                        <button
                          key={theme.value}
                          onClick={() => setPlatform({ ...platform, theme: theme.value as any })}
                          className={cn(
                            "p-4 border-2 rounded-lg text-center transition-all",
                            isSelected 
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <span className="text-2xl mb-2 block">{theme.icon}</span>
                          <span className="text-sm font-medium">{theme.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Default Landing Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Varsayılan Başlangıç Sayfası
                  </label>
                  <select
                    value={platform.default_landing_page}
                    onChange={(e) => setPlatform({ ...platform, default_landing_page: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {LANDING_PAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Giriş yaptıktan sonra yönlendirilmek istediğiniz sayfa
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <Button 
                  onClick={savePlatform} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Bell className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">E-posta Bildirim Tercihleri</h3>
              </div>

              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Yeni Kurs Bildirimleri</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Platforma yeni kurs eklendiğĭnde e-posta al</p>
                    </div>
                    <ToggleSwitch
                      enabled={notifications.new_courses}
                      onChange={(enabled) => setNotifications({ ...notifications, new_courses: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Kurs Güncellemeleri</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kayıtlı olduğunuz kurslar güncellendiğĭnde bilgilendir</p>
                    </div>
                    <ToggleSwitch
                      enabled={notifications.course_updates}
                      onChange={(enabled) => setNotifications({ ...notifications, course_updates: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Yeni Yorumlar</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kurslarınıza veya yorumlarınıza cevap geldiğinde bilgilendir</p>
                    </div>
                    <ToggleSwitch
                      enabled={notifications.new_comments}
                      onChange={(enabled) => setNotifications({ ...notifications, new_comments: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Sistem Bildirimleri</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Güvenlik ve hesap değişiklikleri hakkında önemli bildirimler</p>
                    </div>
                    <ToggleSwitch
                      enabled={notifications.system_notifications}
                      onChange={(enabled) => setNotifications({ ...notifications, system_notifications: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Promosyon E-postaları</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Indirim ve özel teklifler hakkında e-posta al</p>
                    </div>
                    <ToggleSwitch
                      enabled={notifications.promotional_emails}
                      onChange={(enabled) => setNotifications({ ...notifications, promotional_emails: enabled })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <Button 
                  onClick={saveNotifications} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Password Change */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Lock className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Şifre Değiştir</h3>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mevcut Şifre
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="pr-10"
                      placeholder="Mevcut şifrenizi girin"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="pr-10"
                      placeholder="Yeni şifrenizi girin"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    En az 8 karakter, büyük/küçük harf ve sayı içermelidir
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Yeni Şifre Tekrar
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="pr-10"
                      placeholder="Yeni şifrenizi tekrar girin"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  onClick={changePassword} 
                  disabled={isLoading || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isLoading ? 'Şifre Değiştiriliyor...' : 'Şifre Değiştir'}
                </Button>
              </div>
            </div>
          </DashboardCard>

          {/* Active Devices */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Monitor className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aktif Cihazlar</h3>
              </div>

              <div className="space-y-4">
                {activeDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start space-x-3">
                      {device.device_name.toLowerCase().includes('iphone') || device.device_name.toLowerCase().includes('mobile') ? (
                        <Smartphone className="h-5 w-5 text-gray-400 mt-1" />
                      ) : (
                        <Monitor className="h-5 w-5 text-gray-400 mt-1" />
                      )}
                      <div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{device.device_name}</h4>
                            {device.is_current && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Mevcut Cihaz
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{device.browser}</p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{device.location} • {device.last_active}</p>
                      </div>
                    </div>
                    {!device.is_current && (
                      <Button
                        onClick={() => logoutDevice(device.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Çıkış Yap
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Info */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Abonelik Bilgileri</h3>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg border border-blue-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{subscription.plan_name}</h4>
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    subscription.status === 'active' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  )}>
                    {subscription.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Başlangıç Tarihi</p>
                    <p className="font-medium text-gray-900 dark:text-white">{subscription.start_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bitiş Tarihi</p>
                    <p className="font-medium text-gray-900 dark:text-white">{subscription.end_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fiyat</p>
                    <p className="font-medium text-gray-900 dark:text-white">₺{subscription.price}</p>
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Payment Methods */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ödeme Yöntemleri</h3>
                </div>
                <Button 
                  onClick={() => setShowAddCardModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Kart Ekle
                </Button>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{method.brand}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 dark:text-white">**** **** **** {method.last_four}</p>
                          {method.is_default && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Varsayılan
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Son kullanma: {method.expires}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removePaymentMethod(method.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          {/* Invoice History */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Download className="h-6 w-6 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fatura Geçmişi</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Fatura No</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Tarih</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Tutar</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Durum</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{invoice.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{invoice.date}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">₺{invoice.amount}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            invoice.status === 'paid' 
                              ? "bg-green-100 text-green-800" 
                              : invoice.status === 'pending'
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          )}>
                            {invoice.status === 'paid' ? 'Ödendi' : invoice.status === 'pending' ? 'Bekliyor' : 'Başarısız'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            onClick={() => downloadInvoice(invoice)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            indir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Yeni Kart Ekle</h3>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kart Üzerindeki İsim
                </label>
                <Input
                  type="text"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kart Numarası
                </label>
                <Input
                  type="text"
                  value={newCard.card_number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                    if (value.replace(/\s/g, '').length <= 16) {
                      setNewCard({ ...newCard, card_number: value });
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  className="w-full"
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Son Kullanma
                  </label>
                  <Input
                    type="text"
                    value={newCard.expiry}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                      if (value.length <= 5) {
                        setNewCard({ ...newCard, expiry: value });
                      }
                    }}
                    placeholder="MM/YY"
                    className="w-full"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CVC
                  </label>
                  <Input
                    type="text"
                    value={newCard.cvc}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 3) {
                        setNewCard({ ...newCard, cvc: value });
                      }
                    }}
                    placeholder="123"
                    className="w-full"
                    maxLength={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => setShowAddCardModal(false)}
                variant="outline"
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={addPaymentMethod}
                disabled={!newCard.name || !newCard.card_number || !newCard.expiry || !newCard.cvc || isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Ekleniyor...' : 'Kart Ekle'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Toaster
        position="top-left"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </DashboardLayout>
  );
}
