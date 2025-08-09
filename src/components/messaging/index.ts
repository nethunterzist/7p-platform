/**
 * 7P Education Platform - Messaging Components
 * 
 * Complete real-time messaging interface components for student-instructor communication
 * Built with Next.js 15, TypeScript, Tailwind CSS, and Shadcn/UI
 */

// Main Components
export { MessageCenter } from './MessageCenter';
export { ConversationList } from './ConversationList';
export { ConversationItem } from './ConversationItem';
export { MessageThread } from './MessageThread';
export { MessageBubble } from './MessageBubble';
export { MessageComposer } from './MessageComposer';

// Modal Components
export { NewConversationModal } from './NewConversationModal';
export { MessageEditDialog } from './MessageEditDialog';

// Utility Components
export { TypingIndicator } from './TypingIndicator';
export { AttachmentPreview } from './AttachmentPreview';

// Component Types
// export type { MessageCenterProps } from './MessageCenter';

// Re-export messaging hooks for convenience
export {
  useConversations,
  useConversationSearch,
  useMessages,
  useTypingIndicators,
  useMessageSearch,
  useUnreadCount,
  useFileUpload,
  useMessagingError
} from '@/lib/useMessaging';

// Re-export messaging types for convenience
export type {
  Conversation,
  ConversationWithMetadata,
  Message,
  MessageWithStatus,
  MessageAttachment,
  MessageType,
  ConversationFilters,
  SendMessageOptions,
  PaginationOptions
} from '@/lib/messaging';