import { Course, Module, Lesson, LessonMaterial } from '@/types/course';

export const mockCourses: Course[] = [
  {
    id: '1',
    title: 'PPC Reklam Uzmanlığı',
    slug: 'ppc-reklam-uzmanligi',
    description: 'Google Ads ve Facebook Ads ile profesyonel reklam kampanyaları oluşturmayı öğrenin. Bu kapsamlı kurs, dijital reklamcılık dünyasında uzmanlaşmanızı sağlayacak pratik bilgilerle doludur.',
    short_description: 'Dijital reklamcılıkta uzmanlaşın',
    price: 0,
    original_price: 699.99,
    currency: 'TRY',
    level: 'intermediate',
    language: 'tr',
    duration_hours: 35,
    total_lessons: 28,
    rating: 4.9,
    total_ratings: 234,
    total_students: 1850,
    is_published: true,
    is_featured: true,
    is_free: true,
    what_you_learn: [
      'Google Ads kampanya yönetimi',
      'Facebook Ads strateji geliştirme',
      'ROI optimizasyonu teknikleri',
      'Hedef kitle analizi',
      'Reklamda yaratıcılık teknikleri'
    ],
    requirements: ['Temel dijital pazarlama bilgisi', 'Bilgisayar kullanımı'],
    tags: ['PPC', 'Google Ads', 'Facebook Ads', 'Dijital Pazarlama'],
    updated_at: '2024-01-15T10:30:00Z',
    instructor_name: '7P Education Ekibi',
    category_name: 'Dijital Pazarlama'
  },
  {
    id: '2',
    title: 'Ürün Araştırması Uzmanlığı',
    slug: 'urun-arastirmasi-uzmanligi',
    description: 'E-ticaret ürün araştırması ve trend analizi konularında uzmanlaşın. Kazandıran ürünleri nasıl bulacağınızı öğrenin.',
    short_description: 'Kazandıran ürünleri bulun',
    price: 0,
    original_price: 599.99,
    currency: 'TRY',
    level: 'beginner',
    language: 'tr',
    duration_hours: 25,
    total_lessons: 20,
    rating: 4.7,
    total_ratings: 156,
    total_students: 980,
    is_published: true,
    is_featured: false,
    is_free: true,
    what_you_learn: [
      'Ürün araştırma teknikleri',
      'Trend analizi yöntemleri',
      'Pazar değerlendirmesi',
      'Rekabet analizi',
      'Karlılık hesaplamaları'
    ],
    requirements: ['Temel e-ticaret bilgisi'],
    tags: ['Ürün Araştırması', 'E-ticaret', 'Trend Analizi'],
    updated_at: '2024-01-14T15:45:00Z',
    instructor_name: '7P Education Ekibi',
    category_name: 'E-ticaret'
  },
  {
    id: '3',
    title: 'Full Mentorluk Programı',
    slug: 'full-mentorluk-programi',
    description: 'Birebir mentorluk ile e-ticaret işinizi büyütün. Uzman mentorlarımızdan kişiselleştirilmiş rehberlik alın.',
    short_description: '1-1 mentorluk desteği',
    price: 999.99,
    original_price: 1299.99,
    currency: 'TRY',
    level: 'advanced',
    language: 'tr',
    duration_hours: 60,
    total_lessons: 45,
    rating: 4.95,
    total_ratings: 89,
    total_students: 345,
    is_published: true,
    is_featured: true,
    is_free: false,
    what_you_learn: [
      'Birebir mentorluk seansları',
      'İş stratejisi geliştirme',
      'Büyüme hack\'leri',
      'Kişiselleştirilmiş rehberlik',
      '24/7 destek sistemi'
    ],
    requirements: ['Aktif e-ticaret işi veya ciddi başlama niyeti'],
    tags: ['Mentorluk', 'İş Stratejisi', 'Premium'],
    updated_at: '2024-01-13T12:20:00Z',
    instructor_name: '7P Education Ekibi',
    category_name: 'Mentorluk'
  },
  {
    id: '4',
    title: 'Shopify Mağaza Kurulum',
    slug: 'shopify-magaza-kurulum',
    description: 'Shopify ile profesyonel e-ticaret mağazası kurmayı öğrenin. Sıfırdan başlayarak satışa hazır mağaza oluşturun.',
    short_description: 'Shopify uzmanlığı',
    price: 0,
    original_price: 399.99,
    currency: 'TRY',
    level: 'beginner',
    language: 'tr',
    duration_hours: 15,
    total_lessons: 12,
    rating: 4.8,
    total_ratings: 98,
    total_students: 567,
    is_published: true,
    is_featured: false,
    is_free: true,
    what_you_learn: [
      'Shopify hesap kurulumu',
      'Tema seçimi ve özelleştirme',
      'Ürün yönetimi',
      'Ödeme sistemi entegrasyonu',
      'Nakliye ayarları'
    ],
    requirements: ['Temel bilgisayar kullanımı'],
    tags: ['Shopify', 'E-ticaret', 'Mağaza'],
    updated_at: '2024-01-12T09:15:00Z',
    instructor_name: '7P Education Ekibi',
    category_name: 'E-ticaret'
  },
  {
    id: '5',
    title: 'Sosyal Medya Pazarlama',
    slug: 'sosyal-medya-pazarlama',
    description: 'Instagram, TikTok ve Facebook ile etkili pazarlama stratejileri geliştirin. Organik büyüme teknikleri öğrenin.',
    short_description: 'Sosyal medya uzmanlığı',
    price: 299.99,
    original_price: 499.99,
    currency: 'TRY',
    level: 'intermediate',
    language: 'tr',
    duration_hours: 20,
    total_lessons: 16,
    rating: 4.6,
    total_ratings: 145,
    total_students: 890,
    is_published: true,
    is_featured: false,
    is_free: false,
    what_you_learn: [
      'Instagram pazarlama stratejileri',
      'TikTok içerik stratejileri',
      'Facebook Ads yönetimi',
      'Organik büyüme teknikleri',
      'İçerik üretim süreçleri'
    ],
    requirements: ['Sosyal medya hesapları'],
    tags: ['Sosyal Medya', 'Instagram', 'TikTok'],
    updated_at: '2024-01-11T16:30:00Z',
    instructor_name: '7P Education Ekibi',
    category_name: 'Dijital Pazarlama'
  }
];

export const mockModules: Record<string, Module[]> = {
  '1': [ // PPC Reklam Uzmanlığı
    {
      id: 'mod-1-1',
      course_id: '1',
      title: 'PPC Reklamcılığa Giriş',
      description: 'Dijital reklamcılığın temel prensiplerini öğrenin',
      position: 1,
      total_lessons: 4,
      duration_minutes: 180,
      is_published: true
    },
    {
      id: 'mod-1-2',
      course_id: '1',
      title: 'Google Ads Temelleri',
      description: 'Google Ads platformunu detaylı öğrenin',
      position: 2,
      total_lessons: 6,
      duration_minutes: 240,
      is_published: true
    },
    {
      id: 'mod-1-3',
      course_id: '1',
      title: 'Facebook Ads Stratejileri',
      description: 'Facebook Ads ile etkili kampanyalar oluşturun',
      position: 3,
      total_lessons: 5,
      duration_minutes: 200,
      is_published: true
    },
    {
      id: 'mod-1-4',
      course_id: '1',
      title: 'Kampanya Optimizasyonu',
      description: 'ROI\'yi maksimize etme teknikleri',
      position: 4,
      total_lessons: 4,
      duration_minutes: 160,
      is_published: true
    },
    {
      id: 'mod-1-5',
      course_id: '1',
      title: 'İleri Seviye Taktikler',
      description: 'Profesyonel düzeyde reklam stratejileri',
      position: 5,
      total_lessons: 5,
      duration_minutes: 220,
      is_published: true
    },
    {
      id: 'mod-1-6',
      course_id: '1',
      title: 'Otomasyon ve AI',
      description: 'Yapay zeka destekli reklam otomasyonu',
      position: 6,
      total_lessons: 3,
      duration_minutes: 140,
      is_published: true
    },
    {
      id: 'mod-1-7',
      course_id: '1',
      title: 'Raporlama ve Analiz',
      description: 'Performans ölçümü ve raporlama teknikleri',
      position: 7,
      total_lessons: 2,
      duration_minutes: 100,
      is_published: true
    },
    {
      id: 'mod-1-8',
      course_id: '1',
      title: 'Praktik Projeler',
      description: 'Gerçek kampanyalar üzerinde uygulama',
      position: 8,
      total_lessons: 3,
      duration_minutes: 180,
      is_published: true
    }
  ],
  '2': [ // Ürün Araştırması
    {
      id: 'mod-2-1',
      course_id: '2',
      title: 'Ürün Araştırmasına Giriş',
      description: 'E-ticarette ürün araştırmasının temelleri',
      position: 1,
      total_lessons: 3,
      duration_minutes: 120,
      is_published: true
    },
    {
      id: 'mod-2-2',
      course_id: '2',
      title: 'Pazar Analizi',
      description: 'Hedef pazar belirleme ve analiz teknikleri',
      position: 2,
      total_lessons: 4,
      duration_minutes: 160,
      is_published: true
    },
    {
      id: 'mod-2-3',
      course_id: '2',
      title: 'Rekabet Analizi',
      description: 'Rakip analizi ve pozisyonlama stratejileri',
      position: 3,
      total_lessons: 3,
      duration_minutes: 140,
      is_published: true
    },
    {
      id: 'mod-2-4',
      course_id: '2',
      title: 'Trend Takibi',
      description: 'Güncel trendleri takip etme yöntemleri',
      position: 4,
      total_lessons: 4,
      duration_minutes: 180,
      is_published: true
    },
    {
      id: 'mod-2-5',
      course_id: '2',
      title: 'Araştırma Araçları',
      description: 'Profesyonel araştırma araçları kullanımı',
      position: 5,
      total_lessons: 3,
      duration_minutes: 150,
      is_published: true
    },
    {
      id: 'mod-2-6',
      course_id: '2',
      title: 'Karlılık Analizi',
      description: 'Ürün karlılık hesaplamaları',
      position: 6,
      total_lessons: 3,
      duration_minutes: 140,
      is_published: true
    }
  ],
  '3': [ // Full Mentorluk
    {
      id: 'mod-3-1',
      course_id: '3',
      title: 'Programa Başlangıç',
      description: 'Mentorluk programına giriş ve hedef belirleme',
      position: 1,
      total_lessons: 3,
      duration_minutes: 150,
      is_published: true
    },
    {
      id: 'mod-3-2',
      course_id: '3',
      title: 'İş Modelinizi Belirleyin',
      description: 'Kişiselleştirilmiş iş modeli geliştirme',
      position: 2,
      total_lessons: 4,
      duration_minutes: 200,
      is_published: true
    },
    {
      id: 'mod-3-3',
      course_id: '3',
      title: 'Pazara Giriş Stratejisi',
      description: 'Pazara etkili giriş planları',
      position: 3,
      total_lessons: 5,
      duration_minutes: 240,
      is_published: true
    },
    {
      id: 'mod-3-4',
      course_id: '3',
      title: 'Finansal Planlama',
      description: 'İş finansmanı ve bütçe yönetimi',
      position: 4,
      total_lessons: 4,
      duration_minutes: 180,
      is_published: true
    },
    {
      id: 'mod-3-5',
      course_id: '3',
      title: 'Operasyonel Süreçler',
      description: 'İş süreçlerini optimize etme',
      position: 5,
      total_lessons: 5,
      duration_minutes: 220,
      is_published: true
    },
    {
      id: 'mod-3-6',
      course_id: '3',
      title: 'Pazarlama Stratejileri',
      description: 'Kişiselleştirilmiş pazarlama planları',
      position: 6,
      total_lessons: 6,
      duration_minutes: 280,
      is_published: true
    },
    {
      id: 'mod-3-7',
      course_id: '3',
      title: 'Büyüme Stratejileri',
      description: 'İşinizi büyütme teknikleri',
      position: 7,
      total_lessons: 5,
      duration_minutes: 240,
      is_published: true
    },
    {
      id: 'mod-3-8',
      course_id: '3',
      title: 'Otomatisasyon',
      description: 'İş süreçlerinde otomasyon',
      position: 8,
      total_lessons: 4,
      duration_minutes: 200,
      is_published: true
    },
    {
      id: 'mod-3-9',
      course_id: '3',
      title: 'Ölçekleme',
      description: 'İşinizi ölçeklendirme stratejileri',
      position: 9,
      total_lessons: 5,
      duration_minutes: 220,
      is_published: true
    },
    {
      id: 'mod-3-10',
      course_id: '3',
      title: 'Ekip Yönetimi',
      description: 'Takım kurma ve yönetme',
      position: 10,
      total_lessons: 4,
      duration_minutes: 180,
      is_published: true
    },
    {
      id: 'mod-3-11',
      course_id: '3',
      title: 'Uluslararası Pazarlar',
      description: 'Global pazarlara açılma',
      position: 11,
      total_lessons: 3,
      duration_minutes: 160,
      is_published: true
    },
    {
      id: 'mod-3-12',
      course_id: '3',
      title: 'Sürdürülebilir Başarı',
      description: 'Uzun vadeli başarı stratejileri',
      position: 12,
      total_lessons: 4,
      duration_minutes: 200,
      is_published: true
    }
  ],
  '4': [ // Shopify
    {
      id: 'mod-4-1',
      course_id: '4',
      title: 'Shopify\'a Başlarken',
      description: 'Platform tanıtımı ve hesap kurulumu',
      position: 1,
      total_lessons: 3,
      duration_minutes: 120,
      is_published: true
    },
    {
      id: 'mod-4-2',
      course_id: '4',
      title: 'Mağaza Kurulumu',
      description: 'Temel mağaza ayarları',
      position: 2,
      total_lessons: 4,
      duration_minutes: 180,
      is_published: true
    },
    {
      id: 'mod-4-3',
      course_id: '4',
      title: 'Tema ve Tasarım',
      description: 'Görsel tasarım ve özelleştirme',
      position: 3,
      total_lessons: 3,
      duration_minutes: 150,
      is_published: true
    },
    {
      id: 'mod-4-4',
      course_id: '4',
      title: 'Yayına Alma',
      description: 'Mağazanızı canlıya alma',
      position: 4,
      total_lessons: 2,
      duration_minutes: 90,
      is_published: true
    }
  ],
  '5': [ // Sosyal Medya
    {
      id: 'mod-5-1',
      course_id: '5',
      title: 'Sosyal Medya Temelleri',
      description: 'Sosyal medya pazarlamada başlangıç',
      position: 1,
      total_lessons: 3,
      duration_minutes: 140,
      is_published: true
    },
    {
      id: 'mod-5-2',
      course_id: '5',
      title: 'Instagram Pazarlama',
      description: 'Instagram\'da etkili pazarlama',
      position: 2,
      total_lessons: 4,
      duration_minutes: 180,
      is_published: true
    },
    {
      id: 'mod-5-3',
      course_id: '5',
      title: 'TikTok Stratejileri',
      description: 'TikTok\'ta viral olma teknikleri',
      position: 3,
      total_lessons: 3,
      duration_minutes: 160,
      is_published: true
    },
    {
      id: 'mod-5-4',
      course_id: '5',
      title: 'Facebook Ads',
      description: 'Facebook reklamcılığı',
      position: 4,
      total_lessons: 3,
      duration_minutes: 150,
      is_published: true
    },
    {
      id: 'mod-5-5',
      course_id: '5',
      title: 'İçerik Stratejisi',
      description: 'Etkili içerik planlama',
      position: 5,
      total_lessons: 3,
      duration_minutes: 140,
      is_published: true
    }
  ]
};

export const mockLessons: Record<string, Lesson[]> = {
  'mod-1-1': [
    {
      id: 'lesson-1-1-1',
      module_id: 'mod-1-1',
      title: 'PPC Nedir ve Neden Önemlidir?',
      slug: 'ppc-nedir',
      description: 'Pay-per-click reklamcılığın temel kavramları',
      type: 'video',
      position: 1,
      duration_minutes: 45,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-1-2',
      module_id: 'mod-1-1',
      title: 'Dijital Reklam Ekosistemi',
      slug: 'dijital-reklam-ekosistemi',
      description: 'Dijital reklamcılık platformlarına genel bakış',
      type: 'video',
      position: 2,
      duration_minutes: 38,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-1-3',
      module_id: 'mod-1-1',
      title: 'Hedef Kitle Belirleme',
      slug: 'hedef-kitle-belirleme',
      description: 'Doğru hedef kitle nasıl belirlenir?',
      type: 'video',
      position: 3,
      duration_minutes: 42,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-1-4',
      module_id: 'mod-1-1',
      title: 'Modül 1 Değerlendirme',
      slug: 'modul-1-degerlendirme',
      description: 'PPC temellerini test edin',
      type: 'quiz',
      position: 4,
      duration_minutes: 15,
      is_published: true,
      content: 'Bu quiz ile öğrendiklerinizi test edebilirsiniz.'
    }
  ],
  'mod-1-2': [
    {
      id: 'lesson-1-2-1',
      module_id: 'mod-1-2',
      title: 'Google Ads Hesap Kurulumu',
      slug: 'google-ads-hesap-kurulumu',
      description: 'Adım adım Google Ads hesabı oluşturma',
      type: 'video',
      position: 1,
      duration_minutes: 35,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-2-2',
      module_id: 'mod-1-2',
      title: 'Kampanya Türleri',
      slug: 'kampanya-turleri',
      description: 'Google Ads\'te kampanya türleri ve seçimi',
      type: 'video',
      position: 2,
      duration_minutes: 50,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-2-3',
      module_id: 'mod-1-2',
      title: 'Anahtar Kelime Araştırması',
      slug: 'anahtar-kelime-arastirmasi',
      description: 'Etkili anahtar kelime bulma teknikleri',
      type: 'video',
      position: 3,
      duration_minutes: 45,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-2-4',
      module_id: 'mod-1-2',
      title: 'Reklam Metni Yazımı',
      slug: 'reklam-metni-yazimi',
      description: 'Dönüştüren reklam metinleri yazma',
      type: 'video',
      position: 4,
      duration_minutes: 40,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-2-5',
      module_id: 'mod-1-2',
      title: 'Teklif Stratejileri',
      slug: 'teklif-stratejileri',
      description: 'Google Ads teklif türleri ve optimizasyon',
      type: 'video',
      position: 5,
      duration_minutes: 35,
      is_published: true,
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'lesson-1-2-6',
      module_id: 'mod-1-2',
      title: 'Pratik Uygulama',
      slug: 'google-ads-pratik',
      description: 'İlk Google Ads kampanyanızı oluşturun',
      type: 'assignment',
      position: 6,
      duration_minutes: 60,
      is_published: true,
      content: 'Bu ödevde Google Ads hesabınızda gerçek bir kampanya oluşturacaksınız.'
    }
  ]
};

export const mockMaterials: Record<string, LessonMaterial[]> = {
  'lesson-1-1-1': [
    {
      id: 'mat-1',
      lesson_id: 'lesson-1-1-1',
      title: 'PPC Terimler Sözlüğü',
      description: 'Dijital reklamcılıkta kullanılan temel terimler',
      file_name: 'ppc-terimler-sozlugu.pdf',
      file_url: '/materials/ppc-terimler-sozlugu.pdf',
      file_type: 'PDF',
      file_size: 1245680,
      download_count: 45
    },
    {
      id: 'mat-2',
      lesson_id: 'lesson-1-1-1',
      title: 'PPC Platform Karşılaştırma Tablosu',
      description: 'Farklı PPC platformlarının özellik karşılaştırması',
      file_name: 'ppc-platform-karsilastirma.xlsx',
      file_url: '/materials/ppc-platform-karsilastirma.xlsx',
      file_type: 'Excel',
      file_size: 856432,
      download_count: 32
    }
  ],
  'lesson-1-1-2': [
    {
      id: 'mat-3',
      lesson_id: 'lesson-1-1-2',
      title: 'Dijital Reklam Ekosistemi Haritası',
      description: 'Dijital reklamcılık ekosisteminin görsel haritası',
      file_name: 'dijital-reklam-haritasi.png',
      file_url: '/materials/dijital-reklam-haritasi.png',
      file_type: 'PNG',
      file_size: 2456789,
      download_count: 67
    }
  ]
};