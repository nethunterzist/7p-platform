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
  }
];

// Mock notification service
const sendNotificationToStudent = async (studentId: string, questionId: string, replyBody: string) => {
  // Gerçek uygulamada burada bildirim servisi çağrılır
  console.log(`Notification sent to student ${studentId} for question ${questionId}`);
  console.log(`Reply: ${replyBody.substring(0, 100)}...`);
  
  // Simulate notification success
  return { success: true, notificationId: `notif_${Date.now()}` };
};

// POST /api/admin/qna/[id]/reply - Soruya cevap ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reply, responderId, responderName } = body;

    // Validasyon
    if (!reply || !reply.trim()) {
      return NextResponse.json(
        { success: false, error: 'Cevap metni boş olamaz' },
        { status: 400 }
      );
    }

    if (!responderId || !responderName) {
      return NextResponse.json(
        { success: false, error: 'Cevaplayan kişi bilgileri eksik' },
        { status: 400 }
      );
    }

    const questionIndex = mockQuestions.findIndex(q => q.id === id);
    
    if (questionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Soru bulunamadı' },
        { status: 404 }
      );
    }

    // Yeni cevap oluştur
    const newReply = {
      id: `reply_${Date.now()}`,
      questionId: id,
      responderId,
      responderName,
      body: reply.trim(),
      createdAt: new Date().toISOString()
    };

    // Cevabı soruya ekle
    mockQuestions[questionIndex].replies.push(newReply);
    
    // Soru durumunu "cevaplandı" olarak güncelle
    mockQuestions[questionIndex].status = 'answered';

    // Öğrenciye bildirim gönder
    try {
      await sendNotificationToStudent(
        mockQuestions[questionIndex].studentId,
        id,
        reply.trim()
      );
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Bildirim hatası cevap gönderme işlemini engellemez
    }

    // Gerçek uygulamada burada veritabanı güncellemesi yapılır
    
    return NextResponse.json({
      success: true,
      data: {
        question: mockQuestions[questionIndex],
        reply: newReply
      },
      message: 'Cevap başarıyla gönderildi ve öğrenciye bildirim iletildi'
    });

  } catch (error) {
    console.error('QnA reply error:', error);
    return NextResponse.json(
      { success: false, error: 'Cevap gönderilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// GET /api/admin/qna/[id]/reply - Sorunun cevaplarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const question = mockQuestions.find(q => q.id === id);
    
    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Soru bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        questionId: id,
        replies: question.replies || []
      }
    });

  } catch (error) {
    console.error('QnA replies get error:', error);
    return NextResponse.json(
      { success: false, error: 'Cevaplar alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}