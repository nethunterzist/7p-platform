import { supabase } from './supabase';

/**
 * 7P Education Platform - Direct Messaging API
 * Comprehensive messaging system for student-instructor communication
 * Features: Real-time messaging, file attachments, read status tracking
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  title?: string | null;
  last_message_id?: string | null;
  last_message_at: string;
  archived_by_participant_1: boolean;
  archived_by_participant_2: boolean;
  muted_by_participant_1: boolean;
  muted_by_participant_2: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMetadata extends Conversation {
  unread_count: number;
  other_participant: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    is_admin: boolean;
  };
  last_message?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    message_type: MessageType;
  } | null;
}

export type MessageType = 'text' | 'attachment' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  parent_message_id?: string | null;
  thread_depth: number;
  is_edited: boolean;
  edited_at?: string | null;
  original_content?: string | null;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageWithStatus extends Message {
  is_read: boolean;
  read_at?: string | null;
  sender: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    is_admin: boolean;
  };
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  storage_bucket: string;
  is_uploaded: boolean;
  upload_expires_at?: string | null;
  access_url?: string | null;
  access_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_id: string;
  is_read: boolean;
  read_at?: string | null;
  is_delivered: boolean;
  delivered_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  before_message_id?: string;
  after_message_id?: string;
}

export interface SendMessageOptions {
  content: string;
  message_type?: MessageType;
  parent_message_id?: string;
}

export interface ConversationFilters {
  archived?: boolean;
  muted?: boolean;
  has_unread?: boolean;
  participant_type?: 'student' | 'instructor';
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class MessagingError extends Error {
  public code: string;
  public details?: string;

  constructor(message: string, code: string, details?: string) {
    super(message);
    this.name = 'MessagingError';
    this.code = code;
    this.details = details;
  }
}

const TURKISH_ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'Giriş yapmanız gerekiyor',
  CONVERSATION_NOT_FOUND: 'Konuşma bulunamadı',
  MESSAGE_NOT_FOUND: 'Mesaj bulunamadı',
  UNAUTHORIZED_ACCESS: 'Bu işlem için yetkiniz yok',
  INVALID_PARTICIPANT: 'Geçersiz katılımcı',
  RATE_LIMIT_EXCEEDED: 'Çok fazla istek gönderdiniz, lütfen bekleyin',
  FILE_TOO_LARGE: 'Dosya boyutu çok büyük (maksimum 10MB)',
  INVALID_FILE_TYPE: 'Desteklenmeyen dosya türü',
  UPLOAD_FAILED: 'Dosya yükleme başarısız',
  MESSAGE_TOO_LONG: 'Mesaj çok uzun (maksimum 10000 karakter)',
  CONVERSATION_EXISTS: 'Bu kullanıcı ile zaten bir konuşmanız var',
  DATABASE_ERROR: 'Veritabanı hatası oluştu',
  NETWORK_ERROR: 'Ağ bağlantısı hatası',
  VALIDATION_ERROR: 'Girdi doğrulama hatası'
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the current authenticated user ID
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.NOT_AUTHENTICATED,
      'NOT_AUTHENTICATED',
      error?.message
    );
  }
  
  return user.id;
}

/**
 * Validates message content
 */
function validateMessageContent(content: string): void {
  if (!content || typeof content !== 'string') {
    throw new MessagingError(
      'Mesaj içeriği gereklidir',
      'VALIDATION_ERROR'
    );
  }
  
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new MessagingError(
      'Mesaj boş olamaz',
      'VALIDATION_ERROR'
    );
  }
  
  if (trimmedContent.length > 10000) {
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.MESSAGE_TOO_LONG,
      'MESSAGE_TOO_LONG'
    );
  }
}

/**
 * Validates file for upload
 */
function validateFile(file: File): void {
  // File size validation (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.FILE_TOO_LARGE,
      'FILE_TOO_LARGE'
    );
  }
  
  // File type validation
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.INVALID_FILE_TYPE,
      'INVALID_FILE_TYPE',
      `Desteklenen dosya türleri: ${allowedTypes.join(', ')}`
    );
  }
}

/**
 * Rate limiting check (simple implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, limit: number = 30, windowMs: number = 60000): void {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (userLimit.count >= limit) {
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      'RATE_LIMIT_EXCEEDED'
    );
  }
  
  userLimit.count++;
}

// =============================================================================
// CONVERSATION MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Creates a new conversation between current user and another participant
 * Ensures one participant is student and one is instructor
 * 
 * @param participantId - ID of the other participant
 * @param title - Optional conversation title
 * @returns Promise<Conversation> - The created conversation
 */
export async function createConversation(
  participantId: string, 
  title?: string
): Promise<Conversation> {
  try {
    const currentUserId = await getCurrentUserId();
    checkRateLimit(currentUserId, 10, 300000); // 10 conversations per 5 minutes
    
    // Validate participant ID
    if (!participantId || participantId === currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.INVALID_PARTICIPANT,
        'INVALID_PARTICIPANT'
      );
    }
    
    // Check if conversation already exists
    const existingConversation = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1_id.eq.${currentUserId},participant_2_id.eq.${participantId}),and(participant_1_id.eq.${participantId},participant_2_id.eq.${currentUserId})`)
      .single();
    
    if (existingConversation.data) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.CONVERSATION_EXISTS,
        'CONVERSATION_EXISTS'
      );
    }
    
    // Validate that participants have different roles (student vs instructor)
    const [currentUserProfile, participantProfile] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', currentUserId).single(),
      supabase.from('profiles').select('is_admin').eq('id', participantId).single()
    ]);
    
    if (currentUserProfile.error || participantProfile.error) {
      throw new MessagingError(
        'Kullanıcı profilleri doğrulanamadı',
        'VALIDATION_ERROR'
      );
    }
    
    const currentUserIsAdmin = currentUserProfile.data.is_admin || false;
    const participantIsAdmin = participantProfile.data.is_admin || false;
    
    if (currentUserIsAdmin === participantIsAdmin) {
      throw new MessagingError(
        'Konuşma sadece öğrenci ve eğitmen arasında oluşturulabilir',
        'INVALID_PARTICIPANT'
      );
    }
    
    // Create the conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: currentUserId,
        participant_2_id: participantId,
        title: title || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating conversation:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Conversation created successfully: ${data.id}`);
    return data;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in createConversation:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Gets all conversations for the current user with metadata
 * Includes unread message counts and participant information
 * 
 * @param filters - Optional filters for conversations
 * @returns Promise<ConversationWithMetadata[]> - Array of conversations with metadata
 */
export async function getUserConversations(
  filters: ConversationFilters = {}
): Promise<ConversationWithMetadata[]> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Build query with filters
    let query = supabase
      .from('conversations')
      .select(`
        *,
        participant_1:profiles!conversations_participant_1_id_fkey(id, full_name, avatar_url, is_admin),
        participant_2:profiles!conversations_participant_2_id_fkey(id, full_name, avatar_url, is_admin),
        last_message:messages!conversations_last_message_id_fkey(id, content, sender_id, created_at, message_type)
      `)
      .or(`participant_1_id.eq.${currentUserId},participant_2_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false });
    
    // Apply filters
    if (filters.archived !== undefined) {
      if (filters.archived) {
        query = query.or(`archived_by_participant_1.eq.true,archived_by_participant_2.eq.true`);
      } else {
        query = query.eq('archived_by_participant_1', false).eq('archived_by_participant_2', false);
      }
    }
    
    if (filters.muted !== undefined) {
      if (filters.muted) {
        query = query.or(`muted_by_participant_1.eq.true,muted_by_participant_2.eq.true`);
      } else {
        query = query.eq('muted_by_participant_1', false).eq('muted_by_participant_2', false);
      }
    }
    
    const { data: conversations, error } = await query;
    
    if (error) {
      console.error('Error fetching conversations:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    if (!conversations || conversations.length === 0) {
      return [];
    }
    
    // Get unread counts for each conversation
    const conversationIds = conversations.map(c => c.id);
    const { data: unreadCounts, error: unreadError } = await supabase
      .from('message_read_status')
      .select(`
        message_id,
        messages!inner(conversation_id, is_deleted)
      `)
      .eq('user_id', currentUserId)
      .eq('is_read', false)
      .in('messages.conversation_id', conversationIds)
      .eq('messages.is_deleted', false);
    
    if (unreadError) {
      console.warn('Error fetching unread counts:', unreadError);
    }
    
    // Group unread counts by conversation
    const unreadMap = new Map<string, number>();
    if (unreadCounts) {
      for (const item of unreadCounts) {
        const conversationId = item.messages?.conversation_id;
        if (conversationId) {
          unreadMap.set(conversationId, (unreadMap.get(conversationId) || 0) + 1);
        }
      }
    }
    
    // Transform conversations with metadata
    const result: ConversationWithMetadata[] = conversations.map(conv => {
      const isParticipant1 = conv.participant_1_id === currentUserId;
      const otherParticipant = isParticipant1 ? conv.participant_2 : conv.participant_1;
      const unreadCount = unreadMap.get(conv.id) || 0;
      
      // Apply participant type filter
      if (filters.participant_type) {
        const participantIsAdmin = otherParticipant?.is_admin || false;
        const isInstructor = participantIsAdmin;
        
        if (filters.participant_type === 'instructor' && !isInstructor) {
          return null;
        }
        if (filters.participant_type === 'student' && isInstructor) {
          return null;
        }
      }
      
      // Apply unread filter
      if (filters.has_unread !== undefined) {
        if (filters.has_unread && unreadCount === 0) {
          return null;
        }
        if (!filters.has_unread && unreadCount > 0) {
          return null;
        }
      }
      
      return {
        ...conv,
        unread_count: unreadCount,
        other_participant: {
          id: otherParticipant?.id || '',
          full_name: otherParticipant?.full_name || 'Bilinmeyen Kullanıcı',
          avatar_url: otherParticipant?.avatar_url || null,
          is_admin: otherParticipant?.is_admin || false
        },
        last_message: conv.last_message || null
      };
    }).filter(Boolean) as ConversationWithMetadata[];
    
    console.log(`Fetched ${result.length} conversations for user ${currentUserId}`);
    return result;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in getUserConversations:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Archives or unarchives a conversation for the current user
 * 
 * @param conversationId - ID of the conversation to archive
 * @param archived - Whether to archive (true) or unarchive (false)
 * @returns Promise<void>
 */
export async function updateConversationArchiveStatus(
  conversationId: string,
  archived: boolean
): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Get conversation to determine which participant field to update
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();
    
    if (fetchError || !conversation) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        'CONVERSATION_NOT_FOUND'
      );
    }
    
    // Check if user is a participant
    const isParticipant1 = conversation.participant_1_id === currentUserId;
    const isParticipant2 = conversation.participant_2_id === currentUserId;
    
    if (!isParticipant1 && !isParticipant2) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Update the appropriate archive field
    const updateField = isParticipant1 ? 'archived_by_participant_1' : 'archived_by_participant_2';
    
    const { error } = await supabase
      .from('conversations')
      .update({ [updateField]: archived })
      .eq('id', conversationId);
    
    if (error) {
      console.error('Error updating conversation archive status:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Conversation ${conversationId} ${archived ? 'archived' : 'unarchived'} by user ${currentUserId}`);
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in updateConversationArchiveStatus:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Mutes or unmutes a conversation for the current user
 * 
 * @param conversationId - ID of the conversation to mute
 * @param muted - Whether to mute (true) or unmute (false)
 * @returns Promise<void>
 */
export async function updateConversationMuteStatus(
  conversationId: string,
  muted: boolean
): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Get conversation to determine which participant field to update
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();
    
    if (fetchError || !conversation) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        'CONVERSATION_NOT_FOUND'
      );
    }
    
    // Check if user is a participant
    const isParticipant1 = conversation.participant_1_id === currentUserId;
    const isParticipant2 = conversation.participant_2_id === currentUserId;
    
    if (!isParticipant1 && !isParticipant2) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Update the appropriate mute field
    const updateField = isParticipant1 ? 'muted_by_participant_1' : 'muted_by_participant_2';
    
    const { error } = await supabase
      .from('conversations')
      .update({ [updateField]: muted })
      .eq('id', conversationId);
    
    if (error) {
      console.error('Error updating conversation mute status:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Conversation ${conversationId} ${muted ? 'muted' : 'unmuted'} by user ${currentUserId}`);
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in updateConversationMuteStatus:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// =============================================================================
// MESSAGE OPERATIONS FUNCTIONS
// =============================================================================

/**
 * Gets messages for a conversation with pagination and read status
 * 
 * @param conversationId - ID of the conversation
 * @param options - Pagination and filtering options
 * @returns Promise<MessageWithStatus[]> - Array of messages with status and sender info
 */
export async function getConversationMessages(
  conversationId: string,
  options: PaginationOptions = {}
): Promise<MessageWithStatus[]> {
  try {
    const currentUserId = await getCurrentUserId();
    const { limit = 50, offset = 0, before_message_id, after_message_id } = options;
    
    // Validate access to conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        'CONVERSATION_NOT_FOUND'
      );
    }
    
    if (conversation.participant_1_id !== currentUserId && conversation.participant_2_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Build query with pagination
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, is_admin),
        read_status:message_read_status!inner(is_read, read_at),
        attachments:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .eq('message_read_status.user_id', currentUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply cursor-based pagination if specified
    if (before_message_id) {
      const { data: beforeMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', before_message_id)
        .single();
      
      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at);
      }
    }
    
    if (after_message_id) {
      const { data: afterMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', after_message_id)
        .single();
      
      if (afterMessage) {
        query = query.gt('created_at', afterMessage.created_at);
      }
    }
    
    const { data: messages, error } = await query;
    
    if (error) {
      console.error('Error fetching messages:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    if (!messages) {
      return [];
    }
    
    // Transform messages with status and sender info
    const result: MessageWithStatus[] = messages.map(msg => ({
      ...msg,
      is_read: msg.read_status?.[0]?.is_read || false,
      read_at: msg.read_status?.[0]?.read_at || null,
      sender: {
        id: msg.sender?.id || '',
        full_name: msg.sender?.full_name || 'Bilinmeyen Kullanıcı',
        avatar_url: msg.sender?.avatar_url || null,
        is_admin: msg.sender?.is_admin || false
      },
      attachments: msg.attachments || []
    }));
    
    // Sort by created_at ascending for proper chronological order
    result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    console.log(`Fetched ${result.length} messages for conversation ${conversationId}`);
    return result;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in getConversationMessages:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Sends a new message in a conversation
 * 
 * @param conversationId - ID of the conversation
 * @param options - Message content and options
 * @returns Promise<Message> - The created message
 */
export async function sendMessage(
  conversationId: string,
  options: SendMessageOptions
): Promise<Message> {
  try {
    const currentUserId = await getCurrentUserId();
    checkRateLimit(currentUserId, 60, 60000); // 60 messages per minute
    
    const { content, message_type = 'text', parent_message_id } = options;
    
    // Validate message content
    validateMessageContent(content);
    
    // Validate access to conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        'CONVERSATION_NOT_FOUND'
      );
    }
    
    if (conversation.participant_1_id !== currentUserId && conversation.participant_2_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Validate parent message if threading
    let thread_depth = 0;
    if (parent_message_id) {
      const { data: parentMessage, error: parentError } = await supabase
        .from('messages')
        .select('thread_depth, conversation_id')
        .eq('id', parent_message_id)
        .single();
      
      if (parentError || !parentMessage) {
        throw new MessagingError(
          'Ana mesaj bulunamadı',
          'MESSAGE_NOT_FOUND'
        );
      }
      
      if (parentMessage.conversation_id !== conversationId) {
        throw new MessagingError(
          'Ana mesaj bu konuşmaya ait değil',
          'VALIDATION_ERROR'
        );
      }
      
      thread_depth = Math.min(parentMessage.thread_depth + 1, 5); // Max 5 levels deep
    }
    
    // Create the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content.trim(),
        message_type,
        parent_message_id: parent_message_id || null,
        thread_depth
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error sending message:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Message sent successfully: ${message.id} in conversation ${conversationId}`);
    return message;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in sendMessage:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Marks a message as read by the current user
 * 
 * @param messageId - ID of the message to mark as read
 * @returns Promise<void>
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Validate message exists and user has access
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        id, 
        conversation_id,
        conversations!inner(participant_1_id, participant_2_id)
      `)
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();
    
    if (msgError || !message) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.MESSAGE_NOT_FOUND,
        'MESSAGE_NOT_FOUND'
      );
    }
    
    const conversation = message.conversations;
    if (conversation.participant_1_id !== currentUserId && conversation.participant_2_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Update read status
    const { error } = await supabase
      .from('message_read_status')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .eq('user_id', currentUserId);
    
    if (error) {
      console.error('Error marking message as read:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Message ${messageId} marked as read by user ${currentUserId}`);
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in markMessageAsRead:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Marks all messages in a conversation as read by the current user
 * 
 * @param conversationId - ID of the conversation
 * @returns Promise<number> - Number of messages marked as read
 */
export async function markConversationAsRead(conversationId: string): Promise<number> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Validate access to conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        'CONVERSATION_NOT_FOUND'
      );
    }
    
    if (conversation.participant_1_id !== currentUserId && conversation.participant_2_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Mark all unread messages as read
    const { data, error } = await supabase
      .from('message_read_status')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', currentUserId)
      .eq('is_read', false)
      .in('message_id', 
        supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('is_deleted', false)
      )
      .select();
    
    if (error) {
      console.error('Error marking conversation as read:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    const markedCount = data?.length || 0;
    console.log(`Marked ${markedCount} messages as read in conversation ${conversationId}`);
    return markedCount;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in markConversationAsRead:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Edits a message (only by the sender)
 * 
 * @param messageId - ID of the message to edit
 * @param newContent - New content for the message
 * @returns Promise<Message> - The updated message
 */
export async function editMessage(messageId: string, newContent: string): Promise<Message> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Validate new content
    validateMessageContent(newContent);
    
    // Get message and validate ownership
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_id, content, is_deleted, created_at')
      .eq('id', messageId)
      .single();
    
    if (msgError || !message) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.MESSAGE_NOT_FOUND,
        'MESSAGE_NOT_FOUND'
      );
    }
    
    if (message.sender_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    if (message.is_deleted) {
      throw new MessagingError(
        'Silinmiş mesajlar düzenlenemez',
        'VALIDATION_ERROR'
      );
    }
    
    // Check if message is too old to edit (e.g., 24 hours)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (messageAge > maxEditAge) {
      throw new MessagingError(
        'Bu mesaj artık düzenlenemez (24 saat geçmiş)',
        'VALIDATION_ERROR'
      );
    }
    
    // Update the message
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({
        content: newContent.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
        original_content: message.content
      })
      .eq('id', messageId)
      .select()
      .single();
    
    if (error) {
      console.error('Error editing message:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Message ${messageId} edited successfully by user ${currentUserId}`);
    return updatedMessage;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in editMessage:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Soft deletes a message (only by the sender)
 * 
 * @param messageId - ID of the message to delete
 * @returns Promise<void>
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Get message and validate ownership
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_id, is_deleted')
      .eq('id', messageId)
      .single();
    
    if (msgError || !message) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.MESSAGE_NOT_FOUND,
        'MESSAGE_NOT_FOUND'
      );
    }
    
    if (message.sender_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    if (message.is_deleted) {
      throw new MessagingError(
        'Bu mesaj zaten silinmiş',
        'VALIDATION_ERROR'
      );
    }
    
    // Soft delete the message
    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUserId,
        content: '[Bu mesaj silindi]'
      })
      .eq('id', messageId);
    
    if (error) {
      console.error('Error deleting message:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    console.log(`Message ${messageId} deleted successfully by user ${currentUserId}`);
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in deleteMessage:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// =============================================================================
// FILE ATTACHMENT FUNCTIONS
// =============================================================================

/**
 * Uploads a file attachment for a message
 * 
 * @param messageId - ID of the message to attach the file to
 * @param file - The file to upload
 * @returns Promise<MessageAttachment> - The created attachment record
 */
export async function uploadMessageAttachment(
  messageId: string,
  file: File
): Promise<MessageAttachment> {
  try {
    const currentUserId = await getCurrentUserId();
    checkRateLimit(currentUserId, 10, 300000); // 10 uploads per 5 minutes
    
    // Validate file
    validateFile(file);
    
    // Validate message exists and user has access
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        id, 
        sender_id,
        conversation_id,
        conversations!inner(participant_1_id, participant_2_id)
      `)
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();
    
    if (msgError || !message) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.MESSAGE_NOT_FOUND,
        'MESSAGE_NOT_FOUND'
      );
    }
    
    const conversation = message.conversations;
    if (conversation.participant_1_id !== currentUserId && conversation.participant_2_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `${message.conversation_id}/${messageId}/${uniqueFilename}`;
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UPLOAD_FAILED,
        'UPLOAD_FAILED',
        uploadError.message
      );
    }
    
    // Create attachment record
    const { data: attachment, error: attachError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        storage_bucket: 'message-attachments',
        is_uploaded: true
      })
      .select()
      .single();
    
    if (attachError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('message-attachments')
        .remove([storagePath]);
      
      console.error('Error creating attachment record:', attachError);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        attachError.message
      );
    }
    
    console.log(`File uploaded successfully: ${attachment.id} for message ${messageId}`);
    return attachment;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in uploadMessageAttachment:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.UPLOAD_FAILED,
      'UPLOAD_FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Generates a pre-signed URL for accessing a file attachment
 * 
 * @param attachmentId - ID of the attachment
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - The pre-signed URL
 */
export async function getAttachmentUrl(
  attachmentId: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Validate attachment exists and user has access
    const { data: attachment, error: attachError } = await supabase
      .from('message_attachments')
      .select(`
        *,
        messages!inner(
          conversation_id,
          conversations!inner(participant_1_id, participant_2_id)
        )
      `)
      .eq('id', attachmentId)
      .single();
    
    if (attachError || !attachment) {
      throw new MessagingError(
        'Dosya bulunamadı',
        'MESSAGE_NOT_FOUND'
      );
    }
    
    const conversation = attachment.messages.conversations;
    if (conversation.participant_1_id !== currentUserId && conversation.participant_2_id !== currentUserId) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    // Generate pre-signed URL
    const { data, error } = await supabase.storage
      .from(attachment.storage_bucket)
      .createSignedUrl(attachment.storage_path, expiresIn);
    
    if (error || !data.signedUrl) {
      console.error('Error generating signed URL:', error);
      throw new MessagingError(
        'Dosya erişim URL\'si oluşturulamadı',
        'UPLOAD_FAILED',
        error?.message
      );
    }
    
    // Update attachment record with access URL and expiry
    const expiryTime = new Date(Date.now() + expiresIn * 1000).toISOString();
    await supabase
      .from('message_attachments')
      .update({
        access_url: data.signedUrl,
        access_expires_at: expiryTime
      })
      .eq('id', attachmentId);
    
    console.log(`Generated signed URL for attachment ${attachmentId}`);
    return data.signedUrl;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in getAttachmentUrl:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// =============================================================================
// REAL-TIME SUBSCRIPTION HELPERS
// =============================================================================

/**
 * Creates a real-time subscription for new messages in user's conversations
 * 
 * @param onMessage - Callback function for new messages
 * @param onError - Callback function for errors
 * @returns Unsubscribe function
 */
export function subscribeToUserMessages(
  onMessage: (message: Message) => void,
  onError?: (error: Error) => void
): () => void {
  const subscription = supabase
    .channel('user-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=in.(SELECT id FROM conversations WHERE participant_1_id=auth.uid() OR participant_2_id=auth.uid())`
      },
      (payload) => {
        try {
          onMessage(payload.new as Message);
        } catch (error) {
          console.error('Error in message subscription callback:', error);
          onError?.(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to user messages');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to user messages');
        onError?.(new Error('Subscription error'));
      }
    });
  
  return () => {
    subscription.unsubscribe();
    console.log('Unsubscribed from user messages');
  };
}

/**
 * Creates a real-time subscription for message read status updates
 * 
 * @param conversationId - ID of the conversation to monitor
 * @param onStatusUpdate - Callback function for read status updates
 * @param onError - Callback function for errors
 * @returns Unsubscribe function
 */
export function subscribeToReadStatus(
  conversationId: string,
  onStatusUpdate: (update: { messageId: string; userId: string; isRead: boolean; readAt?: string }) => void,
  onError?: (error: Error) => void
): () => void {
  const subscription = supabase
    .channel(`read-status-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'message_read_status',
        filter: `message_id=in.(SELECT id FROM messages WHERE conversation_id=eq.${conversationId})`
      },
      (payload) => {
        try {
          const update = payload.new as MessageReadStatus;
          onStatusUpdate({
            messageId: update.message_id,
            userId: update.user_id,
            isRead: update.is_read,
            readAt: update.read_at || undefined
          });
        } catch (error) {
          console.error('Error in read status subscription callback:', error);
          onError?.(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to read status for conversation ${conversationId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to read status for conversation ${conversationId}`);
        onError?.(new Error('Subscription error'));
      }
    });
  
  return () => {
    subscription.unsubscribe();
    console.log(`Unsubscribed from read status for conversation ${conversationId}`);
  };
}

// =============================================================================
// UTILITY AND HELPER FUNCTIONS
// =============================================================================

/**
 * Gets conversation statistics for admin dashboard
 * 
 * @returns Promise<ConversationStats> - Statistics about messaging system
 */
export interface ConversationStats {
  totalConversations: number;
  activeConversations: number; // Conversations with messages in last 30 days
  totalMessages: number;
  totalAttachments: number;
  averageMessagesPerConversation: number;
}

export async function getConversationStats(): Promise<ConversationStats> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Validate admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUserId)
      .single();
    
    if (!profile?.is_admin) {
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        'UNAUTHORIZED_ACCESS'
      );
    }
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Execute all queries in parallel
    const [
      conversationsResult,
      activeConversationsResult,
      messagesResult,
      attachmentsResult
    ] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('last_message_at', thirtyDaysAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('message_attachments').select('id', { count: 'exact', head: true })
    ]);
    
    const totalConversations = conversationsResult.count || 0;
    const activeConversations = activeConversationsResult.count || 0;
    const totalMessages = messagesResult.count || 0;
    const totalAttachments = attachmentsResult.count || 0;
    
    const averageMessagesPerConversation = totalConversations > 0 
      ? Math.round(totalMessages / totalConversations * 100) / 100
      : 0;
    
    const stats: ConversationStats = {
      totalConversations,
      activeConversations,
      totalMessages,
      totalAttachments,
      averageMessagesPerConversation
    };
    
    console.log('Generated conversation statistics:', stats);
    return stats;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in getConversationStats:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Searches messages across all user's conversations
 * 
 * @param query - Search query string
 * @param limit - Maximum number of results
 * @returns Promise<MessageWithStatus[]> - Matching messages
 */
export async function searchMessages(
  query: string,
  limit: number = 20
): Promise<MessageWithStatus[]> {
  try {
    const currentUserId = await getCurrentUserId();
    
    if (!query || query.trim().length < 2) {
      throw new MessagingError(
        'Arama sorgusu en az 2 karakter olmalıdır',
        'VALIDATION_ERROR'
      );
    }
    
    const searchTerm = query.trim().toLowerCase();
    
    // Search messages in user's conversations
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, is_admin),
        read_status:message_read_status!inner(is_read, read_at),
        conversations!inner(participant_1_id, participant_2_id)
      `)
      .or(`conversations.participant_1_id.eq.${currentUserId},conversations.participant_2_id.eq.${currentUserId}`)
      .eq('is_deleted', false)
      .eq('message_read_status.user_id', currentUserId)
      .ilike('content', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error searching messages:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    if (!messages) {
      return [];
    }
    
    // Transform messages with status and sender info
    const result: MessageWithStatus[] = messages.map(msg => ({
      ...msg,
      is_read: msg.read_status?.[0]?.is_read || false,
      read_at: msg.read_status?.[0]?.read_at || null,
      sender: {
        id: msg.sender?.id || '',
        full_name: msg.sender?.full_name || 'Bilinmeyen Kullanıcı',
        avatar_url: msg.sender?.avatar_url || null,
        is_admin: msg.sender?.is_admin || false
      }
    }));
    
    console.log(`Found ${result.length} messages matching query: "${query}"`);
    return result;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in searchMessages:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Gets total unread message count for the current user
 * 
 * @returns Promise<number> - Total unread message count
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { count, error } = await supabase
      .from('message_read_status')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)
      .eq('is_read', false)
      .in('message_id', 
        supabase
          .from('messages')
          .select('id')
          .eq('is_deleted', false)
      );
    
    if (error) {
      console.error('Error getting unread count:', error);
      throw new MessagingError(
        TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
        'DATABASE_ERROR',
        error.message
      );
    }
    
    const unreadCount = count || 0;
    console.log(`Total unread messages for user ${currentUserId}: ${unreadCount}`);
    return unreadCount;
    
  } catch (error) {
    if (error instanceof MessagingError) {
      throw error;
    }
    
    console.error('Unexpected error in getTotalUnreadCount:', error);
    throw new MessagingError(
      TURKISH_ERROR_MESSAGES.DATABASE_ERROR,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// =============================================================================
// All functions are exported individually above
// =============================================================================