// Temporary stub for security monitor during deployment

export class SecurityMonitor {
  static logSecurityEvent(event: any): void {
    console.log('[Security Event]', event);
  }
  
  static logAPIRequest(request: any): void {
    console.log('[API Request]', request);
  }
  
  static getSecurityMetrics(timeWindow?: number): any {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      rateLimitViolations: 0,
      errorRate: 0,
      avgResponseTime: 0,
      xssAttempts: 0,
      sqlInjectionAttempts: 0
    };
  }
  
  static getRecentEvents(limit: number): any[] {
    return [];
  }
  
  static analyzeThreatLevel(): any {
    return {
      level: 'low',
      threats: []
    };
  }
}

export default SecurityMonitor;