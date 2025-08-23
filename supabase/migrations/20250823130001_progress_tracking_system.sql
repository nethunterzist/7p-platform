-- Real-time Progress Tracking System Tables
-- This migration adds XP tracking, achievements, and notifications

-- Add XP and level columns to user_profiles if they don't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Create user_xp_logs table for tracking XP activities
CREATE TABLE IF NOT EXISTS user_xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    xp_earned INTEGER NOT NULL CHECK (xp_earned >= 0),
    total_xp INTEGER NOT NULL CHECK (total_xp >= 0),
    level_after INTEGER NOT NULL CHECK (level_after >= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_xp_logs
CREATE INDEX IF NOT EXISTS idx_user_xp_logs_user_id ON user_xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_logs_created_at ON user_xp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_logs_activity_type ON user_xp_logs(activity_type);

-- Create user_achievements table for tracking badges and milestones
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT,
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    metadata JSONB DEFAULT '{}',
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

-- Create user_notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create indexes for user_notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Create course_progress_snapshots for historical tracking
CREATE TABLE IF NOT EXISTS course_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    overall_completion INTEGER NOT NULL CHECK (overall_completion >= 0 AND overall_completion <= 100),
    completed_materials INTEGER NOT NULL DEFAULT 0,
    total_materials INTEGER NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id, snapshot_date)
);

-- Create indexes for course_progress_snapshots
CREATE INDEX IF NOT EXISTS idx_course_progress_snapshots_user_course ON course_progress_snapshots(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_snapshots_date ON course_progress_snapshots(snapshot_date DESC);

-- Create learning_streaks table for tracking daily activity streaks
CREATE TABLE IF NOT EXISTS learning_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_start_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for learning_streaks
CREATE INDEX IF NOT EXISTS idx_learning_streaks_user_id ON learning_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_current ON learning_streaks(current_streak DESC);

-- RLS (Row Level Security) Policies
-- Enable RLS on all tables
ALTER TABLE user_xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_xp_logs
CREATE POLICY "Users can view own XP logs" ON user_xp_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view student XP logs" ON user_xp_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.user_id = user_xp_logs.user_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "System can insert XP logs" ON user_xp_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view student achievements" ON user_achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.user_id = user_achievements.user_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "System can insert achievements" ON user_achievements
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_notifications
CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON user_notifications
    FOR INSERT WITH CHECK (true);

-- RLS Policies for course_progress_snapshots
CREATE POLICY "Users can view own progress snapshots" ON course_progress_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view student progress snapshots" ON course_progress_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = course_progress_snapshots.course_id
            AND c.instructor_id = auth.uid()
        )
    );

CREATE POLICY "System can manage progress snapshots" ON course_progress_snapshots
    FOR ALL WITH CHECK (true);

-- RLS Policies for learning_streaks
CREATE POLICY "Users can view own learning streaks" ON learning_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own learning streaks" ON learning_streaks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage learning streaks" ON learning_streaks
    FOR ALL WITH CHECK (true);

-- Create function to update learning streaks
CREATE OR REPLACE FUNCTION update_learning_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
    current_streak_record RECORD;
    has_today_activity BOOLEAN;
BEGIN
    -- Check if user has activity today
    SELECT EXISTS(
        SELECT 1 FROM user_material_progress 
        WHERE user_id = p_user_id 
        AND DATE(updated_at) = today_date
    ) INTO has_today_activity;
    
    -- Get current streak record
    SELECT * INTO current_streak_record
    FROM learning_streaks
    WHERE user_id = p_user_id;
    
    IF current_streak_record IS NULL THEN
        -- Create new streak record
        IF has_today_activity THEN
            INSERT INTO learning_streaks (
                user_id, 
                current_streak, 
                longest_streak, 
                last_activity_date, 
                streak_start_date
            ) VALUES (
                p_user_id, 
                1, 
                1, 
                today_date, 
                today_date
            );
        END IF;
    ELSE
        IF has_today_activity THEN
            IF current_streak_record.last_activity_date = yesterday_date THEN
                -- Continue streak
                UPDATE learning_streaks 
                SET current_streak = current_streak + 1,
                    longest_streak = GREATEST(longest_streak, current_streak + 1),
                    last_activity_date = today_date,
                    updated_at = NOW()
                WHERE user_id = p_user_id;
            ELSIF current_streak_record.last_activity_date < yesterday_date THEN
                -- Reset streak
                UPDATE learning_streaks 
                SET current_streak = 1,
                    last_activity_date = today_date,
                    streak_start_date = today_date,
                    updated_at = NOW()
                WHERE user_id = p_user_id;
            END IF;
            -- If last_activity_date = today_date, do nothing (already counted)
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate user level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Using the exponential formula from business logic: level = floor(sqrt(xp/1000)) + 1
    RETURN FLOOR(SQRT(xp::FLOAT / 1000)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get XP required for next level
CREATE OR REPLACE FUNCTION get_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- XP required = (level-1)^2 * 1000
    RETURN POWER(level - 1, 2) * 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function to update learning streaks on progress update
CREATE OR REPLACE FUNCTION trigger_update_learning_streak()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_learning_streak(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for learning streak updates
DROP TRIGGER IF EXISTS update_learning_streak_trigger ON user_material_progress;
CREATE TRIGGER update_learning_streak_trigger
    AFTER INSERT OR UPDATE ON user_material_progress
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_learning_streak();

-- Create function to generate daily progress snapshots
CREATE OR REPLACE FUNCTION generate_daily_progress_snapshot()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    course_record RECORD;
    progress_data RECORD;
BEGIN
    -- For each user enrolled in courses
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM course_enrollments 
        WHERE status = 'active'
    LOOP
        -- For each course the user is enrolled in
        FOR course_record IN 
            SELECT ce.course_id 
            FROM course_enrollments ce
            WHERE ce.user_id = user_record.user_id 
            AND ce.status = 'active'
        LOOP
            -- Calculate current progress
            SELECT 
                COALESCE(
                    ROUND(AVG(COALESCE(ump.progress_percentage, 0))), 
                    0
                ) as overall_completion,
                COUNT(CASE WHEN ump.progress_percentage >= 100 THEN 1 END) as completed_materials,
                COUNT(cm.id) as total_materials
            INTO progress_data
            FROM course_materials cm
            LEFT JOIN user_material_progress ump ON (
                cm.id = ump.material_id 
                AND ump.user_id = user_record.user_id
            )
            WHERE cm.course_id = course_record.course_id;
            
            -- Insert or update snapshot
            INSERT INTO course_progress_snapshots (
                user_id,
                course_id,
                overall_completion,
                completed_materials,
                total_materials,
                snapshot_date
            ) VALUES (
                user_record.user_id,
                course_record.course_id,
                progress_data.overall_completion,
                progress_data.completed_materials,
                progress_data.total_materials,
                CURRENT_DATE
            )
            ON CONFLICT (user_id, course_id, snapshot_date)
            DO UPDATE SET
                overall_completion = EXCLUDED.overall_completion,
                completed_materials = EXCLUDED.completed_materials,
                total_materials = EXCLUDED.total_materials,
                created_at = NOW();
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment: This function should be called daily via a cron job or scheduled function
COMMENT ON FUNCTION generate_daily_progress_snapshot() IS 
'Generates daily progress snapshots for all users in all courses. Should be called daily via cron job.';

-- Insert some sample achievement types for reference
INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_earned)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'sample_achievement',
    'Sample Achievement',
    'This is a sample achievement for testing purposes',
    0
WHERE NOT EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE achievement_type = 'sample_achievement'
) LIMIT 1;

-- Clean up sample data
DELETE FROM user_achievements WHERE achievement_type = 'sample_achievement';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON user_xp_logs TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON course_progress_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON learning_streaks TO authenticated;