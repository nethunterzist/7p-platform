'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useFileUpload } from '@/lib/useMessaging';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Paperclip, 
  Image, 
  X, 
  File, 
  Loader2,
  Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSendMessage: (content: string, file?: File) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

/**
 * Message composition component with file upload
 * Features: Text input, file drag & drop, typing indicators, send button
 */
export function MessageComposer({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  placeholder = "Mesajınızı yazın...",
  disabled = false,
  maxLength = 10000,
  className
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { uploading, progress, error: uploadError, resetUploadState } = useFileUpload();

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // Handle text input change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      adjustTextareaHeight();
      
      // Handle typing indicators
      if (value.trim()) {
        onStartTyping();
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set new timeout to stop typing after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
          onStopTyping();
        }, 3000);
      } else {
        onStopTyping();
      }
    }
  };

  // Handle key press events
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle message sending
  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage && !selectedFile) return;
    if (isSending || disabled) return;

    setIsSending(true);
    onStopTyping();

    try {
      await onSendMessage(trimmedMessage || '[Dosya]', selectedFile || undefined);
      
      // Clear form
      setMessage('');
      setSelectedFile(null);
      resetUploadState();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan büyük olamaz.');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Desteklenmeyen dosya türü. Lütfen resim, PDF, Word veya Excel dosyası seçin.');
      return;
    }

    setSelectedFile(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    resetUploadState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onStopTyping();
    };
  }, [onStopTyping]);

  const canSend = (message.trim() || selectedFile) && !isSending && !disabled;
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={cn("p-4", className)}>
      <Card className={cn(
        "p-4 transition-all duration-200",
        isDragging && "border-primary bg-primary/5",
        uploadError && "border-destructive"
      )}>
        {/* File drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <Paperclip className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Dosyayı buraya bırakın</p>
            </div>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="space-y-3"
        >
          {/* Selected file preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(selectedFile)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              
              {uploading && (
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="w-20" />
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
              )}
              
              {!uploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeSelectedFile}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {uploadError}
            </div>
          )}

          {/* Message input */}
          <div className="flex gap-3 items-end">
            {/* Attachment button */}
            <div className="flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
                className="hidden"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isSending}
                title="Dosya ekle"
                className="h-10 w-10"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "min-h-[44px] max-h-[200px] resize-none pr-16",
                  "focus-visible:ring-1 focus-visible:ring-ring"
                )}
                rows={1}
              />
              
              {/* Character counter */}
              {isNearLimit && (
                <div className="absolute bottom-2 right-2">
                  <Badge 
                    variant={characterCount >= maxLength ? "destructive" : "secondary"}
                    className="text-xs px-1.5 py-0"
                  >
                    {characterCount}/{maxLength}
                  </Badge>
                </div>
              )}
            </div>

            {/* Send button */}
            <Button
              onClick={handleSendMessage}
              disabled={!canSend}
              size="icon"
              className={cn(
                "h-10 w-10 transition-all duration-200",
                canSend && "bg-primary hover:bg-primary/90"
              )}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Help text */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Göndermek için <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>, 
              yeni satır için <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd>
            </span>
            {characterCount > 0 && !isNearLimit && (
              <span className="text-sm text-muted-foreground">
                {characterCount} karakter
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}