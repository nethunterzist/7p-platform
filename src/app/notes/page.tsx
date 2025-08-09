"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Heart,
  Share2,
  Download,
  Edit3,
  Trash2,
  FolderPlus,
  Calendar,
  Clock,
  Tag,
  BookOpen,
  Users,
  Archive,
  ChevronDown,
  X,
  Bold,
  Italic,
  Link2,
  List,
  Code,
  Save,
  Eye,
  MoreHorizontal,
  Star,
  Grid3X3,
  LayoutList,
  SortDesc
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  preview: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  modifiedAt: Date;
  wordCount: number;
  isShared: boolean;
  author: string;
}

interface NoteCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

// Sample data
const SAMPLE_NOTES: Note[] = [
  {
    id: '1',
    title: 'Google Ads Kampanya Kurulum Adımları',
    content: `# Google Ads Kampanya Kurulum Rehberi

## 1. Hesap Oluşturma
- Google Ads hesabı açılması
- Faturalama bilgilerinin girilmesi
- İlk kampanya hedefinin belirlenmesi

## 2. Anahtar Kelime Araştırması
- Google Keyword Planner kullanımı
- Rakip analizi
- Uzun kuyruk anahtar kelimeler

## 3. Kampanya Yapısı
- Kampanya türü seçimi (Search, Display, Video)
- Ad Group organizasyonu
- Bütçe dağılımı

## 4. Reklam Metinleri
- Başlık yazma teknikleri
- Açıklama optimizasyonu
- CTA (Call to Action) stratejileri`,
    preview: 'Google Ads hesabı oluşturma, anahtar kelime araştırması, kampanya yapılandırması ve reklam metni optimizasyonu adımları...',
    category: 'PPC',
    tags: ['google-ads', 'kampanya', 'kurulum', 'ppc'],
    isFavorite: true,
    createdAt: new Date('2025-01-04'),
    modifiedAt: new Date('2025-01-04'),
    wordCount: 156,
    isShared: false,
    author: 'Sen'
  },
  {
    id: '2',
    title: 'Ürün Araştırması İçin En İyi Araçlar',
    content: `# Ürün Araştırması Araçları

## Ücretsiz Araçlar
1. **Google Trends**
   - Trend analizi
   - Mevsimsel veriler
   - Coğrafi dağılım

2. **Amazon Best Sellers**
   - Kategori liderleri
   - Satış performansı
   - Müşteri yorumları

## Ücretli Araçlar
1. **Jungle Scout**
   - Ürün takibi
   - Satış tahmini
   - Rakip analizi

2. **Helium 10**
   - Keyword research
   - Ürün validasyonu
   - PPC optimizasyonu`,
    preview: 'E-ticaret ürün araştırması için kullanılabilecek ücretsiz ve ücretli araçların detaylı listesi ve kullanım önerileri...',
    category: 'Ürün Araştırması',
    tags: ['tools', 'research', 'amazon', 'ecommerce'],
    isFavorite: false,
    createdAt: new Date('2024-12-30'),
    modifiedAt: new Date('2025-01-02'),
    wordCount: 98,
    isShared: true,
    author: 'Sen'
  },
  {
    id: '3',
    title: 'Mentor Görüşmesi - Aksiyon Planı',
    content: `# Mentor Görüşmesi Notları
**Tarih:** 3 Ocak 2025
**Mentor:** Ahmet Yılmaz

## Görüşülen Konular
1. **PPC Kampanya Performansı**
   - Mevcut ROAS: 4.2
   - Hedef: 5.0'e çıkarma
   - Optimizasyon önerileri

2. **Ürün Portföyü Genişletme**
   - Yeni niche alanlar
   - Rekabet analizi
   - Yatırım stratejisi

## Aksiyon Planı
- [ ] Google Ads hesabında negatif keywords güncelleme
- [ ] Facebook Ads'da lookalike audience oluşturma
- [ ] Yeni ürün kategorisi için market araştırması
- [ ] A/B test planı hazırlama

## Bir Sonraki Görüşme
**Tarih:** 17 Ocak 2025
**Agenda:** Yeni kampanya sonuçları ve optimizasyonlar`,
    preview: 'Ahmet Yılmaz ile yapılan mentor görüşmesi notları, PPC performans değerlendirmesi ve aksiyon planı...',
    category: 'Mentor Notları',
    tags: ['mentor', 'meeting', 'action-plan', 'ppc'],
    isFavorite: true,
    createdAt: new Date('2025-01-03'),
    modifiedAt: new Date('2025-01-03'),
    wordCount: 184,
    isShared: false,
    author: 'Sen'
  },
  {
    id: '4',
    title: 'Facebook Pixel Kurulumu Detayları',
    content: `# Facebook Pixel Kurulum Rehberi

## 1. Pixel Oluşturma
- Facebook Ads Manager > Events Manager
- Pixel oluştur butonuna tıkla
- Website URL'ini gir

## 2. Pixel Kodunu Yerleştirme
\`\`\`javascript
<!-- Facebook Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
\`\`\`

## 3. Event Tracking
- Purchase events
- Add to Cart events
- Lead events
- Custom conversions`,
    preview: 'Facebook Pixel kurulumu, kod yerleştirme ve event tracking kurulum adımları ile örnek kodlar...',
    category: 'PPC',
    tags: ['facebook-ads', 'pixel', 'tracking', 'conversion'],
    isFavorite: false,
    createdAt: new Date('2025-01-01'),
    modifiedAt: new Date('2025-01-01'),
    wordCount: 142,
    isShared: false,
    author: 'Sen'
  },
  {
    id: '5',
    title: 'E-ticaret SEO Stratejileri',
    content: `# E-ticaret SEO Rehberi

## Teknik SEO
- Site hızı optimizasyonu
- Mobile-first indexing
- Structured data markup
- XML sitemap

## İçerik Stratejisi
- Ürün sayfası optimizasyonu
- Kategori sayfaları
- Blog içerikleri
- Kullanıcı yorumları

## Link Building
- Ürün incelemesi siteleri
- Sektör blogları
- Sosyal medya paylaşımları
- Influencer işbirlikleri`,
    preview: 'E-ticaret sitelerinde SEO optimizasyonu için teknik SEO, içerik stratejisi ve link building taktikleri...',
    category: 'Genel',
    tags: ['seo', 'ecommerce', 'optimization', 'content'],
    isFavorite: false,
    createdAt: new Date('2024-12-28'),
    modifiedAt: new Date('2024-12-29'),
    wordCount: 89,
    isShared: true,
    author: 'Sen'
  }
];

const CATEGORIES: NoteCategory[] = [
  { id: 'all', name: 'Tüm Notlar', color: 'gray', count: SAMPLE_NOTES.length },
  { id: 'PPC', name: 'PPC', color: 'blue', count: SAMPLE_NOTES.filter(n => n.category === 'PPC').length },
  { id: 'Ürün Araştırması', name: 'Ürün Araştırması', color: 'purple', count: SAMPLE_NOTES.filter(n => n.category === 'Ürün Araştırması').length },
  { id: 'Genel', name: 'Genel', color: 'green', count: SAMPLE_NOTES.filter(n => n.category === 'Genel').length },
  { id: 'Ödevler', name: 'Ödevler', color: 'orange', count: 0 },
  { id: 'Mentor Notları', name: 'Mentor Notları', color: 'red', count: SAMPLE_NOTES.filter(n => n.category === 'Mentor Notları').length }
];

// Rich Text Editor Component
interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  const insertFormatting = (prefix: string, suffix: string = '') => {
    // Simple formatting insertion - in a real app, you'd use a proper editor library
    const newContent = content + prefix + (suffix || prefix);
    onChange(newContent);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-300">
        <Button
          size="sm"
          variant={isPreview ? 'outline' : 'default'}
          onClick={() => setIsPreview(false)}
          className="h-8"
        >
          <Edit3 className="h-4 w-4 mr-1" />
          Düzenle
        </Button>
        <Button
          size="sm"
          variant={isPreview ? 'default' : 'outline'}
          onClick={() => setIsPreview(true)}
          className="h-8"
        >
          <Eye className="h-4 w-4 mr-1" />
          Önizleme
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => insertFormatting('**', '**')}
          className="h-8"
          title="Kalın"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => insertFormatting('*', '*')}
          className="h-8"
          title="İtalik"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => insertFormatting('[]()', '')}
          className="h-8"
          title="Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => insertFormatting('- ', '')}
          className="h-8"
          title="Liste"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => insertFormatting('```\n', '\n```')}
          className="h-8"
          title="Kod"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div className="min-h-[300px]">
        {isPreview ? (
          <div className="p-4 prose max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
            }} />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Notunuzu yazın...'}
            className="w-full h-[300px] p-4 border-0 resize-none focus:outline-none font-mono text-sm"
          />
        )}
      </div>
    </div>
  );
}

// Note Editor Modal
interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  onSave: (note: Partial<Note>) => void;
}

function NoteEditorModal({ isOpen, onClose, note, onSave }: NoteEditorModalProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [category, setCategory] = useState(note?.category || 'Genel');
  const [tags, setTags] = useState(note?.tags?.join(', ') || '');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category);
      setTags(note.tags.join(', '));
    } else {
      setTitle('');
      setContent('');
      setCategory('Genel');
      setTags('');
    }
  }, [note]);

  const handleSave = () => {
    const noteData = {
      title,
      content,
      category,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      preview: content.substring(0, 150) + '...',
      wordCount: content.split(' ').length,
      modifiedAt: new Date()
    };

    onSave(noteData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {note ? 'Notu Düzenle' : 'Yeni Not'}
          </h2>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex flex-col h-[calc(90vh-120px)]">
          {/* Note Metadata */}
          <div className="p-6 border-b border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Not Başlığı
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Not başlığı girin..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etiketler (virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="etiket1, etiket2, etiket3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1 p-6 overflow-auto">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Notunuzun içeriğini buraya yazın. Markdown formatını destekler..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(SAMPLE_NOTES);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'category'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Filter and sort notes
  const filteredNotes = notes
    .filter(note => {
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'date':
        default:
          return b.modifiedAt.getTime() - a.modifiedAt.getTime();
      }
    });

  // Statistics
  const stats = {
    totalNotes: notes.length,
    weeklyNotes: notes.filter(note => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return note.createdAt >= weekAgo;
    }).length,
    favoriteNotes: notes.filter(note => note.isFavorite).length,
    recentlyModified: notes.filter(note => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return note.modifiedAt >= dayAgo;
    }).length
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = (noteData: Partial<Note>) => {
    if (editingNote) {
      // Update existing note
      setNotes(prev => prev.map(note => 
        note.id === editingNote.id 
          ? { ...note, ...noteData }
          : note
      ));
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        title: noteData.title || 'Başlıksız Not',
        content: noteData.content || '',
        preview: noteData.preview || '',
        category: noteData.category || 'Genel',
        tags: noteData.tags || [],
        isFavorite: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
        wordCount: noteData.wordCount || 0,
        isShared: false,
        author: 'Sen'
      };
      setNotes(prev => [newNote, ...prev]);
    }
  };

  const handleToggleFavorite = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, isFavorite: !note.isFavorite }
        : note
    ));
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      setNotes(prev => prev.filter(note => note.id !== noteId));
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Bugün';
    if (diffDays === 2) return 'Dün';
    if (diffDays <= 7) return `${diffDays - 1} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const getCategoryColor = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.color || 'gray';
  };

  const getCategoryBadgeStyles = (color: string) => {
    const styles = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800'
    };
    return styles[color as keyof typeof styles] || styles.gray;
  };

  return (
    <DashboardLayout
      title="Notlar"
      subtitle="Kişisel notlarınız ve çalışma kayıtlarınız"
      breadcrumbs={[
        { label: 'Notlar' }
      ]}
      actions={
        <Button onClick={handleCreateNote} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Not
        </Button>
      }
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Not</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalNotes}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bu Hafta</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyNotes}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Favoriler</p>
                <p className="text-2xl font-bold text-gray-900">{stats.favoriteNotes}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Son Güncellenen</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentlyModified}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Categories & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Kategoriler</h3>
                <Button size="sm" variant="outline">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                      selectedCategory === category.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search and Controls */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Notlarda ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtrele
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Tarihe göre</option>
                  <option value="title">Başlığa göre</option>
                  <option value="category">Kategoriye göre</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Notes Grid/List */}
          {filteredNotes.length === 0 ? (
            <DashboardCard>
              <div className="p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery || selectedCategory !== 'all' ? 'Not bulunamadı' : 'Henüz notunuz yok'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Arama kriterlerinize uygun not bulunamadı.'
                    : 'İlk notunuzu oluşturmak için yukarıdaki "Yeni Not" butonuna tıklayın.'
                  }
                </p>
                {(!searchQuery && selectedCategory === 'all') && (
                  <Button onClick={handleCreateNote}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Notunu Oluştur
                  </Button>
                )}
              </div>
            </DashboardCard>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                : "space-y-4"
            )}>
              {filteredNotes.map(note => (
                <DashboardCard key={note.id} className="hover:shadow-lg transition-all">
                  <div className="p-6">
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {note.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge className={getCategoryBadgeStyles(getCategoryColor(note.category))}>
                            {note.category}
                          </Badge>
                          <span>•</span>
                          <span>{formatDate(note.modifiedAt)}</span>
                          <span>•</span>
                          <span>{note.wordCount} kelime</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleFavorite(note.id)}
                          className={cn(
                            "h-8 w-8 p-0",
                            note.isFavorite ? "text-red-500" : "text-gray-400"
                          )}
                        >
                          <Heart className={cn("h-4 w-4", note.isFavorite && "fill-current")} />
                        </Button>
                        
                        <div className="relative group">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          
                          {/* Dropdown Menu */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <div className="p-1">
                              <button
                                onClick={() => handleEditNote(note)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                              >
                                <Edit3 className="h-4 w-4" />
                                Düzenle
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                <Share2 className="h-4 w-4" />
                                Paylaş
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                <Download className="h-4 w-4" />
                                İndir
                              </button>
                              <div className="border-t border-gray-200 my-1" />
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                              >
                                <Trash2 className="h-4 w-4" />
                                Sil
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note Preview */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {note.preview}
                    </p>

                    {/* Note Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {note.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Note Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        {note.isShared && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Paylaşıldı
                          </Badge>
                        )}
                        <span>{note.author} tarafından</span>
                      </div>
                    </div>
                  </div>
                </DashboardCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-3" />
                Yeni Not Oluştur
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-3" />
                Dosyadan İçe Aktar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Archive className="h-4 w-4 mr-3" />
                Tüm Notları Yedekle
              </Button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div>
                  <p className="font-medium text-blue-900">Google Ads notunu düzenledin</p>
                  <p className="text-blue-600 text-xs">2 saat önce</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium text-green-900">Yeni mentor notu oluşturdun</p>
                  <p className="text-green-600 text-xs">1 gün önce</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <div>
                  <p className="font-medium text-purple-900">Ürün araştırması notunu paylaştın</p>
                  <p className="text-purple-600 text-xs">3 gün önce</p>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Not Şablonları</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-sm">
                <BookOpen className="h-4 w-4 mr-3" />
                Ders Notu Şablonu
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Users className="h-4 w-4 mr-3" />
                Toplantı Notları
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Star className="h-4 w-4 mr-3" />
                Proje Planlama
              </Button>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        note={editingNote}
        onSave={handleSaveNote}
      />
    </DashboardLayout>
  );
}