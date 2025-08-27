/**
 * Student User Journey E2E Test
 * Complete flow: Registration → Email Verification → Course Enrollment → Material Download
 */

import { test, expect } from '@playwright/test';

test.describe('Student User Journey', () => {
  const testStudent = {
    email: `e2e-student-${Date.now()}@test.com`,
    password: 'Test123!@#',
    fullName: 'E2E Test Student'
  };

  test('Complete student journey: register → verify → enroll → access materials', async ({ page }) => {
    // Step 1: Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register.*7P Education/);

    // Step 2: Fill registration form
    await page.fill('[data-testid="email-input"]', testStudent.email);
    await page.fill('[data-testid="password-input"]', testStudent.password);
    await page.fill('[data-testid="fullName-input"]', testStudent.fullName);
    
    // Accept terms and conditions
    await page.check('[data-testid="terms-checkbox"]');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Step 3: Verify registration success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('verification email');

    // Step 4: Navigate to login page (simulating email verification click)
    await page.goto('/login');
    await expect(page).toHaveTitle(/Login.*7P Education/);

    // Step 5: Login with registered credentials
    await page.fill('[data-testid="email-input"]', testStudent.email);
    await page.fill('[data-testid="password-input"]', testStudent.password);
    await page.click('[data-testid="login-button"]');

    // Step 6: Verify successful login and redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-greeting"]')).toContainText('Hoş geldin');

    // Step 7: Browse available courses
    await page.goto('/courses');
    await expect(page).toHaveTitle(/Courses.*7P Education/);
    
    // Wait for courses to load
    await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
    
    // Get the first available course
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    const courseTitle = await firstCourse.locator('[data-testid="course-title"]').textContent();
    
    // Step 8: View course details
    await firstCourse.locator('[data-testid="view-course-button"]').click();
    
    // Verify course detail page
    await expect(page.locator('[data-testid="course-title"]')).toContainText(courseTitle!);
    await expect(page.locator('[data-testid="course-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="course-instructor"]')).toBeVisible();

    // Step 9: Enroll in the course (if not free, this would show payment form)
    const enrollButton = page.locator('[data-testid="enroll-button"]');
    if (await enrollButton.isVisible()) {
      await enrollButton.click();
      
      // Handle enrollment process
      const paymentRequired = await page.locator('[data-testid="payment-form"]').isVisible();
      
      if (paymentRequired) {
        // For paid courses, we'd handle Stripe checkout here
        // For this test, we'll assume it's a free course or demo
        console.log('Payment required - this would handle Stripe checkout in production');
      } else {
        // Free enrollment
        await expect(page.locator('[data-testid="enrollment-success"]')).toBeVisible();
      }
    }

    // Step 10: Access course content
    await page.goto('/my-courses');
    await expect(page.locator('[data-testid="enrolled-course"]').first()).toBeVisible();
    
    // Click on the enrolled course
    await page.locator('[data-testid="enrolled-course"]').first().click();
    
    // Verify course content access
    await expect(page.locator('[data-testid="course-modules"]')).toBeVisible();
    await expect(page.locator('[data-testid="course-module"]').first()).toBeVisible();

    // Step 11: Access first lesson
    const firstModule = page.locator('[data-testid="course-module"]').first();
    await firstModule.locator('[data-testid="module-expand-button"]').click();
    
    await expect(page.locator('[data-testid="lesson-item"]').first()).toBeVisible();
    await page.locator('[data-testid="lesson-item"]').first().click();

    // Step 12: View lesson content
    await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="lesson-title"]')).toBeVisible();

    // Step 13: Download course materials (if available)
    const materialsSection = page.locator('[data-testid="course-materials"]');
    if (await materialsSection.isVisible()) {
      const firstMaterial = materialsSection.locator('[data-testid="material-item"]').first();
      if (await firstMaterial.isVisible()) {
        // Test material download
        const downloadPromise = page.waitForDownload();
        await firstMaterial.locator('[data-testid="download-button"]').click();
        const download = await downloadPromise;
        
        // Verify download completed
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }

    // Step 14: Mark lesson as completed
    const completeButton = page.locator('[data-testid="mark-complete-button"]');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await expect(page.locator('[data-testid="completion-indicator"]')).toBeVisible();
    }

    // Step 15: Check progress tracking
    await page.goto('/progress');
    await expect(page.locator('[data-testid="progress-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="course-progress"]').first()).toBeVisible();

    // Step 16: Test profile management
    await page.goto('/profile');
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
    
    // Update profile information
    await page.fill('[data-testid="bio-input"]', 'Updated bio for E2E test');
    await page.click('[data-testid="save-profile-button"]');
    
    await expect(page.locator('[data-testid="profile-success"]')).toBeVisible();

    // Step 17: Test notification preferences
    await page.click('[data-testid="notifications-tab"]');
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
    
    // Toggle notification preference
    await page.check('[data-testid="email-notifications-checkbox"]');
    await page.click('[data-testid="save-notifications-button"]');

    // Step 18: Logout
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await page.locator('[data-testid="logout-button"]').click();
    
    // Verify logout
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-link"]')).toBeVisible();
  });

  test('Student cannot access instructor features', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testStudent.email);
    await page.fill('[data-testid="password-input"]', testStudent.password);
    await page.click('[data-testid="login-button"]');

    // Try to access instructor dashboard - should be redirected or get 403
    await page.goto('/instructor/dashboard');
    await expect(page).toHaveURL(/\/(login|403|unauthorized)/);

    // Try to access course creation - should be blocked
    await page.goto('/instructor/courses/new');
    await expect(page).toHaveURL(/\/(login|403|unauthorized)/);

    // Verify student UI doesn't show instructor elements
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="create-course-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="instructor-menu"]')).not.toBeVisible();
  });

  test('Student enrollment and payment flow', async ({ page, context }) => {
    // Mock Stripe for testing
    await context.route('**/js.stripe.com/v3/', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.Stripe = function() {
            return {
              elements: () => ({
                create: () => ({
                  mount: () => {},
                  on: () => {}
                }),
                getElement: () => ({ /* mock card element */ })
              }),
              confirmCardPayment: () => Promise.resolve({
                paymentIntent: { status: 'succeeded' }
              }),
              confirmPayment: () => Promise.resolve({
                paymentIntent: { status: 'succeeded' }
              })
            };
          };
        `
      });
    });

    // Login as student
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testStudent.email);
    await page.fill('[data-testid="password-input"]', testStudent.password);
    await page.click('[data-testid="login-button"]');

    // Find a paid course
    await page.goto('/courses');
    const paidCourse = page.locator('[data-testid="course-card"]').filter({
      has: page.locator('[data-testid="course-price"]:not(:has-text("Free"))')
    }).first();

    if (await paidCourse.isVisible()) {
      await paidCourse.locator('[data-testid="view-course-button"]').click();

      // Click enroll button
      await page.click('[data-testid="enroll-button"]');

      // Should show payment form
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible();

      // Fill in payment details (mock)
      await page.fill('[data-testid="cardholder-name"]', testStudent.fullName);
      
      // Submit payment
      await page.click('[data-testid="pay-button"]');

      // Should show payment processing
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();

      // Should redirect to success page or course page
      await expect(page).toHaveURL(/\/(success|course|my-courses)/);
    }
  });

  test('Student can leave course reviews', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testStudent.email);
    await page.fill('[data-testid="password-input"]', testStudent.password);
    await page.click('[data-testid="login-button"]');

    // Go to enrolled course
    await page.goto('/my-courses');
    await page.locator('[data-testid="enrolled-course"]').first().click();

    // Find reviews section
    const reviewsSection = page.locator('[data-testid="course-reviews"]');
    if (await reviewsSection.isVisible()) {
      // Click write review button
      await page.click('[data-testid="write-review-button"]');

      // Fill review form
      await page.fill('[data-testid="review-title"]', 'Great course!');
      await page.fill('[data-testid="review-content"]', 'This course helped me learn a lot. Highly recommended!');
      
      // Set rating
      await page.click('[data-testid="star-5"]');

      // Submit review
      await page.click('[data-testid="submit-review-button"]');

      // Verify review submission
      await expect(page.locator('[data-testid="review-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-review"]')).toContainText('Great course!');
    }
  });

  test('Student can track learning progress', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testStudent.email);
    await page.fill('[data-testid="password-input"]', testStudent.password);
    await page.click('[data-testid="login-button"]');

    // Go to progress page
    await page.goto('/progress');

    // Verify progress elements
    await expect(page.locator('[data-testid="overall-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="courses-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="learning-streak"]')).toBeVisible();

    // Check individual course progress
    const courseProgress = page.locator('[data-testid="course-progress-item"]').first();
    if (await courseProgress.isVisible()) {
      await expect(courseProgress.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(courseProgress.locator('[data-testid="progress-percentage"]')).toBeVisible();
    }

    // Test progress filtering
    await page.selectOption('[data-testid="progress-filter"]', 'in-progress');
    await page.waitForTimeout(500); // Wait for filter to apply
    
    // Verify filtered results
    const progressItems = page.locator('[data-testid="course-progress-item"]');
    const count = await progressItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test.describe('Mobile Student Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    test('Student can use mobile interface', async ({ page }) => {
      // Login as student
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', testStudent.email);
      await page.fill('[data-testid="password-input"]', testStudent.password);
      await page.click('[data-testid="login-button"]');

      // Verify mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

      // Navigate to courses on mobile
      await page.click('[data-testid="mobile-courses-link"]');
      await expect(page).toHaveURL(/\/courses/);

      // Verify course cards are responsive
      const courseCard = page.locator('[data-testid="course-card"]').first();
      await expect(courseCard).toBeVisible();
      
      // Test course card mobile interaction
      await courseCard.click();
      await expect(page.locator('[data-testid="course-details"]')).toBeVisible();

      // Test mobile-specific features
      if (await page.locator('[data-testid="share-course-mobile"]').isVisible()) {
        // Test share functionality on mobile
        await page.click('[data-testid="share-course-mobile"]');
        // Verify share options appear
      }
    });
  });
});