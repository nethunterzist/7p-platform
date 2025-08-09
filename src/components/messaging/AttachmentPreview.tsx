'use client';

import React, { useState } from 'react';
import { MessageAttachment } from '@/lib/messaging';
import { getAttachmentUrl } from '@/lib/messaging';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  File, 
  Image, 
  FileText, 
  Download, 
  Eye, 
  ExternalLink,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  attachment: MessageAttachment;
  isOwnMessage: boolean;
  className?: string;
}

/**
 * Attachment preview component with download functionality
 * Features: File type icons, preview for images, download links
 */
export function AttachmentPreview({ 
  attachment, 
  isOwnMessage,
  className 
}: AttachmentPreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get file type icon
  const getFileIcon = () => {
    const mimeType = attachment.mime_type;
    
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className="h-4 w-4" />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <File className="h-4 w-4" />;
    }
    
    return <File className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  // Handle file download/preview
  const handleFileAccess = async (forDownload = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const url = await getAttachmentUrl(attachment.id);
      
      if (forDownload) {
        // Download file
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.original_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Preview or open file
        if (attachment.mime_type.startsWith('image/')) {
          setPreviewUrl(url);
          setShowPreview(true);
        } else {
          window.open(url, '_blank');
        }
      }
    } catch (error) {
      console.error('Failed to access file:', error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const isImage = attachment.mime_type.startsWith('image/');

  return (
    <>
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
        "hover:bg-accent/50 cursor-pointer",
        isOwnMessage ? "bg-primary-foreground/10" : "bg-muted/50",
        className
      )}>
        {/* File icon and type */}
        <div className="flex-shrink-0">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg",
            isOwnMessage ? "bg-primary-foreground/20" : "bg-muted"
          )}>
            {getFileIcon()}
          </div>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">
              {attachment.original_filename}
            </h4>
            <Badge 
              variant="secondary" 
              className="text-xs px-1.5 py-0 flex-shrink-0"
            >
              {getFileExtension(attachment.original_filename)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(attachment.file_size)}</span>
            {attachment.is_uploaded && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                Yüklendi
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isImage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleFileAccess(false);
              }}
              disabled={isLoading}
              title="Önizle"
              className="h-8 w-8"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleFileAccess(true);
            }}
            disabled={isLoading}
                          title="İndir"
            className="h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>

          {!isImage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleFileAccess(false);
              }}
              disabled={isLoading}
              title="Aç"
              className="h-8 w-8"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Image preview modal */}
      {showPreview && previewUrl && isImage && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewUrl}
              alt={attachment.original_filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
            
            {/* Close button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {/* Download button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleFileAccess(true);
              }}
              className="absolute top-4 right-16"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}