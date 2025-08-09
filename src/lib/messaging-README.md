# 7P Education Platform - Messaging API Documentation

Comprehensive direct messaging system for student-instructor communication with real-time features, file attachments, and advanced message management.

## 📚 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [API Reference](#api-reference)
- [React Hooks](#react-hooks)
- [Real-time Features](#real-time-features)
- [File Attachments](#file-attachments)
- [Error Handling](#error-handling)
- [Security](#security)
- [Performance](#performance)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## 🔎 Overview

The 7P Education Platform messaging system provides a complete solution for private communication between students and instructors. Built on Supabase with PostgreSQL and real-time subscriptions, it offers enterprise-grade features with educational platform-specific optimizations.

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Hooks   │───▶│   Messaging API  │───▶│   Supabase DB   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │    │   Utilities      │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Database Schema

- **conversations**: 1-on-1 conversations between participants
- **messages**: Individual messages with threading support
- **message_attachments**: File attachments with Supabase Storage
- **message_read_status**: Read/unread tracking per user

## ✨ Features

### Core Messaging
- ✅ Create conversations between students and instructors
- ✅ Send, edit, and delete messages
- ✅ Message threading and replies
- ✅ Real-time message delivery
- ✅ Read status tracking
- ✅ Typing indicators

### File Management
- ✅ File attachments (images, documents, PDFs)
- ✅ 10MB file size limit
- ✅ Pre-signed URL generation
- ✅ Secure file access

### Conversation Management
- ✅ Archive/unarchive conversations
- ✅ Mute/unmute notifications
- ✅ Conversation search and filtering
- ✅ Unread message counts

### Advanced Features
- ✅ Message search across conversations
- ✅ Pagination and infinite scroll
- ✅ Rate limiting
- ✅ Turkish localization
- ✅ Comprehensive error handling

## 🚀 Installation & Setup

### 1. Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

Run the SQL schema file to create tables and policies:

```sql
-- Execute database-schema-messaging.sql in your Supabase SQL editor
```

### 3. Storage Bucket

Create a storage bucket named `message-attachments` in Supabase Dashboard with proper RLS policies.

### 4. Import the API

```typescript
import {
  createConversation,
  getUserConversations,
  sendMessage,
  getConversationMessages,
  // ... other functions
} from '@/lib/messaging';

// React hooks
import {
  useConversations,
  useMessages,
  useTypingIndicators
} from '@/lib/useMessaging';
```

## 📖 API Reference

### Conversation Management

#### `createConversation(participantId, title?)`

Creates a new conversation between current user and another participant.

```typescript
const conversation = await createConversation(
  'instructor-uuid',
  'JavaScript Questions'
);
```

**Parameters:**
- `participantId` (string): ID of the other participant
- `title` (string, optional): Custom conversation title

**Returns:** `Promise<Conversation>`

**Throws:** `MessagingError` if validation fails or conversation exists

---

#### `getUserConversations(filters?)`

Gets all conversations for the current user with metadata.

```typescript
const conversations = await getUserConversations({
  has_unread: true,
  participant_type: 'instructor'
});
```

**Parameters:**
- `filters` (ConversationFilters, optional):
  - `archived?: boolean` - Filter by archive status
  - `muted?: boolean` - Filter by mute status
  - `has_unread?: boolean` - Filter by unread messages
  - `participant_type?: 'student' | 'instructor'` - Filter by participant type

**Returns:** `Promise<ConversationWithMetadata[]>`

---

#### `updateConversationArchiveStatus(conversationId, archived)`

Archives or unarchives a conversation.

```typescript
await updateConversationArchiveStatus(conversationId, true); // Archive
await updateConversationArchiveStatus(conversationId, false); // Unarchive
```

---

#### `updateConversationMuteStatus(conversationId, muted)`

Mutes or unmutes a conversation.

```typescript
await updateConversationMuteStatus(conversationId, true); // Mute
await updateConversationMuteStatus(conversationId, false); // Unmute
```

### Message Operations

#### `sendMessage(conversationId, options)`

Sends a new message in a conversation.

```typescript
const message = await sendMessage(conversationId, {
  content: 'Hello! I have a question about JavaScript.',
  message_type: 'text',
  parent_message_id: 'reply-to-message-id' // Optional for threading
});
```

**Parameters:**
- `conversationId` (string): ID of the conversation
- `options` (SendMessageOptions):
  - `content` (string): Message content (max 10,000 characters)
  - `message_type?: MessageType` - 'text', 'attachment', or 'system'
  - `parent_message_id?: string` - For threaded replies

**Returns:** `Promise<Message>`

---

#### `getConversationMessages(conversationId, options?)`

Gets messages for a conversation with pagination.

```typescript
const messages = await getConversationMessages(conversationId, {
  limit: 50,
  offset: 0,
  before_message_id: 'message-uuid' // Cursor-based pagination
});
```

**Parameters:**
- `conversationId` (string): ID of the conversation
- `options` (PaginationOptions, optional):
  - `limit?: number` - Number of messages to fetch (default: 50)
  - `offset?: number` - Offset for pagination
  - `before_message_id?: string` - Cursor for loading older messages
  - `after_message_id?: string` - Cursor for loading newer messages

**Returns:** `Promise<MessageWithStatus[]>`

---

#### `markMessageAsRead(messageId)`

Marks a specific message as read.

```typescript
await markMessageAsRead(messageId);
```

---

#### `markConversationAsRead(conversationId)`

Marks all messages in a conversation as read.

```typescript
const markedCount = await markConversationAsRead(conversationId);
console.log(`${markedCount} messages marked as read`);
```

---

#### `editMessage(messageId, newContent)`

Edits a message (only by the sender, within 24 hours).

```typescript
const updatedMessage = await editMessage(messageId, 'Updated message content');
```

---

#### `deleteMessage(messageId)`

Soft deletes a message (only by the sender).

```typescript
await deleteMessage(messageId);
```

### File Attachments

#### `uploadMessageAttachment(messageId, file)`

Uploads a file attachment to a message.

```typescript
const attachment = await uploadMessageAttachment(messageId, file);
```

**File Restrictions:**
- Maximum size: 10MB
- Allowed types: Images, PDFs, Office documents, text files

---

#### `getAttachmentUrl(attachmentId, expiresIn?)`

Generates a pre-signed URL for file access.

```typescript
const url = await getAttachmentUrl(attachmentId, 3600); // 1 hour expiry
```

### Search & Utility

#### `searchMessages(query, limit?)`

Searches messages across all user conversations.

```typescript
const results = await searchMessages('JavaScript', 20);
```

---

#### `getTotalUnreadCount()`

Gets total unread message count for the current user.

```typescript
const unreadCount = await getTotalUnreadCount();
```

### Real-time Subscriptions

#### `subscribeToUserMessages(onMessage, onError?)`

Subscribes to new messages in user's conversations.

```typescript
const unsubscribe = subscribeToUserMessages(
  (message) => {
    console.log('New message:', message);
    // Update UI
  },
  (error) => {
    console.error('Subscription error:', error);
  }
);

// Cleanup
unsubscribe();
```

---

#### `subscribeToReadStatus(conversationId, onStatusUpdate, onError?)`

Subscribes to read status updates for a conversation.

```typescript
const unsubscribe = subscribeToReadStatus(
  conversationId,
  (update) => {
    console.log('Read status update:', update);
    // Update message UI
  }
);
```

## 🎣 React Hooks

### `useConversations(options?)`

Hook for managing user conversations.

```typescript
const {
  conversations,
  loading,
  error,
  refresh,
  createConversation,
  archiveConversation,
  muteConversation
} = useConversations({
  filters: { has_unread: true },
  autoRefresh: true,
  refreshInterval: 30000
});
```

### `useMessages(options)`

Hook for managing messages in a conversation.

```typescript
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
  conversationId: 'conv-uuid',
  initialLimit: 50,
  autoMarkAsRead: true,
  enableRealTime: true
});
```

### `useTypingIndicators(conversationId)`

Hook for typing indicators.

```typescript
const {
  typingUsers,
  typingText,
  isAnyoneTyping,
  startTyping,
  stopTyping
} = useTypingIndicators(conversationId);

// Usage in input handler
const handleInputChange = (e) => {
  setValue(e.target.value);
  startTyping(); // Automatically handles timeout
};
```

### `useMessageSearch()`

Hook for searching messages.

```typescript
const {
  query,
  setQuery,
  results,
  loading,
  error,
  hasResults,
  clearSearch
} = useMessageSearch();
```

### `useUnreadCount()`

Hook for unread message count.

```typescript
const {
  unreadCount,
  loading,
  error,
  refresh
} = useUnreadCount();
```

### `useFileUpload()`

Hook for file uploads.

```typescript
const {
  uploading,
  progress,
  error,
  uploadFile,
  resetUploadState
} = useFileUpload();

// Usage
const handleFileUpload = async (messageId, file) => {
  try {
    const attachment = await uploadFile(messageId, file);
    console.log('File uploaded:', attachment);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### `useConversationSearch(conversations)`

Hook for filtering and searching conversations.

```typescript
const {
  searchQuery,
  setSearchQuery,
  filteredConversations,
  groupedConversations,
  hasResults,
  resultCount
} = useConversationSearch(conversations);
```

## 🔄 Real-time Features

### Message Delivery

Real-time message delivery is implemented using Supabase Realtime:

```typescript
// Automatic setup in useMessages hook
const { messages } = useMessages({
  conversationId: 'conv-uuid',
  enableRealTime: true // Default
});
```

### Typing Indicators

Typing indicators show when other users are typing:

```typescript
const { typingText, startTyping, stopTyping } = useTypingIndicators(conversationId);

// In your component
{typingText && (
  <div className="typing-indicator">
    {typingText}
  </div>
)}
```

### Read Status Updates

Real-time read status updates show when messages are read:

```typescript
// Handled automatically in useMessages hook
// Updates message.is_read and message.read_at in real-time
```

## 📎 File Attachments

### Supported File Types

- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, Word, Excel, PowerPoint
- **Text**: Plain text, CSV

### Upload Process

```typescript
// 1. Send message first
const message = await sendMessage(conversationId, {
  content: 'Here is the file you requested:',
  message_type: 'text'
});

// 2. Upload attachment
const attachment = await uploadMessageAttachment(message.id, file);

// 3. Get access URL when needed
const url = await getAttachmentUrl(attachment.id);
```

### Security

- All files are stored in Supabase Storage with RLS policies
- Pre-signed URLs expire after specified time (default: 1 hour)
- Only conversation participants can access attachments

## 🛡️ Error Handling

### Error Types

The messaging system uses custom error types with Turkish localization:

```typescript
try {
  await sendMessage(conversationId, { content: '' });
} catch (error) {
  if (error instanceof MessagingError) {
    console.log('Error code:', error.code);
    console.log('User message:', error.message); // Turkish
    console.log('Technical details:', error.details);
  }
}
```

### Common Error Codes

- `NOT_AUTHENTICATED`: User not logged in
- `CONVERSATION_NOT_FOUND`: Conversation doesn't exist
- `UNAUTHORIZED_ACCESS`: User lacks permission
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `FILE_TOO_LARGE`: File exceeds 10MB limit
- `INVALID_FILE_TYPE`: Unsupported file type
- `MESSAGE_TOO_LONG`: Message exceeds 10,000 characters

### Error Handling Utility

```typescript
import { handleMessagingError } from '@/lib/messaging-utils';

try {
  // ... messaging operation
} catch (error) {
  const userMessage = handleMessagingError(error, 'sendMessage');
  showToast(userMessage); // Show user-friendly error
}
```

## 🔒 Security

### Row Level Security (RLS)

All database operations are protected by RLS policies:

- Users can only see their own conversations
- Only conversation participants can send/read messages
- File attachments are restricted to conversation participants

### Rate Limiting

Built-in rate limiting prevents abuse:

- 60 messages per minute per user
- 10 file uploads per 5 minutes per user
- 10 conversation creations per 5 minutes per user

### Input Validation

All inputs are validated:

- Message content: Max 10,000 characters, no empty messages
- File uploads: Size and type restrictions
- User permissions: Verified on all operations

## ⚡ Performance

### Optimization Features

- **Pagination**: Efficient loading of message history
- **Caching**: In-memory cache for frequently accessed data
- **Parallel Queries**: Multiple database queries executed in parallel
- **Connection Pooling**: Supabase handles connection management
- **Indexes**: Optimized database indexes for fast queries

### Best Practices

```typescript
// Use pagination for large conversations
const messages = await getConversationMessages(conversationId, {
  limit: 50, // Don't load too many at once
  offset: 0
});

// Enable auto-refresh sparingly
const { conversations } = useConversations({
  autoRefresh: true,
  refreshInterval: 30000 // 30 seconds minimum
});

// Cleanup subscriptions
useEffect(() => {
  const unsubscribe = subscribeToUserMessages(handleMessage);
  return unsubscribe; // Always cleanup
}, []);
```

## 💡 Examples

### Basic Chat Component

```typescript
import React, { useState } from 'react';
import { useMessages, useTypingIndicators } from '@/lib/useMessaging';

function ChatComponent({ conversationId }) {
  const [messageText, setMessageText] = useState('');
  
  const {
    messages,
    loading,
    sendMessage,
    markAllAsRead
  } = useMessages({
    conversationId,
    autoMarkAsRead: true
  });
  
  const {
    typingText,
    startTyping,
    stopTyping
  } = useTypingIndicators(conversationId);
  
  const handleSend = async () => {
    if (!messageText.trim()) return;
    
    try {
      await sendMessage({ content: messageText });
      setMessageText('');
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };
  
  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            <strong>{message.sender.full_name}:</strong>
            <span>{message.content}</span>
            <small>{new Date(message.created_at).toLocaleTimeString()}</small>
          </div>
        ))}
        
        {/* Typing indicator */}
        {typingText && (
          <div className="typing-indicator">{typingText}</div>
        )}
      </div>
      
      {/* Input */}
      <div className="message-input">
        <input
          type="text"
          value={messageText}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Mesajınızı yazın..."
        />
        <button onClick={handleSend}>Gönder</button>
      </div>
    </div>
  );
}
```

### Conversation List Component

```typescript
import React from 'react';
import { useConversations, useConversationSearch } from '@/lib/useMessaging';

function ConversationList() {
  const { conversations, loading, createConversation } = useConversations({
    autoRefresh: true
  });
  
  const {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    groupedConversations
  } = useConversationSearch(conversations);
  
  return (
    <div className="conversation-list">
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Konuşma ara..."
      />
      
      {/* Groups */}
      {Object.entries(groupedConversations).map(([group, convs]) => (
        <div key={group} className="conversation-group">
          <h3>{group}</h3>
          {convs.map(conversation => (
            <div key={conversation.id} className="conversation-item">
              <div className="participant">
                {conversation.other_participant.full_name}
                {conversation.other_participant.is_admin && (
                  <span className="instructor-badge">Eğitmen</span>
                )}
              </div>
              
              {conversation.last_message && (
                <div className="last-message">
                  {conversation.last_message.content}
                </div>
              )}
              
              {conversation.unread_count > 0 && (
                <span className="unread-badge">
                  {conversation.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Troubleshooting

### Common Issues

**1. Messages not appearing in real-time**

```typescript
// Check if real-time is enabled
const { messages } = useMessages({
  conversationId,
  enableRealTime: true // Make sure this is true
});

// Check browser console for WebSocket errors
// Ensure Supabase Realtime is enabled in your project
```

**2. File upload failing**

```typescript
// Check file size and type
const isValidFile = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)');
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not supported');
  }
  
  return true;
};
```

**3. Rate limiting errors**

```typescript
// Implement user-side rate limiting
let lastMessageTime = 0;
const MIN_MESSAGE_INTERVAL = 1000; // 1 second

const handleSend = async () => {
  const now = Date.now();
  if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
    console.warn('Please wait before sending another message');
    return;
  }
  
  lastMessageTime = now;
  // ... send message
};
```

**4. Memory leaks with subscriptions**

```typescript
// Always cleanup subscriptions
useEffect(() => {
  const unsubscribe = subscribeToUserMessages(handleMessage);
  
  return () => {
    unsubscribe(); // Critical: cleanup on unmount
  };
}, []);
```

### Performance Issues

**1. Too many re-renders**

```typescript
// Use useCallback for event handlers
const handleMessage = useCallback((message) => {
  // Handle new message
}, []);

// Memoize expensive calculations
const groupedConversations = useMemo(() => {
  return groupConversationsByDate(conversations);
}, [conversations]);
```

**2. Large conversation loading slowly**

```typescript
// Implement virtual scrolling for large conversations
// Load messages incrementally
const { messages, loadMore, hasMore } = useMessages({
  conversationId,
  initialLimit: 20 // Start small
});
```

### Debug Mode

Enable debug logging:

```typescript
// Add to your environment variables
NEXT_PUBLIC_MESSAGING_DEBUG=true

// In your code
if (process.env.NEXT_PUBLIC_MESSAGING_DEBUG) {
  console.log('Debug: Message sent', message);
}
```

## 📝 API Response Examples

### Conversation Object

```json
{
  "id": "conv-uuid",
  "participant_1_id": "user-uuid-1",
  "participant_2_id": "user-uuid-2",
  "title": "JavaScript Questions",
  "last_message_id": "msg-uuid",
  "last_message_at": "2025-07-31T10:30:00Z",
  "archived_by_participant_1": false,
  "archived_by_participant_2": false,
  "muted_by_participant_1": false,
  "muted_by_participant_2": false,
  "created_at": "2025-07-31T10:00:00Z",
  "updated_at": "2025-07-31T10:30:00Z",
  "unread_count": 3,
  "other_participant": {
    "id": "user-uuid-2",
    "full_name": "Dr. Ahmet Yılmaz",
    "avatar_url": "https://...",
    "is_admin": true
  },
  "last_message": {
    "id": "msg-uuid",
    "content": "Thank you for the explanation!",
    "sender_id": "user-uuid-1",
    "created_at": "2025-07-31T10:30:00Z",
    "message_type": "text"
  }
}
```

### Message Object

```json
{
  "id": "msg-uuid",
  "conversation_id": "conv-uuid",
  "sender_id": "user-uuid",
  "content": "Hello! I have a question about JavaScript arrays.",
  "message_type": "text",
  "parent_message_id": null,
  "thread_depth": 0,
  "is_edited": false,
  "edited_at": null,
  "original_content": null,
  "is_deleted": false,
  "deleted_at": null,
  "deleted_by": null,
  "created_at": "2025-07-31T10:15:00Z",
  "updated_at": "2025-07-31T10:15:00Z",
  "is_read": true,
  "read_at": "2025-07-31T10:16:00Z",
  "sender": {
    "id": "user-uuid",
    "full_name": "Öğrenci Ali",
    "avatar_url": null,
    "is_admin": false
  },
  "attachments": []
}
```

## 🤝 Contributing

When contributing to the messaging system:

1. Follow TypeScript best practices
2. Add proper error handling with Turkish messages
3. Include comprehensive tests
4. Update documentation
5. Consider performance implications
6. Maintain security standards

## 📄 License

This messaging system is part of the 7P Education Platform and follows the project's license terms.

---

**Version**: 1.0.0  
**Last Updated**: July 31, 2025  
**Compatible with**: Next.js 15, Supabase 2.53+, TypeScript 5+