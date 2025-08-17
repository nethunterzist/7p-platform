/**
 * MOCK SETTINGS DATA - 7P Education
 * Ayarlar sayfası için organize edilmiş data
 */

export interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  job_title?: string;
}

export interface PlatformPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'tr' | 'en';
  timezone: string;
  default_landing_page: string;
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
}

export interface NotificationSettings {
  new_courses: boolean;
  course_updates: boolean;
  new_comments: boolean;
  system_notifications: boolean;
  promotional_emails: boolean;
  weekly_digest: boolean;
  assignment_reminders: boolean;
  forum_mentions: boolean;
}

export interface ActiveDevice {
  id: string;
  device_name: string;
  browser: string;
  operating_system: string;
  location: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
  first_seen: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last_four: string;
  brand: string;
  expires: string;
  is_default: boolean;
  cardholder_name: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  plan_name: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  price: number;
  currency: string;
  auto_renewal: boolean;
  next_billing_date?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  pdf_url: string;
  description: string;
  payment_method: string;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout: number;
  password_last_changed: string;
  login_attempts_limit: number;
  account_locked: boolean;
}

// 👤 DEFAULT USER PROFILE
export const DEFAULT_USER_PROFILE: UserProfile = {
  full_name: 'Demo Kullanıcı',
  email: 'demo@7peducation.com',
  phone: '+90 555 123 45 67',
  avatar_url: '/images/avatars/demo-user.jpg',
  bio: 'E-ticaret ve dijital pazarlama alanında gelişmeye odaklı bir girişimci.',
  location: 'İstanbul, Türkiye',
  website: 'https://demo-eticaret.com',
  company: 'Demo E-ticaret Ltd.',
  job_title: 'E-ticaret Uzmanı'
};

// ⚙️ DEFAULT PLATFORM PREFERENCES
export const DEFAULT_PLATFORM_PREFERENCES: PlatformPreferences = {
  theme: 'system',
  language: 'tr',
  timezone: 'Europe/Istanbul',
  default_landing_page: '/dashboard',
  email_notifications: true,
  push_notifications: true,
  marketing_emails: false
};

// 🔔 DEFAULT NOTIFICATION SETTINGS
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  new_courses: true,
  course_updates: true,
  new_comments: false,
  system_notifications: true,
  promotional_emails: false,
  weekly_digest: true,
  assignment_reminders: true,
  forum_mentions: true
};

// 💻 MOCK ACTIVE DEVICES
export const MOCK_ACTIVE_DEVICES: ActiveDevice[] = [
  {
    id: '1',
    device_name: 'MacBook Pro 16"',
    browser: 'Chrome 120.0.6099.129',
    operating_system: 'macOS Sonoma 14.2',
    location: 'İstanbul, Türkiye',
    ip_address: '85.102.***.**',
    last_active: '2 dakika önce',
    is_current: true,
    first_seen: '2024-01-15T09:30:00Z'
  },
  {
    id: '2',
    device_name: 'iPhone 14 Pro',
    browser: 'Safari Mobile 17.2',
    operating_system: 'iOS 17.2.1',
    location: 'İstanbul, Türkiye',
    ip_address: '85.102.***.**',
    last_active: '3 saat önce',
    is_current: false,
    first_seen: '2024-01-10T14:45:00Z'
  },
  {
    id: '3',
    device_name: 'Windows Desktop',
    browser: 'Microsoft Edge 120.0.2210.77',
    operating_system: 'Windows 11 Pro',
    location: 'Ankara, Türkiye',
    ip_address: '78.165.***.**',
    last_active: '1 gün önce',
    is_current: false,
    first_seen: '2024-01-08T11:20:00Z'
  },
  {
    id: '4',
    device_name: 'Samsung Galaxy S23',
    browser: 'Samsung Internet 23.0',
    operating_system: 'Android 14',
    location: 'İzmir, Türkiye',
    ip_address: '212.156.***.**',
    last_active: '2 gün önce',
    is_current: false,
    first_seen: '2024-01-05T16:30:00Z'
  }
];

// 💳 MOCK PAYMENT METHODS
export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    last_four: '4242',
    brand: 'Visa',
    expires: '12/26',
    is_default: true,
    cardholder_name: 'Demo Kullanıcı',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    type: 'card',
    last_four: '5555',
    brand: 'Mastercard',
    expires: '08/25',
    is_default: false,
    cardholder_name: 'Demo Kullanıcı',
    created_at: '2024-01-10T14:30:00Z'
  }
];

// 💎 MOCK SUBSCRIPTION
export const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub_1',
  plan_name: 'Premium Plan',
  plan_type: 'yearly',
  start_date: '2024-01-15',
  end_date: '2025-01-15',
  status: 'active',
  price: 2999,
  currency: 'TRY',
  auto_renewal: true,
  next_billing_date: '2025-01-15'
};

// 🧾 MOCK INVOICES
export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_1',
    invoice_number: 'INV-2024-001',
    date: '2024-01-15',
    amount: 2999,
    currency: 'TRY',
    status: 'paid',
    pdf_url: '/invoices/INV-2024-001.pdf',
    description: 'Premium Plan - Yıllık Abonelik',
    payment_method: 'Visa ****4242'
  },
  {
    id: 'inv_2',
    invoice_number: 'INV-2023-012',
    date: '2023-12-15',
    amount: 299,
    currency: 'TRY',
    status: 'paid',
    pdf_url: '/invoices/INV-2023-012.pdf',
    description: 'Hızlı Başlangıç Paketi',
    payment_method: 'Mastercard ****5555'
  },
  {
    id: 'inv_3',
    invoice_number: 'INV-2023-011',
    date: '2023-11-28',
    amount: 1799,
    currency: 'TRY',
    status: 'paid',
    pdf_url: '/invoices/INV-2023-011.pdf',
    description: 'Ürün Araştırması Uzmanlığı',
    payment_method: 'Visa ****4242'
  }
];

// 🔒 MOCK SECURITY SETTINGS
export const MOCK_SECURITY_SETTINGS: SecuritySettings = {
  two_factor_enabled: false,
  login_notifications: true,
  session_timeout: 24, // hours
  password_last_changed: '2024-01-10T10:30:00Z',
  login_attempts_limit: 5,
  account_locked: false
};

// 🌍 AVAILABLE LANGUAGES
export const AVAILABLE_LANGUAGES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

// 🕒 AVAILABLE TIMEZONES
export const AVAILABLE_TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'İstanbul (GMT+3)' },
  { value: 'Europe/London', label: 'Londra (GMT+0)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' }
];

// 📄 LANDING PAGE OPTIONS
export const LANDING_PAGE_OPTIONS = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/courses', label: 'Eğitimler' },
  { value: '/library', label: 'Kütüphane' },
  { value: '/discussions', label: 'Tartışmalar' }
];

// 🎨 THEME OPTIONS
export const THEME_OPTIONS = [
  { value: 'light', label: 'Açık Tema', icon: '☀️' },
  { value: 'dark', label: 'Koyu Tema', icon: '🌙' },
  { value: 'system', label: 'Sistem', icon: '⚙️' }
];

// 📊 USER ACTIVITY STATS
export const USER_ACTIVITY_STATS = {
  total_courses_completed: 3,
  total_watch_time: 45, // hours
  forum_posts: 12,
  forum_replies: 23,
  resources_downloaded: 8,
  certificates_earned: 2,
  login_streak: 7, // days
  account_created: '2023-11-15T08:00:00Z'
};

// 🛠️ UTILITY FUNCTIONS
export function getUserProfile(): UserProfile {
  return { ...DEFAULT_USER_PROFILE };
}

export function getPlatformPreferences(): PlatformPreferences {
  return { ...DEFAULT_PLATFORM_PREFERENCES };
}

export function getNotificationSettings(): NotificationSettings {
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

export function getActiveDevices(): ActiveDevice[] {
  return [...MOCK_ACTIVE_DEVICES];
}

export function getPaymentMethods(): PaymentMethod[] {
  return [...MOCK_PAYMENT_METHODS];
}

export function getSubscription(): Subscription {
  return { ...MOCK_SUBSCRIPTION };
}

export function getInvoices(): Invoice[] {
  return [...MOCK_INVOICES];
}

export function getSecuritySettings(): SecuritySettings {
  return { ...MOCK_SECURITY_SETTINGS };
}

export function getDeviceById(id: string): ActiveDevice | undefined {
  return MOCK_ACTIVE_DEVICES.find(device => device.id === id);
}

export function getPaymentMethodById(id: string): PaymentMethod | undefined {
  return MOCK_PAYMENT_METHODS.find(method => method.id === id);
}

export function getInvoiceById(id: string): Invoice | undefined {
  return MOCK_INVOICES.find(invoice => invoice.id === id);
}