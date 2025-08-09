import { test, expect } from '@playwright/test';
import { 
  AuthHelper, 
  MessagingHelper, 
  AccessibilityHelper,
  takeScreenshot 
} from '../utils/test-helpers';

let authHelper: AuthHelper;
let messagingHelper: MessagingHelper;
let accessibilityHelper: AccessibilityHelper;

test.describe('Messaging Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    messagingHelper = new MessagingHelper(page);
    accessibilityHelper = new AccessibilityHelper(page);
    
    await authHelper.loginAsStudent();
    await messagingHelper.navigateToMessages();
  });

  test.describe('Keyboard Navigation', () => {
    test('Should support full keyboard navigation', async ({ page }) => {
      // Test keyboard navigation through messaging interface
      const navigation = await accessibilityHelper.checkKeyboardNavigation();
      
      expect(navigation.isKeyboardAccessible).toBe(true);
      expect(navigation.focusableElements.length).toBeGreaterThan(5);
      
      // Verify essential elements are keyboard accessible
      const expectedElements = [
        'new-conversation-button',
        'conversation-search',
        'message-input',
        'send-button',
        'file-input'
      ];
      
      for (const element of expectedElements) {
        expect(navigation.focusableElements).toContain(element);
      }
    });

    test('Should handle Tab navigation correctly', async ({ page }) => {
      // Start from new conversation button
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('new-conversation-button');
      
      // Navigate to search
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('conversation-search');
      
      // Create conversation for further testing
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Navigate to message input
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('message-input');
      
      // Navigate to send button
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('send-button');
    });

    test('Should support Enter key for sending messages', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Focus message input and type
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('Keyboard test message');
      
      // Send with Enter key
      await page.keyboard.press('Enter');
      
      // Verify message was sent
      await expect(page.locator('text=Keyboard test message')).toBeVisible();
    });

    test('Should support Shift+Enter for line breaks', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('First line');
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Second line');
      
      const inputValue = await page.locator('[data-testid="message-input"]').inputValue();
      expect(inputValue).toContain('First line\nSecond line');
    });

    test('Should support Escape key for closing modals', async ({ page }) => {
      // Open new conversation modal
      await page.click('[data-testid="new-conversation-button"]');
      await expect(page.locator('[data-testid="new-conversation-modal"]')).toBeVisible();
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="new-conversation-modal"]')).not.toBeVisible();
    });

    test('Should support arrow keys for message navigation', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Send multiple messages
      for (let i = 1; i <= 5; i++) {
        await messagingHelper.sendMessage(`Navigation test message ${i}`);
      }
      
      // Focus on message container
      await page.click('[data-testid="message-container"]');
      
      // Use arrow keys to navigate messages
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      
      // Check if navigation works (implementation-dependent)
      const focusedMessage = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedMessage).toContain('message-');
    });
  });

  test.describe('Screen Reader Support', () => {
    test('Should have proper heading structure', async ({ page }) => {
      const screenReaderSupport = await accessibilityHelper.checkScreenReaderSupport();
      
      expect(screenReaderSupport.hasHeadings).toBe(true);
      expect(screenReaderSupport.hasMainLandmark).toBe(true);
      expect(screenReaderSupport.hasNavigationLandmark).toBe(true);
    });

    test('Should have proper ARIA labels', async ({ page }) => {
      const ariaLabels = await accessibilityHelper.checkAriaLabels();
      
      expect(ariaLabels.buttonsWithoutLabel).toBe(0);
      expect(ariaLabels.inputsWithoutLabel).toBe(0);
      
      // Check specific elements have proper labels
      await expect(page.locator('[data-testid="new-conversation-button"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="conversation-search"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="message-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="send-button"]')).toHaveAttribute('aria-label');
    });

    test('Should announce message sending status', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Check for status announcements
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // Send message and check for announcement
      await messagingHelper.sendMessage('Screen reader test message');
      
      // Should have status update in aria-live region
      await expect(page.locator('[aria-live="polite"]')).toContainText('Message sent');
    });

    test('Should provide message metadata for screen readers', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      await messagingHelper.sendMessage('Metadata test message');
      
      // Check message has proper structure for screen readers
      const messageElement = page.locator('[data-testid="message-bubble"]').first();
      
      await expect(messageElement).toHaveAttribute('role', 'article');
      await expect(messageElement).toHaveAttribute('aria-label');
      
      // Check for timestamp and sender information
      await expect(messageElement.locator('[data-testid="message-time"]')).toHaveAttribute('aria-label');
      await expect(messageElement.locator('[data-testid="message-sender"]')).toHaveAttribute('aria-label');
    });

    test('Should provide typing indicator announcements', async ({ page, context }) => {
      const instructorPage = await context.newPage();
      const instructorAuth = new AuthHelper(instructorPage);
      const instructorMessaging = new MessagingHelper(instructorPage);
      
      await instructorAuth.loginAsInstructor();
      await instructorMessaging.navigateToMessages();
      
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      await instructorPage.waitForTimeout(1000);
      await instructorMessaging.selectConversation('Test Student');
      
      // Student starts typing
      await page.click('[data-testid="message-input"]');
      await page.keyboard.type('Typing indicator test...');
      
      // Instructor should get aria-live announcement
      await expect(instructorPage.locator('[aria-live="polite"]')).toContainText('is typing');
      
      await instructorPage.close();
    });

    test('Should support high contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      // Check if high contrast styles are applied
      const supportsHighContrast = await accessibilityHelper.checkColorContrast();
      
      // Take screenshot in high contrast mode
      await takeScreenshot(page, 'high-contrast-messages');
      
      // Verify essential elements are still visible
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-conversation-button"]')).toBeVisible();
    });
  });

  test.describe('Visual Accessibility', () => {
    test('Should have sufficient color contrast', async ({ page }) => {
      // Check background/foreground contrast
      const contrastResults = await page.evaluate(() => {
        const elements = [
          { selector: '[data-testid="conversation-list"]', type: 'background' },
          { selector: '[data-testid="message-input"]', type: 'input' },
          { selector: '[data-testid="send-button"]', type: 'button' },
          { selector: '.message-bubble', type: 'message' }
        ];
        
        return elements.map(element => {
          const el = document.querySelector(element.selector);
          if (el) {
            const styles = window.getComputedStyle(el);
            return {
              selector: element.selector,
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              type: element.type
            };
          }
          return null;
        }).filter(Boolean);
      });
      
      expect(contrastResults.length).toBeGreaterThan(0);
      
      // Verify no elements have pure white text on pure white background
      for (const result of contrastResults) {
        expect(result.color).not.toBe('rgb(255, 255, 255)');
        expect(result.backgroundColor).not.toBe('rgb(255, 255, 255)');
      }
    });

    test('Should support reduced motion preferences', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Check that animations are disabled
      const animationElements = await page.locator('[data-testid="message-animation"]').count();
      
      // Send message and verify no excessive animation
      await messagingHelper.sendMessage('Reduced motion test');
      
      // Animations should be minimal or disabled
      const hasAnimation = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const styles = window.getComputedStyle(el);
          if (styles.animationDuration !== '0s' && styles.animationDuration !== '') {
            return true;
          }
        }
        return false;
      });
      
      // With reduced motion, animations should be minimal
      expect(hasAnimation).toBe(false);
    });

    test('Should have readable font sizes', async ({ page }) => {
      const fontSizes = await page.evaluate(() => {
        const textElements = [
          '[data-testid="conversation-title"]',
          '[data-testid="message-content"]',
          '[data-testid="message-time"]',
          '[data-testid="participant-name"]'
        ];
        
        return textElements.map(selector => {
          const el = document.querySelector(selector);
          if (el) {
            const styles = window.getComputedStyle(el);
            return {
              selector,
              fontSize: parseFloat(styles.fontSize),
              lineHeight: styles.lineHeight
            };
          }
          return null;
        }).filter(Boolean);
      });
      
      // Check minimum font sizes (16px for body text, 14px for secondary)
      for (const font of fontSizes) {
        if (font.selector.includes('message-content') || font.selector.includes('conversation-title')) {
          expect(font.fontSize).toBeGreaterThanOrEqual(16); // Primary text
        } else {
          expect(font.fontSize).toBeGreaterThanOrEqual(14); // Secondary text
        }
      }
    });

    test('Should support zoom up to 200%', async ({ page }) => {
      // Set zoom level to 200%
      await page.setViewportSize({ width: 640, height: 480 }); // Simulate 200% zoom on 1280x960
      
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Take screenshot at 200% zoom
      await takeScreenshot(page, 'zoom-200-messages');
      
      // Verify essential elements are still accessible
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      
      // Verify functionality still works
      await messagingHelper.sendMessage('Zoom test message');
      await expect(page.locator('text=Zoom test message')).toBeVisible();
    });
  });

  test.describe('Focus Management', () => {
    test('Should manage focus correctly in modals', async ({ page }) => {
      // Open new conversation modal
      await page.click('[data-testid="new-conversation-button"]');
      
      // Focus should be on first input in modal
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('participant-search');
      
      // Tab should cycle within modal
      await page.keyboard.press('Tab');
      const nextFocused = await page.locator(':focus').getAttribute('data-testid');
      expect(['create-conversation-button', 'cancel-button']).toContain(nextFocused);
      
      // Escape should close modal and return focus
      await page.keyboard.press('Escape');
      
      const finalFocused = await page.locator(':focus').getAttribute('data-testid');
      expect(finalFocused).toBe('new-conversation-button');
    });

    test('Should maintain focus when switching conversations', async ({ page }) => {
      // Create multiple conversations
      await messagingHelper.createNewConversation('Instructor 1');
      await messagingHelper.createNewConversation('Instructor 2');
      
      // Focus on first conversation
      await page.click('[data-testid="conversation-Instructor 1"]');
      
      // Switch to second conversation with keyboard
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Focus should be on message input
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('message-input');
    });

    test('Should handle focus in message threads', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Send parent message
      await messagingHelper.sendMessage('Parent message for threading');
      
      // Focus on reply button
      await page.hover('[data-testid="message-bubble"]');
      await page.click('[data-testid="reply-button"]');
      
      // Focus should be on reply input
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('reply-input');
    });

    test('Should handle focus when uploading files', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Focus on file input button
      await page.click('[data-testid="file-upload-button"]');
      
      // Hidden file input should be triggered
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('./tests/fixtures/test-document.pdf');
      
      // Focus should return to appropriate element
      await page.waitForTimeout(1000);
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(['message-input', 'send-button']).toContain(focusedElement);
    });
  });

  test.describe('Error Accessibility', () => {
    test('Should announce errors to screen readers', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Try to send empty message (should show error)
      await page.click('[data-testid="send-button"]');
      
      // Error should be announced
      const errorAnnouncement = page.locator('[aria-live="assertive"]');
      await expect(errorAnnouncement).toContainText('Message cannot be empty');
      
      // Error should be associated with input
      const messageInput = page.locator('[data-testid="message-input"]');
      await expect(messageInput).toHaveAttribute('aria-describedby');
      
      const errorId = await messageInput.getAttribute('aria-describedby');
      await expect(page.locator(`#${errorId}`)).toContainText('Message cannot be empty');
    });

    test('Should handle network errors accessibly', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      // Try to send message
      await page.fill('[data-testid="message-input"]', 'Network error test');
      await page.click('[data-testid="send-button"]');
      
      // Error should be announced
      await expect(page.locator('[aria-live="assertive"]')).toContainText('Network error');
      
      // Retry button should be keyboard accessible
      await expect(page.locator('[data-testid="retry-button"]')).toHaveAttribute('aria-label');
      
      // Restore network
      await page.unroute('**/*');
    });

    test('Should provide accessible file upload errors', async ({ page }) => {
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Try to upload unsupported file type
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('./tests/fixtures/unsupported-file.exe');
      
      // Error should be announced
      await expect(page.locator('[aria-live="assertive"]')).toContainText('File type not supported');
      
      // Error should be associated with file input
      const uploadButton = page.locator('[data-testid="file-upload-button"]');
      await expect(uploadButton).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('Should have proper touch targets', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check touch target sizes (minimum 44x44px)
      const touchTargets = [
        '[data-testid="new-conversation-button"]',
        '[data-testid="send-button"]',
        '[data-testid="file-upload-button"]',
        '[data-testid="mobile-back-button"]'
      ];
      
      for (const target of touchTargets) {
        const element = page.locator(target);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(44);
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('Should support mobile screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await messagingHelper.createNewConversation('Test Instructor');
      await messagingHelper.selectConversation('Test Instructor');
      
      // Check mobile-specific accessibility features
      await expect(page.locator('[data-testid="mobile-message-header"]')).toHaveAttribute('role', 'banner');
      await expect(page.locator('[data-testid="mobile-message-list"]')).toHaveAttribute('role', 'main');
      
      // Check swipe gesture descriptions
      const swipeableElements = page.locator('[data-testid*="swipeable"]');
      if (await swipeableElements.count() > 0) {
        await expect(swipeableElements.first()).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Internationalization Accessibility', () => {
    test('Should support RTL languages', async ({ page }) => {
      // Simulate RTL language (Arabic/Hebrew)
      await page.addInitScript(() => {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      });
      
      await page.reload();
      await authHelper.loginAsStudent();
      await messagingHelper.navigateToMessages();
      
      // Take screenshot in RTL mode
      await takeScreenshot(page, 'rtl-messages');
      
      // Verify layout adapts to RTL
      const conversationList = page.locator('[data-testid="conversation-list"]');
      const messageContainer = page.locator('[data-testid="message-container"]');
      
      const listBox = await conversationList.boundingBox();
      const containerBox = await messageContainer.boundingBox();
      
      // In RTL, conversation list should be on the right
      if (listBox && containerBox) {
        expect(listBox.x).toBeGreaterThan(containerBox.x);
      }
    });

    test('Should have proper language attributes', async ({ page }) => {
      // Check lang attributes are present
      const langAttribute = await page.getAttribute('html', 'lang');
      expect(langAttribute).toBeTruthy();
      
      // Check for language-specific content
      const messages = page.locator('[data-testid="message-content"]');
      if (await messages.count() > 0) {
        // Messages should inherit language or have explicit lang attribute
        const firstMessage = messages.first();
        const messageLang = await firstMessage.getAttribute('lang');
        
        // Either has explicit lang or inherits from document
        expect(messageLang || langAttribute).toBeTruthy();
      }
    });
  });

  test.describe('Voice Control Support', () => {
    test('Should support voice commands through proper labeling', async ({ page }) => {
      // Check that all interactive elements have proper names for voice control
      const voiceElements = [
        { selector: '[data-testid="new-conversation-button"]', expectedLabel: /new.*conversation/i },
        { selector: '[data-testid="send-button"]', expectedLabel: /send/i },
        { selector: '[data-testid="message-input"]', expectedLabel: /message/i },
        { selector: '[data-testid="conversation-search"]', expectedLabel: /search/i }
      ];
      
      for (const element of voiceElements) {
        const el = page.locator(element.selector);
        if (await el.isVisible()) {
          const ariaLabel = await el.getAttribute('aria-label');
          const title = await el.getAttribute('title');
          const placeholder = await el.getAttribute('placeholder');
          
          const labelText = ariaLabel || title || placeholder || '';
          expect(labelText).toMatch(element.expectedLabel);
        }
      }
    });
  });
});