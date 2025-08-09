// Debug Database Connection - Run this in browser console
// Copy and paste this into your browser console on the dashboard page

async function debugDatabase() {
  console.log('🔍 === DATABASE DEBUG UTILITY ===');
  
  // Test 1: Check if supabase is available
  console.log('📡 Step 1: Checking Supabase availability...');
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase client not available');
    console.log('ℹ️ Try running: import { supabase } from "@/lib/supabase"');
    return;
  }
  console.log('✅ Supabase client available');

  // Test 2: Check authentication
  console.log('👤 Step 2: Checking authentication...');
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Auth result:', { user: user?.email, error: authError });
    
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
  } catch (err) {
    console.error('❌ Auth check failed:', err);
    return;
  }

  // Test 3: Check tables exist
  console.log('📊 Step 3: Checking table access...');
  
  const tables = ['courses', 'enrollments', 'modules', 'lessons', 'profiles'];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      console.log(`📊 Table "${tableName}":`, 
        error ? `❌ ${error.message}` : `✅ OK (${data?.length || 0} rows)`);
    } catch (err) {
      console.log(`📊 Table "${tableName}": ❌ Exception:`, err);
    }
  }

  // Test 4: Check RPC functions
  console.log('🔧 Step 4: Checking RPC functions...');
  
  const functions = ['get_user_enrolled_courses', 'get_course_progress', 'is_user_enrolled'];
  
  for (const funcName of functions) {
    try {
      const result = await supabase.rpc(funcName);
      console.log(`🔧 Function "${funcName}":`, 
        result.error ? `❌ ${result.error.message}` : `✅ OK`);
    } catch (err) {
      console.log(`🔧 Function "${funcName}": ❌ Exception:`, err);
    }
  }

  // Test 5: Manual enrollment query
  console.log('🔄 Step 5: Testing manual queries...');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (*)
      `)
      .eq('user_id', user.id);
    
    console.log('🔄 Manual enrollment query:', 
      error ? `❌ ${error.message}` : `✅ OK (${data?.length || 0} enrollments)`);
    
    if (data && data.length > 0) {
      console.log('📋 Enrollments found:', data);
    }
  } catch (err) {
    console.log('🔄 Manual query exception:', err);
  }

  console.log('🏁 Debug complete! Check results above.');
}

// Run the debug
debugDatabase();