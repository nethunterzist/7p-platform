"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Bell, 
  Menu, 
  User, 
  Settings, 
  LogOut, 
  BookOpen,
  Shield,
  HelpCircle,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { DashboardUser } from './DashboardLayout';

interface DashboardHeaderProps {
  user: DashboardUser | null;
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

export default function DashboardHeader({
  user,
  onSidebarToggle,
  sidebarOpen
}: DashboardHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const userDisplayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = user?.full_name ? getInitials(user.full_name) : user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-corporate-sm">
      <div className="flex h-full items-center justify-between px-4 lg:pl-0 lg:pr-6">
        {/* Left Section - Logo & Sidebar Toggle */}
        <div className="flex items-center lg:w-64 lg:flex-shrink-0">
          {/* Mobile Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className={cn(
              "lg:hidden mr-4",
              "min-w-[44px] min-h-[44px]", // 44px touch target
              "touch-manipulation",
              "hover:bg-corporate-50 active:bg-corporate-100",
              "transition-colors duration-150"
            )}
            aria-label="Kenar çubuğunu aç/kapat"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo & Brand - Aligned with sidebar content */}
          <Link href="/dashboard" className="flex items-center space-x-3 lg:ml-4">
            <div className="w-8 h-8 bg-gradient-to-br from-corporate-primary to-corporate-accent rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-corporate-deep">7P Education</h1>
              <p className="text-xs text-corporate-600 -mt-1">Öğrenme Yönetimi</p>
            </div>
          </Link>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-2xl mx-2 sm:mx-4 lg:ml-4 lg:mr-6">
          <form onSubmit={handleSearch} className="relative">
            <div className={cn(
              "relative transition-all duration-200",
              isSearchFocused && "transform scale-[1.02]"
            )}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isSearchFocused ? "Ara..." : "Kursları ara..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg",
                  "bg-gray-50/50 backdrop-blur-sm",
                  "focus:outline-none focus:ring-2 focus:ring-corporate-primary focus:border-transparent",
                  "focus:bg-white focus:shadow-corporate-md",
                  "transition-all duration-200",
                  "placeholder:text-gray-400",
                  "touch-manipulation", // Better touch responsiveness
                  "min-h-[44px] sm:min-h-[40px]" // 44px minimum touch target on mobile
                )}
              />
            </div>
          </form>
        </div>

        {/* Right Section - Actions & User Menu */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="min-h-[40px] touch-manipulation" asChild>
              <Link href="/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Kurslar
              </Link>
            </Button>
            
            {user?.role === 'admin' && (
              <Button variant="ghost" size="sm" className="min-h-[40px] touch-manipulation" asChild>
                <Link href="/admin/dashboard">
                  <Shield className="h-4 w-4 mr-2" />
                  Yönetici
                </Link>
              </Button>
            )}
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "relative",
                  "min-w-[44px] min-h-[44px]", // 44px touch target
                  "touch-manipulation",
                  "hover:bg-corporate-50 active:bg-corporate-100",
                  "transition-colors duration-150"
                )}
                aria-label="Bildirimler"
              >
                <Bell className="h-5 w-5" />
                {/* Notification Badge */}
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-corporate-primary rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white font-medium">2</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] mx-4 sm:mx-0">
              <DropdownMenuLabel className="font-semibold">Bildirimler</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <div className="max-h-96 overflow-y-auto">
                {/* Sample Notifications */}
                <div className="p-3 hover:bg-gray-50 cursor-pointer border-b">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-corporate-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Yeni kurs mevcut</p>
                      <p className="text-xs text-gray-600">İleri React Kalıpları yeni başlatıldı</p>
                      <p className="text-xs text-gray-400 mt-1">2 saat önce</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-success-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Ödev tamamlandı</p>
                      <p className="text-xs text-gray-600">JavaScript Temelleri kursunu tamamladınız</p>
                      <p className="text-xs text-gray-400 mt-1">1 gün önce</p>
                    </div>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full">
                  Tüm bildirimleri görüntüle
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "relative h-auto min-h-[44px] w-auto pl-2 pr-3", // 44px touch target
                  "touch-manipulation",
                  "hover:bg-corporate-50 active:bg-corporate-100",
                  "transition-colors duration-150"
                )}
                aria-label="Kullanıcı menüsü"
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8 sm:h-7 sm:w-7">
                    <AvatarImage src={user?.avatar_url || undefined} alt={userDisplayName} />
                    <AvatarFallback className="bg-corporate-100 text-corporate-deep text-xs font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {userDisplayName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)] mx-4 sm:mx-0">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      user?.role === 'admin' 
                        ? "bg-corporate-100 text-corporate-800" 
                        : "bg-success-100 text-success-800"
                    )}>
                      {user?.role === 'admin' ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Yönetici
                        </>
                      ) : (
                        <>
                          <GraduationCap className="h-3 w-3 mr-1" />
                          Öğrenci
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Profile Actions */}
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profil Ayarları
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Kontrol Panelim
                </Link>
              </DropdownMenuItem>

              {user?.role === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard">
                    <Shield className="mr-2 h-4 w-4" />
                    Yönetici Paneli
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Ayarlar
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Yardım ve Destek
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}