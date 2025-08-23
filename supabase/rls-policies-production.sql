-- ============================================
-- 🔐 ROW LEVEL SECURITY POLICIES - PRODUCTION
-- ============================================
-- This file contains comprehensive RLS policies for all tables
-- Execute this in production after deploying the schema

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

-- Core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER PROFILES RLS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "users_select_own_profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (auto-created via trigger)
CREATE POLICY "users_insert_own_profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Instructors and admins can view user profiles for their courses
CREATE POLICY "instructors_view_enrolled_users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_enrollments ce ON c.id = ce.course_id
            WHERE ce.user_id = users.id
            AND c.instructor_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'support')
        )
    );

-- ============================================
-- COURSES RLS POLICIES
-- ============================================

-- Everyone can view published courses
CREATE POLICY "courses_public_select" ON public.courses
    FOR SELECT USING (
        status = 'published' 
        AND deleted_at IS NULL
        AND published_at <= NOW()
    );

-- Instructors can view their own courses (all statuses)
CREATE POLICY "courses_instructor_select" ON public.courses
    FOR SELECT USING (
        instructor_id = auth.uid()
        AND deleted_at IS NULL
    );

-- Instructors can insert courses
CREATE POLICY "courses_instructor_insert" ON public.courses
    FOR INSERT WITH CHECK (
        instructor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() 
            AND u.role IN ('instructor', 'admin')
        )
    );

-- Instructors can update their own courses
CREATE POLICY "courses_instructor_update" ON public.courses
    FOR UPDATE USING (
        instructor_id = auth.uid()
        AND deleted_at IS NULL
    );

-- Instructors can soft delete their own courses
CREATE POLICY "courses_instructor_delete" ON public.courses
    FOR UPDATE USING (
        instructor_id = auth.uid()
        AND deleted_at IS NULL
    ) WITH CHECK (
        deleted_at IS NOT NULL
        AND deleted_by = auth.uid()
    );

-- Admins have full access
CREATE POLICY "courses_admin_all" ON public.courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- ============================================
-- COURSE MODULES RLS POLICIES
-- ============================================

-- Users can view modules of published courses
CREATE POLICY "modules_public_select" ON public.course_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_modules.course_id
            AND c.status = 'published'
            AND c.deleted_at IS NULL
        )
    );

-- Enrolled users can view all modules of their courses
CREATE POLICY "modules_enrolled_select" ON public.course_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = course_modules.course_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
    );

-- Instructors can manage their course modules
CREATE POLICY "modules_instructor_all" ON public.course_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_modules.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- ============================================
-- LESSONS RLS POLICIES
-- ============================================

-- Users can view lessons of published courses they're enrolled in
CREATE POLICY "lessons_enrolled_select" ON public.lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            JOIN public.courses c ON c.id = ce.course_id
            JOIN public.course_modules cm ON cm.course_id = c.id
            WHERE ce.user_id = auth.uid()
            AND ce.status = 'active'
            AND cm.id = lessons.module_id
            AND c.status = 'published'
        )
        OR
        -- Allow preview lessons for non-enrolled users
        (
            is_preview = true
            AND EXISTS (
                SELECT 1 FROM public.courses c
                JOIN public.course_modules cm ON cm.course_id = c.id
                WHERE cm.id = lessons.module_id
                AND c.status = 'published'
            )
        )
    );

-- Instructors can manage lessons in their courses
CREATE POLICY "lessons_instructor_all" ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_modules cm ON cm.course_id = c.id
            WHERE cm.id = lessons.module_id
            AND c.instructor_id = auth.uid()
        )
    );

-- ============================================
-- COURSE ENROLLMENTS RLS POLICIES
-- ============================================

-- Users can view their own enrollments
CREATE POLICY "enrollments_user_select" ON public.course_enrollments
    FOR SELECT USING (user_id = auth.uid());

-- Users can enroll themselves in courses
CREATE POLICY "enrollments_user_insert" ON public.course_enrollments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_enrollments.course_id
            AND c.status = 'published'
        )
    );

-- Users can update their own enrollment status (cancel, etc.)
CREATE POLICY "enrollments_user_update" ON public.course_enrollments
    FOR UPDATE USING (user_id = auth.uid());

-- Instructors can view enrollments for their courses
CREATE POLICY "enrollments_instructor_select" ON public.course_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_enrollments.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Instructors can update enrollment status for their courses
CREATE POLICY "enrollments_instructor_update" ON public.course_enrollments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_enrollments.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- ============================================
-- LESSON PROGRESS RLS POLICIES
-- ============================================

-- Users can view their own progress
CREATE POLICY "progress_user_select" ON public.lesson_progress
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "progress_user_insert" ON public.lesson_progress
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            JOIN public.lessons l ON l.module_id IN (
                SELECT cm.id FROM public.course_modules cm 
                WHERE cm.course_id = ce.course_id
            )
            WHERE ce.user_id = auth.uid()
            AND ce.status = 'active'
            AND l.id = lesson_progress.lesson_id
        )
    );

CREATE POLICY "progress_user_update" ON public.lesson_progress
    FOR UPDATE USING (user_id = auth.uid());

-- Instructors can view progress for their courses
CREATE POLICY "progress_instructor_select" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_modules cm ON cm.course_id = c.id
            JOIN public.lessons l ON l.module_id = cm.id
            WHERE l.id = lesson_progress.lesson_id
            AND c.instructor_id = auth.uid()
        )
    );

-- ============================================
-- PAYMENTS RLS POLICIES
-- ============================================

-- Users can view their own payments
CREATE POLICY "payments_user_select" ON public.payments
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert payments (when making purchases)
CREATE POLICY "payments_user_insert" ON public.payments
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- System can update payment status (webhooks)
-- Note: This will be handled by service role key, not user auth

-- Instructors can view payments for their courses
CREATE POLICY "payments_instructor_select" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = payments.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Admins have full access to payments
CREATE POLICY "payments_admin_all" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- ============================================
-- COURSE REVIEWS RLS POLICIES
-- ============================================

-- Everyone can view published reviews
CREATE POLICY "reviews_public_select" ON public.course_reviews
    FOR SELECT USING (
        status = 'published'
        AND deleted_at IS NULL
    );

-- Users can view their own reviews (all statuses)
CREATE POLICY "reviews_user_select" ON public.course_reviews
    FOR SELECT USING (
        user_id = auth.uid()
        AND deleted_at IS NULL
    );

-- Enrolled users can create reviews for courses they've purchased
CREATE POLICY "reviews_enrolled_insert" ON public.course_reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = course_reviews.course_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
    );

-- Users can update their own reviews
CREATE POLICY "reviews_user_update" ON public.course_reviews
    FOR UPDATE USING (
        user_id = auth.uid()
        AND deleted_at IS NULL
    );

-- Users can soft delete their own reviews
CREATE POLICY "reviews_user_delete" ON public.course_reviews
    FOR UPDATE USING (
        user_id = auth.uid()
        AND deleted_at IS NULL
    ) WITH CHECK (
        deleted_at IS NOT NULL
        AND deleted_by = auth.uid()
    );

-- Instructors can view reviews for their courses
CREATE POLICY "reviews_instructor_select" ON public.course_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_reviews.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- ============================================
-- REVIEW HELPFULNESS RLS POLICIES
-- ============================================

-- Everyone can view helpfulness counts
CREATE POLICY "helpfulness_public_select" ON public.review_helpfulness
    FOR SELECT USING (true);

-- Users can mark reviews as helpful/unhelpful
CREATE POLICY "helpfulness_user_insert" ON public.review_helpfulness
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_reviews cr
            WHERE cr.id = review_helpfulness.review_id
            AND cr.status = 'published'
        )
    );

-- Users can update their helpfulness votes
CREATE POLICY "helpfulness_user_update" ON public.review_helpfulness
    FOR UPDATE USING (user_id = auth.uid());

-- Users can remove their helpfulness votes
CREATE POLICY "helpfulness_user_delete" ON public.review_helpfulness
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- UTILITY FUNCTIONS FOR RLS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is instructor
CREATE OR REPLACE FUNCTION auth.is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() 
        AND role IN ('instructor', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is enrolled in course
CREATE OR REPLACE FUNCTION auth.is_enrolled_in_course(course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE user_id = auth.uid() 
        AND course_enrollments.course_id = $1
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS FOR SERVICE ROLE
-- ============================================
-- These grants ensure the service role can bypass RLS when needed

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify RLS is working correctly

/*
-- Test RLS is enabled
SELECT schemaname, tablename, rowsecurity, enablerls 
FROM pg_tables 
WHERE schemaname = 'public' 
AND enablerls = true;

-- View all policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test policy as authenticated user
SELECT * FROM public.courses WHERE status = 'published';

-- Test policy as course owner
SELECT * FROM public.courses WHERE instructor_id = auth.uid();
*/

-- ============================================
-- MONITORING & AUDITING
-- ============================================

-- Create audit log table for RLS policy violations
CREATE TABLE IF NOT EXISTS public.rls_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    policy_violated TEXT,
    error_message TEXT,
    request_details JSONB
);

-- Enable RLS on audit log (only admins can view)
ALTER TABLE public.rls_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_only" ON public.rls_audit_log
    FOR ALL USING (auth.is_admin());

-- ============================================
-- DEPLOYMENT CHECKLIST
-- ============================================

/*
DEPLOYMENT CHECKLIST:
[ ] Verify all tables have RLS enabled
[ ] Test each policy with appropriate user roles
[ ] Verify service role can still perform admin operations
[ ] Test API endpoints with different user permissions
[ ] Monitor audit logs for policy violations
[ ] Update application code to handle RLS errors gracefully
[ ] Document RLS policies for development team
[ ] Set up monitoring alerts for RLS violations
*/