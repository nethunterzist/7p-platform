/**
 * AUDIT LOGGING SYSTEM - 7P Education
 * Comprehensive security and authentication event logging
 */

import { createClient } from '@/utils/supabase/server';
import { PRODUCTION_AUTH_CONFIG } from './production-config';

export interface AuditEvent {
  id?: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface SecurityMetrics {
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  accountLockouts: number;
  suspiciousActivities: number;
  passwordChanges: number;
  lastUpdated: string;
}

export class AuditLogger {
  private static instance: AuditLogger | null = null;
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;

  private constructor() {
    // Start background processing
    this.startBackgroundProcessing();
  }

  static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    eventType: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    details: Record<string, any> = {},
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    const event: AuditEvent = {
      eventType,
      userId: userId || undefined,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      success,
      details,
      riskLevel,
      sessionId: this.generateSessionId(),
      metadata: {
        source: 'auth_system',
        version: '1.0.0',
        environment: process.env.NODE_ENV
      }
    };

    await this.queueEvent(event);
  }

  /**
   * Log login attempt
   */
  async logLogin(
    userId: string | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const details: Record<string, any> = {
      email: email,
      loginMethod: 'email_password'
    };

    if (!success && failureReason) {
      details.failureReason = failureReason;
    }

    const riskLevel = this.assessLoginRiskLevel(success, failureReason, ipAddress);

    await this.logAuthEvent('login', userId, ipAddress, userAgent, success, details, riskLevel);

    // Track failed login attempts
    if (!success && userId) {
      await this.incrementFailedLogins(userId);
    } else if (success && userId) {
      await this.resetFailedLogins(userId);
    }
  }

  /**
   * Log logout
   */
  async logLogout(
    userId: string,
    ipAddress: string,
    userAgent: string,
    reason: 'user_initiated' | 'session_timeout' | 'security_logout' = 'user_initiated'
  ): Promise<void> {
    await this.logAuthEvent('logout', userId, ipAddress, userAgent, true, { reason }, 'low');
  }

  /**
   * Log password change
   */
  async logPasswordChange(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    changeType: 'user_initiated' | 'forced_reset' | 'periodic_change'
  ): Promise<void> {
    await this.logAuthEvent(
      'password_change',
      userId,
      ipAddress,
      userAgent,
      success,
      { changeType },
      'medium'
    );
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    activityType: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.logAuthEvent(
      'suspicious_activity',
      userId,
      ipAddress,
      userAgent,
      false,
      { activityType, ...details },
      'high'
    );
  }

  /**
   * Log account lockout
   */
  async logAccountLockout(
    userId: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
    lockDuration: number
  ): Promise<void> {
    await this.logAuthEvent(
      'account_locked',
      userId,
      ipAddress,
      userAgent,
      false,
      { reason, lockDuration },
      'high'
    );
  }

  /**
   * Log registration event
   */
  async logRegistration(
    userId: string | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    registrationType: 'email' | 'oauth' | 'invite'
  ): Promise<void> {
    await this.logAuthEvent(
      'registration',
      userId,
      ipAddress,
      userAgent,
      success,
      { email, registrationType },
      'low'
    );
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(
    userId: string,
    targetUserId: string,
    ipAddress: string,
    userAgent: string,
    changeType: 'role_change' | 'permission_grant' | 'permission_revoke',
    details: Record<string, any>
  ): Promise<void> {
    await this.logAuthEvent(
      'permission_change',
      userId,
      ipAddress,
      userAgent,
      true,
      { targetUserId, changeType, ...details },
      'medium'
    );
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditEvent[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch user audit logs:', error);
      return [];
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<SecurityMetrics> {
    try {
      const supabase = createClient();
      
      const startTime = this.getTimeRangeStart(timeRange);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('event_type, success, risk_level')
        .gte('timestamp', startTime);

      if (error) {
        console.error('Error fetching security metrics:', error);
        return this.getEmptyMetrics();
      }

      const metrics = this.calculateMetrics(data || []);
      return metrics;
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    criteria: {
      userId?: string;
      eventType?: string;
      ipAddress?: string;
      riskLevel?: string;
      startTime?: string;
      endTime?: string;
    },
    limit: number = 100
  ): Promise<AuditEvent[]> {
    try {
      const supabase = createClient();
      
      let query = supabase.from('audit_logs').select('*');

      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }
      if (criteria.eventType) {
        query = query.eq('event_type', criteria.eventType);
      }
      if (criteria.ipAddress) {
        query = query.eq('ip_address', criteria.ipAddress);
      }
      if (criteria.riskLevel) {
        query = query.eq('risk_level', criteria.riskLevel);
      }
      if (criteria.startTime) {
        query = query.gte('timestamp', criteria.startTime);
      }
      if (criteria.endTime) {
        query = query.lte('timestamp', criteria.endTime);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      return [];
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const supabase = createClient();
      const cutoffDate = new Date(Date.now() - PRODUCTION_AUTH_CONFIG.audit.retention);
      
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up audit logs:', error);
      } else {
        console.log('Audit log cleanup completed for logs older than:', cutoffDate);
      }
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
    }
  }

  // Private methods
  private async queueEvent(event: AuditEvent): Promise<void> {
    this.eventQueue.push(event);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.eventQueue.splice(0, 50); // Process in batches of 50
      await this.persistEvents(batch);
    } catch (error) {
      console.error('Error processing event queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Process remaining events if any
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processEventQueue(), 1000);
      }
    }
  }

  private async persistEvents(events: AuditEvent[]): Promise<void> {
    try {
      const supabase = createClient();
      
      const records = events.map(event => ({
        event_type: event.eventType,
        user_id: event.userId,
        session_id: event.sessionId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        timestamp: event.timestamp,
        success: event.success,
        details: event.details,
        risk_level: event.riskLevel,
        metadata: event.metadata
      }));

      const { error } = await supabase
        .from('audit_logs')
        .insert(records);

      if (error) {
        console.error('Error persisting audit events:', error);
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Failed to persist events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private assessLoginRiskLevel(
    success: boolean,
    failureReason?: string,
    ipAddress?: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (success) return 'low';

    if (failureReason?.includes('locked') || failureReason?.includes('blocked')) {
      return 'high';
    }

    if (failureReason?.includes('invalid') || failureReason?.includes('wrong')) {
      return 'medium';
    }

    return 'medium';
  }

  private async incrementFailedLogins(userId: string): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase.rpc('increment_failed_logins', {
        user_id: userId
      });

      if (error) {
        console.error('Error incrementing failed logins:', error);
      }
    } catch (error) {
      console.error('Failed to increment failed logins:', error);
    }
  }

  private async resetFailedLogins(userId: string): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          failed_login_attempts: 0,
          account_locked_until: null
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting failed logins:', error);
      }
    } catch (error) {
      console.error('Failed to reset failed logins:', error);
    }
  }

  private getTimeRangeStart(timeRange: 'day' | 'week' | 'month'): string {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private calculateMetrics(data: any[]): SecurityMetrics {
    const metrics = {
      totalEvents: data.length,
      successfulLogins: 0,
      failedLogins: 0,
      accountLockouts: 0,
      suspiciousActivities: 0,
      passwordChanges: 0,
      lastUpdated: new Date().toISOString()
    };

    data.forEach(event => {
      switch (event.event_type) {
        case 'login':
          if (event.success) {
            metrics.successfulLogins++;
          } else {
            metrics.failedLogins++;
          }
          break;
        case 'account_locked':
          metrics.accountLockouts++;
          break;
        case 'suspicious_activity':
          metrics.suspiciousActivities++;
          break;
        case 'password_change':
          if (event.success) {
            metrics.passwordChanges++;
          }
          break;
      }
    });

    return metrics;
  }

  private getEmptyMetrics(): SecurityMetrics {
    return {
      totalEvents: 0,
      successfulLogins: 0,
      failedLogins: 0,
      accountLockouts: 0,
      suspiciousActivities: 0,
      passwordChanges: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  private startBackgroundProcessing(): void {
    // Process queue every 5 seconds
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processEventQueue();
      }
    }, 5000);

    // Cleanup old logs daily
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }
}

// SQL for audit_logs table (to be added to migration)
export const AUDIT_LOGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  details JSONB DEFAULT '{}',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" 
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" 
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Admin users can view all audit logs
CREATE POLICY "Admins can view all audit logs" 
  ON audit_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to increment failed logins
CREATE OR REPLACE FUNCTION increment_failed_logins(user_id UUID)
RETURNS void AS $$
DECLARE
  current_attempts INTEGER;
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '15 minutes';
BEGIN
  -- Get current failed attempts
  SELECT COALESCE(failed_login_attempts, 0) INTO current_attempts
  FROM user_profiles 
  WHERE user_profiles.user_id = increment_failed_logins.user_id;
  
  -- Increment attempts
  current_attempts := current_attempts + 1;
  
  -- Update user profile
  IF current_attempts >= max_attempts THEN
    -- Lock account
    UPDATE user_profiles 
    SET 
      failed_login_attempts = current_attempts,
      account_locked_until = NOW() + lockout_duration
    WHERE user_profiles.user_id = increment_failed_logins.user_id;
  ELSE
    -- Just increment attempts
    UPDATE user_profiles 
    SET failed_login_attempts = current_attempts
    WHERE user_profiles.user_id = increment_failed_logins.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
export default auditLogger;