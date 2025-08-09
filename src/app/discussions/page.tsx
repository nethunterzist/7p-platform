'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardContent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  MessageSquare,
  Users,
  TrendingUp,
  Search,
  Tag,
  Pin,
  Lock,
  Heart,
  Reply,
  Eye,
  Plus,
  Filter,
  Clock,
  Star,
  ThumbsUp,
  MessageCircle,
  ChevronRight,
  Award,
  Activity
} from 'lucide-react'

interface Topic {
  id: number
  title: string
  description: string
  author: {
    name: string
    avatar: string
    role: string
  }
  category: string
  tags: string[]
  replies: number
  views: number
  lastActivity: string
  isPinned: boolean
  isLocked: boolean
  likes: number
  hasNewReplies: boolean
}

interface Category {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  topicsCount: number
  color: string
}

interface ForumStats {
  totalTopics: number
  totalReplies: number
  activeMembers: number
  yourContributions: number
}

const DiscussionsPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isNewTopicOpen, setIsNewTopicOpen] = useState(false)

  const forumStats: ForumStats = {
    totalTopics: 1247,
    totalReplies: 8932,
    activeMembers: 156,
    yourContributions: 23
  }

  const categories: Category[] = [
    {
      id: 'general',
      name: 'Genel Tartışmalar',
      description: 'E-ticaret ve dijital pazarlama üzerine genel sohbetler',
      icon: <MessageSquare className="w-5 h-5" />,
      topicsCount: 342,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'ppc',
      name: 'PPC & Reklamcılık',
      description: 'Google Ads, Facebook Ads ve diğer reklam platformları',
      icon: <TrendingUp className="w-5 h-5" />,
      topicsCount: 298,
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'research',
      name: 'Ürün Araştırması',
      description: 'Trend ürünler, pazar analizi ve ürün seçimi',
      icon: <Search className="w-5 h-5" />,
      topicsCount: 187,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'support',
      name: 'Teknik Destek',
      description: 'Platform kullanımı ve teknik sorunlar',
      icon: <Users className="w-5 h-5" />,
      topicsCount: 156,
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'success',
      name: 'Başarı Hikayeleri',
      description: 'Başarılı kampanyalar ve deneyimler',
      icon: <Award className="w-5 h-5" />,
      topicsCount: 89,
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'announcements',
      name: 'Duyurular',
      description: 'Platform duyuruları ve güncellemeler',
      icon: <Star className="w-5 h-5" />,
      topicsCount: 45,
      color: 'bg-red-100 text-red-800'
    }
  ]

  const recentTopics: Topic[] = [
    {
      id: 1,
      title: 'Google Ads bütçe optimizasyonu için önerileriniz?',
      description: 'Günlük 500₺ bütçe ile çalışıyorum ama CPM\'ler çok yüksek geliyor. Hangi stratejileri uygulayabilirim?',
      author: {
        name: 'Ahmet Kaya',
        avatar: '/avatars/ahmet.jpg',
        role: 'Premium Üye'
      },
      category: 'PPC & Reklamcılık',
      tags: ['google-ads', 'bütçe', 'optimizasyon'],
      replies: 12,
      views: 234,
      lastActivity: '2 saat önce',
      isPinned: false,
      isLocked: false,
      likes: 8,
      hasNewReplies: true
    },
    {
      id: 2,
      title: 'Dropshipping\'de en iyi ürün araştırma araçları',
      description: 'Hangi araçları kullanarak trend ürünleri buluyorsunuz? Ücretsiz alternatifleri var mı?',
      author: {
        name: 'Elif Yılmaz',
        avatar: '/avatars/elif.jpg',
        role: 'Yeni Üye'
      },
      category: 'Ürün Araştırması',
      tags: ['dropshipping', 'araçlar', 'trend'],
      replies: 8,
      views: 156,
      lastActivity: '5 saat önce',
      isPinned: true,
      isLocked: false,
      likes: 15,
      hasNewReplies: false
    },
    {
      id: 3,
      title: 'Facebook Ads CPM\'im çok yüksek, ne yapabilirim?',
      description: 'Son bir haftadır CPM\'ler 15₺ civarında seyrediyor. Normal mi bu durum?',
      author: {
        name: 'Mehmet Özkan',
        avatar: '/avatars/mehmet.jpg',
        role: 'Premium Üye'
      },
      category: 'PPC & Reklamcılık',
      tags: ['facebook-ads', 'cpm', 'sorun'],
      replies: 15,
      views: 387,
      lastActivity: '1 gün önce',
      isPinned: false,
      isLocked: false,
      likes: 6,
      hasNewReplies: true
    },
    {
      id: 4,
      title: 'Mentor görüşmesi sonrası değerlendirmem',
      description: 'İlk mentor görüşmemi tamamladım. Deneyimimi paylaşmak istedim.',
      author: {
        name: 'Zeynep Kara',
        avatar: '/avatars/zeynep.jpg',
        role: 'Premium Üye'
      },
      category: 'Başarı Hikayeleri',
      tags: ['mentor', 'deneyim', 'başarı'],
      replies: 3,
      views: 89,
      lastActivity: '3 gün önce',
      isPinned: false,
      isLocked: false,
      likes: 12,
      hasNewReplies: false
    },
    {
      id: 5,
      title: 'Yeni güncelleme hakkında',
      description: 'Platform\'da yapılan son güncellemeler ve yeni özellikler hakkında bilgi.',
      author: {
        name: '7P Ekibi',
        avatar: '/avatars/admin.jpg',
        role: 'Yönetici'
      },
      category: 'Duyurular',
      tags: ['güncelleme', 'yenilik', 'duyuru'],
      replies: 28,
      views: 892,
      lastActivity: '5 gün önce',
      isPinned: true,
      isLocked: true,
      likes: 45,
      hasNewReplies: false
    }
  ]

  const topContributors = [
    { name: 'Ahmet Kaya', contributions: 47, avatar: '/avatars/ahmet.jpg' },
    { name: 'Elif Yılmaz', contributions: 32, avatar: '/avatars/elif.jpg' },
    { name: 'Mehmet Özkan', contributions: 28, avatar: '/avatars/mehmet.jpg' },
    { name: 'Zeynep Kara', contributions: 21, avatar: '/avatars/zeynep.jpg' }
  ]

  const filteredTopics = recentTopics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || topic.category === categories.find(cat => cat.id === selectedCategory)?.name
    return matchesSearch && matchesCategory
  })

  return (
    <DashboardLayout 
      title="Tartışmalar" 
      subtitle="Topluluk forumları ve soru-cevap alanı"
    >
      <div className="space-y-8">
        {/* Forum Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Konu</p>
                <p className="text-2xl font-bold text-gray-900">{forumStats.totalTopics.toLocaleString()}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Reply className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Yanıt</p>
                <p className="text-2xl font-bold text-gray-900">{forumStats.totalReplies.toLocaleString()}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bugün Aktif</p>
                <p className="text-2xl font-bold text-gray-900">{forumStats.activeMembers}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Katkılarınız</p>
                <p className="text-2xl font-bold text-gray-900">{forumStats.yourContributions}</p>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Search and Actions */}
        <DashboardCard className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-4 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tartışmalarda ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-48"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <Dialog open={isNewTopicOpen} onOpenChange={setIsNewTopicOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Yeni Tartışma
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Yeni Tartışma Başlat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Başlık
                    </label>
                    <Input placeholder="Tartışma başlığını yazın..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Kategori
                    </label>
                    <Select placeholder="Kategori seçin">
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      İçerik
                    </label>
                    <Textarea 
                      placeholder="Tartışmanızı detaylı olarak açıklayın..."
                      rows={6}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Etiketler
                    </label>
                    <Input placeholder="Etiketleri virgülle ayırın (örn: google-ads, bütçe, optimizasyon)" />
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={() => setIsNewTopicOpen(false)}>
                      İptal
                    </Button>
                    <Button onClick={() => setIsNewTopicOpen(false)}>
                      Tartışmayı Yayınla
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </DashboardCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Categories */}
            <DashboardCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategoriler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(category => (
                  <div
                    key={category.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          {category.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.topicsCount} konu</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>

            {/* Recent Topics */}
            <DashboardCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Tartışmalar</h3>
              <div className="space-y-4">
                {filteredTopics.map(topic => (
                  <div
                    key={topic.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {topic.isPinned && (
                            <Pin className="w-4 h-4 text-blue-600" />
                          )}
                          {topic.isLocked && (
                            <Lock className="w-4 h-4 text-gray-600" />
                          )}
                          <h4 className="font-medium text-gray-900 hover:text-blue-600">
                            {topic.title}
                          </h4>
                          {topic.hasNewReplies && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={topic.author.avatar} />
                              <AvatarFallback>{topic.author.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{topic.author.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {topic.author.role}
                            </Badge>
                          </div>
                          <span>•</span>
                          <Badge className={categories.find(cat => cat.name === topic.category)?.color}>
                            {topic.category}
                          </Badge>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {topic.lastActivity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {topic.likes}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {topic.replies} yanıt
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {topic.views} görüntüleme
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {topic.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Discussions */}
            <DashboardCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trend Tartışmalar
              </h3>
              <div className="space-y-3">
                {recentTopics.slice(0, 3).map(topic => (
                  <div key={`trending-${topic.id}`} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                      {topic.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{topic.replies} yanıt</span>
                      <span>{topic.lastActivity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            {/* Top Contributors */}
            <DashboardCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                En Aktif Üyeler
              </h3>
              <div className="space-y-3">
                {topContributors.map((contributor, index) => (
                  <div key={contributor.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-medium text-gray-500 w-4">
                        {index + 1}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={contributor.avatar} />
                        <AvatarFallback>{contributor.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm text-gray-900">
                        {contributor.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {contributor.contributions} katkı
                    </Badge>
                  </div>
                ))}
              </div>
            </DashboardCard>

            {/* Quick Actions */}
            <DashboardCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Soru Sor
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Tag className="w-4 h-4 mr-2" />
                  Etiketlere Göz At
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Gelişmiş Arama
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Activity className="w-4 h-4 mr-2" />
                  Son Aktiviteler
                </Button>
              </div>
            </DashboardCard>

            {/* Community Stats */}
            <DashboardCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Topluluk İstatistikleri</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Bu hafta yeni konular</span>
                  <span className="font-medium text-gray-900">47</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">En çok beğenilen yanıt</span>
                  <span className="font-medium text-gray-900">89 beğeni</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Çözülen sorunlar</span>
                  <span className="font-medium text-gray-900">156</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Yeni üye katılımı</span>
                  <span className="font-medium text-gray-900">23</span>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DiscussionsPage