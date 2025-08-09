import { supabase } from './supabase';
import type { ConversationWithMetadata, MessageWithStatus } from './messaging';

/**
 * 7P Education Platform - Messaging Utilities
 * Helper functions and utilities for the messaging system
 */

// =============================================================================
// TYPING INDICATOR UTILITIES
// =============================================================================

export interface TypingIndicator {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  last_typed_at: string;
  full_name: string;
}

/**
 * Updates typing indicator for a conversation
 * 
 * @param conversationId - ID of the conversation
 * @param isTyping - Whether user is currently typing
 * @returns Promise<void>
 */
export async function updateTypingIndicator(
  conversationId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Send typing indicator via real-time channel
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    if (isTyping) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: user.id,
          conversation_id: conversationId,
          is_typing: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: user.id,
          conversation_id: conversationId,
          is_typing: false,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error updating typing indicator:', error);
  }
}

/**
 * Subscribes to typing indicators for a conversation
 * 
 * @param conversationId - ID of the conversation
 * @param onTypingUpdate - Callback for typing updates
 * @returns Unsubscribe function
 */
export function subscribeToTypingIndicators(
  conversationId: string,
  onTypingUpdate: (typing: TypingIndicator) => void
): () => void {
  const channel = supabase.channel(`typing-${conversationId}`, {
    config: {
      broadcast: { self: false }
    }
  });

  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      const typingData = payload.payload as {
        user_id: string;
        conversation_id: string;
        is_typing: boolean;
        timestamp: string;
      };

      // Get user name from profiles (this could be cached)
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', typingData.user_id)
        .single()
        .then(({ data }) => {
          onTypingUpdate({
            user_id: typingData.user_id,
            conversation_id: typingData.conversation_id,
            is_typing: typingData.is_typing,
            last_typed_at: typingData.timestamp,
            full_name: data?.full_name || 'Bilinmeyen Kullanıcı'
          });
        });
    })
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// =============================================================================
// MESSAGE FORMATTING UTILITIES
// =============================================================================

/**
 * Formats message content for display (handles mentions, links, etc.)
 * 
 * @param content - Raw message content
 * @returns Formatted message content
 */
export function formatMessageContent(content: string): string {
  if (!content) return '';

  let formatted = content;

  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

  // Convert line breaks to HTML breaks
  formatted = formatted.replace(/\n/g, '<br>');

  // Handle basic @mentions (if implemented)
  const mentionRegex = /@(\w+)/g;
  formatted = formatted.replace(mentionRegex, '<span class="text-blue-600 font-medium">@$1</span>');

  return formatted;
}

/**
 * Formats file size for display
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Gets file icon based on MIME type
 * 
 * @param mimeType - MIME type of the file
 * @returns Icon name for the file type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'file-text';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-slides';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'archive';
  
  return 'file';
}

// =============================================================================
// CONVERSATION HELPERS
// =============================================================================

/**
 * Groups conversations by date for better UI organization
 * 
 * @param conversations - Array of conversations
 * @returns Grouped conversations by date
 */
export function groupConversationsByDate(
  conversations: ConversationWithMetadata[]
): Record<string, ConversationWithMetadata[]> {
  const groups: Record<string, ConversationWithMetadata[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const conversation of conversations) {
    const messageDate = new Date(conversation.last_message_at);
    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

    let groupKey: string;

    if (messageDateOnly.getTime() === today.getTime()) {
      groupKey = 'Bugün';
    } else if (messageDateOnly.getTime() === yesterday.getTime()) {
      groupKey = 'Dün';
    } else if (messageDate >= weekAgo) {
      groupKey = 'Bu Hafta';
    } else {
      groupKey = 'Daha Eski';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(conversation);
  }

  // Sort conversations within each group by last message time (newest first)
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
  });

  return groups;
}

/**
 * Filters conversations based on search query
 * 
 * @param conversations - Array of conversations to filter
 * @param query - Search query
 * @returns Filtered conversations
 */
export function filterConversations(
  conversations: ConversationWithMetadata[],
  query: string
): ConversationWithMetadata[] {
  if (!query || query.trim().length === 0) {
    return conversations;
  }

  const searchTerm = query.toLowerCase().trim();

  return conversations.filter(conversation => {
    // Search in participant name
    if (conversation.other_participant.full_name.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in conversation title
    if (conversation.title && conversation.title.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in last message content
    if (conversation.last_message && 
        conversation.last_message.content.toLowerCase().includes(searchTerm)) {
      return true;
    }

    return false;
  });
}

// =============================================================================
// MESSAGE HELPERS
// =============================================================================

/**
 * Groups messages by date for better UI organization
 * 
 * @param messages - Array of messages
 * @returns Grouped messages by date
 */
export function groupMessagesByDate(
  messages: MessageWithStatus[]
): Record<string, MessageWithStatus[]> {
  const groups: Record<string, MessageWithStatus[]> = {};

  for (const message of messages) {
    const messageDate = new Date(message.created_at);
    const dateKey = messageDate.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  }

  // Sort messages within each group by time (oldest first)
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });

  return groups;
}

/**
 * Formats relative time for message timestamps
 * 
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffMs = now.getTime() - messageTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Az önce';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`;
  } else {
    return messageTime.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Formats message time for display
 * 
 * @param timestamp - ISO timestamp string
 * @param includeDate - Whether to include date in format
 * @returns Formatted time string
 */
export function formatMessageTime(timestamp: string, includeDate: boolean = false): string {
  const messageTime = new Date(timestamp);
  
  if (includeDate) {
    return messageTime.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return messageTime.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates if user can send messages (rate limiting, permissions, etc.)
 * 
 * @param userId - User ID to validate
 * @param conversationId - Conversation ID
 * @returns Promise<boolean> - Whether user can send messages
 */
export async function canUserSendMessage(
  userId: string,
  conversationId: string
): Promise<boolean> {
  try {
    // Check if conversation exists and user is participant
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      return false;
    }

    if (conversation.participant_1_id !== userId && conversation.participant_2_id !== userId) {
      return false;
    }

    // Add additional validation logic here:
    // - Check if user is banned
    // - Check rate limits
    // - Check conversation status
    
    return true;
  } catch (error) {
    console.error('Error validating message permissions:', error);
    return false;
  }
}

/**
 * Checks if a file type is allowed for upload
 * 
 * @param mimeType - MIME type of the file
 * @returns Whether the file type is allowed
 */
export function isFileTypeAllowed(mimeType: string): boolean {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  return allowedTypes.includes(mimeType);
}

// =============================================================================
// NOTIFICATION HELPERS
// =============================================================================

/**
 * Gets notification preferences for a user
 * 
 * @param userId - User ID
 * @returns Promise<NotificationPreferences> - User's notification preferences
 */
export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sound_notifications: boolean;
  message_preview: boolean;
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    // This would typically come from a user_preferences table
    // For now, return default preferences
    return {
      email_notifications: true,
      push_notifications: true,
      sound_notifications: true,
      message_preview: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    // Return safe defaults
    return {
      email_notifications: false,
      push_notifications: false,
      sound_notifications: false,
      message_preview: false
    };
  }
}

/**
 * Checks if user should receive notification for a message
 * 
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @param senderId - ID of message sender
 * @returns Promise<boolean> - Whether to send notification
 */
export async function shouldNotifyUser(
  userId: string,
  conversationId: string,
  senderId: string
): Promise<boolean> {
  try {
    // Don't notify if user sent the message
    if (userId === senderId) {
      return false;
    }

    // Check if conversation is muted
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id, muted_by_participant_1, muted_by_participant_2')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const isParticipant1 = conversation.participant_1_id === userId;
      const isMuted = isParticipant1 ? 
        conversation.muted_by_participant_1 : 
        conversation.muted_by_participant_2;

      if (isMuted) {
        return false;
      }
    }

    // Check user notification preferences
    const preferences = await getNotificationPreferences(userId);
    
    return preferences.push_notifications || preferences.email_notifications;
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false;
  }
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

/**
 * Simple in-memory cache for frequently accessed data
 */
class MessageCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const messageCache = new MessageCache();

// Set up periodic cache cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    messageCache.cleanup();
  }, 5 * 60 * 1000); // Cleanup every 5 minutes
}

// =============================================================================
// ERROR BOUNDARY HELPERS
// =============================================================================

/**
 * Handles messaging errors gracefully
 * 
 * @param error - Error object
 * @param context - Context where error occurred
 * @returns User-friendly error message
 */
export function handleMessagingError(error: any, context: string): string {
  console.error(`Messaging error in ${context}:`, error);

  // Network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return 'Ağ bağlantısı sorunu. Lütfen internet bağlantınızı kontrol edin.';
  }

  // Authentication errors
  if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
    return 'Oturum süreniz dolmuş. Lütfen yeniden giriş yapın.';
  }

  // Validation errors
  if (error?.message?.includes('validation') || error?.message?.includes('invalid')) {
    return error.message || 'Girilen bilgiler geçerli değil.';
  }

  // File upload errors
  if (error?.message?.includes('upload') || error?.message?.includes('file')) {
    return 'Dosya yükleme hatası. Lütfen daha sonra tekrar deneyin.';
  }

  // Rate limiting
  if (error?.message?.includes('rate') || error?.message?.includes('limit')) {
    return 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.';
  }

  // Default error message
  return 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
}

export default {
  // Typing indicators
  updateTypingIndicator,
  subscribeToTypingIndicators,
  
  // Message formatting
  formatMessageContent,
  formatFileSize,
  getFileIcon,
  
  // Conversation helpers
  groupConversationsByDate,
  filterConversations,
  
  // Message helpers
  groupMessagesByDate,
  formatRelativeTime,
  formatMessageTime,
  
  // Validation helpers
  canUserSendMessage,
  isFileTypeAllowed,
  
  // Notification helpers
  getNotificationPreferences,
  shouldNotifyUser,
  
  // Cache and error handling
  messageCache,
  handleMessagingError
};