"use client";

import React, { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Table, 
  Link2, 
  File,
  Download,
  ExternalLink,
  Calendar
} from 'lucide-react';

interface RecentMaterialsProps {
  materials: Array<{
    id: string;
    name: string;
    type: 'pdf' | 'excel' | 'link' | 'document';
    courseId: string;
    courseName: string;
    uploadedAt: string;
    downloadUrl?: string;
    externalUrl?: string;
    size?: string;
  }>;
  loading?: boolean;
}

const RecentMaterials: React.FC<RecentMaterialsProps> = ({ materials, loading }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'excel':
        return Table;
      case 'link':
        return Link2;
      case 'document':
      default:
        return File;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'excel':
        return 'Excel';
      case 'link':
        return 'Link';
      case 'document':
      default:
        return 'Doküman';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'excel':
        return 'bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'link':
        return 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'document':
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
              <div className="w-20 h-8 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!materials || materials.length === 0) {
    return (
      <div className="card p-8 text-center">
        <FileText className="h-12 w-12 text-muted mx-auto mb-4" />
        <h3 className="font-medium text-primary mb-2">
          Henüz materyal bulunmuyor
        </h3>
        <p className="text-sm text-muted">
          Derslerinizde paylaşılan materyaller burada görünecek
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(materials || []).slice(0, 5).map((material) => {
        const IconComponent = getIcon(material.type);
        
        return (
          <div
            key={material.id}
            className="card hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm dark:hover:bg-slate-800/50 transition-all duration-300 p-4"
          >
            <div className="flex items-center gap-4">
              {/* File Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getTypeColor(material.type)}`}>
                <IconComponent className="h-5 w-5" />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-primary truncate">
                  {material.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted mt-1">
                  <span className="truncate">{material.courseName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(material.uploadedAt).toLocaleDateString('tr-TR')}
                  </span>
                  {material.size && (
                    <>
                      <span>•</span>
                      <span>{material.size}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Type Badge */}
              <div className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(material.type)}`}>
                {getTypeLabel(material.type)}
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                {material.type === 'link' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a 
                      href={material.externalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a 
                      href={material.downloadUrl} 
                      download
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {(materials || []).length > 5 && (
        <div className="text-center pt-2">
          <Button variant="ghost" asChild>
            <Link href="/student/materials">
              Tüm Materyalleri Görüntüle ({(materials || []).length})
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default memo(RecentMaterials);
