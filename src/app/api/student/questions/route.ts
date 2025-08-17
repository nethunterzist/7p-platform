import { NextRequest, NextResponse } from 'next/server';

// Mock veri - gerçek uygulamada veritabanından gelecek
let mockQuestions = [
  {
    id: '1',
    studentId: 'current_user_id',
    studentName: 'Ahmet Yılmaz',
    courseId: 'amazon-ppc-reklam-uzmanligi',
    courseName: 'Amazon PPC Reklam Uzmanlığı',
    lessonId: 'ppc-1',
    lessonName: 'PPC Reklamcılığa Giriş',
    body: 'Amazon PPC reklamlarında ACOS oranı ne olmalı? Hangi metriklere odaklanmalıyım?',
    status: 'answered',
    createdAt: '2024-01-15T10:30:00Z',
    replies: [
      {
        id: 'r1',
        authorName: 'Haşem Başaran',
        authorRole: 'Eğitmen',
        body: 'ACOS oranınız genellikle kar marjınızın altında olmalı. Başlangıçta %20-30 arası normal, zamanla %15 altına düşürmeyi hedefleyin. CTR, CVR ve impression share metriklerine de odaklanın.',
        createdAt: '2024-01-15T14:20:00Z'
      }
    ]
  },
  {
    id: '2',
    studentId: 'current_user_id',
    studentName: 'Zeynep Kaya',
    courseId: 'amazon-ppc-reklam-uzmanligi',
    courseName: 'Amazon PPC Reklam Uzmanlığı',
    lessonId: 'ppc-1',
    lessonName: 'PPC Reklamcılığa Giriş',
    body: 'Sponsored Products ve Sponsored Brands arasındaki fark nedir? Hangisini önce başlamalıyım?',
    status: 'answered',
    createdAt: '2024-01-14T09:15:00Z',
    replies: [
      {
        id: 'r2',
        authorName: 'Haşem Başaran',
        authorRole: 'Eğitmen',
        body: 'Sponsored Products ürün bazlı reklamlardır ve başlangıç için idealdir. Sponsored Brands ise marka bazlı reklamlardır ve Brand Registry gerektirir. Önce Sponsored Products ile başlayın, deneyim kazandıktan sonra Sponsored Brands\'e geçin.',
        createdAt: '2024-01-14T16:30:00Z'
      }
    ]
  },
  {
    id: '3',
    studentId: 'current_user_id',
    studentName: 'Mehmet Özkan',
    courseId: 'amazon-ppc-reklam-uzmanligi',
    courseName: 'Amazon PPC Reklam Uzmanlığı',
    lessonId: 'ppc-1',
    lessonName: 'PPC Reklamcılığa Giriş',
    body: 'Keyword araştırması yaparken hangi araçları kullanmalıyım? Ücretsiz alternatifler var mı?',
    status: 'answered',
    createdAt: '2024-01-13T16:45:00Z',
    replies: [
      {
        id: 'r3',
        authorName: 'Haşem Başaran',
        authorRole: 'Eğitmen',
        body: 'Helium 10, Jungle Scout ve AMZScout en popüler araçlar. Ücretsiz için Amazon\'ın kendi Search Term Report\'unu, Google Keyword Planner\'ı ve Sonar aracını kullanabilirsiniz. Başlangıç için bunlar yeterli.',
        createdAt: '2024-01-13T20:10:00Z'
      }
    ]
  },
  {
    id: '4',
    studentId: 'current_user_id',
    studentName: 'Ayşe Demir',
    courseId: 'amazon-ppc-reklam-uzmanligi',
    courseName: 'Amazon PPC Reklam Uzmanlığı',
    lessonId: 'ppc-1',
    lessonName: 'PPC Reklamcılığa Giriş',
    body: 'Negatif keyword\'lerin önemi nedir? Ne zaman ve nasıl eklemeliyim?',
    status: 'answered',
    createdAt: '2024-01-12T11:20:00Z',
    replies: [
      {
        id: 'r4',
        authorName: 'Haşem Başaran',
        authorRole: 'Eğitmen',
        body: 'Negatif keyword\'ler gereksiz tıklamaları engelleyerek ACOS\'unuzu düşürür. Search Term Report\'unuzda convert etmeyen, alakasız terimleri negatif olarak ekleyin. Haftalık olarak kontrol edin ve optimizasyon yapın.',
        createdAt: '2024-01-12T18:35:00Z'
      }
    ]
  },
  {
    id: '5',
    studentId: 'current_user_id',
    studentName: 'Can Yılmaz',
    courseId: 'amazon-ppc-reklam-uzmanligi',
    courseName: 'Amazon PPC Reklam Uzmanlığı',
    lessonId: 'ppc-1',
    lessonName: 'PPC Reklamcılığa Giriş',
    body: 'Automatic kampanya mı yoksa Manual kampanya mı daha etkili? Hangisiyle başlamalıyım?',
    status: 'new',
    createdAt: '2024-01-11T14:50:00Z',
    replies: []
  }
];

// POST /api/student/questions - Yeni soru ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      studentId, 
      studentName, 
      courseId, 
      courseName, 
      lessonId, 
      lessonName, 
      question 
    } = body;

    // Validasyon
    if (!studentId || !studentName) {
      return NextResponse.json(
        { success: false, error: 'Öğrenci bilgileri eksik' },
        { status: 400 }
      );
    }

    if (!courseId || !courseName) {
      return NextResponse.json(
        { success: false, error: 'Kurs bilgileri eksik' },
        { status: 400 }
      );
    }

    if (!lessonId || !lessonName) {
      return NextResponse.json(
        { success: false, error: 'Ders bilgileri eksik' },
        { status: 400 }
      );
    }

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: 'Soru metni boş olamaz' },
        { status: 400 }
      );
    }

    // Yeni soru oluştur
    const newQuestion = {
      id: `q_${Date.now()}`,
      studentId,
      studentName,
      courseId,
      courseName,
      lessonId,
      lessonName,
      body: question.trim(),
      status: 'new' as const,
      createdAt: new Date().toISOString(),
      replies: []
    };

    // Mock verilere ekle (gerçek uygulamada veritabanına kaydedilir)
    mockQuestions.push(newQuestion);

    // Admin bildirim sistemi (gerçek uygulamada)
    try {
      // await notifyAdmins(newQuestion);
      console.log('Admin bildirim gönderildi:', newQuestion.id);
    } catch (notificationError) {
      console.error('Admin notification error:', notificationError);
      // Bildirim hatası soru gönderme işlemini engellemez
    }
    
    return NextResponse.json({
      success: true,
      data: newQuestion,
      message: 'Sorunuz başarıyla gönderildi. Eğitmenimiz en kısa sürede yanıtlayacaktır.'
    });

  } catch (error) {
    console.error('Student question error:', error);
    return NextResponse.json(
      { success: false, error: 'Soru gönderilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// GET /api/student/questions - Öğrencinin sorularını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Öğrenci ID gerekli' },
        { status: 400 }
      );
    }

    // Filtreleme
    let filteredQuestions = mockQuestions.filter(q => q.studentId === studentId);

    if (courseId) {
      filteredQuestions = filteredQuestions.filter(q => q.courseId === courseId);
    }

    if (lessonId) {
      filteredQuestions = filteredQuestions.filter(q => q.lessonId === lessonId);
    }

    // Sıralama (en yeni önce)
    filteredQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: {
        questions: filteredQuestions,
        total: filteredQuestions.length
      }
    });

  } catch (error) {
    console.error('Student questions get error:', error);
    return NextResponse.json(
      { success: false, error: 'Sorular alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}