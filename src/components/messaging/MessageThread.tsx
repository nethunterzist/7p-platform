'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages, useTypingIndicators } from '@/lib/useMessaging';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  MessageSquare,
  CheckCheck,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageWithStatus } from '@/lib/messaging';

interface MessageThreadProps {
  conversationId: string;
  onConversationUpdate?: () => void;
  className?: string;
}

/**
 * Message thread component with real-time updates
 * Features: Message bubbles, typing indicators, auto-scroll, message status
 */
export function MessageThread({ 
  conversationId, 
  onConversationUpdate,
  className 
}: MessageThreadProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Load messages with real-time updates
  const {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    sendMessage,
    editMessage,
    deleteMessage,
    markAllAsRead
  } = useMessages({
    conversationId,
    initialLimit: 50,
    autoMarkAsRead: true,
    enableRealTime: true
  });

  // Typing indicators
  const {
    typingUsers,
    typingText,
    isAnyoneTyping,
    startTyping,
    stopTyping
  } = useTypingIndicators(conversationId);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (autoScroll || force)) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
      setShowScrollButton(false);
    }
  }, [autoScroll]);

  // Handle scroll events to manage auto-scroll behavior
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom && messages.length > 0);
    
    // Load more messages when scrolling to top
    if (scrollTop < 100 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore, messages.length]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isNewMessage = lastMessage.id !== lastMessageIdRef.current;
      
      if (isNewMessage) {
        lastMessageIdRef.current = lastMessage.id;
        
        // Auto-scroll if user is at bottom or it's their own message
        const currentUserId = 'current-user-id'; // This should come from auth context
        if (autoScroll || lastMessage.sender.id === currentUserId) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    }
  }, [messages, autoScroll, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!hasScrolledToBottom && messages.length > 0 && !loading) {
      setTimeout(() => {
        scrollToBottom(true);
        setHasScrolledToBottom(true);
      }, 100);
    }
  }, [messages.length, loading, hasScrolledToBottom, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = async (content: string, file?: File) => {
    try {
      await sendMessage({ content }, file);
      onConversationUpdate?.();
      
      // Force scroll to bottom after sending
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      onConversationUpdate?.();
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      onConversationUpdate?.();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Mesajlar Yüklenemedi</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={refresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Yeniden Dene
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state (initial load)
  if (loading && messages.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Mesajlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupMessagesByDate = (messages: MessageWithStatus[]) => {
    const groups: Record<string, MessageWithStatus[]> = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);
  const dateKeys = Object.keys(groupedMessages).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Format date for display
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Messages Area */}
      <div className="flex-1 relative">
        <ScrollArea 
          className="h-full"
          onScrollCapture={handleScroll}
        >
          <div ref={scrollAreaRef} className="p-4 space-y-4">
            {/* Load more indicator */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loading}
                  className="text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    '                    Daha Fazla Mesaj Yükle'
                  )}
                </Button>
              </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Konuşma Başlıyor</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  İlk mesajınızı göndererek konuşmayı başlatın.
                </p>
              </div>
            )}

            {/* Message groups by date */}
            {dateKeys.map(dateKey => (
              <div key={dateKey} className="space-y-4">
                {/* Date header */}
                <div className="flex items-center justify-center py-2">
                  <Badge variant="secondary" className="text-xs px-3 py-1">
                    {formatDateHeader(dateKey)}
                  </Badge>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {groupedMessages[dateKey].map((message, index) => {
                    const prevMessage = index > 0 ? groupedMessages[dateKey][index - 1] : null;
                    const nextMessage = index < groupedMessages[dateKey].length - 1 
                      ? groupedMessages[dateKey][index + 1] 
                      : null;
                    
                    const isFirstInGroup = !prevMessage || 
                      prevMessage.sender.id !== message.sender.id ||
                      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5min
                    
                    const isLastInGroup = !nextMessage || 
                      nextMessage.sender.id !== message.sender.id ||
                      new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 300000; // 5min

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isAnyoneTyping && (
              <TypingIndicator
                users={typingUsers}
                text={typingText}
              />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => scrollToBottom(true)}
              className="rounded-full shadow-lg"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Message Composer */}
      <div className="border-t bg-card">
        <MessageComposer
          onSendMessage={handleSendMessage}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          placeholder="Mesajınızı yazın..."
          disabled={loading}
        />
      </div>
    </div>
  );
}