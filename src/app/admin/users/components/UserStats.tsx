'use client';

import { useMemo } from 'react';
import { AdminUserProfile, generateGrowthData } from '@/data/admin-users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  UserCheck, 
  Crown, 
  BookOpen,
  DollarSign,
} from 'lucide-react';

interface UserStatsProps {
  users: AdminUserProfile[];
  theme?: 'light' | 'dark';
}

export default function UserStats({ users, theme = 'light' }: UserStatsProps) {
  // Generate analytics data
  const analytics = useMemo(() => {
    // Role distribution
    const roleStats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const roleData = [
      { name: 'Öğrenci', value: roleStats.student || 0, color: '#3B82F6' },
      { name: 'Eğitmen', value: roleStats.instructor || 0, color: '#8B5CF6' },
      { name: 'Admin', value: roleStats.admin || 0, color: '#EF4444' },
    ];
    
    // Status distribution
    const statusStats = users.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const statusData = [
      { name: 'Aktif', value: statusStats.active || 0, color: '#10B981' },
      { name: 'Pasif', value: statusStats.inactive || 0, color: '#F59E0B' },
      { name: 'Askıda', value: statusStats.suspended || 0, color: '#EF4444' },
    ];
    
    // Subscription distribution
    const subscriptionStats = users.reduce((acc, user) => {
      acc[user.subscription.type] = (acc[user.subscription.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const subscriptionData = [
      { name: 'Ücretsiz', value: subscriptionStats.free || 0, color: '#6B7280' },
      { name: 'Premium', value: subscriptionStats.premium || 0, color: '#F59E0B' },
    ];
    
    // Registration trend (monthly)
    const registrationByMonth = users.reduce((acc, user) => {
      const month = new Date(user.created_at).toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const registrationData = Object.entries(registrationByMonth)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, count]) => ({ month, users: count }));
    
    // Activity levels
    const activityLevels = users.map(user => {
      const totalActivity = 
        user.activity_stats.forum_posts +
        user.activity_stats.forum_replies +
        user.activity_stats.messages_sent;
      
      if (totalActivity === 0) return 'Pasif';
      if (totalActivity < 10) return 'Düşük';
      if (totalActivity < 50) return 'Orta';
      return 'Yüksek';
    });
    
    const activityStats = activityLevels.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activityData = [
      { name: 'Yüksek', value: activityStats['Yüksek'] || 0, color: '#10B981' },
      { name: 'Orta', value: activityStats['Orta'] || 0, color: '#F59E0B' },
      { name: 'Düşük', value: activityStats['Düşük'] || 0, color: '#F97316' },
      { name: 'Pasif', value: activityStats['Pasif'] || 0, color: '#6B7280' },
    ];
    
    // Education stats aggregation
    const totalCourses = users.reduce((sum, user) => sum + user.education_stats.enrolled_courses, 0);
    const totalCompleted = users.reduce((sum, user) => sum + user.education_stats.completed_courses, 0);
    const totalCertificates = users.reduce((sum, user) => sum + user.education_stats.certificates_earned, 0);
    const totalStudyHours = users.reduce((sum, user) => sum + user.education_stats.total_study_hours, 0);
    
    // Revenue by month
    const revenueByMonth = users.reduce((acc, user) => {
      user.payment_history?.forEach(payment => {
        if (payment.status === 'completed') {
          const month = new Date(payment.date).toLocaleDateString('tr-TR', { 
            year: 'numeric', 
            month: 'short' 
          });
          acc[month] = (acc[month] || 0) + payment.amount;
        }
      });
      return acc;
    }, {} as Record<string, number>);
    
    const revenueData = Object.entries(revenueByMonth)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }));
    
    return {
      roleData,
      statusData,
      subscriptionData,
      activityData,
      registrationData,
      revenueData,
      totals: {
        courses: totalCourses,
        completed: totalCompleted,
        certificates: totalCertificates,
        studyHours: totalStudyHours
      }
    };
  }, [users]);
  
  const growthData = useMemo(() => generateGrowthData(), []);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-600 text-gray-100' 
            : 'bg-white border-gray-200'
        }`}>
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' 
                ? entry.dataKey === 'revenue' 
                  ? `₺${entry.value.toLocaleString('tr-TR')}`
                  : entry.value.toLocaleString('tr-TR')
                : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, name
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (percent < 0.05) return null; // Don't show labels for small slices
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Education Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Toplam Kurs Kaydı</span>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.totals.courses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Kullanıcı başına ortalama {Math.round(analytics.totals.courses / users.length)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Tamamlanan Kurslar</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.totals.completed}</div>
            <Progress 
              value={(analytics.totals.completed / analytics.totals.courses) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              %{Math.round((analytics.totals.completed / analytics.totals.courses) * 100)} tamamlama oranı
            </p>
          </CardContent>
        </Card>
        
        
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Kullanıcı Büyümesi</span>
            </CardTitle>
            <CardDescription>Son 12 ay</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Gelir Trendi</span>
            </CardTitle>
            <CardDescription>Aylık gelir (TRY)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#10B981' }}
                  activeDot={{ r: 8, fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row 2 - Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        
        
      </div>
      
      {/* Registration Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Kayıt Trendi</span>
          </CardTitle>
          <CardDescription>Aylık yeni kullanıcı kayıtları</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.registrationData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey="month" 
                stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                fontSize={12}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="users" 
                fill="#8B5CF6" 
                radius={[4, 4, 0, 0]}
                name="Yeni Kullanıcılar"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}