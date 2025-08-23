"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/simple-auth';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import DashboardContent from './DashboardContent';
import MobileOptimizations, { useIsMobile } from './MobileOptimizations';
import { cn } from '@/lib/utils';
import BetaBanner from '@/components/beta/BetaBanner';

export type UserRole = 'student' | 'admin';

export interface DashboardUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  className,
  title,
  subtitle,
  actions
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  const handleAuthError = useCallback((error: any) => {
    console.warn('⚠️ AUTH_WARNING:', error);
    // For development, don't treat auth errors as fatal
    // Create demo user instead of redirecting
    const demoUser: DashboardUser = {
      id: 'demo-user-error',
      email: 'demo@7peducation.com',
      full_name: 'Demo Kullanıcı (Auth Error)',
      avatar_url: null,
      role: 'student'
    };
    setUser(demoUser);
    setError(null);
    setLoading(false);
    setAuthChecked(true);
  }, [router]);

  const handleAuthUser = useCallback((authUser: any) => {
    if (!authUser) {
      console.log('🔍 No auth user, redirecting to login');
      router.push('/login');
      return;
    }

    const dashboardUser: DashboardUser = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.name || authUser.full_name || null,
      avatar_url: null,
      role: authUser.role || 'student'
    };
    
    console.log('✅ User authenticated:', dashboardUser.email);
    setUser(dashboardUser);
    setError(null);
    setLoading(false);
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    let mounted = true;

    // Initial auth check with simple-auth
    const checkAuth = async () => {
      try {
        const user = getCurrentUser();
        
        if (mounted) {
          if (user) {
            handleAuthUser(user);
          } else {
            handleAuthUser(null);
          }
          setAuthChecked(true);
        }
      } catch (error) {
        if (mounted) {
          console.warn('⚠️ Auth check failed, using demo user:', error);
          handleAuthUser(null);
          setAuthChecked(true);
        }
      }
    };

    checkAuth();

    // Cleanup
    return () => {
      mounted = false;
    };
  }, [handleAuthUser, router]);

  // Loading timeout protection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !user) {
        console.warn('⚠️ Loading timeout, forcing demo user after 2 seconds');
        const demoUser: DashboardUser = {
          id: 'demo-user-timeout',
          email: 'demo@7peducation.com',
          full_name: 'Demo Kullanıcı (Timeout)',
          avatar_url: null,
          role: 'student'
        };
        setUser(demoUser);
        setError(null);
        setLoading(false);
        setAuthChecked(true);
      }
    }, 2000); // Reduced from 3000 to 2000ms

    return () => clearTimeout(timeout);
  }, [loading, user]);

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Bir Sorun Oluştu</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  // Loading state with progress indicator
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-corporate-50 to-corporate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-12 h-12 border-4 border-corporate-200 rounded-full animate-spin mx-auto"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-12 border-4 border-corporate-primary rounded-full animate-spin border-t-transparent"></div>
          </div>
          <h3 className="text-lg font-semibold text-corporate-deep mb-2">Kontrol Paneli Yükleniyor</h3>
          <p className="text-corporate-600 text-sm">Kimlik doğrulaması kontrol ediliyor...</p>
          <div className="mt-4 w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div className="bg-corporate-primary h-2 rounded-full animate-pulse" style={{ width: authChecked ? '100%' : '60%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">En fazla 2 saniye sürer</p>
        </div>
      </div>
    );
  }

  // Main layout ready

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileOptimizations>
        <div></div>
      </MobileOptimizations>
      
      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {/* Beta Banner - Above Header */}
      <BetaBanner />
      
      {/* Global Header - Full Width */}
      <DashboardHeader
        user={user}
        onSidebarToggle={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main content */}
      <main className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        "lg:ml-64 pt-16" // pt-16 to account for fixed header
      )}>
        <DashboardContent
          title={title}
          subtitle={subtitle}
          actions={actions}
          sidebarOpen={sidebarOpen}
          className={className}
        >
          {children}
        </DashboardContent>
      </main>
    </div>
  );
}
