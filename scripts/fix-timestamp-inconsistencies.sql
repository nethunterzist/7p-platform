-- 7P Education - Fix Timestamp Inconsistencies
-- This script fixes the identified timestamp inconsistencies in the courses table
-- where published_at is before created_at

-- Display current inconsistent timestamps
SELECT 
    id,
    title,
    created_at,
    published_at,
    CASE 
        WHEN published_at < created_at THEN 'INCONSISTENT'
        ELSE 'CONSISTENT'
    END as status
FROM courses 
WHERE published_at IS NOT NULL
ORDER BY created_at;

-- Fix timestamp inconsistencies by setting published_at to created_at
-- This ensures logical consistency while preserving the intent
UPDATE courses 
SET 
    published_at = created_at,
    updated_at = NOW()
WHERE published_at IS NOT NULL 
AND published_at < created_at;

-- Add a constraint to prevent future inconsistencies
ALTER TABLE courses 
ADD CONSTRAINT check_published_after_created 
CHECK (published_at IS NULL OR published_at >= created_at);

-- Create a trigger function to validate timestamps on insert/update
CREATE OR REPLACE FUNCTION validate_course_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if published_at is before created_at
    IF NEW.published_at IS NOT NULL AND NEW.published_at < NEW.created_at THEN
        RAISE EXCEPTION 'published_at (%) cannot be before created_at (%)', 
                       NEW.published_at, NEW.created_at;
    END IF;
    
    -- Ensure updated_at is not before created_at
    IF NEW.updated_at < NEW.created_at THEN
        NEW.updated_at = NEW.created_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_course_timestamps_trigger ON courses;
CREATE TRIGGER validate_course_timestamps_trigger
    BEFORE INSERT OR UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION validate_course_timestamps();

-- Verify the fix by checking timestamps again
SELECT 
    id,
    title,
    created_at,
    published_at,
    updated_at,
    CASE 
        WHEN published_at IS NULL THEN 'NOT_PUBLISHED'
        WHEN published_at < created_at THEN 'INCONSISTENT'
        ELSE 'CONSISTENT'
    END as status
FROM courses 
ORDER BY created_at;

-- Test the constraint with a sample update (this should succeed)
-- UPDATE courses SET published_at = created_at WHERE id = (SELECT id FROM courses LIMIT 1);

-- Display summary of changes
SELECT 
    COUNT(*) as total_courses,
    COUNT(published_at) as published_courses,
    SUM(CASE WHEN published_at >= created_at THEN 1 ELSE 0 END) as consistent_timestamps
FROM courses;

COMMENT ON CONSTRAINT check_published_after_created ON courses IS 
'Ensures published_at is never before created_at to maintain temporal consistency';

COMMENT ON FUNCTION validate_course_timestamps() IS 
'Validates timestamp consistency on course insert/update operations';