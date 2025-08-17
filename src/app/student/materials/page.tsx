"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { 
  FileText,
  Table,
  Link2,
  File,
  Download,
  ExternalLink,
  Search,
  BookOpen,
  Calendar,
  ChevronDown,
  Folder,
  Grid,
  List,
  ShoppingCart,
  Users,
  Star,
  Trophy,
  Target,
  TrendingUp,
  Gift,
  CheckCircle,
  Rocket
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getCurrentUser } from '@/lib/simple-auth';
import { ALL_COURSES } from '@/data/courses';

interface Material {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'link' | 'document' | 'video' | 'image';
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonName: string;
  uploadedAt: string;
  downloadUrl?: string;
  externalUrl?: string;
  size?: string;
  description?: string;
}

export default function StudentMaterialsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [listViewMode, setListViewMode] = useState<'grid' | 'list'>('list');
  const [courses, setCourses] = useState<Array<{id: string, name: string}>>([]);
  const [hasEnrolledCourses, setHasEnrolledCourses] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'purchased' | 'not-purchased'>('not-purchased');

  // Mock data - kullanıcının kayıtlı olduğu kurslara ait materyaller
  const mockMaterials: Material[] = [
    {
      id: '1',
      name: 'Amazon FBA Başlangıç Rehberi.pdf',
      type: 'pdf',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-1',
      lessonName: 'Amazon FBA\'ya Giriş',
      uploadedAt: '2024-01-15T10:30:00Z',
      downloadUrl: '/materials/amazon-fba-baslangic-rehberi.pdf',
      size: '2.4 MB',
      description: 'Amazon FBA işine başlamak için gerekli tüm bilgiler'
    },
    {
      id: '2',
      name: 'Ürün Araştırma Şablonu.xlsx',
      type: 'excel',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-2',
      lessonName: 'Ürün Araştırması',
      uploadedAt: '2024-01-14T15:45:00Z',
      downloadUrl: '/materials/urun-arastirma-sablonu.xlsx',
      size: '156 KB',
      description: 'Karlı ürünler bulmak için kullanabileceğiniz Excel şablonu'
    },
    {
      id: '3',
      name: 'Helium 10 Ücretsiz Alternatifi',
      type: 'link',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-2',
      lessonName: 'Ürün Araştırması',
      uploadedAt: '2024-01-13T09:20:00Z',
      externalUrl: 'https://jungle-scout.com/free-tools',
      description: 'Ücretsiz ürün araştırma araçları'
    },
    {
      id: '4',
      name: 'Marka Tescil Formu.pdf',
      type: 'pdf',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-4',
      lessonName: 'Marka Tescili',
      uploadedAt: '2024-01-12T14:15:00Z',
      downloadUrl: '/materials/marka-tescil-formu.pdf',
      size: '890 KB',
      description: 'Türkiye Patent ve Marka Kurumu başvuru formu'
    },
    {
      id: '5',
      name: 'FBA Ücret Hesaplama Aracı.xlsx',
      type: 'excel',
      courseId: 'amazon-fba-mastery',
      courseName: 'Amazon FBA Mastery',
      lessonId: 'lesson-5',
      lessonName: 'FBA Ücretleri',
      uploadedAt: '2024-01-11T16:40:00Z',
      downloadUrl: '/materials/fba-ucret-hesaplama.xlsx',
      size: '234 KB',
      description: 'Amazon FBA ücretlerini hesaplamak için Excel aracı'
    },
    {
      id: '6',
      name: 'Amazon PPC Strateji Dökümanı',
      type: 'document',
      courseId: 'amazon-ppc-reklam-uzmanligi',
      courseName: 'Amazon PPC Reklam Uzmanlığı',
      lessonId: 'lesson-1',
      lessonName: 'PPC Temelleri',
      uploadedAt: '2024-01-10T11:20:00Z',
      downloadUrl: '/materials/amazon-ppc-strateji.docx',
      size: '1.2 MB',
      description: 'Etkili PPC kampanyaları oluşturma stratejileri'
    },
    {
      id: '7',
      name: 'Anahtar Kelime Araştırma Rehberi',
      type: 'pdf',
      courseId: 'amazon-ppc-reklam-uzmanligi',
      courseName: 'Amazon PPC Reklam Uzmanlığı',
      lessonId: 'lesson-2',
      lessonName: 'Anahtar Kelime Optimizasyonu',
      uploadedAt: '2024-01-09T13:30:00Z',
      downloadUrl: '/materials/anahtar-kelime-arastirma.pdf',
      size: '1.8 MB',
      description: 'Amazon için etkili anahtar kelime bulma teknikleri'
    },
    {
      id: '8',
      name: 'MidJourney Prompt Koleksiyonu',
      type: 'link',
      courseId: 'amazon-ppc-reklam-uzmanligi',
      courseName: 'Amazon PPC Reklam Uzmanlığı',
      lessonId: 'lesson-3',
      lessonName: 'Görsel Reklam Tasarımı',
      uploadedAt: '2024-01-08T10:15:00Z',
      externalUrl: 'https://prompts.chat/prompt/midjourney-amazon-ads',
      description: 'Amazon reklamları için AI prompt koleksiyonu'
    }
  ];

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    setLoading(true);

    // Tüm kursları göster (demo için)
    const userCourses = ALL_COURSES;
    
    setCourses(userCourses.map(course => ({
      id: course.id,
      name: course.title
    })));

    // Test için: viewMode'a göre hasEnrolledCourses'u ayarlayalım
    const hasEnrolled = viewMode === 'purchased'; // viewMode'a göre dinamik ayarlama
    setHasEnrolledCourses(hasEnrolled);
    
    // Eğer eğitim satın almışsa materyalleri göster
    const userMaterials = hasEnrolled ? mockMaterials : [];

    setTimeout(() => {
      setMaterials(userMaterials);
      setLoading(false);
    }, 500);
  }, [router, viewMode]);

  // Filter materials based on search and filters
  useEffect(() => {
    let filtered = materials;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.lessonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.type === typeFilter);
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter(m => m.courseId === courseFilter);
    }

    setFilteredMaterials(filtered);
  }, [materials, searchTerm, typeFilter, courseFilter]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'excel':
        return Table;
      case 'link':
        return Link2;
      case 'document':
        return File;
      default:
        return File;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'excel':
        return 'Excel';
      case 'link':
        return 'Link';
      case 'document':
        return 'Doküman';
      default:
        return 'Dosya';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'excel':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'link':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'document':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const handleDownload = (material: Material) => {
    if (material.type === 'link' && material.externalUrl) {
      window.open(material.externalUrl, '_blank');
    } else if (material.downloadUrl) {
      // Simulated download
      toast.success(`${material.name} indiriliyor...`);
      // Gerçek uygulamada burada dosya indirme işlemi olacak
    }
  };

  const getTypeStats = () => {
    const stats = {
      pdf: materials.filter(m => m.type === 'pdf').length,
      excel: materials.filter(m => m.type === 'excel').length,
      link: materials.filter(m => m.type === 'link').length,
      document: materials.filter(m => m.type === 'document').length,
    };
    return stats;
  };

  const typeStats = getTypeStats();

  if (loading) {
    return (
      <DashboardLayout
        title="Materyallerim"
        subtitle="Eğitimlerinize ait tüm materyaller"
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Materyaller yükleniyor...</p>
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
          <FileText className="h-16 w-16 text-blue-200" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Materyallerine Erişim Kazanmak İçin 📚</h2>
        <p className="text-blue-100 text-lg mb-6">
          Amazon FBA eğitimlerimize kayıt olarak özel materyallere, rehberlere ve araçlara erişim sağla!
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">2000+ Öğrenci</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">4.8+ Puan</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-200" />
            <span className="text-blue-100">100+ Materyal</span>
          </div>
        </div>
      </div>

      {/* Material Types Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">PDF Rehberler</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Detaylı kılavuzlar</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Table className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Excel Şablonları</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Hesaplama araçları</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Özel Linkler</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Ücretsiz araçlar</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <File className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Bonus İçerikler</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Özel dokümanlar</p>
        </div>
      </div>

      {/* What You'll Get */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <Gift className="inline h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
          Eğitime Kaydolunca Neler Kazanırsın?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Ürün Araştırma Kiti</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Excel şablonları ve araç linkleri</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Tedarikçi Rehberi</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Güvenilir tedarikçi listesi</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Maliyet Hesaplayıcı</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Kar marjı hesaplama araçları</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">PPC Şablonları</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Reklam kampanya örnekleri</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Bugün Başla, Materyallere Erişim Sağla! 🚀</h2>
        <p className="text-blue-100 mb-6">
          Amazon FBA'de başarıya ulaşman için gerekli tüm materyaller seni bekliyor.
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
      title="Materyallerim"
      subtitle="Eğitimlerinize ait tüm materyaller"
    >
      {/* View Mode Toggle */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Materyal Görünümü</h3>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">PDF</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{typeStats.pdf}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Excel</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{typeStats.excel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Link</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{typeStats.link}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <File className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Doküman</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{typeStats.document}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <DashboardCard>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setListViewMode('list')}
                  className={`relative ${
                    listViewMode === 'list'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <List className="h-4 w-4" />
                  {listViewMode === 'list' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setListViewMode('grid')}
                  className={`relative ${
                    listViewMode === 'grid'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  {listViewMode === 'grid' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Materyallerde ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Tüm Tipler</option>
                  <option value="pdf">PDF Dosyalar</option>
                  <option value="excel">Excel Dosyalar</option>
                  <option value="link">Linkler</option>
                  <option value="document">Dokümanlar</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 pointer-events-none" />
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
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Materials List/Grid */}
        <DashboardCard>
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Materyaller ({filteredMaterials.length})
              </h2>
            </div>

            {filteredMaterials.length > 0 ? (
              listViewMode === 'list' ? (
                <div className="space-y-4">
                  {filteredMaterials.map((material) => {
                    const IconComponent = getIcon(material.type);
                    
                    return (
                      <div
                        key={material.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* File Icon */}
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${getTypeColor(material.type)}`}>
                            <IconComponent className="h-6 w-6" />
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                              {material.name}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-1">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {material.courseName}
                              </span>
                              <span>•</span>
                              <span>{material.lessonName}</span>
                              {material.size && (
                                <>
                                  <span>•</span>
                                  <span>{material.size}</span>
                                </>
                              )}
                            </div>
                            {material.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                                {material.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(material.type)}`}>
                                {getTypeLabel(material.type)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(material.uploadedAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(material)}
                            >
                              {material.type === 'link' ? (
                                <>
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Aç
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-1" />
                                  İndir
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMaterials.map((material) => {
                    const IconComponent = getIcon(material.type);
                    
                    return (
                      <div
                        key={material.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        <div className="text-center">
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center border mx-auto mb-3 ${getTypeColor(material.type)}`}>
                            <IconComponent className="h-8 w-8" />
                          </div>
                          
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm">
                            {material.name}
                          </h4>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <BookOpen className="h-3 w-3" />
                              <span className="truncate">{material.courseName}</span>
                            </div>
                            <div>{material.lessonName}</div>
                            {material.size && <div>{material.size}</div>}
                          </div>

                          <div className="flex items-center justify-center gap-2 mb-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(material.type)}`}>
                              {getTypeLabel(material.type)}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(material)}
                            className="w-full"
                          >
                            {material.type === 'link' ? (
                              <>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Aç
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                İndir
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || typeFilter !== 'all' || courseFilter !== 'all'
                    ? 'Filtrelere uygun materyal bulunamadı'
                    : 'Henüz materyal bulunmuyor'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {searchTerm || typeFilter !== 'all' || courseFilter !== 'all'
                    ? 'Farklı filtreler deneyebilirsiniz.'
                    : 'Derslerinizde paylaşılan materyaller burada görünecek.'}
                </p>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>
      )}

      <Toaster />
    </DashboardLayout>
  );
}
