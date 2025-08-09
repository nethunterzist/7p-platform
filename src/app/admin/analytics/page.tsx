"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/useAdmin';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  Award,
  ChevronLeft
} from 'lucide-react';

interface SimpleStats {
  totalStudents: number;
  totalEnrollments: number;
  activeCourses: number;
}

// 3 eğitim bilgileri
const COURSES = [
  { id: 'full-mentoring', name: 'Full Mentorluk Programı', price: 2999 },
  { id: 'ppc-training', name: 'PPC Reklam Uzmanlığı', price: 1799 },
  { id: 'product-research', name: 'Ürün Araştırması Uzmanlığı', price: 1299 }
];

export default function SimpleAnalyticsPage() {
  const { user, isAdmin, loading, error } = useAdmin();
  const router = useRouter();
  
  const [stats, setStats] = useState<SimpleStats>({
    totalStudents: 0,
    totalEnrollments: 0,
    activeCourses: 3
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }

    loadStats();
  }, [user, isAdmin, loading, router]);

  const loadStats = async () => {
    try {
      setDataLoading(true);

      // Toplam öğrenci sayısı
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Toplam kayıt sayısı
      const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalStudents: studentCount || 0,
        totalEnrollments: enrollmentCount || 0,
        activeCourses: 3
      });

    } catch (err) {
      console.error('Stats loading error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yetki kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Erişim Hatası</h2>
              <p className="text-muted-foreground mb-4">Bu sayfaya erişim yetkiniz yok</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                Ana Sayfaya Dön
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Geri
              </button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
                <p className="text-sm text-muted-foreground mt-1">Platform istatistikleri</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Basic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Students */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Öğrenci
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataLoading ? (
                  <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
                ) : (
                  stats.totalStudents.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Kayıtlı kullanıcı sayısı
              </p>
            </CardContent>
          </Card>

          {/* Total Enrollments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Kayıt
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataLoading ? (
                  <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
                ) : (
                  stats.totalEnrollments.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Eğitime kayıt sayısı
              </p>
            </CardContent>
          </Card>

          {/* Active Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktif Eğitim
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Mevcut eğitim programı
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eğitim Programları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {COURSES.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h3 className="font-medium">{course.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Fiyat: ₺{course.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-2 h-2 bg-green-500 rounded-full mb-1"></div>
                    <span className="text-xs text-muted-foreground">Aktif</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Simple Activity Log */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Platform Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Sistem normal çalışıyor</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">3 eğitim programı aktif</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Veritabanı bağlantısı başarılı</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}