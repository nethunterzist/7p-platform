import { NextRequest, NextResponse } from 'next/server';

// Mock veri - gerçek uygulamada veritabanından gelecek
const mockQuestions = [
  {
    id: '1',
    studentId: 'user1',
    studentName: 'Ahmet Yılmaz',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-1',
    lessonName: 'Amazon FBA\'ya Giriş',
    body: 'Amazon FBA için minimum bütçe ne kadar olmalı? Başlangıç sermayesi konusunda kafam karışık.',
    status: 'new',
    createdAt: '2024-01-15T10:30:00Z',
    replies: []
  },
  {
    id: '2',
    studentId: 'user2',
    studentName: 'Zeynep Kaya',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-2',
    lessonName: 'Ürün Araştırması',
    body: 'Ürün araştırması yaparken hangi araçları kullanmalıyım? Ücretsiz alternatifler var mı?',
    status: 'answered',
    createdAt: '2024-01-14T15:45:00Z',
    replies: [
      {
        id: 'reply1',
        questionId: '2',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Helium 10, Jungle Scout ve AMZScout gibi araçlar çok etkili. Başlangıç için Helium 10\'un ücretsiz versiyonu yeterli olacaktır.',
        createdAt: '2024-01-14T16:30:00Z'
      }
    ]
  },
  {
    id: '3',
    studentId: 'user3',
    studentName: 'Mehmet Sayan',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-3',
    lessonName: 'Private Label Stratejisi',
    body: 'Private label ürünler için patent araştırması nasıl yapılır? Bu konuda detaylı bilgi alabilir miyim?',
    status: 'new',
    createdAt: '2024-01-13T09:20:00Z',
    replies: []
  },
  {
    id: '4',
    studentId: 'user4',
    studentName: 'Elif Tunç',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-4',
    lessonName: 'Marka Tescili',
    body: 'Amazon\'da marka tescili yapmak zorunlu mu? Brand Registry\'nin avantajları neler?',
    status: 'answered',
    createdAt: '2024-01-12T14:15:00Z',
    replies: [
      {
        id: 'reply2',
        questionId: '4',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Zorunlu değil ama Brand Registry için marka tescili gerekli. Bu da birçok avantaj sağlıyor: A+ Content, Sponsored Brands reklamları, marka koruması vb.',
        createdAt: '2024-01-12T15:00:00Z'
      }
    ]
  },
  {
    id: '5',
    studentId: 'user5',
    studentName: 'Burak Demir',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-5',
    lessonName: 'FBA Ücretleri',
    body: 'FBA ücretleri ne kadar ve nasıl hesaplanıyor? Kar marjımı doğru hesaplamak istiyorum.',
    status: 'hidden',
    createdAt: '2024-01-11T16:40:00Z',
    replies: []
  },
  // Lazy loading test için ek sorular
  {
    id: '6',
    studentId: 'user6',
    studentName: 'Ayşe Öztürk',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-6',
    lessonName: 'Ürün Fotoğrafları',
    body: 'Ürün fotoğrafları için profesyonel çekim şart mı? Hangi açılardan fotoğraf çekmeli?',
    status: 'new',
    createdAt: '2024-01-10T11:25:00Z',
    replies: []
  },
  {
    id: '7',
    studentId: 'user7',
    studentName: 'Emre Kılıç',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-7',
    lessonName: 'PPC Reklamları',
    body: 'Amazon PPC reklamlarına ne kadar bütçe ayırmalıyım? ACOS oranı nasıl hesaplanır?',
    status: 'answered',
    createdAt: '2024-01-09T13:50:00Z',
    replies: [
      {
        id: 'reply3',
        questionId: '7',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Başlangıçta satış fiyatının %10-15\'i kadar PPC bütçesi ayırmanızı öneriyorum. ACOS = (Reklam Harcaması / Reklam Geliri) x 100',
        createdAt: '2024-01-09T14:20:00Z'
      }
    ]
  },
  {
    id: '8',
    studentId: 'user8',
    studentName: 'Can Özkan',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-8',
    lessonName: 'Kargo ve Gümrük',
    body: 'Türkiye\'den Amazon ABD\'ye nasıl ürün gönderebilirim? Gümrük işlemleri nasıl?',
    status: 'new',
    createdAt: '2024-01-08T08:30:00Z',
    replies: []
  },
  {
    id: '9',
    studentId: 'user9',
    studentName: 'Deniz Acar',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-9',
    lessonName: 'Müşteri Yorumları',
    body: 'Amazon\'da negatif review aldığımda ne yapmalıyım? Nasıl müşteri memnuniyeti sağlarım?',
    status: 'answered',
    createdAt: '2024-01-07T19:45:00Z',
    replies: [
      {
        id: 'reply4',
        questionId: '9',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Önce review\'ı analiz edin, haklı bir şikayet varsa düzeltin. Müşteriye özel mesaj atarak sorunu çözmeye çalışın.',
        createdAt: '2024-01-07T20:15:00Z'
      }
    ]
  },
  {
    id: '10',
    studentId: 'user10',
    studentName: 'Fatma Lale',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-10',
    lessonName: 'Seasonal Ürünler',
    body: 'Seasonal ürünlerde stok planlaması nasıl yapılmalı? Q4 hazırlığı için ne zaman başlamalı?',
    status: 'new',
    createdAt: '2024-01-06T12:10:00Z',
    replies: []
  },
  {
    id: '11',
    studentId: 'user11',
    studentName: 'Oğuz Vural',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-11',
    lessonName: 'Rakip Analizi',
    body: 'Amazon\'da competitor analizi nasıl yapılır? Hangi metrikleri takip etmeli?',
    status: 'answered',
    createdAt: '2024-01-05T15:20:00Z',
    replies: [
      {
        id: 'reply5',
        questionId: '11',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Helium 10 X-Ray, Jungle Scout gibi araçlarla rakip analizi yapabilirsiniz. Fiyat, BSR, review sayısı takip edin.',
        createdAt: '2024-01-05T16:00:00Z'
      }
    ]
  },
  {
    id: '12',
    studentId: 'user12',
    studentName: 'Selin Rıza',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-12',
    lessonName: 'Return Yönetimi',
    body: 'FBA\'da return oranı yüksekse ne yapmalı? Müşteri beklentilerini nasıl yönetmeli?',
    status: 'new',
    createdAt: '2024-01-04T10:35:00Z',
    replies: []
  },
  {
    id: '13',
    studentId: 'user13',
    studentName: 'Murat Bal',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-13',
    lessonName: 'Hesap Güvenliği',
    body: 'Amazon\'da yeni hesap açarken nelere dikkat etmeli? Suspended olmamak için neler yapmalı?',
    status: 'answered',
    createdAt: '2024-01-03T17:25:00Z',
    replies: [
      {
        id: 'reply6',
        questionId: '13',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Temiz IP, yeni bilgiler, doğru dokümantasyon çok önemli. Policy ihlallerinden kaçının.',
        createdAt: '2024-01-03T18:00:00Z'
      }
    ]
  },
  {
    id: '14',
    studentId: 'user14',
    studentName: 'Gizem Çelik',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-14',
    lessonName: 'Listing Optimizasyonu',
    body: 'Product listing optimization için en önemli faktörler neler? Title nasıl optimize edilir?',
    status: 'new',
    createdAt: '2024-01-02T14:40:00Z',
    replies: []
  },
  {
    id: '15',
    studentId: 'user15',
    studentName: 'Kemal Polat',
    courseId: 'amazon-fba-mastery',
    courseName: 'Amazon FBA Mastery',
    lessonId: 'lesson-15',
    lessonName: 'Launch Stratejisi',
    body: 'Amazon\'da launch stratejim ne olmalı? İlk satışları nasıl gerçekleştirmeli?',
    status: 'answered',
    createdAt: '2024-01-01T09:15:00Z',
    replies: [
      {
        id: 'reply7',
        questionId: '15',
        responderId: 'admin1',
        responderName: 'Haşem Başaran',
        body: 'Önce organik sıralamaya odaklanın, sonra PPC ekleyin. İlk 2-3 hafta agresif pricing yapın.',
        createdAt: '2024-01-01T10:00:00Z'
      }
    ]
  }
];

// GET /api/admin/qna - Tüm soruları listele
export async function GET(request: NextRequest) {
  try {
    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');

    // Filtreleme
    let filteredQuestions = [...mockQuestions];

    if (status && status !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.status === status);
    }

    if (courseId && courseId !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.courseId === courseId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredQuestions = filteredQuestions.filter(q =>
        q.body.toLowerCase().includes(searchLower) ||
        q.studentName.toLowerCase().includes(searchLower) ||
        q.courseName.toLowerCase().includes(searchLower)
      );
    }

    // Sıralama (en yeni önce)
    filteredQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Sayfalama
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

    // İstatistikler
    const stats = {
      total: mockQuestions.length,
      new: mockQuestions.filter(q => q.status === 'new').length,
      answered: mockQuestions.filter(q => q.status === 'answered').length,
      hidden: mockQuestions.filter(q => q.status === 'hidden').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        questions: paginatedQuestions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredQuestions.length / limit),
          totalItems: filteredQuestions.length,
          itemsPerPage: limit
        },
        stats
      }
    });

  } catch (error) {
    console.error('QnA list error:', error);
    return NextResponse.json(
      { success: false, error: 'Sorular alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}