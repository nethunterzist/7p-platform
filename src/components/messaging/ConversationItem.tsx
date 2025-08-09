'use client';

import React, { memo } from 'react';
import { ConversationWithMetadata } from '@/lib/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Archive, 
  ArchiveRestore, 
  Volume2, 
  VolumeX,
  GraduationCap,
  User,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: ConversationWithMetadata;
  isSelected: boolean;
  onClick: () => void;
  onArchive: (archived: boolean) => void;
  onMute: (muted: boolean) => void;
  showArchived: boolean;
  searchQuery?: string;
  className?: string;
}

/**
 * Individual conversation item component
 * Features: Participant info, last message preview, unread badge, context menu
 */
export const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onArchive,
  onMute,
  showArchived,
  searchQuery,
  className
}: ConversationItemProps) {
  const { other_participant, last_message, unread_count, last_message_at } = conversation;

  // Check if user is muted
  const isMuted = conversation.muted_by_participant_1 || conversation.muted_by_participant_2;
  
  // Generate participant initials for avatar fallback
  const participantInitials = other_participant.full_name
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format last message timestamp
  const formattedTime = formatDistanceToNow(new Date(last_message_at), {
    addSuffix: true,
    locale: tr
  });

  // Truncate last message content
  const truncateMessage = (content: string, maxLength: number = 60): string => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  // Highlight search term in text
  const highlightSearchTerm = (text: string, term: string): React.ReactNode => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 text-foreground">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Handle context menu actions
  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(!showArchived);
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMute(!isMuted);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-accent/50 active:bg-accent/70",
        isSelected && "bg-accent border border-accent-foreground/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage 
            src={other_participant.avatar_url || undefined} 
            alt={other_participant.full_name}
          />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {participantInitials}
          </AvatarFallback>
        </Avatar>
        
        {/* Role indicator */}
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1">
          {other_participant.is_admin ? (
            <GraduationCap className="h-3 w-3 text-primary" title="Eğitmen" />
          ) : (
            <User className="h-3 w-3 text-muted-foreground" title="Öğrenci" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name and timestamp */}
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-medium text-sm truncate",
            unread_count > 0 && "font-semibold"
          )}>
            {searchQuery 
              ? highlightSearchTerm(other_participant.full_name, searchQuery)
              : other_participant.full_name
            }
          </h3>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {isMuted && (
              <VolumeX className="h-3 w-3 text-muted-foreground" title="Sessize alınmış" />
            )}
            <span className="text-xs text-muted-foreground">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Last message preview */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-sm text-muted-foreground truncate",
            unread_count > 0 && "text-foreground font-medium"
          )}>
            {last_message ? (
              <>
                {last_message.message_type === 'attachment' && '📎 '}
                {searchQuery 
                  ? highlightSearchTerm(truncateMessage(last_message.content), searchQuery)
                  : truncateMessage(last_message.content)
                }
              </>
            ) : (
              <span className="italic">Henüz mesaj yok</span>
            )}
          </p>
          
          {/* Unread badge */}
          {unread_count > 0 && (
            <Badge 
              variant="destructive" 
              className="min-w-[20px] h-5 text-xs font-medium"
            >
              {unread_count > 99 ? '99+' : unread_count}
            </Badge>
          )}
        </div>
      </div>

      {/* Context menu */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Konuşma seçenekleri</span>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleMute}>
              {isMuted ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Sesi Aç
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Sessize Al
                </>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleArchive}>
              {showArchived ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Arşivden Çıkar
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Arşivle
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Visual indicators */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
        )}
        
        {/* Unread indicator */}
        {unread_count > 0 && !isSelected && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
        )}
      </div>
    </div>
  );
});