-- 7P Education Platform - Course System Schema
-- This migration creates the complete course management system
-- with courses, lessons, enrollments, and user progress tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Instructors table
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    expertise TEXT[],
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_students INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    social_links JSONB DEFAULT '{}',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Categories for course organization
CREATE TABLE IF NOT EXISTS course_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
    icon VARCHAR(100),
    color VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    thumbnail_url TEXT,
    preview_video_url TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    original_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'TRY',
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
    level VARCHAR(20) DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    language VARCHAR(10) DEFAULT 'tr',
    duration_hours DECIMAL(5,2),
    total_lessons INTEGER DEFAULT 0,
    requirements TEXT[],
    what_you_learn TEXT[],
    target_audience TEXT[],
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    tags TEXT[],
    seo_title VARCHAR(255),
    seo_description VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Course modules for organized content structure
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    duration_hours DECIMAL(5,2),
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

-- Course lessons
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    video_url TEXT,
    video_duration INTEGER, -- in seconds
    lesson_type VARCHAR(20) DEFAULT 'video' CHECK (lesson_type IN ('video', 'text', 'quiz', 'assignment', 'resource')),
    order_index INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT false,
    resources JSONB DEFAULT '[]', -- Additional resources, PDFs, etc.
    transcript TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, order_index),
    UNIQUE(course_id, slug)
);

-- User course enrollments (purchases)
CREATE TABLE IF NOT EXISTS user_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    time_spent INTEGER DEFAULT 0, -- total time in seconds
    certificate_issued BOOLEAN DEFAULT false,
    certificate_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'refunded')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    review_date TIMESTAMPTZ,
    payment_id TEXT, -- Reference to payment/transaction
    purchase_price DECIMAL(10,2),
    refund_requested BOOLEAN DEFAULT false,
    refund_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, course_id)
);

-- User lesson progress
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
    module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    time_spent INTEGER DEFAULT 0, -- in seconds
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_position INTEGER DEFAULT 0, -- for video lessons
    notes TEXT,
    bookmarked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Course reviews and ratings
CREATE TABLE IF NOT EXISTS course_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    helpful_votes INTEGER DEFAULT 0,
    reported BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, user_id)
);

-- Course coupons and discounts
CREATE TABLE IF NOT EXISTS course_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    discount_type VARCHAR(10) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course announcements
CREATE TABLE IF NOT EXISTS course_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User bookmarks
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255),
    notes TEXT,
    timestamp_seconds INTEGER DEFAULT 0, -- For video bookmarks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id, timestamp_seconds)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_is_featured ON courses(is_featured);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price);
CREATE INDEX IF NOT EXISTS idx_courses_rating ON courses(rating);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order_index ON course_modules(order_index);

CREATE INDEX IF NOT EXISTS idx_course_lessons_module_id ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order_index ON course_lessons(order_index);
CREATE INDEX IF NOT EXISTS idx_course_lessons_lesson_type ON course_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_course_lessons_is_preview ON course_lessons(is_preview);

CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_status ON user_courses(status);
CREATE INDEX IF NOT EXISTS idx_user_courses_enrolled_at ON user_courses(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_user_courses_progress ON user_courses(progress_percentage);

CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_course_id ON user_lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_completed ON user_lesson_progress(completed);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON course_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_course_reviews_approved ON course_reviews(approved);

CREATE INDEX IF NOT EXISTS idx_course_coupons_code ON course_coupons(code);
CREATE INDEX IF NOT EXISTS idx_course_coupons_course_id ON course_coupons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_coupons_active ON course_coupons(active);
CREATE INDEX IF NOT EXISTS idx_course_coupons_valid_until ON course_coupons(valid_until);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_courses_updated_at BEFORE UPDATE ON user_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_lesson_progress_updated_at BEFORE UPDATE ON user_lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_reviews_updated_at BEFORE UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_coupons_updated_at BEFORE UPDATE ON course_coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_announcements_updated_at BEFORE UPDATE ON course_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Public read access to published courses
CREATE POLICY "Anyone can view published courses" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view course categories" ON course_categories FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view instructors" ON instructors FOR SELECT USING (true);

-- Course content access policies
CREATE POLICY "Anyone can view published course modules" ON course_modules FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = course_modules.course_id 
        AND courses.is_published = true
    )
);

CREATE POLICY "Anyone can view preview lessons" ON course_lessons FOR SELECT USING (
    is_preview = true AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = course_lessons.course_id 
        AND courses.is_published = true
    )
);

CREATE POLICY "Enrolled users can view course lessons" ON course_lessons FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_lessons.course_id 
        AND user_courses.user_id = auth.uid()
        AND user_courses.status = 'active'
    )
);

-- User course access policies
CREATE POLICY "Users can view their own enrollments" ON user_courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own enrollments" ON user_courses FOR UPDATE USING (auth.uid() = user_id);

-- Progress tracking policies
CREATE POLICY "Users can view their own progress" ON user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Review policies
CREATE POLICY "Anyone can view approved reviews" ON course_reviews FOR SELECT USING (approved = true);
CREATE POLICY "Users can manage their own reviews" ON course_reviews FOR ALL USING (auth.uid() = user_id);

-- Bookmark policies
CREATE POLICY "Users can manage their own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Functions for course management
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE courses SET
        rating = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM course_reviews
            WHERE course_id = NEW.course_id AND approved = true
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM course_reviews
            WHERE course_id = NEW.course_id AND approved = true
        )
    WHERE id = NEW.course_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON course_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_course_rating();

-- Function to update user course progress
CREATE OR REPLACE FUNCTION update_user_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    new_progress DECIMAL(5,2);
BEGIN
    -- Get total lessons in the course
    SELECT COUNT(*) INTO total_lessons
    FROM course_lessons
    WHERE course_id = NEW.course_id;
    
    -- Get completed lessons by the user
    SELECT COUNT(*) INTO completed_lessons
    FROM user_lesson_progress
    WHERE user_id = NEW.user_id
    AND course_id = NEW.course_id
    AND completed = true;
    
    -- Calculate progress percentage
    IF total_lessons > 0 THEN
        new_progress := (completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100;
    ELSE
        new_progress := 0;
    END IF;
    
    -- Update user course progress
    UPDATE user_courses SET
        progress_percentage = new_progress,
        completed_at = CASE 
            WHEN new_progress = 100 AND completed_at IS NULL THEN NOW()
            WHEN new_progress < 100 THEN NULL
            ELSE completed_at
        END,
        status = CASE
            WHEN new_progress = 100 THEN 'completed'
            ELSE status
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_course_progress_trigger
    AFTER INSERT OR UPDATE ON user_lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_user_course_progress();

-- Sample data for testing
INSERT INTO course_categories (name, description, slug, icon, color) VALUES
('Mentorluk', 'Kişisel ve profesyonel gelişim mentorluğu', 'mentorluk', 'users', 'blue'),
('Dijital Pazarlama', 'PPC, sosyal medya ve dijital reklam', 'dijital-pazarlama', 'trending-up', 'green'),
('E-ticaret', 'Ürün araştırması ve e-ticaret stratejileri', 'e-ticaret', 'shopping-cart', 'purple'),
('Teknoloji', 'Programlama ve teknoloji eğitimleri', 'teknoloji', 'code', 'orange')
ON CONFLICT (slug) DO NOTHING;

-- Create sample instructor
INSERT INTO instructors (display_name, bio, expertise, verified) VALUES
('7P Education Ekibi', 'Uzman eğitmenlerden oluşan deneyimli ekibimiz', ARRAY['Mentorluk', 'Dijital Pazarlama', 'E-ticaret'], true)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE courses IS 'Main courses catalog with pricing and metadata';
COMMENT ON TABLE course_modules IS 'Course modules for organized content structure';
COMMENT ON TABLE course_lessons IS 'Individual lessons within course modules';
COMMENT ON TABLE user_courses IS 'User enrollments and course progress';
COMMENT ON TABLE user_lesson_progress IS 'Detailed lesson-level progress tracking';
COMMENT ON TABLE course_reviews IS 'User reviews and ratings for courses';
COMMENT ON TABLE course_coupons IS 'Discount coupons for courses';
COMMENT ON TABLE instructors IS 'Course instructors and their profiles';
COMMENT ON TABLE course_categories IS 'Course categorization system';