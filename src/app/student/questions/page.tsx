"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare,
  Search,
  Eye,
  MessageCircle,
  Check,
  BookOpen,
  PlayCircle,
  Calendar,
  ChevronDown,
  X,
  Users,
  Star,
  Trophy,
  Target,
  TrendingUp,
  Gift,
  CheckCircle,
  Rocket,
  ShoppingCart,
  HelpCircle,
  Send
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getCurrentUser } from '@/lib/simple-auth';
import { ALL_COURSES } from '@/data/courses';

interface Question {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonName: string;
  body: string;
  status: 'new' | 'answered' | 'hidden';
  createdAt: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  questionId: string;
  responderId: string;
  responderName: string;
  body: string;
  createdAt: string;
}

export default function StudentQuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [courses, setCourses] = useState<Array<{id: string, name: string}>>([]);
  const [hasEnrolledCourses, setHasEnrolledCourses] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'purchased' | 'not-purchased'>('not-purchased');

  // Mock data - öğrencinin kendi soruları
  const mockStudentQuestions: Question[] = [
    {
      id: '1',
      studentId: 'current_user',
      studentName: 'Furkan Yiğit',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-1',
      lessonName: 'Amazon FBA\'ya Giriş',
      body: 'Amazon FBA için minimum bütçe ne kadar olmalı? Başlangıç sermayesi konusunda kafam karışık.',
      status: 'answered',
      createdAt: '2024-01-15T10:30:00Z',
      replies: [
        {
          id: 'reply1',
          questionId: '1',
          responderId: 'admin1',
          responderName: 'Haşem Başaran',
          body: 'Amazon FBA için minimum başlangıç bütçesi genellikle 5.000-10.000 TL arasında değişir. Bu bütçe ürün satın alma, Amazon ücretleri, reklam harcamaları ve diğer operasyonel giderler için gereklidir. İlk başta küçük bütçe ile başlayıp deneyim kazandıkça artırmanızı öneririm.',
          createdAt: '2024-01-15T14:20:00Z'
        }
      ]
    },
    {
      id: '2',
      studentId: 'current_user',
      studentName: 'Furkan Yiğit',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-2',
      lessonName: 'Ürün Araştırması',
      body: 'Ürün araştırması yaparken hangi araçları kullanmalıyım? Ücretsiz alternatifler var mı?',
      status: 'new',
      createdAt: '2024-01-14T15:45:00Z',
      replies: []
    },
    {
      id: '3',
      studentId: 'current_user',
      studentName: 'Furkan Yiğit',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-3',
      lessonName: 'Private Label Stratejisi',
      body: 'Private label ürünler için patent araştırması nasıl yapılır? Bu konuda detaylı bilgi alabilir miyim?',
      status: 'answered',
      createdAt: '2024-01-13T09:20:00Z',
      replies: [
        {
          id: 'reply2',
          questionId: '3',
          responderId: 'admin1',
          responderName: 'Haşem Başaran',
          body: 'Patent araştırması için USPTO (Amerika için) ve TPE (Türkiye için) veri tabanlarını kullanabilirsiniz. Google Patents da ücretsiz bir alternatiftir. Ayrıca profesyonel patent araştırma servisleri de mevcuttur. Ürününüzün patent durumunu kontrol etmek çok önemli, aksi takdirde hukuki sorunlar yaşayabilirsiniz.',
          createdAt: '2024-01-13T16:45:00Z'
        }
      ]
    }
  ];

  const mockCourses = ALL_COURSES.map(course => ({
    id: course.id,
    name: course.title
  }));

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    setLoading(true);

    // Test için: viewMode'a göre hasEnrolledCourses'u ayarlayalım
    const hasEnrolled = viewMode === 'purchased'; // viewMode'a göre dinamik ayarlama
    setHasEnrolledCourses(hasEnrolled);
    
    // Eğer eğitim satın almışsa soruları göster
    const userQuestions = hasEnrolled ? mockStudentQuestions : [];

    // Mock API call - sadece bu kullanıcının soruları
    setTimeout(() => {
      setQuestions(userQuestions);
      setCourses(mockCourses);
      setLoading(false);
    }, 500);
  }, [router, viewMode]);

  // Filter questions based on search and filters
  useEffect(() => {
    let filtered = questions;

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.lessonName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter(q => q.courseId === courseFilter);
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, statusFilter, courseFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Cevap Bekleniyor</span>;
      case 'answered':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Cevaplandı</span>;
      case 'hidden':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Gizli</span>;
      default:
        return null;
    }
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowDetailModal(true);
    setNewReply(''); // Reset reply field when opening modal
  };

  const handleSubmitReply = () => {
    if (!newReply.trim() || !selectedQuestion) {
      toast.error('Lütfen mesajınızı yazın');
      return;
    }

    const reply: Reply = {
      id: `reply_${Date.now()}`,
      questionId: selectedQuestion.id,
      responderId: user?.id || 'current_user',
      responderName: user?.name || 'Furkan Yiğit',
      body: newReply.trim(),
      createdAt: new Date().toISOString()
    };

    // Update the question with new reply
    const updatedQuestions = questions.map(q => {
      if (q.id === selectedQuestion.id) {
        return {
          ...q,
          replies: [...q.replies, reply]
        };
      }
      return q;
    });

    setQuestions(updatedQuestions);
    
    // Update selected question to show new reply immediately
    setSelectedQuestion({
      ...selectedQuestion,
      replies: [...selectedQuestion.replies, reply]
    });

    setNewReply('');
    toast.success('Mesajınız gönderildi!');
  };

  const getAnsweredCount = () => {
    return questions.filter(q => q.status === 'answered').length;
  };

  const getPendingCount = () => {
    return questions.filter(q => q.status === 'new').length;
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Soru & Cevaplarım"
        subtitle="Sorduğunuz sorular ve aldığınız cevaplar"
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Sorularınız yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Eğitim satın almamış kullanıcı için görünüm
  const renderNoCoursesView = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white text-center">
        <div className="flex items-center justify-center mb-4">
          <HelpCircle className="h-16 w-16 text-blue-200" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Sorularını Cevaplatalım! 🤝</h2>
        <p className="text-blue-100 text-lg mb-6">
          Amazon FBA eğitimlerimize kayıt olarak uzman eğitmenlerimizle birebir soru-cevap yapabilirsin!
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">Uzman Eğitmenler</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">24/7 Destek</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">Hızlı Yanıt</span>
          </div>
        </div>
      </div>

      {/* Support Types Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ders Soruları</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Anlayamadığın konular</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Strateji Tavsiyeleri</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Kişisel stratejiler</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">İş Geliştirme</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Büyüme stratejileri</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Teknik Sorunlar</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Sorun çözme desteği</p>
        </div>
      </div>

      {/* What You'll Get */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <Gift className="inline h-6 w-6 text-green-600 mr-2" />
          Eğitime Kaydolunca Neler Kazanırsın?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Sınırsız Soru Hakkı</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">İstediğin kadar soru sorabilirsin</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Hızlı Yanıt Garantisi</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">24 saat içinde cevap</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Uzman Eğitmen Desteği</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Alanında uzman kişilerden yanıt</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Kişisel Rehberlik</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Senin durumuna özel tavsiyeler</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Bugün Başla, Sorularının Cevabını Al! 🚀</h2>
        <p className="text-blue-100 mb-6">
          Amazon FBA'de başarıya ulaşman için gerekli tüm desteği sana sağlıyoruz.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-gray-100">
            <a href="/marketplace" className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Eğitimleri İncele
            </a>
          </Button>
          <Button asChild size="lg" className="bg-white/20 text-white border-white/30">
            <a href="/courses" className="flex items-center">
              <Gift className="h-5 w-5 mr-2" />
              Ücretsiz İçerikleri Gör
            </a>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Soru & Cevaplarım"
      subtitle="Sorduğunuz sorular ve aldığınız cevaplar"
    >
      {/* View Mode Toggle */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Soru & Cevap Görünümü</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Test amacıyla farklı kullanıcı deneyimlerini görüntüleyebilirsiniz</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'purchased' ? 'default' : 'outline'}
                onClick={() => setViewMode('purchased')}
                size="sm"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Eğitim Satın Alan
              </Button>
              <Button
                variant={viewMode === 'not-purchased' ? 'default' : 'outline'}
                onClick={() => setViewMode('not-purchased')}
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Eğitim Satın Almayan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Based on View Mode */}
      {viewMode === 'not-purchased' ? (
        renderNoCoursesView()
      ) : (
        <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-300 shadow-sm">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Soru</p>
                  <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-300 shadow-sm">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cevaplanan</p>
                  <p className="text-2xl font-bold text-gray-900">{getAnsweredCount()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-300 shadow-sm">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cevap Bekleyen</p>
                  <p className="text-2xl font-bold text-gray-900">{getPendingCount()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Filters */}
        <DashboardCard>
          <div className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Sorularda ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="new">Cevap Bekleyenler</option>
                  <option value="answered">Cevaplananlar</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              </div>

              {/* Course Filter */}
              <div className="relative">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Tüm Kurslar</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Questions List */}
        <DashboardCard>
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sorularım ({filteredQuestions.length})
              </h2>
            </div>

            {filteredQuestions.length > 0 ? (
              <div className="space-y-4">
                {filteredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{question.courseName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <PlayCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{question.lessonName}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{question.body}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(question.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          {getStatusBadge(question.status)}
                          {question.replies.length > 0 && (
                            <span className="text-green-600 font-medium">
                              {question.replies.length} cevap var
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQuestion(question)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {question.replies.length > 0 ? 'Cevabı Gör' : 'Detay'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || statusFilter !== 'all' || courseFilter !== 'all'
                    ? 'Filtrelere uygun soru bulunamadı'
                    : 'Henüz soru sormadınız'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {searchTerm || statusFilter !== 'all' || courseFilter !== 'all'
                    ? 'Farklı filtreler deneyebilirsiniz.'
                    : 'Eğitimleriniz hakkında sorularınız varsa destek ekibimizle iletişime geçebilirsiniz.'}
                </p>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Detail Modal */}
        {showDetailModal && selectedQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Soru & Cevap</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetailModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                {/* Question */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Kurs</div>
                      <div className="font-medium text-gray-900 dark:text-white">{selectedQuestion.courseName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Ders</div>
                      <div className="font-medium text-gray-900 dark:text-white">{selectedQuestion.lessonName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Tarih</div>
                      <div className="font-medium text-gray-900 dark:text-white">{new Date(selectedQuestion.createdAt).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Durum</div>
                      <div>{getStatusBadge(selectedQuestion.status)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Sorduğunuz Soru</div>
                    <div className="text-gray-900 dark:text-white">{selectedQuestion.body}</div>
                  </div>
                </div>

                {/* Replies */}
                {selectedQuestion.replies.length > 0 ? (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Cevap{selectedQuestion.replies.length > 1 ? 'lar' : ''}
                    </h4>
                    <div className="space-y-4">
                      {selectedQuestion.replies.map((reply) => (
                        <div key={reply.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-blue-900 dark:text-blue-300">{reply.responderName}</div>
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                              {new Date(reply.createdAt).toLocaleDateString('tr-TR')}
                            </div>
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">{reply.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 mb-6">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Henüz cevap yok</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Sorunuz en kısa sürede uzmanlarımız tarafından yanıtlanacak.
                    </p>
                  </div>
                )}

                {/* New Reply Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Konuşmaya Devam Et</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mesajınız
                      </label>
                      <textarea
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Bu soru hakkında ek bir mesajınız varsa buraya yazabilirsiniz..."
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Sorunuzla ilgili ek bilgi paylaşabilir veya konuşmaya devam edebilirsiniz.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitReply}
                        disabled={!newReply.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Mesajı Gönder
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      )}

      <Toaster />
    </DashboardLayout>
  );
}
