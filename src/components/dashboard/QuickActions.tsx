"use client";

import React, { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  FileText, 
  Youtube, 
  ShoppingBag,
  ArrowRight 
} from 'lucide-react';

interface QuickActionsProps {
  actions?: Array<{
    id: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    description?: string;
  }>;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const defaultActions = [
    {
      id: 'questions',
      label: 'Soru & Cevaplarım',
      href: '/student/questions',
      icon: MessageSquare,
      count: 3,
      description: 'Sorduğunuz sorular ve cevaplar'
    },
    {
      id: 'materials',
      label: 'Materyallerim',
      href: '/student/materials',
      icon: FileText,
      count: 12,
      description: 'İndirdiğiniz ders materyalleri'
    },
    {
      id: 'youtube',
      label: '7P Youtube Kanalı',
      href: 'https://www.youtube.com/@hasem.7P.ONLINE',
      icon: Youtube,
      count: undefined,
      description: 'Eğitim videolarımız'
    },
    {
      id: 'purchases',
      label: 'Satın Alınan Eğitimler',
      href: '/courses',
      icon: ShoppingBag,
      count: 1,
      description: 'Satın aldığınız eğitimler'
    }
  ];

  const displayActions = actions || defaultActions;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayActions.map((action) => {
          const IconComponent = action.icon;
          
          const isExternal = action.href.startsWith('http');
          const LinkComponent = isExternal ? 'a' : Link;
          const linkProps = isExternal ? 
            { href: action.href, target: '_blank', rel: 'noopener noreferrer' } : 
            { href: action.href };

          return (
            <LinkComponent
              key={action.id}
              {...linkProps}
              className="group card hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all duration-300 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    action.id === 'youtube' 
                      ? 'bg-red-50 dark:bg-red-900/40 group-hover:bg-red-100 dark:group-hover:bg-red-900/60' 
                      : 'bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60'
                  }`}>
                    <IconComponent className={`h-6 w-6 ${
                      action.id === 'youtube' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {action.label}
                      </h3>
                      {action.count !== undefined && action.count > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          {action.count}
                        </Badge>
                      )}
                    </div>
                    
                    {action.description && (
                      <p className="text-sm text-muted">
                        {action.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <ArrowRight className="h-5 w-5 text-muted group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </LinkComponent>
          );
        })}
      </div>
    </div>
  );
};

export default memo(QuickActions);
