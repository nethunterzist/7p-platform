"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardSection } from '@/components/layout/DashboardContent';
import ContinueLearning from '@/components/dashboard/ContinueLearning';
import EnrolledCoursesGrid from '@/components/dashboard/EnrolledCoursesGrid';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentMaterials from '@/components/dashboard/RecentMaterials';
import { getUserEnrolledCourses } from '@/lib/enrollment';
import { ALL_COURSES } from '@/data/courses';
import toast, { Toaster } from 'react-hot-toast';
import { safeLocalStorage } from '@/utils/clientStorage';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  BookOpen, 
  Star, 
  Users, 
  Trophy, 
  Target,
  Rocket,
  Gift,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastLesson, setLastLesson] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'purchased' | 'not-purchased'>('purchased');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Enforce authentication using NextAuth session
        if (status === 'loading') return; // wait
        if (status !== 'authenticated' || !session?.user) {
          window.location.href = '/login';
          return;
        }

        setUser({
          id: (session.user as any).id || 'na',
          email: session.user.email,
          name: session.user.name || (session.user as any).fullName || session.user.email?.split('@')[0] || 'Kullanıcı',
          role: (session.user as any).role || 'student',
        });
        
        // Load dashboard data
        const enrolledCourseIds = getUserEnrolledCourses();
        const userCourses = ALL_COURSES.filter(course => 
          enrolledCourseIds.includes(course.id) || course.is_free
        );
        
        setEnrolledCourses(userCourses.map(course => ({
          id: course.id,
          title: course.title,
          slug: course.slug,
          thumbnail: course.thumbnail_url || '',
          progress: Math.floor(Math.random() * 80) + 10, // Mock progress
          totalLessons: course.total_lessons || 20,
          completedLessons: Math.floor((course.total_lessons || 20) * 0.6),
          lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        })));

        // Set last lesson from the first enrolled course
        if (userCourses.length > 0) {
          const firstCourse = userCourses[0];
          setLastLesson({
            courseId: firstCourse.id,
            courseName: firstCourse.title,
            lessonId: 'lesson-1',
            lessonName: 'Amazon FBA Giriş',
            progress: 65,
            thumbnail: firstCourse.thumbnail_url || '',
            estimatedTime: '25 dakika',
            moduleId: 'module-1',
            courseSlug: firstCourse.slug
          });
        }

        // Mock recent materials
        setRecentMaterials([
          {
            id: '1',
            name: 'Amazon FBA Başlangıç Rehberi.pdf',
            type: 'pdf',
            courseId: 'amazon-fba',
            courseName: 'Amazon FBA Mastery',
            uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            downloadUrl: '#',
            size: '2.4 MB'
          },
          {
            id: '2',
            name: 'Ürün Araştırma Şablonu.xlsx',
            type: 'excel',
            courseId: 'amazon-fba',
            courseName: 'Amazon FBA Mastery',
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            downloadUrl: '#',
            size: '156 KB'
          },
          {
            id: '3',
            name: 'Jungle Scout Alternatifi',
            type: 'link',
            courseId: 'amazon-fba',
            courseName: 'Amazon FBA Mastery',
            uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            externalUrl: 'https://example.com'
          }
        ]);

        
      } catch (error) {
        console.error('Dashboard data load error:', error);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [status, session]);

  const handleLogout = () => {
    // For now, just clear any legacy mock data and redirect
    document.cookie = 'auth_token=; path=/; max-age=0';
    safeLocalStorage.removeItem('auth_user');
    safeLocalStorage.removeItem('auth_token');
    window.location.href = '/api/auth/signout?callbackUrl=/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  // Eğitim satın almamış kullanıcı için dashboard
  const renderNotPurchasedView = () => (
    <div className="space-y-8">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Hoş Geldin {user?.name?.split(' ')[0] || user?.email?.split('@')[0]} 👋
            </h2>
            <p className="text-blue-100 text-lg mb-6">
              Amazon FBA ve E-ticaret dünyasında başarı yolculuğun burada başlıyor!
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">2000+ Başarılı Öğrenci</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">4.8+ Puan</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">Garantili Başarı</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <Rocket className="h-20 w-20 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <DashboardSection title="Neden 7P Education?">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Hedef Odaklı Eğitim</h3>
            <p className="text-muted">Amazon FBA'de gerçek kazanç elde etmek için pratik, uygulanabilir stratejiler.</p>
          </div>
          
          <div className="card p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Uzman Mentorlar</h3>
            <p className="text-muted">Alanında uzman eğitmenlerden birebir rehberlik ve sürekli destek.</p>
          </div>
          
          <div className="card p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Kanıtlanmış Sonuçlar</h3>
            <p className="text-muted">Öğrencilerimizin %85'i ilk 6 ayda pozitif gelir elde ediyor.</p>
          </div>
        </div>
      </DashboardSection>

      {/* Free Resources */}
      <DashboardSection title="Ücretsiz Kaynaklarını Keşfet">
        <div className="section p-6 bg-gradient-to-r from-green-50/60 to-blue-50/60 dark:from-green-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                <Gift className="inline h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                Ücretsiz Başlangıç Kiti
              </h3>
              <p className="text-muted mb-4">
                Amazon FBA'ye başlamak için ihtiyacın olan temel bilgileri ücretsiz edinin.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="flex items-center text-sm text-muted">
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                  Ürün Araştırma Rehberi
                </div>
                <div className="flex items-center text-sm text-muted">
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                  Başlangıç Bütçe Hesaplayıcı
                </div>
                <div className="flex items-center text-sm text-muted">
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                  İlk Satış Stratejileri
                </div>
                <div className="flex items-center text-sm text-muted">
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                  Tedarikçi Bulma Kılavuzu
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500">
              <a href="/courses" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Ücretsiz Kaynaklara Eriş
              </a>
            </Button>
          </div>
        </div>
      </DashboardSection>

      {/* Popular Courses */}
      <DashboardSection title="En Popüler Kurslarımız">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Amazon FBA Mastery</h3>
                <p className="text-muted text-sm mb-3">Sıfırdan Amazon FBA uzmanı olun. Adım adım rehberlik ile ilk satışınızı gerçekleştirin.</p>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    25+ Ders
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    1200+ Öğrenci
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    4.9
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">₺1,999</div>
                <div className="text-sm text-muted line-through">₺2,999</div>
              </div>
            </div>
            <Button className="w-full btn-primary-dark">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Kursu Satın Al
            </Button>
          </div>

          <div className="card p-6 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Amazon PPC Reklam Uzmanlığı</h3>
                <p className="text-muted text-sm mb-3">PPC reklamları ile satışlarınızı katına çıkarın. ROI optimizasyonu ve strateji geliştirin.</p>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    18+ Ders
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    800+ Öğrenci
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    4.8
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">₺1,499</div>
                <div className="text-sm text-muted line-through">₺1,999</div>
              </div>
            </div>
            <Button className="w-full btn-primary-dark">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Kursu Satın Al
            </Button>
          </div>
        </div>
      </DashboardSection>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Bugün Başla, Yarın Kazanmaya Başla! 🚀</h2>
        <p className="text-blue-100 text-lg mb-6">
          Binlerce öğrencimiz gibi sen de Amazon FBA'de başarıya ulaş. İlk adımı at!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-gray-100">
            <a href="/marketplace" className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Kursları İncele
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

  // Eğitim satın almış kullanıcı için dashboard (mevcut)
  const renderPurchasedView = () => (
    <div className="space-y-8">
      {/* Continue Learning Section */}
      <DashboardSection title="">
        <ContinueLearning 
          lastLesson={lastLesson}
          loading={loading}
          userName={user?.name?.split(' ')[0] || user?.email?.split('@')[0]}
        />
      </DashboardSection>

      {/* Enrolled Courses Section */}
      <DashboardSection title="Kayıtlı Kursların">
        <EnrolledCoursesGrid 
          courses={enrolledCourses}
          loading={loading}
          showAll={false}
        />
      </DashboardSection>

      {/* Quick Actions Section */}
      <DashboardSection title="Hızlı Erişim">
        <QuickActions />
      </DashboardSection>

      {/* Recent Materials Section */}
      <DashboardSection title="Son Eklenen Materyaller">
        <RecentMaterials 
          materials={recentMaterials}
          loading={loading}
        />
      </DashboardSection>
    </div>
  );

  return (
    <DashboardLayout
      title="Kontrol Paneli"
      subtitle=""
    >
      {/* View Mode Toggle */}
      <div className="mb-8">
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Dashboard Görünümü</h3>
              <p className="text-sm text-muted">Test amacıyla farklı kullanıcı deneyimlerini görüntüleyebilirsiniz</p>
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
      {viewMode === 'purchased' ? renderPurchasedView() : renderNotPurchasedView()}
      
      <Toaster />
    </DashboardLayout>
  );
}
