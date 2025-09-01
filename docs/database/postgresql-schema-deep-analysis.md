# PostgreSQL Schema Deep Analysis for 7P Education Platform

## Executive Summary

This document provides a comprehensive analysis of the PostgreSQL database schema design for the 7P Education Platform, covering advanced database architecture, normalization strategies, performance optimization, and scalability considerations. The schema is designed to handle complex educational workflows, multi-tenant operations, and high-performance requirements while maintaining data integrity and security.

## Table of Contents

1. [Database Architecture Overview](#database-architecture-overview)
2. [Core Entity Design](#core-entity-design)
3. [Advanced Schema Patterns](#advanced-schema-patterns)
4. [Performance Optimization](#performance-optimization)
5. [Data Integrity and Constraints](#data-integrity-and-constraints)
6. [Security Implementation](#security-implementation)
7. [Scalability Strategies](#scalability-strategies)
8. [Migration and Evolution](#migration-and-evolution)
9. [Monitoring and Analytics](#monitoring-and-analytics)
10. [Best Practices](#best-practices)

## Database Architecture Overview

### Multi-Schema Design Pattern

The 7P Education Platform utilizes a sophisticated multi-schema PostgreSQL architecture to separate concerns and optimize performance:

```sql
-- Core application schemas
CREATE SCHEMA IF NOT EXISTS core;           -- Core business entities
CREATE SCHEMA IF NOT EXISTS auth;           -- Authentication and authorization
CREATE SCHEMA IF NOT EXISTS content;        -- Educational content management
CREATE SCHEMA IF NOT EXISTS analytics;      -- Performance and usage analytics
CREATE SCHEMA IF NOT EXISTS messaging;      -- Communication system
CREATE SCHEMA IF NOT EXISTS billing;        -- Payment and subscription management
CREATE SCHEMA IF NOT EXISTS audit;          -- Audit trails and logging

-- Utility schemas
CREATE SCHEMA IF NOT EXISTS config;         -- System configuration
CREATE SCHEMA IF NOT EXISTS cache;          -- Database-level caching
CREATE SCHEMA IF NOT EXISTS temp;           -- Temporary operations

-- Set default search path for application
ALTER DATABASE education_platform 
SET search_path TO core, auth, content, analytics, public;
```

### Connection Pool Architecture

```sql
-- Connection pooling configuration
CREATE EXTENSION IF NOT EXISTS pg_bouncer_fdw;

-- Database connection settings optimized for educational workloads
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

## Core Entity Design

### User Management System

The user management system supports multiple user types with role-based access control:

```sql
-- Core users table with advanced features
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    
    -- Account status and verification
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Security features
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    
    -- Preferences and settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    notification_preferences JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Advanced indexing strategy
CREATE INDEX CONCURRENTLY idx_users_email_active 
ON auth.users(email) WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_users_username_active 
ON auth.users(username) WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_users_phone_verified 
ON auth.users(phone_number) WHERE phone_verified_at IS NOT NULL;

-- Partial index for locked accounts
CREATE INDEX CONCURRENTLY idx_users_locked 
ON auth.users(locked_until) WHERE locked_until IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX CONCURRENTLY idx_users_metadata_gin 
ON auth.users USING GIN(metadata);

-- Trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Role-Based Access Control

```sql
-- Hierarchical role system
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level
    parent_role_id UUID REFERENCES auth.roles(id),
    permissions JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User role assignments with time-based constraints
CREATE TABLE auth.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    context JSONB DEFAULT '{}', -- Organization, course, etc.
    UNIQUE(user_id, role_id, context)
);

-- Permission-based access control
CREATE TABLE auth.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL, -- courses, users, analytics, etc.
    action VARCHAR(50) NOT NULL,   -- create, read, update, delete, manage
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions mapping
CREATE TABLE auth.role_permissions (
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (role_id, permission_id)
);
```

### Educational Content Management

```sql
-- Hierarchical course structure
CREATE TABLE content.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Content organization
    category_id UUID REFERENCES content.categories(id),
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    language VARCHAR(10) DEFAULT 'en',
    
    -- Pricing and access
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    is_free BOOLEAN DEFAULT false,
    access_type VARCHAR(20) DEFAULT 'paid' CHECK (access_type IN ('free', 'paid', 'subscription')),
    
    -- Content delivery
    estimated_duration INTEGER, -- in minutes
    prerequisites TEXT[],
    learning_objectives TEXT[],
    tags TEXT[],
    
    -- Media and resources
    thumbnail_url TEXT,
    preview_video_url TEXT,
    resources JSONB DEFAULT '{}',
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
    
    -- SEO and marketing
    seo_title VARCHAR(200),
    seo_description VARCHAR(500),
    meta_keywords TEXT[],
    
    -- Instructor and creation info
    instructor_id UUID NOT NULL REFERENCES auth.users(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Timestamps
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Course modules and lessons hierarchy
CREATE TABLE content.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES content.courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    estimated_duration INTEGER,
    is_locked BOOLEAN DEFAULT false,
    unlock_conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

CREATE TABLE content.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES content.modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    lesson_type VARCHAR(20) DEFAULT 'video' CHECK (lesson_type IN ('video', 'text', 'quiz', 'assignment', 'interactive')),
    order_index INTEGER NOT NULL,
    estimated_duration INTEGER,
    
    -- Media content
    video_url TEXT,
    video_duration INTEGER,
    attachments JSONB DEFAULT '{}',
    
    -- Interactive elements
    quiz_data JSONB DEFAULT '{}',
    assignment_data JSONB DEFAULT '{}',
    interactive_elements JSONB DEFAULT '{}',
    
    -- Access control
    is_preview BOOLEAN DEFAULT false,
    unlock_conditions JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module_id, order_index)
);
```

### Student Progress Tracking

```sql
-- Comprehensive progress tracking system
CREATE TABLE analytics.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES content.courses(id) ON DELETE CASCADE,
    enrollment_type VARCHAR(20) DEFAULT 'paid' CHECK (enrollment_type IN ('free', 'paid', 'trial', 'gift')),
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    
    -- Time tracking
    total_study_time INTEGER DEFAULT 0, -- in minutes
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Completion tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_issued_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    average_quiz_score DECIMAL(5,2),
    assignments_completed INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Detailed lesson progress
CREATE TABLE analytics.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES analytics.course_enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES content.lessons(id) ON DELETE CASCADE,
    
    -- Progress details
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in seconds
    attempts INTEGER DEFAULT 0,
    
    -- Completion tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_position INTEGER DEFAULT 0, -- For video/text content
    
    -- Performance data
    quiz_scores JSONB DEFAULT '[]',
    assignment_submissions JSONB DEFAULT '[]',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, lesson_id)
);
```

## Advanced Schema Patterns

### Event Sourcing Implementation

```sql
-- Event sourcing for audit trail and state reconstruction
CREATE TABLE audit.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    
    -- Event data
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Causation and correlation
    causation_id UUID, -- The command that caused this event
    correlation_id UUID, -- Groups related events
    
    -- Audit information
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexing for event sourcing queries
CREATE INDEX CONCURRENTLY idx_events_aggregate 
ON audit.events(aggregate_id, aggregate_type, event_version);

CREATE INDEX CONCURRENTLY idx_events_type_occurred 
ON audit.events(event_type, occurred_at DESC);

CREATE INDEX CONCURRENTLY idx_events_correlation 
ON audit.events(correlation_id) WHERE correlation_id IS NOT NULL;

-- Event sourcing projection views
CREATE MATERIALIZED VIEW analytics.user_activity_summary AS
SELECT 
    user_id,
    DATE(occurred_at) as activity_date,
    event_type,
    COUNT(*) as event_count,
    MIN(occurred_at) as first_event,
    MAX(occurred_at) as last_event
FROM audit.events
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE(occurred_at), event_type;

-- Refresh strategy for materialized views
CREATE INDEX ON analytics.user_activity_summary(user_id, activity_date);
```

### Temporal Data Management

```sql
-- Temporal tables for historical data tracking
CREATE TABLE content.course_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES content.courses(id),
    version_number INTEGER NOT NULL,
    
    -- Snapshot of course data
    course_data JSONB NOT NULL,
    
    -- Version metadata
    change_summary TEXT,
    changed_by UUID REFERENCES auth.users(id),
    change_reason VARCHAR(100),
    
    -- Temporal bounds
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, version_number)
);

-- Trigger to automatically create versions
CREATE OR REPLACE FUNCTION create_course_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Close previous version
    UPDATE content.course_versions 
    SET valid_to = NOW()
    WHERE course_id = NEW.id AND valid_to IS NULL;
    
    -- Create new version
    INSERT INTO content.course_versions (
        course_id, 
        version_number, 
        course_data,
        changed_by
    )
    VALUES (
        NEW.id,
        COALESCE((SELECT MAX(version_number) + 1 FROM content.course_versions WHERE course_id = NEW.id), 1),
        to_jsonb(NEW),
        NEW.updated_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_course_versioning
    AFTER INSERT OR UPDATE ON content.courses
    FOR EACH ROW
    EXECUTE FUNCTION create_course_version();
```

### Advanced JSONB Patterns

```sql
-- Complex JSONB operations for flexible content storage
CREATE TABLE content.interactive_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES content.lessons(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    
    -- Flexible content structure
    configuration JSONB NOT NULL DEFAULT '{}',
    
    -- JSON Schema validation
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JSONB validation function
CREATE OR REPLACE FUNCTION validate_interactive_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required fields based on content type
    CASE NEW.content_type
        WHEN 'quiz' THEN
            IF NOT (NEW.configuration ? 'questions' AND 
                   jsonb_typeof(NEW.configuration->'questions') = 'array') THEN
                RAISE EXCEPTION 'Quiz content must have questions array';
            END IF;
        WHEN 'video_interactive' THEN
            IF NOT (NEW.configuration ? 'video_url' AND 
                   NEW.configuration ? 'interactions') THEN
                RAISE EXCEPTION 'Interactive video must have video_url and interactions';
            END IF;
        WHEN 'simulation' THEN
            IF NOT (NEW.configuration ? 'simulation_config' AND 
                   NEW.configuration ? 'parameters') THEN
                RAISE EXCEPTION 'Simulation must have config and parameters';
            END IF;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_interactive_content
    BEFORE INSERT OR UPDATE ON content.interactive_content
    FOR EACH ROW
    EXECUTE FUNCTION validate_interactive_content();

-- Advanced JSONB indexing
CREATE INDEX CONCURRENTLY idx_interactive_content_type 
ON content.interactive_content(content_type);

CREATE INDEX CONCURRENTLY idx_interactive_content_config_gin 
ON content.interactive_content USING GIN(configuration);

-- Specific GIN indexes for common queries
CREATE INDEX CONCURRENTLY idx_quiz_question_count 
ON content.interactive_content USING GIN((configuration->'questions')) 
WHERE content_type = 'quiz';
```

## Performance Optimization

### Partitioning Strategy

```sql
-- Time-based partitioning for analytics data
CREATE TABLE analytics.user_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    activity_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    resource_type VARCHAR(50),
    
    -- Activity details
    activity_data JSONB DEFAULT '{}',
    duration INTEGER, -- in seconds
    
    -- Context
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions for better performance
CREATE TABLE analytics.user_activities_2024_01 
PARTITION OF analytics.user_activities
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE analytics.user_activities_2024_02 
PARTITION OF analytics.user_activities
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- Create indexes on new partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(user_id, created_at)',
                   'idx_' || partition_name || '_user_time', partition_name);
END;
$$ LANGUAGE plpgsql;
```

### Query Optimization Strategies

```sql
-- Optimized queries with proper indexing
-- Example: Find top performing courses
CREATE INDEX CONCURRENTLY idx_course_performance 
ON analytics.course_enrollments(course_id, status, progress_percentage)
WHERE status IN ('active', 'completed');

-- Covering index for enrollment reports
CREATE INDEX CONCURRENTLY idx_enrollment_report_covering 
ON analytics.course_enrollments(course_id, status, created_at, user_id, progress_percentage)
WHERE deleted_at IS NULL;

-- Partial index for active users
CREATE INDEX CONCURRENTLY idx_active_users_partial 
ON auth.users(last_login_at DESC) 
WHERE is_active = true AND deleted_at IS NULL;

-- Function-based index for search
CREATE INDEX CONCURRENTLY idx_courses_search 
ON content.courses USING GIN(to_tsvector('english', title || ' ' || description))
WHERE status = 'published' AND deleted_at IS NULL;

-- Example optimized query
CREATE OR REPLACE VIEW analytics.course_performance_summary AS
SELECT 
    c.id,
    c.title,
    c.instructor_id,
    COUNT(ce.id) as total_enrollments,
    COUNT(ce.id) FILTER (WHERE ce.status = 'completed') as completed_enrollments,
    ROUND(AVG(ce.progress_percentage), 2) as avg_progress,
    ROUND(AVG(ce.average_quiz_score), 2) as avg_quiz_score,
    SUM(ce.total_study_time) as total_study_minutes
FROM content.courses c
LEFT JOIN analytics.course_enrollments ce ON c.id = ce.course_id
WHERE c.status = 'published' AND c.deleted_at IS NULL
GROUP BY c.id, c.title, c.instructor_id;
```

### Caching Implementation

```sql
-- Database-level caching schema
CREATE TABLE cache.query_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache cleanup function
CREATE OR REPLACE FUNCTION cache.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cache.query_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Scheduled cache cleanup
SELECT cron.schedule('cache-cleanup', '0 * * * *', 'SELECT cache.cleanup_expired_cache();');
```

## Data Integrity and Constraints

### Advanced Constraint Implementation

```sql
-- Complex business logic constraints
ALTER TABLE analytics.course_enrollments 
ADD CONSTRAINT chk_progress_completed_consistency 
CHECK (
    (status = 'completed' AND progress_percentage = 100 AND completed_at IS NOT NULL)
    OR 
    (status != 'completed' AND (progress_percentage < 100 OR completed_at IS NULL))
);

-- Enrollment capacity constraints
ALTER TABLE content.courses 
ADD COLUMN max_enrollments INTEGER DEFAULT NULL;

CREATE OR REPLACE FUNCTION check_enrollment_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM content.courses c
        WHERE c.id = NEW.course_id 
        AND c.max_enrollments IS NOT NULL
        AND (
            SELECT COUNT(*) 
            FROM analytics.course_enrollments ce 
            WHERE ce.course_id = NEW.course_id 
            AND ce.status = 'active'
        ) >= c.max_enrollments
    ) THEN
        RAISE EXCEPTION 'Course enrollment capacity exceeded';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_enrollment_capacity
    BEFORE INSERT ON analytics.course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION check_enrollment_capacity();

-- Referential integrity with soft deletes
CREATE OR REPLACE FUNCTION prevent_hard_delete_with_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for active references before allowing hard delete
    IF TG_TABLE_NAME = 'courses' THEN
        IF EXISTS (SELECT 1 FROM analytics.course_enrollments WHERE course_id = OLD.id AND status = 'active') THEN
            RAISE EXCEPTION 'Cannot delete course with active enrollments';
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

### Data Validation Functions

```sql
-- Email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phone number validation
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic international phone number validation
    RETURN phone ~* '^\+?[1-9]\d{1,14}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply validation constraints
ALTER TABLE auth.users 
ADD CONSTRAINT chk_valid_email 
CHECK (is_valid_email(email));

ALTER TABLE auth.users 
ADD CONSTRAINT chk_valid_phone 
CHECK (phone_number IS NULL OR is_valid_phone(phone_number));
```

## Security Implementation

### Row-Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.courses ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
CREATE POLICY user_own_data ON auth.users
    FOR ALL
    TO application_user
    USING (id = current_setting('app.current_user_id')::UUID);

-- Instructors can access their courses
CREATE POLICY instructor_courses ON content.courses
    FOR ALL
    TO application_user
    USING (
        instructor_id = current_setting('app.current_user_id')::UUID
        OR
        created_by = current_setting('app.current_user_id')::UUID
    );

-- Students can access enrolled courses
CREATE POLICY student_enrolled_courses ON content.courses
    FOR SELECT
    TO application_user
    USING (
        status = 'published'
        AND
        (
            is_free = true
            OR
            EXISTS (
                SELECT 1 FROM analytics.course_enrollments ce
                WHERE ce.course_id = id
                AND ce.user_id = current_setting('app.current_user_id')::UUID
                AND ce.status = 'active'
            )
        )
    );

-- Enrollment access policy
CREATE POLICY user_enrollments ON analytics.course_enrollments
    FOR ALL
    TO application_user
    USING (user_id = current_setting('app.current_user_id')::UUID);
```

### Data Encryption

```sql
-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted sensitive data storage
CREATE TABLE auth.user_sensitive_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_ssn TEXT, -- PGP encrypted
    encrypted_payment_info TEXT, -- PGP encrypted
    encryption_key_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encryption/decryption functions
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key_id INTEGER)
RETURNS TEXT AS $$
BEGIN
    -- In production, retrieve key from secure key management system
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key_' || key_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key_id INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key_' || key_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Audit Logging

```sql
-- Comprehensive audit logging
CREATE TABLE audit.table_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Audit metadata
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    transaction_id BIGINT DEFAULT txid_current(),
    ip_address INET,
    user_agent TEXT,
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
BEGIN
    -- Handle different operations
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        
        -- Calculate changed fields
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM jsonb_each(old_data)
        WHERE old_data->key IS DISTINCT FROM new_data->key;
        
    ELSIF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
    END IF;
    
    -- Insert audit record
    INSERT INTO audit.table_audit_log (
        table_name,
        operation,
        old_values,
        new_values,
        changed_fields,
        user_id,
        session_id,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
        NULLIF(current_setting('app.session_id', TRUE), '')::UUID,
        NULLIF(current_setting('app.client_ip', TRUE), '')::INET
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_enrollments_changes
    AFTER INSERT OR UPDATE OR DELETE ON analytics.course_enrollments
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
```

## Scalability Strategies

### Read Replicas and Load Balancing

```sql
-- Connection routing configuration
-- Primary database configuration
ALTER SYSTEM SET synchronous_standby_names = 'replica1,replica2';
ALTER SYSTEM SET synchronous_commit = 'remote_apply';

-- Read replica optimizations
ALTER SYSTEM SET hot_standby = 'on';
ALTER SYSTEM SET max_standby_streaming_delay = '30s';
ALTER SYSTEM SET hot_standby_feedback = 'on';

-- Query routing hints
CREATE OR REPLACE FUNCTION route_to_replica()
RETURNS void AS $$
BEGIN
    -- Application-level hint for read replica routing
    PERFORM set_config('application_name', 'read_replica_preferred', false);
END;
$$ LANGUAGE plpgsql;
```

### Horizontal Partitioning

```sql
-- User-based sharding preparation
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Shard routing function
CREATE OR REPLACE FUNCTION get_user_shard(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    -- Simple hash-based sharding
    RETURN (hashtext(user_id::TEXT) % 4) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sharded user data table
CREATE TABLE auth.users_shard_1 () INHERITS (auth.users);
CREATE TABLE auth.users_shard_2 () INHERITS (auth.users);
CREATE TABLE auth.users_shard_3 () INHERITS (auth.users);
CREATE TABLE auth.users_shard_4 () INHERITS (auth.users);

-- Constraint exclusion for sharding
ALTER TABLE auth.users_shard_1 
ADD CONSTRAINT shard_1_check 
CHECK (get_user_shard(id) = 1);

ALTER TABLE auth.users_shard_2 
ADD CONSTRAINT shard_2_check 
CHECK (get_user_shard(id) = 2);

-- Sharding trigger
CREATE OR REPLACE FUNCTION route_user_insert()
RETURNS TRIGGER AS $$
DECLARE
    shard_num INTEGER;
    table_name TEXT;
BEGIN
    shard_num := get_user_shard(NEW.id);
    table_name := 'auth.users_shard_' || shard_num;
    
    EXECUTE format('INSERT INTO %I SELECT ($1).*', table_name) USING NEW;
    
    RETURN NULL; -- Prevent insertion into parent table
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER route_user_sharding
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION route_user_insert();
```

## Migration and Evolution

### Version Control for Schema

```sql
-- Schema migration tracking
CREATE TABLE config.schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    migration_sql TEXT,
    rollback_sql TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by TEXT DEFAULT current_user,
    execution_time INTERVAL,
    checksum TEXT
);

-- Migration execution function
CREATE OR REPLACE FUNCTION apply_migration(
    p_version VARCHAR(50),
    p_description TEXT,
    p_migration_sql TEXT,
    p_rollback_sql TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    start_time TIMESTAMP;
    execution_duration INTERVAL;
BEGIN
    start_time := clock_timestamp();
    
    -- Check if migration already applied
    IF EXISTS (SELECT 1 FROM config.schema_migrations WHERE version = p_version) THEN
        RAISE NOTICE 'Migration % already applied', p_version;
        RETURN FALSE;
    END IF;
    
    -- Execute migration
    EXECUTE p_migration_sql;
    
    execution_duration := clock_timestamp() - start_time;
    
    -- Record migration
    INSERT INTO config.schema_migrations (
        version, description, migration_sql, rollback_sql, execution_time
    ) VALUES (
        p_version, p_description, p_migration_sql, p_rollback_sql, execution_duration
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Backward Compatibility

```sql
-- View-based backward compatibility
CREATE OR REPLACE VIEW legacy.user_profiles AS
SELECT 
    id,
    email,
    username,
    first_name || ' ' || last_name as full_name,
    created_at,
    -- Map new fields to legacy format
    CASE 
        WHEN is_active AND deleted_at IS NULL THEN 'active'
        WHEN NOT is_active THEN 'inactive'
        ELSE 'deleted'
    END as status
FROM auth.users
WHERE deleted_at IS NULL;

-- Legacy API compatibility layer
CREATE OR REPLACE FUNCTION legacy.get_user_by_email(p_email TEXT)
RETURNS SETOF legacy.user_profiles AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM legacy.user_profiles WHERE email = p_email;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring and Analytics

### Performance Monitoring

```sql
-- Query performance tracking
CREATE TABLE analytics.query_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    query_text TEXT,
    execution_count INTEGER DEFAULT 1,
    total_execution_time INTERVAL DEFAULT '0',
    avg_execution_time INTERVAL,
    min_execution_time INTERVAL,
    max_execution_time INTERVAL,
    last_executed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query performance tracking function
CREATE OR REPLACE FUNCTION track_query_performance()
RETURNS event_trigger AS $$
BEGIN
    -- Implementation would track query execution metrics
    -- This is a placeholder for the actual monitoring logic
    RAISE NOTICE 'Query performance tracking triggered';
END;
$$ LANGUAGE plpgsql;
```

### Business Intelligence Views

```sql
-- Comprehensive analytics views
CREATE MATERIALIZED VIEW analytics.enrollment_trends AS
SELECT 
    DATE_TRUNC('day', created_at) as enrollment_date,
    course_id,
    COUNT(*) as daily_enrollments,
    COUNT(*) OVER (
        PARTITION BY course_id 
        ORDER BY DATE_TRUNC('day', created_at)
        ROWS UNBOUNDED PRECEDING
    ) as cumulative_enrollments
FROM analytics.course_enrollments
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), course_id
ORDER BY enrollment_date DESC, course_id;

-- Revenue analytics
CREATE MATERIALIZED VIEW analytics.revenue_summary AS
SELECT 
    DATE_TRUNC('month', ce.created_at) as revenue_month,
    c.category_id,
    COUNT(ce.id) as enrollments,
    SUM(c.price) as gross_revenue,
    AVG(c.price) as avg_course_price
FROM analytics.course_enrollments ce
JOIN content.courses c ON ce.course_id = c.id
WHERE ce.enrollment_type = 'paid'
GROUP BY DATE_TRUNC('month', ce.created_at), c.category_id;

-- Automated refresh schedule
SELECT cron.schedule(
    'refresh-enrollment-trends',
    '0 1 * * *', -- Daily at 1 AM
    'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.enrollment_trends;'
);
```

## Best Practices

### Development Guidelines

1. **Always use UUID primary keys** for better distribution and security
2. **Implement soft deletes** with `deleted_at` timestamps for important entities
3. **Use JSONB for flexible schemas** but validate structure with constraints
4. **Implement proper indexing strategy** based on query patterns
5. **Use row-level security** for multi-tenant applications
6. **Version control all schema changes** with migration scripts
7. **Implement comprehensive audit logging** for regulatory compliance
8. **Use materialized views** for complex analytics queries
9. **Partition large tables** by time or other logical boundaries
10. **Monitor query performance** and optimize based on actual usage

### Security Best Practices

1. **Enable row-level security** on all user-related tables
2. **Encrypt sensitive data** using pgcrypto
3. **Use prepared statements** to prevent SQL injection
4. **Implement proper authentication** and session management
5. **Log all security-relevant events** for audit trails
6. **Regular security audits** of permissions and access patterns
7. **Use connection pooling** to prevent resource exhaustion
8. **Implement rate limiting** at the database level when possible

### Performance Optimization

1. **Use appropriate data types** and avoid over-sizing columns
2. **Implement proper indexing strategy** including partial and covering indexes
3. **Use EXPLAIN ANALYZE** to understand query execution plans
4. **Implement caching strategies** at multiple levels
5. **Monitor and optimize slow queries** regularly
6. **Use connection pooling** to reduce connection overhead
7. **Implement read replicas** for read-heavy workloads
8. **Consider partitioning** for large, time-series data

This comprehensive PostgreSQL schema analysis provides a solid foundation for the 7P Education Platform's database architecture, ensuring scalability, security, and performance while maintaining data integrity and supporting complex educational workflows.