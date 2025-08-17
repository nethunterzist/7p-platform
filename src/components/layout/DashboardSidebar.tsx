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
  ChevronRight,
  Home,
  ShoppingCart,
  Shield,
  MessageSquare,
  FileText,
  HelpCircle
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
        description: 'Sahip olduğum kurslar'
      },
      {
        name: 'Kurs Mağazası',
        href: '/marketplace',
        icon: ShoppingCart,
        description: 'Yeni kurslar satın al'
      }
    ]
  },
  {
    name: 'Destek',
    items: [
      {
        name: 'Soru & Cevaplarım',
        href: '/student/questions',
        icon: HelpCircle,
        description: 'Sorularım ve cevaplar'
      },
      {
        name: 'Materyallerim',
        href: '/student/materials',
        icon: FileText,
        description: 'Kurs materyalleri'
      }
    ]
  },
  {
    name: 'Hesap',
    items: [
      {
        name: 'Ayarlar',
        href: '/settings',
        icon: Settings,
        description: 'Profil ve tercihler'
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
        name: 'Kullanıcı Yönetimi',
        href: '/admin/users',
        icon: Users,
        description: 'Kullanıcıları yönet'
      },
      {
        name: 'Kurs Yönetimi',
        href: '/admin/courses',
        icon: BookOpen,
        description: 'Kurs ve materyal yönetimi'
      },
      {
        name: 'Soru & Cevap',
        href: '/admin/qna',
        icon: MessageSquare,
        description: 'Öğrenci sorularını yönet'
      },
      {
        name: 'Ödeme Yönetimi',
        href: '/admin/payments',
        icon: ShoppingCart,
        description: 'Ödeme işlemleri'
      }
    ]
  },
  {
    name: 'Sistem',
    items: [
      {
        name: 'Ayarlar',
        href: '/admin/settings',
        icon: Settings,
        description: 'Platform ayarları'
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
          "hover:bg-corporate-50 dark:hover:bg-gray-800 hover:text-corporate-deep dark:hover:text-white",
          "focus:outline-none focus:ring-2 focus:ring-corporate-primary focus:ring-offset-2",
          "touch-manipulation", // Better touch responsiveness
          "min-h-[48px]", // 48px minimum touch target for navigation
          "active:bg-corporate-100 dark:active:bg-gray-700", // Active state for touch
          isActive
            ? "bg-gradient-to-r from-corporate-primary to-corporate-accent text-white shadow-corporate-md"
            : "text-gray-700 dark:text-gray-300 hover:text-corporate-deep dark:hover:text-white"
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
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-corporate-deep to-corporate-primary">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {isAdmin ? 'Yönetici Paneli' : 'Öğrenme Merkezi'}
            </h2>
            <p className="text-xs text-white/80">
              {isAdmin ? 'Yönetici' : (user?.full_name || user?.email?.split('@')[0] || 'Öğrenci')}
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


      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain">
        {navigation.map((section) => (
          <div key={section.name}>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:top-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-corporate-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 max-w-[85vw] transform transition-transform duration-300 ease-in-out lg:hidden",
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-corporate-lg",
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
