"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { 
  getCourseDetailBySlug,
  type CourseDetail,
  type Module,
  type Lesson
} from '@/data/courses';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  MessageSquare,
  User,
  Send,
  File,
  Table,
  Link,
  FileIcon
} from 'lucide-react';

interface LessonMaterial {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  student_name: string;
  created_at: string;
}

export default function LessonDetailPage({ 
  params 
}: { 
  params: Promise<{ courseId: string; moduleId: string; lessonId: string }> 
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>('');
  const [moduleId, setModuleId] = useState<string>('');
  const [lessonId, setLessonId] = useState<string>('');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'qa' | 'materials'>('qa');
  const [userNotes, setUserNotes] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [displayedQAs, setDisplayedQAs] = useState<QAItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreQAs, setHasMoreQAs] = useState(true);
  const [loadingQAs, setLoadingQAs] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.courseId);
      setModuleId(resolvedParams.moduleId);
      setLessonId(resolvedParams.lessonId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (courseId && moduleId && lessonId) {
      fetchLessonData();
    }
  }, [courseId, moduleId, lessonId]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);

      // Get course details
      const courseData = getCourseDetailBySlug(courseId);
      if (!courseData) {
        throw new Error('Kurs bulunamadı');
      }
      setCourse(courseData);

      // Find current module
      const module = courseData.modules?.find(m => m.id === moduleId);
      if (!module) {
        throw new Error('Modül bulunamadı');
      }
      setCurrentModule(module);

      // Find current lesson
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (!lesson) {
        throw new Error('Ders bulunamadı');
      }
      setCurrentLesson(lesson);

      // Check if lesson is completed (mock implementation)
      setIsCompleted(lesson.completed || false);


    } catch (err: any) {
      console.error('Lesson fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = () => {
    const wasCompleted = isCompleted;
    setIsCompleted(!isCompleted);
    
    // Show appropriate toast message
    if (!wasCompleted) {
      toast.success('🎉 Tebrikler! Ders tamamlandı.', {
        duration: 3000,
        position: 'top-left',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10B981',
        },
      });
    } else {
      toast('Ders tamamlanmış olarak işaretlendi.', {
        duration: 2000,
        position: 'top-left',
        icon: '📚',
        style: {
          background: '#6B7280',
          color: '#fff',
        },
      });
    }
    
    // In real app, this would save to database
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;

    const loadingToast = toast.loading('Soru gönderiliyor...', {
      position: 'top-left',
    });

    try {
      const response = await fetch('/api/student/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: 'current_user_id', // Gerçek uygulamada session'dan gelecek
          studentName: 'Mevcut Kullanıcı', // Gerçek uygulamada session'dan gelecek
          courseId: courseId,
          courseName: course?.title,
          lessonId: lessonId,
          lessonName: currentLesson?.title,
          question: newQuestion.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNewQuestion('');
        
        // Refresh Q&A list
        setDisplayedQAs([]);
        setCurrentPage(0);
        setHasMoreQAs(true);
        loadQAs();
        
        // Success toast
        toast.success('✅ Sorunuz başarıyla gönderildi!', {
          id: loadingToast,
          duration: 4000,
          position: 'top-left',
          style: {
            background: '#3B82F6',
            color: '#fff',
            fontWeight: '500',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#3B82F6',
          },
        });
        
        // Follow-up toast
        setTimeout(() => {
          toast('👨‍🏫 Eğitmenimiz en kısa sürede yanıtlayacaktır.', {
            duration: 3000,
            position: 'top-left',
            style: {
              background: '#6366F1',
              color: '#fff',
            },
          });
        }, 1000);
      } else {
        toast.error(result.error || 'Soru gönderilirken bir hata oluştu', {
          id: loadingToast,
          position: 'top-left',
        });
      }
    } catch (error) {
      console.error('Question submit error:', error);
      toast.error('Soru gönderilirken bir hata oluştu', {
        id: loadingToast,
        position: 'top-left',
      });
    }
  };

  // Initial load of Q&A items
  useEffect(() => {
    if (activeTab === 'qa' && displayedQAs.length === 0) {
      loadQAs();
    }
  }, [activeTab, lessonId]);

  // Load Q&A items from API
  const loadQAs = async () => {
    if (loadingQAs) return;
    
    setLoadingQAs(true);
    
    try {
      const response = await fetch(`/api/student/questions?studentId=current_user_id&lessonId=${lessonId}`);
      const result = await response.json();
      
      if (result.success) {
        const questions = result.data.questions.map((q: any) => ({
          id: q.id,
          question: q.body,
          answer: q.replies.length > 0 ? q.replies[q.replies.length - 1].body : '',
          student_name: q.studentName,
          created_at: q.createdAt
        }));
        
        setDisplayedQAs(questions);
        setHasMoreQAs(false); // API'den tek seferde tüm veriler geldiği için
        setLoadingQAs(false);
      } else {
        // API response unsuccessful, fallback to mock data
        console.log('API unsuccessful, loading mock data...');
        await loadMoreQAs();
      }
    } catch (error) {
      console.error('Q&A load error:', error);
      // Fallback to mock data
      console.log('API error, loading mock data...');
      await loadMoreQAs();
    }
  };

  // Lazy loading function for mock data (fallback)
  const loadMoreQAs = async () => {
    if (loadingQAs || !hasMoreQAs) return;
    
    setLoadingQAs(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const itemsPerPage = 5;
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const newQAs = allQAndA.slice(startIndex, endIndex);
    
    if (newQAs.length === 0) {
      setHasMoreQAs(false);
    } else {
      setDisplayedQAs(prev => [...prev, ...newQAs]);
      setCurrentPage(prev => prev + 1);
      
      // Check if we've loaded all items
      if (endIndex >= allQAndA.length) {
        setHasMoreQAs(false);
      }
    }
    
    setLoadingQAs(false);
  };

  // Scroll handler for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Load more when user is near bottom (within 100px)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreQAs();
    }
  };

  const getAdjacentLessons = () => {
    if (!course || !currentModule) return { prev: null, next: null };
    
    const allLessons = course.modules?.flatMap(m => 
      m.lessons.map(l => ({ ...l, moduleId: m.id, moduleTitle: m.title }))
    ) || [];
    
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    
    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
    };
  };

  const navigateToLesson = (lesson: any) => {
    router.push(`/courses/${courseId}/modules/${lesson.moduleId}/lessons/${lesson.id}`);
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="h-8 w-8 text-red-600" />;
      case 'excel':
        return <Table className="h-8 w-8 text-green-600" />;
      case 'link':
        return <Link className="h-8 w-8 text-blue-600" />;
      case 'document':
        return <FileText className="h-8 w-8 text-gray-600" />;
      default:
        return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const handleMaterialAction = (material: LessonMaterial) => {
    try {
      if (material.file_type === 'link') {
        // Open link in new tab
        window.open(material.file_url, '_blank', 'noopener,noreferrer');
        toast.success('🔗 Link yeni sekmede açıldı!', {
          duration: 2000,
          position: 'top-right',
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
        });
      } else {
        // Handle file download
        const link = document.createElement('a');
        link.href = material.file_url;
        link.download = material.title;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('📥 Dosya indiriliyor...', {
          duration: 2000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
      }
    } catch (error) {
      console.error('Material action error:', error);
      toast.error('❌ Dosya işlemi başarısız. Lütfen tekrar deneyin.', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
    }
  };

  // Mock materials data with different types
  const materials: LessonMaterial[] = [
    {
      id: '1',
      title: 'Amazon PPC Kampanya Şablonu',
      description: 'Excel formatında PPC kampanya planlama şablonu',
      file_url: '/materials/ppc-template.xlsx',
      file_type: 'excel'
    },
    {
      id: '2',
      title: 'Ders Sunumu',
      description: 'PDF formatında ders içeriği ve notlar',
      file_url: '/materials/lesson-slides.pdf',
      file_type: 'pdf'
    },
    {
      id: '3',
      title: 'Helium 10 Aracı Linki',
      description: 'PPC keyword araştırması için önerilen araç',
      file_url: 'https://www.helium10.com/tools/cerebro/',
      file_type: 'link'
    },
    {
      id: '4',
      title: 'PPC Strateji Dökümanı',
      description: 'Detaylı PPC strateji rehberi',
      file_url: '/materials/ppc-strategy.docx',
      file_type: 'document'
    }
  ];

  // Extended Mock Q&A data for lazy loading demo
  const allQAndA: QAItem[] = [
    {
      id: '1',
      question: 'Amazon FBA için minimum bütçe ne kadar olmalı?',
      answer: 'Amazon FBA\'ya başlamak için minimum 2000-3000$ bütçe önerilir. Bu bütçe ürün alımı, Amazon ücretleri ve pazarlama için yeterlidir.',
      student_name: 'Ahmet Y.',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      question: 'Ürün araştırması yaparken hangi araçları kullanmalıyım?',
      answer: 'Helium 10, Jungle Scout ve AMZScout gibi araçlar çok etkili. Başlangıç için Helium 10\'un ücretsiz versiyonu yeterli olacaktır.',
      student_name: 'Zeynep K.',
      created_at: '2024-01-14T15:45:00Z'
    },
    {
      id: '3',
      question: 'Private label ürünler için patent araştırması nasıl yapılır?',
      answer: 'USPTO veritabanını kullanarak patent araştırması yapabilirsiniz. Ayrıca patent avukatından danışmanlık almanızı önemle tavsiye ederim.',
      student_name: 'Mehmet S.',
      created_at: '2024-01-13T09:20:00Z'
    },
    {
      id: '4',
      question: 'Amazon\'da marka tescili yapmak zorunlu mu?',
      answer: 'Zorunlu değil ama Brand Registry için marka tescili gerekli. Bu da birçok avantaj sağlıyor: A+ Content, Sponsored Brands reklamları, marka koruması vb.',
      student_name: 'Elif T.',
      created_at: '2024-01-12T14:15:00Z'
    },
    {
      id: '5',
      question: 'FBA ücretleri ne kadar ve nasıl hesaplanıyor?',
      answer: 'FBA ücretleri ürünün boyutu, ağırlığı ve kategori, kategori bazında değişiyor. Amazon\'un FBA hesaplama aracını kullanarak net kar marjınızı hesaplayabilirsiniz.',
      student_name: 'Burak D.',
      created_at: '2024-01-11T16:40:00Z'
    },
    {
      id: '6',
      question: 'Ürün fotoğrafları için profesyonel çekim şart mı?',
      answer: 'Ana fotoğraf mutlaka profesyonel olmalı. Diğer fotoğraflar için kendiniz de kaliteli çekimler yapabilirsiniz. Önemli olan ürünü doğru tanıtmak.',
      student_name: 'Ayşe M.',
      created_at: '2024-01-10T11:25:00Z'
    },
    {
      id: '7',
      question: 'Amazon PPC reklamlarına ne kadar bütçe ayırmalıyım?',
      answer: 'Başlangıçta satış fiyatının %10-15\'i kadar PPC bütçesi ayırmanızı öneriyorum. Sonrasında ACOS değerlerinize göre ayarlayabilirsiniz.',
      student_name: 'Emre K.',
      created_at: '2024-01-09T13:50:00Z'
    },
    {
      id: '8',
      question: 'Türkiye\'den Amazon ABD\'ye nasıl ürün gönderebilirim?',
      answer: 'DHL, UPS gibi kargo firmalarıyla veya freight forwarder şirketlerle çalışabilirsiniz. Customs değeri ve gümrük işlemleri önemli.',
      student_name: 'Can Ö.',
      created_at: '2024-01-08T08:30:00Z'
    },
    {
      id: '9',
      question: 'Amazon\'da negatif review aldığımda ne yapmalıyım?',
      answer: 'Önce review\'ı analiz edin, haklı bir şikayet varsa düzeltin. Müşteriye özel mesaj atarak sorunu çözmeye çalışın. Amazon\'a da report edebilirsiniz.',
      student_name: 'Deniz A.',
      created_at: '2024-01-07T19:45:00Z'
    },
    {
      id: '10',
      question: 'Seasonal ürünlerde stok planlaması nasıl yapılmalı?',
      answer: 'Seasonal ürünlerde önceki yılın verilerini analiz edin, talep tahmini yapın ve erken stok hazırlığı yapın. Q4 için özellikle kritik.',
      student_name: 'Fatma L.',
      created_at: '2024-01-06T12:10:00Z'
    },
    {
      id: '11',
      question: 'Amazon\'da competitor analizi nasıl yapılır?',
      answer: 'Helium 10 X-Ray, Jungle Scout, AMZScout gibi araçlarla rakip analizi yapabilirsiniz. Fiyat, BSR, review sayısı gibi metrikleri takip edin.',
      student_name: 'Oğuz V.',
      created_at: '2024-01-05T15:20:00Z'
    },
    {
      id: '12',
      question: 'FBA\'da return oranı yüksekse ne yapmalı?',
      answer: 'Ürün açıklama ve fotoğraflarınızı gözden geçirin. Müşteri beklentileriyle ürün arasında uyumsuzluk olabilir. Kalite kontrol de önemli.',
      student_name: 'Selin R.',
      created_at: '2024-01-04T10:35:00Z'
    },
    {
      id: '13',
      question: 'Amazon\'da yeni hesap açarken nelere dikkat etmeli?',
      answer: 'Temiz IP, yeni bilgiler, doğru dokümantasyon çok önemli. Suspended account geçmişi varsa özellikle dikkatli olun.',
      student_name: 'Murat B.',
      created_at: '2024-01-03T17:25:00Z'
    },
    {
      id: '14',
      question: 'Product listing optimization için en önemli faktörler neler?',
      answer: 'Title\'da önemli keywordler, bullet pointlerde fayda odaklı açıklamalar, yüksek kaliteli fotoğraflar ve A+ Content kritik faktörler.',
      student_name: 'Gizem C.',
      created_at: '2024-01-02T14:40:00Z'
    },
    {
      id: '15',
      question: 'Amazon\'da launch stratejim ne olmalı?',
      answer: 'Önce organik sıralamaya odaklanın, sonra PPC ekleyin. İlk 2-3 hafta agresif pricing, sonrasında kar marjınızı artırın.',
      student_name: 'Kemal P.',
      created_at: '2024-01-01T09:15:00Z'
    }
  ];


  const { next } = getAdjacentLessons();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Ders yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course || !currentModule || !currentLesson) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ders Bulunamadı</h3>
            <Button asChild>
              <button onClick={() => router.push(`/courses/${courseId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kursa Dön
              </button>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Video Player with Lesson Info */}
        <DashboardCard className="mb-8">
          <div className="p-6">
            {/* Lesson Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <PlayCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{currentLesson.duration}</span>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Tamamlandı</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Player */}
            <div className="mb-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://www.youtube.com/embed/0mZ6dCeqK1c?si=LOfR0defrzYTlVBP" 
                  title="Video İzlemesi" 
 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerPolicy="strict-origin-when-cross-origin" 
                  allowFullScreen
                />
              </div>
              
              {/* Action Buttons - Right Side of Card */}
              <div className="flex items-center justify-end space-x-3">
                <Button
                  onClick={handleMarkComplete}
                  variant={isCompleted ? "outline" : "default"}
                  className={`${isCompleted ? "bg-white text-green-600 border-green-300" : "bg-blue-600 text-white"}`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tamamlandı
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tamamla
                    </>
                  )}
                </Button>
                
                {next && (
                  <Button
                    onClick={() => navigateToLesson(next)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <span className="mr-2">Sonraki Ders</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Lesson Description */}
            <div>
              <div className="border-t border-gray-200 mb-6"></div>
              <p className="text-gray-700 leading-relaxed">
                Bu canlı yayın etkinliğinde Amazon FBA dünyasına adım atıyoruz ve programın genel çerçevesini detaylı bir şekilde inceliyoruz. Katılımcılarımızla interaktif bir ortamda buluşarak, Amazon FBA'nın temel prensiplerini, fırsatlarını ve potansiyel zorluklarını ele alacağız. Canlı yayın boyunca gerçek zamanlı sorularınızı yanıtlayarak, Amazon'da satış yapmanın inceliklerini ve başarılı bir FBA işletmesi kurmanın stratejilerini paylaşacağız. Bu açılış seansı, programdaki diğer derslere sağlam bir temel oluştururken, Amazon ekosistemindeki güncel gelişmeler ve fırsatlar hakkında da bilgiler sunacaktır.
              </p>
            </div>
          </div>
        </DashboardCard>

        {/* Materials and Q&A Tabs */}
        <DashboardCard className="mb-8">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'qa'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Sorular ve Cevaplar</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === 'qa' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {allQAndA.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'materials'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Materyaller</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === 'materials' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {materials.length}
                  </span>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {/* Materials Tab */}
              {activeTab === 'materials' && (
                <div>
                  {materials.length > 0 ? (
                    <div className="space-y-4">
                      {materials.map((material) => (
                        <div 
                          key={material.id} 
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all duration-200 hover:shadow-sm"
                          role="button"
                          tabIndex={0}
                          aria-label={`${material.title} - ${material.file_type === 'link' ? 'Linki aç' : 'Dosyayı indir'}`}
                          onClick={() => handleMaterialAction(material)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleMaterialAction(material);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            {getMaterialIcon(material.file_type)}
                            <div>
                              <h3 className="font-medium text-gray-900">{material.title}</h3>
                              <p className="text-sm text-gray-600">{material.description}</p>
                              <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                material.file_type === 'pdf' ? 'bg-red-100 text-red-600' :
                                material.file_type === 'excel' ? 'bg-green-100 text-green-600' :
                                material.file_type === 'link' ? 'bg-blue-100 text-blue-600' :
                                material.file_type === 'document' ? 'bg-gray-100 text-gray-600' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {material.file_type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleMaterialAction(material);
                            }}
                            className="flex-shrink-0"
                          >
                            {material.file_type === 'link' ? (
                              <>
                                <Link className="h-4 w-4 mr-2" />
                                Aç
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                İndir
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p>Bu derste henüz materyal bulunmuyor.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Q&A Tab */}
              {activeTab === 'qa' && (
                <div>
                  {/* Ask Question Section */}
                  <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                      Soru Sor
                    </h3>
                    <div className="space-y-3">
                      <textarea
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Bu dersle ilgili sorunuzu buraya yazın..."
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Eğitmenimiz sorularınızı en kısa sürede yanıtlayacaktır.
                        </p>
                        <Button
                          onClick={handleSubmitQuestion}
                          disabled={!newQuestion.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Soru Gönder
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Existing Q&A with Lazy Loading */}
                  {displayedQAs.length > 0 ? (
                    <div 
                      className="max-h-[600px] overflow-y-auto pr-2"
                      onScroll={handleScroll}
                      style={{ scrollBehavior: 'smooth' }}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sorular ve Cevaplar ({allQAndA.length})</h3>
                      <div className="space-y-6">
                        {displayedQAs.map((qa) => (
                          <div key={qa.id} className="border-l-4 border-blue-500 pl-4">
                            <div className="mb-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">{qa.student_name}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(qa.created_at).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 mb-2">Soru: {qa.question}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <img 
                                  src="https://i.hizliresim.com/ocgo6rs.jpg"
                                  alt="Haşem Başaran"
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div>
                                  <div className="text-sm font-medium text-blue-900 mb-1">Haşem Başaran</div>
                                  <p className="text-gray-700">{qa.answer}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Loading Indicator */}
                        {loadingQAs && (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="ml-3 text-gray-600">Daha fazla soru-cevap yükleniyor...</span>
                          </div>
                        )}
                        
                        {/* End of content indicator */}
                        {!hasMoreQAs && displayedQAs.length > 0 && (
                          <div className="text-center py-6 text-gray-500">
                            <div className="border-t border-gray-200 pt-6">
                              <p className="text-sm">Tüm soru-cevaplar yüklendi</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p>Sorular yükleniyor...</p>
                      {loadingQAs && (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mt-4"></div>
                      )}
                    </div>
                  )}
                </div>
              )}


            </div>
          </div>
        </DashboardCard>

      </div>
      <Toaster />
    </DashboardLayout>
  );
}

// Add Toaster component for toast notifications
export function ToasterProvider() {
  return <Toaster />;
}