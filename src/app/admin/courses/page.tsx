"use client";

import { useState, useEffect } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  Video,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  TrendingUp,
  DollarSign,
  Image
} from 'lucide-react';

// Basit kurs interface'i
interface SimpleCourse {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'draft';
  coverImage?: string; // Kapak görseli URL'i
  videoCount: number;
  quizCount: number;
  materialCount: number;
  subscriberCount: number;
  salesCount: number;
  revenue: number;
  created_at: string;
}

// Mock data - 3 eğitim
const mockCourses: SimpleCourse[] = [
  {
    id: 'amazon-ppc',
    title: 'Amazon PPC Eğitimi',
    description: 'Amazon PPC reklamcılığında uzman seviyesine çıkacağınız detaylı eğitim programı',
    status: 'active',
    coverImage: 'https://i.ytimg.com/vi/zl8wxIEszc8/maxresdefault.jpg',
    videoCount: 25,
    quizCount: 8,
    materialCount: 12,
    subscriberCount: 1247,
    salesCount: 892,
    revenue: 267600,
    created_at: '2024-01-15'
  },
  {
    id: 'amazon-full-mentorship',
    title: 'Amazon Full Mentorship',
    description: 'Amazon FBA sürecinin A\'dan Z\'ye anlatıldığı kapsamlı mentörlük programı',
    status: 'active',
    coverImage: 'https://i.ytimg.com/vi/nuOA3GqoA8A/maxresdefault.jpg',
    videoCount: 35,
    quizCount: 12,
    materialCount: 18,
    subscriberCount: 823,
    salesCount: 567,
    revenue: 170100,
    created_at: '2024-02-20'
  },
  {
    id: 'amazon-urun-arastirma',
    title: 'Amazon Ürün Araştırma',
    description: 'Amazon\'da karlı ürünleri bulma ve analiz etme tekniklerini öğrenin',
    status: 'active',
    coverImage: 'https://i.ytimg.com/vi/wPtnLsHMGLk/maxresdefault.jpg',
    videoCount: 18,
    quizCount: 6,
    materialCount: 10,
    subscriberCount: 456,
    salesCount: 334,
    revenue: 83500,
    created_at: '2024-03-10'
  }
];

export default function SimpleCourseManagement() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [courses, setCourses] = useState<SimpleCourse[]>(mockCourses);

  // Admin access control
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAdmin, adminLoading, router]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleEditCourse = (courseId: string) => {
    router.push(`/admin/courses/${courseId}`);
  };

  const handleCreateCourse = () => {
    router.push('/admin/courses/new');
  };

  return (
    <DashboardLayout
      title="Kurs Yönetimi"
      actions={
        <Button onClick={handleCreateCourse} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Kurs Ekle
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Kurs Listesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow overflow-hidden p-0">
              {/* Kapak Görseli */}
              <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 m-0">
                {course.coverImage ? (
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full object-cover block"
                    onError={(e) => {
                      // Görsel yüklenemezse placeholder göster
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center ${course.coverImage ? 'hidden' : ''}`}>
                  <div className="text-center">
                    <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Kapak görseli yok</p>
                  </div>
                </div>
              </div>
              
              <CardHeader className="pt-0.5 px-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    variant={course.status === 'active' ? 'default' : 'secondary'}
                  >
                    {course.status === 'active' ? 'Aktif' : 'Taslak'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/courses/${course.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCourse(course.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Video ve Öğrenci Sayıları */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Video className="h-4 w-4" />
                        <span className="text-lg font-bold">{course.videoCount}</span>
                      </div>
                      <div className="text-xs text-gray-500">Video</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-lg font-bold">{course.subscriberCount.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">Öğrenci</div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}