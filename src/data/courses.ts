// Kurs veri tiplerinin tanımlanması
export interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration: string;
  video_url?: string;
  is_preview?: boolean;
  order_index: number;
  completed?: boolean;
  type?: 'video' | 'quiz'; // Ders tipi: video veya quiz
  quiz_id?: string; // Quiz dersler için quiz ID'si
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  original_price?: number;
  currency: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  duration_hours: number;
  total_lessons: number;
  total_students?: number;
  rating?: number;
  total_ratings?: number;
  is_published: boolean;
  is_featured: boolean;
  is_free: boolean;
  category_name: string;
  instructor_name: string;
  instructor_avatar?: string;
  thumbnail_url?: string;
  updated_at: string;
  tags?: string[];
}

export interface CourseDetail extends Course {
  modules?: Module[];
  lessons: Lesson[]; // Backward compatibility için
}

// Ana kurslar listesi
export const MAIN_COURSES: Course[] = [
  {
    id: 'amazon-full-mentoring',
    title: 'Amazon Full Mentorluk Eğitimi',
    slug: 'amazon-full-mentorluk-egitimi',
    short_description: 'Amazon FBA\'da sıfırdan profesyonel seviyeye kapsamlı eğitim',
    description: 'Amazon FBA ile e-ticaret dünyasında başarılı olmanız için gereken tüm bilgileri kapsayan kapsamlı mentorluk programı. Ürün araştırmasından satış optimizasyonuna, canlı yayınlardan birebir mentorluk seanslarına kadar her şey dahil.',
    price: 2999,
    original_price: 4999,
    currency: 'TRY',
    level: 'intermediate',
    language: 'tr',
    duration_hours: 120,
    total_lessons: 55,
    total_students: 1250,
    rating: 4.9,
    total_ratings: 189,
    is_published: true,
    is_featured: true,
    is_free: false,
    category_name: 'Amazon FBA',
    instructor_name: '7P Education Ekibi',
    instructor_avatar: '/avatars/7p-team.jpg',
    thumbnail_url: 'https://i.ytimg.com/vi/nuOA3GqoA8A/maxresdefault.jpg',
    updated_at: '2024-01-15T10:30:00Z',
    tags: ['Amazon FBA', 'E-ticaret', 'Mentorluk', 'Private Label']
  },
  {
    id: 'amazon-ppc',
    title: 'Amazon PPC Reklam Uzmanlığı',
    slug: 'amazon-ppc-reklam-uzmanligi',
    short_description: 'Amazon PPC reklamları ile satışlarınızı artırın',
    description: 'Amazon platformunda PPC reklamcılığında uzmanlaşın. Sponsored Products, Sponsored Brands ve Sponsored Display reklamları ile organik sıralamanızı yükseltin ve satışlarınızı artırın.',
    price: 1499,
    original_price: 2499,
    currency: 'TRY',
    level: 'intermediate',
    language: 'tr',
    duration_hours: 40,
    total_lessons: 28,
    total_students: 890,
    rating: 4.8,
    total_ratings: 134,
    is_published: true,
    is_featured: false,
    is_free: false,
    category_name: 'Amazon PPC',
    instructor_name: '7P Education Ekibi',
    thumbnail_url: 'https://i.ytimg.com/vi/zl8wxIEszc8/maxresdefault.jpg',
    updated_at: '2024-01-10T14:20:00Z',
    tags: ['Amazon PPC', 'Reklamcılık', 'Sponsored Products']
  },
  {
    id: 'dijital-pazarlama-temelleri',
    title: 'Dijital Pazarlama Temelleri',
    slug: 'dijital-pazarlama-temelleri',
    short_description: 'Dijital pazarlamanın temellerini öğrenin - Ücretsiz Giriş Kursu',
    description: 'Bu ücretsiz kursta dijital pazarlamanın temel kavramlarını, sosyal medya pazarlama stratejilerini, SEO temellerini ve online marka oluşturma süreçlerini öğreneceksiniz. E-ticaret dünyasına giriş yapmak isteyenler için ideal bir başlangıç kursu.',
    price: 0,
    currency: 'TRY',
    level: 'beginner',
    language: 'tr',
    duration_hours: 15,
    total_lessons: 12,
    total_students: 0,
    rating: 0,
    total_ratings: 0,
    is_published: true,
    is_featured: false,
    is_free: true,
    category_name: 'Dijital Pazarlama',
    instructor_name: '7P Education Ekibi',
    instructor_avatar: '/avatars/7p-team.jpg',
    thumbnail_url: 'https://i.ytimg.com/vi/zl8wxIEszc8/maxresdefault.jpg',
    updated_at: '2024-01-20T09:00:00Z',
    tags: ['Dijital Pazarlama', 'SEO', 'Sosyal Medya', 'Online Marka']
  }
];

// Kurs kategorileri
export const COURSE_CATEGORIES = [
  { id: 'amazon-fba', name: 'Amazon FBA', count: 1 },
  { id: 'amazon-ppc', name: 'Amazon PPC', count: 1 },
  { id: 'dijital-pazarlama', name: 'Dijital Pazarlama', count: 1 },
  { id: 'e-ticaret', name: 'E-ticaret', count: 3 }
];

// Detaylı kurs bilgileri - modül yapısı ile
export const COURSE_DETAILS: Record<string, CourseDetail> = {
  'amazon-full-mentoring': {
    ...MAIN_COURSES[0],
    modules: [
      {
        id: 'modul-1',
        title: 'Uygulama Etkinliği Canlı Yayını',
        description: 'Canlı yayın etkinlikleri ve interaktif eğitimler',
        lessons: [
          {
            id: '1',
            title: 'Canlı Yayın Açılış ve Genel Bakış',
            description: 'Amazon FBA programına canlı yayın ile başlangıç',
            duration: '45 dakika',
            video_url: '/videos/canli-yayin-1.mp4',
            is_preview: true,
            order_index: 1,
            completed: false,
            type: 'video'
          },
          {
            id: '2',
            title: 'Soru-Cevap Oturumu',
            description: 'Katılımcıların sorularına canlı yanıtlar',
            duration: '60 dakika',
            video_url: '/videos/canli-yayin-2.mp4',
            is_preview: false,
            order_index: 2,
            completed: false,
            type: 'video'
          },
          {
            id: '3',
            title: 'Pratik Uygulama Canlı Yayını',
            description: 'Amazon seller account üzerinde canlı işlemler',
            duration: '75 dakika',
            video_url: '/videos/canli-yayin-3.mp4',
            is_preview: false,
            order_index: 3,
            completed: false,
            type: 'video'
          },
          {
            id: 'quiz-1',
            title: 'Quiz - Amazon FBA Temelleri',
            description: 'İlk 3 dersin bilgilerini test edin',
            duration: '15 dakika',
            is_preview: false,
            order_index: 4,
            completed: false,
            type: 'quiz',
            quiz_id: '2'
          },
          {
            id: '4',
            title: 'Öğrenci Başarı Hikayeleri Canlı Yayını',
            description: 'Mezun öğrencilerle başarı hikayesi paylaşımları',
            duration: '50 dakika',
            video_url: '/videos/canli-yayin-4.mp4',
            is_preview: false,
            order_index: 5,
            completed: false,
            type: 'video'
          },
          {
            id: '5',
            title: 'Aylık Güncellemeler Canlı Yayını',
            description: 'Amazon politika güncellemeleri ve yeni fırsatlar',
            duration: '40 dakika',
            video_url: '/videos/canli-yayin-5.mp4',
            is_preview: false,
            order_index: 6,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-2',
        title: 'Amazon Satıcı Konferansları ve Webinarlar',
        description: 'Uzman konuşmacılarla Amazon satış stratejileri',
        lessons: [
          {
            id: '6',
            title: 'Amazon Seller Central Güncellemeleri',
            description: 'Son güncellemeler ve yeni özellikler',
            duration: '90 dakika',
            video_url: '/videos/konferans-1.mp4',
            is_preview: false,
            order_index: 6,
            completed: false,
            type: 'video'
          },
          {
            id: '7',
            title: 'FBA Webinar Serisi',
            description: 'Amazon FBA güncellemeleri ve değişiklikler',
            duration: '50 dakika',
            video_url: '/videos/konferans-2.mp4',
            is_preview: false,
            order_index: 7,
            completed: false,
            type: 'video'
          },
          {
            id: '8',
            title: 'Uluslararası Pazarlara Açılma Webinarı',
            description: 'Amazon\'da global satış stratejileri',
            duration: '70 dakika',
            video_url: '/videos/konferans-3.mp4',
            is_preview: false,
            order_index: 8,
            completed: false,
            type: 'video'
          },
          {
            id: '9',
            title: '2024 Amazon Trendleri',
            description: 'Gelecek dönemde öne çıkacak kategoriler ve fırsatlar',
            duration: '40 dakika',
            video_url: '/videos/konferans-4.mp4',
            is_preview: false,
            order_index: 9,
            completed: false,
            type: 'video'
          },
          {
            id: '10',
            title: 'Satıcı Başarı Hikayeleri',
            description: 'Başarılı Amazon satıcılarının deneyimleri',
            duration: '65 dakika',
            video_url: '/videos/konferans-5.mp4',
            is_preview: false,
            order_index: 10,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-3',
        title: 'Amazon İçin Ön Hazırlık',
        description: 'Amazon FBA\'ya başlamadan önce gerekli hazırlık işlemleri',
        lessons: [
          {
            id: '11',
            title: 'İş Planı Hazırlama',
            description: 'Amazon FBA için detaylı iş planı oluşturma',
            duration: '80 dakika',
            video_url: '/videos/hazirlik-1.mp4',
            is_preview: false,
            order_index: 11,
            completed: false,
            type: 'video'
          },
          {
            id: '12',
            title: 'Bütçe Planlama ve Finansman',
            description: 'Amazon işi için gerekli sermaye hesaplamaları',
            duration: '60 dakika',
            video_url: '/videos/hazirlik-2.mp4',
            is_preview: false,
            order_index: 12,
            completed: false,
            type: 'video'
          },
          {
            id: '13',
            title: 'Yasal Düzenlemeler ve Vergiler',
            description: 'Amazon satışı için gerekli yasal işlemler',
            duration: '55 dakika',
            video_url: '/videos/hazirlik-3.mp4',
            is_preview: false,
            order_index: 13,
            completed: false,
            type: 'video'
          },
          {
            id: '14',
            title: 'Araç ve Yazılım Seçimi',
            description: 'Amazon satışı için gerekli araçların belirlenmesi',
            duration: '45 dakika',
            video_url: '/videos/hazirlik-4.mp4',
            is_preview: false,
            order_index: 14,
            completed: false,
            type: 'video'
          },
          {
            id: '15',
            title: 'Ekip Kurma Stratejileri',
            description: 'Amazon işi için gerekli insan kaynağı planlaması',
            duration: '50 dakika',
            video_url: '/videos/hazirlik-5.mp4',
            is_preview: false,
            order_index: 15,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-4',
        title: 'Amazon\'a Başlangıç',
        description: 'Amazon FBA\'ya ilk adımlar ve hesap kurulum süreci',
        lessons: [
          {
            id: '16',
            title: 'Amazon Seller Account Açma',
            description: 'Adım adım seller hesabı oluşturma rehberi',
            duration: '35 dakika',
            video_url: '/videos/baslangic-1.mp4',
            is_preview: false,
            order_index: 16,
            completed: false,
            type: 'video'
          },
          {
            id: '17',
            title: 'Hesap Doğrulama Süreci',
            description: 'Gerekli belgeler ve doğrulama işlemleri',
            duration: '25 dakika',
            video_url: '/videos/baslangic-2.mp4',
            is_preview: false,
            order_index: 17,
            completed: false,
            type: 'video'
          },
          {
            id: '18',
            title: 'Brand Registry Kaydı',
            description: 'Marka tescili ve brand registry süreci',
            duration: '40 dakika',
            video_url: '/videos/baslangic-3.mp4',
            is_preview: false,
            order_index: 18,
            completed: false,
            type: 'video'
          },
          {
            id: '19',
            title: 'İlk Ürün Listesi Oluşturma',
            description: 'Amazon\'da ilk ürün sayfası hazırlama',
            duration: '55 dakika',
            video_url: '/videos/baslangic-4.mp4',
            is_preview: false,
            order_index: 19,
            completed: false,
            type: 'video'
          },
          {
            id: '20',
            title: 'FBA Shipment Planlama',
            description: 'İlk sevkiyat için gerekli hazırlıklar',
            duration: '45 dakika',
            video_url: '/videos/baslangic-5.mp4',
            is_preview: false,
            order_index: 20,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-5',
        title: 'Amazon Suspend',
        description: 'Hesap askıya alma durumları ve çözüm yöntemleri',
        lessons: [
          {
            id: '21',
            title: 'Suspend Türleri ve Sebepleri',
            description: 'Amazon suspend durumlarının analizi',
            duration: '50 dakika',
            video_url: '/videos/suspend-1.mp4',
            is_preview: false,
            order_index: 21,
            completed: false,
            type: 'video'
          },
          {
            id: '22',
            title: 'Plan of Action (POA) Hazırlama',
            description: 'Etkili aksiyon planı yazma teknikleri',
            duration: '65 dakika',
            video_url: '/videos/suspend-2.mp4',
            is_preview: false,
            order_index: 22,
            completed: false,
            type: 'video'
          },
          {
            id: '23',
            title: 'Appeal Süreci',
            description: 'Amazon\'a başvuru yapma ve takip etme',
            duration: '40 dakika',
            video_url: '/videos/suspend-3.mp4',
            is_preview: false,
            order_index: 23,
            completed: false,
            type: 'video'
          },
          {
            id: '24',
            title: 'Önleyici Tedbirler',
            description: 'Suspend olmamak için alınacak önlemler',
            duration: '35 dakika',
            video_url: '/videos/suspend-4.mp4',
            is_preview: false,
            order_index: 24,
            completed: false,
            type: 'video'
          },
          {
            id: '25',
            title: 'Reinstatement Sonrası Süreç',
            description: 'Hesap tekrar açıldıktan sonra yapılması gerekenler',
            duration: '30 dakika',
            video_url: '/videos/suspend-5.mp4',
            is_preview: false,
            order_index: 25,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-6',
        title: 'Amazon\'da Satış Temelleri',
        description: 'Amazon FBA satışının temel prensipleri',
        lessons: [
          {
            id: '26',
            title: 'Satış Funnelı Oluşturma',
            description: 'Amazon\'da etkili satış hunisi tasarımı',
            duration: '70 dakika',
            video_url: '/videos/satis-1.mp4',
            is_preview: false,
            order_index: 26,
            completed: false,
            type: 'video'
          },
          {
            id: '27',
            title: 'Müşteri Hizmetleri Yönetimi',
            description: 'Amazon müşteri hizmetlerinde başarı teknikleri',
            duration: '45 dakika',
            video_url: '/videos/satis-2.mp4',
            is_preview: false,
            order_index: 27,
            completed: false,
            type: 'video'
          },
          {
            id: '28',
            title: 'Inventory Management',
            description: 'Stok yönetimi ve planlama stratejileri',
            duration: '55 dakika',
            video_url: '/videos/satis-3.mp4',
            is_preview: false,
            order_index: 28,
            completed: false,
            type: 'video'
          },
          {
            id: '29',
            title: 'Fiyatlandırma Stratejileri',
            description: 'Rekabetçi fiyatlandırma ve kar optimizasyonu',
            duration: '50 dakika',
            video_url: '/videos/satis-4.mp4',
            is_preview: false,
            order_index: 29,
            completed: false,
            type: 'video'
          },
          {
            id: '30',
            title: 'Review ve Feedback Yönetimi',
            description: 'Amazon\'da olumlu inceleme alma teknikleri',
            duration: '40 dakika',
            video_url: '/videos/satis-5.mp4',
            is_preview: false,
            order_index: 30,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-7',
        title: 'PRIVATE LABEL (Kendi Markanız) ile Satış',
        description: 'Private label ürünlerle marka oluşturma ve satış',
        lessons: [
          {
            id: '31',
            title: 'Private Label Nedir?',
            description: 'Private label konsepti ve avantajları',
            duration: '40 dakika',
            video_url: '/videos/private-label-1.mp4',
            is_preview: false,
            order_index: 31,
            completed: false,
            type: 'video'
          },
          {
            id: '32',
            title: 'Ürün Geliştirme Süreci',
            description: 'Private label ürün geliştirme aşamaları',
            duration: '85 dakika',
            video_url: '/videos/private-label-2.mp4',
            is_preview: false,
            order_index: 32,
            completed: false,
            type: 'video'
          },
          {
            id: '33',
            title: 'Marka Kimliği Oluşturma',
            description: 'Logo, ambalaj ve marka tasarımı',
            duration: '60 dakika',
            video_url: '/videos/private-label-3.mp4',
            is_preview: false,
            order_index: 33,
            completed: false,
            type: 'video'
          },
          {
            id: '34',
            title: 'Patent ve Trademark Süreci',
            description: 'Fikri mülkiyet haklarını koruma',
            duration: '50 dakika',
            video_url: '/videos/private-label-4.mp4',
            is_preview: false,
            order_index: 34,
            completed: false,
            type: 'video'
          },
          {
            id: '35',
            title: 'Private Label Pazarlama',
            description: 'Kendi markanızı pazarlama stratejileri',
            duration: '70 dakika',
            video_url: '/videos/private-label-5.mp4',
            is_preview: false,
            order_index: 35,
            completed: false,
            type: 'video'
          },
          {
            id: '36',
            title: 'Amazon A+ Content',
            description: 'Private label için gelişmiş ürün sayfası tasarımı',
            duration: '45 dakika',
            video_url: '/videos/private-label-6.mp4',
            is_preview: false,
            order_index: 36,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-8',
        title: 'Amazon\'da Tedarikçiler ile Çalışmak',
        description: 'Güvenilir tedarikçi bulma ve iş birliği yönetimi',
        lessons: [
          {
            id: '37',
            title: 'Tedarikçi Araştırması',
            description: 'Güvenilir tedarikçi bulma yöntemleri',
            duration: '75 dakika',
            video_url: '/videos/tedarikci-1.mp4',
            is_preview: false,
            order_index: 37,
            completed: false,
            type: 'video'
          },
          {
            id: '38',
            title: 'Alibaba ve B2B Platformları',
            description: 'B2B platformlarında etkili tedarikçi arama',
            duration: '55 dakika',
            video_url: '/videos/tedarikci-2.mp4',
            is_preview: false,
            order_index: 38,
            completed: false,
            type: 'video'
          },
          {
            id: '39',
            title: 'Tedarikçi Değerlendirme Kriterleri',
            description: 'Tedarikçileri değerlendirme ve seçme yöntemleri',
            duration: '50 dakika',
            video_url: '/videos/tedarikci-3.mp4',
            is_preview: false,
            order_index: 39,
            completed: false,
            type: 'video'
          },
          {
            id: '40',
            title: 'Sözleşme ve Ödeme Yöntemleri',
            description: 'Tedarikçilerle güvenli anlaşma yapma',
            duration: '65 dakika',
            video_url: '/videos/tedarikci-4.mp4',
            is_preview: false,
            order_index: 40,
            completed: false,
            type: 'video'
          },
          {
            id: '41',
            title: 'Kalite Kontrol Süreci',
            description: 'Ürün kalitesi kontrol ve test süreçleri',
            duration: '45 dakika',
            video_url: '/videos/tedarikci-5.mp4',
            is_preview: false,
            order_index: 41,
            completed: false,
            type: 'video'
          },
          {
            id: '42',
            title: 'Uzun Vadeli İş Birliği',
            description: 'Tedarikçilerle sürdürülebilir ilişki kurma',
            duration: '40 dakika',
            video_url: '/videos/tedarikci-6.mp4',
            is_preview: false,
            order_index: 42,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-9',
        title: 'Amazon\'da Ürün Lansmanı',
        description: 'Yeni ürünlerin pazara etkili sunumu',
        lessons: [
          {
            id: '43',
            title: 'Lansман Stratejisi Planlama',
            description: 'Ürün lansmanı için kapsamlı strateji geliştirme',
            duration: '80 dakika',
            video_url: '/videos/lansman-1.mp4',
            is_preview: false,
            order_index: 43,
            completed: false,
            type: 'video'
          },
          {
            id: '44',
            title: 'Amazon Honeymoon Period',
            description: 'Amazon\'ın yeni ürünlere verdiği avantajları kullanma',
            duration: '50 dakika',
            video_url: '/videos/lansman-2.mp4',
            is_preview: false,
            order_index: 44,
            completed: false,
            type: 'video'
          },
          {
            id: '45',
            title: 'İlk 100 Satış Stratejisi',
            description: 'Momentum yaratacak ilk satışları gerçekleştirme',
            duration: '70 dakika',
            video_url: '/videos/lansman-3.mp4',
            is_preview: false,
            order_index: 45,
            completed: false,
            type: 'video'
          },
          {
            id: '46',
            title: 'Launch PPC Kampanyaları',
            description: 'Ürün lansmanı için optimized PPC stratejileri',
            duration: '65 dakika',
            video_url: '/videos/lansman-4.mp4',
            is_preview: false,
            order_index: 46,
            completed: false,
            type: 'video'
          },
          {
            id: '47',
            title: 'Influencer ve External Traffic',
            description: 'Dış trafik kaynaklarından yararlanma',
            duration: '55 dakika',
            video_url: '/videos/lansman-5.mp4',
            is_preview: false,
            order_index: 47,
            completed: false,
            type: 'video'
          },
          {
            id: '48',
            title: 'Lansман Sonrası Optimizasyon',
            description: 'Lansman sonrası performans iyileştirme',
            duration: '45 dakika',
            video_url: '/videos/lansman-6.mp4',
            is_preview: false,
            order_index: 48,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'modul-10',
        title: 'Amazon\'da İleri Satış Teknikleri',
        description: 'Profesyonel seviyede satış stratejileri ve optimizasyon',
        lessons: [
          {
            id: '49',
            title: 'A/B Testing Stratejileri',
            description: 'Ürün sayfası ve fiyat testleri ile optimizasyon',
            duration: '70 dakika',
            video_url: '/videos/ileri-1.mp4',
            is_preview: false,
            order_index: 49,
            completed: false,
            type: 'video'
          },
          {
            id: '50',
            title: 'Seasonal ve Trend Analizi',
            description: 'Mevsimsel satış trendlerini değerlendirme',
            duration: '60 dakika',
            video_url: '/videos/ileri-2.mp4',
            is_preview: false,
            order_index: 50,
            completed: false,
            type: 'video'
          },
          {
            id: '51',
            title: 'Multi-Channel Satış',
            description: 'Amazon dışı platformlarda da satış yapma',
            duration: '80 dakika',
            video_url: '/videos/ileri-3.mp4',
            is_preview: false,
            order_index: 51,
            completed: false,
            type: 'video'
          },
          {
            id: '52',
            title: 'Advanced Analytics',
            description: 'İleri seviye veri analizi ve karar verme',
            duration: '75 dakika',
            video_url: '/videos/ileri-4.mp4',
            is_preview: false,
            order_index: 52,
            completed: false,
            type: 'video'
          },
          {
            id: '53',
            title: 'Amazon API ve Otomasyon',
            description: 'API entegrasyonları ve iş süreçlerini otomatikleştirme',
            duration: '90 dakika',
            video_url: '/videos/ileri-5.mp4',
            is_preview: false,
            order_index: 53,
            completed: false,
            type: 'video'
          },
          {
            id: '54',
            title: 'Exit Stratejileri',
            description: 'Amazon işini büyütme ve satma stratejileri',
            duration: '65 dakika',
            video_url: '/videos/ileri-6.mp4',
            is_preview: false,
            order_index: 54,
            completed: false,
            type: 'video'
          }
        ]
      }
    ],
    // Backward compatibility için tüm dersleri flat array olarak da tut
    lessons: []
  },
  'amazon-ppc': {
    ...MAIN_COURSES[1],
    modules: [
      {
        id: 'ppc-module-1',
        title: 'Amazon PPC Temelleri ve Giriş',
        description: 'Amazon PPC reklamcılığının temel kavramları, platform yapısı ve başlangıç stratejileri',
        lessons: [
          {
            id: 'ppc-1',
            title: 'Amazon PPC\'ye Giriş ve Platform Tanıtımı',
            description: 'Amazon reklamcılık ekosistemi ve temel konseptler',
            duration: '45 dakika',
            video_url: '/videos/ppc-1.mp4',
            is_preview: true,
            order_index: 1,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-2',
            title: 'Sponsored Products Reklamlarına Giriş',
            description: 'SP reklamlarının temelleri ve kurulum süreçleri',
            duration: '50 dakika',
            video_url: '/videos/ppc-2.mp4',
            is_preview: false,
            order_index: 2,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-3',
            title: 'Sponsored Brands ve Sponsored Display',
            description: 'SB ve SD reklamlarının temel özellikleri',
            duration: '40 dakika',
            video_url: '/videos/ppc-3.mp4',
            is_preview: false,
            order_index: 3,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-4',
            title: 'Kampanya Hedefleme Seçenekleri',
            description: 'Auto ve Manual targeting stratejileri',
            duration: '35 dakika',
            video_url: '/videos/ppc-4.mp4',
            is_preview: false,
            order_index: 4,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-5',
            title: 'Bütçe ve Bidding Stratejileri',
            description: 'Doğru bütçe belirleme ve teklif yönetimi',
            duration: '45 dakika',
            video_url: '/videos/ppc-5.mp4',
            is_preview: false,
            order_index: 5,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-quiz-1',
            title: 'Quiz - PPC Temelleri',
            description: 'İlk 5 dersin bilgilerini test edin',
            duration: '15 dakika',
            is_preview: false,
            order_index: 6,
            completed: false,
            type: 'quiz',
            quiz_id: 'ppc-quiz-1'
          }
        ]
      },
      {
        id: 'ppc-module-2',
        title: 'Keyword Research ve Optimizasyon',
        description: 'Detaylı anahtar kelime araştırması, analiz teknikleri ve optimizasyon stratejileri',
        lessons: [
          {
            id: 'ppc-6',
            title: 'Keyword Research Temelleri',
            description: 'Etkili anahtar kelime bulma yöntemleri',
            duration: '55 dakika',
            video_url: '/videos/ppc-6.mp4',
            is_preview: false,
            order_index: 7,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-7',
            title: 'Helium 10 ile Keyword Research',
            description: 'Helium 10 araçları ile detaylı keyword analizi',
            duration: '60 dakika',
            video_url: '/videos/ppc-7.mp4',
            is_preview: false,
            order_index: 8,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-8',
            title: 'Negatif Keyword Stratejileri',
            description: 'Gereksiz tıklamaları engellemek için negatif keywords',
            duration: '40 dakika',
            video_url: '/videos/ppc-8.mp4',
            is_preview: false,
            order_index: 9,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-9',
            title: 'Search Term Report Analizi',
            description: 'STR verilerini analiz ederek optimization yapma',
            duration: '50 dakika',
            video_url: '/videos/ppc-9.mp4',
            is_preview: false,
            order_index: 10,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-10',
            title: 'Keyword Match Type Stratejileri',
            description: 'Broad, Phrase ve Exact match kullanım teknikleri',
            duration: '45 dakika',
            video_url: '/videos/ppc-10.mp4',
            is_preview: false,
            order_index: 11,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-quiz-2',
            title: 'Quiz - Keyword Research',
            description: 'Keyword araştırması bilgilerinizi test edin',
            duration: '20 dakika',
            is_preview: false,
            order_index: 12,
            completed: false,
            type: 'quiz',
            quiz_id: 'ppc-quiz-2'
          }
        ]
      },
      {
        id: 'ppc-module-3',
        title: 'Sponsored Products İleri Teknikleri',
        description: 'SP reklamlarında uzman seviye optimizasyon, otomasyon ve ölçeklendirme',
        lessons: [
          {
            id: 'ppc-11',
            title: 'SP Kampanya Yapısı ve Organizasyonu',
            description: 'Etkili kampanya organizasyonu ve yapılandırma',
            duration: '55 dakika',
            video_url: '/videos/ppc-11.mp4',
            is_preview: false,
            order_index: 13,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-12',
            title: 'Auto Targeting Optimizasyonu',
            description: 'Otomatik hedefleme kampanyalarını optimize etme',
            duration: '50 dakika',
            video_url: '/videos/ppc-12.mp4',
            is_preview: false,
            order_index: 14,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-13',
            title: 'Manual Targeting ve ASIN Hedeflemesi',
            description: 'Manuel hedefleme ve rakip ASIN stratejileri',
            duration: '60 dakika',
            video_url: '/videos/ppc-13.mp4',
            is_preview: false,
            order_index: 15,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-14',
            title: 'Dayparting ve Gelişmiş Bid Yönetimi',
            description: 'Zaman bazlı optimizasyon ve teklif stratejileri',
            duration: '45 dakika',
            video_url: '/videos/ppc-14.mp4',
            is_preview: false,
            order_index: 16,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-15',
            title: 'PPC Otomasyon Araçları',
            description: 'PPC süreçlerini otomatikleştirme araçları',
            duration: '40 dakika',
            video_url: '/videos/ppc-15.mp4',
            is_preview: false,
            order_index: 17,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'ppc-module-4',
        title: 'Sponsored Brands Mastery',
        description: 'SB reklamlarında uzmanlaşma, kreatif optimizasyon ve marka bilinirliği',
        lessons: [
          {
            id: 'ppc-16',
            title: 'SB Reklamlarına Derinlemesine Bakış',
            description: 'Sponsored Brands reklamlarının tüm özellikleri',
            duration: '50 dakika',
            video_url: '/videos/ppc-16.mp4',
            is_preview: false,
            order_index: 18,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-17',
            title: 'SB Video Reklamları',
            description: 'Video reklamları ile marka tanıtımı',
            duration: '45 dakika',
            video_url: '/videos/ppc-17.mp4',
            is_preview: false,
            order_index: 19,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-18',
            title: 'Store Spotlight ve Custom Images',
            description: 'Özelleştirilmiş kreatif ve mağaza vitrin reklamları',
            duration: '40 dakika',
            video_url: '/videos/ppc-18.mp4',
            is_preview: false,
            order_index: 20,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-19',
            title: 'SB Keyword ve ASIN Hedeflemesi',
            description: 'SB reklamlarında gelişmiş hedefleme teknikleri',
            duration: '55 dakika',
            video_url: '/videos/ppc-19.mp4',
            is_preview: false,
            order_index: 21,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-quiz-3',
            title: 'Quiz - Sponsored Brands',
            description: 'SB reklamları bilgilerinizi test edin',
            duration: '15 dakika',
            is_preview: false,
            order_index: 22,
            completed: false,
            type: 'quiz',
            quiz_id: 'ppc-quiz-3'
          }
        ]
      },
      {
        id: 'ppc-module-5',
        title: 'Analitik ve Raporlama',
        description: 'PPC verilerini analiz etme, raporlama ve karar verme süreçleri',
        lessons: [
          {
            id: 'ppc-20',
            title: 'PPC Metrik ve KPI\'lar',
            description: 'Önemli PPC metrikleri ve performans göstergeleri',
            duration: '45 dakika',
            video_url: '/videos/ppc-20.mp4',
            is_preview: false,
            order_index: 23,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-21',
            title: 'Amazon Advertising Console Analizi',
            description: 'Native raporlama araçlarını kullanma',
            duration: '50 dakika',
            video_url: '/videos/ppc-21.mp4',
            is_preview: false,
            order_index: 24,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-22',
            title: 'Excel ile PPC Veri Analizi',
            description: 'Excel kullanarak PPC verilerini analiz etme',
            duration: '60 dakika',
            video_url: '/videos/ppc-22.mp4',
            is_preview: false,
            order_index: 25,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-23',
            title: 'ROI ve Karlılık Analizi',
            description: 'PPC kampanyalarının karlılığını ölçme',
            duration: '55 dakika',
            video_url: '/videos/ppc-23.mp4',
            is_preview: false,
            order_index: 26,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-24',
            title: 'Müşteri Rapor Hazırlama',
            description: 'Profesyonel PPC raporları oluşturma',
            duration: '40 dakika',
            video_url: '/videos/ppc-24.mp4',
            is_preview: false,
            order_index: 27,
            completed: false,
            type: 'video'
          },
          {
            id: 'ppc-quiz-4',
            title: 'Quiz - Final Sınavı',
            description: 'Tüm PPC bilgilerinizi test eden kapsamlı sınav',
            duration: '30 dakika',
            is_preview: false,
            order_index: 28,
            completed: false,
            type: 'quiz',
            quiz_id: 'ppc-final-quiz'
          }
        ]
      }
    ],
    // Backward compatibility için flat lessons array
    lessons: [
      {
        id: 'ppc-1',
        title: 'Amazon PPC Temelleri',
        description: 'Sponsored Products, Brands ve Display reklamlarına giriş',
        duration: '60 dakika',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        is_preview: true,
        order_index: 1,
        completed: false
      },
      {
        id: 'ppc-2',
        title: 'Keyword Araştırması',
        description: 'PPC için etkili anahtar kelime bulma teknikleri',
        duration: '45 dakika',
        video_url: '/videos/ppc-2.mp4',
        is_preview: false,
        order_index: 2,
        completed: false
      },
      {
        id: 'ppc-3',
        title: 'Sponsored Products Optimizasyonu',
        description: 'SP reklamlarını optimize etme teknikleri',
        duration: '55 dakika',
        video_url: '/videos/ppc-3.mp4',
        is_preview: false,
        order_index: 3,
        completed: false
      },
      {
        id: 'ppc-4',
        title: 'Sponsored Brands Stratejileri',
        description: 'Marka reklamları ile görünürlük artırma',
        duration: '50 dakika',
        video_url: '/videos/ppc-4.mp4',
        is_preview: false,
        order_index: 4,
        completed: false
      },
      {
        id: 'ppc-quiz-1',
        title: 'PPC Bilgi Testi',
        description: 'Öğrendiklerinizi test edin',
        duration: '15 dakika',
        is_preview: false,
        order_index: 5,
        completed: false
      }
    ]
  },
  'dijital-pazarlama-temelleri': {
    ...MAIN_COURSES[2],
    modules: [
      {
        id: 'dp-module-1',
        title: 'Dijital Pazarlamaya Giriş',
        description: 'Dijital pazarlamanın temel kavramları ve önemi',
        lessons: [
          {
            id: 'dp-1',
            title: 'Dijital Pazarlama Nedir?',
            description: 'Dijital pazarlamanın tanımı, kapsamı ve geleneksel pazarlamadan farkları',
            duration: '25 dakika',
            video_url: '/videos/dp-1.mp4',
            is_preview: true,
            order_index: 1,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-2',
            title: 'Dijital Pazarlama Kanalları',
            description: 'Sosyal medya, e-posta, SEO, SEM ve diğer dijital kanallar',
            duration: '30 dakika',
            video_url: '/videos/dp-2.mp4',
            is_preview: false,
            order_index: 2,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-3',
            title: 'Dijital Müşteri Yolculuğu',
            description: 'Müşterilerin online satın alma süreçlerini anlama',
            duration: '20 dakika',
            video_url: '/videos/dp-3.mp4',
            is_preview: false,
            order_index: 3,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'dp-module-2',
        title: 'Sosyal Medya Pazarlaması',
        description: 'Facebook, Instagram, Twitter ve LinkedIn\'de etkili pazarlama',
        lessons: [
          {
            id: 'dp-4',
            title: 'Sosyal Medya Stratejisi Geliştirme',
            description: 'Hedef kitle belirleme ve içerik stratejisi oluşturma',
            duration: '35 dakika',
            video_url: '/videos/dp-4.mp4',
            is_preview: false,
            order_index: 4,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-5',
            title: 'Facebook ve Instagram Pazarlaması',
            description: 'Facebook ve Instagram\'da organik ve ücretli pazarlama',
            duration: '40 dakika',
            video_url: '/videos/dp-5.mp4',
            is_preview: false,
            order_index: 5,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-6',
            title: 'LinkedIn ve Twitter Pazarlaması',
            description: 'Profesyonel ağ ve mikro-blog platformlarında pazarlama',
            duration: '30 dakika',
            video_url: '/videos/dp-6.mp4',
            is_preview: false,
            order_index: 6,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-quiz-1',
            title: 'Quiz - Sosyal Medya Pazarlaması',
            description: 'Sosyal medya pazarlaması bilgilerinizi test edin',
            duration: '10 dakika',
            is_preview: false,
            order_index: 7,
            completed: false,
            type: 'quiz',
            quiz_id: 'dp-quiz-1'
          }
        ]
      },
      {
        id: 'dp-module-3',
        title: 'SEO Temelleri',
        description: 'Arama motoru optimizasyonunun temel prensipleri',
        lessons: [
          {
            id: 'dp-7',
            title: 'SEO Nedir ve Neden Önemlidir?',
            description: 'Arama motoru optimizasyonunun temelleri',
            duration: '25 dakika',
            video_url: '/videos/dp-7.mp4',
            is_preview: false,
            order_index: 8,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-8',
            title: 'Anahtar Kelime Araştırması',
            description: 'Etkili anahtar kelime bulma ve analiz etme',
            duration: '35 dakika',
            video_url: '/videos/dp-8.mp4',
            is_preview: false,
            order_index: 9,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-9',
            title: 'On-Page SEO Optimizasyonu',
            description: 'Web sayfası içi SEO uygulamaları',
            duration: '30 dakika',
            video_url: '/videos/dp-9.mp4',
            is_preview: false,
            order_index: 10,
            completed: false,
            type: 'video'
          }
        ]
      },
      {
        id: 'dp-module-4',
        title: 'Online Marka Oluşturma',
        description: 'Dijital ortamda güçlü bir marka kimliği oluşturma',
        lessons: [
          {
            id: 'dp-10',
            title: 'Dijital Marka Kimliği',
            description: 'Online marka kimliği oluşturma prensipleri',
            duration: '25 dakika',
            video_url: '/videos/dp-10.mp4',
            is_preview: false,
            order_index: 11,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-11',
            title: 'İçerik Pazarlaması Stratejileri',
            description: 'Değerli içerik oluşturma ve paylaşma teknikleri',
            duration: '35 dakika',
            video_url: '/videos/dp-11.mp4',
            is_preview: false,
            order_index: 12,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-12',
            title: 'Dijital Pazarlama Ölçümleri',
            description: 'Google Analytics ve diğer araçlarla performans ölçümü',
            duration: '30 dakika',
            video_url: '/videos/dp-12.mp4',
            is_preview: false,
            order_index: 13,
            completed: false,
            type: 'video'
          },
          {
            id: 'dp-quiz-2',
            title: 'Quiz - Final Sınavı',
            description: 'Tüm dijital pazarlama bilgilerinizi test eden kapsamlı sınav',
            duration: '15 dakika',
            is_preview: false,
            order_index: 14,
            completed: false,
            type: 'quiz',
            quiz_id: 'dp-final-quiz'
          }
        ]
      }
    ],
    // Backward compatibility için flat lessons array
    lessons: []
  }
};

// Flat lessons array oluştur (backward compatibility için)
if (COURSE_DETAILS['amazon-full-mentoring'].modules) {
  COURSE_DETAILS['amazon-full-mentoring'].lessons = 
    COURSE_DETAILS['amazon-full-mentoring'].modules.reduce((acc: Lesson[], module: Module) => {
      return acc.concat(module.lessons);
    }, []);
}

if (COURSE_DETAILS['dijital-pazarlama-temelleri'].modules) {
  COURSE_DETAILS['dijital-pazarlama-temelleri'].lessons = 
    COURSE_DETAILS['dijital-pazarlama-temelleri'].modules.reduce((acc: Lesson[], module: Module) => {
      return acc.concat(module.lessons);
    }, []);
}

// Tüm kurslar listesi
export const ALL_COURSES: Course[] = MAIN_COURSES;

// Utility functions
export const getCourseById = (id: string): Course | undefined => {
  return ALL_COURSES.find(course => course.id === id);
};

export const getCourseBySlug = (slug: string): Course | undefined => {
  return ALL_COURSES.find(course => course.slug === slug);
};

export const getCourseDetailById = (id: string): CourseDetail | undefined => {
  return COURSE_DETAILS[id];
};

export const getCourseDetailBySlug = (slug: string): CourseDetail | undefined => {
  // First find the course by slug
  const course = getCourseBySlug(slug);
  if (!course) return undefined;
  
  // Then return the course detail using the ID
  return COURSE_DETAILS[course.id];
};

export const getFeaturedCourses = (): Course[] => {
  return ALL_COURSES.filter(course => course.is_featured);
};

export const getFreeCourses = (): Course[] => {
  return ALL_COURSES.filter(course => course.is_free);
};

export const getCoursesByCategory = (categoryId: string): Course[] => {
  if (categoryId === 'all') return ALL_COURSES;
  return ALL_COURSES.filter(course => 
    course.category_name.toLowerCase().replace(/\s+/g, '-') === categoryId
  );
};