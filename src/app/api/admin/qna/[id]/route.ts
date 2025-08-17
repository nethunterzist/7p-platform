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

// GET /api/admin/qna/[id] - Belirli bir soruyu getir
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
      data: question
    });

  } catch (error) {
    console.error('QnA get error:', error);
    return NextResponse.json(
      { success: false, error: 'Soru alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/qna/[id] - Soru durumunu güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validasyon
    if (!status || !['new', 'answered', 'hidden'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz durum değeri' },
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

    // Durumu güncelle
    mockQuestions[questionIndex].status = status;

    // Gerçek uygulamada burada veritabanı güncellemesi yapılır
    
    return NextResponse.json({
      success: true,
      data: mockQuestions[questionIndex],
      message: 'Soru durumu başarıyla güncellendi'
    });

  } catch (error) {
    console.error('QnA update error:', error);
    return NextResponse.json(
      { success: false, error: 'Soru güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/qna/[id] - Soruyu sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const questionIndex = mockQuestions.findIndex(q => q.id === id);
    
    if (questionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Soru bulunamadı' },
        { status: 404 }
      );
    }

    // Soruyu sil
    const deletedQuestion = mockQuestions.splice(questionIndex, 1)[0];

    // Gerçek uygulamada burada veritabanından silme işlemi yapılır
    
    return NextResponse.json({
      success: true,
      data: deletedQuestion,
      message: 'Soru başarıyla silindi'
    });

  } catch (error) {
    console.error('QnA delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Soru silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}