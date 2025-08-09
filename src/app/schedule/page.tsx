"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Target, 
  Plus, 
  Bell, 
  Download,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Users,
  Video,
  FileText,
  Award,
  Zap
} from 'lucide-react';

// Interfaces
interface CalendarEvent {
  id: string;
  title: string;
  type: 'lesson' | 'assignment' | 'exam' | 'study' | 'meeting' | 'quiz';
  date: Date;
  startTime?: string;
  endTime?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  completed?: boolean;
  course?: string;
}

interface StudyGoal {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  current: number;
  unit: 'hours' | 'lessons' | 'assignments';
}

// Sample data
const SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'PPC Fundamentals',
    type: 'lesson',
    date: new Date(),
    startTime: '14:00',
    endTime: '16:00',
    description: 'Canlı ders - Google Ads temelleri',
    course: 'PPC Reklam Uzmanlığı',
    priority: 'high'
  },
  {
    id: '2',
    title: 'Ürün Araştırması Ödevi',
    type: 'assignment',
    date: new Date(),
    startTime: '23:59',
    description: 'E-ticaret platformu analizi',
    course: 'Ürün Araştırması',
    priority: 'high'
  },
  {
    id: '3',
    title: 'Mentor Görüşmesi',
    type: 'meeting',
    date: new Date(),
    startTime: '20:00',
    endTime: '21:00',
    description: '1-on-1 danışmanlık',
    course: 'Full Mentorluk',
    priority: 'medium'
  },
  {
    id: '4',
    title: 'Quiz: Google Ads Basics',
    type: 'quiz',
    date: new Date(),
    description: 'Temel bilgiler değerlendirmesi',
    course: 'PPC Reklam Uzmanlığı',
    priority: 'medium'
  },
  {
    id: '5',
    title: 'Facebook Ads Kampanya Optimizasyonu',
    type: 'lesson',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    startTime: '15:30',
    endTime: '17:30',
    description: 'İleri seviye optimizasyon teknikleri',
    course: 'PPC Reklam Uzmanlığı',
    priority: 'high'
  },
  {
    id: '6',
    title: 'E-ticaret Trend Analizi',
    type: 'assignment',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    startTime: '18:00',
    description: 'Pazar trendleri raporu hazırlama',
    course: 'Ürün Araştırması',
    priority: 'medium'
  }
];

const STUDY_GOALS: StudyGoal[] = [
  {
    id: '1',
    title: 'Haftalık Ders Saati',
    type: 'weekly',
    target: 10,
    current: 7,
    unit: 'hours'
  },
  {
    id: '2',
    title: 'Günlük Ders Hedefi',
    type: 'daily',
    target: 2,
    current: 1,
    unit: 'lessons'
  },
  {
    id: '3',
    title: 'Aylık Ödev Hedefi',
    type: 'monthly',
    target: 8,
    current: 5,
    unit: 'assignments'
  }
];

// Helper functions
const formatDate = (date: Date) => {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (time: string) => {
  return time;
};

const getEventTypeIcon = (type: string) => {
  switch (type) {
    case 'lesson': return Video;
    case 'assignment': return FileText;
    case 'exam': return Award;
    case 'study': return BookOpen;
    case 'meeting': return Users;
    case 'quiz': return CheckCircle;
    default: return Calendar;
  }
};

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'lesson': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assignment': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'exam': return 'bg-red-100 text-red-800 border-red-200';
    case 'study': return 'bg-green-100 text-green-800 border-green-200';
    case 'meeting': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'quiz': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high': return 'bg-red-50 border-red-200';
    case 'medium': return 'bg-yellow-50 border-yellow-200';
    case 'low': return 'bg-green-50 border-green-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

// Calendar component
function CalendarGrid({ currentDate, events, onDateClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
}) {
  const today = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startOfMonth.getDay());

  const days = [];
  const currentDateCopy = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    days.push(new Date(currentDateCopy));
    currentDateCopy.setDate(currentDateCopy.getDate() + 1);
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Header */}
      {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'].map(day => (
        <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {days.map(date => {
        const dayEvents = getEventsForDate(date);
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
        const isToday = date.toDateString() === today.toDateString();
        const hasEvents = dayEvents.length > 0;

        return (
          <div
            key={date.toISOString()}
            onClick={() => onDateClick(date)}
            className={`
              p-2 min-h-[80px] cursor-pointer border border-gray-100 hover:bg-gray-50 transition-colors
              ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
              ${isToday ? 'bg-blue-50 border-blue-200' : ''}
            `}
          >
            <div className={`
              text-sm font-medium mb-1
              ${isToday ? 'text-blue-600' : ''}
            `}>
              {date.getDate()}
            </div>
            
            {/* Event indicators */}
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  className={`
                    text-xs px-1 py-0.5 rounded truncate
                    ${getEventTypeColor(event.type)}
                  `}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{dayEvents.length - 2} daha
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Event list component
function EventList({ events, title }: {
  events: CalendarEvent[];
  title: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">{title}</h3>
      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">Henüz etkinlik bulunmuyor</p>
      ) : (
        events.map(event => {
          const Icon = getEventTypeIcon(event.type);
          
          return (
            <div
              key={event.id}
              className={`
                p-3 rounded-lg border transition-colors hover:shadow-sm
                ${getPriorityColor(event.priority)}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`
                    p-1 rounded-lg
                    ${getEventTypeColor(event.type)}
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    {event.course && (
                      <p className="text-xs text-gray-500 mt-1">{event.course}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {event.startTime && event.endTime 
                            ? `${event.startTime} - ${event.endTime}`
                            : event.startTime || 'Tüm gün'
                          }
                        </span>
                      </div>
                      {event.priority && (
                        <Badge 
                          variant={event.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {event.priority === 'high' ? 'Yüksek' : 
                           event.priority === 'medium' ? 'Orta' : 'Düşük'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {event.type === 'lesson' && (
                    <Button size="sm" variant="outline">
                      Katıl
                    </Button>
                  )}
                  {event.type === 'assignment' && !event.completed && (
                    <Button size="sm" variant="outline">
                      Görüntüle
                    </Button>
                  )}
                  {event.completed && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events] = useState<CalendarEvent[]>(SAMPLE_EVENTS);
  const [studyGoals] = useState<StudyGoal[]>(STUDY_GOALS);
  const [studyStreak] = useState(7); // Current study streak in days

  const today = new Date();
  const todayEvents = events.filter(event => 
    event.date.toDateString() === today.toDateString()
  );

  const upcomingEvents = events
    .filter(event => event.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 7);

  const selectedDateEvents = selectedDate 
    ? events.filter(event => event.date.toDateString() === selectedDate.toDateString())
    : [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const completedGoalsCount = studyGoals.filter(goal => 
    goal.current >= goal.target
  ).length;

  const upcomingDeadlines = events.filter(event => 
    event.type === 'assignment' && event.date >= today && !event.completed
  ).length;

  return (
    <DashboardLayout
      title="Program"
      subtitle="Çalışma takviminiz ve ders programınız"
      breadcrumbs={[
        { label: 'Program' }
      ]}
      actions={
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Etkinlik Ekle
          </Button>
        </div>
      }
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bugün</p>
                <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
                <p className="text-xs text-gray-500 mt-1">Etkinlik</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Yaklaşan Teslimler</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingDeadlines}</p>
                <p className="text-xs text-gray-500 mt-1">Ödev/Proje</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Çalışma Serisi</p>
                <p className="text-2xl font-bold text-gray-900">{studyStreak}</p>
                <p className="text-xs text-gray-500 mt-1">Gün</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tamamlanan Hedefler</p>
                <p className="text-2xl font-bold text-gray-900">{completedGoalsCount}/{studyGoals.length}</p>
                <p className="text-xs text-gray-500 mt-1">Bu hafta</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Bugün
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigateMonth('next')}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <CalendarGrid
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
              />
            </div>
          </DashboardCard>

          {/* Selected Date Details */}
          {selectedDate && (
            <DashboardCard className="mt-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {formatDate(selectedDate)} - Etkinlikler
                </h3>
                <EventList 
                  events={selectedDateEvents} 
                  title=""
                />
              </div>
            </DashboardCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Agenda */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Bugün</h3>
              </div>
              <EventList events={todayEvents} title="" />
            </div>
          </DashboardCard>

          {/* Upcoming Events */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Yaklaşan Etkinlikler</h3>
              </div>
              
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map(event => {
                  const Icon = getEventTypeIcon(event.type);
                  
                  return (
                    <div key={event.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className={`
                        p-1 rounded
                        ${getEventTypeColor(event.type)}
                      `}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.date.toLocaleDateString('tr-TR', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          {event.startTime && ` • ${event.startTime}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DashboardCard>

          {/* Study Goals */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Çalışma Hedefleri</h3>
              </div>
              
              <div className="space-y-4">
                {studyGoals.map(goal => {
                  const progress = (goal.current / goal.target) * 100;
                  const isCompleted = goal.current >= goal.target;
                  
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {goal.title}
                        </span>
                        {isCompleted && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-0">
                          {goal.current}/{goal.target}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DashboardCard>

          {/* Quick Actions */}
          <DashboardCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Çalışma Seansı Ekle
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Hatırlatıcı Oluştur
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Ders Programını Gör
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Takvimi Dışa Aktar
                </Button>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </DashboardLayout>
  );
}