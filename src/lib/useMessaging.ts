/**
 * 7P Education Platform - Messaging React Hooks
 * Custom React hooks for messaging functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessageAsRead,
  markConversationAsRead,
  createConversation,
  getTotalUnreadCount,
  subscribeToUserMessages,
  subscribeToReadStatus,
  uploadMessageAttachment,
  editMessage,
  deleteMessage,
  searchMessages,
  updateConversationArchiveStatus,
  updateConversationMuteStatus,
  type ConversationWithMetadata,
  type MessageWithStatus,
  type SendMessageOptions,
  type ConversationFilters,
  type PaginationOptions,
  MessagingError
} from './messaging';

import {
  updateTypingIndicator,
  subscribeToTypingIndicators,
  handleMessagingError,
  filterConversations,
  groupConversationsByDate,
  type TypingIndicator
} from './messaging-utils';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface UseConversationsOptions {
  filters?: ConversationFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseMessagesOptions {
  conversationId: string;
  initialLimit?: number;
  autoMarkAsRead?: boolean;
  enableRealTime?: boolean;
}

export interface UseMessagingState {
  loading: boolean;
  error: string | null;
  data: any;
}

export interface TypingState {
  [userId: string]: {
    isTyping: boolean;
    fullName: string;
    lastTyped: Date;
  };
}

// =============================================================================
// CONVERSATION HOOKS
// =============================================================================

/**
 * Hook for managing user conversations
 */
export function useConversations(options: UseConversationsOptions = {}) {
  const [state, setState] = useState<UseMessagingState & { data: ConversationWithMetadata[] }>({
    loading: true,
    error: null,
    data: []
  });

  const { filters, autoRefresh = false, refreshInterval = 30000 } = options;
  const intervalRef = useRef<NodeJS.Timeout>();

  const loadConversations = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const conversations = await getUserConversations(filters);
      
      setState({
        loading: false,
        error: null,
        data: conversations
      });
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'useConversations');
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [filters]);

  const createNewConversation = useCallback(async (participantId: string, title?: string) => {
    try {
      const conversation = await createConversation(participantId, title);
      
      // Refresh conversations list
      await loadConversations();
      
      return conversation;
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'createConversation');
      setState(prev => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, [loadConversations]);

  const archiveConversation = useCallback(async (conversationId: string, archived: boolean) => {
    try {
      await updateConversationArchiveStatus(conversationId, archived);
      await loadConversations();
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'archiveConversation');
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [loadConversations]);

  const muteConversation = useCallback(async (conversationId: string, muted: boolean) => {
    try {
      await updateConversationMuteStatus(conversationId, muted);
      await loadConversations();
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'muteConversation');
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [loadConversations]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadConversations, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, loadConversations]);

  // Real-time subscription for new messages
  useEffect(() => {
    const unsubscribe = subscribeToUserMessages(
      (message) => {
        // Refresh conversations when new message arrives
        loadConversations();
      },
      (error) => {
        console.error('Real-time subscription error:', error);
      }
    );

    return unsubscribe;
  }, [loadConversations]);

  return {
    conversations: state.data,
    loading: state.loading,
    error: state.error,
    refresh: loadConversations,
    createConversation: createNewConversation,
    archiveConversation,
    muteConversation
  };
}

/**
 * Hook for filtering and searching conversations
 */
export function useConversationSearch(conversations: ConversationWithMetadata[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState(conversations);
  const [groupedConversations, setGroupedConversations] = useState<Record<string, ConversationWithMetadata[]>>({});

  useEffect(() => {
    let result = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      result = filterConversations(conversations, searchQuery);
    }

    setFilteredConversations(result);
    setGroupedConversations(groupConversationsByDate(result));
  }, [conversations, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    groupedConversations,
    hasResults: filteredConversations.length > 0,
    resultCount: filteredConversations.length
  };
}

// =============================================================================
// MESSAGE HOOKS
// =============================================================================

/**
 * Hook for managing messages in a conversation
 */
export function useMessages(options: UseMessagesOptions) {
  const [state, setState] = useState<UseMessagingState & { 
    data: MessageWithStatus[];
    hasMore: boolean;
    pagination: { offset: number; limit: number };
  }>({
    loading: true,
    error: null,
    data: [],
    hasMore: true,
    pagination: { offset: 0, limit: options.initialLimit || 50 }
  });

  const { conversationId, autoMarkAsRead = true, enableRealTime = true } = options;

  const loadMessages = useCallback(async (reset: boolean = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const paginationOptions: PaginationOptions = reset 
        ? { limit: state.pagination.limit, offset: 0 }
        : { limit: state.pagination.limit, offset: state.pagination.offset };

      const messages = await getConversationMessages(conversationId, paginationOptions);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        data: reset ? messages : [...prev.data, ...messages],
        hasMore: messages.length === state.pagination.limit,
        pagination: {
          ...prev.pagination,
          offset: reset ? messages.length : prev.pagination.offset + messages.length
        }
      }));

      // Auto-mark unread messages as read
      if (autoMarkAsRead) {
        const unreadMessages = messages.filter(msg => !msg.is_read);
        for (const message of unreadMessages) {
          try {
            await markMessageAsRead(message.id);
          } catch (error) {
            console.warn('Failed to mark message as read:', message.id);
          }
        }
      }
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'useMessages');
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [conversationId, autoMarkAsRead, state.pagination.limit]);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    await loadMessages(false);
  }, [loadMessages, state.loading, state.hasMore]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, pagination: { ...prev.pagination, offset: 0 } }));
    await loadMessages(true);
  }, [loadMessages]);

  const sendNewMessage = useCallback(async (options: SendMessageOptions, file?: File) => {
    try {
      const message = await sendMessage(conversationId, options);
      
      // Upload file if provided
      if (file) {
        await uploadMessageAttachment(message.id, file);
      }
      
      // Refresh messages to show the new message
      await refresh();
      
      return message;
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'sendMessage');
      setState(prev => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, [conversationId, refresh]);

  const editMessageContent = useCallback(async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      await refresh();
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'editMessage');
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [refresh]);

  const deleteMessageById = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      await refresh();
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'deleteMessage');
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markConversationAsRead(conversationId);
      await refresh();
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'markAllAsRead');
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [conversationId, refresh]);

  // Initial load
  useEffect(() => {
    loadMessages(true);
  }, [conversationId]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealTime) return;

    const unsubscribe = subscribeToUserMessages(
      (message) => {
        if (message.conversation_id === conversationId) {
          refresh();
        }
      },
      (error) => {
        console.error('Real-time message subscription error:', error);
      }
    );

    return unsubscribe;
  }, [conversationId, enableRealTime, refresh]);

  // Read status subscription
  useEffect(() => {
    if (!enableRealTime) return;

    const unsubscribe = subscribeToReadStatus(
      conversationId,
      (update) => {
        // Update local state to reflect read status changes
        setState(prev => ({
          ...prev,
          data: prev.data.map(msg => 
            msg.id === update.messageId 
              ? { ...msg, is_read: update.isRead, read_at: update.readAt || null }
              : msg
          )
        }));
      },
      (error) => {
        console.error('Read status subscription error:', error);
      }
    );

    return unsubscribe;
  }, [conversationId, enableRealTime]);

  return {
    messages: state.data,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    refresh,
    sendMessage: sendNewMessage,
    editMessage: editMessageContent,
    deleteMessage: deleteMessageById,
    markAllAsRead
  };
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicators(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  const startTyping = useCallback(async () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      try {
        await updateTypingIndicator(conversationId, true);
      } catch (error) {
        console.error('Failed to start typing indicator:', error);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [conversationId]);

  const stopTyping = useCallback(async () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      try {
        await updateTypingIndicator(conversationId, false);
      } catch (error) {
        console.error('Failed to stop typing indicator:', error);
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [conversationId]);

  // Subscribe to typing indicators from other users
  useEffect(() => {
    const unsubscribe = subscribeToTypingIndicators(
      conversationId,
      (typing: TypingIndicator) => {
        setTypingUsers(prev => {
          const newState = { ...prev };
          
          if (typing.is_typing) {
            newState[typing.user_id] = {
              isTyping: true,
              fullName: typing.full_name,
              lastTyped: new Date(typing.last_typed_at)
            };
          } else {
            delete newState[typing.user_id];
          }
          
          return newState;
        });
      }
    );

    return unsubscribe;
  }, [conversationId]);

  // Clean up typing indicators that are too old
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      setTypingUsers(prev => {
        const newState = { ...prev };
        let hasChanges = false;

        Object.keys(newState).forEach(userId => {
          const typing = newState[userId];
          const timeDiff = now.getTime() - typing.lastTyped.getTime();
          
          // Remove typing indicators older than 5 seconds
          if (timeDiff > 5000) {
            delete newState[userId];
            hasChanges = true;
          }
        });

        return hasChanges ? newState : prev;
      });
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const typingUsersList = Object.entries(typingUsers).map(([userId, typing]) => ({
    userId,
    fullName: typing.fullName,
    isTyping: typing.isTyping
  }));

  const typingText = typingUsersList.length > 0 
    ? typingUsersList.length === 1
      ? `${typingUsersList[0].fullName} yazıyor...`
      : `${typingUsersList.length} kişi yazıyor...`
    : null;

  return {
    typingUsers: typingUsersList,
    typingText,
    isAnyoneTyping: typingUsersList.length > 0,
    startTyping,
    stopTyping
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook for searching messages
 */
export function useMessageSearch() {
  const [state, setState] = useState<UseMessagingState & { data: MessageWithStatus[] }>({
    loading: false,
    error: null,
    data: []
  });

  const [query, setQuery] = useState('');

  const searchForMessages = useCallback(async (searchQuery: string, limit?: number) => {
    if (!searchQuery.trim()) {
      setState({ loading: false, error: null, data: [] });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const results = await searchMessages(searchQuery, limit);
      
      setState({
        loading: false,
        error: null,
        data: results
      });
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'searchMessages');
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setState({ loading: false, error: null, data: [] });
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query !== '') {
        searchForMessages(query);
      } else {
        setState({ loading: false, error: null, data: [] });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, searchForMessages]);

  return {
    query,
    setQuery,
    results: state.data,
    loading: state.loading,
    error: state.error,
    hasResults: state.data.length > 0,
    clearSearch
  };
}

/**
 * Hook for unread message count
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const count = await getTotalUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'getTotalUnreadCount');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToUserMessages(
      () => {
        // Refresh count when new messages arrive
        refreshUnreadCount();
      },
      (error) => {
        console.error('Unread count subscription error:', error);
      }
    );

    return unsubscribe;
  }, [refreshUnreadCount]);

  return {
    unreadCount,
    loading,
    error,
    refresh: refreshUnreadCount
  };
}

/**
 * Hook for file uploads
 */
export function useFileUpload() {
  const [uploadState, setUploadState] = useState<{
    uploading: boolean;
    progress: number;
    error: string | null;
  }>({
    uploading: false,
    progress: 0,
    error: null
  });

  const uploadFile = useCallback(async (messageId: string, file: File) => {
    try {
      setUploadState({ uploading: true, progress: 0, error: null });
      
      // Simulate progress (in real implementation, you might use a different upload method with progress)
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 100);

      const attachment = await uploadMessageAttachment(messageId, file);
      
      clearInterval(progressInterval);
      setUploadState({ uploading: false, progress: 100, error: null });
      
      return attachment;
    } catch (error) {
      const errorMessage = handleMessagingError(error, 'uploadFile');
      setUploadState({
        uploading: false,
        progress: 0,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, []);

  const resetUploadState = useCallback(() => {
    setUploadState({ uploading: false, progress: 0, error: null });
  }, []);

  return {
    ...uploadState,
    uploadFile,
    resetUploadState
  };
}

/**
 * Hook for managing messaging errors
 */
export function useMessagingError() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = handleMessagingError(error, context);
    setError(errorMessage);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
    
    return errorMessage;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null
  };
}

// Export all hooks
export default {
  useConversations,
  useConversationSearch,
  useMessages,
  useTypingIndicators,
  useMessageSearch,
  useUnreadCount,
  useFileUpload,
  useMessagingError
};