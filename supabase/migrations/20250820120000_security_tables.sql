-- =====================================================
-- SECURITY MONITORING TABLES - 7P Education
-- Production-ready security logging and monitoring
-- =====================================================

-- Security Events Table
-- Stores all security-related events for monitoring and analysis
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'rate_limit_exceeded',
        'ddos_detected', 
        'xss_attempt',
        'sql_injection_attempt',
        'command_injection_attempt',
        'cors_violation',
        'input_validation_failed',
        'suspicious_user_agent',
        'file_upload_blocked',
        'authentication_failed',
        'authorization_failed',
        'middleware_error',
        'api_error',
        'security_scan_detected'
    )),
    ip_address INET NOT NULL,
    user_agent TEXT,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS')),
    pathname TEXT NOT NULL,
    origin TEXT,
    referer TEXT,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_security_events_created_at ON security_events(created_at),
    INDEX idx_security_events_event_type ON security_events(event_type),
    INDEX idx_security_events_ip ON security_events(ip_address),
    INDEX idx_security_events_severity ON security_events(severity),
    INDEX idx_security_events_user_id ON security_events(user_id) WHERE user_id IS NOT NULL
);

-- API Request Logs Table
-- Stores high-value API requests for analysis
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS')),
    pathname TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'blocked')),
    status_code INTEGER CHECK (status_code >= 100 AND status_code < 600),
    error_type TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_api_logs_created_at ON api_request_logs(created_at),
    INDEX idx_api_logs_pathname ON api_request_logs(pathname),
    INDEX idx_api_logs_ip ON api_request_logs(ip_address),
    INDEX idx_api_logs_status ON api_request_logs(status),
    INDEX idx_api_logs_user_id ON api_request_logs(user_id) WHERE user_id IS NOT NULL
);

-- Blocked IPs Table
-- Stores automatically blocked IP addresses
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for automatic blocks
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes for performance
    INDEX idx_blocked_ips_ip ON blocked_ips(ip_address),
    INDEX idx_blocked_ips_active ON blocked_ips(is_active) WHERE is_active = true,
    INDEX idx_blocked_ips_expires ON blocked_ips(expires_at) WHERE expires_at IS NOT NULL
);

-- Rate Limit Violations Table (for analysis)
-- Tracks rate limit violations for pattern analysis
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    endpoint TEXT NOT NULL,
    violation_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_rate_violations_ip ON rate_limit_violations(ip_address),
    INDEX idx_rate_violations_endpoint ON rate_limit_violations(endpoint),
    INDEX idx_rate_violations_created ON rate_limit_violations(created_at)
);

-- Security Metrics Summary Table (for dashboard)
-- Pre-aggregated metrics for fast dashboard queries
CREATE TABLE IF NOT EXISTS security_metrics_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hour_start TIMESTAMPTZ NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    blocked_requests INTEGER NOT NULL DEFAULT 0,
    rate_limit_violations INTEGER NOT NULL DEFAULT 0,
    xss_attempts INTEGER NOT NULL DEFAULT 0,
    sql_injection_attempts INTEGER NOT NULL DEFAULT 0,
    ddos_attempts INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER,
    error_rate_percent DECIMAL(5,2),
    unique_ips INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(hour_start),
    
    -- Index for time-based queries
    INDEX idx_security_metrics_hour ON security_metrics_hourly(hour_start)
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all security tables
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics_hourly ENABLE ROW LEVEL SECURITY;

-- Security events: Only admins can read, system can insert
CREATE POLICY \"Admin can read security events\" ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY \"System can insert security events\" ON security_events
    FOR INSERT WITH CHECK (true);

-- API request logs: Only admins can read, system can insert
CREATE POLICY \"Admin can read API logs\" ON api_request_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY \"System can insert API logs\" ON api_request_logs
    FOR INSERT WITH CHECK (true);

-- Blocked IPs: Only admins can read/modify
CREATE POLICY \"Admin can manage blocked IPs\" ON blocked_ips
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- Rate limit violations: Only admins can read, system can insert
CREATE POLICY \"Admin can read rate limit violations\" ON rate_limit_violations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY \"System can insert rate limit violations\" ON rate_limit_violations
    FOR INSERT WITH CHECK (true);

-- Security metrics: Only admins can read, system can insert/update
CREATE POLICY \"Admin can read security metrics\" ON security_metrics_hourly
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY \"System can manage security metrics\" ON security_metrics_hourly
    FOR ALL WITH CHECK (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically expire blocked IPs
CREATE OR REPLACE FUNCTION expire_blocked_ips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE blocked_ips 
    SET is_active = false 
    WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$;

-- Function to aggregate security metrics
CREATE OR REPLACE FUNCTION aggregate_security_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_hour TIMESTAMPTZ;
BEGIN
    -- Get the previous completed hour
    current_hour := date_trunc('hour', NOW() - INTERVAL '1 hour');
    
    -- Skip if already aggregated
    IF EXISTS (SELECT 1 FROM security_metrics_hourly WHERE hour_start = current_hour) THEN
        RETURN;
    END IF;
    
    -- Aggregate metrics for the hour
    INSERT INTO security_metrics_hourly (
        hour_start,
        total_requests,
        blocked_requests,
        rate_limit_violations,
        xss_attempts,
        sql_injection_attempts,
        ddos_attempts,
        avg_response_time_ms,
        error_rate_percent,
        unique_ips,
        unique_users
    )
    SELECT
        current_hour,
        COALESCE(api_stats.total_requests, 0),
        COALESCE(security_stats.blocked_requests, 0),
        COALESCE(security_stats.rate_limit_violations, 0),
        COALESCE(security_stats.xss_attempts, 0),
        COALESCE(security_stats.sql_injection_attempts, 0),
        COALESCE(security_stats.ddos_attempts, 0),
        COALESCE(api_stats.avg_response_time_ms, 0),
        COALESCE(api_stats.error_rate_percent, 0),
        COALESCE(GREATEST(api_stats.unique_ips, security_stats.unique_ips), 0),
        COALESCE(GREATEST(api_stats.unique_users, security_stats.unique_users), 0)
    FROM (
        -- API request statistics
        SELECT
            COUNT(*) as total_requests,
            AVG(duration_ms)::INTEGER as avg_response_time_ms,
            (COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*))::DECIMAL(5,2) as error_rate_percent,
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
        FROM api_request_logs
        WHERE created_at >= current_hour 
        AND created_at < current_hour + INTERVAL '1 hour'
    ) api_stats
    FULL OUTER JOIN (
        -- Security event statistics
        SELECT
            COUNT(*) FILTER (WHERE event_type IN ('rate_limit_exceeded', 'ddos_detected', 'cors_violation')) as blocked_requests,
            COUNT(*) FILTER (WHERE event_type = 'rate_limit_exceeded') as rate_limit_violations,
            COUNT(*) FILTER (WHERE event_type = 'xss_attempt') as xss_attempts,
            COUNT(*) FILTER (WHERE event_type = 'sql_injection_attempt') as sql_injection_attempts,
            COUNT(*) FILTER (WHERE event_type = 'ddos_detected') as ddos_attempts,
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
        FROM security_events
        WHERE created_at >= current_hour 
        AND created_at < current_hour + INTERVAL '1 hour'
    ) security_stats ON true;
END;
$$;

-- Function to clean old security data
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep security events for 90 days
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Keep API logs for 30 days
    DELETE FROM api_request_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Keep rate limit violations for 30 days
    DELETE FROM rate_limit_violations 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Keep metrics for 1 year
    DELETE FROM security_metrics_hourly 
    WHERE hour_start < NOW() - INTERVAL '1 year';
END;
$$;

-- =====================================================
-- SCHEDULED TASKS (using pg_cron if available)
-- =====================================================

-- Note: These require pg_cron extension
-- Uncomment if pg_cron is available

-- Schedule IP expiration every 5 minutes
-- SELECT cron.schedule('expire-blocked-ips', '*/5 * * * *', 'SELECT expire_blocked_ips();');

-- Schedule metrics aggregation every hour at minute 5
-- SELECT cron.schedule('aggregate-security-metrics', '5 * * * *', 'SELECT aggregate_security_metrics();');

-- Schedule data cleanup daily at 2 AM
-- SELECT cron.schedule('cleanup-security-data', '0 2 * * *', 'SELECT cleanup_security_data();');

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant usage on security sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant insert permissions for system operations (API routes)
GRANT INSERT ON security_events TO authenticated;
GRANT INSERT ON api_request_logs TO authenticated;
GRANT INSERT ON rate_limit_violations TO authenticated;
GRANT INSERT, UPDATE ON security_metrics_hourly TO authenticated;

-- Create service role for security operations
-- This should be used by the API security middleware
-- Note: You'll need to create this role in Supabase dashboard
-- GRANT ALL ON security_events TO security_service;
-- GRANT ALL ON api_request_logs TO security_service;
-- GRANT ALL ON blocked_ips TO security_service;
-- GRANT ALL ON rate_limit_violations TO security_service;
-- GRANT ALL ON security_metrics_hourly TO security_service;

-- =====================================================
-- INITIAL DATA AND INDEXES
-- =====================================================

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_composite 
ON security_events(created_at, event_type, severity);

CREATE INDEX IF NOT EXISTS idx_api_logs_composite 
ON api_request_logs(created_at, pathname, status);

-- Create GIN index for metadata JSONB columns
CREATE INDEX IF NOT EXISTS idx_security_events_metadata_gin 
ON security_events USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_metadata_gin 
ON blocked_ips USING GIN (metadata);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE security_events IS 'Stores all security-related events for monitoring and threat detection';
COMMENT ON TABLE api_request_logs IS 'Stores high-value API requests for performance and security analysis';
COMMENT ON TABLE blocked_ips IS 'Stores automatically blocked IP addresses with expiration';
COMMENT ON TABLE rate_limit_violations IS 'Tracks rate limit violations for pattern analysis';
COMMENT ON TABLE security_metrics_hourly IS 'Pre-aggregated hourly security metrics for dashboard performance';

COMMENT ON FUNCTION expire_blocked_ips() IS 'Automatically expires blocked IPs based on expires_at timestamp';
COMMENT ON FUNCTION aggregate_security_metrics() IS 'Aggregates hourly security metrics from raw events and requests';
COMMENT ON FUNCTION cleanup_security_data() IS 'Cleans up old security data according to retention policies';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Security monitoring tables created successfully!';
    RAISE NOTICE 'Tables: security_events, api_request_logs, blocked_ips, rate_limit_violations, security_metrics_hourly';
    RAISE NOTICE 'Functions: expire_blocked_ips(), aggregate_security_metrics(), cleanup_security_data()';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure pg_cron for scheduled tasks (if available)';
    RAISE NOTICE '2. Create security_service role in Supabase dashboard';
    RAISE NOTICE '3. Configure alerting system endpoints';
    RAISE NOTICE '4. Test security middleware integration';
END $$;