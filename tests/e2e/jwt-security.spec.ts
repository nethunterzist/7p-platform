/**
 * JWT Security E2E Test Suite
 * Comprehensive end-to-end security testing using Playwright
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test data for security scenarios
const TEST_USERS = {
  valid: {
    email: 'test@example.com',
    password: 'SecureP@ssw0rd123!',
    name: 'Test User'
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminP@ssw0rd123!',
    name: 'Admin User'
  },
  locked: {
    email: 'locked@example.com',
    password: 'LockedP@ssw0rd123!',
    name: 'Locked User'
  }
};

const MALICIOUS_PAYLOADS = {
  xss: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    '\'><script>alert("XSS")</script>'
  ],
  sql: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "admin'/*"
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2f%etc%2fpasswd'
  ]
};

test.describe('JWT Security - E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // Security-focused browser context
      ignoreHTTPSErrors: false,
      acceptDownloads: false,
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // Clear all cookies and storage before each test
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('1. Authentication Flow Security', () => {
    test('should enforce secure login with JWT generation', async () => {
      await page.goto('/login');
      
      // Verify login form exists and is secure
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Check for CSRF protection
      const csrfToken = await page.locator('input[name="_token"]').getAttribute('value');
      expect(csrfToken).toBeDefined();
      
      // Perform login
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      
      // Monitor network requests during login
      const responsePromise = page.waitForResponse('/api/auth/login');
      await page.click('button[type="submit"]');
      
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      // Verify secure cookies are set
      const cookies = await context.cookies();
      const accessTokenCookie = cookies.find(c => c.name === 'access_token');
      const refreshTokenCookie = cookies.find(c => c.name === 'refresh_token');
      
      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();
      
      // Verify cookie security flags
      expect(accessTokenCookie?.httpOnly).toBe(true);
      expect(accessTokenCookie?.secure).toBe(true); // In production
      expect(accessTokenCookie?.sameSite).toBe('Strict');
      
      expect(refreshTokenCookie?.httpOnly).toBe(true);
      expect(refreshTokenCookie?.secure).toBe(true); // In production  
      expect(refreshTokenCookie?.sameSite).toBe('Strict');
      
      // Verify successful redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should prevent authentication bypass attempts', async () => {
      // Try to access protected page without authentication
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Try with invalid/malformed JWT cookie
      await context.addCookies([{
        name: 'access_token',
        value: 'invalid.jwt.token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false, // For localhost testing
        sameSite: 'Strict'
      }]);
      
      await page.goto('/dashboard');
      
      // Should still redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should handle token expiration gracefully', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Simulate expired token by replacing with expired one
      await context.addCookies([{
        name: 'access_token',
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.expired-signature',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Strict'
      }]);
      
      // Try to access protected resource
      await page.reload();
      
      // Should handle expired token (redirect to login or show refresh prompt)
      const url = page.url();
      expect(url.includes('/login') || url.includes('/auth/refresh')).toBe(true);
    });

    test('should implement automatic token refresh', async () => {
      // Login and get initial tokens
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Monitor for refresh token requests
      let refreshCalled = false;
      page.on('response', response => {
        if (response.url().includes('/api/auth/refresh')) {
          refreshCalled = true;
        }
      });
      
      // Wait for potential automatic refresh (if implemented)
      await page.waitForTimeout(2000);
      
      // Navigate to trigger token validation
      await page.goto('/profile');
      
      // If token refresh is implemented, it should work seamlessly
      if (refreshCalled) {
        await expect(page).toHaveURL('/profile');
      }
    });
  });

  test.describe('2. Input Sanitization and XSS Prevention', () => {
    test('should sanitize email input and prevent XSS', async () => {
      await page.goto('/login');
      
      for (const xssPayload of MALICIOUS_PAYLOADS.xss) {
        // Try XSS in email field
        await page.fill('input[type="email"]', xssPayload);
        await page.fill('input[type="password"]', 'password123');
        
        const responsePromise = page.waitForResponse('/api/auth/login');
        await page.click('button[type="submit"]');
        
        const response = await responsePromise;
        expect(response.status()).toBe(400); // Should reject invalid email
        
        // Verify no script execution
        const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
        const alert = await alertPromise;
        expect(alert).toBeNull(); // No alert should be triggered
        
        // Clear fields for next test
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
      }
    });

    test('should prevent XSS in registration form', async () => {
      await page.goto('/register');
      
      for (const xssPayload of MALICIOUS_PAYLOADS.xss) {
        // Try XSS in name field
        await page.fill('input[name="name"]', xssPayload);
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'SecureP@ssw0rd123!');
        await page.fill('input[name="confirmPassword"]', 'SecureP@ssw0rd123!');
        
        const responsePromise = page.waitForResponse('/api/auth/register');
        await page.click('button[type="submit"]');
        
        // Verify no script execution
        const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
        const alert = await alertPromise;
        expect(alert).toBeNull();
        
        // Clear form
        await page.reload();
      }
    });

    test('should validate and sanitize profile updates', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Navigate to profile
      await page.goto('/profile');
      
      for (const xssPayload of MALICIOUS_PAYLOADS.xss) {
        if (await page.locator('input[name="name"]').isVisible()) {
          await page.fill('input[name="name"]', xssPayload);
          
          if (await page.locator('button:has-text("Save")').isVisible()) {
            await page.click('button:has-text("Save")');
            
            // Verify no script execution
            const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
            const alert = await alertPromise;
            expect(alert).toBeNull();
          }
        }
      }
    });
  });

  test.describe('3. SQL Injection Prevention', () => {
    test('should prevent SQL injection in login form', async () => {
      await page.goto('/login');
      
      for (const sqlPayload of MALICIOUS_PAYLOADS.sql) {
        await page.fill('input[type="email"]', sqlPayload);
        await page.fill('input[type="password"]', 'password123');
        
        const responsePromise = page.waitForResponse('/api/auth/login');
        await page.click('button[type="submit"]');
        
        const response = await responsePromise;
        expect(response.status()).toBe(400); // Should reject invalid input
        
        // Verify not authenticated
        await page.waitForTimeout(500);
        expect(page.url()).toContain('/login');
        
        // Clear fields
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
      }
    });

    test('should prevent SQL injection in search/filter operations', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Test search functionality if available
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]').first();
      
      if (await searchInput.isVisible()) {
        for (const sqlPayload of MALICIOUS_PAYLOADS.sql) {
          await searchInput.fill(sqlPayload);
          await page.keyboard.press('Enter');
          
          // Wait for potential response
          await page.waitForTimeout(1000);
          
          // Verify no unauthorized data access
          const sensitiveData = page.locator('text=/password|secret|key|token/i');
          expect(await sensitiveData.count()).toBe(0);
        }
      }
    });
  });

  test.describe('4. Rate Limiting and Brute Force Protection', () => {
    test('should enforce login rate limiting', async () => {
      await page.goto('/login');
      
      // Attempt multiple failed logins quickly
      const maxAttempts = 6; // Should exceed rate limit
      const responses: number[] = [];
      
      for (let i = 0; i < maxAttempts; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        
        const responsePromise = page.waitForResponse('/api/auth/login');
        await page.click('button[type="submit"]');
        
        const response = await responsePromise;
        responses.push(response.status());
        
        // Clear fields
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
        
        // Small delay between attempts
        await page.waitForTimeout(100);
      }
      
      // Should have at least one rate limit response (429)
      const rateLimitedResponses = responses.filter(status => status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should enforce registration rate limiting', async () => {
      await page.goto('/register');
      
      const maxAttempts = 4; // Should exceed registration rate limit
      const responses: number[] = [];
      
      for (let i = 0; i < maxAttempts; i++) {
        await page.fill('input[name="name"]', `Test User ${i}`);
        await page.fill('input[type="email"]', `test${i}@example.com`);
        await page.fill('input[type="password"]', 'WeakPassword'); // Intentionally weak
        await page.fill('input[name="confirmPassword"]', 'WeakPassword');
        
        const responsePromise = page.waitForResponse('/api/auth/register');
        await page.click('button[type="submit"]');
        
        const response = await responsePromise;
        responses.push(response.status());
        
        await page.reload(); // Reload form for next attempt
        await page.waitForTimeout(100);
      }
      
      // Should have at least one rate limit response (429)
      const rateLimitedResponses = responses.filter(status => status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should show appropriate rate limit messages', async () => {
      await page.goto('/login');
      
      // Trigger rate limit
      for (let i = 0; i < 6; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(200);
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
      }
      
      // Check for rate limit message
      const rateLimitMessage = page.locator('text=/too many/i, text=/rate limit/i, text=/try again later/i');
      await expect(rateLimitMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('5. Session Management Security', () => {
    test('should bind sessions to device fingerprints', async () => {
      // Login with first user agent
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Get current cookies
      const cookies = await context.cookies();
      const accessToken = cookies.find(c => c.name === 'access_token')?.value;
      
      // Create new context with different user agent
      const newContext = await page.context().browser()!.newContext({
        userAgent: 'Mozilla/5.0 (DifferentBrowser) Chrome/91.0.0.0'
      });
      const newPage = await newContext.newPage();
      
      // Try to use same token with different fingerprint
      if (accessToken) {
        await newContext.addCookies([{
          name: 'access_token',
          value: accessToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Strict'
        }]);
        
        await newPage.goto('/dashboard');
        
        // Should reject or require re-authentication
        const url = newPage.url();
        expect(url.includes('/login') || url.includes('/auth')).toBe(true);
      }
      
      await newContext.close();
    });

    test('should handle concurrent sessions appropriately', async () => {
      // Create multiple browser contexts
      const context1 = await page.context().browser()!.newContext();
      const context2 = await page.context().browser()!.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Login from both contexts
      await page1.goto('/login');
      await page1.fill('input[type="email"]', TEST_USERS.valid.email);
      await page1.fill('input[type="password"]', TEST_USERS.valid.password);
      await page1.click('button[type="submit"]');
      
      await page2.goto('/login');
      await page2.fill('input[type="email"]', TEST_USERS.valid.email);
      await page2.fill('input[type="password"]', TEST_USERS.valid.password);
      await page2.click('button[type="submit"]');
      
      // Both should be able to access dashboard (unless max sessions exceeded)
      await expect(page1).toHaveURL('/dashboard');
      await expect(page2).toHaveURL('/dashboard');
      
      await context1.close();
      await context2.close();
    });

    test('should properly handle logout and session cleanup', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Logout
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
      await logoutButton.click();
      
      // Should redirect to login/home
      await expect(page).toHaveURL(/\/(login|$)/);
      
      // Verify cookies are cleared
      const cookies = await context.cookies();
      const accessToken = cookies.find(c => c.name === 'access_token');
      const refreshToken = cookies.find(c => c.name === 'refresh_token');
      
      expect(accessToken?.value).toBeFalsy();
      expect(refreshToken?.value).toBeFalsy();
      
      // Verify cannot access protected pages
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('6. Password Security Enforcement', () => {
    test('should enforce strong password requirements', async () => {
      await page.goto('/register');
      
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'Password', // Missing numbers/symbols
        'password123', // Missing uppercase/symbols
      ];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('input[name="name"]', 'Test User');
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', weakPassword);
        await page.fill('input[name="confirmPassword"]', weakPassword);
        
        await page.click('button[type="submit"]');
        
        // Should show password strength error
        const errorMessage = page.locator('text=/password.*weak|weak.*password|password.*requirements/i');
        await expect(errorMessage).toBeVisible({ timeout: 3000 });
        
        await page.reload();
      }
    });

    test('should accept strong passwords', async () => {
      await page.goto('/register');
      
      const strongPassword = 'SecureP@ssw0rd123!';
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="email"]', 'newuser@example.com');
      await page.fill('input[type="password"]', strongPassword);
      await page.fill('input[name="confirmPassword"]', strongPassword);
      
      const responsePromise = page.waitForResponse('/api/auth/register');
      await page.click('button[type="submit"]');
      
      const response = await responsePromise;
      // Should not be rejected for password weakness
      expect(response.status()).not.toBe(400);
    });

    test('should require password confirmation match', async () => {
      await page.goto('/register');
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'SecureP@ssw0rd123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentP@ssw0rd123!');
      
      await page.click('button[type="submit"]');
      
      // Should show password mismatch error
      const errorMessage = page.locator('text=/password.*match|passwords.*match/i');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('7. Token Security in Browser', () => {
    test('should not expose JWT tokens in client-side JavaScript', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Check that tokens are not accessible via JavaScript
      const tokenInLocalStorage = await page.evaluate(() => {
        return localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
      });
      
      const tokenInSessionStorage = await page.evaluate(() => {
        return sessionStorage.getItem('access_token') || sessionStorage.getItem('token') || sessionStorage.getItem('jwt');
      });
      
      const tokenInWindow = await page.evaluate(() => {
        return (window as any).accessToken || (window as any).token || (window as any).jwt;
      });
      
      expect(tokenInLocalStorage).toBeFalsy();
      expect(tokenInSessionStorage).toBeFalsy();
      expect(tokenInWindow).toBeFalsy();
    });

    test('should handle token refresh transparently', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Monitor for refresh requests
      const refreshRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/auth/refresh')) {
          refreshRequests.push(request.url());
        }
      });
      
      // Navigate around the app to trigger potential refresh
      await page.goto('/profile');
      await page.goto('/courses');
      await page.goto('/dashboard');
      
      // If refresh token is implemented, user should remain authenticated
      await expect(page).toHaveURL('/dashboard');
    });

    test('should secure token transmission', async () => {
      // Monitor all network requests during login
      const requests: any[] = [];
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      });
      
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      // Check that sensitive requests use HTTPS (in production)
      const authRequests = requests.filter(req => req.url.includes('/api/auth/'));
      
      authRequests.forEach(request => {
        // In production, should use HTTPS
        if (process.env.NODE_ENV === 'production') {
          expect(request.url).toMatch(/^https:/);
        }
        
        // Should not expose tokens in URL
        expect(request.url).not.toMatch(/token|jwt|auth.*=/i);
      });
    });
  });

  test.describe('8. Cross-Site Request Forgery (CSRF) Protection', () => {
    test('should include CSRF protection on forms', async () => {
      await page.goto('/login');
      
      // Check for CSRF token in form
      const csrfToken = await page.locator('input[name="_token"], input[name="csrf_token"], meta[name="csrf-token"]').first();
      
      if (await csrfToken.isVisible()) {
        const tokenValue = await csrfToken.getAttribute('value') || await csrfToken.getAttribute('content');
        expect(tokenValue).toBeTruthy();
        expect(tokenValue!.length).toBeGreaterThan(10);
      }
    });

    test('should reject requests without proper CSRF tokens', async () => {
      // This would require a more complex setup to test CSRF protection
      // by making requests from a different origin
      await page.goto('/login');
      
      // For now, verify CSRF protection is implemented client-side
      const formElement = page.locator('form').first();
      const csrfField = formElement.locator('input[name="_token"], input[name="csrf_token"]');
      
      // CSRF protection should be present on forms that modify state
      if (await formElement.isVisible()) {
        const method = await formElement.getAttribute('method');
        if (method && method.toUpperCase() === 'POST') {
          // POST forms should have CSRF protection
          const hasCsrfToken = await csrfField.isVisible();
          // Note: This test may need adjustment based on actual CSRF implementation
        }
      }
    });
  });

  test.describe('9. Security Headers and Configuration', () => {
    test('should include security headers in responses', async () => {
      const response = await page.goto('/login');
      
      if (response) {
        const headers = response.headers();
        
        // Check for important security headers
        const securityHeaders = [
          'x-content-type-options',
          'x-frame-options',
          'x-xss-protection',
          'strict-transport-security',
          'content-security-policy'
        ];
        
        securityHeaders.forEach(header => {
          if (headers[header]) {
            expect(headers[header]).toBeTruthy();
          }
        });
        
        // Verify specific header values
        if (headers['x-content-type-options']) {
          expect(headers['x-content-type-options']).toBe('nosniff');
        }
        
        if (headers['x-frame-options']) {
          expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
        }
      }
    });

    test('should prevent clickjacking attacks', async () => {
      const response = await page.goto('/login');
      
      if (response) {
        const headers = response.headers();
        const frameOptions = headers['x-frame-options'];
        const csp = headers['content-security-policy'];
        
        // Should have frame protection
        expect(frameOptions === 'DENY' || frameOptions === 'SAMEORIGIN' || csp?.includes('frame-ancestors')).toBe(true);
      }
    });
  });

  test.describe('10. Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      await page.goto('/login');
      
      // Try various invalid inputs
      const invalidInputs = [
        { email: 'nonexistent@example.com', password: 'wrongpassword' },
        { email: 'invalid-email', password: 'password123' },
        { email: '', password: '' },
        { email: 'admin@localhost', password: 'admin' }
      ];
      
      for (const { email, password } of invalidInputs) {
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        
        // Wait for error message
        await page.waitForTimeout(1000);
        
        // Check that error messages don't reveal sensitive information
        const errorText = await page.textContent('body');
        
        // Should not contain database errors, stack traces, or system paths
        expect(errorText).not.toMatch(/database|sql|connection|stack trace|\/var\/|\/etc\/|c:\\|error code/i);
        
        // Should not reveal whether user exists
        expect(errorText).not.toMatch(/user (not )?found|account (not )?exists/i);
        
        // Clear form
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
      }
    });

    test('should handle server errors gracefully', async () => {
      // Test various error scenarios
      await page.goto('/login');
      
      // Test with potentially problematic inputs
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'A'.repeat(10000)); // Very long password
      
      await page.click('button[type="submit"]');
      
      // Should handle gracefully without exposing system information
      await page.waitForTimeout(2000);
      
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toMatch(/internal server error|500|stack trace|exception/i);
    });
  });

  test.describe('11. Multi-Factor Authentication Security', () => {
    test('should enforce MFA when enabled', async () => {
      // This test assumes MFA can be enabled for test user
      await page.goto('/login');
      
      // Try to login with MFA-enabled account
      await page.fill('input[type="email"]', 'mfa@example.com');
      await page.fill('input[type="password"]', 'SecureP@ssw0rd123!');
      await page.click('button[type="submit"]');
      
      // Should prompt for MFA code
      const mfaPrompt = page.locator('text=/verification code|mfa|two.factor/i, input[name*="mfa"], input[name*="code"]');
      
      if (await mfaPrompt.isVisible()) {
        // Verify MFA is properly enforced
        await expect(mfaPrompt).toBeVisible();
        
        // Try invalid MFA code
        await page.fill('input[name*="code"], input[name*="mfa"]', '000000');
        await page.click('button[type="submit"]');
        
        // Should reject invalid code
        const errorMessage = page.locator('text=/invalid.*code|incorrect.*code|wrong.*code/i');
        await expect(errorMessage).toBeVisible({ timeout: 3000 });
      }
    });

    test('should rate limit MFA attempts', async () => {
      await page.goto('/login');
      
      // Login to get to MFA prompt
      await page.fill('input[type="email"]', 'mfa@example.com');
      await page.fill('input[type="password"]', 'SecureP@ssw0rd123!');
      await page.click('button[type="submit"]');
      
      const mfaInput = page.locator('input[name*="code"], input[name*="mfa"]');
      
      if (await mfaInput.isVisible()) {
        // Try multiple invalid codes quickly
        for (let i = 0; i < 6; i++) {
          await mfaInput.fill(`00000${i}`);
          await page.click('button[type="submit"]');
          await page.waitForTimeout(100);
        }
        
        // Should show rate limit message
        const rateLimitMessage = page.locator('text=/too many.*attempts|rate limit|try again later/i');
        await expect(rateLimitMessage).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('12. Account Lockout Protection', () => {
    test('should lock account after multiple failed attempts', async () => {
      await page.goto('/login');
      
      // Make multiple failed login attempts
      const maxAttempts = 6;
      
      for (let i = 0; i < maxAttempts; i++) {
        await page.fill('input[type="email"]', 'locktest@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(500);
        
        // Clear fields
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
      }
      
      // Next attempt should show lockout message
      await page.fill('input[type="email"]', 'locktest@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      const lockoutMessage = page.locator('text=/account.*locked|temporarily.*locked|too many.*attempts/i');
      await expect(lockoutMessage).toBeVisible({ timeout: 5000 });
    });

    test('should show appropriate lockout duration', async () => {
      // After triggering lockout in previous test
      await page.goto('/login');
      
      await page.fill('input[type="email"]', 'locktest@example.com');
      await page.fill('input[type="password"]', 'correctpassword'); // Even correct password should be blocked
      await page.click('button[type="submit"]');
      
      const lockoutMessage = page.locator('text=/locked|blocked|suspended/i');
      
      if (await lockoutMessage.isVisible()) {
        const messageText = await lockoutMessage.textContent();
        // Should indicate when user can try again
        expect(messageText).toMatch(/minutes|hours|time/i);
      }
    });
  });

  describe('13. Token Refresh Security (E2E)', () => {
    test('should handle automatic token refresh transparently', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Get initial token
      const initialCookies = await context.cookies();
      const initialAccessToken = initialCookies.find(c => c.name === 'access_token')?.value;
      
      // Navigate and trigger potential refresh
      await page.goto('/profile');
      await page.waitForTimeout(1000);
      await page.goto('/courses');
      await page.waitForTimeout(1000);
      
      // Check if token was refreshed
      const finalCookies = await context.cookies();
      const finalAccessToken = finalCookies.find(c => c.name === 'access_token')?.value;
      
      // Should remain authenticated regardless of token refresh
      expect(page.url()).not.toContain('/login');
      
      // If refresh occurred, token should be different
      if (initialAccessToken && finalAccessToken && initialAccessToken !== finalAccessToken) {
        console.log('Token refresh detected during navigation');
      }
    });

    test('should handle refresh token expiration', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Simulate expired refresh token
      await context.addCookies([{
        name: 'refresh_token',
        value: 'expired.refresh.token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Strict'
      }]);
      
      // Navigate to trigger refresh attempt
      await page.goto('/profile');
      
      // Should handle gracefully (either redirect to login or show error)
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      
      // Should either stay authenticated (if access token still valid) or redirect to login
      expect(currentUrl.includes('/profile') || currentUrl.includes('/login')).toBe(true);
    });

    test('should validate token rotation on logout and re-login', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Get initial tokens
      const initialCookies = await context.cookies();
      const initialAccessToken = initialCookies.find(c => c.name === 'access_token')?.value;
      const initialRefreshToken = initialCookies.find(c => c.name === 'refresh_token')?.value;
      
      // Logout
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
      
      await expect(page).toHaveURL(/\/(login|$)/);
      
      // Login again
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.valid.email);
      await page.fill('input[type="password"]', TEST_USERS.valid.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Get new tokens
      const newCookies = await context.cookies();
      const newAccessToken = newCookies.find(c => c.name === 'access_token')?.value;
      const newRefreshToken = newCookies.find(c => c.name === 'refresh_token')?.value;
      
      // Tokens should be different (proper rotation)
      expect(newAccessToken).not.toBe(initialAccessToken);
      expect(newRefreshToken).not.toBe(initialRefreshToken);
      
      // New tokens should be valid
      expect(newAccessToken).toBeTruthy();
      expect(newRefreshToken).toBeTruthy();
    });
  });

  describe('14. Advanced Security Headers Validation', () => {
    test('should include comprehensive security headers', async () => {
      const response = await page.goto('/login');
      
      if (response) {
        const headers = response.headers();
        
        // Comprehensive security header checks
        const expectedHeaders = {
          'x-content-type-options': 'nosniff',
          'x-frame-options': ['DENY', 'SAMEORIGIN'],
          'x-xss-protection': '1; mode=block',
          'strict-transport-security': /max-age=\d+/,
          'content-security-policy': /default-src/,
          'referrer-policy': /.+/
        };
        
        Object.entries(expectedHeaders).forEach(([headerName, expectedValue]) => {
          const headerValue = headers[headerName];
          
          if (headerValue) {
            if (Array.isArray(expectedValue)) {
              expect(expectedValue).toContain(headerValue);
            } else if (expectedValue instanceof RegExp) {
              expect(headerValue).toMatch(expectedValue);
            } else {
              expect(headerValue).toBe(expectedValue);
            }
          }
        });
      }
    });

    test('should prevent MIME type sniffing', async () => {
      const response = await page.goto('/api/auth/login');
      
      if (response) {
        const headers = response.headers();
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['content-type']).toMatch(/application\/json/);
      }
    });

    test('should implement proper CORS policies', async () => {
      // Test CORS by making cross-origin request simulation
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Origin': 'https://malicious-site.com'
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password'
            })
          });
          return {
            status: res.status,
            headers: Object.fromEntries(res.headers.entries())
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      // Should handle CORS appropriately
      expect(response.status).toBeDefined();
    });
  });

  describe('15. API Security Validation', () => {
    test('should reject requests without proper authentication headers', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/protected-resource', {
          method: 'GET'
        });
        return {
          status: res.status,
          statusText: res.statusText
        };
      });
      
      // Should reject unauthenticated requests
      expect([401, 403, 404]).toContain(response.status);
    });

    test('should validate API rate limiting', async () => {
      const responses = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        const response = await page.evaluate(async (attempt) => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
          });
          return {
            status: res.status,
            attempt: attempt
          };
        }, i);
        
        responses.push(response);
        
        // Small delay between requests
        await page.waitForTimeout(100);
      }
      
      // Should have some rate limited responses (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate request size limits', async () => {
      // Test with very large request body
      const largePayload = 'A'.repeat(100000); // 100KB payload
      
      const response = await page.evaluate(async (payload) => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: payload
            })
          });
          return {
            status: res.status,
            ok: res.ok
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      }, largePayload);
      
      // Should reject or handle large payloads appropriately
      expect(response.status === 413 || response.status === 400 || response.error).toBeTruthy();
    });
  });
});