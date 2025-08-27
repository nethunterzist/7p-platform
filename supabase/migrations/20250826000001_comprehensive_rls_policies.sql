-- Comprehensive RLS Policies for 7P Education
-- This migration ensures all tables have proper Row Level Security policies
-- Date: 2025-08-26

-- Enable RLS on all core tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =======================
-- USER PROFILES POLICIES
-- =======================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are visible" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Instructors can view enrolled student profiles
CREATE POLICY "Instructors can view enrolled students" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.user_id = user_profiles.user_id
            AND c.instructor_id = auth.uid()
        )
    );

-- System can insert new profiles
CREATE POLICY "System can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===================
-- COURSES POLICIES
-- ===================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Instructors can manage own courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage all courses" ON courses;

-- Anyone can view published courses
CREATE POLICY "Anyone can view published courses" ON courses
    FOR SELECT USING (is_published = true);

-- Instructors can view and manage their own courses
CREATE POLICY "Instructors can manage own courses" ON courses
    FOR ALL USING (instructor_id = auth.uid());

-- Admins can manage all courses
CREATE POLICY "Admins can manage all courses" ON courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Enrolled students can view course details
CREATE POLICY "Enrolled students can view courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = courses.id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
    );

-- ==============================
-- COURSE MODULES/LESSONS POLICIES
-- ==============================

-- Course Modules
DROP POLICY IF EXISTS "Enrolled users can view modules" ON course_modules;
DROP POLICY IF EXISTS "Instructors can manage course modules" ON course_modules;

CREATE POLICY "Enrolled users can view modules" ON course_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = course_modules.course_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_modules.course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage course modules" ON course_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_modules.course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Course Lessons
DROP POLICY IF EXISTS "Enrolled users can view lessons" ON course_lessons;
DROP POLICY IF EXISTS "Instructors can manage course lessons" ON course_lessons;

CREATE POLICY "Enrolled users can view lessons" ON course_lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            JOIN course_modules cm ON ce.course_id = cm.course_id
            WHERE cm.id = course_lessons.module_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM course_modules cm
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.id = course_lessons.module_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage course lessons" ON course_lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM course_modules cm
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.id = course_lessons.module_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- =============================
-- COURSE MATERIALS POLICIES
-- =============================

DROP POLICY IF EXISTS "Enrolled users can view materials" ON course_materials;
DROP POLICY IF EXISTS "Instructors can manage materials" ON course_materials;

CREATE POLICY "Enrolled users can view materials" ON course_materials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = course_materials.course_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_materials.course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage materials" ON course_materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_materials.course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- ==========================
-- ENROLLMENTS POLICIES
-- ==========================

DROP POLICY IF EXISTS "Users can view own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can enroll in courses" ON course_enrollments;
DROP POLICY IF EXISTS "Instructors can view course enrollments" ON course_enrollments;

CREATE POLICY "Users can view own enrollments" ON course_enrollments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can enroll in courses" ON course_enrollments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own enrollments" ON course_enrollments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Instructors can view course enrollments" ON course_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_enrollments.course_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all enrollments" ON course_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- ==========================
-- PROGRESS TRACKING POLICIES
-- ==========================

DROP POLICY IF EXISTS "Users can view own progress" ON user_material_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_material_progress;
DROP POLICY IF EXISTS "Instructors can view student progress" ON user_material_progress;

CREATE POLICY "Users can view own progress" ON user_material_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON user_material_progress
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Instructors can view student progress" ON user_material_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.id = user_material_progress.material_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all progress" ON user_material_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- ======================
-- REVIEWS POLICIES
-- ======================

DROP POLICY IF EXISTS "Anyone can view published reviews" ON course_reviews;
DROP POLICY IF EXISTS "Users can manage own reviews" ON course_reviews;

CREATE POLICY "Anyone can view published reviews" ON course_reviews
    FOR SELECT USING (is_published = true);

CREATE POLICY "Users can manage own reviews" ON course_reviews
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Instructors can view course reviews" ON course_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_reviews.course_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can moderate reviews" ON course_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- ======================
-- QUIZ POLICIES
-- ======================

-- Quiz Questions
DROP POLICY IF EXISTS "Enrolled users can view quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Instructors can manage quiz questions" ON quiz_questions;

CREATE POLICY "Enrolled users can view quiz questions" ON quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_lessons cl
            JOIN course_modules cm ON cl.module_id = cm.id
            JOIN course_enrollments ce ON cm.course_id = ce.course_id
            WHERE cl.id = quiz_questions.lesson_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM course_lessons cl
            JOIN course_modules cm ON cl.module_id = cm.id
            JOIN courses c ON cm.course_id = c.id
            WHERE cl.id = quiz_questions.lesson_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage quiz questions" ON quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM course_lessons cl
            JOIN course_modules cm ON cl.module_id = cm.id
            JOIN courses c ON cm.course_id = c.id
            WHERE cl.id = quiz_questions.lesson_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Quiz Answers
DROP POLICY IF EXISTS "Enrolled users can view quiz answers after attempt" ON quiz_answers;
DROP POLICY IF EXISTS "Instructors can manage quiz answers" ON quiz_answers;

CREATE POLICY "Enrolled users can view quiz answers after attempt" ON quiz_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_quiz_attempts uqa
            JOIN quiz_questions qq ON uqa.question_id = qq.id
            WHERE qq.id = quiz_answers.question_id
            AND uqa.user_id = auth.uid()
            AND uqa.completed_at IS NOT NULL
        )
        OR EXISTS (
            SELECT 1 FROM quiz_questions qq
            JOIN course_lessons cl ON qq.lesson_id = cl.id
            JOIN course_modules cm ON cl.module_id = cm.id
            JOIN courses c ON cm.course_id = c.id
            WHERE qq.id = quiz_answers.question_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage quiz answers" ON quiz_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quiz_questions qq
            JOIN course_lessons cl ON qq.lesson_id = cl.id
            JOIN course_modules cm ON cl.module_id = cm.id
            JOIN courses c ON cm.course_id = c.id
            WHERE qq.id = quiz_answers.question_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Quiz Attempts
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON user_quiz_attempts;
DROP POLICY IF EXISTS "Users can create quiz attempts" ON user_quiz_attempts;
DROP POLICY IF EXISTS "Instructors can view student attempts" ON user_quiz_attempts;

CREATE POLICY "Users can view own quiz attempts" ON user_quiz_attempts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own quiz attempts" ON user_quiz_attempts
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Instructors can view student attempts" ON user_quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_questions qq
            JOIN course_lessons cl ON qq.lesson_id = cl.id
            JOIN course_modules cm ON cl.module_id = cm.id
            JOIN courses c ON cm.course_id = c.id
            WHERE qq.id = user_quiz_attempts.question_id
            AND c.instructor_id = auth.uid()
        )
    );

-- ======================
-- PAYMENTS POLICIES
-- ======================

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create payments" ON payments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors can view course payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = payments.course_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- ======================
-- DISCUSSIONS POLICIES
-- ======================

DROP POLICY IF EXISTS "Course members can view discussions" ON discussions;
DROP POLICY IF EXISTS "Enrolled users can create discussions" ON discussions;
DROP POLICY IF EXISTS "Users can manage own discussions" ON discussions;

CREATE POLICY "Course members can view discussions" ON discussions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = discussions.course_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = discussions.course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Enrolled users can create discussions" ON discussions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = discussions.course_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
    );

CREATE POLICY "Users can manage own discussions" ON discussions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Instructors can moderate discussions" ON discussions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = discussions.course_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Discussion Replies
DROP POLICY IF EXISTS "Course members can view replies" ON discussion_replies;
DROP POLICY IF EXISTS "Course members can create replies" ON discussion_replies;
DROP POLICY IF EXISTS "Users can manage own replies" ON discussion_replies;

CREATE POLICY "Course members can view replies" ON discussion_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM discussions d
            JOIN course_enrollments ce ON d.course_id = ce.course_id
            WHERE d.id = discussion_replies.discussion_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM discussions d
            JOIN courses c ON d.course_id = c.id
            WHERE d.id = discussion_replies.discussion_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "Course members can create replies" ON discussion_replies
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM discussions d
            JOIN course_enrollments ce ON d.course_id = ce.course_id
            WHERE d.id = discussion_replies.discussion_id
            AND ce.user_id = auth.uid()
            AND ce.status = 'active'
        )
    );

CREATE POLICY "Users can manage own replies" ON discussion_replies
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Instructors can moderate replies" ON discussion_replies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM discussions d
            JOIN courses c ON d.course_id = c.id
            WHERE d.id = discussion_replies.discussion_id
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- ======================
-- AUDIT LOGS POLICIES
-- ======================

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- ======================
-- FUNCTIONS & TRIGGERS
-- ======================

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'student'
    );
    
    -- Initialize learning streak
    INSERT INTO public.learning_streaks (user_id, current_streak, longest_streak)
    VALUES (NEW.id, 0, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to log course enrollment
CREATE OR REPLACE FUNCTION log_course_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        NEW.user_id,
        'ENROLL',
        'course_enrollments',
        NEW.id,
        NULL,
        row_to_json(NEW)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for enrollment logging
DROP TRIGGER IF EXISTS log_enrollment_trigger ON course_enrollments;
CREATE TRIGGER log_enrollment_trigger
    AFTER INSERT ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION log_course_enrollment();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Add comments for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile and initializes learning streak when new user registers';
COMMENT ON FUNCTION log_course_enrollment() IS 'Logs course enrollment events to audit_logs table';