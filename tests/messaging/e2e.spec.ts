import { test, expect, Page } from '@playwright/test';
import { 
  AuthHelper, 
  MessagingHelper, 
  DatabaseHelper,
  waitForNetwork,
  takeScreenshot,
  getConsoleErrors 
} from '../utils/test-helpers';
import { testUsers } from '../fixtures/test-data';

let authHelper: AuthHelper;
let messagingHelper: MessagingHelper;
let dbHelper: DatabaseHelper;

test.describe('End-to-End Messaging User Journeys', () => {
  test.beforeAll(async () => {
    dbHelper = new DatabaseHelper();
    
    // Set up test users in database
    await dbHelper.createTestUser('student');
    await dbHelper.createTestUser('instructor');
    await dbHelper.createTestUser('admin');
  });

  test.afterAll(async () => {
    await dbHelper.cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    messagingHelper = new MessagingHelper(page);
    
    // Track console errors
    getConsoleErrors(page);
  });

  test.describe('Complete Conversation Creation Flow', () => {
    test('Student should create conversation with instructor', async ({ page }) => {
      // Login as student
      await authHelper.loginAsStudent();
      
      // Navigate to messages
      await messagingHelper.navigateToMessages();
      
      // Take screenshot of messages page
      await takeScreenshot(page, 'messages-page-student');
      
      // Create new conversation
      await messagingHelper.createNewConversation('Test Instructor');
      
      // Verify conversation appears in list
      await expect(page.locator('[data-testid="conversation-Test Instructor"]')).toBeVisible();
      
      // Take screenshot of created conversation
      await takeScreenshot(page, 'conversation-created');
    });

    test('Instructor should see new conversation notification', async ({ page }) => {
      // First, create conversation as student
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await authHelper.logout();
      
      // Login as instructor
      await authHelper.loginAsInstructor();
      
      // Check for unread badge
      const unreadCount = await messagingHelper.getUnreadCount();
      expect(unreadCount).toBeGreaterThan(0);
      
      // Navigate to messages
      await messagingHelper.navigateToMessages();
      
      // Verify conversation appears with unread indicator
      await expect(page.locator('[data-testid="unread-indicator"]')).toBeVisible();
    });

    test('Should prevent conversation between same role users', async ({ page }) => {
      // Login as student
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Try to create conversation with another student
      await page.click('[data-testid="new-conversation-button"]');
      await page.fill('[data-testid="participant-search"]', 'Another Student');
      
      // Should show error or no results
      await expect(page.locator('[data-testid="no-valid-participants"]')).toBeVisible();
    });
  });

  test.describe('Message Sending and Receiving Flow', () => {
    test('Should send and receive messages in real-time', async ({ page, context }) => {
      // Create second page for instructor
      const instructorPage = await context.newPage();
      const studentAuthHelper = new AuthHelper(page);
      const instructorAuthHelper = new AuthHelper(instructorPage);
      const studentMessagingHelper = new MessagingHelper(page);
      const instructorMessagingHelper = new MessagingHelper(instructorPage);

      // Login both users
      await studentAuthHelper.loginAsStudent();
      await instructorAuthHelper.loginAsInstructor();

      // Navigate both to messages
      await studentMessagingHelper.navigateToMessages();
      await instructorMessagingHelper.navigateToMessages();

      // Student creates conversation
      await studentMessagingHelper.createNewConversation('Test Instructor');
      await studentMessagingHelper.selectConversation('Test Instructor');

      // Wait for instructor to see the conversation
      await instructorPage.waitForTimeout(1000);
      await instructorMessagingHelper.selectConversation('Test Student');

      // Student sends message
      const studentMessage = 'Hello, I need help with calculus!';
      await studentMessagingHelper.sendMessage(studentMessage);

      // Instructor should see message in real-time
      await expect(instructorPage.locator(`text=${studentMessage}`)).toBeVisible({ timeout: 5000 });

      // Instructor replies
      const instructorReply = 'Of course! What specific topic?';
      await instructorMessagingHelper.sendMessage(instructorReply);

      // Student should see reply in real-time
      await expect(page.locator(`text=${instructorReply}`)).toBeVisible({ timeout: 5000 });

      // Take screenshots of both sides
      await takeScreenshot(page, 'student-conversation');
      await takeScreenshot(instructorPage, 'instructor-conversation');

      await instructorPage.close();
    });

    test('Should show typing indicators', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      const studentAuthHelper = new AuthHelper(page);
      const instructorAuthHelper = new AuthHelper(instructorPage);
      const studentMessagingHelper = new MessagingHelper(page);
      const instructorMessagingHelper = new MessagingHelper(instructorPage);

      // Setup conversation
      await studentAuthHelper.loginAsStudent();
      await instructorAuthHelper.loginAsInstructor();
      await studentMessagingHelper.navigateToMessages();
      await instructorMessagingHelper.navigateToMessages();
      await studentMessagingHelper.createNewConversation('Test Instructor');
      await studentMessagingHelper.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessagingHelper.selectConversation('Test Student');

      // Student starts typing
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('I am typing...');

      // Instructor should see typing indicator
      await instructorMessagingHelper.waitForTypingIndicator('Test Student');

      // Student stops typing
      await page.keyboard.press('Escape');
      
      // Typing indicator should disappear
      await expect(instructorPage.locator('text=Test Student yazıyor...')).not.toBeVisible({ timeout: 5000 });

      await instructorPage.close();
    });

    test('Should handle message delivery status', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Send message and wait for delivery confirmation
      const message = 'Test message delivery status';
      await messagingHelper.sendMessage(message);
      await messagingHelper.waitForMessageDelivery(message);

      // Verify delivery indicator
      await expect(page.locator('[data-testid="message-delivered"]')).toBeVisible();
    });

    test('Should update read status when message is viewed', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      const studentAuthHelper = new AuthHelper(page);
      const instructorAuthHelper = new AuthHelper(instructorPage);
      const studentMessagingHelper = new MessagingHelper(page);
      const instructorMessagingHelper = new MessagingHelper(instructorPage);

      // Setup and send message
      await studentAuthHelper.loginAsStudent();
      await instructorAuthHelper.loginAsInstructor();
      await studentMessagingHelper.navigateToMessages();
      await instructorMessagingHelper.navigateToMessages();
      await studentMessagingHelper.createNewConversation('Test Instructor');
      await studentMessagingHelper.selectConversation('Test Instructor');

      const message = 'Please mark this as read';
      await studentMessagingHelper.sendMessage(message);

      // Instructor views message
      await instructorPage.waitForTimeout(1000);
      await instructorMessagingHelper.selectConversation('Test Student');
      await expect(instructorPage.locator(`text=${message}`)).toBeVisible();

      // Student should see read receipt
      await expect(page.locator('[data-testid="message-read"]')).toBeVisible({ timeout: 5000 });

      await instructorPage.close();
    });
  });

  test.describe('File Attachment Workflow', () => {
    test('Should upload and download file attachments', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Create a test file
      const testFilePath = './tests/fixtures/test-document.pdf';
      
      // Upload file
      await messagingHelper.uploadFile(testFilePath);
      
      // Verify file appears in message
      await expect(page.locator('[data-testid="attachment-preview"]')).toBeVisible();
      await expect(page.locator('text=test-document.pdf')).toBeVisible();

      // Click to download file
      await page.click('[data-testid="download-attachment"]');
      
      // Verify download started
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('test-document.pdf');
    });

    test('Should validate file types and sizes', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Try to upload unsupported file type
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('./tests/fixtures/test-executable.exe');
      
      // Should show error
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();

      // Try to upload file that's too large
      await fileInput.setInputFiles('./tests/fixtures/large-file.zip');
      
      // Should show size error
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
    });

    test('Should show upload progress', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Upload file and check progress
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('./tests/fixtures/medium-document.pdf');
      
      // Progress bar should appear
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Message Management Features', () => {
    test('Should edit messages within time limit', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      const originalMessage = 'Original message content';
      const editedMessage = 'Edited message content';

      // Send message
      await messagingHelper.sendMessage(originalMessage);

      // Edit message
      await messagingHelper.editMessage(originalMessage, editedMessage);

      // Verify edit
      await expect(page.locator(`text=${editedMessage}`)).toBeVisible();
      await expect(page.locator('[data-testid="edited-indicator"]')).toBeVisible();
    });

    test('Should delete messages', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      const messageToDelete = 'This message will be deleted';

      // Send message
      await messagingHelper.sendMessage(messageToDelete);

      // Delete message
      await messagingHelper.deleteMessage(messageToDelete);

      // Verify deletion
      await expect(page.locator(`text=${messageToDelete}`)).not.toBeVisible();
      await expect(page.locator('text=[Bu mesaj silindi]')).toBeVisible();
    });

    test('Should thread replies correctly', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      const parentMessage = 'This is the parent message';
      const replyMessage = 'This is a reply';

      // Send parent message
      await messagingHelper.sendMessage(parentMessage);

      // Reply to message
      await page.hover(`text=${parentMessage}`);
      await page.click('[data-testid="reply-to-message"]');
      await page.fill('[data-testid="reply-input"]', replyMessage);
      await page.click('[data-testid="send-reply"]');

      // Verify threading
      await expect(page.locator('[data-testid="message-thread"]')).toBeVisible();
      await expect(page.locator(`text=${replyMessage}`)).toBeVisible();
      
      // Check thread indication
      await expect(page.locator('[data-testid="thread-indicator"]')).toBeVisible();
    });
  });

  test.describe('Conversation Management', () => {
    test('Should archive and unarchive conversations', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');

      // Archive conversation
      await messagingHelper.archiveConversation();

      // Verify conversation moved to archived
      await page.click('[data-testid="show-archived"]');
      await expect(page.locator('[data-testid="conversation-Test Instructor"]')).toBeVisible();

      // Unarchive conversation
      await page.click('[data-testid="conversation-menu"]');
      await page.click('[data-testid="unarchive-conversation"]');

      // Verify conversation back in main list
      await page.click('[data-testid="show-active"]');
      await expect(page.locator('[data-testid="conversation-Test Instructor"]')).toBeVisible();
    });

    test('Should mute and unmute conversations', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');

      // Mute conversation
      await page.click('[data-testid="conversation-menu"]');
      await page.click('[data-testid="mute-conversation"]');

      // Verify mute indicator
      await expect(page.locator('[data-testid="muted-indicator"]')).toBeVisible();

      // Unmute conversation
      await page.click('[data-testid="conversation-menu"]');
      await page.click('[data-testid="unmute-conversation"]');

      // Verify mute indicator removed
      await expect(page.locator('[data-testid="muted-indicator"]')).not.toBeVisible();
    });

    test('Should search conversations', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Create multiple conversations
      await messagingHelper.createNewConversation('Math Instructor');
      await messagingHelper.createNewConversation('Physics Instructor');
      await messagingHelper.createNewConversation('Chemistry Instructor');

      // Search for specific conversation
      await page.fill('[data-testid="conversation-search"]', 'Math');

      // Verify filtered results
      await expect(page.locator('[data-testid="conversation-Math Instructor"]')).toBeVisible();
      await expect(page.locator('[data-testid="conversation-Physics Instructor"]')).not.toBeVisible();

      // Clear search
      await page.fill('[data-testid="conversation-search"]', '');
      
      // All conversations should be visible again
      await expect(page.locator('[data-testid="conversation-Math Instructor"]')).toBeVisible();
      await expect(page.locator('[data-testid="conversation-Physics Instructor"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Should handle network disconnection gracefully', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Simulate network failure
      await page.route('**/*', route => route.abort());

      // Try to send message
      await page.fill('[data-testid="message-input"]', 'This should fail');
      await page.click('[data-testid="send-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

      // Restore network
      await page.unroute('**/*');

      // Retry should work
      await page.click('[data-testid="retry-send"]');
      await expect(page.locator('text=This should fail')).toBeVisible({ timeout: 5000 });
    });

    test('Should handle session expiration', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();

      // Simulate session expiration by clearing auth
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to send message
      await page.fill('[data-testid="message-input"]', 'Should redirect to login');
      await page.click('[data-testid="send-button"]');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('Should handle empty states', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();

      // No conversations state
      await expect(page.locator('[data-testid="no-conversations"]')).toBeVisible();
      await expect(page.locator('text=Henüz hiç konuşmanız yok')).toBeVisible();

      // Create conversation
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // No messages state
      await expect(page.locator('[data-testid="no-messages"]')).toBeVisible();
    });

    test('Should validate message input', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Try to send empty message
      await page.click('[data-testid="send-button"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="empty-message-error"]')).toBeVisible();

      // Try to send very long message
      const longMessage = 'a'.repeat(10001);
      await page.fill('[data-testid="message-input"]', longMessage);
      await page.click('[data-testid="send-button"]');
      
      // Should show length error
      await expect(page.locator('[data-testid="message-too-long-error"]')).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('Should handle conversation with many messages', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Send many messages quickly
      for (let i = 1; i <= 50; i++) {
        await page.fill('[data-testid="message-input"]', `Performance test message ${i}`);
        await page.click('[data-testid="send-button"]');
        
        // Small delay to prevent overwhelming
        if (i % 10 === 0) {
          await page.waitForTimeout(1000);
        }
      }

      // Verify all messages loaded
      await expect(page.locator('text=Performance test message 50')).toBeVisible();
      
      // Test scrolling performance
      await page.evaluate(() => {
        const messageContainer = document.querySelector('[data-testid="message-container"]');
        messageContainer?.scrollTo({ top: 0, behavior: 'smooth' });
      });

      await expect(page.locator('text=Performance test message 1')).toBeVisible();
    });

    test('Should load messages efficiently with pagination', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Measure load time
      const startTime = Date.now();

      // Scroll to top to trigger pagination
      await page.evaluate(() => {
        const messageContainer = document.querySelector('[data-testid="message-container"]');
        messageContainer?.scrollTo({ top: 0 });
      });

      // Wait for load more indicator
      await expect(page.locator('[data-testid="loading-more-messages"]')).toBeVisible();

      // Wait for messages to load
      await expect(page.locator('[data-testid="loading-more-messages"]')).not.toBeVisible();

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000);

      console.log(`Message pagination took ${loadTime}ms`);
    });
  });

  test.describe('Integration with Other Platform Features', () => {
    test('Should integrate with user profiles', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');

      // Click on instructor profile
      await page.click('[data-testid="participant-profile"]');

      // Should show profile modal or navigate to profile
      await expect(page.locator('[data-testid="user-profile-modal"]')).toBeVisible();
      await expect(page.locator('text=Test Instructor')).toBeVisible();
    });

    test('Should show course context in conversations', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Create conversation with course context
      await page.click('[data-testid="new-conversation-button"]');
      await page.selectOption('[data-testid="course-context"]', 'Mathematics 101');
      await page.fill('[data-testid="participant-search"]', 'Math Instructor');
      await page.click('[data-testid="create-conversation-button"]');

      // Should show course context in conversation
      await expect(page.locator('[data-testid="course-badge"]')).toBeVisible();
      await expect(page.locator('text=Mathematics 101')).toBeVisible();
    });

    test('Should handle notifications preferences', async ({ page }) => {
      await authHelper.loginAsStudent();
      await page.goto('/profile');

      // Update notification preferences
      await page.click('[data-testid="notification-settings"]');
      await page.uncheck('[data-testid="message-notifications"]');
      await page.click('[data-testid="save-preferences"]');

      // Go to messages and verify notifications are disabled
      await messagingHelper.navigateToMessages();
      
      // Check if notification indicators are disabled
      const hasNotificationPermission = await page.evaluate(() => {
        return Notification.permission === 'granted';
      });

      if (hasNotificationPermission) {
        // Notifications should be disabled for messages
        await expect(page.locator('[data-testid="notifications-disabled"]')).toBeVisible();
      }
    });
  });
});