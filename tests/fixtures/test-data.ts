import { 
  Conversation, 
  ConversationWithMetadata, 
  Message, 
  MessageWithStatus, 
  MessageAttachment 
} from '@/lib/messaging';

// Test User Data
export const testUsers = {
  student: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    full_name: 'Test Student',
    email: 'student@test.com',
    avatar_url: null,
    is_admin: false,
  },
  instructor: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    full_name: 'Test Instructor',
    email: 'instructor@test.com',
    avatar_url: null,
    is_admin: true,
  },
  admin: {
    id: '123e4567-e89b-12d3-a456-426614174002',
    full_name: 'Test Admin',
    email: 'admin@test.com',
    avatar_url: null,
    is_admin: true,
  },
};

// Test Conversation Data
export const testConversations: Conversation[] = [
  {
    id: 'conv-1',
    participant_1_id: testUsers.student.id,
    participant_2_id: testUsers.instructor.id,
    title: 'Math Help Session',
    last_message_id: 'msg-1',
    last_message_at: new Date().toISOString(),
    archived_by_participant_1: false,
    archived_by_participant_2: false,
    muted_by_participant_1: false,
    muted_by_participant_2: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'conv-2',
    participant_1_id: testUsers.student.id,
    participant_2_id: testUsers.instructor.id,
    title: null,
    last_message_id: null,
    last_message_at: new Date().toISOString(),
    archived_by_participant_1: false,
    archived_by_participant_2: false,
    muted_by_participant_1: false,
    muted_by_participant_2: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Test Conversation with Metadata
export const testConversationsWithMetadata: ConversationWithMetadata[] = testConversations.map(conv => ({
  ...conv,
  unread_count: Math.floor(Math.random() * 5),
  other_participant: conv.participant_1_id === testUsers.student.id 
    ? testUsers.instructor
    : testUsers.student,
  last_message: {
    id: 'msg-1',
    content: 'Hello, I need help with calculus.',
    sender_id: testUsers.student.id,
    created_at: new Date().toISOString(),
    message_type: 'text' as const,
  },
}));

// Test Messages
export const testMessages: Message[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: testUsers.student.id,
    content: 'Hello, I need help with calculus.',
    message_type: 'text',
    parent_message_id: null,
    thread_depth: 0,
    is_edited: false,
    edited_at: null,
    original_content: null,
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    created_at: new Date(Date.now() - 60000).toISOString(),
    updated_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: testUsers.instructor.id,
    content: 'Of course! What specific topic do you need help with?',
    message_type: 'text',
    parent_message_id: null,
    thread_depth: 0,
    is_edited: false,
    edited_at: null,
    original_content: null,
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    created_at: new Date(Date.now() - 30000).toISOString(),
    updated_at: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: testUsers.student.id,
    content: 'I\'m struggling with derivatives and chain rule.',
    message_type: 'text',
    parent_message_id: 'msg-2',
    thread_depth: 1,
    is_edited: false,
    edited_at: null,
    original_content: null,
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Test Messages with Status
export const testMessagesWithStatus: MessageWithStatus[] = testMessages.map(msg => ({
  ...msg,
  is_read: Math.random() > 0.5,
  read_at: Math.random() > 0.5 ? new Date().toISOString() : null,
  sender: msg.sender_id === testUsers.student.id ? testUsers.student : testUsers.instructor,
  attachments: [],
}));

// Test Attachments
export const testAttachments: MessageAttachment[] = [
  {
    id: 'att-1',
    message_id: 'msg-1',
    filename: 'calculus-notes.pdf',
    original_filename: 'My Calculus Notes.pdf',
    file_size: 2048576, // 2MB
    mime_type: 'application/pdf',
    storage_path: 'conv-1/msg-1/calculus-notes.pdf',
    storage_bucket: 'message-attachments',
    is_uploaded: true,
    upload_expires_at: null,
    access_url: null,
    access_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'att-2',
    message_id: 'msg-2',
    filename: 'formula-sheet.jpg',
    original_filename: 'Derivative Formulas.jpg',
    file_size: 512000, // 500KB
    mime_type: 'image/jpeg',
    storage_path: 'conv-1/msg-2/formula-sheet.jpg',
    storage_bucket: 'message-attachments',
    is_uploaded: true,
    upload_expires_at: null,
    access_url: null,
    access_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Test File Objects for Upload Testing
export const createTestFile = (
  name: string = 'test-file.txt',
  type: string = 'text/plain',
  size: number = 1024
): File => {
  const content = 'a'.repeat(size);
  return new File([content], name, { type, lastModified: Date.now() });
};

export const testFiles = {
  text: createTestFile('test.txt', 'text/plain', 1024),
  image: createTestFile('test.jpg', 'image/jpeg', 2048),
  pdf: createTestFile('test.pdf', 'application/pdf', 4096),
  largePdf: createTestFile('large.pdf', 'application/pdf', 12 * 1024 * 1024), // 12MB - over limit
  unsupported: createTestFile('test.exe', 'application/x-executable', 1024),
};

// Sample conversation statistics
export const testConversationStats = {
  totalConversations: 150,
  activeConversations: 75,
  totalMessages: 2500,
  totalAttachments: 180,
  averageMessagesPerConversation: 16.67,
};

// Rate limiting test data
export const rateLimitTestData = {
  normalUser: {
    messagesPerMinute: 30,
    conversationsPerFiveMinutes: 5,
    uploadsPerFiveMinutes: 10,
  },
  exceededLimits: {
    messagesPerMinute: 65,
    conversationsPerFiveMinutes: 12,
    uploadsPerFiveMinutes: 15,
  },
};

// Real-time test scenarios
export const realtimeScenarios = {
  typingIndicator: {
    userId: testUsers.student.id,
    conversationId: 'conv-1',
    isTyping: true,
    lastTypedAt: new Date().toISOString(),
  },
  messageUpdate: {
    messageId: 'msg-1',
    userId: testUsers.instructor.id,
    isRead: true,
    readAt: new Date().toISOString(),
  },
  newMessage: {
    conversationId: 'conv-1',
    senderId: testUsers.instructor.id,
    content: 'I just sent you some helpful resources!',
    messageType: 'text' as const,
  },
};

// Error scenarios for testing
export const errorScenarios = {
  networkError: new Error('Network request failed'),
  authError: new Error('User not authenticated'),
  validationError: new Error('Invalid input data'),
  permissionError: new Error('Permission denied'),
  rateLimitError: new Error('Rate limit exceeded'),
  fileUploadError: new Error('File upload failed'),
  databaseError: new Error('Database connection error'),
};

// Mock API responses
export const mockApiResponses = {
  conversations: {
    success: { data: testConversationsWithMetadata, error: null },
    empty: { data: [], error: null },
    error: { data: null, error: errorScenarios.databaseError },
  },
  messages: {
    success: { data: testMessagesWithStatus, error: null },
    empty: { data: [], error: null },
    error: { data: null, error: errorScenarios.databaseError },
  },
  sendMessage: {
    success: { data: testMessages[0], error: null },
    error: { data: null, error: errorScenarios.validationError },
  },
  upload: {
    success: { data: testAttachments[0], error: null },
    error: { data: null, error: errorScenarios.fileUploadError },
  },
};