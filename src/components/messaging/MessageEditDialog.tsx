'use client';

import React, { useState, useEffect } from 'react';
import { MessageWithStatus } from '@/lib/messaging';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: MessageWithStatus;
  onSave: (newContent: string) => void;
}

/**
 * Message editing dialog component
 * Features: Content editing, character limit, save/cancel actions
 */
export function MessageEditDialog({
  open,
  onOpenChange,
  message,
  onSave
}: MessageEditDialogProps) {
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const maxLength = 10000;
  const characterCount = editedContent.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const hasChanges = editedContent.trim() !== message.content.trim();
  const canSave = editedContent.trim().length > 0 && hasChanges && characterCount <= maxLength;

  // Initialize content when dialog opens
  useEffect(() => {
    if (open) {
      setEditedContent(message.content);
    }
  }, [open, message.content]);

  // Handle save
  const handleSave = async () => {
    if (!canSave || isSaving) return;

    setIsSaving(true);
    
    try {
      await onSave(editedContent.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditedContent(message.content);
    onOpenChange(false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mesajı Düzenle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original message preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-2">Orijinal mesaj:</div>
            <p className="text-sm">{message.content}</p>
          </div>

          {/* Edit textarea */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Mesajınızı düzenleyin..."
                className={cn(
                  "min-h-[100px] resize-none",
                  isNearLimit && "border-warning"
                )}
                maxLength={maxLength}
                autoFocus
              />
              
              {/* Character counter */}
              {isNearLimit && (
                <div className="absolute bottom-2 right-2">
                  <Badge 
                    variant={characterCount >= maxLength ? "destructive" : "secondary"}
                    className="text-xs px-2 py-1"
                  >
                    {characterCount}/{maxLength}
                  </Badge>
                </div>
              )}
            </div>

            {/* Help text */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Kaydetmek için <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd>
              </span>
              {characterCount > 0 && !isNearLimit && (
                <span>{characterCount} karakter</span>
              )}
            </div>
          </div>

          {/* Change indicator */}
          {hasChanges && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Değişiklikler var</span>
            </div>
          )}

          {/* Editing rules */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Mesajlar gönderildikten sonra 24 saat içinde düzenlenebilir</p>
            <p>Düzenlenen mesajlar "düzenlendi" etiketi ile gösterilir</p>
            <p>Orijinal içerik saklanır</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            İptal
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}