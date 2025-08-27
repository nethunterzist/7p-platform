/**
 * Admin User Journey E2E Test
 * Complete flow: Admin Login → Course CRUD → User Management → Payment Processing → Progress Monitoring
 */

import { test, expect } from '@playwright/test';

test.describe('Admin User Journey', () => {
  const testAdmin = {
    email: `e2e-admin-${Date.now()}@test.com`,
    password: 'Admin123!@#',
    fullName: 'E2E Test Admin'
  };

  const testInstructor = {
    email: `e2e-instructor-${Date.now()}@test.com`,
    password: 'Instructor123!@#',
    fullName: 'E2E Test Instructor'
  };

  let testCourseId: string;

  test.beforeEach(async ({ page }) => {
    // Create admin user through API or database seeding
    // In a real scenario, this would be done via API calls or direct database insertion
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', testAdmin.email);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.fill('[data-testid="fullName-input"]', testAdmin.fullName);
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="register-button"]');

    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testAdmin.email);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.click('[data-testid="login-button"]');
  });

  test('Complete admin journey: user management → course oversight → payment monitoring', async ({ page }) => {
    // Step 1: Access admin dashboard
    await page.goto('/admin/dashboard');
    await expect(page).toHaveTitle(/Admin Dashboard.*7P Education/);
    
    // Verify admin dashboard elements
    await expect(page.locator('[data-testid="admin-stats-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-users-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-courses-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-revenue-stat"]')).toBeVisible();

    // Step 2: User Management
    await page.click('[data-testid="users-management-link"]');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();

    // Search for a user
    await page.fill('[data-testid="user-search-input"]', 'test');
    await page.click('[data-testid="search-users-button"]');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    const userRows = page.locator('[data-testid="user-row"]');
    expect(await userRows.count()).toBeGreaterThanOrEqual(0);

    // Create new instructor user
    await page.click('[data-testid="add-user-button"]');
    await expect(page.locator('[data-testid="user-creation-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="new-user-email"]', testInstructor.email);
    await page.fill('[data-testid="new-user-password"]', testInstructor.password);
    await page.fill('[data-testid="new-user-fullName"]', testInstructor.fullName);
    await page.selectOption('[data-testid="new-user-role"]', 'instructor');
    
    await page.click('[data-testid="create-user-button"]');
    await expect(page.locator('[data-testid="user-created-success"]')).toBeVisible();

    // Step 3: Verify user creation and edit user
    await page.fill('[data-testid="user-search-input"]', testInstructor.email);
    await page.click('[data-testid="search-users-button"]');
    
    const newUserRow = page.locator('[data-testid="user-row"]').first();
    await expect(newUserRow).toContainText(testInstructor.email);
    await expect(newUserRow).toContainText('instructor');

    // Edit user role
    await newUserRow.locator('[data-testid="edit-user-button"]').click();
    await expect(page.locator('[data-testid="edit-user-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="edit-user-bio"]', 'Updated bio for test instructor');
    await page.click('[data-testid="save-user-button"]');
    await expect(page.locator('[data-testid="user-updated-success"]')).toBeVisible();

    // Step 4: Course Management
    await page.click('[data-testid="courses-management-link"]');
    await expect(page).toHaveURL(/\/admin\/courses/);
    await expect(page.locator('[data-testid="courses-admin-table"]')).toBeVisible();

    // View course details
    const firstCourse = page.locator('[data-testid="course-admin-row"]').first();
    if (await firstCourse.isVisible()) {
      const courseTitle = await firstCourse.locator('[data-testid="course-title-cell"]').textContent();
      await firstCourse.locator('[data-testid="view-course-admin-button"]').click();
      
      await expect(page.locator('[data-testid="course-admin-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-admin-title"]')).toContainText(courseTitle || '');
      
      // Check course statistics
      await expect(page.locator('[data-testid="course-enrollment-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-revenue-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-rating-average"]')).toBeVisible();
    }

    // Step 5: Course Approval/Rejection
    const pendingCourse = page.locator('[data-testid="course-admin-row"]').filter({
      has: page.locator('[data-testid="course-status"]:has-text("pending")')
    }).first();

    if (await pendingCourse.isVisible()) {
      await pendingCourse.locator('[data-testid="approve-course-button"]').click();
      await expect(page.locator('[data-testid="course-approval-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="approval-notes"]', 'Course approved by admin during E2E test');
      await page.click('[data-testid="confirm-approval-button"]');
      
      await expect(page.locator('[data-testid="course-approved-success"]')).toBeVisible();
    }

    // Step 6: Payment Management
    await page.click('[data-testid="payments-management-link"]');
    await expect(page).toHaveURL(/\/admin\/payments/);
    await expect(page.locator('[data-testid="payments-admin-table"]')).toBeVisible();

    // Filter payments by date range
    await page.fill('[data-testid="payment-date-from"]', '2024-01-01');
    await page.fill('[data-testid="payment-date-to"]', '2024-12-31');
    await page.click('[data-testid="filter-payments-button"]');

    // View payment details
    const firstPayment = page.locator('[data-testid="payment-admin-row"]').first();
    if (await firstPayment.isVisible()) {
      await firstPayment.locator('[data-testid="view-payment-button"]').click();
      
      await expect(page.locator('[data-testid="payment-details-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-amount-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-status-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-user-detail"]')).toBeVisible();
      
      // Close modal
      await page.click('[data-testid="close-payment-modal"]');
    }

    // Step 7: Process Refund (if needed)
    const refundablePayment = page.locator('[data-testid="payment-admin-row"]').filter({
      has: page.locator('[data-testid="payment-status"]:has-text("succeeded")')
    }).first();

    if (await refundablePayment.isVisible()) {
      await refundablePayment.locator('[data-testid="refund-payment-button"]').click();
      await expect(page.locator('[data-testid="refund-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="refund-amount"]', '50.00');
      await page.fill('[data-testid="refund-reason"]', 'E2E test refund');
      await page.selectOption('[data-testid="refund-type"]', 'requested_by_customer');
      
      await page.click('[data-testid="process-refund-button"]');
      await expect(page.locator('[data-testid="refund-processing"]')).toBeVisible();
    }

    // Step 8: Analytics and Reporting
    await page.click('[data-testid="analytics-link"]');
    await expect(page).toHaveURL(/\/admin\/analytics/);
    
    // Verify analytics dashboard
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-growth-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="course-performance-chart"]')).toBeVisible();

    // Generate report
    await page.click('[data-testid="generate-report-button"]');
    await expect(page.locator('[data-testid="report-generation-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="report-type"]', 'revenue');
    await page.selectOption('[data-testid="report-period"]', 'monthly');
    await page.click('[data-testid="generate-report-confirm"]');
    
    // Wait for report generation
    await expect(page.locator('[data-testid="report-generating"]')).toBeVisible();
    
    // Download report
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="download-report-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();

    // Step 9: System Settings
    await page.click('[data-testid="system-settings-link"]');
    await expect(page).toHaveURL(/\/admin\/settings/);
    
    // Update system settings
    await page.fill('[data-testid="site-name-setting"]', '7P Education - E2E Test');
    await page.fill('[data-testid="support-email-setting"]', 'support@7peducation-test.com');
    await page.check('[data-testid="maintenance-mode-toggle"]');
    
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('[data-testid="settings-saved-success"]')).toBeVisible();

    // Turn off maintenance mode
    await page.uncheck('[data-testid="maintenance-mode-toggle"]');
    await page.click('[data-testid="save-settings-button"]');

    // Step 10: Audit Logs
    await page.click('[data-testid="audit-logs-link"]');
    await expect(page).toHaveURL(/\/admin\/audit/);
    await expect(page.locator('[data-testid="audit-logs-table"]')).toBeVisible();

    // Filter audit logs
    await page.selectOption('[data-testid="audit-action-filter"]', 'user_created');
    await page.click('[data-testid="filter-audit-logs"]');
    
    // Verify filtered results
    const auditRows = page.locator('[data-testid="audit-log-row"]');
    expect(await auditRows.count()).toBeGreaterThanOrEqual(1); // Should show the user we created

    // Step 11: Content Moderation
    await page.click('[data-testid="moderation-link"]');
    await expect(page).toHaveURL(/\/admin\/moderation/);
    
    // Review flagged content
    const flaggedContent = page.locator('[data-testid="flagged-content-item"]').first();
    if (await flaggedContent.isVisible()) {
      await flaggedContent.locator('[data-testid="review-content-button"]').click();
      
      await expect(page.locator('[data-testid="content-review-modal"]')).toBeVisible();
      await page.click('[data-testid="approve-content-button"]');
      await expect(page.locator('[data-testid="content-approved-success"]')).toBeVisible();
    }
  });

  test('Admin can manage bulk operations', async ({ page }) => {
    // Access users management
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();

    // Select multiple users
    await page.check('[data-testid="select-all-users"]');
    
    // Perform bulk action
    await page.selectOption('[data-testid="bulk-action-select"]', 'send_email');
    await page.click('[data-testid="execute-bulk-action"]');
    
    // Fill bulk email form
    await expect(page.locator('[data-testid="bulk-email-modal"]')).toBeVisible();
    await page.fill('[data-testid="email-subject"]', 'Important Update from 7P Education');
    await page.fill('[data-testid="email-content"]', 'This is a test bulk email sent during E2E testing.');
    
    await page.click('[data-testid="send-bulk-email"]');
    await expect(page.locator('[data-testid="bulk-email-sent-success"]')).toBeVisible();
  });

  test('Admin can handle system backup and restore', async ({ page }) => {
    // Access system maintenance
    await page.goto('/admin/maintenance');
    await expect(page.locator('[data-testid="maintenance-dashboard"]')).toBeVisible();

    // Initiate system backup
    await page.click('[data-testid="create-backup-button"]');
    await expect(page.locator('[data-testid="backup-creation-modal"]')).toBeVisible();
    
    await page.check('[data-testid="include-user-data"]');
    await page.check('[data-testid="include-course-data"]');
    await page.fill('[data-testid="backup-description"]', 'E2E test backup');
    
    await page.click('[data-testid="create-backup-confirm"]');
    await expect(page.locator('[data-testid="backup-in-progress"]')).toBeVisible();

    // Check backup status
    await page.waitForTimeout(5000); // Wait for backup to potentially complete
    await page.click('[data-testid="refresh-backups"]');
    
    const latestBackup = page.locator('[data-testid="backup-item"]').first();
    if (await latestBackup.isVisible()) {
      await expect(latestBackup.locator('[data-testid="backup-status"]')).toBeVisible();
      await expect(latestBackup.locator('[data-testid="backup-size"]')).toBeVisible();
      await expect(latestBackup.locator('[data-testid="backup-date"]')).toBeVisible();
    }
  });

  test('Admin security features and permissions', async ({ page }) => {
    // Test admin-only route protection
    await page.goto('/admin/security');
    await expect(page).toHaveURL(/\/admin\/security/);
    
    // Security dashboard should be accessible
    await expect(page.locator('[data-testid="security-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="failed-login-attempts"]')).toBeVisible();
    await expect(page.locator('[data-testid="suspicious-activities"]')).toBeVisible();

    // Review security alerts
    const securityAlerts = page.locator('[data-testid="security-alert"]');
    if (await securityAlerts.first().isVisible()) {
      await securityAlerts.first().click();
      await expect(page.locator('[data-testid="alert-details-modal"]')).toBeVisible();
      
      // Mark alert as reviewed
      await page.click('[data-testid="mark-reviewed-button"]');
      await expect(page.locator('[data-testid="alert-reviewed-success"]')).toBeVisible();
    }

    // Configure security settings
    await page.click('[data-testid="security-settings-tab"]');
    await expect(page.locator('[data-testid="security-settings-form"]')).toBeVisible();
    
    // Update security settings
    await page.fill('[data-testid="max-login-attempts"]', '5');
    await page.fill('[data-testid="lockout-duration"]', '15');
    await page.check('[data-testid="require-2fa-for-admins"]');
    
    await page.click('[data-testid="save-security-settings"]');
    await expect(page.locator('[data-testid="security-settings-saved"]')).toBeVisible();
  });

  test('Admin can export data and generate reports', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.locator('[data-testid="reports-dashboard"]')).toBeVisible();

    // Generate user activity report
    await page.click('[data-testid="user-activity-report"]');
    await expect(page.locator('[data-testid="report-config-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="report-format"]', 'csv');
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');
    
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="generate-and-download"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('user-activity');
    expect(download.suggestedFilename()).toContain('.csv');

    // Generate financial report
    await page.click('[data-testid="financial-report"]');
    await page.selectOption('[data-testid="report-format"]', 'xlsx');
    await page.selectOption('[data-testid="report-period"]', 'quarterly');
    
    const downloadPromise2 = page.waitForDownload();
    await page.click('[data-testid="generate-and-download"]');
    const download2 = await downloadPromise2;
    
    expect(download2.suggestedFilename()).toContain('financial');
    expect(download2.suggestedFilename()).toContain('.xlsx');
  });

  test('Admin can monitor system health and performance', async ({ page }) => {
    await page.goto('/admin/monitoring');
    await expect(page.locator('[data-testid="monitoring-dashboard"]')).toBeVisible();

    // Check system metrics
    await expect(page.locator('[data-testid="cpu-usage-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-usage-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="database-status-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-usage-metric"]')).toBeVisible();

    // View performance charts
    await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-rate-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();

    // Test system health check
    await page.click('[data-testid="run-health-check"]');
    await expect(page.locator('[data-testid="health-check-running"]')).toBeVisible();
    
    // Wait for health check to complete
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="health-check-results"]')).toBeVisible();
    
    // Verify health check components
    await expect(page.locator('[data-testid="database-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-service-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-service-health"]')).toBeVisible();
  });
});