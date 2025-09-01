"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStorageJson } from '@/utils/clientStorage';
import { useAdmin } from '@/lib/useAdmin';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Save,
  ArrowLeft,
  Trash2,
  Edit,
  BookOpen,
  Video,
  FileText,
  Upload,
  File,
  Table,
  Link,
  FileIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface NewLesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'quiz';
  videoUrl?: string;
  duration?: number;
  materials?: {
    id: string;
    name: string;
    url: string;
    type: 'pdf' | 'excel' | 'link' | 'document';
  }[];
  order: number;
}

interface NewModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: NewLesson[];
}

interface NewCourse {
  title: string;
  description: string;
  status: 'active' | 'draft';
  thumbnail_url?: string;
  modules: NewModule[];
  pricing: {
    type: 'free' | 'paid';
    price?: number;
    discountedPrice?: number;
  };
}

export default function NewCoursePage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [course, setCourse] = useState<NewCourse>({
    title: '',
    description: '',
    status: 'draft',
    modules: [],
    pricing: {
      type: 'free'
    }
  });
  
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [isAddingLesson, setIsAddingLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
  
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: ''
  });
  
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'quiz',
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

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    router.push('/dashboard');
    return null;
  }

  const handleAddModule = () => {
    if (!moduleForm.title.trim()) {
      toast.error('Modül adı gerekli');
      return;
    }

    const newModule: NewModule = {
      id: `module-${Date.now()}`,
      title: moduleForm.title,
      description: moduleForm.description,
      order: course.modules.length + 1,
      lessons: []
    };

    setCourse(prev => ({
      ...prev,
      modules: [...prev.modules, newModule]
    }));

    setModuleForm({ title: '', description: '' });
    setIsAddingModule(false);
    toast.success('Modül eklendi');
  };

  const handleEditModule = (moduleId: string) => {
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
      toast.error('Modül adı gerekli');
      return;
    }

    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(m => 
        m.id === editingModule 
          ? { ...m, title: moduleForm.title, description: moduleForm.description }
          : m
      )
    }));

    setModuleForm({ title: '', description: '' });
    setEditingModule(null);
    toast.success('Modül güncellendi');
  };

  const handleDeleteModule = (moduleId: string) => {
    setModuleToDelete(moduleId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteModule = () => {
    if (moduleToDelete) {
      setCourse(prev => ({
        ...prev,
        modules: prev.modules.filter(m => m.id !== moduleToDelete)
      }));
      toast.success('Ünite silindi');
      setShowDeleteDialog(false);
      setModuleToDelete(null);
    }
  };

  const cancelDeleteModule = () => {
    setShowDeleteDialog(false);
    setModuleToDelete(null);
  };

  const handleAddLesson = (moduleId: string) => {
    if (!lessonForm.title.trim()) {
      toast.error('İçerik başlığı gerekli');
      return;
    }

    const module = course.modules.find(m => m.id === moduleId);
    if (!module) return;

    const newLesson: NewLesson = {
      id: `lesson-${Date.now()}`,
      title: lessonForm.title,
      description: lessonForm.description,
      type: lessonForm.type,
      videoUrl: lessonForm.type === 'video' ? lessonForm.videoUrl : undefined,
      duration: lessonForm.type === 'video' ? lessonForm.duration : undefined,
      materials: lessonForm.type === 'video' ? lessonForm.materials : undefined,
      order: (module.lessons?.length || 0) + 1
    };

    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: [...(m.lessons || []), newLesson] }
          : m
      )
    }));

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
    toast.success('İçerik eklendi');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMaterialForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, '') // Auto-fill name if empty
      }));
    }
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setThumbnailFile(file);
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          setThumbnailPreview(e.target?.result as string);
          // Convert to base64 URL for storage
          setCourse(prev => ({ ...prev, thumbnail_url: e.target?.result as string }));
        };
        reader.readAsDataURL(file);
        
        toast.success('Kapak fotoğrafı yüklendi');
      } else {
        toast.error('Lütfen geçerli bir resim dosyası seçin (JPG, PNG, etc.)');
      }
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    setCourse(prev => ({ ...prev, thumbnail_url: undefined }));
    toast.success('Kapak fotoğrafı kaldırıldı');
  };

  const handleAddMaterial = () => {
    // Validation based on type
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

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) return;
    
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: (m.lessons || []).filter(l => l.id !== lessonId) }
          : m
      )
    }));
    toast.success('İçerik silindi');
  };

  const handleSaveCourse = () => {
    if (!course.title.trim()) {
      toast.error('Kurs adı gerekli');
      return;
    }

    if (course.modules.length === 0) {
      toast.error('En az bir ünite (modül) eklemelisiniz');
      return;
    }

    // Fiyatlandırma validasyonu
    if (course.pricing.type === 'paid') {
      if (!course.pricing.price || course.pricing.price <= 0) {
        toast.error('Ücretli kurslar için satış fiyatı belirtilmelidir');
        return;
      }

      if (course.pricing.discountedPrice && course.pricing.discountedPrice >= course.pricing.price) {
        toast.error('İndirimli fiyat, normal fiyattan düşük olmalıdır');
        return;
      }

      if (course.pricing.discountedPrice && course.pricing.discountedPrice <= 0) {
        toast.error('İndirimli fiyat 0\'dan büyük olmalıdır');
        return;
      }
    }

    // Mock save - generate course ID
    const courseId = course.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    // Store course data in localStorage for demo
    const courseData = {
      ...course,
      id: courseId,
      modules: course.modules.map(module => ({
        ...module,
        lessons: [] // Start with empty lessons
      }))
    };
    
    setStorageJson(`course_${courseId}`, courseData);
    
    console.log('Saving course:', courseData);
    toast.success('Kurs başarıyla oluşturuldu! Şimdi ünitelere içerik ekleyebilirsiniz.');
    
    // Redirect to course detail page to add content
    router.push(`/admin/courses/${courseId}`);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4 text-green-600" />;
      case 'quiz': return <FileText className="h-4 w-4 text-purple-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLessonTypeName = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'quiz': return 'Quiz';
      default: return 'İçerik';
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
      title="Yeni Kurs Oluştur"
      subtitle="Kurs bilgilerini girin ve üniteleri oluşturun"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            İptal
          </Button>
          <Button onClick={handleSaveCourse}>
            <Save className="h-4 w-4 mr-2" />
            Kursu Kaydet
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Kurs Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Kurs Bilgileri</CardTitle>
            <CardDescription>Temel kurs bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kurs Adı *</label>
              <Input
                placeholder="Örn: Amazon FBA Masterclass"
                value={course.title}
                onChange={(e) => setCourse(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Kurs Açıklaması</label>
              <Textarea
                placeholder="Bu kursta öğrenciler hangi konuları öğrenecek?"
                rows={3}
                value={course.description}
                onChange={(e) => setCourse(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Durum</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={course.status}
                onChange={(e) => setCourse(prev => ({ 
                  ...prev, 
                  status: e.target.value as 'active' | 'draft' 
                }))}
              >
                <option value="draft">Taslak</option>
                <option value="active">Aktif</option>
              </select>
            </div>

            {/* Fiyatlandırma */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Fiyatlandırma</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kurs Tipi *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={course.pricing.type}
                    onChange={(e) => setCourse(prev => ({ 
                      ...prev, 
                      pricing: { 
                        ...prev.pricing, 
                        type: e.target.value as 'free' | 'paid',
                        ...(e.target.value === 'free' ? { price: undefined, discountedPrice: undefined } : {})
                      } 
                    }))}
                  >
                    <option value="free">Ücretsiz</option>
                    <option value="paid">Ücretli</option>
                  </select>
                </div>

                {course.pricing.type === 'paid' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Satış Fiyatı (₺) *</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="499.99"
                          value={course.pricing.price || ''}
                          onChange={(e) => setCourse(prev => ({ 
                            ...prev, 
                            pricing: { 
                              ...prev.pricing, 
                              price: e.target.value ? parseFloat(e.target.value) : undefined 
                            } 
                          }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">İndirimli Fiyat (₺)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="299.99"
                          value={course.pricing.discountedPrice || ''}
                          onChange={(e) => setCourse(prev => ({ 
                            ...prev, 
                            pricing: { 
                              ...prev.pricing, 
                              discountedPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                            } 
                          }))}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Boş bırakılırsa indirim uygulanmaz
                        </p>
                      </div>
                    </div>

                    {course.pricing.price && course.pricing.discountedPrice && course.pricing.discountedPrice >= course.pricing.price && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ İndirimli fiyat, normal fiyattan düşük olmalıdır.
                        </p>
                      </div>
                    )}

                    {course.pricing.price && course.pricing.discountedPrice && course.pricing.discountedPrice < course.pricing.price && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✅ İndirim oranı: %{Math.round(((course.pricing.price - course.pricing.discountedPrice) / course.pricing.price) * 100)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Course Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Kurs Kapak Fotoğrafı</label>
              <div className="space-y-4">
                {thumbnailPreview ? (
                  <div className="relative inline-block">
                    <div className="w-48 h-32 rounded-lg border-2 border-gray-200 overflow-hidden">
                      <img 
                        src={thumbnailPreview} 
                        alt="Kurs kapağı önizlemesi"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeThumbnail}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 border-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Kapak fotoğrafı yükle</p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('thumbnail-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {thumbnailPreview ? 'Değiştir' : 'Fotoğraf Seç'}
                  </Button>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                  />
                </div>
                
                <p className="text-xs text-gray-500">
                  Önerilen boyut: 16:9 en boy oranı (örn: 1920x1080px). Maksimum 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Üniteler (Modüller) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Kurs Üniteleri</CardTitle>
                <CardDescription>Kursunuzun ana ünite başlıklarını oluşturun (Ör: Giriş, İleri Seviye, Pratik Uygulamalar)</CardDescription>
              </div>
              <Button onClick={() => setIsAddingModule(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ünite Ekle
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Modül Ekleme/Düzenleme Formu */}
            {(isAddingModule || editingModule) && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
                <h4 className="font-medium">
                  {editingModule ? 'Üniteyi Düzenle' : 'Yeni Ünite Ekle'}
                </h4>
                
                <Input
                  placeholder="Ünite adı (Örn: Giriş ve Temel Bilgiler, İleri Seviye Stratejiler)"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                />
                
                <Textarea
                  placeholder="Bu ünitede hangi konular işlenecek? (Bu üniteye daha sonra video, quiz ve materyal ekleyeceksiniz)"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                />
                
                <div className="flex gap-2">
                  <Button onClick={editingModule ? handleUpdateModule : handleAddModule}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingModule ? 'Güncelle' : 'Ekle'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingModule(false);
                      setEditingModule(null);
                      setModuleForm({ title: '', description: '' });
                    }}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            )}

            {/* Modül Listesi */}
            <div className="space-y-3">
              {course.modules.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz ünite yok</h3>
                  <p className="text-gray-500 mb-4">
                    Kursunuza ünite eklemek için "Ünite Ekle" butonunu kullanın. Her üniteye daha sonra video, quiz ve materyal ekleyeceksiniz.
                  </p>
                </div>
              ) : (
                course.modules.map((module, index) => (
                  <div key={module.id} className="border rounded-lg overflow-hidden">
                    {/* Ünite Başlığı */}
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">Ünite {index + 1}</Badge>
                          <h4 className="font-medium">{module.title}</h4>
                        </div>
                        {module.description && (
                          <p className="text-sm text-gray-600">{module.description}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {module.lessons?.length || 0} içerik
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddingLesson(module.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          İçerik
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

                    {/* İçerik Ekleme Formu */}
                    {isAddingLesson === module.id && (
                      <div className="p-4 bg-blue-50 border-t space-y-4">
                        <h5 className="font-medium text-blue-900">"{module.title}" İçerik Ekle</h5>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="İçerik başlığı"
                            value={lessonForm.title}
                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                          />
                          <select
                            className="px-3 py-2 border rounded-md bg-white"
                            value={lessonForm.type}
                            onChange={(e) => setLessonForm(prev => ({ 
                              ...prev, 
                              type: e.target.value as 'video' | 'quiz' 
                            }))}
                          >
                            <option value="video">Video Dersi</option>
                            <option value="quiz">Quiz/Test</option>
                          </select>
                        </div>
                        
                        <Textarea
                          placeholder="İçerik açıklaması"
                          value={lessonForm.description}
                          onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                        
                        {lessonForm.type === 'video' && (
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
                        )}
                        
                        <div className="flex gap-2">
                          <Button onClick={() => handleAddLesson(module.id)}>
                            <Save className="h-4 w-4 mr-2" />
                            Ekle
                          </Button>
                          <Button variant="outline" onClick={() => setIsAddingLesson(null)}>
                            İptal
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* İçerik Listesi */}
                    {(module.lessons?.length || 0) > 0 && (
                      <div className="p-4 border-t space-y-2">
                        {(module.lessons || []).map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getLessonIcon(lesson.type)}
                                <div>
                                  <span className="text-sm font-medium">{lesson.title}</span>
                                  <div className="text-xs text-gray-500">
                                    {getLessonTypeName(lesson.type)}
                                    {lesson.duration && ` • ${lesson.duration} dk`}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLesson(module.id, lesson.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Video materyalleri */}
                            {lesson.type === 'video' && lesson.materials && lesson.materials.length > 0 && (
                              <div className="ml-6 pl-4 border-l-2 border-orange-200">
                                <p className="text-xs font-medium text-orange-800 mb-1">Materyaller:</p>
                                <div className="space-y-1">
                                  {lesson.materials.map((material) => (
                                    <div key={material.id} className="flex items-center gap-2 text-xs text-gray-600">
                                      <span>{getMaterialIcon(material.type)}</span>
                                      <span>{material.name}</span>
                                      <span className="text-gray-400">({material.type})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kaydet Uyarısı */}
        {course.modules.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">Kursu Kaydet</h3>
                  <p className="text-sm text-green-700">
                    {course.modules.length} ünite eklendi. Kursu kaydedin, sonra her üniteye video/materyal ekleyin.
                  </p>
                </div>
                <Button onClick={handleSaveCourse}>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Silme Onay Dialog'u */}
      {showDeleteDialog && (
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
              Bu üniteyi silmek istediğinizden emin misiniz? 
              Ünite içindeki tüm videolar ve materyaller de silinecektir.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={cancelDeleteModule}
              >
                Hayır
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
    </DashboardLayout>
  );
}