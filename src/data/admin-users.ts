// Admin User Management Mock Data
export interface AdminUserProfile {
  // Temel Bilgiler
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  username?: string; // Optional field, removed from table display
  
  // Hesap Durumu
  status: 'active' | 'suspended';
  email_verified: boolean;
  created_at: string;
  last_login?: string;
  
  // Rol (sadece görüntüleme, değiştirme yok)
  role: 'admin' | 'student' | 'instructor';
  
  // Abonelik
  subscription: {
    type: 'free' | 'premium';
    start_date?: string;
    end_date?: string;
    auto_renew: boolean;
  };
  
  // Eğitim İstatistikleri
  education_stats: {
    enrolled_courses: number;
    completed_courses: number;
    total_study_hours: number;
    certificates_earned: number;
    current_streak: number;
    average_progress: number;
  };
  
  // Ödeme Bilgileri
  payment_info: {
    total_spent: number;
    last_payment_date?: string;
    payment_methods: number;
    failed_payments: number;
  };
  
  // Aktivite
  activity_stats: {
    forum_posts: number;
    forum_replies: number;
    messages_sent: number;
    support_tickets: number;
    last_activity: string;
  };
  
  // Admin Notları
  admin_notes?: {
    id: string;
    note: string;
    created_by: string;
    created_at: string;
  }[];
  
  // Kurs Geçmişi
  course_history?: {
    course_id: string;
    course_name: string;
    enrolled_date: string;
    progress: number;
    last_accessed?: string;
    completion_date?: string;
    certificate_issued?: boolean;
  }[];
  
  // Ödeme Geçmişi
  payment_history?: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    date: string;
    description: string;
  }[];
  
  // Giriş Geçmişi
  login_history?: {
    timestamp: string;
    ip_address: string;
    device: string;
    location?: string;
  }[];
}

// Türkçe isim ve soyisimler
const firstNames = [
  'Ahmet', 'Mehmet', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Ömer', 'Osman', 'Yusuf', 'İsmail',
  'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Şerife', 'Zehra', 'Sultan',
  'Mustafa', 'Murat', 'Kemal', 'Cem', 'Can', 'Emre', 'Burak', 'Onur', 'Serkan', 'Özgür',
  'Selin', 'Deniz', 'Büşra', 'Esra', 'Merve', 'Gizem', 'Tuğba', 'Nur', 'Ebru', 'Aslı',
  'Furkan', 'Kaan', 'Arda', 'Baran', 'Eren', 'Berkay', 'Tolga', 'Serhat', 'Umut', 'Barış'
];

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Aydın', 'Öztürk', 'Özdemir', 'Arslan',
  'Doğan', 'Güneş', 'Polat', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Aktaş', 'Erdoğan', 'Güler',
  'Can', 'Korkmaz', 'Çetin', 'Özer', 'Özgür', 'Keskin', 'Güven', 'Kılıç', 'Aslan', 'Avcı',
  'Yavuz', 'Uysal', 'Erdem', 'Duman', 'Yalçın', 'Tekin', 'Çakır', 'Ünal', 'Kaplan', 'Ayhan'
];

// Amazon FBA ve E-ticaret kursları
const courses = [
  { id: 'course-1', name: 'Amazon FBA Başlangıç Rehberi' },
  { id: 'course-2', name: 'Ürün Araştırma ve Analiz Teknikleri' },
  { id: 'course-3', name: 'Amazon PPC Reklamcılığı' },
  { id: 'course-4', name: 'E-ticaret Lojistik Yönetimi' },
  { id: 'course-5', name: 'Dropshipping Mastery' },
  { id: 'course-6', name: 'Sosyal Medya Pazarlama' },
  { id: 'course-7', name: 'SEO ve İçerik Pazarlama' },
  { id: 'course-8', name: 'E-posta Pazarlama Stratejileri' },
  { id: 'course-9', name: 'Müşteri Hizmetleri ve CRM' },
  { id: 'course-10', name: 'Finansal Planlama ve Vergi' }
];

// Helper functions
function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function generateEmail(firstName: string, lastName: string): string {
  const providers = ['gmail.com', 'hotmail.com', 'outlook.com', 'yandex.com', 'yahoo.com'];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  const cleanFirstName = firstName.toLowerCase().replace(/[ğüşıöç]/g, (char) => {
    const map: { [key: string]: string } = { 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c' };
    return map[char] || char;
  });
  const cleanLastName = lastName.toLowerCase().replace(/[ğüşıöç]/g, (char) => {
    const map: { [key: string]: string } = { 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c' };
    return map[char] || char;
  });
  const random = Math.floor(Math.random() * 100);
  return `${cleanFirstName}.${cleanLastName}${random}@${provider}`;
}

function generatePhone(): string {
  const operators = ['532', '533', '534', '535', '536', '537', '538', '539', '542', '543', '544', '545', '546', '547', '548', '549', '552', '553', '554', '555', '556', '557', '558', '559'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `0${operator}${number}`;
}

function generateAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
}

function generateCourseHistory(): AdminUserProfile['course_history'] {
  const numCourses = Math.floor(Math.random() * 5) + 1;
  const selectedCourses = [...courses].sort(() => 0.5 - Math.random()).slice(0, numCourses);
  
  return selectedCourses.map(course => {
    const enrolledDate = randomDate(new Date(2023, 0, 1), new Date());
    const progress = Math.floor(Math.random() * 101);
    const isCompleted = progress === 100;
    
    return {
      course_id: course.id,
      course_name: course.name,
      enrolled_date: enrolledDate,
      progress,
      last_accessed: randomDate(new Date(enrolledDate), new Date()),
      completion_date: isCompleted ? randomDate(new Date(enrolledDate), new Date()) : undefined,
      certificate_issued: isCompleted && Math.random() > 0.2
    };
  });
}

function generatePaymentHistory(): AdminUserProfile['payment_history'] {
  const numPayments = Math.floor(Math.random() * 10) + 1;
  const payments: AdminUserProfile['payment_history'] = [];
  
  for (let i = 0; i < numPayments; i++) {
    const amount = Math.floor(Math.random() * 500) + 50;
    const statuses: Array<'completed' | 'pending' | 'failed' | 'refunded'> = ['completed', 'completed', 'completed', 'pending', 'failed', 'refunded'];
    const methods = ['Kredi Kartı', 'Banka Transferi', 'PayPal', 'Havale/EFT'];
    
    payments.push({
      id: `payment-${Date.now()}-${i}`,
      amount,
      currency: 'TRY',
      method: methods[Math.floor(Math.random() * methods.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      date: randomDate(new Date(2023, 0, 1), new Date()),
      description: Math.random() > 0.5 ? 'Premium Abonelik' : 'Kurs Satın Alma'
    });
  }
  
  return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateLoginHistory(): AdminUserProfile['login_history'] {
  const devices = ['Chrome/Windows', 'Safari/macOS', 'Chrome/Android', 'Safari/iOS', 'Firefox/Windows', 'Edge/Windows'];
  const locations = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Eskişehir'];
  
  const numLogins = Math.floor(Math.random() * 20) + 5;
  const logins: AdminUserProfile['login_history'] = [];
  
  for (let i = 0; i < numLogins; i++) {
    logins.push({
      timestamp: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      ip_address: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      device: devices[Math.floor(Math.random() * devices.length)],
      location: locations[Math.floor(Math.random() * locations.length)]
    });
  }
  
  return logins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateAdminNotes(): AdminUserProfile['admin_notes'] {
  const notes = [
    'Kullanıcı ödeme konusunda destek talep etti, sorun çözüldü.',
    'Premium abonelik için indirim kodu talep etti.',
    'Kurs içeriği hakkında geri bildirim verdi.',
    'Teknik sorun yaşadı, destek ekibi yardımcı oldu.',
    'Aktif bir öğrenci, düzenli olarak kurslara katılıyor.',
    'Ödeme yöntemi güncelleme talebinde bulundu.',
    'Forum kurallarına uymadığı için uyarıldı.',
    'Mükemmel bir ilerleme gösteriyor, tebrik edildi.',
    'Hesap güvenliği için 2FA aktif edildi.',
    'Kurslardaki başarısından dolayı özel indirim verildi.'
  ];
  
  const admins = ['Admin User', 'Support Team', 'Furkan Y.', 'System Admin'];
  const numNotes = Math.floor(Math.random() * 3);
  const adminNotes: AdminUserProfile['admin_notes'] = [];
  
  for (let i = 0; i < numNotes; i++) {
    adminNotes.push({
      id: `note-${Date.now()}-${i}`,
      note: notes[Math.floor(Math.random() * notes.length)],
      created_by: admins[Math.floor(Math.random() * admins.length)],
      created_at: randomDate(new Date(2023, 0, 1), new Date())
    });
  }
  
  return adminNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Generate mock users
function generateMockUser(index: number): AdminUserProfile {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fullName = `${firstName} ${lastName}`;
  const email = generateEmail(firstName, lastName);
  const createdAt = randomDate(new Date(2022, 0, 1), new Date());
  const lastLogin = Math.random() > 0.2 ? randomDate(new Date(createdAt), new Date()) : undefined;
  
  // Role distribution: 80% students, 15% instructors, 5% admins
  const roleRandom = Math.random();
  const role: AdminUserProfile['role'] = roleRandom < 0.8 ? 'student' : roleRandom < 0.95 ? 'instructor' : 'admin';
  
  // Status distribution: 85% active, 15% suspended
  const statusRandom = Math.random();
  const status: AdminUserProfile['status'] = statusRandom < 0.85 ? 'active' : 'suspended';
  
  // Subscription distribution: 50% free, 50% premium
  const subRandom = Math.random();
  const subscriptionType: AdminUserProfile['subscription']['type'] = subRandom < 0.5 ? 'free' : 'premium';
  
  const courseHistory = generateCourseHistory();
  const paymentHistory = generatePaymentHistory();
  const totalSpent = paymentHistory
    ?.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0) || 0;
  
  return {
    id: `user-${index + 1}`,
    full_name: fullName,
    email,
    phone: Math.random() > 0.3 ? generatePhone() : undefined,
    avatar_url: generateAvatar(fullName),
    username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`,
    status,
    email_verified: Math.random() > 0.1,
    created_at: createdAt,
    last_login: lastLogin,
    role,
    subscription: {
      type: subscriptionType,
      start_date: subscriptionType !== 'free' ? randomDate(new Date(createdAt), new Date()) : undefined,
      end_date: subscriptionType !== 'free' ? randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : undefined,
      auto_renew: subscriptionType !== 'free' && Math.random() > 0.3
    },
    education_stats: {
      enrolled_courses: courseHistory?.length || 0,
      completed_courses: courseHistory?.filter(c => c.progress === 100).length || 0,
      total_study_hours: Math.floor(Math.random() * 500),
      certificates_earned: courseHistory?.filter(c => c.certificate_issued).length || 0,
      current_streak: Math.floor(Math.random() * 30),
      average_progress: courseHistory?.length ? Math.floor(courseHistory.reduce((sum, c) => sum + c.progress, 0) / courseHistory.length) : 0
    },
    payment_info: {
      total_spent: totalSpent,
      last_payment_date: paymentHistory?.[0]?.date,
      payment_methods: Math.floor(Math.random() * 3) + 1,
      failed_payments: paymentHistory?.filter(p => p.status === 'failed').length || 0
    },
    activity_stats: {
      forum_posts: Math.floor(Math.random() * 50),
      forum_replies: Math.floor(Math.random() * 100),
      messages_sent: Math.floor(Math.random() * 200),
      support_tickets: Math.floor(Math.random() * 10),
      last_activity: lastLogin || createdAt
    },
    admin_notes: generateAdminNotes(),
    course_history: courseHistory,
    payment_history: paymentHistory,
    login_history: generateLoginHistory()
  };
}

// Generate 55 mock users
export const mockUsers: AdminUserProfile[] = Array.from({ length: 55 }, (_, i) => generateMockUser(i));

// Helper functions for filtering and searching
export function searchUsers(users: AdminUserProfile[], query: string): AdminUserProfile[] {
  const lowerQuery = query.toLowerCase();
  return users.filter(user =>
    user.full_name.toLowerCase().includes(lowerQuery) ||
    user.email.toLowerCase().includes(lowerQuery) ||
    user.username?.toLowerCase().includes(lowerQuery) ||
    user.phone?.includes(query)
  );
}

export function filterUsersByRole(users: AdminUserProfile[], role: AdminUserProfile['role'] | 'all'): AdminUserProfile[] {
  if (role === 'all') return users;
  return users.filter(user => user.role === role);
}

export function filterUsersByStatus(users: AdminUserProfile[], status: AdminUserProfile['status'] | 'all'): AdminUserProfile[] {
  if (status === 'all') return users;
  return users.filter(user => user.status === status);
}

export function filterUsersBySubscription(users: AdminUserProfile[], type: AdminUserProfile['subscription']['type'] | 'all'): AdminUserProfile[] {
  if (type === 'all') return users;
  return users.filter(user => user.subscription.type === type);
}

export function filterUsersByDateRange(users: AdminUserProfile[], startDate: string, endDate: string, dateField: 'created_at' | 'last_login'): AdminUserProfile[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return users.filter(user => {
    const date = dateField === 'created_at' ? user.created_at : user.last_login;
    if (!date) return false;
    const userDate = new Date(date).getTime();
    return userDate >= start && userDate <= end;
  });
}

// Statistics calculations
export function calculateUserStats(users: AdminUserProfile[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.last_login && new Date(u.last_login) >= thirtyDaysAgo).length,
    newRegistrations: users.filter(u => new Date(u.created_at) >= thisMonthStart).length,
    premiumSubscribers: users.filter(u => u.subscription.type === 'premium').length,
    suspendedAccounts: users.filter(u => u.status === 'suspended').length,
    totalRevenue: users.reduce((sum, u) => sum + u.payment_info.total_spent, 0),
    verifiedEmails: users.filter(u => u.email_verified).length,
    avgStudyHours: Math.floor(users.reduce((sum, u) => sum + u.education_stats.total_study_hours, 0) / users.length),
    totalCertificates: users.reduce((sum, u) => sum + u.education_stats.certificates_earned, 0)
  };
}

// Growth data for charts
export function generateGrowthData() {
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const currentMonth = new Date().getMonth();
  const data = [];
  
  let totalUsers = 100;
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - 11 + i + 12) % 12;
    const growth = Math.floor(Math.random() * 50) + 20;
    totalUsers += growth;
    
    data.push({
      month: months[monthIndex],
      users: totalUsers,
      newUsers: growth,
      revenue: Math.floor(Math.random() * 50000) + 10000
    });
  }
  
  return data;
}

// Export functions for CSV/Excel
export function exportToCSV(users: AdminUserProfile[]): string {
  const headers = ['ID', 'Ad Soyad', 'Email', 'Telefon', 'Rol', 'Durum', 'Abonelik', 'Kayıt Tarihi', 'Son Giriş', 'Toplam Harcama'];
  
  const rows = users.map(user => [
    user.id,
    user.full_name,
    user.email,
    user.phone || '',
    user.role,
    user.status,
    user.subscription.type,
    new Date(user.created_at).toLocaleDateString('tr-TR'),
    user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR') : '',
    `${user.payment_info.total_spent} TRY`
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export function downloadCSV(users: AdminUserProfile[], filename: string = 'kullanicilar.csv') {
  const csv = exportToCSV(users);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}