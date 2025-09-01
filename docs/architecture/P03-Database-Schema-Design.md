# P03 - Database Schema Design Analysis

## Executive Summary

This document provides an in-depth analysis of the 7P Education Platform's database schema design, examining the current PostgreSQL implementation through Supabase, identifying strengths and optimization opportunities, and providing comprehensive recommendations for scalability, performance, and data integrity improvements.

## Current Database Architecture Assessment

### Technology Stack Analysis

**Current Implementation:**
- **Database**: PostgreSQL 15 via Supabase
- **ORM/Query Builder**: Supabase Client with SQL functions
- **Authentication**: Supabase Auth (built-in PostgreSQL integration)
- **Real-time**: Supabase Realtime (PostgreSQL triggers + WebSockets)
- **Storage**: Supabase Storage (integrated with PostgreSQL metadata)
- **Backup**: Automated daily backups via Supabase

### Current Schema Overview

**Core Entity Structure:**
```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'student',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id),
  price DECIMAL(10,2),
  difficulty VARCHAR(20),
  status VARCHAR(20) DEFAULT 'draft',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Content
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  video_url TEXT,
  duration INTEGER, -- in seconds
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress DECIMAL(5,2) DEFAULT 0,
  UNIQUE(user_id, course_id)
);

-- Progress Tracking
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES course_lessons(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  watch_time INTEGER DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);
```

## Detailed Schema Analysis

### 1. User Management Schema

**Current Strengths:**
- UUID primary keys for better scalability and security
- Proper foreign key constraints
- Basic audit fields (created_at, updated_at)
- Integration with Supabase Auth

**Identified Issues:**

1. **Limited User Profile Data:**
```sql
-- Current: Basic user table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'student'
  -- Missing: phone, address, preferences, etc.
);
```

**Recommended Enhanced Structure:**

```sql
-- Enhanced user profile with proper normalization
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- User addresses (normalized)
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'billing', 'shipping', 'home'
  street_address VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2), -- ISO country code
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, type, is_default) WHERE is_default = TRUE
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, category, key)
);

-- User roles and permissions (RBAC)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(user_id, role_id)
);
```

### 2. Course Management Schema

**Current Implementation Analysis:**

The current course schema is basic but functional. However, it lacks advanced features needed for a comprehensive education platform.

**Enhanced Course Schema:**

```sql
-- Categories and taxonomy
CREATE TABLE course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES course_categories(id),
  icon_url TEXT,
  color VARCHAR(7), -- hex color
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags for flexible categorization
CREATE TABLE course_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  instructor_id UUID REFERENCES users(id) NOT NULL,
  category_id UUID REFERENCES course_categories(id),
  
  -- Pricing
  price DECIMAL(10,2) DEFAULT 0,
  original_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Course metadata
  difficulty VARCHAR(20) DEFAULT 'beginner',
  language VARCHAR(10) DEFAULT 'en',
  duration_hours DECIMAL(4,1), -- estimated completion time
  
  -- Status and visibility
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  is_featured BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT FALSE,
  
  -- Media
  thumbnail_url TEXT,
  preview_video_url TEXT,
  
  -- SEO
  meta_title VARCHAR(200),
  meta_description TEXT,
  
  -- Learning objectives
  learning_objectives JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  target_audience JSONB DEFAULT '[]',
  
  -- Stats (denormalized for performance)
  enrollment_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5)
);

-- Course-tag relationship
CREATE TABLE course_tag_mappings (
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES course_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, tag_id)
);

-- Course sections (modules/chapters)
CREATE TABLE course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, order_index)
);

-- Enhanced lessons with better structure
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES course_sections(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  content TEXT,
  content_type VARCHAR(20) DEFAULT 'video', -- video, text, quiz, assignment
  
  -- Media content
  video_url TEXT,
  video_duration INTEGER, -- in seconds
  video_quality JSONB, -- different quality options
  
  -- Text content
  reading_time INTEGER, -- estimated reading time in minutes
  
  -- Settings
  order_index INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  is_downloadable BOOLEAN DEFAULT FALSE,
  
  -- Resources
  attachments JSONB DEFAULT '[]',
  external_links JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, slug),
  UNIQUE(section_id, order_index)
);

-- Course resources and materials
CREATE TABLE course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  download_count INTEGER DEFAULT 0,
  is_downloadable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Assessment and Progress Tracking Schema

**Enhanced Assessment System:**

```sql
-- Quizzes and assessments
CREATE TABLE course_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Quiz settings
  time_limit INTEGER, -- in minutes
  attempts_allowed INTEGER DEFAULT 1,
  passing_score DECIMAL(5,2) DEFAULT 70.00,
  randomize_questions BOOLEAN DEFAULT FALSE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES course_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL, -- multiple_choice, true_false, short_answer, essay
  explanation TEXT,
  points DECIMAL(5,2) DEFAULT 1.00,
  order_index INTEGER NOT NULL,
  
  -- Question data
  options JSONB, -- for multiple choice questions
  correct_answer JSONB, -- stores correct answers
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(quiz_id, order_index)
);

-- Quiz attempts and results
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES course_quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Attempt details
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_taken INTEGER, -- in seconds
  
  -- Results
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  percentage DECIMAL(5,2),
  passed BOOLEAN DEFAULT FALSE,
  
  -- Responses
  responses JSONB DEFAULT '{}',
  
  UNIQUE(quiz_id, user_id, attempt_number)
);

-- Enhanced progress tracking
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  
  -- Progress details
  status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Time tracking
  total_time_spent INTEGER DEFAULT 0, -- in seconds
  last_position INTEGER DEFAULT 0, -- for video content
  
  -- Completion tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Engagement metrics
  interaction_count INTEGER DEFAULT 0,
  notes_count INTEGER DEFAULT 0,
  bookmarks_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, lesson_id)
);

-- Course completion tracking
CREATE TABLE course_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Completion details
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completion_percentage DECIMAL(5,2) DEFAULT 100,
  total_time_spent INTEGER DEFAULT 0,
  
  -- Assessment results
  final_score DECIMAL(5,2),
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  
  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  would_recommend BOOLEAN,
  
  UNIQUE(user_id, course_id)
);
```

### 4. Payment and Subscription Schema

**Comprehensive Payment System:**

```sql
-- Subscription plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_interval VARCHAR(20) NOT NULL, -- monthly, yearly
  trial_days INTEGER DEFAULT 0,
  
  -- Features
  features JSONB DEFAULT '[]',
  course_limit INTEGER, -- NULL for unlimited
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Stripe integration
  stripe_price_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  
  -- Status
  status VARCHAR(20) NOT NULL, -- active, canceled, past_due, unpaid
  
  -- Billing
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Stripe integration
  stripe_subscription_id VARCHAR(100) UNIQUE,
  stripe_customer_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual course purchases
CREATE TABLE course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Purchase details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  purchase_type VARCHAR(20) DEFAULT 'one_time', -- one_time, subscription
  
  -- Payment processing
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  
  -- Stripe integration
  stripe_payment_intent_id VARCHAR(100),
  stripe_invoice_id VARCHAR(100),
  
  -- Timestamps
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- for time-limited access
  
  UNIQUE(user_id, course_id)
);

-- Payment transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  course_purchase_id UUID REFERENCES course_purchases(id),
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  transaction_type VARCHAR(20) NOT NULL, -- payment, refund, chargeback
  status VARCHAR(20) NOT NULL, -- pending, completed, failed
  
  -- Payment method
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50) DEFAULT 'stripe',
  
  -- External references
  external_transaction_id VARCHAR(100),
  external_invoice_id VARCHAR(100),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_amount CHECK (amount > 0)
);
```

### 5. Content and Media Management Schema

**Advanced Content Management:**

```sql
-- File storage and management
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- File details
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_hash VARCHAR(64), -- for deduplication
  
  -- Media metadata
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for video/audio in seconds
  
  -- Processing status
  processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  processed_variants JSONB DEFAULT '{}', -- different sizes/qualities
  
  -- CDN and caching
  cdn_url TEXT,
  cache_expires_at TIMESTAMPTZ,
  
  -- Access control
  visibility VARCHAR(20) DEFAULT 'private', -- public, private, course_only
  download_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Content versioning
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL, -- references various content tables
  content_type VARCHAR(50) NOT NULL, -- course, lesson, quiz, etc.
  version_number INTEGER NOT NULL,
  
  -- Version data
  content_data JSONB NOT NULL,
  change_summary TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_id, content_type, version_number)
);

-- User-generated content
CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  
  -- Note content
  content TEXT NOT NULL,
  timestamp_in_video INTEGER, -- for video notes
  is_private BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  
  -- Bookmark details
  title VARCHAR(200),
  timestamp_in_video INTEGER,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Performance Optimization Strategies

### 1. Indexing Strategy

**Critical Indexes for Performance:**

```sql
-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Course discovery indexes
CREATE INDEX idx_courses_status_published ON courses(status, published_at) 
  WHERE status = 'published';
CREATE INDEX idx_courses_category_difficulty ON courses(category_id, difficulty);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_featured ON courses(is_featured) WHERE is_featured = true;
CREATE INDEX idx_courses_price ON courses(price);

-- Full-text search indexes
CREATE INDEX idx_courses_search ON courses 
  USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_lessons_search ON course_lessons 
  USING gin(to_tsvector('english', title || ' ' || content));

-- Enrollment and progress indexes
CREATE INDEX idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX idx_enrollments_course_status ON enrollments(course_id, status);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_user_status ON lesson_progress(user_id, status);

-- Payment and subscription indexes
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_transactions_user_created ON payment_transactions(user_id, created_at);
CREATE INDEX idx_course_purchases_user_course ON course_purchases(user_id, course_id);

-- Composite indexes for common queries
CREATE INDEX idx_courses_category_price_rating ON courses(category_id, price, average_rating);
CREATE INDEX idx_lessons_course_section_order ON course_lessons(course_id, section_id, order_index);
```

### 2. Partitioning Strategy

**Time-based Partitioning for Large Tables:**

```sql
-- Partition lesson_progress by month for performance
CREATE TABLE lesson_progress (
  -- columns as defined above
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE lesson_progress_2024_01 PARTITION OF lesson_progress
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE lesson_progress_2024_02 PARTITION OF lesson_progress
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Continue for each month...

-- Automatic partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  end_date DATE;
BEGIN
  partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
  end_date := start_date + INTERVAL '1 month';
  
  EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

### 3. Materialized Views for Analytics

**Performance-Optimized Views:**

```sql
-- Course statistics materialized view
CREATE MATERIALIZED VIEW course_statistics AS
SELECT 
  c.id,
  c.title,
  c.instructor_id,
  c.category_id,
  COUNT(DISTINCT e.user_id) as enrollment_count,
  AVG(cc.rating)::DECIMAL(3,2) as average_rating,
  COUNT(DISTINCT cc.id) as review_count,
  AVG(lp.progress_percentage)::DECIMAL(5,2) as avg_completion_rate,
  SUM(cp.amount) as total_revenue,
  COUNT(DISTINCT cp.id) as purchase_count
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN course_completions cc ON c.id = cc.course_id
LEFT JOIN lesson_progress lp ON lp.lesson_id IN (
  SELECT id FROM course_lessons WHERE course_id = c.id
)
LEFT JOIN course_purchases cp ON c.id = cp.course_id AND cp.status = 'completed'
WHERE c.status = 'published'
GROUP BY c.id, c.title, c.instructor_id, c.category_id;

-- Create unique index for fast refreshes
CREATE UNIQUE INDEX idx_course_statistics_id ON course_statistics(id);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_course_statistics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY course_statistics;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh
SELECT cron.schedule('refresh-course-stats', '0 */4 * * *', 'SELECT refresh_course_statistics();');
```

### 4. Database Functions for Complex Queries

**Optimized Functions for Common Operations:**

```sql
-- Get user dashboard data efficiently
CREATE OR REPLACE FUNCTION get_user_dashboard(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user', (
      SELECT row_to_json(u.*)
      FROM users u 
      WHERE u.id = p_user_id
    ),
    'active_enrollments', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'course', row_to_json(c.*),
          'progress', e.progress,
          'last_accessed', e.last_accessed_at
        )
      ), '[]'::json)
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = p_user_id 
        AND e.status = 'active'
        AND c.status = 'published'
      ORDER BY e.last_accessed_at DESC
      LIMIT 5
    ),
    'completed_courses', (
      SELECT COUNT(*)
      FROM course_completions cc
      WHERE cc.user_id = p_user_id
    ),
    'total_study_time', (
      SELECT COALESCE(SUM(lp.total_time_spent), 0)
      FROM lesson_progress lp
      WHERE lp.user_id = p_user_id
    ),
    'achievements', (
      SELECT COALESCE(json_agg(row_to_json(ua.*)), '[]'::json)
      FROM user_achievements ua
      WHERE ua.user_id = p_user_id
      ORDER BY ua.earned_at DESC
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Course recommendation function
CREATE OR REPLACE FUNCTION get_course_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(course_id UUID, relevance_score DECIMAL) AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    SELECT 
      c.category_id,
      c.difficulty,
      COUNT(*) as interaction_count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = p_user_id
    GROUP BY c.category_id, c.difficulty
  ),
  course_scores AS (
    SELECT 
      c.id,
      (
        -- Category preference score
        COALESCE(up.interaction_count * 0.4, 0) +
        -- Rating score
        (c.average_rating / 5.0) * 0.3 +
        -- Popularity score
        (LOG(c.enrollment_count + 1) / 10.0) * 0.2 +
        -- Recency score
        (EXTRACT(EPOCH FROM NOW() - c.created_at) / (30 * 24 * 60 * 60)) * 0.1
      )::DECIMAL as score
    FROM courses c
    LEFT JOIN user_preferences up ON c.category_id = up.category_id
    WHERE c.status = 'published'
      AND c.id NOT IN (
        SELECT course_id FROM enrollments WHERE user_id = p_user_id
      )
  )
  SELECT cs.id, cs.score
  FROM course_scores cs
  ORDER BY cs.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

## Data Integrity and Constraints

### 1. Advanced Constraints

**Business Logic Constraints:**

```sql
-- Ensure course prices are consistent
ALTER TABLE courses ADD CONSTRAINT course_price_consistency 
  CHECK (
    (is_free = TRUE AND price = 0) OR 
    (is_free = FALSE AND price > 0)
  );

-- Ensure subscription periods are valid
ALTER TABLE subscriptions ADD CONSTRAINT valid_subscription_period 
  CHECK (current_period_end > current_period_start);

-- Ensure quiz scores are within valid range
ALTER TABLE quiz_attempts ADD CONSTRAINT valid_quiz_score 
  CHECK (score >= 0 AND score <= max_score);

-- Ensure lesson order is positive and unique within course
ALTER TABLE course_lessons ADD CONSTRAINT unique_lesson_order 
  UNIQUE (course_id, order_index);

-- Ensure user cannot enroll in same course twice
ALTER TABLE enrollments ADD CONSTRAINT unique_user_course_enrollment 
  UNIQUE (user_id, course_id);
```

### 2. Triggers for Data Consistency

**Automated Data Maintenance:**

```sql
-- Update course statistics on enrollment changes
CREATE OR REPLACE FUNCTION update_course_stats() 
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE courses 
    SET enrollment_count = (
      SELECT COUNT(*) FROM enrollments WHERE course_id = NEW.course_id
    )
    WHERE id = NEW.course_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses 
    SET enrollment_count = (
      SELECT COUNT(*) FROM enrollments WHERE course_id = OLD.course_id
    )
    WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_stats
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_course_stats();

-- Update user last_accessed timestamp
CREATE OR REPLACE FUNCTION update_user_last_access() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE enrollments 
  SET last_accessed_at = NOW()
  WHERE user_id = NEW.user_id 
    AND course_id = (
      SELECT course_id FROM course_lessons WHERE id = NEW.lesson_id
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_access
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_user_last_access();

-- Calculate course completion percentage
CREATE OR REPLACE FUNCTION calculate_course_progress() 
RETURNS TRIGGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  progress_percentage DECIMAL(5,2);
  course_id_var UUID;
BEGIN
  -- Get course_id from lesson
  SELECT course_id INTO course_id_var 
  FROM course_lessons 
  WHERE id = NEW.lesson_id;
  
  -- Count total lessons
  SELECT COUNT(*) INTO total_lessons
  FROM course_lessons
  WHERE course_id = course_id_var;
  
  -- Count completed lessons for this user
  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress lp
  JOIN course_lessons cl ON lp.lesson_id = cl.id
  WHERE cl.course_id = course_id_var
    AND lp.user_id = NEW.user_id
    AND lp.status = 'completed';
  
  -- Calculate percentage
  progress_percentage := (completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100;
  
  -- Update enrollment progress
  UPDATE enrollments
  SET progress = progress_percentage,
      updated_at = NOW()
  WHERE user_id = NEW.user_id 
    AND course_id = course_id_var;
  
  -- Check if course is completed
  IF progress_percentage = 100 THEN
    INSERT INTO course_completions (user_id, course_id, completed_at)
    VALUES (NEW.user_id, course_id_var, NOW())
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_progress
  AFTER UPDATE ON lesson_progress
  FOR EACH ROW 
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION calculate_course_progress();
```

## Security and Access Control

### 1. Row Level Security (RLS)

**Implementing RLS for Data Protection:**

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_own_data ON users
  FOR ALL
  USING (auth.uid() = id);

-- Users can only see their own enrollments
CREATE POLICY user_own_enrollments ON enrollments
  FOR ALL
  USING (auth.uid() = user_id);

-- Instructors can see enrollments for their courses
CREATE POLICY instructor_course_enrollments ON enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id 
        AND instructor_id = auth.uid()
    )
  );

-- Users can only access their own progress
CREATE POLICY user_own_progress ON lesson_progress
  FOR ALL
  USING (auth.uid() = user_id);

-- Course visibility based on publication status and enrollment
CREATE POLICY course_visibility ON courses
  FOR SELECT
  USING (
    status = 'published' OR 
    instructor_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );
```

### 2. Data Encryption

**Sensitive Data Protection:**

```sql
-- Encrypt sensitive user data
ALTER TABLE users ADD COLUMN encrypted_ssn TEXT;
ALTER TABLE user_addresses ADD COLUMN encrypted_details TEXT;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data::bytea, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Backup and Recovery Strategy

### 1. Backup Configuration

**Comprehensive Backup Strategy:**

```sql
-- Point-in-time recovery setup
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/archive/%f';
ALTER SYSTEM SET max_wal_senders = 3;

-- Backup verification function
CREATE OR REPLACE FUNCTION verify_backup_integrity()
RETURNS BOOLEAN AS $$
DECLARE
  table_count INTEGER;
  expected_tables INTEGER := 25; -- Adjust based on actual table count
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public';
  
  RETURN table_count >= expected_tables;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring and Maintenance

### 1. Database Health Monitoring

**Health Check Functions:**

```sql
-- Database health check function
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'timestamp', NOW(),
    'database_size', pg_database_size(current_database()),
    'active_connections', (
      SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
    ),
    'slow_queries', (
      SELECT count(*) FROM pg_stat_activity 
      WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds'
    ),
    'table_sizes', (
      SELECT json_object_agg(tablename, pg_total_relation_size(schemaname||'.'||tablename))
      FROM pg_tables WHERE schemaname = 'public'
    ),
    'index_usage', (
      SELECT json_object_agg(
        indexrelname, 
        round(100.0 * idx_scan / (seq_scan + idx_scan), 2)
      )
      FROM pg_stat_user_indexes
      WHERE seq_scan + idx_scan > 0
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Performance analysis function
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  avg_time DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time,
    pg_stat_statements.mean_exec_time
  FROM pg_stat_statements
  ORDER BY pg_stat_statements.total_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

## Migration Strategy

### 1. Database Migration Framework

**Version-Controlled Migrations:**

```sql
-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

-- Migration template
/*
-- Migration: 20241201_add_user_preferences
-- Description: Add user preferences table for customization

BEGIN;

-- Add your migration SQL here
CREATE TABLE user_preferences (
  -- table definition
);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20241201_add_user_preferences', 'Add user preferences table for customization');

COMMIT;
*/
```

## Recommendations and Action Plan

### Immediate Priorities (1-2 weeks)

1. **Implement Enhanced Indexing**
   - Add critical indexes for performance
   - Analyze query patterns and optimize
   - Set up index monitoring

2. **Add Data Validation Constraints**
   - Implement business logic constraints
   - Add referential integrity checks
   - Set up constraint violation monitoring

3. **Enable Row Level Security**
   - Implement RLS policies for sensitive tables
   - Test access control scenarios
   - Document security model

### Medium-term Goals (2-4 weeks)

1. **Implement Materialized Views**
   - Create performance-optimized views for analytics
   - Set up automatic refresh schedules
   - Monitor view performance

2. **Enhanced Schema Design**
   - Migrate to normalized schema design
   - Implement proper categorization and tagging
   - Add advanced progress tracking

3. **Backup and Recovery Testing**
   - Test point-in-time recovery procedures
   - Validate backup integrity
   - Document recovery processes

### Long-term Objectives (1-3 months)

1. **Performance Optimization**
   - Implement table partitioning for large datasets
   - Optimize complex queries with functions
   - Set up comprehensive monitoring

2. **Advanced Features**
   - Implement full-text search capabilities
   - Add real-time notifications with triggers
   - Create advanced analytics functions

3. **Scalability Planning**
   - Design read replica strategy
   - Plan for horizontal scaling
   - Implement caching layers

## Conclusion

The current database schema provides a solid foundation but requires significant enhancements for scalability, performance, and maintainability. The recommended improvements focus on normalization, performance optimization, security enhancement, and operational excellence.

Key success metrics for these improvements include:
- Query response time reduction (target: <100ms for 95th percentile)
- Improved data integrity (zero constraint violations)
- Enhanced security posture (full RLS implementation)
- Better operational visibility (comprehensive monitoring)
- Increased system reliability (99.9% uptime target)

The phased implementation approach ensures minimal disruption while delivering immediate value and building toward long-term database excellence.