/**
 * 🛡️ Enhanced Session Security Management
 * 7P Education Platform - Advanced Session Protection
 * 
 * Builds upon existing AuthProtectionMiddleware with additional security features
 */

import { kv } from '@vercel/kv';
import { PRODUCTION_AUTH_CONFIG } from '@/lib/auth/production-config';
import { auditLogger } from '@/lib/auth/audit';
import { AUDIT_EVENTS } from '@/lib/auth/config';

interface EnhancedSessionData {
  userId: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  isValid: boolean;
  
  // Enhanced security metadata
  geolocation?: {
    country: string;
    city: string;
    timezone: string;
  };
  riskScore: number;
  suspiciousActivityCount: number;
  lastSecurityCheck: number;
  mfaVerified: boolean;
  deviceTrusted: boolean;
  
  // Activity tracking
  pageViews: number;
  apiCallsCount: number;
  lastSecurityEvent?: string;
  warningIssued?: boolean;
}

interface SecurityThreat {
  type: 'IP_CHANGE' | 'DEVICE_CHANGE' | 'SUSPICIOUS_ACTIVITY' | 'CONCURRENT_LIMIT' | 'RAPID_REQUESTS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  metadata: Record<string, any>;
  riskIncrease: number;
}

export class EnhancedSessionSecurity {
  private static readonly SECURITY_THRESHOLDS = {
    MAX_RISK_SCORE: 100,
    HIGH_RISK_THRESHOLD: 75,
    MEDIUM_RISK_THRESHOLD: 50,
    MAX_SUSPICIOUS_ACTIVITIES: 5,
    MAX_API_CALLS_PER_MINUTE: 60,
    MAX_PAGE_VIEWS_PER_MINUTE: 20,
    SECURITY_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
    GEOLOCATION_CHANGE_RISK: 25,
    DEVICE_CHANGE_RISK: 30,
    IP_CHANGE_RISK: 15
  };

  /**
   * 🔍 Enhanced Session Validation with Risk Assessment
   */
  static async validateSessionWithRiskAssessment(
    sessionId: string,
    userId: string,
    request: {
      ipAddress: string;
      userAgent: string;
      path: string;
      method: string;
    }
  ): Promise<{
    isValid: boolean;
    riskScore: number;
    threats: SecurityThreat[];
    actionRequired: 'NONE' | 'MFA_REQUIRED' | 'FORCE_LOGOUT' | 'SECURITY_REVIEW';
    reason?: string;
  }> {
    const sessionKey = `enhanced_session:${userId}:${sessionId}`;
    let sessionData: EnhancedSessionData | null = await kv.get(sessionKey);
    
    if (!sessionData) {
      return {
        isValid: false,
        riskScore: 100,
        threats: [],
        actionRequired: 'FORCE_LOGOUT',
        reason: 'SESSION_NOT_FOUND'
      };
    }

    const now = Date.now();
    const threats: SecurityThreat[] = [];
    let riskScore = sessionData.riskScore;

    // 1. Check basic session validity
    const basicValidation = await this.performBasicSessionChecks(sessionData, now);
    if (!basicValidation.isValid) {
      return {
        isValid: false,
        riskScore: 100,
        threats: [],
        actionRequired: 'FORCE_LOGOUT',
        reason: basicValidation.reason
      };
    }

    // 2. Detect and assess security threats
    const threatAssessment = await this.detectSecurityThreats(sessionData, request, now);
    threats.push(...threatAssessment.threats);
    riskScore += threatAssessment.riskIncrease;

    // 3. Update activity counters
    await this.updateActivityCounters(sessionData, request, now);

    // 4. Perform periodic security checks
    if (now - sessionData.lastSecurityCheck > this.SECURITY_THRESHOLDS.SECURITY_CHECK_INTERVAL) {
      const securityCheck = await this.performPeriodicSecurityCheck(sessionData, now);
      threats.push(...securityCheck.threats);
      riskScore += securityCheck.riskIncrease;
      sessionData.lastSecurityCheck = now;
    }

    // 5. Determine required action based on risk score
    const actionRequired = this.determineSecurityAction(riskScore, threats);

    // 6. Update session data
    sessionData.lastActivity = now;
    sessionData.riskScore = Math.min(riskScore, this.SECURITY_THRESHOLDS.MAX_RISK_SCORE);
    sessionData.ipAddress = request.ipAddress;
    sessionData.userAgent = request.userAgent;

    // 7. Save updated session
    await kv.set(sessionKey, sessionData, { 
      ex: PRODUCTION_AUTH_CONFIG.session.absoluteTimeout / 1000 
    });

    // 8. Log high-risk activities
    if (riskScore >= this.SECURITY_THRESHOLDS.HIGH_RISK_THRESHOLD) {
      await this.logHighRiskActivity(userId, sessionId, {
        riskScore,
        threats,
        actionRequired,
        sessionData: {
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          path: request.path,
          method: request.method
        }
      });
    }

    return {
      isValid: true,
      riskScore,
      threats,
      actionRequired,
    };
  }

  /**
   * ⚡ Create Enhanced Session
   */
  static async createEnhancedSession(
    userId: string,
    sessionId: string,
    metadata: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint: string;
      mfaVerified?: boolean;
      deviceTrusted?: boolean;
      geolocation?: any;
    }
  ): Promise<void> {
    const now = Date.now();
    const sessionKey = `enhanced_session:${userId}:${sessionId}`;

    const sessionData: EnhancedSessionData = {
      userId,
      sessionId,
      createdAt: now,
      lastActivity: now,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceFingerprint: metadata.deviceFingerprint,
      isValid: true,
      geolocation: metadata.geolocation,
      riskScore: metadata.mfaVerified ? 10 : 25, // Lower initial risk for MFA users
      suspiciousActivityCount: 0,
      lastSecurityCheck: now,
      mfaVerified: metadata.mfaVerified || false,
      deviceTrusted: metadata.deviceTrusted || false,
      pageViews: 0,
      apiCallsCount: 0
    };

    await kv.set(sessionKey, sessionData, { 
      ex: PRODUCTION_AUTH_CONFIG.session.absoluteTimeout / 1000 
    });

    // Log session creation
    await auditLogger.logSecurity(
      AUDIT_EVENTS.SESSION_CREATED,
      userId,
      {
        sessionId,
        ipAddress: metadata.ipAddress,
        deviceFingerprint: metadata.deviceFingerprint,
        initialRiskScore: sessionData.riskScore,
        mfaVerified: metadata.mfaVerified
      },
      'medium'
    );
  }

  /**
   * 🔐 Basic Session Validity Checks
   */
  private static async performBasicSessionChecks(
    sessionData: EnhancedSessionData,
    now: number
  ): Promise<{ isValid: boolean; reason?: string }> {
    // Check session age
    const sessionAge = now - sessionData.createdAt;
    if (sessionAge > PRODUCTION_AUTH_CONFIG.session.absoluteTimeout) {
      return { isValid: false, reason: 'SESSION_EXPIRED' };
    }

    // Check inactivity
    const inactivityTime = now - sessionData.lastActivity;
    if (inactivityTime > PRODUCTION_AUTH_CONFIG.session.inactivityTimeout) {
      return { isValid: false, reason: 'INACTIVE_SESSION' };
    }

    // Check if session is marked as invalid
    if (!sessionData.isValid) {
      return { isValid: false, reason: 'SESSION_INVALIDATED' };
    }

    return { isValid: true };
  }

  /**
   * 🚨 Detect Security Threats
   */
  private static async detectSecurityThreats(
    sessionData: EnhancedSessionData,
    request: { ipAddress: string; userAgent: string; path: string; method: string },
    now: number
  ): Promise<{ threats: SecurityThreat[]; riskIncrease: number }> {
    const threats: SecurityThreat[] = [];
    let riskIncrease = 0;

    // 1. IP Address Change Detection
    if (sessionData.ipAddress !== request.ipAddress) {
      const threat: SecurityThreat = {
        type: 'IP_CHANGE',
        severity: 'MEDIUM',
        timestamp: now,
        metadata: {
          oldIP: sessionData.ipAddress,
          newIP: request.ipAddress,
          geolocationChanged: await this.checkGeolocationChange(
            sessionData.ipAddress, 
            request.ipAddress
          )
        },
        riskIncrease: this.SECURITY_THRESHOLDS.IP_CHANGE_RISK
      };
      threats.push(threat);
      riskIncrease += threat.riskIncrease;
    }

    // 2. User Agent / Device Change Detection
    if (sessionData.userAgent !== request.userAgent) {
      const threat: SecurityThreat = {
        type: 'DEVICE_CHANGE',
        severity: 'HIGH',
        timestamp: now,
        metadata: {
          oldUserAgent: sessionData.userAgent,
          newUserAgent: request.userAgent
        },
        riskIncrease: this.SECURITY_THRESHOLDS.DEVICE_CHANGE_RISK
      };
      threats.push(threat);
      riskIncrease += threat.riskIncrease;
    }

    // 3. Rapid Request Detection
    const rapidRequests = await this.checkRapidRequestPattern(sessionData.userId, now);
    if (rapidRequests.isRapid) {
      const threat: SecurityThreat = {
        type: 'RAPID_REQUESTS',
        severity: 'MEDIUM',
        timestamp: now,
        metadata: {
          requestCount: rapidRequests.count,
          timeWindow: rapidRequests.timeWindow
        },
        riskIncrease: 10
      };
      threats.push(threat);
      riskIncrease += threat.riskIncrease;
    }

    // 4. Suspicious Activity Pattern Detection
    const suspiciousActivity = await this.analyzeSuspiciousActivity(sessionData, request);
    if (suspiciousActivity.detected) {
      const threat: SecurityThreat = {
        type: 'SUSPICIOUS_ACTIVITY',
        severity: suspiciousActivity.severity,
        timestamp: now,
        metadata: suspiciousActivity.metadata,
        riskIncrease: suspiciousActivity.riskIncrease
      };
      threats.push(threat);
      riskIncrease += threat.riskIncrease;
    }

    return { threats, riskIncrease };
  }

  /**
   * 📊 Update Activity Counters
   */
  private static async updateActivityCounters(
    sessionData: EnhancedSessionData,
    request: { path: string; method: string },
    now: number
  ): Promise<void> {
    // Count API calls
    if (request.path.startsWith('/api/')) {
      sessionData.apiCallsCount++;
    } else {
      sessionData.pageViews++;
    }
  }

  /**
   * 🔍 Periodic Security Check
   */
  private static async performPeriodicSecurityCheck(
    sessionData: EnhancedSessionData,
    now: number
  ): Promise<{ threats: SecurityThreat[]; riskIncrease: number }> {
    const threats: SecurityThreat[] = [];
    let riskIncrease = 0;

    // Check for concurrent sessions
    const concurrentSessions = await this.checkConcurrentSessions(sessionData.userId);
    if (concurrentSessions > PRODUCTION_AUTH_CONFIG.session.maxConcurrentSessions) {
      const threat: SecurityThreat = {
        type: 'CONCURRENT_LIMIT',
        severity: 'HIGH',
        timestamp: now,
        metadata: {
          currentSessions: concurrentSessions,
          maxAllowed: PRODUCTION_AUTH_CONFIG.session.maxConcurrentSessions
        },
        riskIncrease: 20
      };
      threats.push(threat);
      riskIncrease += threat.riskIncrease;
    }

    // Natural risk score decay for good behavior
    if (sessionData.suspiciousActivityCount === 0 && sessionData.riskScore > 0) {
      riskIncrease -= 5; // Reduce risk for good behavior
    }

    return { threats, riskIncrease };
  }

  /**
   * 🎯 Determine Security Action
   */
  private static determineSecurityAction(
    riskScore: number,
    threats: SecurityThreat[]
  ): 'NONE' | 'MFA_REQUIRED' | 'FORCE_LOGOUT' | 'SECURITY_REVIEW' {
    // Critical threats require immediate logout
    const hasCriticalThreat = threats.some(t => t.severity === 'CRITICAL');
    if (hasCriticalThreat || riskScore >= this.SECURITY_THRESHOLDS.MAX_RISK_SCORE) {
      return 'FORCE_LOGOUT';
    }

    // High risk requires additional verification
    if (riskScore >= this.SECURITY_THRESHOLDS.HIGH_RISK_THRESHOLD) {
      const hasDeviceChange = threats.some(t => t.type === 'DEVICE_CHANGE');
      return hasDeviceChange ? 'SECURITY_REVIEW' : 'MFA_REQUIRED';
    }

    // Medium risk gets flagged but allowed
    if (riskScore >= this.SECURITY_THRESHOLDS.MEDIUM_RISK_THRESHOLD) {
      return 'SECURITY_REVIEW';
    }

    return 'NONE';
  }

  /**
   * 🌍 Check Geolocation Change
   */
  private static async checkGeolocationChange(oldIP: string, newIP: string): Promise<boolean> {
    // Placeholder - in production, integrate with IP geolocation service
    return oldIP.split('.')[0] !== newIP.split('.')[0]; // Simple check
  }

  /**
   * ⚡ Check Rapid Request Pattern
   */
  private static async checkRapidRequestPattern(
    userId: string,
    now: number
  ): Promise<{ isRapid: boolean; count: number; timeWindow: number }> {
    const requestKey = `requests:${userId}`;
    const timeWindow = 60000; // 1 minute
    
    // Get request count in last minute
    const requests = await kv.get<number>(requestKey) || 0;
    
    return {
      isRapid: requests > this.SECURITY_THRESHOLDS.MAX_API_CALLS_PER_MINUTE,
      count: requests,
      timeWindow
    };
  }

  /**
   * 🕵️ Analyze Suspicious Activity
   */
  private static async analyzeSuspiciousActivity(
    sessionData: EnhancedSessionData,
    request: { path: string; method: string }
  ): Promise<{
    detected: boolean;
    severity: SecurityThreat['severity'];
    metadata: Record<string, any>;
    riskIncrease: number;
  }> {
    // Check for admin endpoint access without admin role
    if (request.path.includes('/admin/') && !sessionData.deviceTrusted) {
      return {
        detected: true,
        severity: 'HIGH',
        metadata: { suspiciousPath: request.path },
        riskIncrease: 25
      };
    }

    // Check for unusual request patterns
    if (request.method === 'DELETE' && sessionData.apiCallsCount > 10) {
      return {
        detected: true,
        severity: 'MEDIUM', 
        metadata: { unusualDeletePattern: true },
        riskIncrease: 15
      };
    }

    return {
      detected: false,
      severity: 'LOW',
      metadata: {},
      riskIncrease: 0
    };
  }

  /**
   * 👥 Check Concurrent Sessions
   */
  private static async checkConcurrentSessions(userId: string): Promise<number> {
    const sessions = [];
    for await (const key of kv.scanIterator({ match: `enhanced_session:${userId}:*` })) {
      sessions.push(key);
    }
    return sessions.length;
  }

  /**
   * 📊 Log High-Risk Activity
   */
  private static async logHighRiskActivity(
    userId: string,
    sessionId: string,
    activity: {
      riskScore: number;
      threats: SecurityThreat[];
      actionRequired: string;
      sessionData: any;
    }
  ): Promise<void> {
    await auditLogger.logSecurity(
      AUDIT_EVENTS.HIGH_RISK_ACTIVITY,
      userId,
      {
        sessionId,
        riskScore: activity.riskScore,
        threatCount: activity.threats.length,
        highestThreatSeverity: activity.threats.reduce(
          (max, t) => t.severity > max ? t.severity : max, 
          'LOW'
        ),
        actionRequired: activity.actionRequired,
        ...activity.sessionData
      },
      'high'
    );
  }

  /**
   * 🧹 Cleanup Expired Sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();
    
    // Scan all enhanced sessions
    for await (const key of kv.scanIterator({ match: 'enhanced_session:*' })) {
      try {
        const sessionData: EnhancedSessionData | null = await kv.get(key);
        if (!sessionData) continue;
        
        const sessionAge = now - sessionData.createdAt;
        const inactivityTime = now - sessionData.lastActivity;
        
        // Check if session should be cleaned up
        if (sessionAge > PRODUCTION_AUTH_CONFIG.session.absoluteTimeout ||
            inactivityTime > PRODUCTION_AUTH_CONFIG.session.inactivityTimeout ||
            !sessionData.isValid) {
          
          await kv.del(key);
          cleanedCount++;
          
          // Log cleanup
          await auditLogger.logSecurity(
            'SESSION_CLEANUP',
            sessionData.userId,
            {
              sessionId: sessionData.sessionId,
              reason: sessionAge > PRODUCTION_AUTH_CONFIG.session.absoluteTimeout ? 'EXPIRED' : 'INACTIVE',
              sessionAge: Math.floor(sessionAge / 1000),
              inactivityTime: Math.floor(inactivityTime / 1000)
            },
            'low'
          );
        }
      } catch (error) {
        console.error(`Failed to cleanup session ${key}:`, error);
      }
    }
    
    return cleanedCount;
  }
}

export default EnhancedSessionSecurity;