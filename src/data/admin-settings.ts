// Database Management Types and Data
export interface DatabaseTable {
  name: string;
  rows: number;
  size: string;
  lastUpdate: string;
  status: 'healthy' | 'warning' | 'error';
}

export interface DatabaseStats {
  totalSize: string;
  totalTables: number;
  totalRows: number;
  connections: number;
  uptime: string;
  lastBackup: string;
}

export const databaseTables: DatabaseTable[] = [
  {
    name: 'users',
    rows: 1247,
    size: '2.4 MB',
    lastUpdate: '2024-01-15T10:30:00Z',
    status: 'healthy'
  },
  {
    name: 'courses',
    rows: 28,
    size: '856 KB',
    lastUpdate: '2024-01-15T09:15:00Z',
    status: 'healthy'
  },
  {
    name: 'lessons',
    rows: 342,
    size: '4.2 MB',
    lastUpdate: '2024-01-15T08:45:00Z',
    status: 'healthy'
  },
  {
    name: 'enrollments',
    rows: 3891,
    size: '1.8 MB',
    lastUpdate: '2024-01-15T10:00:00Z',
    status: 'healthy'
  },
  {
    name: 'progress',
    rows: 15632,
    size: '12.3 MB',
    lastUpdate: '2024-01-15T10:25:00Z',
    status: 'healthy'
  },
  {
    name: 'payments',
    rows: 892,
    size: '3.1 MB',
    lastUpdate: '2024-01-15T10:20:00Z',
    status: 'healthy'
  },
  {
    name: 'discussions',
    rows: 567,
    size: '2.8 MB',
    lastUpdate: '2024-01-15T09:30:00Z',
    status: 'warning'
  },
  {
    name: 'support_tickets',
    rows: 123,
    size: '445 KB',
    lastUpdate: '2024-01-15T10:30:00Z',
    status: 'healthy'
  }
];

export const databaseStats: DatabaseStats = {
  totalSize: '28.2 MB',
  totalTables: 8,
  totalRows: 22722,
  connections: 12,
  uptime: '27 gün 14 saat',
  lastBackup: '2024-01-15T02:00:00Z'
};

// Security Settings Types and Data
export interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  ip: string;
  status: 'success' | 'failed' | 'blocked';
  details: string;
}

export interface LoginAttempt {
  timestamp: string;
  ip: string;
  email: string;
  status: 'success' | 'failed' | 'blocked';
  location: string;
}

export interface SecurityStats {
  totalLogins: number;
  failedLogins: number;
  blockedIps: number;
  activeUsers: number;
  lastSecurityScan: string;
}

export const securityLogs: SecurityLog[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    event: 'Admin Login',
    user: 'admin@7peducation.com',
    ip: '192.168.1.100',
    status: 'success',
    details: 'Başarılı admin girişi'
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:15:00Z',
    event: 'Failed Login',
    user: 'test@example.com',
    ip: '45.123.45.67',
    status: 'failed',
    details: 'Yanlış şifre - 3. deneme'
  },
  {
    id: '3',
    timestamp: '2024-01-15T09:45:00Z',
    event: 'IP Blocked',
    user: 'unknown',
    ip: '185.234.56.78',
    status: 'blocked',
    details: '5 başarısız giriş denemesi sonrası engellendi'
  },
  {
    id: '4',
    timestamp: '2024-01-15T09:30:00Z',
    event: 'Password Reset',
    user: 'mehmet.yilmaz@gmail.com',
    ip: '78.123.45.89',
    status: 'success',
    details: 'Şifre sıfırlama başarılı'
  },
  {
    id: '5',
    timestamp: '2024-01-15T08:20:00Z',
    event: 'User Login',
    user: 'ayse.demir@hotmail.com',
    ip: '94.234.67.12',
    status: 'success',
    details: 'Normal kullanıcı girişi'
  }
];

export const loginAttempts: LoginAttempt[] = [
  {
    timestamp: '2024-01-15T10:30:00Z',
    ip: '192.168.1.100',
    email: 'admin@7peducation.com',
    status: 'success',
    location: 'Istanbul, TR'
  },
  {
    timestamp: '2024-01-15T10:15:00Z',
    ip: '45.123.45.67',
    email: 'test@example.com',
    status: 'failed',
    location: 'Unknown'
  },
  {
    timestamp: '2024-01-15T09:45:00Z',
    ip: '185.234.56.78',
    email: 'admin@test.com',
    status: 'blocked',
    location: 'Moscow, RU'
  },
  {
    timestamp: '2024-01-15T09:30:00Z',
    ip: '78.123.45.89',
    email: 'mehmet.yilmaz@gmail.com',
    status: 'success',
    location: 'Ankara, TR'
  },
  {
    timestamp: '2024-01-15T08:20:00Z',
    ip: '94.234.67.12',
    email: 'ayse.demir@hotmail.com',
    status: 'success',
    location: 'Izmir, TR'
  }
];

export const securityStats: SecurityStats = {
  totalLogins: 1247,
  failedLogins: 23,
  blockedIps: 5,
  activeUsers: 156,
  lastSecurityScan: '2024-01-15T02:00:00Z'
};

// System Settings Types and Data
export interface SystemSetting {
  key: string;
  label: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'select';
  category: 'general' | 'email' | 'payment' | 'storage' | 'security';
  description: string;
  options?: string[];
}

export interface SystemStats {
  serverUptime: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  totalRequests: number;
}

export const systemSettings: SystemSetting[] = [
  // General Settings
  {
    key: 'site_name',
    label: 'Site Adı',
    value: '7P Education',
    type: 'text',
    category: 'general',
    description: 'Platformun ana adı'
  },
  {
    key: 'site_description',
    label: 'Site Açıklaması',
    value: 'Amazon FBA ve E-ticaret Eğitim Platformu',
    type: 'text',
    category: 'general',
    description: 'Platform açıklaması'
  },
  {
    key: 'maintenance_mode',
    label: 'Bakım Modu',
    value: false,
    type: 'boolean',
    category: 'general',
    description: 'Site bakım modunda mı?'
  },
  {
    key: 'user_registration',
    label: 'Kullanıcı Kaydı',
    value: true,
    type: 'boolean',
    category: 'general',
    description: 'Yeni kullanıcı kaydına izin ver'
  },
  {
    key: 'max_file_size',
    label: 'Maksimum Dosya Boyutu (MB)',
    value: 50,
    type: 'number',
    category: 'general',
    description: 'Yüklenebilecek maksimum dosya boyutu'
  },
  
  // Email Settings
  {
    key: 'smtp_host',
    label: 'SMTP Host',
    value: 'smtp.gmail.com',
    type: 'text',
    category: 'email',
    description: 'Email sunucu adresi'
  },
  {
    key: 'smtp_port',
    label: 'SMTP Port',
    value: 587,
    type: 'number',
    category: 'email',
    description: 'Email sunucu portu'
  },
  {
    key: 'from_email',
    label: 'Gönderen Email',
    value: 'noreply@7peducation.com',
    type: 'text',
    category: 'email',
    description: 'Sistem emaillerinin gönderen adresi'
  },
  
  // Payment Settings
  {
    key: 'payment_provider',
    label: 'Ödeme Sağlayıcı',
    value: 'stripe',
    type: 'select',
    category: 'payment',
    description: 'Kullanılacak ödeme sistemı',
    options: ['stripe', 'paypal', 'iyzico']
  },
  {
    key: 'currency',
    label: 'Para Birimi',
    value: 'TRY',
    type: 'select',
    category: 'payment',
    description: 'Varsayılan para birimi',
    options: ['TRY', 'USD', 'EUR']
  },
  {
    key: 'tax_rate',
    label: 'KDV Oranı (%)',
    value: 20,
    type: 'number',
    category: 'payment',
    description: 'Uygulanacak vergi oranı'
  },
  
  // Storage Settings
  {
    key: 'storage_provider',
    label: 'Depolama Sağlayıcı',
    value: 'aws_s3',
    type: 'select',
    category: 'storage',
    description: 'Dosya depolama sistemi',
    options: ['local', 'aws_s3', 'google_cloud', 'azure']
  },
  {
    key: 'max_storage_per_user',
    label: 'Kullanıcı Başına Maksimum Depolama (GB)',
    value: 5,
    type: 'number',
    category: 'storage',
    description: 'Her kullanıcının kullanabileceği maksimum depolama alanı'
  },
  
  // Security Settings
  {
    key: 'session_timeout',
    label: 'Oturum Zaman Aşımı (dakika)',
    value: 60,
    type: 'number',
    category: 'security',
    description: 'Kullanıcı oturumunun otomatik kapanma süresi'
  },
  {
    key: 'max_login_attempts',
    label: 'Maksimum Giriş Denemesi',
    value: 5,
    type: 'number',
    category: 'security',
    description: 'IP engellenmeden önce maksimum başarısız giriş denemesi'
  },
  {
    key: 'password_min_length',
    label: 'Minimum Şifre Uzunluğu',
    value: 8,
    type: 'number',
    category: 'security',
    description: 'Kullanıcı şifrelerinin minimum karakter sayısı'
  },
  {
    key: 'two_factor_auth',
    label: 'İki Faktörlü Doğrulama',
    value: true,
    type: 'boolean',
    category: 'security',
    description: '2FA zorunlu mu?'
  }
];

export const systemStats: SystemStats = {
  serverUptime: '27 gün 14 saat 32 dakika',
  cpuUsage: 23,
  memoryUsage: 67,
  diskUsage: 45,
  activeConnections: 156,
  totalRequests: 847632
};