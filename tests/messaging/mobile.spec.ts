import { test, expect, devices } from '@playwright/test';
import { 
  AuthHelper, 
  MessagingHelper, 
  MobileHelper,
  takeScreenshot 
} from '../utils/test-helpers';

let authHelper: AuthHelper;
let messagingHelper: MessagingHelper;
let mobileHelper: MobileHelper;

test.describe('Mobile Messaging Responsiveness Tests', () => {
  test.describe('Mobile Viewport Tests', () => {
    // Test iPhone SE (375x667)
    test.use({ ...devices['iPhone SE'] });
    
    test('Should display messaging interface correctly on iPhone SE', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      mobileHelper = new MobileHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Take screenshot
      await takeScreenshot(page, 'iphone-se-messages');
      
      // Check mobile layout elements
      await expect(page.locator('[data-testid="mobile-message-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      
      // Verify mobile-specific navigation
      await expect(page.locator('[data-testid="mobile-back-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Test conversation creation on mobile
      await page.click('[data-testid="mobile-new-conversation-button"]');
      await expect(page.locator('[data-testid="mobile-conversation-modal"]')).toBeVisible();
    });

    test('Should handle mobile message composition', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Test mobile message input
      await expect(page.locator('[data-testid="mobile-message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-send-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-attachment-button"]')).toBeVisible();
      
      // Send message
      await page.fill('[data-testid="mobile-message-input"]', 'Test mobile message');
      await page.click('[data-testid="mobile-send-button"]');
      
      // Verify message appears
      await expect(page.locator('text=Test mobile message')).toBeVisible();
      
      // Take screenshot of conversation
      await takeScreenshot(page, 'iphone-se-conversation');
    });
  });

  test.describe('Tablet Tests', () => {
    // Test iPad (768x1024)
    test.use({ ...devices['iPad'] });
    
    test('Should display messaging interface correctly on iPad', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Take screenshot
      await takeScreenshot(page, 'ipad-messages');
      
      // Check tablet layout (should show both conversation list and messages)
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-container"]')).toBeVisible();
      
      // Verify split-screen layout
      const conversationListWidth = await page.locator('[data-testid="conversation-list"]').boundingBox();
      const messageContainerWidth = await page.locator('[data-testid="message-container"]').boundingBox();
      
      expect(conversationListWidth?.width).toBeGreaterThan(200);
      expect(messageContainerWidth?.width).toBeGreaterThan(400);
    });

    test('Should handle tablet-specific interactions', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      mobileHelper = new MobileHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      
      // Test swipe gestures on tablet
      const swipeWorked = await mobileHelper.testSwipeGestures();
      expect(swipeWorked).toBe(true);
      
      // Test multi-touch interactions
      await page.touchscreen.tap(100, 100);
      await page.touchscreen.tap(200, 200);
      
      // Verify UI responds correctly to multi-touch
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
    });
  });

  test.describe('Android Device Tests', () => {
    // Test Pixel 5
    test.use({ ...devices['Pixel 5'] });
    
    test('Should work correctly on Android devices', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Take screenshot
      await takeScreenshot(page, 'pixel-5-messages');
      
      // Test Android-specific features
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      
      // Test back button behavior (Android-specific)
      await page.keyboard.press('Android_Back');
      await expect(page).toHaveURL('/dashboard');
      
      // Navigate back to messages
      await messagingHelper.navigateToMessages();
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
    });

    test('Should handle Android keyboard interactions', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Test virtual keyboard behavior
      await page.click('[data-testid="message-input"]');
      
      // Simulate keyboard opening (viewport should adjust)
      await page.setViewportSize({ width: 393, height: 400 }); // Simulated keyboard open
      
      // Message input should still be visible
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      
      // Test sending message with keyboard
      await page.fill('[data-testid="message-input"]', 'Android keyboard test');
      await page.keyboard.press('Enter');
      
      await expect(page.locator('text=Android keyboard test')).toBeVisible();
    });
  });

  test.describe('Cross-Device Responsive Layout Tests', () => {
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPhone 12 Pro Max', width: 428, height: 926 },
      { name: 'Samsung Galaxy S21', width: 360, height: 800 },
      { name: 'iPad Mini', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Small Desktop', width: 1280, height: 720 },
      { name: 'Large Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`Should display correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        authHelper = new AuthHelper(page);
        messagingHelper = new MessagingHelper(page);
        mobileHelper = new MobileHelper(page);
        
        await authHelper.loginAsStudent();
        await messagingHelper.navigateToMessages();
        
        // Take screenshot for each viewport
        await takeScreenshot(page, `${viewport.name.toLowerCase().replace(' ', '-')}-messages`);
        
        // Test responsive layout
        const layouts = await mobileHelper.testResponsiveLayout();
        expect(layouts[`${viewport.width}x${viewport.height}`]).toBe(true);
        
        // Verify essential elements are visible
        if (viewport.width < 768) {
          // Mobile layout
          await expect(page.locator('[data-testid="mobile-message-header"]')).toBeVisible();
        } else if (viewport.width < 1024) {
          // Tablet layout
          await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
        } else {
          // Desktop layout
          await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
        }
      });
    }
  });

  test.describe('Touch Interactions', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('Should handle touch gestures correctly', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      mobileHelper = new MobileHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Send test message
      await messagingHelper.sendMessage('Test touch interaction message');
      
      // Test long press for message options
      const showedContextMenu = await mobileHelper.testTouchInteractions();
      expect(showedContextMenu).toBe(true);
      
      // Test swipe gestures
      const swipeWorked = await mobileHelper.testSwipeGestures();
      expect(swipeWorked).toBe(true);
    });

    test('Should handle pinch-to-zoom on images', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Upload an image
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('./tests/fixtures/test-image.jpg');
      
      // Wait for image to appear
      await expect(page.locator('[data-testid="message-image"]')).toBeVisible();
      
      // Simulate pinch-to-zoom
      const image = page.locator('[data-testid="message-image"]');
      const box = await image.boundingBox();
      
      if (box) {
        // Simulate zoom gesture
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2, { count: 2 });
        
        // Image should open in fullscreen or zoom
        await expect(page.locator('[data-testid="image-fullscreen"]')).toBeVisible();
      }
    });

    test('Should handle pull-to-refresh', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Simulate pull-to-refresh gesture
      await page.touchscreen.tap(200, 100);
      await page.mouse.move(200, 100);
      await page.mouse.down();
      await page.mouse.move(200, 300, { steps: 10 });
      await page.mouse.up();
      
      // Should show refresh indicator
      await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible();
      
      // Wait for refresh to complete
      await expect(page.locator('[data-testid="pull-refresh-indicator"]')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Orientation Changes', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('Should handle portrait to landscape orientation change', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Portrait mode screenshot
      await takeScreenshot(page, 'portrait-conversation');
      
      // Change to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(1000); // Allow for layout adjustment
      
      // Landscape mode screenshot
      await takeScreenshot(page, 'landscape-conversation');
      
      // Verify layout adapts to landscape
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
      
      // Message input should be properly sized in landscape
      const messageInput = page.locator('[data-testid="message-input"]');
      const inputBox = await messageInput.boundingBox();
      
      expect(inputBox?.width).toBeGreaterThan(400); // Should use available width
      
      // Test sending message in landscape
      await messagingHelper.sendMessage('Landscape orientation test message');
      await expect(page.locator('text=Landscape orientation test message')).toBeVisible();
      
      // Change back to portrait
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(1000);
      
      // Verify message is still visible
      await expect(page.locator('text=Landscape orientation test message')).toBeVisible();
    });

    test('Should maintain scroll position during orientation change', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Send multiple messages to create scrollable content
      for (let i = 1; i <= 20; i++) {
        await messagingHelper.sendMessage(`Scroll test message ${i}`);
      }
      
      // Scroll to middle of conversation
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="message-container"]');
        if (container) {
          container.scrollTop = container.scrollHeight / 2;
        }
      });
      
      // Get current scroll position
      const portraitScrollTop = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="message-container"]');
        return container?.scrollTop || 0;
      });
      
      // Change to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(1000);
      
      // Scroll position should be maintained approximately
      const landscapeScrollTop = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="message-container"]');
        return container?.scrollTop || 0;
      });
      
      // Allow for some variation due to layout changes
      const scrollDifference = Math.abs(portraitScrollTop - landscapeScrollTop);
      expect(scrollDifference).toBeLessThan(200);
    });
  });

  test.describe('Mobile-Specific Features', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('Should integrate with mobile notifications', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Check notification permission
      const notificationPermission = await page.evaluate(async () => {
        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            return await Notification.requestPermission();
          }
          return Notification.permission;
        }
        return 'not-supported';
      });
      
      if (notificationPermission === 'granted') {
        // Test notification settings
        await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
        
        // Enable mobile notifications
        await page.check('[data-testid="mobile-notifications"]');
        await page.click('[data-testid="save-notification-settings"]');
        
        await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();
      }
    });

    test('Should handle mobile app-like navigation', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Test bottom navigation (mobile app style)
      await expect(page.locator('[data-testid="mobile-bottom-nav"]')).toBeVisible();
      
      // Test conversation navigation
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Should show back button in mobile
      await expect(page.locator('[data-testid="mobile-back-button"]')).toBeVisible();
      
      // Test back navigation
      await page.click('[data-testid="mobile-back-button"]');
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
    });

    test('Should optimize for mobile keyboards', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Test message input behavior with mobile keyboard
      await page.click('[data-testid="message-input"]');
      
      // Input should have appropriate mobile attributes
      const messageInput = page.locator('[data-testid="message-input"]');
      const inputType = await messageInput.getAttribute('inputmode');
      const autocomplete = await messageInput.getAttribute('autocomplete');
      
      expect(inputType).toBe('text');
      expect(autocomplete).toBe('off');
      
      // Test autocorrect behavior
      await page.fill('[data-testid="message-input"]', 'teh quick brown fox');
      
      // Mobile should handle autocorrect
      const inputValue = await messageInput.inputValue();
      expect(inputValue).toContain('quick brown fox');
      
      // Test send button accessibility on mobile
      const sendButton = page.locator('[data-testid="send-button"]');
      const sendButtonSize = await sendButton.boundingBox();
      
      expect(sendButtonSize?.width).toBeGreaterThan(44); // Minimum touch target size
      expect(sendButtonSize?.height).toBeGreaterThan(44);
    });
  });

  test.describe('Performance on Mobile Devices', () => {
    test.use({ ...devices['iPhone SE'] }); // Test on lower-end device
    
    test('Should load quickly on slower mobile devices', async ({ page }) => {
      // Simulate slower mobile network
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40,
      });
      
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      const startTime = Date.now();
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(8000); // Should load within 8 seconds on slow mobile
      
      console.log(`Mobile messages page loaded in ${loadTime}ms on slow network`);
    });

    test('Should handle touch interactions smoothly', async ({ page }) => {
      authHelper = new AuthHelper(page);
      messagingHelper = new MessagingHelper(page);
      
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Test rapid touch interactions
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await page.touchscreen.tap(200, 300 + (i * 10));
        await page.waitForTimeout(50);
      }
      
      const endTime = Date.now();
      const touchTime = endTime - startTime;
      
      expect(touchTime).toBeLessThan(2000); // Should handle rapid touches smoothly
      console.log(`10 rapid touches handled in ${touchTime}ms`);
    });
  });
});