'use client';

import React, { useState, useEffect } from 'react';
import { useConversations, useMessages, useConversationSearch } from '@/lib/useMessaging';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { NewConversationModal } from './NewConversationModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, Search, Settings, Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageCenterProps {
  className?: string;
  defaultConversationId?: string;
}

/**
 * Main messaging interface component
 * Features: Conversation list sidebar, message thread view, real-time updates
 */
export function MessageCenter({ className, defaultConversationId }: MessageCenterProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    defaultConversationId || null
  );
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Load conversations with filters
  const { 
    conversations, 
    loading: conversationsLoading, 
    error: conversationsError,
    refresh: refreshConversations,
    createConversation,
    archiveConversation,
    muteConversation
  } = useConversations({
    filters: { archived: showArchived },
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Search functionality
  const {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    groupedConversations,
    hasResults,
    resultCount
  } = useConversationSearch(conversations);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [selectedConversationId, filteredConversations]);

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsMobileSidebarOpen(false); // Close mobile sidebar
  };

  // Handle new conversation creation
  const handleNewConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowNewConversation(false);
    refreshConversations();
  };

  // Calculate total unread count
  const totalUnreadCount = filteredConversations.reduce(
    (sum, conv) => sum + conv.unread_count, 
    0
  );

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Sidebar - Conversation List */}
      <div className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        // Desktop: always visible
        "hidden md:flex md:w-80",
        // Mobile: overlay when open
        isMobileSidebarOpen && "fixed inset-y-0 left-0 z-50 w-80 md:relative"
      )}>
        {/* Sidebar Header */}
        <div className="flex flex-col gap-4 p-4 border-b">
          {/* Title and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">Mesajlarım</h1>
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="min-w-[20px] h-5 text-xs">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowArchived(!showArchived)}
                className={cn(showArchived && "bg-accent")}
                title={showArchived ? "Aktif Konuşmalar" : "Arşivlenmiş Konuşmalar"}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewConversation(true)}
                title="Yeni Konuşma"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Konuşmalarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {showArchived ? 'Arşivlenmiş' : 'Aktif'} konuşmalar
              {searchQuery && ` (${resultCount} sonuç)`}
            </span>
            {conversationsLoading && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={filteredConversations}
            groupedConversations={groupedConversations}
            selectedConversationId={selectedConversationId}
            loading={conversationsLoading}
            error={conversationsError}
            onConversationSelect={handleConversationSelect}
            onArchiveConversation={archiveConversation}
            onMuteConversation={muteConversation}
            showArchived={showArchived}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Main Content - Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Mobile header */}
            <div className="md:hidden flex items-center gap-3 p-4 border-b bg-card">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <h1 className="font-semibold">Mesajlar</h1>
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="min-w-[20px] h-5 text-xs">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Badge>
              )}
            </div>

            {/* Message Thread */}
            <MessageThread
              conversationId={selectedConversationId}
              className="flex-1"
              onConversationUpdate={refreshConversations}
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <Card className="p-8 max-w-md mx-4 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Mesajlaşmaya Başlayın</h3>
                  <p className="text-muted-foreground text-sm">
                    Eğitmenlerinizle iletişim kurmak için bir konuşma seçin veya yeni bir konuşma başlatın.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowNewConversation(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Konuşma Başlat
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={handleNewConversationCreated}
      />
    </div>
  );
}