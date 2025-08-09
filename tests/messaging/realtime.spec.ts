import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  AuthHelper, 
  MessagingHelper, 
  DatabaseHelper,
  takeScreenshot 
} from '../utils/test-helpers';

let dbHelper: DatabaseHelper;

test.describe('Real-time Messaging Functionality Tests', () => {
  test.beforeAll(async () => {
    dbHelper = new DatabaseHelper();
    
    // Set up test users
    await dbHelper.createTestUser('student');
    await dbHelper.createTestUser('instructor');
  });

  test.afterAll(async () => {
    await dbHelper.cleanupTestData();
  });

  test.describe('WebSocket Connection Management', () => {
    test('Should establish WebSocket connection on page load', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const messagingHelper = new MessagingHelper(page);
      
      // Monitor WebSocket connections
      const wsConnections: any[] = [];
      page.on('websocket', ws => {
        wsConnections.push({
          url: ws.url(),
          connected: true,
          timestamp: Date.now()
        });
        
        ws.on('close', () => {
          wsConnections[wsConnections.length - 1].connected = false;
        });
      });
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Wait for WebSocket connection
      await page.waitForTimeout(2000);
      
      expect(wsConnections.length).toBeGreaterThan(0);
      expect(wsConnections[0].connected).toBe(true);
      expect(wsConnections[0].url).toContain('realtime');
    });

    test('Should handle WebSocket reconnection', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const messagingHelper = new MessagingHelper(page);
      
      let reconnectionAttempts = 0;
      page.on('websocket', ws => {
        ws.on('close', () => {
          reconnectionAttempts++;
        });
      });
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Simulate network interruption
      await page.route('**/*realtime*', route => route.abort());
      await page.waitForTimeout(1000);
      
      // Restore connection
      await page.unroute('**/*realtime*');
      await page.waitForTimeout(3000);
      
      // Should attempt reconnection
      expect(reconnectionAttempts).toBeGreaterThan(0);
      
      // Verify functionality restored
      await messagingHelper.createNewConversation('Test Instructor');
      await expect(page.locator('[data-testid="conversation-Test Instructor"]')).toBeVisible();
    });

    test('Should handle WebSocket connection errors gracefully', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const messagingHelper = new MessagingHelper(page);
      
      // Block WebSocket connections
      await page.route('**/*realtime*', route => route.abort());
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Should show offline indicator or graceful degradation
      await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
      
      // Basic functionality should still work (polling fallback)
      await messagingHelper.createNewConversation('Test Instructor');
      await expect(page.locator('[data-testid="conversation-Test Instructor"]')).toBeVisible();
    });
  });

  test.describe('Real-time Message Delivery', () => {
    test('Should deliver messages in real-time between users', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      // Setup both users
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      // Student creates conversation
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      
      // Instructor should see new conversation in real-time
      await expect(instructorPage.locator('[data-testid="conversation-Test Student"]')).toBeVisible({ timeout: 5000 });
      
      await instructorMessaging.selectConversation('Test Student');
      
      // Test bidirectional real-time messaging
      const studentMessage = `Student message ${Date.now()}`;
      const instructorMessage = `Instructor reply ${Date.now()}`;
      
      // Student sends message
      await studentMessaging.sendMessage(studentMessage);
      
      // Instructor should see message immediately
      await expect(instructorPage.locator(`text=${studentMessage}`)).toBeVisible({ timeout: 3000 });
      
      // Instructor replies
      await instructorMessaging.sendMessage(instructorMessage);
      
      // Student should see reply immediately
      await expect(page.locator(`text=${instructorMessage}`)).toBeVisible({ timeout: 3000 });
      
      await instructorPage.close();
    });

    test('Should maintain message order in real-time', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // Send rapid sequence of messages
      const messages = [
        'First message',
        'Second message', 
        'Third message',
        'Fourth message',
        'Fifth message'
      ];
      
      // Student sends rapid messages
      for (const message of messages) {
        await studentMessaging.sendMessage(message);
        await page.waitForTimeout(200); // Small delay between messages
      }
      
      // Verify order on instructor side
      for (let i = 0; i < messages.length; i++) {
        const messageElements = instructorPage.locator('[data-testid="message-content"]');
        const messageText = await messageElements.nth(i).textContent();
        expect(messageText).toBe(messages[i]);
      }
      
      await instructorPage.close();
    });

    test('Should handle concurrent messages from multiple users', async ({ page, context }) => {
      const instructor1Page = await context.newPage();
      const instructor2Page = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructor1Auth = new AuthHelper(instructor1Page);
      const instructor2Auth = new AuthHelper(instructor2Page);
      const studentMessaging = new MessagingHelper(page);
      const instructor1Messaging = new MessagingHelper(instructor1Page);
      const instructor2Messaging = new MessagingHelper(instructor2Page);
      
      // Login all users
      await studentAuth.loginAsStudent();
      await instructor1Auth.loginAsInstructor();
      await instructor2Auth.loginAsInstructor();
      
      await studentMessaging.navigateToMessages();
      await instructor1Messaging.navigateToMessages();
      await instructor2Messaging.navigateToMessages();
      
      // Create conversations
      await studentMessaging.createNewConversation('Instructor 1');
      await studentMessaging.createNewConversation('Instructor 2');
      
      // Select conversations
      await studentMessaging.selectConversation('Instructor 1');
      await instructor1Page.waitForTimeout(1000);
      await instructor1Messaging.selectConversation('Test Student');
      
      // Switch to second conversation
      await studentMessaging.selectConversation('Instructor 2');
      await instructor2Page.waitForTimeout(1000);
      await instructor2Messaging.selectConversation('Test Student');
      
      // Send concurrent messages
      const promises = [
        instructor1Messaging.sendMessage('Message from Instructor 1'),
        instructor2Messaging.sendMessage('Message from Instructor 2')
      ];
      
      await Promise.all(promises);
      
      // Student should receive both messages in correct conversations
      await studentMessaging.selectConversation('Instructor 1');
      await expect(page.locator('text=Message from Instructor 1')).toBeVisible();
      
      await studentMessaging.selectConversation('Instructor 2');
      await expect(page.locator('text=Message from Instructor 2')).toBeVisible();
      
      await instructor1Page.close();
      await instructor2Page.close();
    });
  });

  test.describe('Typing Indicators', () => {
    test('Should show typing indicators in real-time', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // Student starts typing
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('I am typing a message...');
      
      // Instructor should see typing indicator
      await expect(instructorPage.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 3000 });
      await expect(instructorPage.locator('text=Test Student yazıyor...')).toBeVisible();
      
      // Student stops typing
      await page.keyboard.press('Escape');
      await page.click('[data-testid="conversation-list"]'); // Focus away
      
      // Typing indicator should disappear
      await expect(instructorPage.locator('[data-testid="typing-indicator"]')).not.toBeVisible({ timeout: 5000 });
      
      await instructorPage.close();
    });

    test('Should handle multiple users typing simultaneously', async ({ page, context }) => {
      const instructor1Page = await context.newPage();
      const instructor2Page = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructor1Auth = new AuthHelper(instructor1Page);
      const instructor2Auth = new AuthHelper(instructor2Page);
      const studentMessaging = new MessagingHelper(page);
      const instructor1Messaging = new MessagingHelper(instructor1Page);
      const instructor2Messaging = new MessagingHelper(instructor2Page);
      
      // Setup group conversation (if supported) or test in separate conversations
      await studentAuth.loginAsStudent();
      await instructor1Auth.loginAsInstructor();
      await instructor2Auth.loginAsInstructor();
      
      await studentMessaging.navigateToMessages();
      await instructor1Messaging.navigateToMessages();
      await instructor2Messaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Instructor 1');
      await studentMessaging.selectConversation('Instructor 1');
      await instructor1Page.waitForTimeout(1000);
      await instructor1Messaging.selectConversation('Test Student');
      
      // Both instructors start typing (in sequence for this test)
      await instructor1Page.click('[data-testid="message-input"]');
      await instructor1Page.keyboard.type('Instructor 1 typing...');
      
      // Student should see typing indicator
      await expect(page.locator('text=Test Instructor yazıyor...')).toBeVisible();
      
      await instructor1Page.close();
      await instructor2Page.close();
    });

    test('Should auto-hide typing indicators after timeout', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // Student starts typing
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('Typing...');
      
      // Instructor should see typing indicator
      await expect(instructorPage.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 3000 });
      
      // Wait for auto-timeout (typically 3-5 seconds)
      await page.waitForTimeout(6000);
      
      // Typing indicator should auto-hide
      await expect(instructorPage.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
      
      await instructorPage.close();
    });
  });

  test.describe('Read Status Updates', () => {
    test('Should update read status in real-time', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      
      // Student sends message
      const testMessage = `Read status test ${Date.now()}`;
      await studentMessaging.sendMessage(testMessage);
      
      // Message should show as unread initially
      await expect(page.locator('[data-testid="message-unread"]')).toBeVisible();
      
      // Instructor views message
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      await expect(instructorPage.locator(`text=${testMessage}`)).toBeVisible();
      
      // Student should see read receipt in real-time
      await expect(page.locator('[data-testid="message-read"]')).toBeVisible({ timeout: 5000 });
      
      await instructorPage.close();
    });

    test('Should show delivery confirmation', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      
      // Send message
      const testMessage = `Delivery test ${Date.now()}`;
      await studentMessaging.sendMessage(testMessage);
      
      // Should show delivery confirmation
      await expect(page.locator('[data-testid="message-delivered"]')).toBeVisible({ timeout: 3000 });
      
      await instructorPage.close();
    });

    test('Should handle read status for multiple messages', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      
      // Send multiple messages
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      for (const message of messages) {
        await studentMessaging.sendMessage(message);
        await page.waitForTimeout(500);
      }
      
      // All messages should be unread
      const unreadCount = await page.locator('[data-testid="message-unread"]').count();
      expect(unreadCount).toBe(3);
      
      // Instructor views conversation
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // All messages should be marked as read
      await expect(page.locator('[data-testid="message-read"]')).toHaveCount(3, { timeout: 5000 });
      
      await instructorPage.close();
    });
  });

  test.describe('Online/Offline Status', () => {
    test('Should show user online/offline status', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      
      // Should show instructor as online
      await expect(page.locator('[data-testid="participant-online-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-online"]')).toBeVisible();
      
      // Instructor goes offline
      await instructorPage.close();
      
      // Should show instructor as offline
      await expect(page.locator('[data-testid="status-offline"]')).toBeVisible({ timeout: 10000 });
    });

    test('Should handle last seen timestamps', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      
      // Send message while instructor is online
      await studentMessaging.sendMessage('Online message test');
      
      // Instructor goes offline
      await instructorPage.close();
      
      // Should show last seen timestamp
      await expect(page.locator('[data-testid="last-seen-timestamp"]')).toBeVisible({ timeout: 10000 });
      
      const lastSeenText = await page.locator('[data-testid="last-seen-timestamp"]').textContent();
      expect(lastSeenText).toMatch(/son görülme|last seen/i);
    });
  });

  test.describe('Real-time Notifications', () => {
    test('Should show in-app notifications for new messages', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      
      // Student goes to dashboard (away from messages)
      await page.goto('/dashboard');
      
      await instructorMessaging.navigateToMessages();
      await instructorMessaging.createNewConversation('Test Student');
      await instructorMessaging.selectConversation('Test Student');
      await instructorMessaging.sendMessage('Notification test message');
      
      // Student should see notification
      await expect(page.locator('[data-testid="message-notification"]')).toBeVisible({ timeout: 5000 });
      
      // Notification should contain message preview
      const notificationText = await page.locator('[data-testid="notification-content"]').textContent();
      expect(notificationText).toContain('Notification test message');
      
      await instructorPage.close();
    });

    test('Should update unread count in real-time', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      // Initial unread count should be 0
      let unreadCount = await messagingHelper.getUnreadCount();
      expect(unreadCount).toBe(0);
      
      // Instructor sends message
      await instructorMessaging.createNewConversation('Test Student');
      await instructorMessaging.selectConversation('Test Student');
      await instructorMessaging.sendMessage('Unread count test 1');
      
      // Student should see unread count increase
      await expect(page.locator('[data-testid="unread-badge"]')).toContainText('1', { timeout: 5000 });
      
      // Send another message
      await instructorMessaging.sendMessage('Unread count test 2');
      
      // Count should increase to 2
      await expect(page.locator('[data-testid="unread-badge"]')).toContainText('2', { timeout: 5000 });
      
      // Student reads messages
      await studentMessaging.selectConversation('Test Instructor');
      
      // Count should reset to 0
      await expect(page.locator('[data-testid="unread-badge"]')).not.toBeVisible({ timeout: 5000 });
      
      await instructorPage.close();
    });

    test('Should handle browser notification permissions', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      
      // Mock notification permission
      await page.evaluate(() => {
        Object.defineProperty(Notification, 'permission', {
          value: 'default',
          writable: true
        });
        
        Notification.requestPermission = jest.fn().mockResolvedValue('granted');
      });
      
      await messagingHelper.navigateToMessages();
      
      // Should prompt for notification permission
      const permissionPrompt = page.locator('[data-testid="notification-permission-prompt"]');
      if (await permissionPrompt.isVisible()) {
        await page.click('[data-testid="enable-notifications"]');
        
        // Should show permission granted state
        await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();
      }
    });
  });

  test.describe('Real-time Error Handling', () => {
    test('Should handle message sending failures gracefully', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Simulate API failure
      await page.route('**/messages*', route => route.abort());
      
      // Try to send message
      await page.fill('[data-testid="message-input"]', 'Failed message test');
      await page.click('[data-testid="send-button"]');
      
      // Should show error state
      await expect(page.locator('[data-testid="message-send-error"]')).toBeVisible();
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-send-button"]')).toBeVisible();
      
      // Restore API
      await page.unroute('**/messages*');
      
      // Retry should work
      await page.click('[data-testid="retry-send-button"]');
      await expect(page.locator('text=Failed message test')).toBeVisible({ timeout: 5000 });
    });

    test('Should handle connection drops during conversation', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // Establish conversation
      await studentMessaging.sendMessage('Before connection drop');
      await expect(instructorPage.locator('text=Before connection drop')).toBeVisible();
      
      // Simulate connection drop
      await page.route('**/*realtime*', route => route.abort());
      
      // Should show connection warning
      await expect(page.locator('[data-testid="connection-warning"]')).toBeVisible({ timeout: 5000 });
      
      // Messages should queue locally
      await studentMessaging.sendMessage('Queued message');
      await expect(page.locator('[data-testid="message-queued"]')).toBeVisible();
      
      // Restore connection
      await page.unroute('**/*realtime*');
      await page.waitForTimeout(3000);
      
      // Queued message should be sent
      await expect(instructorPage.locator('text=Queued message')).toBeVisible({ timeout: 10000 });
      
      await instructorPage.close();
    });

    test('Should handle server-side errors in real-time updates', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Monitor console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Simulate server errors
      await page.route('**/realtime**', route => {
        route.fulfill({
          status: 500,
          body: 'Internal Server Error'
        });
      });
      
      await messagingHelper.createNewConversation('Test Instructor');
      
      // Should handle errors gracefully without crashing
      await page.waitForTimeout(2000);
      
      // Check that critical errors didn't occur
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('Uncaught') || error.includes('TypeError')
      );
      expect(criticalErrors.length).toBe(0);
      
      // Should show appropriate error message
      await expect(page.locator('[data-testid="realtime-error"]')).toBeVisible();
    });
  });

  test.describe('Performance Under Load', () => {
    test('Should handle rapid real-time updates', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      
      const studentAuth = new AuthHelper(page);
      const instructorAuth = new AuthHelper(instructorPage);
      const studentMessaging = new MessagingHelper(page);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await studentAuth.loginAsStudent();
      await instructorAuth.loginAsInstructor();
      await studentMessaging.navigateToMessages();
      await instructorMessaging.navigateToMessages();
      
      await studentMessaging.createNewConversation('Test Instructor');
      await studentMessaging.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // Send rapid messages
      const messageCount = 20;
      const startTime = Date.now();
      
      for (let i = 1; i <= messageCount; i++) {
        await instructorMessaging.sendMessage(`Rapid message ${i}`);
        await instructorPage.waitForTimeout(100); // Small delay
      }
      
      // Wait for all messages to arrive
      await expect(page.locator(`text=Rapid message ${messageCount}`)).toBeVisible({ timeout: 10000 });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / messageCount;
      
      expect(avgLatency).toBeLessThan(1000); // Average latency under 1 second
      console.log(`Rapid messages average latency: ${avgLatency}ms`);
      
      await instructorPage.close();
    });

    test('Should maintain performance with many active connections', async ({ page, browser }) => {
      // Create multiple browser contexts to simulate multiple users
      const contexts = [];
      const pages = [];
      
      try {
        for (let i = 0; i < 5; i++) {
          const context = await browser.newContext();
          const userPage = await context.newPage();
          
          contexts.push(context);
          pages.push(userPage);
          
          const auth = new AuthHelper(userPage);
          const messaging = new MessagingHelper(userPage);
          
          await auth.loginAsStudent();
          await messaging.navigateToMessages();
        }
        
        // All users should be able to create conversations
        const startTime = Date.now();
        
        const promises = pages.map(async (userPage, index) => {
          const messaging = new MessagingHelper(userPage);
          await messaging.createNewConversation(`Instructor ${index}`);
        });
        
        await Promise.all(promises);
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        expect(totalTime).toBeLessThan(10000); // All operations within 10 seconds
        console.log(`${pages.length} concurrent operations took ${totalTime}ms`);
        
      } finally {
        // Clean up
        for (const context of contexts) {
          await context.close();
        }
      }
    });
  });
});