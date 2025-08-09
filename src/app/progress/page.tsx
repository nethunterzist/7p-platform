"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { 
  TrendingUp, 
  Target, 
  Clock, 
  Award, 
  Star, 
  BarChart3,
  Calendar,
  BookOpen,
  Zap,
  Trophy,
  CheckCircle,
  ArrowRight,
  Activity,
  Brain,
  Timer,
  Flame,
  Users
} from 'lucide-react';

interface ProgressData {
  totalProgress: number;
  completedCourses: { completed: number; total: number };
  weeklyTarget: { target: number; achieved: number };
  dailyStreak: number;
  weeklyHours: number[];
  courseProgress: Array<{
    name: string;
    progress: number;
    color: string;
  }>;
  skillsData: Array<{
    skill: string;
    level: number;
    maxLevel: number;
  }>;
  learningStats: {
    avgSessionTime: number;
    favoriteTime: string;
    productiveDay: string;
    totalStudyTime: number;
  };
}

// Mock data - in real app this would come from API
const mockProgressData: ProgressData = {
  totalProgress: 85,
  completedCourses: { completed: 3, total: 5 },
  weeklyTarget: { target: 7, achieved: 5.2 },
  dailyStreak: 12,
  weeklyHours: [4.2, 6.1, 5.8, 7.2, 4.9, 3.1, 5.2],
  courseProgress: [
    { name: 'Full Mentorluk', progress: 95, color: 'from-blue-500 to-blue-600' },
    { name: 'PPC Uzmanlığı', progress: 78, color: 'from-green-500 to-green-600' },
    { name: 'Ürün Araştırması', progress: 45, color: 'from-purple-500 to-purple-600' },
    { name: 'SEO Temelleri', progress: 23, color: 'from-orange-500 to-orange-600' },
    { name: 'E-ticaret Stratejisi', progress: 12, color: 'from-pink-500 to-pink-600' },
  ],
  skillsData: [
    { skill: 'PPC Reklamcılığı', level: 8, maxLevel: 10 },
    { skill: 'Ürün Araştırması', level: 7, maxLevel: 10 },
    { skill: 'SEO', level: 5, maxLevel: 10 },
    { skill: 'E-ticaret', level: 6, maxLevel: 10 },
    { skill: 'Veri Analizi', level: 4, maxLevel: 10 },
    { skill: 'Sosyal Medya', level: 3, maxLevel: 10 },
  ],
  learningStats: {
    avgSessionTime: 45,
    favoriteTime: '20:00-22:00',
    productiveDay: 'Salı',
    totalStudyTime: 84
  }
};

const CircularProgress = ({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 8,
  color = "text-blue-500"
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (value / max) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={color}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

const WeeklyChart = ({ data }: { data: number[] }) => {
  const maxValue = Math.max(...data);
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end h-32">
        {data.map((hours, index) => (
          <div key={index} className="flex flex-col items-center space-y-2 flex-1">
            <div className="w-full max-w-8 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                style={{
                  height: `${(hours / maxValue) * 100}%`,
                  minHeight: hours > 0 ? '8px' : '0px'
                }}
              />
            </div>
            <span className="text-xs text-gray-500">{days[index]}</span>
            <span className="text-xs font-medium text-gray-700">{hours}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SkillRadar = ({ skills }: { skills: Array<{ skill: string; level: number; maxLevel: number }> }) => {
  return (
    <div className="space-y-3">
      {skills.map((skill, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 font-medium">{skill.skill}</span>
            <span className="text-gray-500">{skill.level}/{skill.maxLevel}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};


export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData>(mockProgressData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate loading delay for smooth UX
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout
        title="İlerleme"
        subtitle="Öğrenme analitiğiniz ve başarı metrikleri"
      >
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="bg-gray-200 rounded-xl h-32"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="İlerleme"
      subtitle="Öğrenme analitiğiniz ve başarı metrikleri"
      breadcrumbs={[
        { label: 'İlerleme' }
      ]}
    >
      <div className="space-y-8">
        {/* Progress Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard>
            <div className="text-center">
              <CircularProgress 
                value={progressData.totalProgress} 
                color="text-blue-500"
                size={100}
                strokeWidth={6}
              />
              <h3 className="font-semibold text-gray-900 mt-3">Toplam İlerleme</h3>
              <p className="text-sm text-gray-600">Genel öğrenme durumunuz</p>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tamamlanan Kurslar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {progressData.completedCourses.completed}/{progressData.completedCourses.total}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((progressData.completedCourses.completed / progressData.completedCourses.total) * 100)}% tamamlandı
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Haftalık Hedef</p>
                <p className="text-2xl font-bold text-gray-900">
                  {progressData.weeklyTarget.achieved}s
                </p>
                <Progress 
                  value={(progressData.weeklyTarget.achieved / progressData.weeklyTarget.target) * 100} 
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {progressData.weeklyTarget.target} saatten {progressData.weeklyTarget.achieved} saat
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Günlük Seri</p>
                <p className="text-2xl font-bold text-gray-900">
                  {progressData.dailyStreak} gün
                </p>
                <Badge className="bg-orange-100 text-orange-800 mt-2">
                  Aktif Seri
                </Badge>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Progress Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DashboardCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Haftalık Öğrenme Saatleri</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <WeeklyChart data={progressData.weeklyHours} />
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Bu hafta toplam:</span>
                  <span className="font-semibold text-gray-900">
                    {progressData.weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)} saat
                  </span>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Kurs Tamamlama Oranları</h3>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {progressData.courseProgress.map((course, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{course.name}</span>
                      <span className="text-gray-500">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${course.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Skills Development */}
        <DashboardCard>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Beceri Gelişimi</h3>
                <p className="text-sm text-gray-600">Farklı alanlardaki ilerleme seviyeniz</p>
              </div>
              <Brain className="h-5 w-5 text-gray-400" />
            </div>
            <SkillRadar skills={progressData.skillsData} />
          </div>
        </DashboardCard>

        {/* Learning Statistics */}
        <DashboardCard>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Öğrenme İstatistikleri</h3>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Timer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ortalama Oturum</p>
                    <p className="font-semibold text-gray-900">{progressData.learningStats.avgSessionTime} dakika</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Favori Zaman</p>
                    <p className="font-semibold text-gray-900">{progressData.learningStats.favoriteTime}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">En Verimli Gün</p>
                    <p className="font-semibold text-gray-900">{progressData.learningStats.productiveDay}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Çalışma</p>
                    <p className="font-semibold text-gray-900">{progressData.learningStats.totalStudyTime} saat</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Button className="w-full" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Detaylı Analiz
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </DashboardCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Kaldığın Yerden Devam Et</h4>
              <p className="text-sm text-gray-600">Son dersinize dönün</p>
              <Button size="sm" className="w-full">
                Devam Et
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Yeni Hedef Belirle</h4>
              <p className="text-sm text-gray-600">Haftalık hedefini ayarla</p>
              <Button size="sm" variant="outline" className="w-full">
                Hedef Ayarla
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">İlerleme Paylaş</h4>
              <p className="text-sm text-gray-600">Başarını arkadaşlarınla paylaş</p>
              <Button size="sm" variant="outline" className="w-full">
                Paylaş
              </Button>
            </div>
          </DashboardCard>
        </div>
      </div>
    </DashboardLayout>
  );
}