"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  BookOpen, 
  Clock, 
  Users, 
  ChevronRight,
  Star,
  Award
} from 'lucide-react';

// 3 eğitim programı
const MAIN_COURSES = [
  {
    course_id: 'full-mentoring',
    course_title: 'Full Mentorluk Programı',
    course_description: 'Kapsamlı mentorluk süreciyle kişisel ve profesyonel gelişiminizi tamamlayın.',
    color: 'from-blue-500 to-blue-600',
    modules: 12,
    duration: '6 ay',
    price: 2999
  },
  {
    course_id: 'ppc-training',
    course_title: 'PPC Reklam Uzmanlığı',
    course_description: 'Google Ads, Facebook Ads ile profesyonel kampanyaları yönetmeyi öğrenin.',
    color: 'from-green-500 to-green-600',
    modules: 8,
    duration: '3 ay',
    price: 1799
  },
  {
    course_id: 'product-research',
    course_title: 'Ürün Araştırması Uzmanlığı',
    course_description: 'E-ticaret dünyasında başarılı ürünler keşfedin.',
    color: 'from-purple-500 to-purple-600',
    modules: 6,
    duration: '2 ay',
    price: 1299
  }
];

export default function DashboardPage() {
  console.log('🔍 DASHBOARD_PAGE: Component started');
  
  // DashboardLayout user management'ı halledecek, biz sadece content'i render ediyoruz
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Öğrenme yolculuğunuza genel bakış"
      breadcrumbs={[
        { label: 'Ana Sayfa' }
      ]}
    >
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Hoş Geldiniz! 👋
            </h1>
            <p className="text-white/90 mb-4">
              3 özel eğitim programımızla profesyonel gelişiminizi tamamlayın
            </p>
            <Button asChild className="bg-white text-blue-600 hover:bg-gray-100">
              <a href="/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Eğitimlere Göz At
              </a>
            </Button>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Panel Link - DashboardLayout'tan user prop'u gelecek şekilde ayarlanacak */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mevcut Eğitim</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Modül</p>
                <p className="text-2xl font-bold text-gray-900">26</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ortalama Süre</p>
                <p className="text-2xl font-bold text-gray-900">4 ay</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Course Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Eğitim Programları</h2>
          <Button variant="outline" asChild>
            <a href="/courses">
              Tüm Eğitimler
              <ChevronRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MAIN_COURSES.map((course) => (
            <DashboardCard key={course.course_id} className="hover:shadow-lg transition-shadow">
              <div className={`bg-gradient-to-r ${course.color} p-4 text-white rounded-t-lg`}>
                <h3 className="font-semibold mb-2">{course.course_title}</h3>
                <div className="flex items-center space-x-4 text-white/80 text-sm">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.modules} modül</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.course_description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-gray-900">
                    ₺{course.price.toLocaleString()}
                  </div>
                  <Button asChild size="sm">
                    <a href={`/courses/${course.course_id}`}>
                      Detaylar
                    </a>
                  </Button>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Hızlı Erişim</h3>
            <div className="space-y-3">
              <Button variant="outline" asChild className="w-full justify-start">
                <a href="/courses">
                  <BookOpen className="h-4 w-4 mr-3" />
                  Tüm Eğitimler
                </a>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <a href="/messages">
                  <Users className="h-4 w-4 mr-3" />
                  Mesajlar
                </a>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <a href="/profile">
                  <Award className="h-4 w-4 mr-3" />
                  Profil
                </a>
              </Button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Eğitim Programları</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">Full Mentorluk</p>
                  <p className="text-sm text-blue-600">6 ay • 12 modül</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">₺2.999</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">PPC Uzmanlığı</p>
                  <p className="text-sm text-green-600">3 ay • 8 modül</p>
                </div>
                <Badge className="bg-green-100 text-green-800">₺1.799</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="font-medium text-purple-900">Ürün Araştırması</p>  
                  <p className="text-sm text-purple-600">2 ay • 6 modül</p>
                </div>
                <Badge className="bg-purple-100 text-purple-800">₺1.299</Badge>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}