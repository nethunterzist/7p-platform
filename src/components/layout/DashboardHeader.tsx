"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockApi } from '@/lib/mock-api';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/simple-auth';
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
  Menu, 
  Settings, 
  LogOut, 
  BookOpen,
  Shield,
  HelpCircle,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
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

  const switchToRole = (newRole: 'student' | 'admin') => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Update user role in localStorage
      const updatedUser = { ...currentUser, role: newRole };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      
      // Navigate to appropriate dashboard with forced navigation
      if (newRole === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await mockApi.auth.signOut();
      // Also clear legacy tokens
      document.cookie = 'auth_token=; path=/; max-age=0';
      localStorage.removeItem('auth_user');
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
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-background/95 backdrop-blur-sm border-b border-border shadow-corporate-sm">
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={isSearchFocused ? "Ara..." : "Kursları ara..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg",
                  "bg-muted/50 backdrop-blur-sm text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-corporate-primary focus:border-transparent",
                  "focus:bg-background focus:shadow-corporate-md",
                  "transition-all duration-200",
                  "placeholder:text-muted-foreground",
                  "touch-manipulation", // Better touch responsiveness
                  "min-h-[44px] sm:min-h-[40px]" // 44px minimum touch target on mobile
                )}
              />
            </div>
          </form>
        </div>

        {/* Right Section - Actions & User Menu */}
        <div className="flex items-center space-x-2 lg:space-x-3">

          {/* Panel Geçiş Butonları */}
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="min-h-[36px] px-2 sm:px-3 py-1.5 rounded-md text-xs"
              onClick={() => switchToRole('student')}
            >
              <GraduationCap className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Öğrenci</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="min-h-[36px] px-2 sm:px-3 py-1.5 rounded-md text-xs"
              onClick={() => switchToRole('admin')}
            >
              <Shield className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Yönetici</span>
            </Button>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

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
                    <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {userDisplayName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
