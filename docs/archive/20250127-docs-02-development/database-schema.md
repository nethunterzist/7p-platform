# Database Schema Optimization - 7P Education Platform

## 📋 Özet

7P Education Platform'un veritabanı şeması, PostgreSQL'in güçlü özelliklerini kullanarak tasarlanmış, eğitim platformunun karmaşık gereksinimlerini karşılayan normalize edilmiş ve performans odaklı bir yapıdır. Bu dokümantasyon, mevcut şema yapısını, optimizasyon stratejilerini ve gelecekteki geliştirme planlarını detaylandırır.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun amaçları:
- PostgreSQL şema tasarımının ayrıntılı analizi
- Supabase RLS (Row Level Security) policies'lerinin incelenmesi
- İndeksleme stratejilerinin ve performans optimizasyonlarının açıklanması
- Veri modelleri ve ilişkilerinin dokümantasyonu
- Migration stratejilerinin ve versioning yaklaşımlarının belirlenmesi
- Backup ve recovery planlarının tasarımı

## 🏗️ Mevcut Durum Analizi

### ✅ Tamamlanmış Şema Bileşenleri
- **Authentication Schema**: ✅ Supabase Auth ile entegre user management - PRODUCTION READY
- **User Profiles**: ✅ Otomatik user profile creation trigger sistemi - ACTIVE
- **Course Management**: ✅ Kurs, modül ve lesson yapısı - 7 tablo DEPLOYED
- **Payment Integration**: ✅ Stripe entegrasyonu için payment records - READY
- **Enrollment System**: ✅ Kurs kayıt ve progress tracking - RLS ENABLED
- **Content Management**: ✅ Ders içerikleri ve kaynak yönetimi - OPERATIONAL
- **Review System**: ✅ Course reviews ve helpfulness tracking - 2 tablo ACTIVE
- **Automated Migration System**: ✅ dotenvx + Supabase CLI entegrasyonu - WORKING
- **Database Deployment**: ✅ Otomatik schema deployment + seed sistemi - PRODUCTION READY

### 🚀 Yeni Eklenen Özellikler (Ağustos 2025)
- **Otomatik Migration Pipeline**: `npm run db:migrate` ile production-ready deployment
- **Environment Variable Management**: dotenvx ile güvenli env loading
- **Database Verification System**: `npm run db:verify` ile 9/9 tablo kontrolü
- **Seed Data Management**: `npm run db:seed` ile otomatik test verisi
- **Real-time Schema Sync**: Supabase CLI entegrasyonu ile live sync
- **Security Enhancement**: RLS policies ve Service Role Key management

### ⚠️ Geliştirilmesi Gereken Alanlar
- Advanced analytics schema implementation (planned Q4 2025)
- Real-time messaging ve notification systems (in development)
- Advanced search ve filtering capabilities (phase 2)
- Data archiving ve purging strategies (monitoring phase)
- Performance monitoring ve logging tables (setup ready)
- Multi-language content support (design phase)

## 🔧 Teknik Detaylar

### 🗄️ Core Schema Structure

#### User Management Schema
```sql
-- Enhanced user profiles with extended metadata
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    status user_status NOT NULL DEFAULT 'active',
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    phone VARCHAR(20),
    date_of_birth DATE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language_code VARCHAR(5) DEFAULT 'tr',
    notification_settings JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "marketing_emails": false,
        "course_updates": true,
        "payment_confirmations": true
    }'::jsonb,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'support');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- Indexes for performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at);
CREATE INDEX idx_user_profiles_last_active ON public.user_profiles(last_active_at);
CREATE INDEX idx_user_profiles_soft_delete ON public.user_profiles(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for JSONB fields
CREATE INDEX idx_user_profiles_preferences ON public.user_profiles USING GIN(preferences);
CREATE INDEX idx_user_profiles_metadata ON public.user_profiles USING GIN(metadata);
CREATE INDEX idx_user_profiles_notifications ON public.user_profiles USING GIN(notification_settings);
```

#### Course Management Schema
```sql
-- Comprehensive course structure
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    short_description VARCHAR(1000),
    instructor_id UUID NOT NULL REFERENCES public.user_profiles(id),
    category_id UUID NOT NULL REFERENCES public.categories(id),
    
    -- Pricing and business model
    pricing JSONB NOT NULL DEFAULT '{
        "type": "one_time",
        "amount": 0,
        "currency": "TRY",
        "discount": null,
        "trial_period": null
    }'::jsonb,
    
    -- Course metadata
    level course_level NOT NULL DEFAULT 'beginner',
    language VARCHAR(5) NOT NULL DEFAULT 'tr',
    duration_minutes INTEGER DEFAULT 0,
    estimated_completion_days INTEGER DEFAULT 30,
    
    -- Content and media
    thumbnail_url TEXT,
    preview_video_url TEXT,
    cover_image_url TEXT,
    syllabus TEXT,
    learning_objectives TEXT[],
    prerequisites TEXT[],
    
    -- Status and visibility
    status course_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    featured BOOLEAN DEFAULT FALSE,
    
    -- SEO and marketing
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    tags TEXT[],
    keywords TEXT[],
    
    -- Statistics (updated via triggers)
    enrollment_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Course related enums
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE course_status AS ENUM ('draft', 'review', 'published', 'archived', 'suspended');

-- Performance indexes
CREATE INDEX idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX idx_courses_category ON public.courses(category_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_level ON public.courses(level);
CREATE INDEX idx_courses_featured ON public.courses(featured) WHERE featured = true;
CREATE INDEX idx_courses_published_at ON public.courses(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_courses_slug ON public.courses(slug);

-- Full-text search indexes
CREATE INDEX idx_courses_search ON public.courses USING gin(
    to_tsvector('turkish', 
        coalesce(title, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(short_description, '') || ' ' ||
        coalesce(array_to_string(tags, ' '), '')
    )
);

-- JSONB indexes
CREATE INDEX idx_courses_pricing ON public.courses USING gin(pricing);
CREATE INDEX idx_courses_learning_objectives ON public.courses USING gin(learning_objectives);
```

#### Course Module and Lesson Structure
```sql
-- Course modules with hierarchical structure
CREATE TABLE public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    
    -- Content organization
    learning_objectives TEXT[],
    estimated_duration_minutes INTEGER DEFAULT 0,
    
    -- Prerequisites and dependencies
    prerequisites UUID[] DEFAULT '{}', -- Array of module IDs
    unlock_conditions JSONB DEFAULT '{
        "type": "sequential",
        "required_completion": 100
    }'::jsonb,
    
    -- Status and visibility
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(course_id, order_index),
    CHECK (order_index > 0)
);

-- Individual lessons within modules
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    
    -- Content types and structure
    content_type lesson_content_type NOT NULL DEFAULT 'video',
    content_data JSONB NOT NULL DEFAULT '{}',
    
    -- Media and resources
    video_url TEXT,
    video_duration_seconds INTEGER,
    transcript TEXT,
    slides_url TEXT,
    
    -- Interactive elements
    has_quiz BOOLEAN DEFAULT FALSE,
    has_assignment BOOLEAN DEFAULT FALSE,
    has_discussion BOOLEAN DEFAULT FALSE,
    
    -- Completion tracking
    estimated_duration_minutes INTEGER DEFAULT 10,
    completion_criteria JSONB DEFAULT '{
        "video_watch_percentage": 80,
        "quiz_min_score": 70,
        "required_interactions": []
    }'::jsonb,
    
    -- Status and access
    published BOOLEAN DEFAULT FALSE,
    is_preview BOOLEAN DEFAULT FALSE,
    requires_enrollment BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(module_id, order_index),
    CHECK (order_index > 0)
);

-- Content types enum
CREATE TYPE lesson_content_type AS ENUM (
    'video', 'text', 'quiz', 'assignment', 
    'discussion', 'live_session', 'document', 'interactive'
);

-- Indexes for performance
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id, order_index);
CREATE INDEX idx_lessons_module ON public.lessons(module_id, order_index);
CREATE INDEX idx_lessons_course ON public.lessons(course_id);
CREATE INDEX idx_lessons_content_type ON public.lessons(content_type);
CREATE INDEX idx_lessons_published ON public.lessons(published) WHERE published = true;

-- JSONB indexes for flexible queries
CREATE INDEX idx_lessons_content_data ON public.lessons USING gin(content_data);
CREATE INDEX idx_lessons_completion_criteria ON public.lessons USING gin(completion_criteria);
```

#### Enrollment and Progress Tracking
```sql
-- Student course enrollments
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    -- Enrollment details
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enrollment_type enrollment_type NOT NULL DEFAULT 'paid',
    payment_id UUID REFERENCES public.payments(id),
    
    -- Progress tracking
    status enrollment_status NOT NULL DEFAULT 'active',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    completed_lessons_count INTEGER DEFAULT 0,
    total_lessons_count INTEGER DEFAULT 0,
    
    -- Completion tracking
    started_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    certificate_issued_at TIMESTAMPTZ,
    certificate_url TEXT,
    
    -- Performance metrics
    total_study_time_minutes INTEGER DEFAULT 0,
    average_quiz_score DECIMAL(5,2),
    assignments_submitted INTEGER DEFAULT 0,
    assignments_completed INTEGER DEFAULT 0,
    
    -- Access control
    access_expires_at TIMESTAMPTZ,
    access_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, course_id)
);

-- Enrollment related enums
CREATE TYPE enrollment_type AS ENUM ('free', 'paid', 'trial', 'scholarship', 'bulk');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'suspended', 'expired', 'cancelled');

-- Detailed lesson progress tracking
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Progress details
    status lesson_progress_status NOT NULL DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Interaction tracking
    first_accessed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_time_spent_minutes INTEGER DEFAULT 0,
    
    -- Video-specific tracking
    video_watch_time_seconds INTEGER DEFAULT 0,
    video_completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    video_bookmarks JSONB DEFAULT '[]'::jsonb,
    
    -- Quiz and assessment results
    quiz_attempts INTEGER DEFAULT 0,
    best_quiz_score DECIMAL(5,2),
    latest_quiz_score DECIMAL(5,2),
    quiz_completed_at TIMESTAMPTZ,
    
    -- Notes and interactions
    student_notes TEXT,
    bookmarked BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(enrollment_id, lesson_id)
);

-- Progress status enum
CREATE TYPE lesson_progress_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

-- Performance indexes
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);
CREATE INDEX idx_enrollments_enrolled_at ON public.enrollments(enrolled_at);
CREATE INDEX idx_enrollments_active ON public.enrollments(user_id, status) WHERE status = 'active';

CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_status ON public.lesson_progress(status);
CREATE INDEX idx_lesson_progress_completed ON public.lesson_progress(completed_at) WHERE completed_at IS NOT NULL;
```

#### Payment and Transaction Management
```sql
-- Comprehensive payment tracking
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    course_id UUID REFERENCES public.courses(id),
    
    -- Payment provider details
    payment_provider payment_provider NOT NULL DEFAULT 'stripe',
    provider_payment_id VARCHAR(255) NOT NULL,
    provider_customer_id VARCHAR(255),
    provider_session_id VARCHAR(255),
    
    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    
    -- Business context
    payment_type payment_type NOT NULL DEFAULT 'course_purchase',
    description TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    
    -- Timestamps
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    -- Refund information
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    refund_reference VARCHAR(255),
    
    -- Metadata for extensibility
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CHECK (amount > 0),
    CHECK (refund_amount >= 0),
    CHECK (refund_amount <= amount)
);

-- Payment related enums
CREATE TYPE payment_provider AS ENUM ('stripe', 'paypal', 'bank_transfer', 'crypto');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded');
CREATE TYPE payment_type AS ENUM ('course_purchase', 'subscription', 'certification', 'bundle', 'refund');

-- Financial reporting table
CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id),
    
    -- Transaction classification
    transaction_type financial_transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Revenue sharing
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    instructor_share DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Accounting
    accounting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_quarter INTEGER,
    fiscal_year INTEGER,
    
    -- Audit fields
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CHECK (amount != 0)
);

-- Financial transaction types
CREATE TYPE financial_transaction_type AS ENUM (
    'revenue', 'refund', 'chargeback', 'fee', 'payout', 'adjustment'
);

-- Indexes for financial queries
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_course ON public.payments(course_id);
CREATE INDEX idx_payments_provider_id ON public.payments(payment_provider, provider_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_confirmed_at ON public.payments(confirmed_at) WHERE confirmed_at IS NOT NULL;

CREATE INDEX idx_financial_transactions_payment ON public.financial_transactions(payment_id);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(accounting_date);
CREATE INDEX idx_financial_transactions_quarter ON public.financial_transactions(fiscal_year, fiscal_quarter);
```

### 🔒 Row Level Security (RLS) Implementation

#### User Profile Security
```sql
-- Enable RLS on user profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY user_profiles_own_data ON public.user_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id);

-- Admins can access all profiles
CREATE POLICY user_profiles_admin_access ON public.user_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Public read access for instructor profiles (limited fields)
CREATE POLICY user_profiles_instructor_public ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
        role = 'instructor' AND 
        status = 'active' AND 
        deleted_at IS NULL
    );
```

#### Course Access Security
```sql
-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Published courses are publicly readable
CREATE POLICY courses_public_read ON public.courses
    FOR SELECT TO authenticated
    USING (
        status = 'published' AND 
        published_at <= NOW() AND 
        deleted_at IS NULL
    );

-- Instructors can manage their own courses
CREATE POLICY courses_instructor_manage ON public.courses
    FOR ALL TO authenticated
    USING (instructor_id = auth.uid());

-- Admins can manage all courses
CREATE POLICY courses_admin_manage ON public.courses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

#### Enrollment and Progress Security
```sql
-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Students can only see their own enrollments
CREATE POLICY enrollments_student_access ON public.enrollments
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Instructors can see enrollments for their courses
CREATE POLICY enrollments_instructor_access ON public.enrollments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE id = course_id AND instructor_id = auth.uid()
        )
    );

-- Lesson progress security
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_progress_student_access ON public.lesson_progress
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY lesson_progress_instructor_access ON public.lesson_progress
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON l.course_id = c.id
            WHERE l.id = lesson_id AND c.instructor_id = auth.uid()
        )
    );
```

### 🚀 Performance Optimization Strategies

#### Database Functions and Triggers
```sql
-- Update course statistics trigger
CREATE OR REPLACE FUNCTION update_course_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update enrollment count and completion rate
    UPDATE public.courses
    SET 
        enrollment_count = (
            SELECT COUNT(*) FROM public.enrollments 
            WHERE course_id = NEW.course_id AND status != 'cancelled'
        ),
        completion_rate = (
            SELECT 
                CASE 
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*))
                END
            FROM public.enrollments 
            WHERE course_id = NEW.course_id AND status != 'cancelled'
        ),
        updated_at = NOW()
    WHERE id = NEW.course_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for enrollment changes
CREATE TRIGGER trigger_update_course_statistics
    AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_statistics();

-- Update user last active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles 
    SET last_active_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lesson progress updates
CREATE TRIGGER trigger_update_user_last_active
    AFTER INSERT OR UPDATE ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_active();
```

#### Materialized Views for Analytics
```sql
-- Course analytics materialized view
CREATE MATERIALIZED VIEW course_analytics AS
SELECT 
    c.id as course_id,
    c.title,
    c.instructor_id,
    c.category_id,
    c.status,
    
    -- Enrollment metrics
    COUNT(e.id) as total_enrollments,
    COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completions,
    COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_students,
    
    -- Progress metrics
    AVG(e.progress_percentage) as avg_progress,
    AVG(CASE WHEN e.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (e.completed_at - e.enrolled_at))/86400 
        END) as avg_completion_days,
    
    -- Revenue metrics
    SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_revenue,
    AVG(CASE WHEN p.status = 'completed' THEN p.amount END) as avg_price,
    
    -- Time-based metrics
    DATE_TRUNC('month', c.created_at) as created_month,
    c.created_at,
    MAX(e.enrolled_at) as last_enrollment
    
FROM public.courses c
LEFT JOIN public.enrollments e ON c.id = e.course_id
LEFT JOIN public.payments p ON e.payment_id = p.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.title, c.instructor_id, c.category_id, c.status, c.created_at;

-- Refresh policy for materialized view
CREATE OR REPLACE FUNCTION refresh_course_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY course_analytics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-course-analytics', '0 * * * *', 'SELECT refresh_course_analytics();');
```

#### Partitioning for Large Tables
```sql
-- Partition lesson_progress by month for better performance
CREATE TABLE public.lesson_progress_partitioned (
    LIKE public.lesson_progress INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE public.lesson_progress_2024_01 
    PARTITION OF public.lesson_progress_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE public.lesson_progress_2024_02 
    PARTITION OF public.lesson_progress_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I 
        PARTITION OF public.%I 
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name || '_partitioned', start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## 💡 Öneriler ve Best Practices

### 🔄 Database Migration Strategy
```sql
-- Migration versioning table
CREATE TABLE public.schema_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_time_ms INTEGER,
    checksum VARCHAR(64),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    rollback_sql TEXT,
    
    INDEX idx_schema_migrations_version (version),
    INDEX idx_schema_migrations_executed_at (executed_at)
);

-- Example migration template
-- Migration: 002_add_course_categories.sql
-- Description: Add course categories and subcategories
-- Rollback: 002_add_course_categories_rollback.sql

BEGIN;

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7),
    icon_name VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add category relationship to courses
ALTER TABLE public.courses 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create indexes
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_active ON public.categories(is_active) WHERE is_active = true;

-- Insert migration record
INSERT INTO public.schema_migrations (version, name, execution_time_ms)
VALUES ('002', 'add_course_categories', extract(milliseconds from now() - transaction_timestamp()));

COMMIT;
```

### 📊 Data Archiving Strategy
```sql
-- Data archiving for compliance and performance
CREATE SCHEMA archive;

-- Archive old lesson progress data
CREATE OR REPLACE FUNCTION archive_old_lesson_progress()
RETURNS void AS $$
DECLARE
    archive_date date := CURRENT_DATE - INTERVAL '2 years';
    rows_archived integer;
BEGIN
    -- Move old data to archive schema
    WITH archived_rows AS (
        DELETE FROM public.lesson_progress 
        WHERE created_at < archive_date
        RETURNING *
    )
    INSERT INTO archive.lesson_progress 
    SELECT * FROM archived_rows;
    
    GET DIAGNOSTICS rows_archived = ROW_COUNT;
    
    -- Log archiving operation
    INSERT INTO public.data_operations_log (
        operation_type, 
        table_name, 
        rows_affected, 
        executed_at,
        details
    ) VALUES (
        'archive',
        'lesson_progress',
        rows_archived,
        NOW(),
        jsonb_build_object('archive_date', archive_date)
    );
    
    RAISE NOTICE 'Archived % rows from lesson_progress', rows_archived;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly archiving
SELECT cron.schedule('archive-lesson-progress', '0 2 1 * *', 'SELECT archive_old_lesson_progress();');
```

### 🔍 Advanced Search Implementation
```sql
-- Full-text search configuration for Turkish content
CREATE TEXT SEARCH CONFIGURATION turkish_config (COPY = turkish);

-- Custom search function
CREATE OR REPLACE FUNCTION search_courses(
    search_query text,
    filters jsonb DEFAULT '{}'::jsonb,
    sort_by text DEFAULT 'relevance',
    limit_count integer DEFAULT 20,
    offset_count integer DEFAULT 0
)
RETURNS TABLE (
    course_id uuid,
    title text,
    description text,
    instructor_name text,
    category_name text,
    relevance_score float,
    enrollment_count integer,
    average_rating decimal
) AS $$
DECLARE
    base_query text;
    where_conditions text[] := ARRAY[]::text[];
    order_clause text;
BEGIN
    -- Build base search query
    base_query := '
        SELECT 
            c.id as course_id,
            c.title,
            c.description,
            up.full_name as instructor_name,
            cat.name as category_name,
            ts_rank(
                to_tsvector(''turkish_config'', 
                    coalesce(c.title, '''') || '' '' ||
                    coalesce(c.description, '''') || '' '' ||
                    coalesce(c.short_description, '''') || '' '' ||
                    coalesce(array_to_string(c.tags, '' ''), '''')
                ),
                plainto_tsquery(''turkish_config'', $1)
            ) as relevance_score,
            c.enrollment_count,
            c.average_rating
        FROM public.courses c
        JOIN public.user_profiles up ON c.instructor_id = up.id
        LEFT JOIN public.categories cat ON c.category_id = cat.id
        WHERE c.status = ''published'' 
        AND c.deleted_at IS NULL
        AND to_tsvector(''turkish_config'', 
            coalesce(c.title, '''') || '' '' ||
            coalesce(c.description, '''') || '' '' ||
            coalesce(c.short_description, '''') || '' '' ||
            coalesce(array_to_string(c.tags, '' ''), '''')
        ) @@ plainto_tsquery(''turkish_config'', $1)';
    
    -- Add filters
    IF filters ? 'category_id' THEN
        where_conditions := array_append(where_conditions, 
            format('c.category_id = %L', filters->>'category_id'));
    END IF;
    
    IF filters ? 'level' THEN
        where_conditions := array_append(where_conditions, 
            format('c.level = %L', filters->>'level'));
    END IF;
    
    IF filters ? 'min_rating' THEN
        where_conditions := array_append(where_conditions, 
            format('c.average_rating >= %s', filters->>'min_rating'));
    END IF;
    
    -- Add where conditions
    IF array_length(where_conditions, 1) > 0 THEN
        base_query := base_query || ' AND ' || array_to_string(where_conditions, ' AND ');
    END IF;
    
    -- Add ordering
    CASE sort_by
        WHEN 'relevance' THEN order_clause := 'ORDER BY relevance_score DESC, c.enrollment_count DESC';
        WHEN 'newest' THEN order_clause := 'ORDER BY c.created_at DESC';
        WHEN 'popular' THEN order_clause := 'ORDER BY c.enrollment_count DESC';
        WHEN 'rating' THEN order_clause := 'ORDER BY c.average_rating DESC, c.review_count DESC';
        ELSE order_clause := 'ORDER BY relevance_score DESC';
    END CASE;
    
    base_query := base_query || ' ' || order_clause || 
                  format(' LIMIT %s OFFSET %s', limit_count, offset_count);
    
    -- Execute query
    RETURN QUERY EXECUTE base_query USING search_query;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Implementation Roadmap

### Phase 1: Schema Optimization (2 weeks)
- [ ] Complete RLS policy implementation
- [ ] Advanced indexing strategy deployment
- [ ] Materialized views for analytics
- [ ] Query performance optimization

### Phase 2: Advanced Features (3 weeks)
- [ ] Full-text search implementation
- [ ] Data archiving and partitioning
- [ ] Real-time analytics setup
- [ ] Advanced caching strategies

### Phase 3: Scalability Enhancements (2 weeks)
- [ ] Database clustering setup
- [ ] Read replica configuration
- [ ] Connection pooling optimization
- [ ] Monitoring and alerting

### Phase 4: Data Quality & Governance (1 week)
- [ ] Data validation rules
- [ ] Audit logging enhancement
- [ ] Backup strategy implementation
- [ ] Disaster recovery testing

## 🔗 İlgili Dosyalar

- [Database Schema](../../docs/DB/SCHEMA.md) - Complete database schema reference
- [Environment Setup](../../docs/ENVIRONMENT.md) - Database configuration guide
- [Operations Runbook](../../docs/OPERATIONS/RUNBOOK.md) - Database maintenance procedures

## 📚 Kaynaklar

### 📖 PostgreSQL Documentation
- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Row Level Security Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### 🛠️ Supabase Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Design Patterns](https://supabase.com/docs/guides/database/tables)

### 📊 Performance & Optimization
- [PostgreSQL Indexing Strategies](https://use-the-index-luke.com/)
- [Query Optimization Guide](https://www.postgresql.org/docs/current/using-explain.html)
- [Database Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*