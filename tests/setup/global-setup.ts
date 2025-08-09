import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Initialize Supabase client for test setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  Supabase credentials not found. Database tests may fail.');
  }

  // Create test database setup if needed
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      // Test database connection
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.warn('⚠️  Database connection test failed:', error.message);
      } else {
        console.log('✅ Database connection successful');
      }
    } catch (error) {
      console.warn('⚠️  Database setup error:', error);
    }
  }

  // Start browser for setup if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test if development server is running
    await page.goto('http://localhost:3000', { timeout: 10000 });
    console.log('✅ Development server is running');
  } catch (error) {
    console.warn('⚠️  Development server may not be ready:', error);
  } finally {
    await browser.close();
  }

  console.log('✨ Global setup completed');
}

export default globalSetup;