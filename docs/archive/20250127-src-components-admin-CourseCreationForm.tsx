'use client';

import React, { useState } from 'react';
import { useUnifiedAuth } from '@/lib/unified-auth';
import { BookOpen, Save, Eye, Clock, DollarSign, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CourseFormData {
  title: string;
  description: string;
  slug: string;
  price: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  is_published: boolean;
}

export default function CourseCreationForm() {
  const { isAdmin, user } = useUnifiedAuth();
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    slug: '',
    price: 0,
    level: 'beginner',
    duration_minutes: 0,
    is_published: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isAdmin) return null;

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[ğ]/g, 'g')
      .replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? Number(value) : value
    }));

    // Auto-generate slug from title
    if (name === 'title') {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate form
      if (!formData.title || !formData.description || !formData.slug) {
        throw new Error('Başlık, açıklama ve slug alanları zorunludur');
      }

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          instructor_id: user?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kurs oluşturulamadı');
      }

      setMessage({ 
        type: 'success', 
        text: `Kurs başarıyla oluşturuldu! ${formData.is_published ? 'Öğrenciler artık bu kursu görebilir.' : 'Yayınlamak için düzenle.'}`
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        slug: '',
        price: 0,
        level: 'beginner',
        duration_minutes: 0,
        is_published: false
      });

    } catch (error) {
      console.error('Error creating course:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Kurs oluşturulamadı'
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'advanced': return 'İleri';
      default: return level;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} dakika`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}sa ${remainingMinutes}dk` : `${hours} saat`;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <BookOpen className="h-6 w-6 mr-2" />
          Yeni Kurs Oluştur
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message */}
          {message && (
            <div className={`flex items-center p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Kurs Başlığı *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corporate-primary focus:border-corporate-primary"
                  placeholder="Örn: React ile Modern Web Geliştirme"
                />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corporate-primary focus:border-corporate-primary"
                  placeholder="react-ile-modern-web-gelistirme"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL: /courses/{formData.slug}
                </p>
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Fiyat (₺)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corporate-primary focus:border-corporate-primary"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  0 = Ücretsiz kurs
                </p>
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                  Süre (dakika)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    id="duration_minutes"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corporate-primary focus:border-corporate-primary"
                    placeholder="120"
                  />
                </div>
                {formData.duration_minutes > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ {formatDuration(formData.duration_minutes)}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corporate-primary focus:border-corporate-primary resize-none"
                  placeholder="Kurs hakkında detaylı açıklama yazın..."
                />
              </div>

              {/* Level */}
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                  Seviye
                </label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corporate-primary focus:border-corporate-primary"
                >
                  <option value="beginner">Başlangıç</option>
                  <option value="intermediate">Orta</option>
                  <option value="advanced">İleri</option>
                </select>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Hemen Yayınla</p>
                    <p className="text-sm text-gray-600">
                      {formData.is_published 
                        ? 'Öğrenciler kursu görebilecek' 
                        : 'Taslak olarak kaydet'
                      }
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-corporate-primary bg-gray-100 border-gray-300 rounded focus:ring-corporate-primary focus:ring-2"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {(formData.title || formData.description) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Önizleme
              </h3>
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">{formData.title || 'Kurs Başlığı'}</CardTitle>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      formData.level === 'beginner' ? 'text-green-600 bg-green-100' :
                      formData.level === 'intermediate' ? 'text-yellow-600 bg-yellow-100' :
                      'text-red-600 bg-red-100'
                    }`}>
                      {getLevelText(formData.level)}
                    </span>
                    {formData.duration_minutes > 0 && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDuration(formData.duration_minutes)}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    {formData.description || 'Kurs açıklaması burada görünecek...'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-corporate-primary">
                      {formData.price > 0 ? `₺${formData.price}` : 'Ücretsiz'}
                    </div>
                    <Button disabled variant="outline">
                      {formData.is_published ? 'Kayıt Ol' : 'Henüz Yayınlanmadı'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
                title: '',
                description: '',
                slug: '',
                price: 0,
                level: 'beginner',
                duration_minutes: 0,
                is_published: false
              })}
            >
              Temizle
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.description}
              className="bg-corporate-primary hover:bg-corporate-deep"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Oluşturuluyor...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  {formData.is_published ? 'Oluştur ve Yayınla' : 'Taslak Olarak Kaydet'}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}