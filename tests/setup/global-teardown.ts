import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Clean up test data if needed
  try {
    // Add any cleanup logic here
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.warn('⚠️  Cleanup error:', error);
  }

  console.log('✨ Global teardown completed');
}

export default globalTeardown;