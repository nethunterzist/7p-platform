-- EMAIL VERIFICATION SYSTEM MIGRATION - 7P Education
-- Creates tables and functions for mandatory email verification with 24h expiry

-- Create email_verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT email_verifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT email_verifications_expires_check 
    CHECK (expires_at > created_at),
  CONSTRAINT email_verifications_token_length 
    CHECK (length(token) >= 32)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_valid_expires ON email_verifications(is_valid, expires_at) WHERE is_valid = true;

-- Add email verification columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verification_request TIMESTAMPTZ;

-- Row Level Security for email_verifications
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own email verifications
CREATE POLICY "Users can view their own email verifications" 
  ON email_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert email verifications (for the user making the request)
CREATE POLICY "System can insert email verifications" 
  ON email_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- System can update email verifications (mark as verified)
CREATE POLICY "System can update email verifications" 
  ON email_verifications FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Admins can manage all verifications
CREATE POLICY "Admins can manage all email verifications" 
  ON email_verifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to cleanup expired email verifications
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired and invalid verification records
  WITH deleted AS (
    DELETE FROM email_verifications 
    WHERE (expires_at < NOW() OR is_valid = FALSE)
    AND created_at < NOW() - INTERVAL '7 days'  -- Keep records for 7 days for audit
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track verification attempts and rate limiting
CREATE OR REPLACE FUNCTION track_email_verification_attempt(
  p_user_id UUID,
  p_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_attempts INTEGER;
  v_last_request TIMESTAMPTZ;
  v_can_request BOOLEAN := TRUE;
  v_wait_time_seconds INTEGER := 0;
  v_max_attempts INTEGER := 3;
  v_window_hours INTEGER := 1;
BEGIN
  -- Get current attempt data
  SELECT 
    COALESCE(email_verification_attempts, 0),
    last_verification_request
  INTO v_attempts, v_last_request
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  -- Check if we're within the rate limit window
  IF v_last_request IS NOT NULL AND 
     v_last_request > NOW() - (v_window_hours * INTERVAL '1 hour') THEN
    
    -- Within window, check if limit exceeded
    IF v_attempts >= v_max_attempts THEN
      v_can_request := FALSE;
      v_wait_time_seconds := EXTRACT(EPOCH FROM (
        v_last_request + (v_window_hours * INTERVAL '1 hour') - NOW()
      ))::INTEGER;
    END IF;
  ELSE
    -- Outside window, reset attempts
    v_attempts := 0;
  END IF;
  
  -- If allowed, increment attempts
  IF v_can_request THEN
    UPDATE user_profiles 
    SET 
      email_verification_attempts = v_attempts + 1,
      last_verification_request = NOW(),
      email_verification_sent_at = NOW()
    WHERE user_id = p_user_id;
    
    v_attempts := v_attempts + 1;
  END IF;
  
  RETURN jsonb_build_object(
    'can_request', v_can_request,
    'attempts', v_attempts,
    'max_attempts', v_max_attempts,
    'wait_time_seconds', v_wait_time_seconds,
    'remaining_attempts', GREATEST(0, v_max_attempts - v_attempts)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify email and update user profile
CREATE OR REPLACE FUNCTION verify_user_email(
  p_user_id UUID,
  p_email TEXT,
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_verification_record RECORD;
  v_result JSONB;
BEGIN
  -- Find valid verification record
  SELECT * INTO v_verification_record
  FROM email_verifications
  WHERE user_id = p_user_id
    AND token = p_token
    AND is_valid = TRUE
    AND expires_at > NOW();
  
  -- Check if verification record exists and is valid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_or_expired_token'
    );
  END IF;
  
  -- Mark verification as used
  UPDATE email_verifications
  SET 
    is_valid = FALSE,
    verified_at = NOW()
  WHERE id = v_verification_record.id;
  
  -- Update user profile
  UPDATE user_profiles
  SET 
    email_verified = TRUE,
    email_verified_at = NOW(),
    email = p_email,
    email_verification_attempts = 0,
    last_verification_request = NULL
  WHERE user_id = p_user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'verified_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user verification status
CREATE OR REPLACE FUNCTION get_user_verification_status(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_pending_verification RECORD;
  v_rate_limit_status JSONB;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  -- If already verified, return success
  IF v_profile.email_verified = TRUE THEN
    RETURN jsonb_build_object(
      'is_verified', true,
      'verified_at', v_profile.email_verified_at,
      'email', v_profile.email
    );
  END IF;
  
  -- Check for pending verifications
  SELECT * INTO v_pending_verification
  FROM email_verifications
  WHERE user_id = p_user_id
    AND is_valid = TRUE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get rate limit status
  SELECT track_email_verification_attempt(p_user_id, v_profile.email) INTO v_rate_limit_status;
  
  RETURN jsonb_build_object(
    'is_verified', false,
    'email', v_profile.email,
    'has_pending_verification', v_pending_verification.id IS NOT NULL,
    'pending_expires_at', v_pending_verification.expires_at,
    'rate_limit', v_rate_limit_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-cleanup expired verifications
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_verifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Perform cleanup when new verifications are created
  PERFORM cleanup_expired_email_verifications();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_cleanup_expired_verifications
  AFTER INSERT ON email_verifications
  EXECUTE FUNCTION trigger_cleanup_expired_verifications();

-- Insert some initial data to ensure the system works
-- Note: This would typically be handled by the application, not the migration

-- Create view for admin monitoring
CREATE OR REPLACE VIEW email_verification_stats AS
SELECT 
  DATE(created_at) as verification_date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE verified_at IS NOT NULL) as verified_count,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND verified_at IS NULL) as expired_count,
  COUNT(*) FILTER (WHERE is_valid = TRUE AND expires_at > NOW()) as pending_count,
  ROUND(
    (COUNT(*) FILTER (WHERE verified_at IS NOT NULL) * 100.0) / 
    NULLIF(COUNT(*), 0), 2
  ) as verification_rate_percent
FROM email_verifications
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY verification_date DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_email_verifications() TO service_role;
GRANT EXECUTE ON FUNCTION track_email_verification_attempt(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION verify_user_email(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_verification_status(UUID) TO service_role;

-- Grant view permissions to admins
GRANT SELECT ON email_verification_stats TO service_role;

-- Add comment for documentation
COMMENT ON TABLE email_verifications IS 'Stores email verification tokens with 24-hour expiry and rate limiting support';
COMMENT ON FUNCTION cleanup_expired_email_verifications() IS 'Cleans up expired verification records - should be run daily';
COMMENT ON FUNCTION track_email_verification_attempt(UUID, TEXT) IS 'Tracks verification attempts and enforces rate limiting (3 attempts per hour)';
COMMENT ON FUNCTION verify_user_email(UUID, TEXT, TEXT) IS 'Verifies email using token and updates user profile';
COMMENT ON FUNCTION get_user_verification_status(UUID) IS 'Returns comprehensive verification status for a user';

-- Create indexes for admin monitoring
CREATE INDEX IF NOT EXISTS idx_email_verifications_stats 
ON email_verifications(created_at, verified_at, expires_at, is_valid);

-- Create partial indexes for active verifications
CREATE INDEX IF NOT EXISTS idx_email_verifications_active 
ON email_verifications(user_id, expires_at) 
WHERE is_valid = TRUE AND expires_at > NOW();

-- Add constraint to prevent duplicate active verifications per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_user_active 
ON email_verifications(user_id) 
WHERE is_valid = TRUE AND expires_at > NOW();