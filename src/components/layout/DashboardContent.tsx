"use client";

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface DashboardContentProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  sidebarOpen: boolean;
}

export default function DashboardContent({
  children,
  className,
  title,
  subtitle,
  actions,
  breadcrumbs,
  sidebarOpen
}: DashboardContentProps) {
  const hasHeader = title || subtitle || actions || breadcrumbs;

  return (
    <main
      className={cn(
        "flex-1 flex flex-col min-h-0 transition-all duration-300",
        "lg:ml-80" // Account for fixed sidebar on desktop
      )}
    >
      {/* Content Header */}
      {hasHeader && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-corporate-sm">
          <div className="px-4 lg:px-6 py-4">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-corporate-primary transition-colors"
                >
                  <Home className="h-4 w-4" />
                </Link>
                
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-corporate-primary transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {/* Header Content */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                {title && (
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 break-words">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-600 text-sm lg:text-base break-words">
                    {subtitle}
                  </p>
                )}
              </div>
              
              {actions && (
                <div className="flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {actions}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className={cn(
          "h-full",
          hasHeader ? "p-4 lg:p-6" : "",
          className
        )}>
          {children}
        </div>
      </div>
    </main>
  );
}

// Utility components for common content layouts
export function DashboardGrid({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
      className
    )}>
      {children}
    </div>
  );
}

export function DashboardCard({ 
  children, 
  className,
  padding = true
}: { 
  children: React.ReactNode; 
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-300",
      padding && "p-6",
      className
    )}>
      {children}
    </div>
  );
}

export function DashboardStats({ 
  stats,
  className 
}: { 
  stats: Array<{
    label: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  className?: string;
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6",
      className
    )}>
      {stats.map((stat, index) => (
        <DashboardCard key={index}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
              {stat.change && (
                <p className={cn(
                  "text-xs mt-1 flex items-center",
                  stat.changeType === 'positive' && "text-success-600",
                  stat.changeType === 'negative' && "text-red-600",
                  stat.changeType === 'neutral' && "text-gray-500"
                )}>
                  {stat.change}
                </p>
              )}
            </div>
            {stat.icon && (
              <div className="w-12 h-12 bg-corporate-100 rounded-xl flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-corporate-primary" />
              </div>
            )}
          </div>
        </DashboardCard>
      ))}
    </div>
  );
}

export function DashboardSection({ 
  title, 
  subtitle,
  action,
  children,
  className 
}: { 
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-600 text-sm mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "text-center py-12",
      className
    )}>
      <div className="w-20 h-20 bg-corporate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Icon className="h-10 w-10 text-corporate-primary" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}