-- ============================================================================
-- MATERIAL MANAGEMENT SYSTEM MIGRATION
-- Course materials with secure file storage and progress tracking
-- ============================================================================

-- Create course_materials table
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
    
    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 104857600), -- 100MB limit
    CONSTRAINT valid_filename CHECK (LENGTH(filename) > 0),
    CONSTRAINT valid_original_name CHECK (LENGTH(original_name) > 0)
);

-- Create user_material_progress table for tracking student progress
CREATE TABLE IF NOT EXISTS public.user_material_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Unique constraint to prevent duplicate progress records
    UNIQUE(user_id, material_id)
);

-- Create material_download_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.material_download_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_uploaded_by ON public.course_materials(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_course_materials_is_active ON public.course_materials(is_active);
CREATE INDEX IF NOT EXISTS idx_course_materials_file_type ON public.course_materials(file_type);
CREATE INDEX IF NOT EXISTS idx_course_materials_uploaded_at ON public.course_materials(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_material_progress_user_id ON public.user_material_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_material_progress_material_id ON public.user_material_progress(material_id);
CREATE INDEX IF NOT EXISTS idx_user_material_progress_completed ON public.user_material_progress(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_download_logs_material_id ON public.material_download_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_material_download_logs_user_id ON public.material_download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_material_download_logs_downloaded_at ON public.material_download_logs(downloaded_at DESC);

-- Create updated_at trigger for course_materials
CREATE OR REPLACE FUNCTION update_course_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_course_materials_updated_at
    BEFORE UPDATE ON public.course_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_course_materials_updated_at();

-- Create updated_at trigger for user_material_progress
CREATE OR REPLACE FUNCTION update_user_material_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_material_progress_updated_at
    BEFORE UPDATE ON public.user_material_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_user_material_progress_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_download_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_materials table
CREATE POLICY "course_materials_select_policy" ON public.course_materials
    FOR SELECT
    USING (
        is_active = true 
        AND (
            -- Course instructor can see all materials
            course_id IN (
                SELECT id FROM public.courses 
                WHERE instructor_id = auth.uid()
            )
            OR
            -- Enrolled students can see materials of their courses
            course_id IN (
                SELECT course_id FROM public.enrollments 
                WHERE user_id = auth.uid() AND status = 'active'
            )
            OR
            -- Admins can see all materials
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "course_materials_insert_policy" ON public.course_materials
    FOR INSERT
    WITH CHECK (
        -- Only course instructors and admins can upload materials
        course_id IN (
            SELECT id FROM public.courses 
            WHERE instructor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "course_materials_update_policy" ON public.course_materials
    FOR UPDATE
    USING (
        -- Only course instructors, material uploader, and admins can update
        course_id IN (
            SELECT id FROM public.courses 
            WHERE instructor_id = auth.uid()
        )
        OR uploaded_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "course_materials_delete_policy" ON public.course_materials
    FOR UPDATE -- Soft delete through update
    USING (
        -- Only course instructors, material uploader, and admins can delete
        course_id IN (
            SELECT id FROM public.courses 
            WHERE instructor_id = auth.uid()
        )
        OR uploaded_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for user_material_progress table
CREATE POLICY "user_material_progress_select_policy" ON public.user_material_progress
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        -- Course instructors can see progress of their students
        material_id IN (
            SELECT cm.id FROM public.course_materials cm
            JOIN public.courses c ON cm.course_id = c.id
            WHERE c.instructor_id = auth.uid()
        )
        OR
        -- Admins can see all progress
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "user_material_progress_insert_policy" ON public.user_material_progress
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND
        -- User must be enrolled in the course
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.course_materials cm ON e.course_id = cm.course_id
            WHERE e.user_id = auth.uid() 
            AND e.status = 'active'
            AND cm.id = material_id
        )
    );

CREATE POLICY "user_material_progress_update_policy" ON public.user_material_progress
    FOR UPDATE
    USING (user_id = auth.uid());

-- RLS Policies for material_download_logs table
CREATE POLICY "material_download_logs_select_policy" ON public.material_download_logs
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        -- Course instructors can see download logs for their materials
        material_id IN (
            SELECT cm.id FROM public.course_materials cm
            JOIN public.courses c ON cm.course_id = c.id
            WHERE c.instructor_id = auth.uid()
        )
        OR
        -- Admins can see all logs
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "material_download_logs_insert_policy" ON public.material_download_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND
        -- User must have access to the material
        EXISTS (
            SELECT 1 FROM public.course_materials cm
            JOIN public.enrollments e ON cm.course_id = e.course_id
            WHERE cm.id = material_id 
            AND e.user_id = auth.uid() 
            AND e.status = 'active'
            AND cm.is_active = true
        )
    );

-- ============================================================================
-- STORAGE BUCKET POLICIES (for RLS on storage)
-- ============================================================================

-- Create storage bucket policies (these would be applied via Supabase Dashboard or SQL)
-- Note: These are commented as they need to be applied through Supabase Storage interface

/*
-- Storage bucket: course-materials
-- Policy Name: "course_materials_select"
-- Operation: SELECT
-- Policy: 
bucket_id = 'course-materials' 
AND (
  -- Check if user is enrolled in the course that owns this material
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN course_materials cm ON e.course_id = cm.course_id
    WHERE cm.storage_path = name
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
  OR
  -- Check if user is the course instructor
  EXISTS (
    SELECT 1 FROM courses c
    JOIN course_materials cm ON c.id = cm.course_id
    WHERE cm.storage_path = name
    AND c.instructor_id = auth.uid()
  )
  OR
  -- Check if user is admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)

-- Policy Name: "course_materials_insert"
-- Operation: INSERT
-- Policy:
bucket_id = 'course-materials'
AND (
  -- Check if user is course instructor or admin
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
*/

-- ============================================================================
-- FUNCTIONS AND PROCEDURES
-- ============================================================================

-- Function to get course material statistics
CREATE OR REPLACE FUNCTION get_course_material_stats(p_course_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_materials', COUNT(*),
        'total_size_bytes', COALESCE(SUM(file_size), 0),
        'total_downloads', COALESCE(SUM(download_count), 0),
        'file_types', json_agg(DISTINCT file_type),
        'last_upload', MAX(uploaded_at)
    ) INTO result
    FROM public.course_materials
    WHERE course_id = p_course_id AND is_active = true;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user progress summary for a course
CREATE OR REPLACE FUNCTION get_user_course_material_progress(p_user_id UUID, p_course_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_materials', COUNT(cm.id),
        'completed_materials', COUNT(ump.completed_at),
        'completion_percentage', 
            CASE 
                WHEN COUNT(cm.id) = 0 THEN 0
                ELSE ROUND((COUNT(ump.completed_at)::DECIMAL / COUNT(cm.id)) * 100, 2)
            END,
        'total_time_spent_minutes', COALESCE(SUM(ump.time_spent_minutes), 0),
        'last_activity', MAX(ump.last_accessed_at)
    ) INTO result
    FROM public.course_materials cm
    LEFT JOIN public.user_material_progress ump ON cm.id = ump.material_id AND ump.user_id = p_user_id
    WHERE cm.course_id = p_course_id AND cm.is_active = true;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log material download
CREATE OR REPLACE FUNCTION log_material_download(
    p_material_id UUID,
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert download log
    INSERT INTO public.material_download_logs (
        material_id,
        user_id,
        downloaded_at,
        ip_address,
        user_agent,
        success
    ) VALUES (
        p_material_id,
        p_user_id,
        NOW(),
        p_ip_address,
        p_user_agent,
        TRUE
    );
    
    -- Update download count
    UPDATE public.course_materials
    SET 
        download_count = download_count + 1,
        last_downloaded_at = NOW()
    WHERE id = p_material_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA (Optional - for development/testing)
-- ============================================================================

-- Uncomment the following block if you want to add sample data for testing

/*
-- Insert sample materials (only if courses exist)
DO $$
DECLARE
    sample_course_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get first course and admin user for sample data
    SELECT id INTO sample_course_id FROM public.courses LIMIT 1;
    SELECT id INTO admin_user_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    IF sample_course_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        INSERT INTO public.course_materials (
            course_id,
            filename,
            original_name,
            file_type,
            file_size,
            storage_path,
            description,
            uploaded_by
        ) VALUES
        (
            sample_course_id,
            '1640995200000-course-introduction.pdf',
            'Course Introduction.pdf',
            'application/pdf',
            2048576,
            'courses/' || sample_course_id || '/materials/1640995200000-course-introduction.pdf',
            'Welcome to the course! This PDF contains the course overview and learning objectives.',
            admin_user_id
        ),
        (
            sample_course_id,
            '1640995260000-lesson-01-video.mp4',
            'Lesson 01 - Getting Started.mp4',
            'video/mp4',
            52428800,
            'courses/' || sample_course_id || '/materials/1640995260000-lesson-01-video.mp4',
            'First lesson video covering the basics and setup instructions.',
            admin_user_id
        );
    END IF;
END $$;
*/

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.course_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_material_progress TO authenticated;
GRANT SELECT, INSERT ON public.material_download_logs TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_course_material_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_course_material_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_material_download(UUID, UUID, INET, TEXT) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.course_materials IS 'Stores course materials with secure file storage integration';
COMMENT ON TABLE public.user_material_progress IS 'Tracks student progress on course materials';
COMMENT ON TABLE public.material_download_logs IS 'Audit trail for material downloads';

-- Insert migration record
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('20250823120001_material_management_system', NOW())
ON CONFLICT (version) DO NOTHING;