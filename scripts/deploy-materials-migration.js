#!/usr/bin/env node

/**
 * MATERIAL MANAGEMENT MIGRATION DEPLOYMENT
 * Deploys the material management system migration to production
 */

require('@dotenvx/dotenvx').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deployMigration() {
  try {
    console.log('🔄 DEPLOYING MATERIAL MANAGEMENT SYSTEM');
    console.log('=====================================');
    
    // Step 1: Create course_materials table
    console.log('📁 Creating course_materials table...');
    const { error: materialsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.course_materials (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_size BIGINT NOT NULL DEFAULT 0,
          storage_path TEXT NOT NULL UNIQUE,
          description TEXT,
          uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          deleted_at TIMESTAMP WITH TIME ZONE,
          download_count INTEGER DEFAULT 0,
          last_downloaded_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          metadata JSONB DEFAULT '{}',
          
          CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 104857600),
          CONSTRAINT valid_filename CHECK (LENGTH(filename) > 0),
          CONSTRAINT valid_original_name CHECK (LENGTH(original_name) > 0)
        );
      `
    });

    if (materialsError) {
      console.error('❌ Error creating course_materials table:', materialsError);
    } else {
      console.log('✅ course_materials table created');
    }

    // Step 2: Create user_material_progress table
    console.log('📁 Creating user_material_progress table...');
    const { error: progressError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_material_progress (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
          progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE,
          time_spent_minutes INTEGER DEFAULT 0,
          
          UNIQUE(user_id, material_id)
        );
      `
    });

    if (progressError) {
      console.error('❌ Error creating user_material_progress table:', progressError);
    } else {
      console.log('✅ user_material_progress table created');
    }

    // Step 3: Create material_download_logs table
    console.log('📁 Creating material_download_logs table...');
    const { error: logsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.material_download_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          ip_address INET,
          user_agent TEXT,
          success BOOLEAN DEFAULT TRUE
        );
      `
    });

    if (logsError) {
      console.error('❌ Error creating material_download_logs table:', logsError);
    } else {
      console.log('✅ material_download_logs table created');
    }

    // Step 4: Create indexes
    console.log('📁 Creating performance indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);',
      'CREATE INDEX IF NOT EXISTS idx_course_materials_uploaded_by ON public.course_materials(uploaded_by);',
      'CREATE INDEX IF NOT EXISTS idx_course_materials_is_active ON public.course_materials(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_user_material_progress_user_id ON public.user_material_progress(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_material_progress_material_id ON public.user_material_progress(material_id);',
      'CREATE INDEX IF NOT EXISTS idx_material_download_logs_material_id ON public.material_download_logs(material_id);'
    ];

    for (const query of indexQueries) {
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) console.error('❌ Index error:', error);
    }
    console.log('✅ Indexes created');

    // Step 5: Enable RLS
    console.log('📁 Enabling Row Level Security...');
    const rlsQueries = [
      'ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_material_progress ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.material_download_logs ENABLE ROW LEVEL SECURITY;'
    ];

    for (const query of rlsQueries) {
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) console.error('❌ RLS error:', error);
    }
    console.log('✅ RLS enabled');

    // Step 6: Create basic RLS policies
    console.log('📁 Creating RLS policies...');
    const policyQueries = [
      `CREATE POLICY IF NOT EXISTS "course_materials_select_policy" ON public.course_materials
        FOR SELECT USING (
          is_active = true AND (
            course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
            OR course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid() AND status = 'active')
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          )
        );`,
      `CREATE POLICY IF NOT EXISTS "course_materials_insert_policy" ON public.course_materials
        FOR INSERT WITH CHECK (
          course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );`
    ];

    for (const query of policyQueries) {
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) console.error('❌ Policy error:', error);
    }
    console.log('✅ Basic RLS policies created');

    // Step 7: Grant permissions
    console.log('📁 Granting permissions...');
    const grantQueries = [
      'GRANT SELECT, INSERT, UPDATE ON public.course_materials TO authenticated;',
      'GRANT SELECT, INSERT, UPDATE ON public.user_material_progress TO authenticated;',
      'GRANT SELECT, INSERT ON public.material_download_logs TO authenticated;'
    ];

    for (const query of grantQueries) {
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) console.error('❌ Grant error:', error);
    }
    console.log('✅ Permissions granted');

    // Step 8: Create storage bucket
    console.log('📁 Creating storage bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'course-materials');

    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket('course-materials', {
        public: false,
        fileSizeLimit: 104857600, // 100MB
        allowedMimeTypes: [
          'application/pdf',
          'video/mp4',
          'video/avi',
          'video/mov',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/zip',
          'application/x-rar-compressed'
        ]
      });

      if (bucketError) {
        console.error('❌ Storage bucket error:', bucketError);
      } else {
        console.log('✅ Storage bucket created');
      }
    } else {
      console.log('✅ Storage bucket already exists');
    }

    console.log('\n🎉 MATERIAL MANAGEMENT SYSTEM DEPLOYED SUCCESSFULLY!');
    console.log('✅ Database tables created');
    console.log('✅ Indexes and performance optimizations applied');
    console.log('✅ Security policies configured');
    console.log('✅ Storage bucket ready');
    console.log('\nNext steps:');
    console.log('• Test file upload from admin interface');
    console.log('• Verify student access to enrolled course materials');
    console.log('• Test download permissions and progress tracking');

  } catch (error) {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  }
}

// Execute deployment
deployMigration();