import { test, expect, Page, Browser } from '@playwright/test';
import { 
  AuthHelper, 
  MessagingHelper, 
  PerformanceHelper,
  DatabaseHelper 
} from '../utils/test-helpers';

let authHelper: AuthHelper;
let messagingHelper: MessagingHelper;
let performanceHelper: PerformanceHelper;
let dbHelper: DatabaseHelper;

test.describe('Messaging Performance and Load Tests', () => {
  test.beforeAll(async () => {
    dbHelper = new DatabaseHelper();
    
    // Set up test users
    await dbHelper.createTestUser('student');
    await dbHelper.createTestUser('instructor');
  });

  test.afterAll(async () => {
    await dbHelper.cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    messagingHelper = new MessagingHelper(page);
    performanceHelper = new PerformanceHelper(page);
  });

  test.describe('Page Load Performance', () => {
    test('Messages page should load within performance budget', async ({ page }) => {
      await authHelper.loginAsStudent();
      
      const loadTime = await performanceHelper.measurePageLoad('/messages');
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds on 3G
      console.log(`Messages page loaded in ${loadTime}ms`);
      
      // Check Web Vitals
      const vitals = await performanceHelper.getWebVitals();
      
      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(2500); // LCP < 2.5s
      }
      
      if (vitals.fid) {
        expect(vitals.fid).toBeLessThan(100); // FID < 100ms
      }
      
      if (vitals.cls) {
        expect(vitals.cls).toBeLessThan(0.1); // CLS < 0.1
      }
    });

    test('Conversation with many messages should load efficiently', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Create conversation with many messages (setup)
      const conversation = await dbHelper.createTestConversation(
        'student-id',
        'instructor-id'
      );
      
      if (conversation) {
        // Create 100 test messages
        for (let i = 0; i < 100; i++) {
          await dbHelper.createTestMessage(
            conversation.id,
            i % 2 === 0 ? 'student-id' : 'instructor-id',
            `Performance test message ${i + 1}`
          );
        }
        
        // Measure conversation load time
        const startTime = Date.now();
        await messagingHelper.selectConversation('Test Instructor');
        await page.waitForSelector('[data-testid="message-container"]');
        const endTime = Date.now();
        
        const loadTime = endTime - startTime;
        expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
        
        console.log(`Conversation with 100 messages loaded in ${loadTime}ms`);
      }
    });

    test('Message search should be performant', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Perform search and measure response time
      const startTime = Date.now();
      await page.fill('[data-testid="message-search"]', 'test query');
      await page.waitForSelector('[data-testid="search-results"]');
      const endTime = Date.now();
      
      const searchTime = endTime - startTime;
      expect(searchTime).toBeLessThan(1000); // Search within 1 second
      
      console.log(`Message search completed in ${searchTime}ms`);
    });
  });

  test.describe('Real-time Performance', () => {
    test('Message sending should be fast', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      const sendTime = await performanceHelper.measureMessageSendTime();
      
      expect(sendTime).toBeLessThan(1000); // Message sent within 1 second
      console.log(`Message sent in ${sendTime}ms`);
    });

    test('Real-time message delivery should have low latency', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      const studentAuthHelper = new AuthHelper(page);
      const instructorAuthHelper = new AuthHelper(instructorPage);
      const studentMessagingHelper = new MessagingHelper(page);
      const instructorMessagingHelper = new MessagingHelper(instructorPage);

      // Setup both users
      await studentAuthHelper.loginAsStudent();
      await instructorAuthHelper.loginAsInstructor();
      await studentMessagingHelper.navigateToMessages();
      await instructorMessagingHelper.navigateToMessages();
      await studentMessagingHelper.createNewConversation('Test Instructor');
      await studentMessagingHelper.selectConversation('Test Instructor');
      await instructorPage.waitForTimeout(1000);
      await instructorMessagingHelper.selectConversation('Test Student');

      // Measure real-time latency
      const testMessage = `Latency test ${Date.now()}`;
      const startTime = Date.now();
      
      await studentMessagingHelper.sendMessage(testMessage);
      
      // Wait for message to appear on instructor side
      await expect(instructorPage.locator(`text=${testMessage}`)).toBeVisible({ timeout: 5000 });
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      expect(latency).toBeLessThan(2000); // Real-time delivery within 2 seconds
      console.log(`Real-time message latency: ${latency}ms`);

      await instructorPage.close();
    });

    test('Typing indicators should respond quickly', async ({ page, context }) => {
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

      // Measure typing indicator latency
      const startTime = Date.now();
      
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('Typing...');
      
      // Wait for typing indicator on instructor side
      await expect(instructorPage.locator('text=Test Student yazıyor...')).toBeVisible({ timeout: 3000 });
      
      const endTime = Date.now();
      const indicatorLatency = endTime - startTime;
      
      expect(indicatorLatency).toBeLessThan(1500); // Typing indicator within 1.5 seconds
      console.log(`Typing indicator latency: ${indicatorLatency}ms`);

      await instructorPage.close();
    });
  });

  test.describe('Concurrent User Load Tests', () => {
    test('Should handle multiple concurrent conversations', async ({ browser, context }) => {
      const pages: Page[] = [];
      const helpers: { auth: AuthHelper; messaging: MessagingHelper }[] = [];
      
      try {
        // Create 5 concurrent user sessions
        for (let i = 0; i < 5; i++) {
          const page = await context.newPage();
          const auth = new AuthHelper(page);
          const messaging = new MessagingHelper(page);
          
          pages.push(page);
          helpers.push({ auth, messaging });
          
          // Login as different students
          await auth.loginAsStudent();
          await messaging.navigateToMessages();
        }
        
        // All users create conversations simultaneously
        const startTime = Date.now();
        
        const createPromises = helpers.map(async (helper, index) => {
          await helper.messaging.createNewConversation(`Instructor ${index}`);
        });
        
        await Promise.all(createPromises);
        
        const endTime = Date.now();
        const concurrentTime = endTime - startTime;
        
        expect(concurrentTime).toBeLessThan(10000); // All operations within 10 seconds
        console.log(`5 concurrent conversation creations took ${concurrentTime}ms`);
        
        // Send messages simultaneously
        const sendStartTime = Date.now();
        
        const sendPromises = helpers.map(async (helper, index) => {
          await helper.messaging.selectConversation(`Instructor ${index}`);
          await helper.messaging.sendMessage(`Concurrent message from user ${index}`);
        });
        
        await Promise.all(sendPromises);
        
        const sendEndTime = Date.now();
        const concurrentSendTime = sendEndTime - sendStartTime;
        
        expect(concurrentSendTime).toBeLessThan(8000); // All sends within 8 seconds
        console.log(`5 concurrent message sends took ${concurrentSendTime}ms`);
        
      } finally {
        // Cleanup
        for (const page of pages) {
          await page.close();
        }
      }
    });

    test('Should handle rapid message sending', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      const messageCount = 20;
      const startTime = Date.now();
      
      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        await page.fill('[data-testid="message-input"]', `Rapid message ${i + 1}`);
        await page.click('[data-testid="send-button"]');
        
        // Small delay to prevent overwhelming
        if (i % 5 === 0) {
          await page.waitForTimeout(100);
        }
      }
      
      // Wait for all messages to appear
      await expect(page.locator(`text=Rapid message ${messageCount}`)).toBeVisible({ timeout: 15000 });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / messageCount;
      
      expect(avgTime).toBeLessThan(500); // Average 500ms per message
      console.log(`${messageCount} rapid messages sent in ${totalTime}ms (avg: ${avgTime}ms/message)`);
    });
  });

  test.describe('File Upload Performance', () => {
    test('Small file upload should be fast', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Create small test file (1KB)
      const smallFileContent = 'a'.repeat(1024);
      const smallFile = new File([smallFileContent], 'small-test.txt', { type: 'text/plain' });
      
      const startTime = Date.now();
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([{
        name: 'small-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(smallFileContent)
      }]);
      
      await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 5000 });
      
      const endTime = Date.now();
      const uploadTime = endTime - startTime;
      
      expect(uploadTime).toBeLessThan(2000); // Small file within 2 seconds
      console.log(`1KB file uploaded in ${uploadTime}ms`);
    });

    test('Medium file upload should show progress', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Create medium test file (1MB)
      const mediumFileContent = 'a'.repeat(1024 * 1024);
      
      const startTime = Date.now();
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([{
        name: 'medium-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(mediumFileContent)
      }]);
      
      // Should show progress bar
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 15000 });
      
      const endTime = Date.now();
      const uploadTime = endTime - startTime;
      
      expect(uploadTime).toBeLessThan(10000); // 1MB file within 10 seconds
      console.log(`1MB file uploaded in ${uploadTime}ms`);
    });

    test('Multiple file uploads should be handled efficiently', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      const fileCount = 5;
      const fileSize = 100 * 1024; // 100KB each
      const files = [];
      
      for (let i = 0; i < fileCount; i++) {
        const content = 'a'.repeat(fileSize);
        files.push({
          name: `test-file-${i + 1}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from(content)
        });
      }
      
      const startTime = Date.now();
      
      // Upload all files
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(files);
      
      // Wait for all uploads to complete
      for (let i = 0; i < fileCount; i++) {
        await expect(page.locator(`[data-testid="attachment-test-file-${i + 1}.txt"]`)).toBeVisible({ timeout: 10000 });
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / fileCount;
      
      expect(avgTime).toBeLessThan(3000); // Average 3 seconds per file
      console.log(`${fileCount} files uploaded in ${totalTime}ms (avg: ${avgTime}ms/file)`);
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('Should not leak memory with many messages', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Send many messages
      for (let i = 0; i < 100; i++) {
        await page.fill('[data-testid="message-input"]', `Memory test message ${i + 1}`);
        await page.click('[data-testid="send-button"]');
        
        if (i % 10 === 0) {
          // Force garbage collection if available
          await page.evaluate(() => {
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
          await page.waitForTimeout(100);
        }
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercentage = (memoryIncrease / initialMemory) * 100;
        
        // Memory should not increase by more than 100%
        expect(increasePercentage).toBeLessThan(100);
        
        console.log(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(1)}%)`);
      }
    });

    test('Should handle browser tab switching efficiently', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Simulate tab switching by changing visibility
      const startTime = Date.now();
      
      // Hide the page (simulate tab switch away)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(1000);
      
      // Show the page again (simulate tab switch back)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Send a message to test responsiveness
      await page.fill('[data-testid="message-input"]', 'Tab switch test message');
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('text=Tab switch test message')).toBeVisible({ timeout: 3000 });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // Should be responsive within 5 seconds
      console.log(`Tab switch and message send took ${responseTime}ms`);
    });
  });

  test.describe('Network Performance', () => {
    test('Should handle slow network gracefully', async ({ page }) => {
      // Simulate slow 3G network
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40, // 40ms RTT
      });
      
      await authHelper.loginAsStudent();
      
      const startTime = Date.now();
      await messagingHelper.navigateToMessages();
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(8000); // Should load within 8 seconds on slow network
      
      console.log(`Messages page loaded on slow network in ${loadTime}ms`);
      
      // Disable network throttling
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
    });

    test('Should cache resources effectively', async ({ page }) => {
      await authHelper.loginAsStudent();
      
      // First load
      const firstLoadStart = Date.now();
      await messagingHelper.navigateToMessages();
      const firstLoadEnd = Date.now();
      const firstLoadTime = firstLoadEnd - firstLoadStart;
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Second load (should be faster due to caching)
      const secondLoadStart = Date.now();
      await messagingHelper.navigateToMessages();
      const secondLoadEnd = Date.now();
      const secondLoadTime = secondLoadEnd - secondLoadStart;
      
      // Second load should be at least 20% faster
      const improvement = (firstLoadTime - secondLoadTime) / firstLoadTime * 100;
      expect(improvement).toBeGreaterThan(20);
      
      console.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms (${improvement.toFixed(1)}% improvement)`);
    });
  });

  test.describe('Database Performance', () => {
    test('Should handle large conversation lists efficiently', async ({ page }) => {
      // Create many conversations (this would be done in DB setup)
      await authHelper.loginAsStudent();
      
      const startTime = Date.now();
      await messagingHelper.navigateToMessages();
      
      // Wait for conversations to load
      await page.waitForSelector('[data-testid="conversation-list"]');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load large list within 5 seconds
      console.log(`Large conversation list loaded in ${loadTime}ms`);
      
      // Test scrolling performance
      const scrollStart = Date.now();
      
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="conversation-list"]');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
      
      await page.waitForTimeout(500); // Allow for smooth scrolling
      
      const scrollEnd = Date.now();
      const scrollTime = scrollEnd - scrollStart;
      
      expect(scrollTime).toBeLessThan(1000); // Scrolling within 1 second
      console.log(`Conversation list scroll took ${scrollTime}ms`);
    });

    test('Should optimize message queries', async ({ page }) => {
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Monitor network requests
      const requests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api') || request.url().includes('supabase')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });
      
      // Create and select conversation
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Wait for all requests to complete
      await page.waitForTimeout(2000);
      
      // Analyze request patterns
      const messageRequests = requests.filter(req => 
        req.url.includes('messages') || req.url.includes('conversations')
      );
      
      // Should not make excessive API calls
      expect(messageRequests.length).toBeLessThan(10);
      
      // Check for duplicate requests
      const uniqueUrls = new Set(messageRequests.map(req => req.url));
      const duplicateCount = messageRequests.length - uniqueUrls.size;
      
      expect(duplicateCount).toBeLessThan(3); // Minimal duplicate requests
      
      console.log(`Made ${messageRequests.length} API requests (${duplicateCount} duplicates)`);
    });
  });
});