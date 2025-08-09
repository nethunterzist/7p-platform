"use client";

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { 
  BookOpen, 
  Clock, 
  Users, 
  PlayCircle, 
  CheckCircle,
  Star,
  Award,
  Video,
  Download,
  ArrowLeft
} from 'lucide-react';

interface CourseDetails {
  id: string;
  name: string;
  description: string;
  duration: string;
  level: string;
  modules: number;
  rating: number;
  price: number;
  lessons: string[];
  color: string;
  instructor: string;
  skills: string[];
}

// 3 eğitim detayları
const COURSE_DETAILS: { [key: string]: CourseDetails } = {
  'full-mentoring': {
    id: 'full-mentoring',
    name: 'Full Mentorluk Programı',
    description: 'Kapsamlı mentorluk süreciyle kişisel ve profesyonel gelişiminizi tamamlayın. İş hayatında başarıya ulaşmak için gereken tüm becerileri kazanın.',
    duration: '6 ay',
    level: 'Tüm Seviyeler',
    modules: 12,
    rating: 4.9,
    price: 2999,
    color: 'from-blue-500 to-blue-600',
    instructor: 'Uzman Mentor Ekibi',
    skills: ['Liderlik', 'İletişim', 'Kariyer Planlama', 'Zaman Yönetimi'],
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
  'ppc-training': {
    id: 'ppc-training',
    name: 'PPC Reklam Uzmanlığı',
    description: 'Google Ads, Facebook Ads ve diğer platformlarda profesyonel PPC kampanyaları yönetmeyi öğrenin. Reklam bütçenizi en verimli şekilde kullanın.',
    duration: '3 ay',
    level: 'Başlangıç-Orta',
    modules: 8,
    rating: 4.8,
    price: 1799,
    color: 'from-green-500 to-green-600',
    instructor: 'PPC Uzmanı',
    skills: ['Google Ads', 'Facebook Ads', 'Kampanya Yönetimi', 'ROI Optimizasyonu'],
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
  'product-research': {
    id: 'product-research',
    name: 'Ürün Araştırması Uzmanlığı',
    description: 'E-ticaret dünyasında başarılı ürünler keşfedin. Pazar analizi, trend takibi ve karlı ürün bulma tekniklerinde uzmanlaşın.',
    duration: '2 ay',
    level: 'Başlangıç-Orta',
    modules: 6,
    rating: 4.7,
    price: 1299,
    color: 'from-purple-500 to-purple-600',
    instructor: 'E-ticaret Uzmanı',
    skills: ['Pazar Analizi', 'Trend Takibi', 'Rakip Analizi', 'Karlılık Hesabı'],
    lessons: [
      'Ürün Araştırmasına Giriş',
      'Pazar Analizi Teknikleri',
      'Trend Takibi ve Fırsat Analizi',
      'Rakip Analizi ve Pozisyonlama',
      'Karlılık Hesaplamaları',
      'Ürün Doğrulama Yöntemleri'
    ]
  }
};

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);

  const resolvedParams = use(params);
  const course = COURSE_DETAILS[resolvedParams.courseId];

  useEffect(() => {
    checkEnrollment();
  }, [resolvedParams.courseId]);

  const checkEnrollment = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Kayıt durumunu kontrol et
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', resolvedParams.courseId)
        .eq('status', 'active')
        .single();

      setIsEnrolled(!!enrollment);
      setProgress(enrollment?.progress_percentage || 0);

    } catch (error) {
      console.error('Enrollment check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Kaydolmak için lütfen giriş yapın');
        return;
      }

      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: resolvedParams.courseId,
          status: 'active',
          progress_percentage: 0
        });

      if (error) {
        console.error('Enrollment error:', error);
        alert('Kayıt sırasında hata oluştu');
        return;
      }

      setIsEnrolled(true);
      alert('Başarıyla kaydoldunuz!');

    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Kayıt sırasında hata oluştu');
    } finally {
      setEnrolling(false);
    }
  };

  if (!course) {
    return (
      <DashboardLayout
        title="Kurs Bulunamadı"
        subtitle="Aradığınız kurs mevcut değil"
      >
        <DashboardCard>
          <div className="p-8 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Kurs Bulunamadı</h3>
            <p className="text-gray-600 mb-6">Aradığınız kurs mevcut değil veya kaldırılmış olabilir.</p>
            <Button asChild>
              <a href="/courses">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kurslara Dön
              </a>
            </Button>
          </div>
        </DashboardCard>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        title={course.name}
        subtitle="Kurs yükleniyor..."
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Kurs detayları yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={course.name}
      subtitle={course.description}
      breadcrumbs={[
        { label: 'Ana Sayfa', href: '/dashboard' },
        { label: 'Eğitimler', href: '/courses' },
        { label: course.name }
      ]}
    >
      {/* Course Hero */}
      <div className={`bg-gradient-to-r ${course.color} rounded-xl p-8 mb-8 text-white`}>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge className="bg-white/20 text-white border-white/30 mb-4">
              {course.level}
            </Badge>
            <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
            <p className="text-white/90 mb-6 text-lg">{course.description}</p>
            
            <div className="flex items-center space-x-6 mb-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>{course.modules} modül</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 fill-current" />
                <span>{course.rating}</span>
              </div>
            </div>

            {isEnrolled ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>İlerleme Durumu</span>
                  <span className="font-semibold">%{progress}</span>
                </div>
                <Progress value={progress} className="bg-white/20" />
                <Button asChild className="bg-white text-blue-600 hover:bg-gray-100">
                  <a href={`/courses/${course.id}/modules`}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Eğitime Devam Et
                  </a>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold">₺{course.price.toLocaleString()}</div>
                <Button 
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  {enrolling ? 'Kaydolunuyor...' : 'Hemen Kayıt Ol'}
                </Button>
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
              <Video className="h-24 w-24 text-white/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Course Content */}
          <DashboardCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Eğitim İçeriği</h2>
              <div className="space-y-3">
                {course.lessons.map((lesson, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{lesson}</h3>
                      {isEnrolled && (
                        <div className="flex items-center space-x-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Tamamlandı</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          {/* What You'll Learn */}
          <DashboardCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bu Eğitimde Neler Öğreneceksiniz?</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {course.skills.map((skill, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info */}
          <DashboardCard>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Eğitim Bilgileri</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Seviye</span>
                  <Badge variant="outline">{course.level}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Süre</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Modül Sayısı</span>
                  <span className="font-medium">{course.modules}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Eğitmen</span>
                  <span className="font-medium">{course.instructor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Değerlendirme</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{course.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Features */}
          <DashboardCard>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Bu Eğitim İçerir</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700">Video Dersler</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">İndirilebilir Kaynaklar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-700">Tamamlama Sertifikası</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-gray-700">Mentor Desteği</span>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Call to Action */}
          {!isEnrolled && (
            <DashboardCard>
              <div className="p-6 text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Hemen Başlayın!</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Bu eğitim programına kaydolun ve kariyerinizi bir üst seviyeye taşıyın.
                </p>
                <div className="text-2xl font-bold text-gray-900 mb-4">
                  ₺{course.price.toLocaleString()}
                </div>
                <Button 
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full"
                >
                  {enrolling ? 'Kaydolunuyor...' : 'Hemen Kayıt Ol'}
                </Button>
              </div>
            </DashboardCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}