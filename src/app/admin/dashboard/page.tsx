"use client";

import React, { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardStats, DashboardSection, DashboardCard, DashboardGrid } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  BookOpen,
  TrendingUp,
  Shield,
  Activity,
  DollarSign,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  FileText,
  Database,
  Settings,
  BarChart3,
  Eye
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  completionRate: number;
  revenue: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'course_completion' | 'enrollment' | 'system_alert';
  message: string;
  timestamp: string;
  user?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalEnrollments: 0,
    completionRate: 0,
    revenue: 0,
    systemHealth: 'healthy'
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin, adminLoading, router]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Mock data instead of Supabase queries
      const mockUsers = [
        { id: '1', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }, // 2 days ago
        { id: '2', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }, // 5 days ago
        { id: '3', created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
        { id: '4', created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }, // 15 days ago
        { id: '5', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }, // 30 days ago
      ];

      const mockCourses = [
        { id: '1', name: 'React Temelleri', is_published: true },
        { id: '2', name: 'JavaScript İleri Seviye', is_published: true },
        { id: '3', name: 'Node.js Backend', is_published: true },
        { id: '4', name: 'Database Design', is_published: false },
        { id: '5', name: 'UI/UX Tasarım', is_published: true },
      ];

      const mockEnrollments = [
        { id: '1', status: 'completed', enrolled_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '2', status: 'in_progress', enrolled_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '3', status: 'completed', enrolled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '4', status: 'in_progress', enrolled_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '5', status: 'completed', enrolled_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '6', status: 'completed', enrolled_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '7', status: 'in_progress', enrolled_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '8', status: 'completed', enrolled_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      // Calculate stats from mock data
      const totalUsers = mockUsers.length;
      const activeUsers = mockUsers.filter(u => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        return new Date(u.created_at) > lastWeek;
      }).length;

      const totalCourses = mockCourses.length;
      const activeCourses = mockCourses.filter(c => c.is_published).length;
      const totalEnrollments = mockEnrollments.length;
      const completedEnrollments = mockEnrollments.filter(e => e.status === 'completed').length;
      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

      setStats({
        totalUsers,
        activeUsers,
        totalCourses,
        activeCourses,
        totalEnrollments,
        completionRate,
        revenue: 12450, // Mock data
        systemHealth: 'healthy'
      });

      // Generate mock recent activity
      setRecentActivity([
        {
          id: '1',
          type: 'user_registration',
          message: 'Yeni kullanıcı kaydoldu',
          timestamp: new Date().toISOString(),
          user: 'john.doe@example.com'
        },
        {
          id: '2',
          type: 'course_completion',
          message: '"React Temelleri" kursu tamamlandı',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'jane.smith@example.com'
        },
        {
          id: '3',
          type: 'enrollment',
          message: '"İleri JavaScript" kursuna yeni kayıt',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          user: 'mike.wilson@example.com'
        },
        {
          id: '4',
          type: 'system_alert',
          message: 'Sistem yedeklemesi başarıyla tamamlandı',
          timestamp: new Date(Date.now() - 10800000).toISOString()
        }
      ]);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="h-4 w-4 text-corporate-primary" />;
      case 'course_completion':
        return <Award className="h-4 w-4 text-success-600" />;
      case 'enrollment':
        return <BookOpen className="h-4 w-4 text-warning-600" />;
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4 text-error-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-corporate-50 to-corporate-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-corporate-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-corporate-primary rounded-full animate-spin border-t-transparent"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-corporate-deep">Yönetici Paneli Yükleniyor</h3>
              <p className="text-corporate-600">Sistem özeti hazırlanıyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Yönetici Paneli"
      subtitle="Sistem özeti ve yönetim araçları"
      actions={
        <div className="flex space-x-3">
          <Button asChild>
            <a href="/admin/users">
              <Users className="h-4 w-4 mr-2" />
              Kullanıcıları Yönet
            </a>
          </Button>
        </div>
      }
    >
      {/* System Status Alert */}
      <DashboardCard className="mb-6 border-l-4 border-l-success-500 bg-success-50">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-success-600" />
          <div>
            <h3 className="font-medium text-success-900">Sistem Durumu: Çalışıyor</h3>
            <p className="text-sm text-success-700">Tüm sistemler normal çalışıyor. Son yedekleme: 2 saat önce</p>
          </div>
        </div>
      </DashboardCard>

      {/* Key Metrics */}
      <DashboardStats
        stats={[
          {
            label: "Toplam Kullanıcılar",
            value: stats.totalUsers,
            change: `+${stats.activeUsers} this week`,
            changeType: "positive",
            icon: Users
          },
          {
            label: "Aktif Kurslar",
            value: stats.activeCourses,
            change: `${stats.totalCourses} total`,
            changeType: "neutral",
            icon: BookOpen
          },
          {
            label: "Kayıtlar",
            value: stats.totalEnrollments,
            change: `${stats.completionRate}% completion rate`,
            changeType: stats.completionRate > 70 ? "positive" : "neutral",
            icon: TrendingUp
          },
          {
            label: "Gelir",
            value: `$${stats.revenue.toLocaleString()}`,
            change: "+12% this month",
            changeType: "positive",
            icon: DollarSign
          }
        ]}
        className="mb-8"
      />

      <DashboardGrid>
        {/* Quick Actions */}
        <DashboardSection title="Hızlı İşlemler" subtitle="Yaygın yönetici görevleri">
          <DashboardCard>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/admin/users">
                  <Users className="h-4 w-4 mr-3" />
                  Kullanıcıları Yönet
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/admin/courses">
                  <BookOpen className="h-4 w-4 mr-3" />
                  Kursları Yönet
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/admin/settings">
                  <Settings className="h-4 w-4 mr-3" />
                  Sistem Ayarları
                </a>
              </Button>
            </div>
          </DashboardCard>
        </DashboardSection>

        {/* System Health */}
        <DashboardSection title="Sistem Sağlığı" subtitle="Performans özeti">
          <DashboardCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Veritabanı</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  <span className="text-sm font-medium text-success-600">Sağlıklı</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Yanıtı</span>
                <span className="text-sm font-medium text-gray-900">125ms avg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Aktif Kalma Süresi</span>
                <span className="text-sm font-medium text-gray-900">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Depolama</span>
                <span className="text-sm font-medium text-gray-900">%68 kullanım</span>
              </div>
            </div>
          </DashboardCard>
        </DashboardSection>

        {/* Recent Activity */}
        <DashboardSection title="Son Aktiviteler" subtitle="En son sistem olayları">
          <DashboardCard>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    {activity.user && (
                      <p className="text-xs text-gray-500 truncate">
                        {activity.user}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href="/admin/activity">
                  <Eye className="h-4 w-4 mr-2" />
                  Tüm Aktiviteleri Görüntüle
                </a>
              </Button>
            </div>
          </DashboardCard>
        </DashboardSection>
      </DashboardGrid>

      {/* Course Management Overview */}
      <DashboardSection 
        title="Kurs Yönetimi" 
        subtitle="Kurs performansı ve yönetim özeti"
        action={
          <Button variant="outline" asChild>
            <a href="/admin/courses">
              Tüm Kursları Görüntüle
            </a>
          </Button>
        }
        className="mt-8"
      >
        <DashboardGrid>
          <DashboardCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-corporate-primary mb-1">
                {stats.activeCourses}
              </div>
              <div className="text-sm text-gray-600">Aktif Kurslar</div>
            </div>
          </DashboardCard>
          
          <DashboardCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600 mb-1">
                {stats.completionRate}%
              </div>
              <div className="text-sm text-gray-600">Tamamlama Oranı</div>
            </div>
          </DashboardCard>
          
          <DashboardCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600 mb-1">
                {stats.totalEnrollments}
              </div>
              <div className="text-sm text-gray-600">Toplam Kayıtlar</div>
            </div>
          </DashboardCard>
        </DashboardGrid>
      </DashboardSection>
    </DashboardLayout>
  );
}