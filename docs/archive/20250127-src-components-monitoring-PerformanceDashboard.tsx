'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Clock, 
  Zap, 
  Database, 
  Globe, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PERFORMANCE_THRESHOLDS } from '@/lib/monitoring/performance';

interface PerformanceMetrics {
  webVitals: {
    lcp: number;
    fid: number;
    cls: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  apiMetrics: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    slowQueries: number;
  };
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
    activeConnections: number;
  };
  userMetrics: {
    activeUsers: number;
    bounceRate: number;
    sessionDuration: number;
    pageViews: number;
  };
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchMetrics();
    
    // Update metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // In a real implementation, this would fetch from your monitoring API
      // For now, we'll simulate with mock data
      const mockMetrics: PerformanceMetrics = {
        webVitals: {
          lcp: 1800,
          fid: 85,
          cls: 0.08,
          rating: 'good',
        },
        apiMetrics: {
          averageResponseTime: 245,
          errorRate: 0.5,
          throughput: 150,
          slowQueries: 3,
        },
        systemMetrics: {
          memoryUsage: 65,
          cpuUsage: 42,
          uptime: 2845200, // seconds
          activeConnections: 23,
        },
        userMetrics: {
          activeUsers: 87,
          bounceRate: 35,
          sessionDuration: 420, // seconds
          pageViews: 1250,
        },
      };

      setMetrics(mockMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Badge variant="outline" className="text-green-600">
          <CheckCircle className="w-4 h-4 mr-1" />
          All Systems Operational
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="webvitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Core Web Vitals Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Core Web Vitals</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Good</div>
                <p className="text-xs text-muted-foreground">
                  All metrics within thresholds
                </p>
              </CardContent>
            </Card>

            {/* API Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.apiMetrics.averageResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  {getPerformanceRating(metrics.apiMetrics.averageResponseTime, 'api')}
                </p>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.apiMetrics.errorRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.apiMetrics.errorRate < 1 ? 'Excellent' : 'Needs attention'}
                </p>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.userMetrics.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Currently online
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webvitals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Largest Contentful Paint */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Largest Contentful Paint</CardTitle>
                <CardDescription>LCP measures loading performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.webVitals.lcp}ms</span>
                  <Badge variant={getWebVitalBadgeVariant(metrics.webVitals.lcp, 'LCP')}>
                    {getWebVitalRating(metrics.webVitals.lcp, 'LCP')}
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((metrics.webVitals.lcp / PERFORMANCE_THRESHOLDS.LCP) * 100, 100)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Target: &lt; {PERFORMANCE_THRESHOLDS.LCP}ms
                </p>
              </CardContent>
            </Card>

            {/* First Input Delay */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">First Input Delay</CardTitle>
                <CardDescription>FID measures interactivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.webVitals.fid}ms</span>
                  <Badge variant={getWebVitalBadgeVariant(metrics.webVitals.fid, 'FID')}>
                    {getWebVitalRating(metrics.webVitals.fid, 'FID')}
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((metrics.webVitals.fid / PERFORMANCE_THRESHOLDS.FID) * 100, 100)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Target: &lt; {PERFORMANCE_THRESHOLDS.FID}ms
                </p>
              </CardContent>
            </Card>

            {/* Cumulative Layout Shift */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cumulative Layout Shift</CardTitle>
                <CardDescription>CLS measures visual stability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.webVitals.cls.toFixed(3)}</span>
                  <Badge variant={getWebVitalBadgeVariant(metrics.webVitals.cls, 'CLS')}>
                    {getWebVitalRating(metrics.webVitals.cls, 'CLS')}
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((metrics.webVitals.cls / PERFORMANCE_THRESHOLDS.CLS) * 100, 100)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Target: &lt; {PERFORMANCE_THRESHOLDS.CLS}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Response times and throughput</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Average Response Time</span>
                    <span className="font-medium">{metrics.apiMetrics.averageResponseTime}ms</span>
                  </div>
                  <Progress value={Math.min((metrics.apiMetrics.averageResponseTime / 1000) * 100, 100)} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Throughput</span>
                    <span className="font-medium">{metrics.apiMetrics.throughput} req/min</span>
                  </div>
                  <Progress value={Math.min((metrics.apiMetrics.throughput / 200) * 100, 100)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Monitoring</CardTitle>
                <CardDescription>Error rates and slow queries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Error Rate</span>
                    <span className="font-medium text-red-600">{metrics.apiMetrics.errorRate}%</span>
                  </div>
                  <Progress value={metrics.apiMetrics.errorRate} className="w-full" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Slow Queries</span>
                    <span className="font-medium">{metrics.apiMetrics.slowQueries}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Memory and CPU usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Memory Usage</span>
                    <span className="font-medium">{metrics.systemMetrics.memoryUsage}%</span>
                  </div>
                  <Progress value={metrics.systemMetrics.memoryUsage} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>CPU Usage</span>
                    <span className="font-medium">{metrics.systemMetrics.cpuUsage}%</span>
                  </div>
                  <Progress value={metrics.systemMetrics.cpuUsage} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Uptime and connections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uptime</span>
                    <span className="font-medium">{formatUptime(metrics.systemMetrics.uptime)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Connections</span>
                    <span className="font-medium">{metrics.systemMetrics.activeConnections}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getPerformanceRating(value: number, type: 'api'): string {
  if (type === 'api') {
    if (value < PERFORMANCE_THRESHOLDS.API_FAST) return 'Excellent';
    if (value < PERFORMANCE_THRESHOLDS.API_ACCEPTABLE) return 'Good';
    if (value < PERFORMANCE_THRESHOLDS.API_SLOW) return 'Fair';
    return 'Poor';
  }
  return 'Unknown';
}

function getWebVitalRating(value: number, vital: 'LCP' | 'FID' | 'CLS'): string {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
  };

  const threshold = thresholds[vital];
  if (value <= threshold.good) return 'Good';
  if (value <= threshold.poor) return 'Needs Improvement';
  return 'Poor';
}

function getWebVitalBadgeVariant(value: number, vital: 'LCP' | 'FID' | 'CLS'): 'default' | 'secondary' | 'destructive' {
  const rating = getWebVitalRating(value, vital);
  switch (rating) {
    case 'Good': return 'default';
    case 'Needs Improvement': return 'secondary';
    case 'Poor': return 'destructive';
    default: return 'secondary';
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}