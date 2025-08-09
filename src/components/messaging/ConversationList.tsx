'use client';

import React, { memo } from 'react';
import { ConversationWithMetadata } from '@/lib/messaging';
import { ConversationItem } from './ConversationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Archive, Inbox, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: ConversationWithMetadata[];
  groupedConversations: Record<string, ConversationWithMetadata[]>;
  selectedConversationId: string | null;
  loading: boolean;
  error: string | null;
  onConversationSelect: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string, archived: boolean) => void;
  onMuteConversation: (conversationId: string, muted: boolean) => void;
  showArchived: boolean;
  searchQuery: string;
  className?: string;
}

/**
 * Conversation list sidebar component
 * Features: Grouped conversations, search results, archive controls
 */
export const ConversationList = memo(function ConversationList({
  conversations,
  groupedConversations,
  selectedConversationId,
  loading,
  error,
  onConversationSelect,
  onArchiveConversation,
  onMuteConversation,
  showArchived,
  searchQuery,
  className
}: ConversationListProps) {
  // Helper function to format date group headers
  const formatDateGroup = (dateKey: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateKeyDate = new Date(dateKey);
    
    if (dateKey === today.toDateString()) {
      return 'Bugün';
    } else if (dateKey === yesterday.toDateString()) {
      return 'Dün';
    } else if (dateKeyDate > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      return 'Bu Hafta';
    } else if (dateKeyDate > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      return 'Bu Ay';
    } else {
      return 'Daha Eski';
    }
  };

  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 max-w-sm text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-3">
                <MessageCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Konuşmalar Yüklenemedi</h3>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Yenile
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && conversations.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Konuşmalar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 max-w-sm text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-muted p-3">
                {showArchived ? (
                  <Archive className="h-6 w-6 text-muted-foreground" />
                ) : searchQuery ? (
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Inbox className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">
                  {showArchived 
                    ? 'Arşivlenmiş Konuşma Yok'
                    : searchQuery 
                      ? 'Sonuç Bulunamadı'
                      : 'Henüz Konuşma Yok'
                  }
                </h3>
                <p className="text-xs text-muted-foreground">
                  {showArchived 
                    ? 'Arşivlediğiniz konuşmalar burada görünecek.'
                    : searchQuery 
                      ? `"${searchQuery}" için sonuç bulunamadı.`
                      : 'Eğitmenlerinizle yeni bir konuşma başlatın.'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show search results without grouping if there's a search query
  if (searchQuery) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                onClick={() => onConversationSelect(conversation.id)}
                onArchive={(archived) => onArchiveConversation(conversation.id, archived)}
                onMute={(muted) => onMuteConversation(conversation.id, muted)}
                showArchived={showArchived}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Show grouped conversations
  const groupKeys = Object.keys(groupedConversations).sort((a, b) => {
    // Sort by date, most recent first
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {groupKeys.map((dateKey) => {
            const groupConversations = groupedConversations[dateKey];
            
            if (groupConversations.length === 0) return null;

            return (
              <div key={dateKey} className="mb-4">
                {/* Date Group Header */}
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {formatDateGroup(dateKey)}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                    {groupConversations.length}
                  </Badge>
                </div>

                {/* Conversations in Group */}
                <div className="space-y-1">
                  {groupConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={conversation.id === selectedConversationId}
                      onClick={() => onConversationSelect(conversation.id)}
                      onArchive={(archived) => onArchiveConversation(conversation.id, archived)}
                      onMute={(muted) => onMuteConversation(conversation.id, muted)}
                      showArchived={showArchived}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Loading indicator for additional conversations */}
          {loading && conversations.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Güncelleniyor...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});