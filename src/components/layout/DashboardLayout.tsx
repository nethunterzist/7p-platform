"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import DashboardContent from './DashboardContent';
import MobileOptimizations, { useIsMobile } from './MobileOptimizations';
import { cn } from '@/lib/utils';

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
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export default function DashboardLayout({
  children,
  className,
  title,
  subtitle,
  actions,
  breadcrumbs
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
  }, [router]);

  const handleAuthUser = useCallback((authUser: any) => {
    if (!authUser) {
      console.log('🔍 No auth user, using demo user for development');
      // For development, create a demo user instead of redirecting
      const demoUser: DashboardUser = {
        id: 'demo-user',
        email: 'demo@7peducation.com',
        full_name: 'Demo Kullanıcı',
        avatar_url: null,
        role: 'student'
      };
      setUser(demoUser);
      setError(null);
      setLoading(false);
      return;
    }

    const dashboardUser: DashboardUser = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.user_metadata?.full_name || null,
      avatar_url: authUser.user_metadata?.avatar_url || null,
      role: authUser.email === 'admin@7peducation.com' || authUser.user_metadata?.role === 'admin' ? 'admin' : 'student'
    };
    
    console.log('✅ User authenticated:', dashboardUser.email);
    setUser(dashboardUser);
    setError(null);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    let mounted = true;

    // Initial auth check
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (error) {
          handleAuthError(error);
          return;
        }

        handleAuthUser(user);
        setAuthChecked(true);
      } catch (error) {
        if (mounted) {
          handleAuthError(error);
        }
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔍 Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('🔍 Auth signed out, using demo user for development');
          // For development, use demo user instead of redirecting
          const demoUser: DashboardUser = {
            id: 'demo-user-signout',
            email: 'demo@7peducation.com',
            full_name: 'Demo Kullanıcı (Signed Out)',
            avatar_url: null,
            role: 'student'
          };
          setUser(demoUser);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          handleAuthUser(session.user);
        }
      }
    );

    checkAuth();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthError, handleAuthUser, router]);

  // Loading timeout protection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !authChecked) {
        console.warn('⚠️ Loading timeout, creating demo user');
        // Instead of showing error, create demo user for development
        const demoUser: DashboardUser = {
          id: 'demo-user-timeout',
          email: 'demo@7peducation.com',
          full_name: 'Demo Kullanıcı',
          avatar_url: null,
          role: 'student'
        };
        setUser(demoUser);
        setError(null);
        setLoading(false);
      }
    }, 3000); // Reduced to 3 second timeout

    return () => clearTimeout(timeout);
  }, [loading, authChecked]);

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Kontrol Paneli Yükleniyor</p>
          <p className="text-gray-500 text-xs">Kimlik doğrulaması kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Main layout ready

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileOptimizations />
      
      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {/* Global Header - Full Width */}
      <DashboardHeader
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        user={user}
        title={title}
        subtitle={subtitle}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        "lg:ml-64 pt-16" // pt-16 to account for fixed header
      )}>
        {/* Page content */}
        <main className={cn("px-3 py-6", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}