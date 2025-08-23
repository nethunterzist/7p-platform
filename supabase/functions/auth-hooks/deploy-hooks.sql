-- SUPABASE AUTH HOOKS DEPLOYMENT - 7P Education
-- Configuration SQL to enable auth hooks in production

-- Create additional tables needed for MFA and SMS verification
CREATE TABLE IF NOT EXISTS sms_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  
  CONSTRAINT sms_verifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_verifications_user_challenge ON sms_verifications(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_expires ON sms_verifications(expires_at);

-- Add MFA tracking columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mfa_locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_mfa_success TIMESTAMPTZ;

-- Row Level Security for sms_verifications
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS verifications" 
  ON sms_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage SMS verifications" 
  ON sms_verifications FOR ALL
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Function to generate secure SMS codes
CREATE OR REPLACE FUNCTION generate_sms_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  -- Generate 6-digit numeric code
  code := LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create SMS verification challenge
CREATE OR REPLACE FUNCTION create_sms_challenge(
  p_user_id UUID,
  p_phone TEXT,
  p_challenge_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate verification code
  v_code := generate_sms_code();
  v_expires_at := NOW() + INTERVAL '5 minutes';
  
  -- Store verification record
  INSERT INTO sms_verifications (
    user_id,
    challenge_id,
    phone,
    code,
    expires_at
  ) VALUES (
    p_user_id,
    p_challenge_id,
    p_phone,
    v_code,
    v_expires_at
  );
  
  RETURN jsonb_build_object(
    'code', v_code,
    'expires_at', v_expires_at,
    'challenge_id', p_challenge_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired SMS verifications
CREATE OR REPLACE FUNCTION cleanup_expired_sms_verifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM sms_verifications 
    WHERE expires_at < NOW() - INTERVAL '1 hour'  -- Keep for 1 hour after expiry for audit
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto cleanup trigger for SMS verifications
CREATE OR REPLACE FUNCTION trigger_cleanup_sms_verifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Cleanup on insert to maintain table size
  PERFORM cleanup_expired_sms_verifications();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_cleanup_sms_verifications
  AFTER INSERT ON sms_verifications
  EXECUTE FUNCTION trigger_cleanup_sms_verifications();

-- Grant permissions for the auth hooks
GRANT EXECUTE ON FUNCTION generate_sms_code() TO service_role;
GRANT EXECUTE ON FUNCTION create_sms_challenge(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_sms_verifications() TO service_role;

-- Create monitoring view for auth hook performance
CREATE OR REPLACE VIEW auth_hook_performance AS
SELECT 
  DATE(timestamp) as event_date,
  event_type,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE success = true) as successful_events,
  COUNT(*) FILTER (WHERE success = false) as failed_events,
  ROUND(
    (COUNT(*) FILTER (WHERE success = true) * 100.0) / 
    NULLIF(COUNT(*), 0), 2
  ) as success_rate_percent,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE event_type IN (
  'password_validation',
  'email_signup',
  'email_recovery',
  'mfa_verification_success',
  'mfa_verification_failed',
  'suspicious_signup_rate',
  'suspicious_password_reset'
)
AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp), event_type
ORDER BY event_date DESC, event_type;

-- Grant view access
GRANT SELECT ON auth_hook_performance TO service_role;

-- Add comments for documentation
COMMENT ON TABLE sms_verifications IS 'Stores SMS verification codes for MFA with 5-minute expiry';
COMMENT ON FUNCTION generate_sms_code() IS 'Generates secure 6-digit SMS verification codes';
COMMENT ON FUNCTION create_sms_challenge(UUID, TEXT, TEXT) IS 'Creates SMS verification challenge for MFA';
COMMENT ON VIEW auth_hook_performance IS 'Performance monitoring for auth hooks over the last 30 days';