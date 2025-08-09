'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { 
  FolderOpen, 
  FileText, 
  Video, 
  Music, 
  Image, 
  Download, 
  Heart, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Upload,
  Play,
  Eye,
  Star,
  Clock,
  TrendingUp,
  Users,
  Plus,
  Share2,
  MoreVertical,
  ChevronDown
} from 'lucide-react';

// Types
interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'audio' | 'document' | 'presentation' | 'image';
  size: string;
  uploadDate: string;
  downloadCount: number;
  rating: number;
  category: string;
  isFavorite: boolean;
  progress?: number; // For video resources
  thumbnail?: string;
  description: string;
  course: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

const LibraryPage = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('library-favorites');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Sample data
  const resources: Resource[] = [
    {
      id: '1',
      name: 'PPC Kampanya Rehberi.pdf',
      type: 'pdf',
      size: '2.3 MB',
      uploadDate: '2024-01-15',
      downloadCount: 245,
      rating: 4.8,
      category: 'course-materials',
      isFavorite: favorites.includes('1'),
      description: 'Kapsamlı PPC kampanya yönetimi rehberi',
      course: 'Google Ads Mastery'
    },
    {
      id: '2',
      name: 'Google Ads Temel Eğitimi.mp4',
      type: 'video',
      size: '145 MB',
      uploadDate: '2024-01-10',
      downloadCount: 189,
      rating: 4.9,
      category: 'videos',
      isFavorite: favorites.includes('2'),
      progress: 65,
      description: 'Google Ads platformuna giriş videosu',
      course: 'Google Ads Mastery'
    },
    {
      id: '3',
      name: 'Ürün Araştırması Şablonu.xlsx',
      type: 'document',
      size: '890 KB',
      uploadDate: '2024-01-12',
      downloadCount: 156,
      rating: 4.6,
      category: 'assignments',
      isFavorite: favorites.includes('3'),
      description: 'E-ticaret ürün araştırması için hazır şablon',
      course: 'E-ticaret Stratejileri'
    },
    {
      id: '4',
      name: 'Facebook Ads Stratejileri.pptx',
      type: 'presentation',
      size: '12 MB',
      uploadDate: '2024-01-08',
      downloadCount: 203,
      rating: 4.7,
      category: 'presentations',
      isFavorite: favorites.includes('4'),
      description: 'Facebook reklamcılığı strateji sunumu',
      course: 'Social Media Marketing'
    },
    {
      id: '5',
      name: 'Mentor Görüşmesi Kayıtları.mp3',
      type: 'audio',
      size: '45 MB',
      uploadDate: '2024-01-14',
      downloadCount: 78,
      rating: 4.5,
      category: 'audio',
      isFavorite: favorites.includes('5'),
      description: 'Sektör uzmanı ile yapılan görüşme kaydı',
      course: 'Mentorship Program'
    },
    {
      id: '6',
      name: 'E-ticaret Trend Analizi 2024.pdf',
      type: 'pdf',
      size: '3.1 MB',
      uploadDate: '2024-01-13',
      downloadCount: 134,
      rating: 4.4,
      category: 'course-materials',
      isFavorite: favorites.includes('6'),
      description: '2024 yılı e-ticaret trend raporu',
      course: 'E-ticaret Stratejileri'
    },
    {
      id: '7',
      name: 'Landing Page Optimizasyonu.mp4',
      type: 'video',
      size: '89 MB',
      uploadDate: '2024-01-09',
      downloadCount: 167,
      rating: 4.6,
      category: 'videos',
      isFavorite: favorites.includes('7'),
      progress: 100,
      description: 'Yüksek dönüşüm sağlayan landing page teknikleri',
      course: 'Conversion Optimization'
    },
    {
      id: '8',
      name: 'SEO Checklist 2024.pdf',
      type: 'pdf',
      size: '1.8 MB',
      uploadDate: '2024-01-11',
      downloadCount: 298,
      rating: 4.9,
      category: 'assignments',
      isFavorite: favorites.includes('8'),
      description: 'Güncel SEO kontrol listesi',
      course: 'SEO Fundamentals'
    }
  ];

  const categories: Category[] = [
    {
      id: 'course-materials',
      name: 'Kurs Materyalleri',
      icon: <FolderOpen className="h-5 w-5" />,
      count: resources.filter(r => r.category === 'course-materials').length,
      color: 'bg-blue-500'
    },
    {
      id: 'videos',
      name: 'Videolar',
      icon: <Video className="h-5 w-5" />,
      count: resources.filter(r => r.category === 'videos').length,
      color: 'bg-red-500'
    },
    {
      id: 'audio',
      name: 'Ses Kayıtları',
      icon: <Music className="h-5 w-5" />,
      count: resources.filter(r => r.category === 'audio').length,
      color: 'bg-purple-500'
    },
    {
      id: 'presentations',
      name: 'Sunumlar',
      icon: <Image className="h-5 w-5" />,
      count: resources.filter(r => r.category === 'presentations').length,
      color: 'bg-orange-500'
    },
    {
      id: 'assignments',
      name: 'Ödevler ve Çözümler',
      icon: <FileText className="h-5 w-5" />,
      count: resources.filter(r => r.category === 'assignments').length,
      color: 'bg-green-500'
    }
  ];

  // Computed values
  const stats = {
    totalResources: resources.length,
    downloadedItems: resources.filter(r => r.progress === 100).length,
    favoriteResources: favorites.length,
    totalDownloads: resources.reduce((sum, r) => sum + r.downloadCount, 0)
  };

  // Filtered and sorted resources
  const filteredResources = useMemo(() => {
    let filtered = resources.filter(resource => {
      const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          resource.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || resource.type === selectedType;
      const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
      
      return matchesSearch && matchesType && matchesCategory;
    });

    // Sort resources
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return parseFloat(a.size) - parseFloat(b.size);
        case 'downloads':
          return b.downloadCount - a.downloadCount;
        case 'rating':
          return b.rating - a.rating;
        case 'date':
        default:
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      }
    });

    return filtered;
  }, [resources, searchTerm, selectedType, selectedCategory, sortBy]);

  // Helper functions
  const getFileIcon = (type: string, size: string = 'h-6 w-6') => {
    const iconClass = `${size} text-gray-600`;
    switch (type) {
      case 'pdf':
        return <FileText className={`${iconClass} text-red-600`} />;
      case 'video':
        return <Video className={`${iconClass} text-blue-600`} />;
      case 'audio':
        return <Music className={`${iconClass} text-purple-600`} />;
      case 'document':
        return <FileText className={`${iconClass} text-green-600`} />;
      case 'presentation':
        return <Image className={`${iconClass} text-orange-600`} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const toggleFavorite = (resourceId: string) => {
    const newFavorites = favorites.includes(resourceId)
      ? favorites.filter(id => id !== resourceId)
      : [...favorites, resourceId];
    
    setFavorites(newFavorites);
    localStorage.setItem('library-favorites', JSON.stringify(newFavorites));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getMostDownloaded = () => {
    return resources
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 3);
  };

  const getRecentlyAdded = () => {
    return resources
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
      .slice(0, 3);
  };

  const getFavoriteResources = () => {
    return resources.filter(r => favorites.includes(r.id));
  };

  return (
    <DashboardLayout title="Kütüphane" subtitle="Kurs materyalleri ve kaynaklarınız">
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Toplam Kaynak"
            value={stats.totalResources.toString()}
            icon={<FolderOpen className="h-6 w-6 text-blue-500" />}
            trend={{ value: 12, isPositive: true }}
          />
          <DashboardCard
            title="İndirilmiş Öğeler"
            value={stats.downloadedItems.toString()}
            icon={<Download className="h-6 w-6 text-green-500" />}
            trend={{ value: 8, isPositive: true }}
          />
          <DashboardCard
            title="Favorilerim"
            value={stats.favoriteResources.toString()}
            icon={<Heart className="h-6 w-6 text-red-500" />}
          />
          <DashboardCard
            title="Toplam İndirme"
            value={stats.totalDownloads.toLocaleString()}
            icon={<TrendingUp className="h-6 w-6 text-purple-500" />}
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Dosya adı veya içerikte ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-5 w-5" />
              Filtreler
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dosya Türü</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tüm türler</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="audio">Ses</option>
                  <option value="document">Döküman</option>
                  <option value="presentation">Sunum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tüm kategoriler</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sırala</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Tarih</option>
                  <option value="name">İsim</option>
                  <option value="size">Boyut</option>
                  <option value="downloads">İndirme sayısı</option>
                  <option value="rating">Değerlendirme</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Kategoriler</h3>
              </div>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${category.color} text-white`}>
                        {category.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{category.name}</div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Upload className="h-5 w-5 text-blue-500" />
                  <span>Dosya Yükle</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Plus className="h-5 w-5 text-green-500" />
                  <span>Klasör Oluştur</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Download className="h-5 w-5 text-purple-500" />
                  <span>Toplu İndirme</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Share2 className="h-5 w-5 text-orange-500" />
                  <span>Kaynak Paylaş</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Featured Resources */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Most Downloaded */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900">En Çok İndirilenler</h3>
                </div>
                <div className="space-y-3">
                  {getMostDownloaded().map(resource => (
                    <div key={resource.id} className="flex items-center gap-3">
                      {getFileIcon(resource.type, 'h-4 w-4')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{resource.name}</p>
                        <p className="text-xs text-gray-500">{resource.downloadCount} indirme</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recently Added */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Yeni Eklenenler</h3>
                </div>
                <div className="space-y-3">
                  {getRecentlyAdded().map(resource => (
                    <div key={resource.id} className="flex items-center gap-3">
                      {getFileIcon(resource.type, 'h-4 w-4')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{resource.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(resource.uploadDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Favorites */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900">Favorilerim</h3>
                </div>
                <div className="space-y-3">
                  {getFavoriteResources().slice(0, 3).map(resource => (
                    <div key={resource.id} className="flex items-center gap-3">
                      {getFileIcon(resource.type, 'h-4 w-4')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{resource.name}</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-500">{resource.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getFavoriteResources().length === 0 && (
                    <p className="text-sm text-gray-500">Henüz favori eklemediniz</p>
                  )}
                </div>
              </div>
            </div>

            {/* Resources Grid/List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Kaynaklar ({filteredResources.length})
                </h3>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredResources.map(resource => (
                    <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getFileIcon(resource.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{resource.name}</h4>
                            <p className="text-sm text-gray-500">{resource.course}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFavorite(resource.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Heart className={`h-4 w-4 ${favorites.includes(resource.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                        </button>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>

                      {resource.progress !== undefined && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>İlerleme</span>
                            <span>{resource.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${resource.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>{resource.size}</span>
                        <span>{formatDate(resource.uploadDate)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{resource.rating}</span>
                          <span className="text-xs text-gray-500">({resource.downloadCount})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResources.map(resource => (
                    <div key={resource.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      {getFileIcon(resource.type)}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{resource.name}</h4>
                        <p className="text-sm text-gray-500">{resource.description}</p>
                      </div>

                      <div className="hidden md:block text-sm text-gray-500">
                        {resource.course}
                      </div>

                      <div className="hidden md:block text-sm text-gray-500">
                        {resource.size}
                      </div>

                      <div className="hidden md:block text-sm text-gray-500">
                        {formatDate(resource.uploadDate)}
                      </div>

                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">{resource.rating}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(resource.id)}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Heart className={`h-4 w-4 ${favorites.includes(resource.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredResources.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Kaynak bulunamadı</h3>
                  <p className="text-gray-500">Arama kriterlerinizi değiştirmeyi deneyin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LibraryPage;