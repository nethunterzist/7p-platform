/**
 * Audit Logging Service
 * Enterprise-grade audit trail for security and compliance
 */

import { supabase } from '@/lib/supabase';
import { AuditLog } from '@/lib/types/auth';

export interface AuditLogEntry {
  action: string;
  user_id?: string;
  organization_id?: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditLogger {
  private static instance: AuditLogger;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  constructor() {
    this.startBatchFlush();
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Get request context if available
      const context = this.getRequestContext();
      
      const auditEntry: AuditLogEntry = {
        ...entry,
        ip_address: entry.ip_address || context.ip_address,
        user_agent: entry.user_agent || context.user_agent,
        severity: entry.severity || 'low'
      };

      // Add to buffer for batch processing
      this.buffer.push(auditEntry);

      // If buffer is full or severity is critical, flush immediately
      if (this.buffer.length >= this.BATCH_SIZE || entry.severity === 'critical') {
        await this.flush();
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw error to avoid breaking application flow
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: string,
    userId?: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    await this.log({
      action,
      user_id: userId,
      resource: 'auth',
      details,
      severity
    });
  }

  /**
   * Log user management events
   */
  async logUser(
    action: string,
    userId: string,
    resourceId?: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    await this.log({
      action,
      user_id: userId,
      resource: 'user',
      resource_id: resourceId,
      details,
      severity
    });
  }

  /**
   * Log organization events
   */
  async logOrganization(
    action: string,
    organizationId: string,
    userId?: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    await this.log({
      action,
      user_id: userId,
      organization_id: organizationId,
      resource: 'organization',
      resource_id: organizationId,
      details,
      severity
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: string,
    userId?: string,
    details?: Record<string, any>,
    severity: 'high' | 'critical' = 'high'
  ): Promise<void> {
    await this.log({
      action,
      user_id: userId,
      resource: 'security',
      details,
      severity
    });
  }

  /**
   * Log API access events
   */
  async logAPI(
    action: string,
    userId?: string,
    endpoint?: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' = 'low'
  ): Promise<void> {
    await this.log({
      action,
      user_id: userId,
      resource: 'api',
      resource_id: endpoint,
      details,
      severity
    });
  }

  /**
   * Flush buffer to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const auditLogs = entries.map(entry => ({
        // Remove manual ID - let database auto-generate UUID
        user_id: entry.user_id,
        organization_id: entry.organization_id,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resource_id,
        ip_address: entry.ip_address && entry.ip_address !== 'unknown' ? entry.ip_address : null,
        user_agent: entry.user_agent || 'unknown',
        details: entry.details || {},
        severity: entry.severity || 'low'
        // Remove manual created_at - let database use DEFAULT NOW()
      }));

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditLogs);

      if (error) {
        console.error('Failed to insert audit logs:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          entriesCount: entries.length,
          sampleEntry: entries[0]
        });
        // Re-add entries to buffer for retry
        this.buffer.unshift(...entries);
      } else {
        console.log(`✅ Successfully inserted ${auditLogs.length} audit log entries`);
      }
    } catch (error) {
      console.error('Audit log flush error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        entriesCount: entries.length,
        sampleEntry: entries[0]
      });
      // Re-add entries to buffer for retry
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(async () => {
      await this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop batch flush timer
   */
  public stopBatchFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }


  /**
   * Get request context (IP address, User-Agent, etc.)
   */
  private getRequestContext(): { ip_address?: string; user_agent?: string } {
    // In a browser environment, we can't get the real IP address
    // This would typically be handled by middleware in a server environment
    if (typeof window !== 'undefined') {
      return {
        user_agent: navigator.userAgent
      };
    }

    return {};
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters: {
    user_id?: string;
    organization_id?: string;
    action?: string;
    resource?: string;
    severity?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AuditLog[]; count: number }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.resource) {
        query = query.eq('resource', filters.resource);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: data as AuditLog[],
        count: count || 0
      };
    } catch (error) {
      console.error('Audit log query error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(organizationId?: string): Promise<{
    total_events: number;
    events_by_severity: Record<string, number>;
    events_by_resource: Record<string, number>;
    recent_events: AuditLog[];
  }> {
    try {
      let query = supabase.from('audit_logs').select('*');
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const events = data as AuditLog[];

      // Calculate statistics
      const eventsBySeverity: Record<string, number> = {};
      const eventsByResource: Record<string, number> = {};

      events.forEach(event => {
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        eventsByResource[event.resource] = (eventsByResource[event.resource] || 0) + 1;
      });

      return {
        total_events: events.length,
        events_by_severity: eventsBySeverity,
        events_by_resource: eventsByResource,
        recent_events: events.slice(0, 10)
      };
    } catch (error) {
      console.error('Audit statistics error:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs(
    filters: Parameters<typeof this.queryLogs>[0],
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const { data } = await this.queryLogs({ ...filters, limit: 10000 });

      if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Audit log export error:', error);
      throw error;
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'id',
      'user_id',
      'organization_id',
      'action',
      'resource',
      'resource_id',
      'ip_address',
      'user_agent',
      'severity',
      'created_at',
      'details'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.user_id || '',
        log.organization_id || '',
        log.action,
        log.resource,
        log.resource_id || '',
        log.ip_address,
        `"${log.user_agent}"`,
        log.severity,
        log.created_at,
        `"${JSON.stringify(log.details || {})}"`
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Audit log cleanup error:', error);
      throw error;
    }
  }
}

export const auditLogger = AuditLogger.getInstance();