-- Supabase Storage Setup for 7P Education
-- This migration sets up storage buckets and policies for course materials
-- Date: 2025-08-26

-- =======================
-- CREATE STORAGE BUCKETS
-- =======================

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'course-materials',
        'course-materials',
        false,
        52428800, -- 50MB limit
        ARRAY[
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'video/mp4',
            'video/avi',
            'video/mov',
            'audio/mpeg',
            'audio/wav',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain'
        ]
    ),
    (
        'user-avatars',
        'user-avatars',
        true,
        5242880, -- 5MB limit
        ARRAY[
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ]
    ),
    (
        'course-thumbnails',
        'course-thumbnails',
        true,
        10485760, -- 10MB limit
        ARRAY[
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ]
    )
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ================================
-- STORAGE POLICIES FOR MATERIALS
-- ================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Course materials are viewable by enrolled users" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Course thumbnails are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can upload course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course thumbnails" ON storage.objects;

-- Course Materials Bucket Policies
CREATE POLICY "Course materials are viewable by enrolled users"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'course-materials'
    AND (
        -- User is enrolled in the course that owns this material
        EXISTS (
            SELECT 1 FROM course_materials cm
            JOIN course_enrollments ce ON cm.course_id = ce.course_id
            WHERE cm.file_path = storage.objects.name
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR
        -- User is the instructor of the course
        EXISTS (
            SELECT 1 FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.file_path = storage.objects.name
            AND c.instructor_id = auth.uid()
        )
        OR
        -- User is admin
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    )
);

CREATE POLICY "Instructors can upload course materials"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'course-materials'
    AND (
        -- User is instructor of a course (will be validated in application)
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('instructor', 'admin')
        )
    )
);

CREATE POLICY "Instructors can update course materials"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'course-materials'
    AND (
        -- User is the instructor of the course that owns this material
        EXISTS (
            SELECT 1 FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.file_path = storage.objects.name
            AND c.instructor_id = auth.uid()
        )
        OR
        -- User is admin
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    )
);

CREATE POLICY "Instructors can delete course materials"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'course-materials'
    AND (
        -- User is the instructor of the course that owns this material
        EXISTS (
            SELECT 1 FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.file_path = storage.objects.name
            AND c.instructor_id = auth.uid()
        )
        OR
        -- User is admin
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    )
);

-- ================================
-- STORAGE POLICIES FOR AVATARS
-- ================================

CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ====================================
-- STORAGE POLICIES FOR THUMBNAILS
-- ====================================

CREATE POLICY "Course thumbnails are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Instructors can upload course thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'course-thumbnails'
    AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('instructor', 'admin')
    )
);

CREATE POLICY "Instructors can update course thumbnails"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'course-thumbnails'
    AND (
        -- Check if user owns a course with this thumbnail
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.thumbnail_url LIKE '%' || storage.objects.name || '%'
            AND c.instructor_id = auth.uid()
        )
        OR
        -- User is admin
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    )
);

CREATE POLICY "Instructors can delete course thumbnails"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'course-thumbnails'
    AND (
        -- Check if user owns a course with this thumbnail
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.thumbnail_url LIKE '%' || storage.objects.name || '%'
            AND c.instructor_id = auth.uid()
        )
        OR
        -- User is admin
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    )
);

-- ===================================
-- HELPER FUNCTIONS FOR FILE MANAGEMENT
-- ===================================

-- Function to get signed URL for course material
CREATE OR REPLACE FUNCTION get_material_download_url(material_id UUID)
RETURNS TEXT AS $$
DECLARE
    file_path TEXT;
    is_enrolled BOOLEAN := FALSE;
    is_instructor BOOLEAN := FALSE;
    is_admin BOOLEAN := FALSE;
BEGIN
    -- Get file path
    SELECT cm.file_path INTO file_path
    FROM course_materials cm
    WHERE cm.id = material_id;
    
    IF file_path IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Check if user is enrolled
    SELECT EXISTS (
        SELECT 1 FROM course_materials cm
        JOIN course_enrollments ce ON cm.course_id = ce.course_id
        WHERE cm.id = material_id
        AND ce.user_id = auth.uid()
        AND ce.status = 'active'
    ) INTO is_enrolled;
    
    -- Check if user is instructor
    SELECT EXISTS (
        SELECT 1 FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = material_id
        AND c.instructor_id = auth.uid()
    ) INTO is_instructor;
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.user_id = auth.uid() 
        AND up.role = 'admin'
    ) INTO is_admin;
    
    -- Return URL if user has access
    IF is_enrolled OR is_instructor OR is_admin THEN
        RETURN file_path;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate file upload permissions
CREATE OR REPLACE FUNCTION can_upload_material(course_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_instructor BOOLEAN := FALSE;
    is_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is instructor of the course
    SELECT EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_id
        AND c.instructor_id = auth.uid()
    ) INTO is_instructor;
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.user_id = auth.uid() 
        AND up.role = 'admin'
    ) INTO is_admin;
    
    RETURN is_instructor OR is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_material_download_url(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_upload_material(UUID) TO authenticated;

-- Add useful indexes for storage operations
CREATE INDEX IF NOT EXISTS idx_course_materials_file_path ON course_materials(file_path);
CREATE INDEX IF NOT EXISTS idx_courses_thumbnail_url ON courses(thumbnail_url);

-- Comments for documentation
COMMENT ON FUNCTION get_material_download_url(UUID) IS 'Returns file path for material download if user has access';
COMMENT ON FUNCTION can_upload_material(UUID) IS 'Checks if user can upload materials to a course';

-- Enable realtime for course materials (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE course_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE user_material_progress;