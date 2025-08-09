"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { 
  Settings,
  User,
  Shield,
  Bell,
  Eye,
  Palette,
  Globe,
  Clock,
  Lock,
  Download,
  Camera,
  Save,
  AlertTriangle,
  Check,
  X,
  Sun,
  Moon,
  Smartphone,
  Mail,
  MessageSquare,
  Volume2
} from 'lucide-react';

// Interfaces for type safety
interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  avatar_url: string | null;
  learning_goals: string[];
  interests: string[];
  timezone: string;
  language: string;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_sessions: Array<{
    id: string;
    device: string;
    location: string;
    last_active: string;
    current: boolean;
  }>;
}

interface NotificationSettings {
  email_course_updates: boolean;
  email_assignments: boolean;
  email_messages: boolean;
  email_marketing: boolean;
  push_enabled: boolean;
  push_assignments: boolean;
  push_messages: boolean;
  sms_enabled: boolean;
  sms_reminders: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

interface LearningPreferences {
  preferred_study_time: string;
  reminder_enabled: boolean;
  reminder_time: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  content_language: 'tr' | 'en';
  subtitles_enabled: boolean;
  autoplay_videos: boolean;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends';
  progress_visibility: 'public' | 'private' | 'friends';
  contact_sharing: boolean;
  data_collection: boolean;
  analytics_tracking: boolean;
}

interface PlatformPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebar_collapsed: boolean;
  dashboard_layout: 'grid' | 'list';
  default_landing_page: string;
  animations_enabled: boolean;
}

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  enabled, 
  onChange, 
  disabled = false,
  label 
}) => (
  <div className="flex items-center space-x-3">
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50",
        enabled ? "bg-blue-600" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
    {label && (
      <span className={cn(
        "text-sm font-medium",
        disabled ? "text-gray-400" : "text-gray-900"
      )}>
        {label}
      </span>
    )}
  </div>
);

// Select Component
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ 
  value, 
  onChange, 
  options, 
  className,
  disabled = false 
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// File Upload Component
interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  currentImage?: string | null;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  currentImage,
  className 
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  return (
    <div className={cn("flex items-center space-x-4", className)}>
      <div className="relative">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
          {currentImage ? (
            <img 
              src={currentImage} 
              alt="Avatar" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <User className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <label 
          htmlFor="avatar-upload" 
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
        >
          <Camera className="w-4 h-4" />
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

// Confirmation Dialog Component
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type: 'danger' | 'warning' | 'info';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start space-x-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", styles.bgColor)}>
            <IconComponent className={cn("w-6 h-6", styles.iconColor)} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 mb-6">
              {description}
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={onConfirm}
                className={cn("text-white", styles.buttonColor)}
              >
                Onayla
              </Button>
              <Button variant="outline" onClick={onClose}>
                İptal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Notification Component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: Check,
          iconColor: 'text-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: X,
          iconColor: 'text-red-500'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: Check,
          iconColor: 'text-blue-500'
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={cn(
        "flex items-center space-x-3 p-4 rounded-lg border",
        styles.bg
      )}>
        <IconComponent className={cn("w-5 h-5", styles.iconColor)} />
        <p className={cn("font-medium", styles.text)}>
          {message}
        </p>
        <button
          onClick={onClose}
          className={cn("ml-4", styles.iconColor)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  // State management
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState<string | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  // Settings states
  const [profile, setProfile] = useState<UserProfile>({
    full_name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    phone: '+90 555 123 45 67',
    bio: 'E-ticaret ve dijital pazarlama konularında gelişim gösteren bir öğrenciyim.',
    avatar_url: null,
    learning_goals: ['E-ticaret Uzmanlığı', 'PPC Reklamcılığı', 'Ürün Araştırması'],
    interests: ['Pazarlama', 'Teknoloji', 'Girişimcilik'],
    timezone: 'Europe/Istanbul',
    language: 'tr'
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_sessions: [
      {
        id: '1',
        device: 'Chrome - Windows',
        location: 'İstanbul, Türkiye',
        last_active: '2 dakika önce',
        current: true
      },
      {
        id: '2',
        device: 'Safari - iPhone',
        location: 'İstanbul, Türkiye',
        last_active: '1 saat önce',
        current: false
      }
    ]
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_course_updates: true,
    email_assignments: true,
    email_messages: true,
    email_marketing: false,
    push_enabled: true,
    push_assignments: true,
    push_messages: true,
    sms_enabled: false,
    sms_reminders: false,
    frequency: 'immediate'
  });

  const [learning, setLearning] = useState<LearningPreferences>({
    preferred_study_time: '20:00',
    reminder_enabled: true,
    reminder_time: '19:00',
    difficulty_level: 'intermediate',
    content_language: 'tr',
    subtitles_enabled: true,
    autoplay_videos: false
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profile_visibility: 'private',
    progress_visibility: 'private',
    contact_sharing: false,
    data_collection: true,
    analytics_tracking: true
  });

  const [platform, setPlatform] = useState<PlatformPreferences>({
    theme: 'light',
    sidebar_collapsed: false,
    dashboard_layout: 'grid',
    default_landing_page: '/dashboard',
    animations_enabled: true
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Handlers
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage for persistence
      const settings = {
        profile,
        security,
        notifications,
        learning,
        privacy,
        platform
      };
      localStorage.setItem('7p_user_settings', JSON.stringify(settings));
      
      setHasChanges(false);
      showToast('Ayarlarınız başarıyla kaydedildi!', 'success');
    } catch (error) {
      showToast('Ayarlar kaydedilirken bir hata oluştu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      showToast('Yeni şifreler eşleşmiyor.', 'error');
      return;
    }
    
    if (passwordData.new.length < 6) {
      showToast('Şifre en az 6 karakter olmalıdır.', 'error');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowPasswordDialog(false);
      showToast('Şifreniz başarıyla değiştirildi!', 'success');
    } catch (error) {
      showToast('Şifre değiştirilirken bir hata oluştu.', 'error');
    }
  };

  const handleSessionTerminate = async (sessionId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSecurity(prev => ({
        ...prev,
        login_sessions: prev.login_sessions.filter(s => s.id !== sessionId)
      }));
      setShowSessionDialog(null);
      showToast('Oturum sonlandırıldı.', 'success');
    } catch (error) {
      showToast('Oturum sonlandırılırken bir hata oluştu.', 'error');
    }
  };

  const handleAccountDelete = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowDeleteDialog(false);
      showToast('Hesap silme talebiniz işleme alındı.', 'info');
    } catch (error) {
      showToast('Hesap silinirken bir hata oluştu.', 'error');
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (file) {
      // Simulate file upload
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({ ...prev, avatar_url: e.target?.result as string }));
        setHasChanges(true);
        showToast('Profil fotoğrafı güncellendi.', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDataExport = async () => {
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      const data = { profile, learning, privacy };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '7p_education_data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Verileriniz indirildi.', 'success');
    } catch (error) {
      showToast('Veri indirme hatası.', 'error');
    }
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('7p_user_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.security) setSecurity(parsed.security);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.learning) setLearning(parsed.learning);
        if (parsed.privacy) setPrivacy(parsed.privacy);
        if (parsed.platform) setPlatform(parsed.platform);
      } catch (error) {
        console.error('Settings load error:', error);
      }
    }
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [profile, security, notifications, learning, privacy, platform]);

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'learning', label: 'Öğrenme', icon: Clock },
    { id: 'privacy', label: 'Gizlilik', icon: Eye },
    { id: 'platform', label: 'Platform', icon: Palette }
  ];

  const timeOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `${i.toString().padStart(2, '0')}:00`,
    label: `${i.toString().padStart(2, '0')}:00`
  }));

  const timezoneOptions = [
    { value: 'Europe/Istanbul', label: 'İstanbul (UTC+3)' },
    { value: 'Europe/London', label: 'Londra (UTC+0)' },
    { value: 'America/New_York', label: 'New York (UTC-5)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' }
  ];

  const languageOptions = [
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' }
  ];

  const difficultyOptions = [
    { value: 'beginner', label: 'Başlangıç' },
    { value: 'intermediate', label: 'Orta' },
    { value: 'advanced', label: 'İleri' }
  ];

  const visibilityOptions = [
    { value: 'public', label: 'Herkese Açık' },
    { value: 'friends', label: 'Arkadaşlara Açık' },
    { value: 'private', label: 'Gizli' }
  ];

  const frequencyOptions = [
    { value: 'immediate', label: 'Hemen' },
    { value: 'daily', label: 'Günlük Özet' },
    { value: 'weekly', label: 'Haftalık Özet' }
  ];

  const themeOptions = [
    { value: 'light', label: 'Açık Tema' },
    { value: 'dark', label: 'Koyu Tema' },
    { value: 'system', label: 'Sistem' }
  ];

  const layoutOptions = [
    { value: 'grid', label: 'Izgara Görünümü' },
    { value: 'list', label: 'Liste Görünümü' }
  ];

  const landingPageOptions = [
    { value: '/dashboard', label: 'Dashboard' },
    { value: '/courses', label: 'Eğitimler' },
    { value: '/messages', label: 'Mesajlar' },
    { value: '/profile', label: 'Profil' }
  ];

  return (
    <DashboardLayout
      title="Ayarlar"
      subtitle="Hesap tercihleri ve platform ayarlarınız"
      breadcrumbs={[
        { label: 'Ayarlar' }
      ]}
      actions={
        hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
          </Button>
        )
      }
    >
      <div className="max-w-6xl mx-auto">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="overflow-x-auto">
            <nav className="flex space-x-0">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors",
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Kişisel Bilgiler
                  </h3>
                  
                  <div className="space-y-4">
                    <FileUpload
                      onFileSelect={handleFileUpload}
                      currentImage={profile.avatar_url}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad Soyad
                      </label>
                      <Input
                        value={profile.full_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Adınız ve soyadınız"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-posta
                      </label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-gray-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        E-posta adresiniz değiştirilemez
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+90 555 123 45 67"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hakkımda
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Kendinizden bahsedin..."
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    Bölgesel Ayarlar
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zaman Dilimi
                      </label>
                      <Select
                        value={profile.timezone}
                        onChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}
                        options={timezoneOptions}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dil
                      </label>
                      <Select
                        value={profile.language}
                        onChange={(value) => setProfile(prev => ({ ...prev, language: value }))}
                        options={languageOptions}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Öğrenme Hedefleri
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {profile.learning_goals.map((goal, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İlgi Alanları
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Lock className="w-5 h-5 mr-2" />
                    Şifre ve Güvenlik
                  </h3>
                  
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordDialog(true)}
                      className="w-full justify-start"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Şifre Değiştir
                    </Button>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">İki Faktörlü Doğrulama</h4>
                        <p className="text-sm text-gray-600">
                          Hesabınızı ek güvenlik katmanı ile koruyun
                        </p>
                      </div>
                      <ToggleSwitch
                        enabled={security.two_factor_enabled}
                        onChange={(enabled) => setSecurity(prev => ({ ...prev, two_factor_enabled: enabled }))}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Smartphone className="w-5 h-5 mr-2" />
                    Aktif Oturumlar
                  </h3>
                  
                  <div className="space-y-3">
                    {security.login_sessions.map((session) => (
                      <div 
                        key={session.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center">
                            {session.device}
                            {session.current && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                Mevcut
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {session.location} • {session.last_active}
                          </p>
                        </div>
                        {!session.current && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSessionDialog(session.id)}
                          >
                            Sonlandır
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>

              {/* Danger Zone */}
              <DashboardCard className="lg:col-span-2">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Tehlikeli İşlemler
                  </h3>
                  
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-900 mb-2">
                      Hesabı Sil
                    </h4>
                    <p className="text-sm text-red-700 mb-4">
                      Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinir.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Hesabımı Sil
                    </Button>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    E-posta Bildirimleri
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Kurs Güncellemeleri</h4>
                        <p className="text-sm text-gray-600">Yeni dersler ve içerik</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.email_course_updates}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, email_course_updates: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Ödevler</h4>
                        <p className="text-sm text-gray-600">Ödev teslim tarihleri</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.email_assignments}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, email_assignments: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Mesajlar</h4>
                        <p className="text-sm text-gray-600">Öğretmen ve öğrenci mesajları</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.email_messages}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, email_messages: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Pazarlama</h4>
                        <p className="text-sm text-gray-600">Yeni kurslar ve promosyonlar</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.email_marketing}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, email_marketing: enabled }))}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Anlık Bildirimler
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Push Bildirimleri</h4>
                        <p className="text-sm text-gray-600">Tarayıcı bildirimleri</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.push_enabled}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, push_enabled: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Ödev Bildirimleri</h4>
                        <p className="text-sm text-gray-600">Ödev teslim hatırlatmaları</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.push_assignments}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, push_assignments: enabled }))}
                        disabled={!notifications.push_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Mesaj Bildirimleri</h4>
                        <p className="text-sm text-gray-600">Yeni mesaj bildirimleri</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.push_messages}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, push_messages: enabled }))}
                        disabled={!notifications.push_enabled}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    SMS Bildirimleri
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">SMS Bildirimleri</h4>
                        <p className="text-sm text-gray-600">Önemli güncellemeler</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.sms_enabled}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, sms_enabled: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Çalışma Hatırlatmaları</h4>
                        <p className="text-sm text-gray-600">Günlük çalışma hatırlatmaları</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.sms_reminders}
                        onChange={(enabled) => setNotifications(prev => ({ ...prev, sms_reminders: enabled }))}
                        disabled={!notifications.sms_enabled}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Volume2 className="w-5 h-5 mr-2" />
                    Bildirim Sıklığı
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta Sıklığı
                    </label>
                    <Select
                      value={notifications.frequency}
                      onChange={(value) => setNotifications(prev => ({ ...prev, frequency: value as any }))}
                      options={frequencyOptions}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Bildirimlerin hangi sıklıkta gönderilmesini istiyorsunuz?
                    </p>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {/* Learning Preferences */}
          {activeTab === 'learning' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Çalışma Zamanı
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tercih Edilen Çalışma Saati
                      </label>
                      <Select
                        value={learning.preferred_study_time}
                        onChange={(value) => setLearning(prev => ({ ...prev, preferred_study_time: value }))}
                        options={timeOptions}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Günlük Hatırlatma</h4>
                        <p className="text-sm text-gray-600">Çalışma zamanı hatırlatması</p>
                      </div>
                      <ToggleSwitch
                        enabled={learning.reminder_enabled}
                        onChange={(enabled) => setLearning(prev => ({ ...prev, reminder_enabled: enabled }))}
                      />
                    </div>

                    {learning.reminder_enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hatırlatma Saati
                        </label>
                        <Select
                          value={learning.reminder_time}
                          onChange={(value) => setLearning(prev => ({ ...prev, reminder_time: value }))}
                          options={timeOptions}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    İçerik Tercihleri
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zorluk Seviyesi
                      </label>
                      <Select
                        value={learning.difficulty_level}
                        onChange={(value) => setLearning(prev => ({ ...prev, difficulty_level: value as any }))}
                        options={difficultyOptions}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        İçerik Dili
                      </label>
                      <Select
                        value={learning.content_language}
                        onChange={(value) => setLearning(prev => ({ ...prev, content_language: value as any }))}
                        options={languageOptions}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Alt Yazılar</h4>
                        <p className="text-sm text-gray-600">Video alt yazılarını göster</p>
                      </div>
                      <ToggleSwitch
                        enabled={learning.subtitles_enabled}
                        onChange={(enabled) => setLearning(prev => ({ ...prev, subtitles_enabled: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Otomatik Oynatma</h4>
                        <p className="text-sm text-gray-600">Videoları otomatik başlat</p>
                      </div>
                      <ToggleSwitch
                        enabled={learning.autoplay_videos}
                        onChange={(enabled) => setLearning(prev => ({ ...prev, autoplay_videos: enabled }))}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Görünürlük Ayarları
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Profil Görünürlüğü
                      </label>
                      <Select
                        value={privacy.profile_visibility}
                        onChange={(value) => setPrivacy(prev => ({ ...prev, profile_visibility: value as any }))}
                        options={visibilityOptions}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Profilinizi kimler görebilir?
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Öğrenme İlerleme Durumu
                      </label>
                      <Select
                        value={privacy.progress_visibility}
                        onChange={(value) => setPrivacy(prev => ({ ...prev, progress_visibility: value as any }))}
                        options={visibilityOptions}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Öğrenme ilerlemeni kimler görebilir?
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">İletişim Bilgileri</h4>
                        <p className="text-sm text-gray-600">Telefon ve e-posta paylaşımı</p>
                      </div>
                      <ToggleSwitch
                        enabled={privacy.contact_sharing}
                        onChange={(enabled) => setPrivacy(prev => ({ ...prev, contact_sharing: enabled }))}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Veri ve Analitik
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Veri Toplama</h4>
                        <p className="text-sm text-gray-600">Öğrenme verilerinin toplanması</p>
                      </div>
                      <ToggleSwitch
                        enabled={privacy.data_collection}
                        onChange={(enabled) => setPrivacy(prev => ({ ...prev, data_collection: enabled }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Analitik Takibi</h4>
                        <p className="text-sm text-gray-600">Platform kullanım analizi</p>
                      </div>
                      <ToggleSwitch
                        enabled={privacy.analytics_tracking}
                        onChange={(enabled) => setPrivacy(prev => ({ ...prev, analytics_tracking: enabled }))}
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleDataExport}
                      className="w-full justify-start"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Verilerimi İndir
                    </Button>

                    <div className="text-sm text-gray-500">
                      <p className="mb-2">
                        Kişisel verilerinizin işlenmesi hakkında detaylı bilgi için
                        <a href="/privacy-policy" className="text-blue-600 hover:underline ml-1">
                          Gizlilik Politikamızı
                        </a> inceleyebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {/* Platform Preferences */}
          {activeTab === 'platform' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Palette className="w-5 h-5 mr-2" />
                    Görünüm Ayarları
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tema
                      </label>
                      <Select
                        value={platform.theme}
                        onChange={(value) => setPlatform(prev => ({ ...prev, theme: value as any }))}
                        options={themeOptions}
                      />
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Sun className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">Açık</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Moon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-600">Koyu</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dashboard Düzeni
                      </label>
                      <Select
                        value={platform.dashboard_layout}
                        onChange={(value) => setPlatform(prev => ({ ...prev, dashboard_layout: value as any }))}
                        options={layoutOptions}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Animasyonlar</h4>
                        <p className="text-sm text-gray-600">UI animasyonlarını etkinleştir</p>
                      </div>
                      <ToggleSwitch
                        enabled={platform.animations_enabled}
                        onChange={(enabled) => setPlatform(prev => ({ ...prev, animations_enabled: enabled }))}
                      />
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Navigasyon Ayarları
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Sidebar Durumu</h4>
                        <p className="text-sm text-gray-600">Varsayılan olarak kapalı olsun</p>
                      </div>
                      <ToggleSwitch
                        enabled={platform.sidebar_collapsed}
                        onChange={(enabled) => setPlatform(prev => ({ ...prev, sidebar_collapsed: enabled }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Varsayılan Ana Sayfa
                      </label>
                      <Select
                        value={platform.default_landing_page}
                        onChange={(value) => setPlatform(prev => ({ ...prev, default_landing_page: value }))}
                        options={landingPageOptions}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Giriş yaptıktan sonra hangi sayfaya yönlendirilmek istiyorsunuz?
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Şifre Değiştir
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mevcut Şifre
                </label>
                <Input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                  placeholder="Mevcut şifreniz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre
                </label>
                <Input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                  placeholder="Yeni şifreniz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre (Tekrar)
                </label>
                <Input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Yeni şifrenizi tekrar girin"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button onClick={handlePasswordChange}>
                Şifreyi Değiştir
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleAccountDelete}
        title="Hesabı Sil"
        description="Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinir ve bu hesapla tekrar giriş yapamazsınız."
        type="danger"
      />

      <ConfirmationDialog
        isOpen={showSessionDialog !== null}
        onClose={() => setShowSessionDialog(null)}
        onConfirm={() => showSessionDialog && handleSessionTerminate(showSessionDialog)}
        title="Oturumu Sonlandır"
        description="Bu cihazdan oturum sonlandırılsın mı? Bu işlem geri alınamaz."
        type="warning"
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </DashboardLayout>
  );
}