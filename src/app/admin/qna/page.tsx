"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare,
  Search,
  Filter,
  Eye,
  MessageCircle,
  Check,
  EyeOff,
  Trash2,
  User,
  Calendar,
  BookOpen,
  PlayCircle,
  ChevronDown,
  Send,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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

export default function AdminQnAPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [courses, setCourses] = useState<Array<{id: string, name: string}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Mock data - gerçek uygulamada API'den gelecek
  const mockQuestions: Question[] = [
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
    }
  ];

  const mockCourses = [
    { id: 'amazon-fba-mastery', name: 'Amazon FBA Mastery' },
    { id: 'dropshipping-course', name: 'Dropshipping Kursu' },
    { id: 'affiliate-marketing', name: 'Affiliate Marketing' }
  ];

  // Initial data fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filter change - reset and fetch
  useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setQuestions([]);
    fetchQuestions(1, true);
  }, [searchTerm, statusFilter, courseFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch courses for filter
      setCourses(mockCourses);
      
      // Fetch first page of questions
      await fetchQuestions(1, true);
    } catch (error) {
      console.error('Initial fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (page: number, reset: boolean = false) => {
    if (!hasMoreData && !reset) return;
    
    if (page === 1 && !reset) {
      setLoading(true);
    } else if (page > 1) {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '5',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(courseFilter !== 'all' && { courseId: courseFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/qna?${params}`);
      const result = await response.json();

      if (result.success) {
        const newQuestions = result.data.questions;
        
        if (reset) {
          setQuestions(newQuestions);
        } else {
          setQuestions(prev => [...prev, ...newQuestions]);
        }
        
        setCurrentPage(page);
        setTotalQuestions(result.data.pagination.totalItems);
        
        // Check if we have more data
        if (page >= result.data.pagination.totalPages) {
          setHasMoreData(false);
        }
      }
    } catch (error) {
      console.error('Fetch questions error:', error);
      toast.error('Sorular yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreQuestions = () => {
    if (!loadingMore && hasMoreData) {
      fetchQuestions(currentPage + 1);
    }
  };

  // Update filteredQuestions to use questions directly (since filtering is done on API)
  useEffect(() => {
    setFilteredQuestions(questions);
  }, [questions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Yeni</span>;
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
    setNewReply('');
  };

  const handleStatusChange = async (questionId: string, newStatus: 'new' | 'answered' | 'hidden') => {
    try {
      const response = await fetch(`/api/admin/qna/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setQuestions(prev => prev.map(q => 
          q.id === questionId ? { ...q, status: newStatus } : q
        ));
        
        toast.success(`Soru durumu "${newStatus === 'new' ? 'Yeni' : newStatus === 'answered' ? 'Cevaplandı' : 'Gizli'}" olarak güncellendi.`);
      } else {
        toast.error(result.error || 'Durum güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Status change error:', error);
      toast.error('Durum güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/qna/${questionId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        setTotalQuestions(prev => prev - 1);
        toast.success('Soru başarıyla silindi.');
      } else {
        toast.error(result.error || 'Soru silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Delete question error:', error);
      toast.error('Soru silinirken bir hata oluştu');
    }
  };

  const handleSendReply = () => {
    if (!selectedQuestion || !newReply.trim()) return;

    const reply: Reply = {
      id: `reply_${Date.now()}`,
      questionId: selectedQuestion.id,
      responderId: 'admin1',
      responderName: 'Haşem Başaran',
      body: newReply.trim(),
      createdAt: new Date().toISOString()
    };

    // Update question with new reply and mark as answered
    setQuestions(prev => prev.map(q => 
      q.id === selectedQuestion.id 
        ? { ...q, replies: [...q.replies, reply], status: 'answered' }
        : q
    ));

    // Update selected question state
    setSelectedQuestion(prev => prev ? { 
      ...prev, 
      replies: [...prev.replies, reply], 
      status: 'answered' 
    } : null);

    setNewReply('');
    toast.success('Cevap gönderildi ve öğrenciye bildirim iletildi!');
  };

  const getNewQuestionCount = () => {
    return questions.filter(q => q.status === 'new').length;
  };

  // Intersection Observer for infinite scroll
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const lastQuestionRef = React.useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreData && !loadingMore) {
        loadMoreQuestions();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMoreData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Sorular yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-8 w-8 mr-3 text-blue-600" />
              Soru & Cevap Yönetimi
            </h1>
            <p className="text-gray-600 mt-1">
              Öğrenci sorularını görüntüleyin ve yanıtlayın
            </p>
          </div>
          {getNewQuestionCount() > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-blue-700 font-medium">
                {getNewQuestionCount()} yeni soru bekliyor
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="new">Yeni Sorular</option>
                  <option value="answered">Cevaplananlar</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              </div>

              {/* Course Filter */}
              <div className="relative">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Sorular ({totalQuestions > 0 ? totalQuestions : filteredQuestions.length})
              </h2>
              {hasMoreData && (
                <p className="text-sm text-gray-600">
                  Gösterilen: {filteredQuestions.length} / {totalQuestions}
                </p>
              )}
            </div>

            {filteredQuestions.length > 0 ? (
              <div className="space-y-4">
                {filteredQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    ref={index === filteredQuestions.length - 1 ? lastQuestionRef : null}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{question.studentName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{question.courseName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <PlayCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{question.lessonName}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3 line-clamp-2">{question.body}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(question.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          {getStatusBadge(question.status)}
                          {question.replies.length > 0 && (
                            <span className="text-green-600">
                              {question.replies.length} cevap
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQuestion(question)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Görüntüle
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {question.status !== 'answered' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(question.id, 'answered')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(question.id, question.status === 'hidden' ? 'new' : 'hidden')}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            {question.status === 'hidden' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Daha fazla soru yükleniyor...</span>
                  </div>
                )}
                
                {/* End of Content */}
                {!hasMoreData && filteredQuestions.length > 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <div className="border-t border-gray-200 pt-6">
                      <p className="text-sm">Tüm sorular yüklendi ({totalQuestions} soru)</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {loading ? 'Sorular yükleniyor...' : 'Soru bulunamadı'}
                </h3>
                <p className="text-gray-600">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                      Lütfen bekleyin...
                    </div>
                  ) : (
                    searchTerm || statusFilter !== 'all' || courseFilter !== 'all'
                      ? 'Filtrelere uygun soru bulunamadı.'
                      : 'Henüz hiç soru sorulmamış.'
                  )}
                </p>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Detail Modal */}
        {showDetailModal && selectedQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Soru Detayı</h3>
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
                {/* Question Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Öğrenci</div>
                      <div className="font-medium">{selectedQuestion.studentName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tarih</div>
                      <div className="font-medium">{new Date(selectedQuestion.createdAt).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Kurs</div>
                      <div className="font-medium">{selectedQuestion.courseName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Ders</div>
                      <div className="font-medium">{selectedQuestion.lessonName}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Soru</div>
                    <div className="text-gray-900">{selectedQuestion.body}</div>
                  </div>
                </div>

                {/* Existing Replies */}
                {selectedQuestion.replies.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Cevaplar</h4>
                    <div className="space-y-4">
                      {selectedQuestion.replies.map((reply) => (
                        <div key={reply.id} className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-blue-900">{reply.responderName}</div>
                            <div className="text-sm text-blue-600">
                              {new Date(reply.createdAt).toLocaleDateString('tr-TR')}
                            </div>
                          </div>
                          <div className="text-gray-700">{reply.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Reply */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Cevap Yaz</h4>
                  <div className="space-y-4">
                    <textarea
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Cevabınızı buraya yazın..."
                    />
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowDetailModal(false)}
                      >
                        İptal
                      </Button>
                      <Button
                        onClick={handleSendReply}
                        disabled={!newReply.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Cevap Gönder
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toaster />
    </DashboardLayout>
  );
}