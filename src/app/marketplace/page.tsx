"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_COURSES } from '@/data/courses';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardSection } from '@/components/layout/DashboardContent';
import CourseCard from '@/components/ui/course-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ShoppingCart,
  Star,
  TrendingUp,
  Clock,
  Users,
  Award,
  ChevronDown,
  Grid3X3,
  List
} from 'lucide-react';
import { isUserEnrolledInCourse, enrollUserInCourse } from '@/lib/enrollment';
import toast, { Toaster } from 'react-hot-toast';

export default function MarketplacePage() {
  const router = useRouter();
  const [courses, setCourses] = useState(ALL_COURSES);
  const [loading, setLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter courses
  useEffect(() => {
    let filteredCourses = [...ALL_COURSES];

    // Marketplace sadece ücretli kursları gösterir
    filteredCourses = filteredCourses.filter(course => !course.is_free);

    // Default sorting by featured and rating
    filteredCourses.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    setCourses(filteredCourses);
  }, []);

  const handlePurchase = async (courseId: string) => {
    try {
      setLoading(courseId);
      
      // Check if already enrolled
      if (isUserEnrolledInCourse(courseId)) {
        toast.error('Bu kursa zaten kayıtlısınız!');
        return;
      }

      // For quick purchase from marketplace - try to enroll directly for free courses
      const course = ALL_COURSES.find(c => c.id === courseId);
      if (course?.is_free) {
        const enrollmentSuccess = await enrollUserInCourse(courseId);
        if (enrollmentSuccess) {
          toast.success('🎉 Ücretsiz kursa başarıyla kayıt oldunuz!');
          setTimeout(() => {
            router.push(`/courses/${course.slug}`);
          }, 1500);
          return;
        }
      }

      // For paid courses, navigate to course detail page for full purchase flow
      if (course) {
        router.push(`/marketplace/${course.slug}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Satın alma işlemi başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(null);
    }
  };


  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl text-white p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Kurs Mağazası</h1>
            <p className="text-blue-100 text-lg">
              Amazon FBA ve E-ticaret alanında uzmanlaşın. En güncel kurslarla kendinizi geliştirin.
            </p>
            <div className="flex items-center gap-6 mt-4">
              <div key="experts-stat" className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">Uzman Eğitmenler</span>
              </div>
              <div key="graduates-stat" className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">2000+ Mezun</span>
              </div>
              <div key="rating-stat" className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">4.8+ Ortalama</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <ShoppingCart className="h-16 w-16 text-blue-200" />
          </div>
        </div>
      </div>


      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Kurslar ({courses.length})
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            En kaliteli Amazon FBA ve E-ticaret eğitimleri
          </p>
        </div>
        
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
      </div>

      {/* Course Grid */}
      {courses.length > 0 ? (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              variant="store"
              onPurchase={handlePurchase}
              loading={loading === course.id}
              isEnrolled={isUserEnrolledInCourse(course.id)}
              className={viewMode === 'list' ? 'flex flex-row' : ''}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Henüz kurs bulunmuyor
          </h3>
          <p className="text-gray-600 mb-4">
            Yakında yeni kurslar eklenecek.
          </p>
        </div>
      )}


      <Toaster />
    </DashboardLayout>
  );
}