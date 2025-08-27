"use client";

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  ExternalLink,
  File,
  Image,
  Video,
  Archive
} from 'lucide-react';
import { LessonMaterial } from '@/types/course';
import { Button } from '@/components/ui/button';

interface LessonMaterialsProps {
  materials: LessonMaterial[];
  className?: string;
}

const LessonMaterials: React.FC<LessonMaterialsProps> = ({ 
  materials, 
  className = "" 
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) return FileText;
    if (type.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type)) return Image;
    if (type.includes('video') || ['mp4', 'avi', 'mov', 'mkv'].includes(type)) return Video;
    if (['zip', 'rar', '7z'].includes(type)) return Archive;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeColor = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) return 'bg-red-100 text-red-700';
    if (type.includes('image')) return 'bg-green-100 text-green-700';
    if (type.includes('video')) return 'bg-purple-100 text-purple-700';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'bg-emerald-100 text-emerald-700';
    if (type.includes('word') || type.includes('document')) return 'bg-blue-100 text-blue-700';
    if (type.includes('zip') || type.includes('archive')) return 'bg-gray-100 text-gray-700';
    return 'bg-slate-100 text-slate-700';
  };

  const handleDownload = async (material: LessonMaterial) => {
    setDownloadingId(material.id);
    
    try {
      // Gerçek uygulamada file URL'den download işlemi yapılacak
      // Mock olarak 2 saniye bekleyelim
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Yeni sekmede aç (gerçek uygulamada blob download olacak)
      window.open(material.file_url, '_blank');
      
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = (material: LessonMaterial) => {
    // Gerçek uygulamada modal popup veya yeni sekmede preview
    window.open(material.file_url, '_blank');
  };

  if (materials.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Ders Materyalleri
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">Bu derste henüz materyal bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        Ders Materyalleri ({materials.length})
      </h3>
      
      <div className="space-y-3">
        {materials.map((material) => {
          const FileIcon = getFileIcon(material.file_type);
          const isDownloading = downloadingId === material.id;
          
          return (
            <div 
              key={material.id} 
              className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-all"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              
              {/* Material Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate pr-2">
                  {material.title}
                </h4>
                {material.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {material.description}
                  </p>
                )}
                
                {/* File Details */}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getFileTypeColor(material.file_type)}`}>
                    {material.file_type.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(material.file_size)}
                  </span>
                  {material.download_count && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {material.download_count} indirme
                    </span>
                  )}
                </div>
                
                {/* File Name */}
                <div className="text-xs text-gray-400 mt-1 truncate">
                  📎 {material.file_name}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex-shrink-0 flex gap-2">
                {/* Preview Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(material)}
                  className="px-3 py-1 h-8 text-xs"
                  title="Önizle"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                
                {/* Download Button */}
                <Button
                  onClick={() => handleDownload(material)}
                  disabled={isDownloading}
                  size="sm"
                  className="px-3 py-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  title="İndir"
                >
                  {isDownloading ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Download All Button */}
      {materials.length > 1 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={() => {
              // Tüm materyalleri zip olarak indir
              console.log('Downloading all materials...');
            }}
          >
            <Archive className="h-4 w-4" />
            Tüm Materyalleri İndir (ZIP)
          </Button>
        </div>
      )}
    </div>
  );
};

export default LessonMaterials;