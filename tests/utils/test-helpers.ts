import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { testUsers } from '../fixtures/test-data';

// Database Helper Functions
export class DatabaseHelper {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  async cleanupTestData() {
    if (!this.supabase) return;

    try {
      // Clean up in reverse dependency order
      await this.supabase.from('message_attachments').delete().ilike('filename', 'test-%');
      await this.supabase.from('message_read_status').delete().in('user_id', Object.values(testUsers).map(u => u.id));
      await this.supabase.from('messages').delete().ilike('content', '%test%');
      await this.supabase.from('conversations').delete().in('participant_1_id', Object.values(testUsers).map(u => u.id));
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }

  async createTestUser(userType: 'student' | 'instructor' | 'admin') {
    if (!this.supabase) return null;

    const userData = testUsers[userType];
    
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .upsert(userData)
        .select()
        .single();
      
      return error ? null : data;
    } catch (error) {
      console.warn(`Failed to create test ${userType}:`, error);
      return null;
    }
  }

  async createTestConversation(participant1Id: string, participant2Id: string, title?: string) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          participant_1_id: participant1Id,
          participant_2_id: participant2Id,
          title: title || `Test Conversation ${Date.now()}`,
        })
        .select()
        .single();
      
      return error ? null : data;
    } catch (error) {
      console.warn('Failed to create test conversation:', error);
      return null;
    }
  }

  async createTestMessage(conversationId: string, senderId: string, content: string) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: 'text',
        })
        .select()
        .single();
      
      return error ? null : data;
    } catch (error) {
      console.warn('Failed to create test message:', error);
      return null;
    }
  }

  async verifyDatabaseIntegrity() {
    if (!this.supabase) return false;

    try {
      // Test basic table access
      const tests = [
        this.supabase.from('profiles').select('count').limit(1),
        this.supabase.from('conversations').select('count').limit(1),
        this.supabase.from('messages').select('count').limit(1),
        this.supabase.from('message_attachments').select('count').limit(1),
        this.supabase.from('message_read_status').select('count').limit(1),
      ];

      await Promise.all(tests);
      return true;
    } catch (error) {
      console.error('Database integrity check failed:', error);
      return false;
    }
  }
}

// Authentication Helper Functions
export class AuthHelper {
  constructor(private page: Page) {}

  async loginAsStudent() {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email"]', testUsers.student.email);
    await this.page.fill('[data-testid="password"]', 'testpassword123');
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL('/dashboard');
  }

  async loginAsInstructor() {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email"]', testUsers.instructor.email);
    await this.page.fill('[data-testid="password"]', 'testpassword123');
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL('/dashboard');
  }

  async loginAsAdmin() {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email"]', testUsers.admin.email);
    await this.page.fill('[data-testid="password"]', 'testpassword123');
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to admin dashboard
    await expect(this.page).toHaveURL(/\/(admin|dashboard)/);
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await expect(this.page).toHaveURL('/login');
  }

  async getCurrentUser() {
    return await this.page.evaluate(() => {
      return window.localStorage.getItem('supabase.auth.token');
    });
  }
}

// Messaging Helper Functions
export class MessagingHelper {
  constructor(private page: Page) {}

  async navigateToMessages() {
    await this.page.click('[data-testid="messages-nav"]');
    await expect(this.page).toHaveURL('/messages');
  }

  async createNewConversation(participantName: string) {
    await this.page.click('[data-testid="new-conversation-button"]');
    await this.page.fill('[data-testid="participant-search"]', participantName);
    await this.page.click(`[data-testid="participant-${participantName}"]`);
    await this.page.click('[data-testid="create-conversation-button"]');
  }

  async selectConversation(conversationTitle: string) {
    await this.page.click(`[data-testid="conversation-${conversationTitle}"]`);
  }

  async sendMessage(content: string) {
    await this.page.fill('[data-testid="message-input"]', content);
    await this.page.click('[data-testid="send-button"]');
    
    // Wait for message to appear
    await expect(this.page.locator(`text=${content}`)).toBeVisible();
  }

  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await expect(this.page.locator('[data-testid="upload-success"]')).toBeVisible();
  }

  async editMessage(messageContent: string, newContent: string) {
    await this.page.hover(`text=${messageContent}`);
    await this.page.click('[data-testid="edit-message-button"]');
    await this.page.fill('[data-testid="edit-message-input"]', newContent);
    await this.page.click('[data-testid="save-edit-button"]');
    
    // Wait for edit to complete
    await expect(this.page.locator(`text=${newContent}`)).toBeVisible();
  }

  async deleteMessage(messageContent: string) {
    await this.page.hover(`text=${messageContent}`);
    await this.page.click('[data-testid="delete-message-button"]');
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for message to be deleted
    await expect(this.page.locator(`text=${messageContent}`)).not.toBeVisible();
  }

  async archiveConversation() {
    await this.page.click('[data-testid="conversation-menu"]');
    await this.page.click('[data-testid="archive-conversation"]');
    
    // Wait for archive confirmation
    await expect(this.page.locator('[data-testid="archive-success"]')).toBeVisible();
  }

  async getUnreadCount() {
    const badge = this.page.locator('[data-testid="unread-badge"]');
    if (await badge.isVisible()) {
      return parseInt(await badge.textContent() || '0');
    }
    return 0;
  }

  async waitForTypingIndicator(userName: string) {
    await expect(this.page.locator(`text=${userName} yazıyor...`)).toBeVisible();
  }

  async waitForMessageDelivery(messageContent: string) {
    // Wait for message to be sent and delivered
    const messageElement = this.page.locator(`text=${messageContent}`).first();
    await expect(messageElement).toBeVisible();
    
    // Check for delivery indicator
    const deliveryIndicator = messageElement.locator('..').locator('[data-testid="message-delivered"]');
    await expect(deliveryIndicator).toBeVisible();
  }
}

// Performance Helper Functions
export class PerformanceHelper {
  constructor(private page: Page) {}

  async measurePageLoad(url: string) {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  async measureMessageSendTime() {
    const startTime = Date.now();
    await this.page.fill('[data-testid="message-input"]', 'Performance test message');
    await this.page.click('[data-testid="send-button"]');
    await expect(this.page.locator('text=Performance test message')).toBeVisible();
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  async measureRealTimeLatency() {
    // This would need multiple browser contexts to measure properly
    const startTime = Date.now();
    
    // Send message and wait for real-time update
    await this.page.fill('[data-testid="message-input"]', `Latency test ${startTime}`);
    await this.page.click('[data-testid="send-button"]');
    
    // In a real test, we'd measure time until the message appears in another browser
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  async getWebVitals() {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: Record<string, number> = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'FCP') vitals.fcp = entry.value;
            if (entry.name === 'LCP') vitals.lcp = entry.value;
            if (entry.name === 'FID') vitals.fid = entry.value;
            if (entry.name === 'CLS') vitals.cls = entry.value;
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
  }
}

// Accessibility Helper Functions
export class AccessibilityHelper {
  constructor(private page: Page) {}

  async checkAriaLabels() {
    const elementsWithoutAriaLabel = await this.page.locator('button:not([aria-label]):not([aria-labelledby])').count();
    const inputsWithoutLabel = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count();
    
    return {
      buttonsWithoutLabel: elementsWithoutAriaLabel,
      inputsWithoutLabel: inputsWithoutLabel,
    };
  }

  async checkKeyboardNavigation() {
    // Test tab navigation through messaging interface
    await this.page.keyboard.press('Tab');
    const firstFocusedElement = await this.page.locator(':focus').getAttribute('data-testid');
    
    // Continue tabbing through interface
    const focusableElements = [];
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press('Tab');
      const focusedElement = await this.page.locator(':focus').getAttribute('data-testid');
      if (focusedElement) {
        focusableElements.push(focusedElement);
      }
    }
    
    return {
      firstElement: firstFocusedElement,
      focusableElements,
      isKeyboardAccessible: focusableElements.length > 0,
    };
  }

  async checkColorContrast() {
    // This would require additional tools like axe-core
    // For now, we'll check if high contrast mode is supported
    return await this.page.evaluate(() => {
      return window.matchMedia('(prefers-contrast: high)').matches;
    });
  }

  async checkScreenReaderSupport() {
    // Check for proper heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
    const mainLandmark = await this.page.locator('[role="main"], main').count();
    const navigationLandmark = await this.page.locator('[role="navigation"], nav').count();
    
    return {
      hasHeadings: headings > 0,
      hasMainLandmark: mainLandmark > 0,
      hasNavigationLandmark: navigationLandmark > 0,
    };
  }
}

// Mobile Testing Helper Functions
export class MobileHelper {
  constructor(private page: Page) {}

  async testSwipeGestures() {
    // Test swipe to archive conversation
    const conversationElement = this.page.locator('[data-testid="conversation-item"]').first();
    const box = await conversationElement.boundingBox();
    
    if (box) {
      await this.page.mouse.move(box.x + 10, box.y + box.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
      await this.page.mouse.up();
    }
  }

  async testTouchInteractions() {
    // Test touch interactions for message actions
    const messageElement = this.page.locator('[data-testid="message-bubble"]').first();
    
    // Long press to show context menu
    await messageElement.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(1000); // Long press
    await this.page.mouse.up();
    
    // Check if context menu appeared
    return await this.page.locator('[data-testid="message-context-menu"]').isVisible();
  }

  async testResponsiveLayout() {
    const layouts = [
      { width: 375, height: 667 }, // iPhone SE
      { width: 390, height: 844 }, // iPhone 12
      { width: 768, height: 1024 }, // iPad
      { width: 1920, height: 1080 }, // Desktop
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const layout of layouts) {
      await this.page.setViewportSize(layout);
      await this.page.waitForTimeout(500); // Allow layout to adjust
      
      // Check if messaging interface is properly displayed
      const isMessageInputVisible = await this.page.locator('[data-testid="message-input"]').isVisible();
      const isConversationListVisible = await this.page.locator('[data-testid="conversation-list"]').isVisible();
      
      results[`${layout.width}x${layout.height}`] = isMessageInputVisible && isConversationListVisible;
    }
    
    return results;
  }
}

// Utility functions
export const waitForNetwork = (page: Page, timeout = 5000) => {
  return page.waitForLoadState('networkidle', { timeout });
};

export const waitForElement = (page: Page, selector: string, timeout = 10000) => {
  return page.waitForSelector(selector, { timeout });
};

export const takeScreenshot = async (page: Page, name: string) => {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
};

export const getConsoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
};

export const interceptApiCalls = (page: Page, endpoint: string) => {
  const requests: any[] = [];
  
  page.route(`**/*${endpoint}*`, (route) => {
    requests.push({
      url: route.request().url(),
      method: route.request().method(),
      postData: route.request().postData(),
      headers: route.request().headers(),
    });
    route.continue();
  });
  
  return requests;
};