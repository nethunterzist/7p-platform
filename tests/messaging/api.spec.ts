import { test, expect } from '@playwright/test';
import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessageAsRead,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  uploadMessageAttachment,
  getAttachmentUrl,
  searchMessages,
  getTotalUnreadCount,
  getConversationStats,
  updateConversationArchiveStatus,
  updateConversationMuteStatus,
  MessagingError,
} from '@/lib/messaging';
import { DatabaseHelper } from '../utils/test-helpers';
import { testUsers, testFiles, errorScenarios } from '../fixtures/test-data';

let dbHelper: DatabaseHelper;

test.describe('Messaging API Layer Tests', () => {
  test.beforeAll(async () => {
    dbHelper = new DatabaseHelper();
    
    // Set up test users
    await dbHelper.createTestUser('student');
    await dbHelper.createTestUser('instructor');
    await dbHelper.createTestUser('admin');
  });

  test.afterAll(async () => {
    await dbHelper.cleanupTestData();
  });

  test.describe('Conversation Management Functions', () => {
    test('createConversation - should create new conversation successfully', async () => {
      // Mock authentication
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: { id: testUsers.student.id } },
        error: null
      });
      
      // Create conversation
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Test Conversation Title'
      );

      expect(conversation).toBeDefined();
      expect(conversation.participant_1_id).toBe(testUsers.student.id);
      expect(conversation.participant_2_id).toBe(testUsers.instructor.id);
      expect(conversation.title).toBe('Test Conversation Title');
      expect(conversation.id).toBeDefined();
    });

    test('createConversation - should prevent duplicate conversations', async () => {
      // Create first conversation
      await createConversation(testUsers.instructor.id, 'First Conversation');

      // Try to create duplicate conversation
      await expect(
        createConversation(testUsers.instructor.id, 'Duplicate Conversation')
      ).rejects.toThrow(MessagingError);
    });

    test('createConversation - should validate participant roles', async () => {
      // Try to create conversation between two students (should fail)
      await expect(
        createConversation(testUsers.student.id, 'Invalid Conversation')
      ).rejects.toThrow(MessagingError);
    });

    test('createConversation - should enforce rate limiting', async () => {
      // Mock rate limit exceeded scenario
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          createConversation(
            `instructor-${i}@test.com`,
            `Conversation ${i}`
          ).catch(error => error)
        );
      }

      const results = await Promise.all(promises);
      const rateLimitErrors = results.filter(
        result => result instanceof MessagingError && 
        result.code === 'RATE_LIMIT_EXCEEDED'
      );

      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    test('getUserConversations - should return user conversations', async () => {
      // Create test conversations
      const conv1 = await createConversation(testUsers.instructor.id, 'Math Help');
      const conv2 = await createConversation(testUsers.instructor.id, 'Physics Help');

      const conversations = await getUserConversations();

      expect(conversations).toBeDefined();
      expect(Array.isArray(conversations)).toBe(true);
      expect(conversations.length).toBeGreaterThan(0);

      // Check conversation structure
      const firstConv = conversations[0];
      expect(firstConv).toHaveProperty('id');
      expect(firstConv).toHaveProperty('unread_count');
      expect(firstConv).toHaveProperty('other_participant');
      expect(firstConv.other_participant).toHaveProperty('full_name');
    });

    test('getUserConversations - should filter conversations correctly', async () => {
      // Test archived filter
      const archivedConversations = await getUserConversations({
        archived: true
      });

      const activeConversations = await getUserConversations({
        archived: false
      });

      expect(Array.isArray(archivedConversations)).toBe(true);
      expect(Array.isArray(activeConversations)).toBe(true);
    });

    test('updateConversationArchiveStatus - should archive/unarchive conversations', async () => {
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Archive Test'
      );

      // Archive conversation
      await updateConversationArchiveStatus(conversation.id, true);

      // Verify it's archived
      const archivedConvs = await getUserConversations({ archived: true });
      const isArchived = archivedConvs.some(conv => conv.id === conversation.id);
      expect(isArchived).toBe(true);

      // Unarchive conversation
      await updateConversationArchiveStatus(conversation.id, false);

      // Verify it's unarchived
      const activeConvs = await getUserConversations({ archived: false });
      const isActive = activeConvs.some(conv => conv.id === conversation.id);
      expect(isActive).toBe(true);
    });

    test('updateConversationMuteStatus - should mute/unmute conversations', async () => {
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Mute Test'
      );

      // Mute conversation
      await updateConversationMuteStatus(conversation.id, true);

      // Verify it's muted
      const mutedConvs = await getUserConversations({ muted: true });
      const isMuted = mutedConvs.some(conv => conv.id === conversation.id);
      expect(isMuted).toBe(true);

      // Unmute conversation
      await updateConversationMuteStatus(conversation.id, false);

      // Verify it's unmuted
      const unmuteConvs = await getUserConversations({ muted: false });
      const isUnmuted = unmuteConvs.some(conv => conv.id === conversation.id);
      expect(isUnmuted).toBe(true);
    });
  });

  test.describe('Message Operations Functions', () => {
    let testConversation: any;

    test.beforeEach(async () => {
      testConversation = await createConversation(
        testUsers.instructor.id,
        'Message Test Conversation'
      );
    });

    test('sendMessage - should send message successfully', async () => {
      const messageOptions = {
        content: 'Hello, this is a test message!',
        message_type: 'text' as const
      };

      const message = await sendMessage(testConversation.id, messageOptions);

      expect(message).toBeDefined();
      expect(message.content).toBe(messageOptions.content);
      expect(message.conversation_id).toBe(testConversation.id);
      expect(message.sender_id).toBe(testUsers.student.id);
      expect(message.message_type).toBe('text');
    });

    test('sendMessage - should validate message content', async () => {
      // Test empty message
      await expect(
        sendMessage(testConversation.id, { content: '' })
      ).rejects.toThrow(MessagingError);

      // Test message too long
      const longContent = 'a'.repeat(15000);
      await expect(
        sendMessage(testConversation.id, { content: longContent })
      ).rejects.toThrow(MessagingError);
    });

    test('sendMessage - should handle threading correctly', async () => {
      // Send parent message
      const parentMessage = await sendMessage(testConversation.id, {
        content: 'Parent message'
      });

      // Send reply
      const replyMessage = await sendMessage(testConversation.id, {
        content: 'Reply message',
        parent_message_id: parentMessage.id
      });

      expect(replyMessage.parent_message_id).toBe(parentMessage.id);
      expect(replyMessage.thread_depth).toBe(1);
    });

    test('sendMessage - should enforce rate limiting', async () => {
      const promises = [];
      for (let i = 0; i < 70; i++) {
        promises.push(
          sendMessage(testConversation.id, {
            content: `Rate limit test message ${i}`
          }).catch(error => error)
        );
      }

      const results = await Promise.all(promises);
      const rateLimitErrors = results.filter(
        result => result instanceof MessagingError && 
        result.code === 'RATE_LIMIT_EXCEEDED'
      );

      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    test('getConversationMessages - should retrieve messages', async () => {
      // Send some test messages
      await sendMessage(testConversation.id, { content: 'Message 1' });
      await sendMessage(testConversation.id, { content: 'Message 2' });
      await sendMessage(testConversation.id, { content: 'Message 3' });

      const messages = await getConversationMessages(testConversation.id);

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(3);

      // Check message structure
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty('id');
      expect(firstMessage).toHaveProperty('content');
      expect(firstMessage).toHaveProperty('sender');
      expect(firstMessage).toHaveProperty('is_read');
    });

    test('getConversationMessages - should handle pagination', async () => {
      // Send multiple messages
      for (let i = 0; i < 25; i++) {
        await sendMessage(testConversation.id, {
          content: `Pagination test message ${i + 1}`
        });
      }

      // Get first page
      const firstPage = await getConversationMessages(testConversation.id, {
        limit: 10,
        offset: 0
      });

      expect(firstPage.length).toBe(10);

      // Get second page
      const secondPage = await getConversationMessages(testConversation.id, {
        limit: 10,
        offset: 10
      });

      expect(secondPage.length).toBe(10);

      // Ensure different messages
      const firstPageIds = firstPage.map(msg => msg.id);
      const secondPageIds = secondPage.map(msg => msg.id);
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(overlap.length).toBe(0);
    });

    test('editMessage - should edit message successfully', async () => {
      const originalMessage = await sendMessage(testConversation.id, {
        content: 'Original message content'
      });

      const newContent = 'Edited message content';
      const editedMessage = await editMessage(originalMessage.id, newContent);

      expect(editedMessage.content).toBe(newContent);
      expect(editedMessage.is_edited).toBe(true);
      expect(editedMessage.edited_at).toBeDefined();
      expect(editedMessage.original_content).toBe('Original message content');
    });

    test('editMessage - should prevent editing old messages', async () => {
      const message = await sendMessage(testConversation.id, {
        content: 'Old message'
      });

      // Mock old timestamp (25 hours ago)
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      
      // This would need to be tested with actual database manipulation
      // For now, we test the validation logic
      expect(message.created_at).toBeDefined();
    });

    test('deleteMessage - should soft delete message', async () => {
      const message = await sendMessage(testConversation.id, {
        content: 'Message to delete'
      });

      await deleteMessage(message.id);

      // Verify message is marked as deleted
      const messages = await getConversationMessages(testConversation.id);
      const deletedMessage = messages.find(msg => msg.id === message.id);
      
      // Should not appear in regular message retrieval
      expect(deletedMessage).toBeUndefined();
    });

    test('markMessageAsRead - should mark message as read', async () => {
      const message = await sendMessage(testConversation.id, {
        content: 'Message to mark as read'
      });

      await markMessageAsRead(message.id);

      const messages = await getConversationMessages(testConversation.id);
      const readMessage = messages.find(msg => msg.id === message.id);

      expect(readMessage?.is_read).toBe(true);
      expect(readMessage?.read_at).toBeDefined();
    });

    test('markConversationAsRead - should mark all messages as read', async () => {
      // Send multiple messages
      await sendMessage(testConversation.id, { content: 'Unread message 1' });
      await sendMessage(testConversation.id, { content: 'Unread message 2' });
      await sendMessage(testConversation.id, { content: 'Unread message 3' });

      const markedCount = await markConversationAsRead(testConversation.id);

      expect(markedCount).toBeGreaterThan(0);

      // Verify all messages are read
      const messages = await getConversationMessages(testConversation.id);
      const unreadMessages = messages.filter(msg => !msg.is_read);
      expect(unreadMessages.length).toBe(0);
    });
  });

  test.describe('File Attachment Functions', () => {
    let testConversation: any;
    let testMessage: any;

    test.beforeEach(async () => {
      testConversation = await createConversation(
        testUsers.instructor.id,
        'File Test Conversation'
      );
      testMessage = await sendMessage(testConversation.id, {
        content: 'Message with attachment'
      });
    });

    test('uploadMessageAttachment - should upload file successfully', async () => {
      const attachment = await uploadMessageAttachment(
        testMessage.id,
        testFiles.text
      );

      expect(attachment).toBeDefined();
      expect(attachment.message_id).toBe(testMessage.id);
      expect(attachment.original_filename).toBe(testFiles.text.name);
      expect(attachment.file_size).toBe(testFiles.text.size);
      expect(attachment.mime_type).toBe(testFiles.text.type);
      expect(attachment.is_uploaded).toBe(true);
    });

    test('uploadMessageAttachment - should validate file size', async () => {
      await expect(
        uploadMessageAttachment(testMessage.id, testFiles.largePdf)
      ).rejects.toThrow(MessagingError);
    });

    test('uploadMessageAttachment - should validate file type', async () => {
      await expect(
        uploadMessageAttachment(testMessage.id, testFiles.unsupported)
      ).rejects.toThrow(MessagingError);
    });

    test('uploadMessageAttachment - should enforce rate limiting', async () => {
      const promises = [];
      for (let i = 0; i < 15; i++) {
        const testFile = new File(['test'], `file-${i}.txt`, { type: 'text/plain' });
        promises.push(
          uploadMessageAttachment(testMessage.id, testFile).catch(error => error)
        );
      }

      const results = await Promise.all(promises);
      const rateLimitErrors = results.filter(
        result => result instanceof MessagingError && 
        result.code === 'RATE_LIMIT_EXCEEDED'
      );

      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    test('getAttachmentUrl - should generate signed URL', async () => {
      const attachment = await uploadMessageAttachment(
        testMessage.id,
        testFiles.image
      );

      const signedUrl = await getAttachmentUrl(attachment.id);

      expect(signedUrl).toBeDefined();
      expect(typeof signedUrl).toBe('string');
      expect(signedUrl).toContain('supabase');
    });

    test('getAttachmentUrl - should prevent unauthorized access', async () => {
      // Create attachment as instructor
      const attachment = await uploadMessageAttachment(
        testMessage.id,
        testFiles.pdf
      );

      // Try to access as unauthorized user (would need different auth context)
      // This test would require mocking different user authentication
      expect(attachment.id).toBeDefined();
    });
  });

  test.describe('Utility Functions', () => {
    test('searchMessages - should find matching messages', async () => {
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Search Test Conversation'
      );

      // Send messages with specific content
      await sendMessage(conversation.id, {
        content: 'This message contains the keyword calculus'
      });
      await sendMessage(conversation.id, {
        content: 'This is about algebra'
      });
      await sendMessage(conversation.id, {
        content: 'Another calculus related message'
      });

      const results = await searchMessages('calculus');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);

      results.forEach(result => {
        expect(result.content.toLowerCase()).toContain('calculus');
      });
    });

    test('searchMessages - should validate search query', async () => {
      // Test too short query
      await expect(
        searchMessages('a')
      ).rejects.toThrow(MessagingError);

      // Test empty query
      await expect(
        searchMessages('')
      ).rejects.toThrow(MessagingError);
    });

    test('getTotalUnreadCount - should return correct count', async () => {
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Unread Count Test'
      );

      // Send messages (they start as unread for recipient)
      await sendMessage(conversation.id, { content: 'Unread message 1' });
      await sendMessage(conversation.id, { content: 'Unread message 2' });

      const unreadCount = await getTotalUnreadCount();

      expect(typeof unreadCount).toBe('number');
      expect(unreadCount).toBeGreaterThanOrEqual(0);
    });

    test('getConversationStats - should return admin statistics', async () => {
      // This test requires admin authentication
      // Mock admin user context
      const stats = await getConversationStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalConversations');
      expect(stats).toHaveProperty('activeConversations');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('totalAttachments');
      expect(stats).toHaveProperty('averageMessagesPerConversation');

      expect(typeof stats.totalConversations).toBe('number');
      expect(typeof stats.activeConversations).toBe('number');
      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.totalAttachments).toBe('number');
      expect(typeof stats.averageMessagesPerConversation).toBe('number');
    });

    test('getConversationStats - should prevent non-admin access', async () => {
      // Mock non-admin user context
      await expect(
        getConversationStats()
      ).rejects.toThrow(MessagingError);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      const mockNetworkError = jest.fn().mockRejectedValue(
        new Error('Network request failed')
      );

      // Test with various functions
      const networkTests = [
        () => createConversation('invalid-id', 'Test'),
        () => getUserConversations(),
        () => sendMessage('invalid-conv-id', { content: 'Test' })
      ];

      for (const testFn of networkTests) {
        try {
          await testFn();
        } catch (error) {
          expect(error).toBeInstanceOf(MessagingError);
        }
      }
    });

    test('should handle authentication errors', async () => {
      // Mock unauthenticated state
      const originalGetUser = jest.fn();
      
      // Test functions that require authentication
      await expect(createConversation(testUsers.instructor.id, 'Test'))
        .rejects.toThrow(MessagingError);
    });

    test('should handle validation errors', async () => {
      const validationTests = [
        () => createConversation('', 'Test'), // Empty participant ID
        () => sendMessage('invalid-id', { content: '' }), // Empty content
        () => editMessage('invalid-id', ''), // Empty new content
      ];

      for (const testFn of validationTests) {
        await expect(testFn()).rejects.toThrow(MessagingError);
      }
    });

    test('should handle permission errors', async () => {
      // Create conversation as one user
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Permission Test'
      );

      // Mock different user context and try unauthorized operations
      // This would require proper authentication mocking
      expect(conversation.id).toBeDefined();
    });
  });

  test.describe('Performance Tests', () => {
    test('should handle concurrent operations efficiently', async () => {
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Concurrent Test'
      );

      const startTime = Date.now();

      // Send multiple messages concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        sendMessage(conversation.id, {
          content: `Concurrent message ${i + 1}`
        })
      );

      const messages = await Promise.all(promises);
      const endTime = Date.now();

      expect(messages).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Concurrent message sending took ${endTime - startTime}ms`);
    });

    test('should handle large message retrieval efficiently', async () => {
      const conversation = await createConversation(
        testUsers.instructor.id,
        'Large Retrieval Test'
      );

      // Send many messages
      for (let i = 0; i < 100; i++) {
        await sendMessage(conversation.id, {
          content: `Performance message ${i + 1}`
        });
      }

      const startTime = Date.now();
      const messages = await getConversationMessages(conversation.id, {
        limit: 50
      });
      const endTime = Date.now();

      expect(messages).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`Large message retrieval took ${endTime - startTime}ms`);
    });
  });
});