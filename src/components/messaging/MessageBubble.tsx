'use client';

import React, { useState, memo } from 'react';
import { MessageWithStatus } from '@/lib/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MessageEditDialog } from './MessageEditDialog';
import { AttachmentPreview } from './AttachmentPreview';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Reply,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface MessageBubbleProps {
  message: MessageWithStatus;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onReply?: (message: MessageWithStatus) => void;
  className?: string;
}

/**
 * Individual message bubble component
 * Features: Message content, attachments, status indicators, edit/delete actions
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  isFirstInGroup,
  isLastInGroup,
  onEdit,
  onDelete,
  onReply,
  className
}: MessageBubbleProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Mock current user ID - in real app, get from auth context
  const currentUserId = 'current-user-id'; // Replace with actual current user ID
  const isOwnMessage = message.sender.id === currentUserId;
  const hasAttachments = message.attachments && message.attachments.length > 0;

  // Generate sender initials for avatar
  const senderInitials = message.sender.full_name
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: tr
      });
    }
  };

  // Handle copy message
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = (newContent: string) => {
    onEdit(message.id, newContent);
    setShowEditDialog(false);
  };

  // Handle message deletion
  const handleDeleteMessage = () => {
    if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      onDelete(message.id);
    }
  };

  // Get message status icon
  const getStatusIcon = () => {
    if (isOwnMessage) {
      if (message.is_read) {
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      } else {
        return <Check className="h-3 w-3 text-muted-foreground" />;
      }
    }
    return null;
  };

  // Check if message is editable (within 24 hours and not deleted)
  const isEditable = isOwnMessage && !message.is_deleted && 
    (Date.now() - new Date(message.created_at).getTime()) < 24 * 60 * 60 * 1000;

  // Check if message is deletable
  const isDeletable = isOwnMessage && !message.is_deleted;

  return (
    <div
      className={cn(
        "group flex gap-3 max-w-[85%] transition-all duration-200",
        isOwnMessage ? "ml-auto flex-row-reverse" : "mr-auto",
        !isFirstInGroup && "mt-1",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar (only show for first message in group and if not own message) */}
      {!isOwnMessage && isFirstInGroup && (
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={message.sender.avatar_url || undefined} 
              alt={message.sender.full_name}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {senderInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Spacer for grouped messages */}
      {!isOwnMessage && !isFirstInGroup && (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Message content */}
      <div className={cn(
        "flex flex-col gap-1 min-w-0",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {/* Sender name (only for first message in group and if not own message) */}
        {!isOwnMessage && isFirstInGroup && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">
              {message.sender.full_name}
            </span>
            {message.sender.is_admin && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Eğitmen
              </Badge>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className={cn(
          "relative rounded-2xl px-4 py-2 max-w-md break-words",
          "shadow-sm border transition-all duration-200",
          isOwnMessage ? (
            "bg-primary text-primary-foreground ml-8"
          ) : (
            "bg-card text-card-foreground mr-8"
          ),
          isFirstInGroup && !isOwnMessage && "rounded-tl-md",
          isFirstInGroup && isOwnMessage && "rounded-tr-md",
          message.is_deleted && "opacity-60"
        )}>
          {/* Edited indicator */}
          {message.is_edited && (
            <div className="absolute -top-2 -right-2">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                düzenlendi
              </Badge>
            </div>
          )}

          {/* Message content */}
          <div className="space-y-2">
            {/* Reply indicator (if this is a reply) */}
            {message.parent_message_id && (
              <div className={cn(
                "text-xs opacity-75 border-l-2 pl-2",
                isOwnMessage ? "border-primary-foreground/30" : "border-muted-foreground/30"
              )}>
                Bir mesaja yanıt
              </div>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <div className="space-y-2">
                {message.attachments!.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    isOwnMessage={isOwnMessage}
                  />
                ))}
              </div>
            )}

            {/* Text content */}
            {message.content && !message.is_deleted && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            )}

            {/* Deleted message indicator */}
            {message.is_deleted && (
              <div className={cn(
                "flex items-center gap-2 text-xs italic",
                isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                <AlertCircle className="h-3 w-3" />
                                Bu mesaj silindi
              </div>
            )}
          </div>

          {/* Message actions (show on hover) */}
          {(isHovered || showEditDialog) && !message.is_deleted && (
            <div className={cn(
              "absolute top-0 flex items-center gap-1",
              isOwnMessage ? "-left-12" : "-right-12"
            )}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-background shadow-md"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
                  <DropdownMenuItem onClick={handleCopyMessage}>
                    <Copy className="mr-2 h-3 w-3" />
                    Kopyala
                  </DropdownMenuItem>
                  
                  {onReply && (
                    <DropdownMenuItem onClick={() => onReply(message)}>
                      <Reply className="mr-2 h-3 w-3" />
                      Yanıtla
                    </DropdownMenuItem>
                  )}
                  
                  {(isEditable || isDeletable) && <DropdownMenuSeparator />}
                  
                  {isEditable && (
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Düzenle
                    </DropdownMenuItem>
                  )}
                  
                  {isDeletable && (
                    <DropdownMenuItem 
                      onClick={handleDeleteMessage}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Sil
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Message metadata (timestamp and status) */}
        {isLastInGroup && (
          <div className={cn(
            "flex items-center gap-1 px-1 text-xs text-muted-foreground",
            isOwnMessage && "flex-row-reverse"
          )}>
            <span>{formatTime(message.created_at)}</span>
            {getStatusIcon()}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <MessageEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        message={message}
        onSave={handleEditMessage}
      />
    </div>
  );
});