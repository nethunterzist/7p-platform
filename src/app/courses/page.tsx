"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import CourseCard from '@/components/ui/course-card';
import { BookOpen, Filter, Search, Star, Users, PlayCircle, GraduationCap, Award, Grid3X3, List, ShoppingCart, Gift, CheckCircle, Trophy, Target, TrendingUp, Rocket } from 'lucide-react';
import { 
  ALL_COURSES, 
  COURSE_CATEGORIES, 
  getFeaturedCourses, 
  getFreeCourses, 
  getCoursesByCategory,
  type Course 
} from '@/data';
import { 
  getUserEnrolledCourses,
  isUserLoggedIn,
  redirectToLogin
} from '@/lib/enrollment';

export default function CoursesPage() {
  const [loading, setLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [ownedCourses, setOwnedCourses] = useState<Course[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hasEnrolledCourses, setHasEnrolledCourses] = useState<boolean>(false);
  const [courseFilter, setCourseFilter] = useState<'purchased' | 'not-purchased'>('not-purchased');

  useEffect(() => {
    // Check if user is logged in
    if (!isUserLoggedIn()) {
      redirectToLogin('/courses');
      return;
    }

    setLoading(true);

    // Test için: courseFilter'a göre hasEnrolledCourses'u ayarlayalım
    const hasEnrolled = courseFilter === 'purchased'; // courseFilter'a göre dinamik ayarlama
    setHasEnrolledCourses(hasEnrolled);

    // Get user's enrolled courses
    const userEnrolledCourses = hasEnrolled ? getUserEnrolledCourses() : [];
    setEnrolledCourseIds(userEnrolledCourses);
    
    // Filter only owned courses (both purchased and free)
    const ownedCoursesOnly = hasEnrolled ? ALL_COURSES.filter(course => 
      userEnrolledCourses.includes(course.id) || course.is_free
    ) : [];
    setOwnedCourses(ownedCoursesOnly);
    
    setLoading(false);
  }, [courseFilter]);
  
  const purchasedCourses = ownedCourses.filter(course => 
    enrolledCourseIds.includes(course.id) && !course.is_free
  );
  const freeCourses = ownedCourses.filter(course => course.is_free);

  // Not needed in Kurslarım page - we only show owned courses
  // const filteredCourses = useMemo(() => {
  //   return ownedCourses;
  // }, [ownedCourses]);

  if (loading) {
    return (
      <DashboardLayout 
        title="Kurslarım" 
        subtitle="Satın aldığınız ve ücretsiz eğitimler"
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted">Kurslar yükleniyor...</p>
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
          <GraduationCap className="h-16 w-16 text-blue-200" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Henüz Satın Alınmış Eğitim Yok! 🎓</h2>
        <p className="text-blue-100 text-lg mb-6">
          Amazon FBA'de uzmanlaşmak için profesyonel eğitimlerimizi keşfet ve hemen başla!
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">2000+ Başarılı Mezun</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">4.8+ Ortalama Puan</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">Sertifikalı Eğitim</span>
          </div>
        </div>
      </div>

      {/* Course Types Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-primary mb-1">Amazon FBA</h3>
          <p className="text-sm text-muted">Temel ve ileri seviye</p>
        </div>
        
        <div className="card rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-primary mb-1">PPC Reklamlar</h3>
          <p className="text-sm text-muted">Satış optimizasyonu</p>
        </div>
        
        <div className="card rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-primary mb-1">E-ticaret</h3>
          <p className="text-sm text-muted">Platform stratejileri</p>
        </div>
        
        <div className="card rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="font-semibold text-primary mb-1">Ücretsiz İçerik</h3>
          <p className="text-sm text-muted">Başlangıç rehberleri</p>
        </div>
      </div>

      {/* What You'll Get */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
        <h3 className="text-xl font-semibold text-primary mb-4">
          <Gift className="inline h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
          Eğitim Satın Alınca Neler Kazanırsın?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Yaşam Boyu Erişim</h4>
              <p className="text-sm text-muted">Satın aldığın eğitimlere yaşam boyu erişim</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Sınırsız Soru Hakkı</h4>
              <p className="text-sm text-muted">İstediğin kadar soru sorabilirsin</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Özel Materyaller</h4>
              <p className="text-sm text-muted">PDF, Excel ve pratik araçlar</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Sertifika</h4>
              <p className="text-sm text-muted">Tamamladığın eğitimler için sertifika</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Bugün Başla, Amazon FBA Uzmanı Ol! 🚀</h2>
        <p className="text-blue-100 mb-6">
          Binlerce öğrencimiz gibi sen de Amazon FBA'de başarıya ulaş. İlk eğitimini satın al!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-gray-100">
            <a href="/marketplace" className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Ücretli Eğitimleri İncele
            </a>
          </Button>
          <Button asChild size="lg" className="bg-white/20 text-white border-white/30">
            <a href="/courses" className="flex items-center">
              <Gift className="h-5 w-5 mr-2" />
              Ücretsiz İçerikleri Dene
            </a>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Kurslarım"
      subtitle="Satın aldığınız ve ücretsiz eğitimler"
    >
      {/* View Mode Toggle */}
      <div className="mb-8">
        <div className="card rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Kurs Görünümü</h3>
              <p className="text-sm text-muted">Test amacıyla farklı kullanıcı deneyimlerini görüntüleyebilirsiniz</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={courseFilter === 'purchased' ? 'default' : 'outline'}
                onClick={() => setCourseFilter('purchased')}
                size="sm"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Eğitim Satın Alan
              </Button>
              <Button
                variant={courseFilter === 'not-purchased' ? 'default' : 'outline'}
                onClick={() => setCourseFilter('not-purchased')}
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Eğitim Satın Almayan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Based on Course Filter */}
      {courseFilter === 'not-purchased' ? (
        renderNoCoursesView()
      ) : (
      <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl text-white p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Kurslarım</h1>
            <p className="text-blue-100 text-lg">
              Amazon FBA ve E-ticaret alanında uzmanlaşın. En güncel kurslarla kendinizi geliştirin.
            </p>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">Uzman Eğitmenler</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">2000+ Mezun</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">4.8+ Ortalama</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <BookOpen className="h-16 w-16 text-blue-200" />
          </div>
        </div>
      </div>
      <div className="space-y-8">
        
        {/* My Courses - Purchased */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Eğitimlerim
              <span className="text-sm font-normal text-muted ml-2">
                ({purchasedCourses.length} eğitim)
              </span>
            </h2>
            
            {purchasedCourses.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  key="grid-view"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  key="list-view"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {purchasedCourses.length > 0 ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {purchasedCourses.map((course) => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  variant="owned"
                  isEnrolled={true}
                  className={viewMode === 'list' ? 'flex flex-row' : ''}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card rounded-lg">
              <div className="text-muted mb-4">
                <GraduationCap className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">
                Henüz satın alınmış eğitim yok
              </h3>
              <p className="text-muted mb-4">
                Mağazadan eğitim satın alarak buradan erişebilirsiniz.
              </p>
              <Button asChild>
                <Link href="/marketplace">Mağazayı Keşfet</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Free Courses */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-green-500 dark:text-green-400" />
              Ücretsiz Eğitimler
              <span className="text-sm font-normal text-muted ml-2">
                ({freeCourses.length} eğitim)
              </span>
            </h2>
            
            {freeCourses.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  key="grid-view-free"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  key="list-view-free"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {freeCourses.length > 0 ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {freeCourses.slice(0, 1).map((course) => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  variant="owned"
                  isEnrolled={true}
                  className={viewMode === 'list' ? 'flex flex-row' : ''}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card rounded-lg">
              <div className="text-muted mb-4">
                <BookOpen className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">
                Ücretsiz eğitim bulunamadı
              </h3>
              <p className="text-muted">
                Şu anda mevcut ücretsiz eğitim bulunmamaktadır.
              </p>
            </div>
          )}
        </section>

      </div>
      </>
      )}
    </DashboardLayout>
  );
}
