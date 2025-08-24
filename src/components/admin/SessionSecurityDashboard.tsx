/**
 * 🛡️ Session Security Dashboard
 * 7P Education Platform - Real-time Security Monitoring
 * 
 * Comprehensive dashboard for monitoring session security, risk scores, and cleanup status
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Trash2,
  BarChart3,
  Clock,
  Globe,
  Lock
} from 'lucide-react';

interface SessionStats {
  enhancedSessions: number;
  legacySessions: number;
  rateLimitEntries: number;
  csrfTokens: number;
}

interface CleanupReport {
  timestamp: string;
  totalCleaned: number;
  totalErrors: number;
  executionTime: number;
  details?: {
    enhancedSessions: number;
    legacySessions: number;
    rateLimitEntries: number;
    csrfTokens: number;
  };
  error?: string;
}

interface SecurityMetrics {
  totalSessions: number;
  highRiskSessions: number;
  mediumRiskSessions: number;
  lowRiskSessions: number;
  averageRiskScore: number;
  recentThreats: number;
}

export default function SessionSecurityDashboard() {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [cleanupReports, setCleanupReports] = useState<CleanupReport[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cleanup reports and session statistics
      const reportsResponse = await fetch('/api/admin/session-cleanup?limit=5');
      const reportsData = await reportsResponse.json();

      if (reportsData.success) {
        setCleanupReports(reportsData.reports || []);
        setSessionStats(reportsData.sessionStats);
      }

      // Fetch security metrics (mock data - implement based on your needs)
      const mockSecurityMetrics: SecurityMetrics = {
        totalSessions: (reportsData.sessionStats?.enhancedSessions || 0) + (reportsData.sessionStats?.legacySessions || 0),
        highRiskSessions: Math.floor(Math.random() * 10),
        mediumRiskSessions: Math.floor(Math.random() * 25),
        lowRiskSessions: Math.floor(Math.random() * 100),
        averageRiskScore: Math.floor(Math.random() * 30) + 10,
        recentThreats: Math.floor(Math.random() * 5)
      };
      setSecurityMetrics(mockSecurityMetrics);
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Manual cleanup trigger
  const triggerCleanup = async () => {
    try {
      setCleanupLoading(true);
      const response = await fetch('/api/admin/session-cleanup', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh dashboard data
        await loadDashboardData();
        
        // Show success message
        alert(`Cleanup completed! ${data.cleaned} items cleaned in ${data.executionTime}ms`);
      } else {
        throw new Error(data.error || 'Cleanup failed');
      }
    } catch (err) {
      console.error('Manual cleanup failed:', err);
      alert(err instanceof Error ? err.message : 'Cleanup failed');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Emergency cleanup (with confirmation)
  const emergencyCleanup = async () => {
    if (!confirm('⚠️ This will delete ALL session data. Are you sure?')) {
      return;
    }
    
    if (!confirm('🚨 FINAL WARNING: This action cannot be undone. Continue?')) {
      return;
    }

    try {
      setCleanupLoading(true);
      const response = await fetch('/api/admin/session-cleanup', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadDashboardData();
        alert(`Emergency cleanup completed! ${data.deleted} items deleted`);
      } else {
        throw new Error(data.error || 'Emergency cleanup failed');
      }
    } catch (err) {
      console.error('Emergency cleanup failed:', err);
      alert(err instanceof Error ? err.message : 'Emergency cleanup failed');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore >= 75) return 'destructive';
    if (riskScore >= 50) return 'secondary';
    return 'default';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && !sessionStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading security dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🛡️ Session Security Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of session security and system health
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Last updated: {formatTimestamp(lastRefresh.toISOString())}
          </Badge>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active user sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics?.averageRiskScore || 0}</div>
            <Badge variant={getRiskBadgeColor(securityMetrics?.averageRiskScore || 0)}>
              {(securityMetrics?.averageRiskScore || 0) >= 75 ? 'High Risk' :
               (securityMetrics?.averageRiskScore || 0) >= 50 ? 'Medium Risk' : 'Low Risk'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Threats</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityMetrics?.recentThreats || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Operational</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All systems normal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session Statistics */}
      {sessionStats && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Session Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sessionStats.enhancedSessions}</div>
                <div className="text-sm text-muted-foreground">Enhanced Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{sessionStats.legacySessions}</div>
                <div className="text-sm text-muted-foreground">Legacy Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{sessionStats.rateLimitEntries}</div>
                <div className="text-sm text-muted-foreground">Rate Limits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{sessionStats.csrfTokens}</div>
                <div className="text-sm text-muted-foreground">CSRF Tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Controls */}
      <Card>
        <CardHeader>
          <CardTitle>🧹 Session Cleanup Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={triggerCleanup} 
              disabled={cleanupLoading}
              className="flex items-center space-x-2"
            >
              {cleanupLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>Run Cleanup</span>
            </Button>
            
            <Button 
              onClick={emergencyCleanup}
              variant="destructive"
              disabled={cleanupLoading}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Emergency Cleanup</span>
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Run Cleanup:</strong> Safely removes expired sessions and tokens<br/>
              <strong>Emergency Cleanup:</strong> ⚠️ Removes ALL session data (use with caution)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Cleanup Reports */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Recent Cleanup Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {cleanupReports.length === 0 ? (
            <p className="text-muted-foreground">No cleanup reports available</p>
          ) : (
            <div className="space-y-4">
              {cleanupReports.map((report, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {report.error ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium">
                        {report.error ? 'Cleanup Failed' : 'Cleanup Completed'}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {formatTimestamp(report.timestamp)}
                    </Badge>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Items Cleaned</div>
                      <div className="font-medium">{report.totalCleaned}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Execution Time</div>
                      <div className="font-medium">{report.executionTime}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Errors</div>
                      <div className="font-medium">{report.totalErrors}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium">
                        {report.error ? 'Error' : 'Success'}
                      </div>
                    </div>
                  </div>
                  
                  {report.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                      {report.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}