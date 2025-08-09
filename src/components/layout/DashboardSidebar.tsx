"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  BarChart3,
  Users,
  Settings,
  GraduationCap,
  Trophy,
  Calendar,
  MessageSquare,
  FileText,
  Shield,
  Database,
  Cog,
  TrendingUp,
  Star,
  Clock,
  Target,
  BookMarked,
  ChevronRight,
  Home,
  User
} from 'lucide-react';
import type { DashboardUser } from './DashboardLayout';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
  roles?: Array<'student' | 'admin'>;
}

interface NavigationSection {
  name: string;
  items: NavigationItem[];
  roles?: Array<'student' | 'admin'>;
}

const studentNavigation: NavigationSection[] = [
  {
    name: 'Öğrenme',
    items: [
      {
        name: 'Kontrol Paneli',
        href: '/dashboard',
        icon: Home,
        description: 'Genel bakış ve ilerleme'
      },
      {
        name: 'Kurslarım',
        href: '/courses',
        icon: BookOpen,
        description: 'Kayıtlı kurslar'
      },
      {
        name: 'İlerleme',
        href: '/progress',
        icon: TrendingUp,
        description: 'Öğrenme analitiği'
      },
      {
        name: 'Program',
        href: '/schedule',
        icon: Calendar,
        description: 'Çalışma takvimi'
      }
    ]
  },
  {
    name: 'Kaynaklar',
    items: [
      {
        name: 'Kütüphane',
        href: '/library',
        icon: BookMarked,
        description: 'Kurs materyalleri'
      },
      {
        name: 'Tartışmalar',
        href: '/discussions',
        icon: MessageSquare,
        badge: '3',
        description: 'Topluluk forumları'
      },
      {
        name: 'Notlar',
        href: '/notes',
        icon: FileText,
        description: 'Kişisel notlar'
      }
    ]
  },
  {
    name: 'Hesap',
    items: [
      {
        name: 'Profil',
        href: '/profile',
        icon: User,
        description: 'Kişisel bilgiler'
      },
      {
        name: 'Ayarlar',
        href: '/settings',
        icon: Settings,
        description: 'Tercihler'
      }
    ]
  }
];

const adminNavigation: NavigationSection[] = [
  {
    name: 'Yönetim',
    items: [
      {
        name: 'Yönetici Paneli',
        href: '/admin/dashboard',
        icon: BarChart3,
        description: 'Sistem özeti'
      },
      {
        name: 'Analitikler',
        href: '/admin/analytics',
        icon: TrendingUp,
        description: 'Platform analizleri'
      },
      {
        name: 'Kullanıcı Yönetimi',
        href: '/admin/users',
        icon: Users,
        description: 'Kullanıcıları yönet'
      },
      {
        name: 'Kurs Yönetimi',
        href: '/admin/courses',
        icon: BookOpen,
        description: 'Kursları yönet'
      }
    ]
  },
  {
    name: 'İçerik',
    items: [
      {
        name: 'İçerik Kütüphanesi',
        href: '/admin/content',
        icon: BookMarked,
        description: 'Kurs içeriği'
      },
      {
        name: 'Değerlendirmeler',
        href: '/admin/assessments',
        icon: FileText,
        description: 'Testler ve sınavlar'
      },
    ]
  },
  {
    name: 'Sistem',
    items: [
      {
        name: 'Veritabanı',
        href: '/admin/database',
        icon: Database,
        description: 'Veri yönetimi'
      },
      {
        name: 'Güvenlik',
        href: '/admin/security',
        icon: Shield,
        description: 'Güvenlik ayarları'
      },
      {
        name: 'Sistem Ayarları',
        href: '/admin/settings',
        icon: Cog,
        description: 'Platform yapılandırması'
      }
    ]
  },
  {
    name: 'Öğrenme (Öğrenci Görünümü)',
    items: [
      {
        name: 'Öğrenimim',
        href: '/dashboard',
        icon: GraduationCap,
        description: 'Öğrenci paneli'
      },
      {
        name: 'Kursları Gözat',
        href: '/courses',
        icon: BookOpen,
        description: 'Tüm kurslar'
      }
    ]
  }
];

interface DashboardSidebarProps {
  user: DashboardUser | null;
  open: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({
  user,
  open,
  onClose
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';
  const navigation = isAdmin ? adminNavigation : studentNavigation;

  const NavigationLink = ({ item }: { item: NavigationItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
          "hover:bg-corporate-50 hover:text-corporate-deep",
          "focus:outline-none focus:ring-2 focus:ring-corporate-primary focus:ring-offset-2",
          "touch-manipulation", // Better touch responsiveness
          "min-h-[48px]", // 48px minimum touch target for navigation
          "active:bg-corporate-100", // Active state for touch
          isActive
            ? "bg-gradient-to-r from-corporate-primary to-corporate-accent text-white shadow-corporate-md"
            : "text-gray-700 hover:text-corporate-deep"
        )}
      >
        <div className="flex items-center space-x-3">
          <item.icon
            className={cn(
              "h-5 w-5 transition-colors",
              isActive ? "text-white" : "text-gray-500 group-hover:text-corporate-primary"
            )}
          />
          <div className="flex-1">
            <div className="font-medium">{item.name}</div>
            {item.description && (
              <div className={cn(
                "text-xs transition-colors",
                isActive ? "text-white/80" : "text-gray-500 group-hover:text-corporate-600"
              )}>
                {item.description}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {item.badge && (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 text-xs",
                isActive ? "bg-white/20 text-white" : "bg-corporate-100 text-corporate-800"
              )}
            >
              {item.badge}
            </Badge>
          )}
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-all duration-200",
              isActive 
                ? "text-white translate-x-1" 
                : "text-gray-400 group-hover:text-corporate-primary group-hover:translate-x-1"
            )}
          />
        </div>
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-corporate-deep to-corporate-primary">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {isAdmin ? 'Yönetici Paneli' : 'Öğrenme Merkezi'}
            </h2>
            <p className="text-xs text-white/80">
              {user?.full_name || user?.email?.split('@')[0] || 'Öğrenci'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Badge className="bg-white/20 text-white border-white/30">
            <Shield className="h-3 w-3 mr-1" />
            Yönetici
          </Badge>
        )}
      </div>

      {/* User Quick Stats */}
      <div className="p-4 bg-gradient-to-br from-corporate-50 to-white border-b border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          {isAdmin ? (
            <>
              <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                <div className="text-lg font-bold text-corporate-primary">156</div>
                <div className="text-xs text-gray-600">Toplam Kullanıcı</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                <div className="text-lg font-bold text-success-600">24</div>
                <div className="text-xs text-gray-600">Aktif Kurslar</div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                <div className="text-lg font-bold text-corporate-primary">85%</div>
                <div className="text-xs text-gray-600">İlerleme</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                <div className="text-lg font-bold text-warning-600">7</div>
                <div className="text-xs text-gray-600">Günlük Seri</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain">
        {navigation.map((section) => (
          <div key={section.name}>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.name}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavigationLink key={item.name} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {isAdmin && (
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/dashboard">
                <GraduationCap className="h-4 w-4 mr-2" />
                Öğrenci Görünümüne Geç
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:top-16 bg-white border-r border-gray-200 shadow-corporate-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 max-w-[85vw] transform transition-transform duration-300 ease-in-out lg:hidden",
          "bg-white border-r border-gray-200 shadow-corporate-lg",
          "overflow-hidden", // Prevent content overflow
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ top: '4rem' }} // Account for header height
        role="navigation"
        aria-label="Ana gezinme"
        aria-hidden={!open}
      >
        {sidebarContent}
      </aside>
    </>
  );
}