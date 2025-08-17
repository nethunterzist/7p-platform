"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/useAdmin';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Video,
  FileText,
  BookOpen,
  Edit,
  Trash2,
  Save,
  ArrowLeft,
  Upload,
  File,
  Table,
  Link,
  FileIcon,
  Image
} from 'lucide-react';
import { toast } from 'sonner';
// Quiz sistemi kaldırıldı

// Basit interfaces
interface SimpleLesson {
  id: string;
  title: string;
  description: string;
  type: 'video';
  videoUrl?: string;
  duration?: number; // dakika
  materials?: {
    id: string;
    name: string;
    url: string;
    type: 'pdf' | 'excel' | 'link' | 'document';
  }[];
  order: number;
}

interface SimpleModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: SimpleLesson[];
}

interface SimpleCourse {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'draft';
  coverImage?: string;
  modules: SimpleModule[];
}

// Mock data - 3 eğitim için detaylı veriler
const mockCourseData: Record<string, SimpleCourse> = {
  'amazon-ppc': {
    id: 'amazon-ppc',
    title: 'Amazon PPC Eğitimi',
    description: 'Amazon PPC reklamcılığında uzman seviyesine çıkacağınız detaylı eğitim programı',
    status: 'active',
    coverImage: 'https://i.ytimg.com/vi/zl8wxIEszc8/maxresdefault.jpg',
    modules: [
      {
        id: 'ppc-module-1',
        title: 'PPC Temelleri ve Başlangıç',
        description: 'Amazon PPC reklamcılığının temel prensipleri ve hesap kurulumu',
        order: 1,
        lessons: [
          {
            id: 'ppc-lesson-1',
            title: 'Amazon PPC\'ye Giriş',
            description: 'Amazon PPC nedir ve nasıl çalışır',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 18,
            materials: [
              {
                id: 'ppc-mat-1',
                name: 'PPC Terimler Sözlüğü',
                url: 'ppc-glossary.pdf',
                type: 'pdf'
              }
            ],
            order: 1
          },
          {
            id: 'ppc-lesson-2',
            title: 'Reklam Hesabı Kurulumu',
            description: 'Amazon reklam hesabını nasıl kurarız',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 22,
            order: 2
          }
        ]
      },
      {
        id: 'ppc-module-2',
        title: 'Kampanya Yönetimi',
        description: 'Farklı kampanya türleri ve yönetim teknikleri',
        order: 2,
        lessons: [
          {
            id: 'ppc-lesson-3',
            title: 'Sponsored Products Kampanyaları',
            description: 'En popüler kampanya türü olan Sponsored Products',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 25,
            materials: [
              {
                id: 'ppc-mat-2',
                name: 'Kampanya Kurulum Rehberi',
                url: 'campaign-setup-guide.pdf',
                type: 'pdf'
              }
            ],
            order: 1
          },
          {
            id: 'ppc-lesson-4',
            title: 'Anahtar Kelime Araştırması',
            description: 'Etkili anahtar kelimeler nasıl bulunur',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 30,
            materials: [
              {
                id: 'ppc-mat-3',
                name: 'Anahtar Kelime Planlama Tablosu',
                url: 'keyword-planner.xlsx',
                type: 'excel'
              }
            ],
            order: 2
          }
        ]
      },
      {
        id: 'ppc-module-3',
        title: 'Optimizasyon ve İleri Stratejiler',
        description: 'Kampanya optimizasyonu ve gelişmiş PPC stratejileri',
        order: 3,
        lessons: [
          {
            id: 'ppc-lesson-5',
            title: 'Performans Analizi',
            description: 'Kampanya performansını nasıl analiz ederiz',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 35,
            materials: [
              {
                id: 'ppc-mat-4',
                name: 'Performans Takip Tablosu',
                url: 'performance-tracking.xlsx',
                type: 'excel'
              }
            ],
            order: 1
          },
          {
            id: 'ppc-lesson-6',
            title: 'Bid Optimizasyonu',
            description: 'Teklif optimizasyonu teknikleri',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 28,
            order: 2
          }
        ]
      }
    ]
  },
  'amazon-full-mentorship': {
    id: 'amazon-full-mentorship',
    title: 'Amazon Full Mentorship',
    description: 'Amazon FBA sürecinin A\'dan Z\'ye anlatıldığı kapsamlı mentörlük programı',
    status: 'active',
    coverImage: 'https://i.ytimg.com/vi/nuOA3GqoA8A/maxresdefault.jpg',
    modules: [
      {
        id: 'fm-module-1',
        title: 'Amazon FBA Temelleri',
        description: 'Amazon FBA sürecine giriş ve temel kavramlar',
        order: 1,
        lessons: [
          {
            id: 'fm-lesson-1',
            title: 'Amazon FBA Nedir?',
            description: 'Fulfillment by Amazon sistemi ve avantajları',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 20,
            materials: [
              {
                id: 'fm-mat-1',
                name: 'FBA Başlangıç Rehberi',
                url: 'fba-guide.pdf',
                type: 'pdf'
              }
            ],
            order: 1
          },
          {
            id: 'fm-lesson-2',
            title: 'Satıcı Hesabı Kurulumu',
            description: 'Amazon satıcı hesabı açma ve ilk ayarlar',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 25,
            order: 2
          }
        ]
      },
      {
        id: 'fm-module-2',
        title: 'Ürün Araştırması ve Sourcing',
        description: 'Karlı ürünleri bulma ve tedarik süreci',
        order: 2,
        lessons: [
          {
            id: 'fm-lesson-3',
            title: 'Ürün Araştırma Teknikleri',
            description: 'Karlı ürünleri nasıl buluruz',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 35,
            materials: [
              {
                id: 'fm-mat-2',
                name: 'Ürün Araştırma Tablosu',
                url: 'product-research.xlsx',
                type: 'excel'
              },
              {
                id: 'fm-mat-3',
                name: 'Jungle Scout Rehberi',
                url: 'https://junglescout.com',
                type: 'link'
              }
            ],
            order: 1
          },
          {
            id: 'fm-lesson-4',
            title: 'Tedarikçi Bulma ve İletişim',
            description: 'Güvenilir tedarikçiler nasıl bulunur',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 30,
            order: 2
          }
        ]
      },
      {
        id: 'fm-module-3',
        title: 'Listing Optimizasyonu ve Pazarlama',
        description: 'Ürün sayfası optimizasyonu ve pazarlama stratejileri',
        order: 3,
        lessons: [
          {
            id: 'fm-lesson-5',
            title: 'Amazon SEO ve Listing Optimizasyonu',
            description: 'Ürün sayfanızı nasıl optimize edersiniz',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 32,
            materials: [
              {
                id: 'fm-mat-4',
                name: 'SEO Checklist',
                url: 'amazon-seo-checklist.pdf',
                type: 'pdf'
              }
            ],
            order: 1
          },
          {
            id: 'fm-lesson-6',
            title: 'Launch Stratejileri',
            description: 'Yeni ürününüzü nasıl başarıyla lansmanını yaparsınız',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 28,
            order: 2
          }
        ]
      }
    ]
  },
  'amazon-urun-arastirma': {
    id: 'amazon-urun-arastirma',
    title: 'Amazon Ürün Araştırma',
    description: 'Amazon\'da karlı ürünleri bulma ve analiz etme tekniklerini öğrenin',
    status: 'active',
    coverImage: 'https://i.ytimg.com/vi/wPtnLsHMGLk/maxresdefault.jpg',
    modules: [
      {
        id: 'ua-module-1',
        title: 'Ürün Araştırma Temelleri',
        description: 'Ürün araştırmasının temel prensipleri',
        order: 1,
        lessons: [
          {
            id: 'ua-lesson-1',
            title: 'Ürün Araştırma Nedir?',
            description: 'Neden ürün araştırması yapmamız gerekir',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 18,
            materials: [
              {
                id: 'ua-mat-1',
                name: 'Ürün Araştırma Rehberi',
                url: 'product-research-guide.pdf',
                type: 'pdf'
              }
            ],
            order: 1
          },
          {
            id: 'ua-lesson-2',
            title: 'Pazar Analizi Temelleri',
            description: 'Bir pazarı nasıl analiz ederiz',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 22,
            order: 2
          }
        ]
      },
      {
        id: 'ua-module-2',
        title: 'Araştırma Araçları ve Teknikleri',
        description: 'Ürün araştırmasında kullanılan araçlar ve yöntemler',
        order: 2,
        lessons: [
          {
            id: 'ua-lesson-3',
            title: 'Helium 10 Kullanımı',
            description: 'En popüler araştırma aracı Helium 10',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 30,
            materials: [
              {
                id: 'ua-mat-2',
                name: 'Helium 10 Rehberi',
                url: 'https://helium10.com',
                type: 'link'
              }
            ],
            order: 1
          },
          {
            id: 'ua-lesson-4',
            title: 'Manuel Araştırma Teknikleri',
            description: 'Araç kullanmadan nasıl araştırma yapılır',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 25,
            materials: [
              {
                id: 'ua-mat-3',
                name: 'Manuel Araştırma Tablosu',
                url: 'manual-research-template.xlsx',
                type: 'excel'
              }
            ],
            order: 2
          }
        ]
      },
      {
        id: 'ua-module-3',
        title: 'Karlılık Analizi ve Karar Verme',
        description: 'Ürün karlılığını analiz etme ve doğru karar verme',
        order: 3,
        lessons: [
          {
            id: 'ua-lesson-5',
            title: 'Maliyet Hesaplamaları',
            description: 'Ürün maliyetlerini nasıl hesaplarız',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 28,
            materials: [
              {
                id: 'ua-mat-4',
                name: 'Maliyet Hesaplama Tablosu',
                url: 'cost-calculation-template.xlsx',
                type: 'excel'
              }
            ],
            order: 1
          },
          {
            id: 'ua-lesson-6',
            title: 'Risk Analizi ve Karar Verme',
            description: 'Ürün seçiminde dikkat edilmesi gerekenler',
            type: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: 24,
            order: 2
          }
        ]
      }
    ]
  }
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<SimpleCourse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [isAddingLesson, setIsAddingLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{moduleId: string, lessonId: string} | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false);
  const [showDeleteModuleDialog, setShowDeleteModuleDialog] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<{moduleId: string, lessonId: string} | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
  
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    type: 'video' as 'video',
    videoUrl: '',
    duration: 0,
    materials: [] as {
      id: string;
      name: string;
      url: string;
      type: 'pdf' | 'excel' | 'link' | 'document';
    }[]
  });

  const [materialForm, setMaterialForm] = useState({
    name: '',
    url: '',
    type: 'pdf' as 'pdf' | 'excel' | 'link' | 'document',
    file: null as File | null
  });

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    status: 'active' as 'active' | 'draft',
    coverImage: ''
  });

  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    // Mock data yükleme
    const courseData = mockCourseData[courseId];
    if (courseData) {
      setCourse(courseData);
    } else {
      // Check localStorage for newly created course
      const storedCourse = localStorage.getItem(`course_${courseId}`);
      if (storedCourse) {
        setCourse(JSON.parse(storedCourse));
      } else {
        // Fallback: create basic template
        setCourse({
          id: courseId,
          title: courseId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          description: 'Yeni oluşturulan kurs',
          status: 'draft',
          coverImage: '',
          modules: [
            {
              id: 'module-1',
              title: 'Giriş',
              description: 'Kurs giriş ünitesi',
              order: 1,
              lessons: []
            }
          ]
        });
      }
    }
    setLoading(false);
  }, [courseId, isAdmin, adminLoading, router]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin || !course) return null;

  const handleAddLesson = (moduleId: string) => {
    if (!lessonForm.title.trim()) {
      toast.error('Ders adı gerekli');
      return;
    }

    const module = course.modules.find(m => m.id === moduleId);
    if (!module) return;

    const newLesson: SimpleLesson = {
      id: `lesson-${Date.now()}`,
      title: lessonForm.title,
      description: lessonForm.description,
      type: lessonForm.type,
      videoUrl: lessonForm.videoUrl,
      duration: lessonForm.duration,
      materials: lessonForm.materials,
      order: (module.lessons?.length || 0) + 1
    };

    setCourse(prev => prev ? {
      ...prev,
      modules: prev.modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: [...m.lessons, newLesson] }
          : m
      )
    } : null);

    setLessonForm({
      title: '',
      description: '',
      type: 'video',
      videoUrl: '',
      duration: 0,
      materials: []
    });
    setMaterialForm({
      name: '',
      url: '',
      type: 'pdf',
      file: null
    });
    setIsAddingLesson(null);
    toast.success('Ders eklendi');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMaterialForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleAddMaterial = () => {
    if (!materialForm.name.trim()) {
      toast.error('Materyal adı gerekli');
      return;
    }
    
    if (materialForm.type === 'link') {
      if (!materialForm.url.trim()) {
        toast.error('URL gerekli');
        return;
      }
    } else {
      if (!materialForm.file) {
        toast.error('Dosya seçimi gerekli');
        return;
      }
    }

    const newMaterial = {
      id: `material-${Date.now()}`,
      name: materialForm.name,
      url: materialForm.type === 'link' ? materialForm.url : materialForm.file?.name || '',
      type: materialForm.type
    };

    setLessonForm(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));

    setMaterialForm({
      name: '',
      url: '',
      type: 'pdf',
      file: null
    });

    toast.success('Materyal eklendi');
  };

  const handleRemoveMaterial = (materialId: string) => {
    setLessonForm(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== materialId)
    }));
    toast.success('Materyal silindi');
  };

  const handleEditCourse = () => {
    if (course) {
      setCourseForm({
        title: course.title,
        description: course.description,
        status: course.status,
        coverImage: course.coverImage || ''
      });
      setEditingCourse(true);
    }
  };

  const handleUpdateCourse = () => {
    if (!courseForm.title.trim()) {
      toast.error('Kurs adı gerekli');
      return;
    }

    setCourse(prev => prev ? {
      ...prev,
      title: courseForm.title,
      description: courseForm.description,
      status: courseForm.status,
      coverImage: courseForm.coverImage
    } : null);

    setEditingCourse(false);
    toast.success('Kurs bilgileri güncellendi');
  };

  const handleEditModule = (moduleId: string) => {
    if (!course) return;
    const module = course.modules.find(m => m.id === moduleId);
    if (module) {
      setModuleForm({
        title: module.title,
        description: module.description
      });
      setEditingModule(moduleId);
    }
  };

  const handleUpdateModule = () => {
    if (!moduleForm.title.trim()) {
      toast.error('Ünite adı gerekli');
      return;
    }

    setCourse(prev => prev ? {
      ...prev,
      modules: prev.modules.map(m => 
        m.id === editingModule 
          ? { ...m, title: moduleForm.title, description: moduleForm.description }
          : m
      )
    } : null);

    setEditingModule(null);
    setModuleForm({ title: '', description: '' });
    toast.success('Ünite güncellendi');
  };

  const handleDeleteCourse = () => {
    // Mock deletion - in real app would delete from database
    localStorage.removeItem(`course_${courseId}`);
    toast.success('Kurs silindi');
    router.push('/admin/courses');
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    setLessonToDelete({ moduleId, lessonId });
    setShowDeleteLessonDialog(true);
  };

  const confirmDeleteLesson = () => {
    if (lessonToDelete) {
      setCourse(prev => prev ? {
        ...prev,
        modules: prev.modules.map(m => 
          m.id === lessonToDelete.moduleId 
            ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonToDelete.lessonId) }
            : m
        )
      } : null);
      toast.success('Ders silindi');
      setShowDeleteLessonDialog(false);
      setLessonToDelete(null);
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    setModuleToDelete(moduleId);
    setShowDeleteModuleDialog(true);
  };

  const confirmDeleteModule = () => {
    if (moduleToDelete) {
      setCourse(prev => prev ? {
        ...prev,
        modules: prev.modules.filter(m => m.id !== moduleToDelete)
      } : null);
      toast.success('Ünite silindi');
      setShowDeleteModuleDialog(false);
      setModuleToDelete(null);
    }
  };

  const handleEditLesson = (moduleId: string, lessonId: string) => {
    const module = course?.modules.find(m => m.id === moduleId);
    const lesson = module?.lessons.find(l => l.id === lessonId);
    if (lesson) {
      setLessonForm({
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        videoUrl: lesson.videoUrl || '',
        duration: lesson.duration || 0,
        materials: lesson.materials || []
      });
      setEditingLesson({ moduleId, lessonId });
    }
  };

  const handleUpdateLesson = () => {
    if (!lessonForm.title.trim()) {
      toast.error('Ders adı gerekli');
      return;
    }

    if (editingLesson) {
      setCourse(prev => prev ? {
        ...prev,
        modules: prev.modules.map(m => 
          m.id === editingLesson.moduleId 
            ? {
                ...m,
                lessons: m.lessons.map(l => 
                  l.id === editingLesson.lessonId
                    ? {
                        ...l,
                        title: lessonForm.title,
                        description: lessonForm.description,
                        type: lessonForm.type,
                        videoUrl: lessonForm.videoUrl,
                        duration: lessonForm.duration,
                        materials: lessonForm.materials
                      }
                    : l
                )
              }
            : m
        )
      } : null);

      setEditingLesson(null);
      setLessonForm({
        title: '',
        description: '',
        type: 'video',
        videoUrl: '',
        duration: 0,
        materials: []
      });
      toast.success('Ders güncellendi');
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4 text-green-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLessonTypeName = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      default: return 'Ders';
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <File className="h-4 w-4 text-red-600" />;
      case 'excel': return <Table className="h-4 w-4 text-green-600" />;
      case 'link': return <Link className="h-4 w-4 text-blue-600" />;
      case 'document': return <FileText className="h-4 w-4 text-gray-600" />;
      default: return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout
      title={course.title}
      subtitle="Ünitelere video ve materyal ekleyin"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <Button variant="outline" onClick={handleEditCourse}>
            <Edit className="h-4 w-4 mr-2" />
            Kurs Düzenle
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Kurs Bilgileri Düzenleme */}
        {editingCourse && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Kurs Bilgilerini Düzenle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kurs Adı</label>
                <Input
                  value={courseForm.title}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Kurs adı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <Textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Kurs açıklaması"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kapak Görseli</label>
                <div className="space-y-2">
                  <Input
                    value={courseForm.coverImage}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="Görsel URL'i veya yükleme yapın"
                  />
                  {courseForm.coverImage && (
                    <div className="relative h-32 w-full rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={courseForm.coverImage}
                        alt="Önizleme"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <Image className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Görsel yüklenemedi</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Önerilen boyut: 1280x720 (16:9 oranında)
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Durum</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={courseForm.status}
                  onChange={(e) => setCourseForm(prev => ({ 
                    ...prev, 
                    status: e.target.value as 'active' | 'draft' 
                  }))}
                >
                  <option value="active">Aktif</option>
                  <option value="draft">Taslak</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateCourse}>
                  <Save className="h-4 w-4 mr-2" />
                  Güncelle
                </Button>
                <Button variant="outline" onClick={() => setEditingCourse(false)}>
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kurs Özet */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </div>
              <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                {course.status === 'active' ? 'Aktif' : 'Taslak'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Ünite:</span>
                <span className="ml-2 font-medium">{course.modules.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Video:</span>
                <span className="ml-2 font-medium">
                  {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Materyal:</span>
                <span className="ml-2 font-medium">
                  {course.modules.reduce((sum, m) => 
                    sum + m.lessons.reduce((lSum, l) => lSum + (l.materials?.length || 0), 0), 0
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Üniteler */}
        <div className="space-y-6">
          {course.modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                {editingModule === module.id ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-blue-900">Ünite Düzenle</h3>
                    <div>
                      <Input
                        value={moduleForm.title}
                        onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ünite başlığı"
                      />
                    </div>
                    <div>
                      <Textarea
                        value={moduleForm.description}
                        onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ünite açıklaması"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateModule}>
                        <Save className="h-4 w-4 mr-1" />
                        Güncelle
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingModule(null)}>
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Ünite {module.order}: {module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingLesson(module.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        İçerik Ekle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditModule(module.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {/* Ders Düzenleme Formu */}
                {editingLesson && editingLesson.moduleId === module.id && (
                  <div className="mb-6 p-4 border rounded-lg bg-yellow-50 space-y-4">
                    <h4 className="font-medium text-yellow-900">Dersi Düzenle</h4>
                    <p className="text-sm text-yellow-700">Ders bilgilerini güncelleyin:</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Video başlığı"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
                        <Video className="h-4 w-4 text-green-600" />
                        <span>Video Dersi</span>
                      </div>
                    </div>
                    
                    <Textarea
                      placeholder="İçerik açıklaması"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg space-y-3">
                        <h5 className="font-medium text-green-900 flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video Bilgileri
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="Video URL"
                            value={lessonForm.videoUrl}
                            onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                          />
                          <Input
                            type="number"
                            placeholder="Video süresi (dakika)"
                            value={lessonForm.duration}
                            onChange={(e) => setLessonForm(prev => ({ 
                              ...prev, 
                              duration: parseInt(e.target.value) || 0 
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateLesson}>
                        <Save className="h-4 w-4 mr-2" />
                        Güncelle
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setEditingLesson(null);
                        setLessonForm({
                          title: '',
                          description: '',
                          type: 'video',
                          videoUrl: '',
                          duration: 0,
                          materials: []
                        });
                      }}>
                        İptal
                      </Button>
                    </div>
                  </div>
                )}

                {/* İçerik Ekleme Formu */}
                {isAddingLesson === module.id && (
                  <div className="mb-6 p-4 border rounded-lg bg-blue-50 space-y-4">
                    <h4 className="font-medium text-blue-900">"{module.title}" Ünitesine İçerik Ekle</h4>
                    <p className="text-sm text-blue-700">Video veya materyal seçin ve bilgilerini girin:</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Video başlığı (Örn: Amazon Nedir?, Hesap Açma)"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
                        <Video className="h-4 w-4 text-green-600" />
                        <span>Video Dersi</span>
                      </div>
                    </div>
                    
                    <Textarea
                      placeholder="İçerik açıklaması (Bu derste ne öğretilecek?)"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg space-y-3">
                          <h5 className="font-medium text-green-900 flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Video Bilgileri
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              placeholder="Video URL (YouTube, Vimeo vs.)"
                              value={lessonForm.videoUrl}
                              onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                            />
                            <Input
                              type="number"
                              placeholder="Video süresi (dakika)"
                              value={lessonForm.duration}
                              onChange={(e) => setLessonForm(prev => ({ 
                                ...prev, 
                                duration: parseInt(e.target.value) || 0 
                              }))}
                            />
                          </div>
                        </div>

                        {/* Materyal Ekleme */}
                        <div className="p-4 bg-orange-50 rounded-lg space-y-3">
                          <h5 className="font-medium text-orange-900 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Video İçin Materyaller (Opsiyonel)
                          </h5>
                          <p className="text-sm text-orange-700">Bu videoya ek PDF, Excel, link veya döküman ekleyebilirsiniz</p>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Materyal adı"
                                value={materialForm.name}
                                onChange={(e) => setMaterialForm(prev => ({ ...prev, name: e.target.value }))}
                              />
                              <select
                                className="px-3 py-2 border rounded-md bg-white text-sm"
                                value={materialForm.type}
                                onChange={(e) => setMaterialForm(prev => ({ 
                                  ...prev, 
                                  type: e.target.value as 'pdf' | 'excel' | 'link' | 'document',
                                  url: '',
                                  file: null
                                }))}
                              >
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                                <option value="link">Link</option>
                                <option value="document">Döküman</option>
                              </select>
                            </div>
                            
                            {/* Conditional rendering based on material type */}
                            {materialForm.type === 'link' ? (
                              <Input
                                placeholder="URL/Link girin"
                                value={materialForm.url}
                                onChange={(e) => setMaterialForm(prev => ({ ...prev, url: e.target.value }))}
                              />
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className="flex items-center gap-2"
                                  >
                                    <Upload className="h-4 w-4" />
                                    Dosya Gözat
                                  </Button>
                                  {materialForm.file && (
                                    <span className="text-sm text-gray-600">
                                      {materialForm.file.name}
                                    </span>
                                  )}
                                </div>
                                <input
                                  id="file-upload"
                                  type="file"
                                  accept={
                                    materialForm.type === 'pdf' ? '.pdf' :
                                    materialForm.type === 'excel' ? '.xlsx,.xls,.csv' :
                                    '.doc,.docx,.txt'
                                  }
                                  className="hidden"
                                  onChange={handleFileUpload}
                                />
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={handleAddMaterial}
                            disabled={
                              !materialForm.name.trim() || 
                              (materialForm.type === 'link' ? !materialForm.url.trim() : !materialForm.file)
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Materyal Ekle
                          </Button>

                          {/* Eklenen Materyaller */}
                          {lessonForm.materials.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-orange-900">Eklenen Materyaller:</p>
                              {lessonForm.materials.map((material) => (
                                <div key={material.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <span>{getMaterialIcon(material.type)}</span>
                                    <span className="text-sm font-medium">{material.name}</span>
                                    <span className="text-xs text-gray-500">({material.type})</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMaterial(material.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={() => handleAddLesson(module.id)}>
                        <Save className="h-4 w-4 mr-2" />
                        İçerik Ekle
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddingLesson(null)}>
                        İptal
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dersler */}
                <div className="space-y-3">
                  {module.lessons.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Bu ünitede henüz içerik yok</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Video veya materyal eklemek için "İçerik Ekle" butonunu kullanın.
                      </p>
                    </div>
                  ) : (
                    module.lessons.map((lesson) => (
                      <div key={lesson.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getLessonIcon(lesson.type)}
                            <div>
                              <h5 className="font-medium">{lesson.title}</h5>
                              <p className="text-sm text-gray-500">{lesson.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                <span>{getLessonTypeName(lesson.type)}</span>
                                {lesson.duration && <span>{lesson.duration} dk</span>}
                                {lesson.videoUrl && (
                                  <div className="flex items-center gap-1">
                                    <Video className="h-3 w-3" />
                                    <span>Video bağlantısı</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditLesson(module.id, lesson.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Video materyalleri */}
                        {lesson.materials && lesson.materials.length > 0 && (
                          <div className="ml-6 pl-4 border-l-2 border-orange-200">
                            <p className="text-xs font-medium text-orange-800 mb-2 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Ek Materyaller:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {lesson.materials.map((material) => (
                                <div key={material.id} className="flex items-center gap-2 p-2 bg-white rounded border text-xs">
                                  <span>{getMaterialIcon(material.type)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{material.name}</div>
                                    <div className="text-gray-500 truncate">{material.url}</div>
                                  </div>
                                  <span className="text-gray-400">({material.type})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Kurs Silme */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Tehlikeli Alan</h3>
                <p className="text-sm text-red-700">
                  Bu kursu silmek tüm verilerini kalıcı olarak silecektir. Bu işlem geri alınamaz.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Kursu Sil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kurs Silme Onay Dialogu */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Kursu Sil</h3>
                  <p className="text-sm text-gray-600">Bu işlem geri alınamaz</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Bu kursu ve tüm içeriklerini kalıcı olarak silmek istediğinize emin misiniz?
              </p>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteDialog(false)}
                >
                  İptal
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteCourse}
                >
                  Evet, Sil
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ünite Silme Onay Dialogu */}
        {showDeleteModuleDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Üniteyi Sil</h3>
                  <p className="text-sm text-gray-600">Bu işlem geri alınamaz</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Bu üniteyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModuleDialog(false);
                    setModuleToDelete(null);
                  }}
                >
                  İptal
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteModule}
                >
                  Evet, Sil
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ders Silme Onay Dialogu */}
        {showDeleteLessonDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dersi Sil</h3>
                  <p className="text-sm text-gray-600">Bu işlem geri alınamaz</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Bu dersi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteLessonDialog(false);
                    setLessonToDelete(null);
                  }}
                >
                  İptal
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteLesson}
                >
                  Evet, Sil
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}