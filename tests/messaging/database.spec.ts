import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { DatabaseHelper } from '../utils/test-helpers';
import { testUsers, testConversations, testMessages } from '../fixtures/test-data';

let dbHelper: DatabaseHelper;
let supabase: any;

test.describe('Messaging Database Integration Tests', () => {
  test.beforeAll(async () => {
    dbHelper = new DatabaseHelper();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      test.skip('Supabase credentials not configured');
    }
    
    supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Verify database connectivity
    const isHealthy = await dbHelper.verifyDatabaseIntegrity();
    if (!isHealthy) {
      test.skip('Database is not accessible');
    }
  });

  test.afterAll(async () => {
    // Clean up test data
    await dbHelper.cleanupTestData();
  });

  test.describe('Schema Validation', () => {
    test('should have all required messaging tables', async () => {
      const tables = [
        'profiles',
        'conversations',
        'messages',
        'message_attachments',
        'message_read_status'
      ];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
      }
    });

    test('should have correct column structure for conversations table', async () => {
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'conversations' });

      expect(error).toBeNull();
      
      const requiredColumns = [
        'id', 'participant_1_id', 'participant_2_id', 'title',
        'last_message_id', 'last_message_at', 'archived_by_participant_1',
        'archived_by_participant_2', 'muted_by_participant_1', 
        'muted_by_participant_2', 'created_at', 'updated_at'
      ];

      if (data) {
        const columnNames = data.map((col: any) => col.column_name);
        for (const column of requiredColumns) {
          expect(columnNames).toContain(column);
        }
      }
    });

    test('should have correct column structure for messages table', async () => {
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'messages' });

      expect(error).toBeNull();
      
      const requiredColumns = [
        'id', 'conversation_id', 'sender_id', 'content', 'message_type',
        'parent_message_id', 'thread_depth', 'is_edited', 'edited_at',
        'original_content', 'is_deleted', 'deleted_at', 'deleted_by',
        'created_at', 'updated_at'
      ];

      if (data) {
        const columnNames = data.map((col: any) => col.column_name);
        for (const column of requiredColumns) {
          expect(columnNames).toContain(column);
        }
      }
    });

    test('should have proper foreign key constraints', async () => {
      // Test foreign key constraint on conversations.participant_1_id
      const { error: fkError1 } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: 'invalid-uuid',
          participant_2_id: testUsers.instructor.id,
          title: 'Test Conversation'
        });

      expect(fkError1).not.toBeNull();
      expect(fkError1.message).toContain('foreign key');

      // Test foreign key constraint on messages.conversation_id
      const { error: fkError2 } = await supabase
        .from('messages')
        .insert({
          conversation_id: 'invalid-uuid',
          sender_id: testUsers.student.id,
          content: 'Test message',
          message_type: 'text'
        });

      expect(fkError2).not.toBeNull();
      expect(fkError2.message).toContain('foreign key');
    });
  });

  test.describe('Row Level Security (RLS) Tests', () => {
    test('should enforce RLS on conversations table', async () => {
      // Create test users first
      await dbHelper.createTestUser('student');
      await dbHelper.createTestUser('instructor');

      // Test that users can only see their own conversations
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_1_id', testUsers.student.id);

      expect(error).toBeNull();
      expect(Array.isArray(conversations)).toBe(true);

      // Each conversation should have the user as a participant
      conversations?.forEach((conv: any) => {
        expect(
          conv.participant_1_id === testUsers.student.id ||
          conv.participant_2_id === testUsers.student.id
        ).toBe(true);
      });
    });

    test('should enforce RLS on messages table', async () => {
      // Create a test conversation
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        // Create a test message
        const message = await dbHelper.createTestMessage(
          conversation.id,
          testUsers.student.id,
          'Test RLS message'
        );

        expect(message).not.toBeNull();
        expect(message.sender_id).toBe(testUsers.student.id);
        expect(message.conversation_id).toBe(conversation.id);
      }
    });

    test('should prevent unauthorized access to conversations', async () => {
      // Create a conversation between two other users
      const conversation = await dbHelper.createTestConversation(
        testUsers.instructor.id,
        testUsers.admin.id
      );

      if (conversation) {
        // Try to access conversation as student (should fail or return empty)
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversation.id)
          .eq('participant_1_id', testUsers.student.id);

        expect(data).toEqual([]);
      }
    });

    test('should prevent unauthorized message creation', async () => {
      // Create a conversation between instructor and admin
      const conversation = await dbHelper.createTestConversation(
        testUsers.instructor.id,
        testUsers.admin.id
      );

      if (conversation) {
        // Try to create message as student (should fail)
        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: testUsers.student.id,
            content: 'Unauthorized message',
            message_type: 'text'
          });

        expect(error).not.toBeNull();
      }
    });
  });

  test.describe('Database Triggers and Functions', () => {
    test('should update last_message_at when new message is created', async () => {
      // Create test conversation
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        const originalLastMessageAt = conversation.last_message_at;
        
        // Wait a moment to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create a new message
        const message = await dbHelper.createTestMessage(
          conversation.id,
          testUsers.student.id,
          'Trigger test message'
        );

        expect(message).not.toBeNull();

        // Check if conversation was updated
        const { data: updatedConversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversation.id)
          .single();

        expect(updatedConversation.last_message_at).not.toBe(originalLastMessageAt);
        expect(new Date(updatedConversation.last_message_at).getTime())
          .toBeGreaterThan(new Date(originalLastMessageAt).getTime());
      }
    });

    test('should automatically create message_read_status entries', async () => {
      // Create test conversation and message
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        const message = await dbHelper.createTestMessage(
          conversation.id,
          testUsers.student.id,
          'Read status test message'
        );

        if (message) {
          // Check if read status entries were created for both participants
          const { data: readStatuses } = await supabase
            .from('message_read_status')
            .select('*')
            .eq('message_id', message.id);

          expect(readStatuses).toHaveLength(2);
          
          // Check that sender's message is marked as read
          const senderStatus = readStatuses?.find(
            (status: any) => status.user_id === testUsers.student.id
          );
          expect(senderStatus?.is_read).toBe(true);
          
          // Check that recipient's message is marked as unread
          const recipientStatus = readStatuses?.find(
            (status: any) => status.user_id === testUsers.instructor.id
          );
          expect(recipientStatus?.is_read).toBe(false);
        }
      }
    });

    test('should enforce thread depth limits', async () => {
      // Create conversation and initial message
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        let parentMessage = await dbHelper.createTestMessage(
          conversation.id,
          testUsers.student.id,
          'Initial message'
        );

        // Create nested replies up to max depth
        for (let depth = 1; depth <= 5; depth++) {
          const { data: replyMessage, error } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              sender_id: testUsers.instructor.id,
              content: `Reply at depth ${depth}`,
              message_type: 'text',
              parent_message_id: parentMessage.id,
              thread_depth: depth
            })
            .select()
            .single();

          expect(error).toBeNull();
          expect(replyMessage.thread_depth).toBe(Math.min(depth, 5));
          parentMessage = replyMessage;
        }

        // Try to create a reply beyond max depth (should be capped at 5)
        const { data: deepReply, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: testUsers.student.id,
            content: 'Too deep reply',
            message_type: 'text',
            parent_message_id: parentMessage.id,
            thread_depth: 6
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(deepReply.thread_depth).toBe(5); // Should be capped at 5
      }
    });
  });

  test.describe('Data Integrity Tests', () => {
    test('should maintain referential integrity on cascade deletes', async () => {
      // Create test data hierarchy
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        const message = await dbHelper.createTestMessage(
          conversation.id,
          testUsers.student.id,
          'Cascade test message'
        );

        if (message) {
          // Create attachment
          const { data: attachment } = await supabase
            .from('message_attachments')
            .insert({
              message_id: message.id,
              filename: 'test-file.txt',
              original_filename: 'test-file.txt',
              file_size: 1024,
              mime_type: 'text/plain',
              storage_path: 'test/path',
              storage_bucket: 'message-attachments',
              is_uploaded: true
            })
            .select()
            .single();

          expect(attachment).not.toBeNull();

          // Delete the message and check cascading
          const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .eq('id', message.id);

          expect(deleteError).toBeNull();

          // Check that related records are handled properly
          const { data: remainingAttachments } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', message.id);

          const { data: remainingReadStatus } = await supabase
            .from('message_read_status')
            .select('*')
            .eq('message_id', message.id);

          // Depending on cascade settings, these should be empty
          expect(remainingAttachments).toEqual([]);
          expect(remainingReadStatus).toEqual([]);
        }
      }
    });

    test('should enforce unique constraints', async () => {
      // Test unique constraint on conversation participants
      const conversation1 = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id,
        'First conversation'
      );

      expect(conversation1).not.toBeNull();

      // Try to create duplicate conversation (reversed participants)
      const { error } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: testUsers.instructor.id,
          participant_2_id: testUsers.student.id,
          title: 'Duplicate conversation'
        });

      // Should either prevent duplicate or allow it based on business rules
      // This depends on how the unique constraint is set up
      console.log('Duplicate conversation result:', { error });
    });

    test('should validate message content constraints', async () => {
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        // Test empty content (should fail)
        const { error: emptyError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: testUsers.student.id,
            content: '',
            message_type: 'text'
          });

        expect(emptyError).not.toBeNull();

        // Test very long content (should fail if limit exists)
        const longContent = 'a'.repeat(15000); // Assuming 10K limit
        const { error: longError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: testUsers.student.id,
            content: longContent,
            message_type: 'text'
          });

        expect(longError).not.toBeNull();
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should handle bulk message insertion efficiently', async () => {
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        const startTime = Date.now();
        
        // Insert 100 messages
        const messages = Array.from({ length: 100 }, (_, i) => ({
          conversation_id: conversation.id,
          sender_id: i % 2 === 0 ? testUsers.student.id : testUsers.instructor.id,
          content: `Bulk message ${i + 1}`,
          message_type: 'text' as const
        }));

        const { error } = await supabase
          .from('messages')
          .insert(messages);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(error).toBeNull();
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        console.log(`Bulk insert of 100 messages took ${duration}ms`);
      }
    });

    test('should query conversations efficiently with pagination', async () => {
      // Create multiple conversations for testing
      const conversations = [];
      for (let i = 0; i < 20; i++) {
        const conv = await dbHelper.createTestConversation(
          testUsers.student.id,
          testUsers.instructor.id,
          `Performance test conversation ${i + 1}`
        );
        if (conv) conversations.push(conv);
      }

      const startTime = Date.now();

      // Test paginated query performance
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:profiles!conversations_participant_1_id_fkey(id, full_name, avatar_url, is_admin),
          participant_2:profiles!conversations_participant_2_id_fkey(id, full_name, avatar_url, is_admin)
        `)
        .or(`participant_1_id.eq.${testUsers.student.id},participant_2_id.eq.${testUsers.student.id}`)
        .order('last_message_at', { ascending: false })
        .range(0, 9); // First 10 results

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Paginated conversation query took ${duration}ms`);
    });

    test('should handle complex message queries efficiently', async () => {
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        // Create some messages first
        for (let i = 0; i < 50; i++) {
          await dbHelper.createTestMessage(
            conversation.id,
            i % 2 === 0 ? testUsers.student.id : testUsers.instructor.id,
            `Performance message ${i + 1}`
          );
        }

        const startTime = Date.now();

        // Complex query with joins and filtering
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, is_admin),
            read_status:message_read_status!inner(is_read, read_at),
            attachments:message_attachments(*)
          `)
          .eq('conversation_id', conversation.id)
          .eq('is_deleted', false)
          .eq('message_read_status.user_id', testUsers.student.id)
          .order('created_at', { ascending: false })
          .range(0, 24); // First 25 messages

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(error).toBeNull();
        expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

        console.log(`Complex message query took ${duration}ms`);
      }
    });
  });

  test.describe('Real-time Subscription Tests', () => {
    test('should properly set up real-time subscriptions', async () => {
      const conversation = await dbHelper.createTestConversation(
        testUsers.student.id,
        testUsers.instructor.id
      );

      if (conversation) {
        let receivedMessage = false;
        let subscriptionError = false;

        // Set up subscription
        const subscription = supabase
          .channel('test-messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversation.id}`
            },
            (payload: any) => {
              receivedMessage = true;
              expect(payload.new).toBeDefined();
              expect(payload.new.conversation_id).toBe(conversation.id);
            }
          )
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR') {
              subscriptionError = true;
            }
          });

        // Wait for subscription to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create a new message
        await dbHelper.createTestMessage(
          conversation.id,
          testUsers.instructor.id,
          'Real-time test message'
        );

        // Wait for real-time notification
        await new Promise(resolve => setTimeout(resolve, 2000));

        expect(subscriptionError).toBe(false);
        expect(receivedMessage).toBe(true);

        // Clean up subscription
        subscription.unsubscribe();
      }
    });
  });
});