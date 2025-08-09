"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  Clock,
  Users,
  PlayCircle,
  Star,
  Award,
  Video,
  CheckCircle
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  // Basit ek alanlar
  duration?: string;
  level?: string;
  modules?: number;
  rating?: number;
  price?: number;
  thumbnail?: string;
}

interface Enrollment {
  course_id: string;
  status: string;
}

// 3 ana eğitim içeriği - gerçek içerik
const MAIN_COURSES = [
  {
    id: 'full-mentoring',
    name: 'Full Mentorluk Programı',
    description: 'Kapsamlı mentorluk süreciyle kişisel ve profesyonel gelişiminizi tamamlayın. İş hayatında başarıya ulaşmak için gereken tüm becerileri kazanın.',
    duration: '6 ay',
    level: 'Tüm Seviyeler',
    modules: 12,
    rating: 4.9,
    price: 2999,
    thumbnail: '/mentoring.jpg',
    color: 'from-blue-500 to-blue-600',
    lessons: [
      'Kişisel Gelişim ve Öz Farkındalık',
      'İletişim Becerileri',
      'Liderlik ve Takım Yönetimi',
      'Zaman Yönetimi ve Verimlilik',
      'Kariyer Planlama',
      'Finansal Okuryazarlık',
      'Networking ve İlişki Kurma',
      'Problem Çözme Teknikleri',
      'Stres Yönetimi',
      'Hedef Belirleme ve Motivasyon',
      'Sunum Becerileri',
      'Girişimcilik Temelleri'
    ]
  },
  {
    id: 'ppc-training',
    name: 'PPC Reklam Uzmanlığı',
    description: 'Google Ads, Facebook Ads ve diğer platformlarda profesyonel PPC kampanyaları yönetmeyi öğrenin. Reklam bütçenizi en verimli şekilde kullanın.',
    duration: '3 ay',
    level: 'Başlangıç-Orta',
    modules: 8,
    rating: 4.8,
    price: 1799,
    thumbnail: '/ppc.jpg',
    color: 'from-green-500 to-green-600',
    lessons: [
      'PPC Reklamcılığa Giriş',
      'Google Ads Temelleri',
      'Facebook Ads Stratejileri',
      'Anahtar Kelime Araştırması',
      'Reklam Metni Yazma Sanatı',
      'Landing Page Optimizasyonu',
      'Bütçe Yönetimi ve Teklif Stratejileri',
      'Reklam Performans Analizi ve Optimizasyon'
    ]
  },
  {
    id: 'product-research',
    name: 'Ürün Araştırması Uzmanlığı',
    description: 'E-ticaret dünyasında başarılı ürünler keşfedin. Pazar analizi, trend takibi ve karlı ürün bulma tekniklerinde uzmanlaşın.',
    duration: '2 ay',
    level: 'Başlangıç-Orta',
    modules: 6,
    rating: 4.7,
    price: 1299,
    thumbnail: '/research.jpg',
    color: 'from-purple-500 to-purple-600',
    lessons: [
      'Ürün Araştırmasına Giriş',
      'Pazar Analizi Teknikleri',
      'Trend Takibi ve Fırsat Analizi',
      'Rakip Analizi ve Pozisyonlama',
      'Karlılık Hesaplamaları',
      'Ürün Doğrulama Yöntemleri'
    ]
  }
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError('');

      // Ana 3 kursu kullan, veritabanından veri çekme
      const enhancedCourses = MAIN_COURSES.map(course => ({
        ...course,
        is_public: true,
        is_active: true,
        created_at: new Date().toISOString()
      }));
      
      setCourses(enhancedCourses as Course[]);

      // Kullanıcı kayıtlarını kontrol et
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('course_id, status')
          .eq('user_id', user.id);

        setEnrollments(enrollmentsData || []);
      }

    } catch (err: any) {
      console.error('Courses error:', err);
      setError('Kurs verileri yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrolling(courseId);
      setError('');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Kaydolmak için lütfen giriş yapın');
        return;
      }

      // Kayıt ol
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'active'
        });

      if (enrollError) {
        console.error('Enrollment error:', enrollError);
        setError('Kursa kaydolma başarısız');
        return;
      }

      // Kayıtları güncelle
      const { data: newEnrollments } = await supabase
        .from('enrollments')
        .select('course_id, status')
        .eq('user_id', user.id);

      setEnrollments(newEnrollments || []);
      
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setError('Kursa kaydolurken hata');
    } finally {
      setEnrolling(null);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId);
  };

  const formatPrice = (price: number) => {
    return `₺${price.toLocaleString()}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Eğitim Programları"
        subtitle="Uzman mentorluk ve pratik becerilerle kariyerinizi geliştirin"
        breadcrumbs={[
          { label: 'Ana Sayfa', href: '/dashboard' },
          { label: 'Eğitimler' }
        ]}
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Eğitim programları yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Eğitim Programları"
      subtitle="Uzman mentorluk ve pratik becerilerle kariyerinizi geliştirin"
      breadcrumbs={[
        { label: 'Ana Sayfa', href: '/dashboard' },
        { label: 'Eğitimler' }
      ]}
    >
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 mb-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-4">
            Uzman Mentorluk ile Kariyerinizi Geliştirin
          </h1>
          <p className="text-xl text-white/90 mb-6">
            3 özel eğitim programımızla profesyonel yaşamınızda fark yaratın. 
            Mentorluk, PPC uzmanlığı ve ürün araştırması alanlarında derinleşin.
          </p>
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Uzman Mentorlar</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Sertifikalı Programlar</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Esnek Öğrenme</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <DashboardCard className="mb-6 border-l-4 border-l-red-500 bg-red-50">
          <div className="p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </DashboardCard>
      )}

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course, index) => (
          <DashboardCard
            key={course.id}
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            {/* Course Header */}
            <div className={`bg-gradient-to-r ${MAIN_COURSES[index]?.color} p-6 text-white relative`}>
              <div className="absolute top-4 right-4">
                <Badge className="bg-white/20 text-white border-white/30">
                  {course.level}
                </Badge>
              </div>
              
              <div className="mb-4">
                <BookOpen className="h-12 w-12 text-white/80" />
              </div>
              
              <h3 className="text-xl font-bold mb-2 line-clamp-2">
                {course.name}
              </h3>
              
              <div className="flex items-center space-x-4 text-white/80 text-sm">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Video className="h-4 w-4" />
                  <span>{course.modules} modül</span>
                </div>
              </div>
            </div>

            {/* Course Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-4 line-clamp-3">
                {course.description}
              </p>

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-1">
                  {renderStars(course.rating || 0)}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {course.rating}
                </span>
                <span className="text-sm text-gray-500">
                  (Mükemmel)
                </span>
              </div>

              {/* Lessons Preview */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Program İçeriği:</h4>
                <div className="space-y-1">
                  {MAIN_COURSES[index]?.lessons.slice(0, 3).map((lesson, lessonIndex) => (
                    <div key={lessonIndex} className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{lesson}</span>
                    </div>
                  ))}
                  {MAIN_COURSES[index]?.lessons.length > 3 && (
                    <div className="text-sm text-gray-500 ml-5">
                      +{MAIN_COURSES[index]?.lessons.length - 3} daha fazla konu...
                    </div>
                  )}
                </div>
              </div>

              {/* Price and Enroll */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(course.price || 0)}  
                  </span>
                  <div className="text-sm text-gray-500">Tek ödeme</div>
                </div>
                
                {isEnrolled(course.id) ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/courses/${course.id}`}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Eğitime Devam Et
                    </a>
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrolling === course.id}
                    className="bg-blue-600 hover:bg-blue-700 font-semibold px-6"
                  >
                    {enrolling === course.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {enrolling === course.id ? 'Kaydolunuyor...' : 'Kayıt Ol'}
                  </Button>
                )}
              </div>
            </div>
          </DashboardCard>
        ))}
      </div>

      {/* Why Choose Us Section */}
      <div className="mt-16 bg-gray-50 rounded-xl p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Neden Bu Eğitimleri Seçmelisiniz?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Uzman Mentorluk</h3>
              <p className="text-gray-600 text-sm">
                Alanında deneyimli uzmanlardan birebir mentorluk alın
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Pratik Odaklı</h3>
              <p className="text-gray-600 text-sm">
                Gerçek projeler üzerinde çalışarak deneyim kazanın
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sertifika</h3>
              <p className="text-gray-600 text-sm">
                Programı tamamladığınızda sertifikanızı alın
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}