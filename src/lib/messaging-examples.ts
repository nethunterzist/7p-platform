/**
 * 7P Education Platform - Messaging API Usage Examples
 * Comprehensive examples showing how to use the messaging API
 */

import {
  createConversation,
  getUserConversations,
  sendMessage,
  getConversationMessages,
  markMessageAsRead,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  uploadMessageAttachment,
  getAttachmentUrl,
  subscribeToUserMessages,
  subscribeToReadStatus,
  searchMessages,
  getTotalUnreadCount,
  updateConversationArchiveStatus,
  updateConversationMuteStatus,
  type Conversation,
  type ConversationWithMetadata,
  type MessageWithStatus,
  type PaginationOptions
} from './messaging';

import {
  updateTypingIndicator,
  subscribeToTypingIndicators,
  formatMessageContent,
  formatRelativeTime,
  groupConversationsByDate,
  filterConversations,
  handleMessagingError
} from './messaging-utils';

/**
 * EXAMPLE 1: Creating a new conversation
 * Shows how to start a conversation between student and instructor
 */
export async function exampleCreateConversation() {
  try {
    // Create conversation with instructor
    const instructorId = 'instructor-uuid-here';
    const conversation = await createConversation(
      instructorId, 
      'JavaScript Dersi Hakkında Sorular'
    );
    
    console.log('Yeni konuşma oluşturuldu:', conversation);
    
    // Send initial message
    const message = await sendMessage(conversation.id, {
      content: 'Merhaba! JavaScript dersi hakkında birkaç sorum var.',
      message_type: 'text'
    });
    
    console.log('İlk mesaj gönderildi:', message);
    
    return conversation;
  } catch (error) {
    console.error('Konuşma oluşturma hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 2: Loading user's conversations with filters
 * Shows how to get and organize conversations
 */
export async function exampleLoadConversations() {
  try {
    // Get all conversations
    const allConversations = await getUserConversations();
    console.log('Tüm konuşmalar:', allConversations);
    
    // Get only conversations with unread messages
    const unreadConversations = await getUserConversations({
      has_unread: true
    });
    console.log('Okunmamış mesajlı konuşmalar:', unreadConversations);
    
    // Get conversations with instructors only
    const instructorConversations = await getUserConversations({
      participant_type: 'instructor'
    });
    console.log('Eğitmen konuşmaları:', instructorConversations);
    
    // Group conversations by date for UI
    const groupedConversations = groupConversationsByDate(allConversations);
    console.log('Tarihe göre gruplandırılmış konuşmalar:', groupedConversations);
    
    return allConversations;
  } catch (error) {
    console.error('Konuşma yükleme hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 3: Loading and displaying messages
 * Shows pagination and message formatting
 */
export async function exampleLoadMessages(conversationId: string) {
  try {
    // Load first page of messages
    const messages = await getConversationMessages(conversationId, {
      limit: 20,
      offset: 0
    });
    
    console.log('Mesajlar yüklendi:', messages);
    
    // Load more messages with pagination
    const olderMessages = await getConversationMessages(conversationId, {
      limit: 20,
      offset: 20
    });
    
    console.log('Eski mesajlar:', olderMessages);
    
    // Load messages before a specific message (cursor-based pagination)
    if (messages.length > 0) {
      const messagesBeforeFirst = await getConversationMessages(conversationId, {
        limit: 10,
        before_message_id: messages[0].id
      });
      console.log('Belirli mesajdan önceki mesajlar:', messagesBeforeFirst);
    }
    
    // Format messages for display
    const formattedMessages = messages.map(msg => ({
      ...msg,
      formatted_content: formatMessageContent(msg.content),
      relative_time: formatRelativeTime(msg.created_at),
      is_own_message: msg.sender_id === 'current-user-id' // Replace with actual user ID
    }));
    
    console.log('Formatlanmış mesajlar:', formattedMessages);
    
    return messages;
  } catch (error) {
    console.error('Mesaj yükleme hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 4: Sending different types of messages
 * Shows text messages, replies, and system messages
 */
export async function exampleSendMessages(conversationId: string) {
  try {
    // Send a simple text message
    const textMessage = await sendMessage(conversationId, {
      content: 'Merhaba! Nasılsınız?',
      message_type: 'text'
    });
    console.log('Metin mesajı gönderildi:', textMessage);
    
    // Send a reply to another message
    const replyMessage = await sendMessage(conversationId, {
      content: 'Bu sorunuzu yanıtlıyorum.',
      message_type: 'text',
      parent_message_id: textMessage.id // Reply to the previous message
    });
    console.log('Yanıt mesajı gönderildi:', replyMessage);
    
    // Send a longer message with formatting
    const formattedMessage = await sendMessage(conversationId, {
      content: `Bu ödev için şu adımları takip edin:
      
1. Proje dosyalarını indirin: https://example.com/files
2. package.json dosyasını kontrol edin
3. npm install çalıştırın
4. Sorularınız varsa @instructor kullanıcı adıyla bana ulaşın

İyi çalışmalar!`,
      message_type: 'text'
    });
    console.log('Formatlanmış mesaj gönderildi:', formattedMessage);
    
    return [textMessage, replyMessage, formattedMessage];
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 5: File attachment handling
 * Shows how to upload and access file attachments
 */
export async function exampleFileAttachments(messageId: string, file: File) {
  try {
    // Upload file attachment
    const attachment = await uploadMessageAttachment(messageId, file);
    console.log('Dosya yüklendi:', attachment);
    
    // Get access URL for the file
    const accessUrl = await getAttachmentUrl(attachment.id, 7200); // 2 hours expiry
    console.log('Dosya erişim URL\'si:', accessUrl);
    
    // Example of handling different file types
    const fileInfo = {
      id: attachment.id,
      name: attachment.original_filename,
      size: attachment.file_size,
      type: attachment.mime_type,
      url: accessUrl,
      isImage: attachment.mime_type.startsWith('image/'),
      isPDF: attachment.mime_type === 'application/pdf',
      isDocument: attachment.mime_type.includes('document') || 
                  attachment.mime_type.includes('word') ||
                  attachment.mime_type.includes('excel')
    };
    
    console.log('Dosya bilgileri:', fileInfo);
    
    return attachment;
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 6: Message status management
 * Shows reading, editing, and deleting messages
 */
export async function exampleMessageStatus(conversationId: string, messageId: string) {
  try {
    // Mark a specific message as read
    await markMessageAsRead(messageId);
    console.log('Mesaj okundu olarak işaretlendi');
    
    // Mark all messages in conversation as read
    const readCount = await markConversationAsRead(conversationId);
    console.log(`${readCount} mesaj okundu olarak işaretlendi`);
    
    // Edit a message (only by sender)
    const editedMessage = await editMessage(messageId, 'Bu mesajı düzenledim.');
    console.log('Mesaj düzenlendi:', editedMessage);
    
    // Delete a message (soft delete)
    await deleteMessage(messageId);
    console.log('Mesaj silindi');
    
    // Get total unread count for user
    const unreadCount = await getTotalUnreadCount();
    console.log(`Toplam okunmamış mesaj sayısı: ${unreadCount}`);
    
    return { readCount, editedMessage, unreadCount };
  } catch (error) {
    console.error('Mesaj durumu güncelleme hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 7: Real-time messaging setup
 * Shows how to set up real-time subscriptions
 */
export async function exampleRealTimeMessaging(conversationId: string) {
  try {
    // Subscribe to new messages
    const unsubscribeMessages = subscribeToUserMessages(
      (message) => {
        console.log('Yeni mesaj alındı:', message);
        // Update UI with new message
        // You might want to check if message belongs to current conversation
        if (message.conversation_id === conversationId) {
          // Add message to current conversation UI
          console.log('Mevcut konuşmaya yeni mesaj eklendi');
        } else {
          // Show notification for other conversations
          console.log('Başka konuşmadan mesaj alındı');
        }
      },
      (error) => {
        console.error('Mesaj abonelik hatası:', error);
      }
    );
    
    // Subscribe to read status updates
    const unsubscribeReadStatus = subscribeToReadStatus(
      conversationId,
      (update) => {
        console.log('Okunma durumu güncellendi:', update);
        // Update UI to show message was read
      },
      (error) => {
        console.error('Okunma durumu abonelik hatası:', error);
      }
    );
    
    // Subscribe to typing indicators
    const unsubscribeTyping = subscribeToTypingIndicators(
      conversationId,
      (typing) => {
        console.log('Yazma göstergesi:', typing);
        if (typing.is_typing) {
          console.log(`${typing.full_name} yazıyor...`);
        } else {
          console.log(`${typing.full_name} yazmayı bıraktı`);
        }
      }
    );
    
    // Return unsubscribe functions for cleanup
    return () => {
      unsubscribeMessages();
      unsubscribeReadStatus();
      unsubscribeTyping();
      console.log('Tüm abonelikler iptal edildi');
    };
  } catch (error) {
    console.error('Gerçek zamanlı mesajlaşma kurulum hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 8: Typing indicators
 * Shows how to implement typing indicators
 */
export async function exampleTypingIndicators(conversationId: string) {
  let typingTimeout: NodeJS.Timeout;
  
  // Function to call when user starts typing
  const handleTypingStart = async () => {
    try {
      await updateTypingIndicator(conversationId, true);
      
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set typing to false after 3 seconds of inactivity
      typingTimeout = setTimeout(async () => {
        await updateTypingIndicator(conversationId, false);
      }, 3000);
    } catch (error) {
      console.error('Yazma göstergesi başlatma hatası:', error);
    }
  };
  
  // Function to call when user stops typing
  const handleTypingStop = async () => {
    try {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      await updateTypingIndicator(conversationId, false);
    } catch (error) {
      console.error('Yazma göstergesi durdurma hatası:', error);
    }
  };
  
  // Example usage in a text input
  const setupTypingIndicators = (inputElement: HTMLInputElement) => {
    let isTyping = false;
    
    inputElement.addEventListener('input', () => {
      if (!isTyping) {
        isTyping = true;
        handleTypingStart();
      }
    });
    
    inputElement.addEventListener('blur', () => {
      isTyping = false;
      handleTypingStop();
    });
    
    // Also stop when user stops typing for a while
    inputElement.addEventListener('keyup', () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      typingTimeout = setTimeout(() => {
        isTyping = false;
        handleTypingStop();
      }, 1000);
    });
  };
  
  return { handleTypingStart, handleTypingStop, setupTypingIndicators };
}

/**
 * EXAMPLE 9: Conversation management
 * Shows archiving, muting, and filtering
 */
export async function exampleConversationManagement(conversationId: string) {
  try {
    // Archive a conversation
    await updateConversationArchiveStatus(conversationId, true);
    console.log('Konuşma arşivlendi');
    
    // Unarchive a conversation
    await updateConversationArchiveStatus(conversationId, false);
    console.log('Konuşma arşivden çıkarıldı');
    
    // Mute a conversation
    await updateConversationMuteStatus(conversationId, true);
    console.log('Konuşma sessize alındı');
    
    // Unmute a conversation
    await updateConversationMuteStatus(conversationId, false);
    console.log('Konuşma sessize alma kaldırıldı');
    
    // Get archived conversations
    const archivedConversations = await getUserConversations({
      archived: true
    });
    console.log('Arşivlenmiş konuşmalar:', archivedConversations);
    
    // Get muted conversations
    const mutedConversations = await getUserConversations({
      muted: true
    });
    console.log('Sessiz konuşmalar:', mutedConversations);
    
    return { archivedConversations, mutedConversations };
  } catch (error) {
    console.error('Konuşma yönetimi hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 10: Search functionality
 * Shows how to search messages and conversations
 */
export async function exampleSearch() {
  try {
    // Search messages across all conversations
    const searchResults = await searchMessages('JavaScript', 20);
    console.log('Arama sonuçları:', searchResults);
    
    // Search within conversations
    const conversations = await getUserConversations();
    const filteredConversations = filterConversations(conversations, 'ödev');
    console.log('Filtrelenmiş konuşmalar:', filteredConversations);
    
    return { searchResults, filteredConversations };
  } catch (error) {
    console.error('Arama hatası:', error);
    throw error;
  }
}

/**
 * EXAMPLE 11: Error handling patterns
 * Shows proper error handling for messaging operations
 */
export async function exampleErrorHandling() {
  try {
    // Example of handling various errors
    const conversationId = 'invalid-id';
    
    try {
      await sendMessage(conversationId, { content: 'Test mesajı' });
    } catch (error) {
      const userMessage = handleMessagingError(error, 'sendMessage');
      console.log('Kullanıcıya gösterilecek hata mesajı:', userMessage);
      
      // Show user-friendly error in UI
      // showErrorToast(userMessage);
    }
    
    // Example of validating input before API calls
    const messageContent = '';
    if (!messageContent.trim()) {
      throw new Error('Mesaj içeriği boş olamaz');
    }
    
    if (messageContent.length > 10000) {
      throw new Error('Mesaj çok uzun (maksimum 10000 karakter)');
    }
    
  } catch (error) {
    console.error('Hata yönetimi örneği:', error);
  }
}

/**
 * EXAMPLE 12: Complete messaging component integration
 * Shows how to integrate all features in a React-like component
 */
export class MessagingComponentExample {
  private conversationId: string;
  private unsubscribeFunctions: (() => void)[] = [];
  
  constructor(conversationId: string) {
    this.conversationId = conversationId;
  }
  
  async initialize() {
    try {
      // Load initial data
      const [messages, conversations, unreadCount] = await Promise.all([
        getConversationMessages(this.conversationId, { limit: 50 }),
        getUserConversations(),
        getTotalUnreadCount()
      ]);
      
      console.log('Bileşen başlatıldı:', {
        messages: messages.length,
        conversations: conversations.length,
        unreadCount
      });
      
      // Set up real-time subscriptions
      this.setupRealTimeSubscriptions();
      
      return { messages, conversations, unreadCount };
    } catch (error) {
      console.error('Bileşen başlatma hatası:', error);
      throw error;
    }
  }
  
  private setupRealTimeSubscriptions() {
    // Subscribe to new messages
    const unsubMessages = subscribeToUserMessages(
      (message) => this.handleNewMessage(message),
      (error) => console.error('Mesaj abonelik hatası:', error)
    );
    
    // Subscribe to read status
    const unsubReadStatus = subscribeToReadStatus(
      this.conversationId,
      (update) => this.handleReadStatusUpdate(update),
      (error) => console.error('Okunma durumu hatası:', error)
    );
    
    // Subscribe to typing indicators
    const unsubTyping = subscribeToTypingIndicators(
      this.conversationId,
      (typing) => this.handleTypingUpdate(typing)
    );
    
    this.unsubscribeFunctions = [unsubMessages, unsubReadStatus, unsubTyping];
  }
  
  private handleNewMessage(message: any) {
    console.log('Yeni mesaj alındı:', message);
    // Update UI state
    // this.setState({ messages: [...messages, message] });
  }
  
  private handleReadStatusUpdate(update: any) {
    console.log('Okunma durumu güncellendi:', update);
    // Update message read status in UI
  }
  
  private handleTypingUpdate(typing: any) {
    console.log('Yazma durumu:', typing);
    // Show/hide typing indicator in UI
  }
  
  async sendMessage(content: string, file?: File) {
    try {
      // Send text message
      const message = await sendMessage(this.conversationId, {
        content,
        message_type: 'text'
      });
      
      // Upload file if provided
      if (file) {
        await uploadMessageAttachment(message.id, file);
      }
      
      console.log('Mesaj gönderildi:', message);
      return message;
    } catch (error) {
      const userMessage = handleMessagingError(error, 'sendMessage');
      console.error('Mesaj gönderme hatası:', userMessage);
      throw new Error(userMessage);
    }
  }
  
  async markAsRead(messageId: string) {
    try {
      await markMessageAsRead(messageId);
      console.log('Mesaj okundu olarak işaretlendi');
    } catch (error) {
      console.error('Okundu işaretleme hatası:', error);
    }
  }
  
  cleanup() {
    // Unsubscribe from all real-time subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    console.log('Bileşen temizlendi');
  }
}

// Export example usage function
export function runAllExamples() {
  console.log('7P Education Messaging API Örnekleri');
  console.log('=====================================');
  
  // Note: These are examples and should not be run all at once
  // Use individual examples as needed in your application
  
  const examples = [
    exampleCreateConversation,
    exampleLoadConversations,
    exampleSendMessages,
    exampleMessageStatus,
    exampleConversationManagement,
    exampleSearch,
    exampleErrorHandling
  ];
  
  console.log(`${examples.length} örnek fonksiyon hazır`);
  console.log('Her bir örneği ayrı ayrı çalıştırın');
}

export default {
  exampleCreateConversation,
  exampleLoadConversations,
  exampleLoadMessages,
  exampleSendMessages,
  exampleFileAttachments,
  exampleMessageStatus,
  exampleRealTimeMessaging,
  exampleTypingIndicators,
  exampleConversationManagement,
  exampleSearch,
  exampleErrorHandling,
  MessagingComponentExample,
  runAllExamples
};