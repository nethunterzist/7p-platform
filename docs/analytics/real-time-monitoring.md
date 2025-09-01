# Real-Time Monitoring Implementation Guide

## Executive Summary

This comprehensive guide details the implementation of real-time monitoring systems for the 7P Education Platform, providing instant visibility into system health, user behavior, and business metrics. Our monitoring architecture combines Prometheus, Grafana, custom alerting systems, and real-time dashboards to deliver sub-second insights and proactive issue detection.

## Table of Contents

1. [Real-Time Architecture](#real-time-architecture)
2. [Prometheus Metrics Collection](#prometheus-metrics-collection)
3. [Grafana Dashboard Implementation](#grafana-dashboard-implementation)
4. [Custom Alerting System](#custom-alerting-system)
5. [Live User Activity Monitoring](#live-user-activity-monitoring)
6. [System Health Monitoring](#system-health-monitoring)
7. [Performance Monitoring](#performance-monitoring)
8. [Alert Management & Escalation](#alert-management-escalation)

## Real-Time Architecture

### Monitoring Stack Overview

```yaml
# monitoring/docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  prometheus_data:
  grafana_data:
```

### Real-Time Data Pipeline

```typescript
// monitoring/pipeline/RealtimeMonitoring.ts
export class RealtimeMonitoring {
  private metricsCollector: MetricsCollector;
  private streamProcessor: StreamProcessor;
  private alertManager: AlertManager;
  private dashboardUpdater: DashboardUpdater;
  
  constructor() {
    this.initializeComponents();
    this.setupDataPipeline();
  }
  
  private initializeComponents(): void {
    this.metricsCollector = new MetricsCollector({
      sources: ['prometheus', 'custom', 'logs', 'traces'],
      interval: 1000, // 1 second
      batchSize: 100
    });
    
    this.streamProcessor = new StreamProcessor({
      windowSize: 5000, // 5 seconds
      functions: ['sum', 'avg', 'min', 'max', 'percentile'],
      alertThresholds: this.loadAlertThresholds()
    });
    
    this.alertManager = new AlertManager({
      channels: ['slack', 'email', 'webhook', 'sms'],
      escalationRules: this.loadEscalationRules(),
      silenceRules: this.loadSilenceRules()
    });
    
    this.dashboardUpdater = new DashboardUpdater({
      updateInterval: 1000, // 1 second
      websockets: true,
      compression: true
    });
  }
  
  async startMonitoring(): Promise<void> {
    // Start metrics collection
    await this.metricsCollector.start();
    
    // Initialize stream processing
    await this.streamProcessor.initialize();
    
    // Set up real-time pipeline
    this.setupPipeline();
    
    console.log('Real-time monitoring started');
  }
  
  private setupPipeline(): void {
    // Metrics collection -> Stream processing
    this.metricsCollector.on('metrics', (metrics) => {
      this.streamProcessor.process(metrics);
    });
    
    // Stream processing -> Alerting
    this.streamProcessor.on('alert', (alert) => {
      this.alertManager.handleAlert(alert);
    });
    
    // Stream processing -> Dashboard updates
    this.streamProcessor.on('data', (data) => {
      this.dashboardUpdater.update(data);
    });
  }
}
```

## Prometheus Metrics Collection

### Custom Metrics Implementation

```typescript
// monitoring/metrics/CustomMetrics.ts
import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';

export class CustomMetrics {
  // Request metrics
  private httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });
  
  private httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  });
  
  // User activity metrics
  private activeUsers = new Gauge({
    name: 'active_users_total',
    help: 'Current active users',
    labelNames: ['type'] // 'real_time', 'daily', 'weekly'
  });
  
  private userActions = new Counter({
    name: 'user_actions_total',
    help: 'Total user actions',
    labelNames: ['action', 'user_type']
  });
  
  // Business metrics
  private revenueGauge = new Gauge({
    name: 'revenue_total',
    help: 'Current revenue',
    labelNames: ['period', 'currency']
  });
  
  private courseProgress = new Histogram({
    name: 'course_progress_percentage',
    help: 'Course completion progress',
    labelNames: ['course_id', 'user_type'],
    buckets: [10, 25, 50, 75, 90, 100]
  });
  
  // System metrics
  private databaseConnections = new Gauge({
    name: 'database_connections_active',
    help: 'Active database connections'
  });
  
  private cacheHitRate = new Gauge({
    name: 'cache_hit_rate',
    help: 'Cache hit rate percentage'
  });
  
  // Error tracking
  private errorsTotal = new Counter({
    name: 'errors_total',
    help: 'Total errors',
    labelNames: ['type', 'severity', 'component']
  });
  
  constructor() {
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.activeUsers);
    register.registerMetric(this.userActions);
    register.registerMetric(this.revenueGauge);
    register.registerMetric(this.courseProgress);
    register.registerMetric(this.databaseConnections);
    register.registerMetric(this.cacheHitRate);
    register.registerMetric(this.errorsTotal);
  }
  
  // Metric recording methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, route }, duration);
  }
  
  updateActiveUsers(type: string, count: number): void {
    this.activeUsers.set({ type }, count);
  }
  
  recordUserAction(action: string, userType: string): void {
    this.userActions.inc({ action, user_type: userType });
  }
  
  updateRevenue(period: string, currency: string, amount: number): void {
    this.revenueGauge.set({ period, currency }, amount);
  }
  
  recordCourseProgress(courseId: string, userType: string, progress: number): void {
    this.courseProgress.observe({ course_id: courseId, user_type: userType }, progress);
  }
  
  updateDatabaseConnections(count: number): void {
    this.databaseConnections.set(count);
  }
  
  updateCacheHitRate(rate: number): void {
    this.cacheHitRate.set(rate);
  }
  
  recordError(type: string, severity: string, component: string): void {
    this.errorsTotal.inc({ type, severity, component });
  }
}
```

### Metrics Middleware

```typescript
// monitoring/middleware/MetricsMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { CustomMetrics } from '../metrics/CustomMetrics';

export class MetricsMiddleware {
  private metrics: CustomMetrics;
  
  constructor() {
    this.metrics = new CustomMetrics();
  }
  
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Track request start
      const route = this.normalizeRoute(req.path);
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        
        // Record metrics
        this.metrics.recordHttpRequest(
          req.method,
          route,
          res.statusCode,
          duration
        );
        
        // Record user action if authenticated
        if (req.user) {
          this.metrics.recordUserAction(
            this.getActionType(req),
            req.user.type
          );
        }
        
        // Record errors if status >= 400
        if (res.statusCode >= 400) {
          this.metrics.recordError(
            'http_error',
            this.getSeverity(res.statusCode),
            'api'
          );
        }
      });
      
      next();
    };
  }
  
  private normalizeRoute(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/[0-9a-f]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[0-9a-f-]{36}/g, '/:uuid'); // UUIDs
  }
  
  private getActionType(req: Request): string {
    const method = req.method.toLowerCase();
    const path = req.path;
    
    if (path.includes('/courses') && method === 'post') return 'course_create';
    if (path.includes('/courses') && method === 'get') return 'course_view';
    if (path.includes('/lessons') && method === 'get') return 'lesson_view';
    if (path.includes('/quiz') && method === 'post') return 'quiz_submit';
    
    return `${method}_${path.split('/')[1]}`;
  }
  
  private getSeverity(statusCode: number): string {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'warning';
    return 'info';
  }
}
```

## Grafana Dashboard Implementation

### Dashboard Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "7P Education Platform - Real-Time Overview",
    "tags": ["education", "real-time", "overview"],
    "timezone": "UTC",
    "refresh": "5s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_total{type=\"real_time\"}",
            "legendFormat": "Active Users"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "yellow", "value": 100 },
                { "color": "green", "value": 500 }
              ]
            }
          }
        },
        "gridPos": { "h": 8, "w": 6, "x": 0, "y": 0 }
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 6, "y": 0 }
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds",
            "min": 0
          }
        ],
        "gridPos": { "h": 8, "w": 6, "x": 18, "y": 0 }
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"4..|5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [5],
                "type": "gt"
              },
              "operator": {
                "type": "and"
              },
              "query": {
                "params": ["A", "5m", "now"]
              },
              "reducer": {
                "params": [],
                "type": "avg"
              },
              "type": "query"
            }
          ],
          "executionErrorState": "alerting",
          "for": "1m",
          "frequency": "10s",
          "handler": 1,
          "name": "High Error Rate Alert",
          "noDataState": "no_data",
          "notifications": []
        },
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      }
    ]
  }
}
```

### Live Dashboard Updates

```typescript
// monitoring/dashboard/LiveDashboard.ts
export class LiveDashboard {
  private websocketServer: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private updateInterval: NodeJS.Timeout;
  
  constructor() {
    this.setupWebSocketServer();
    this.startUpdates();
  }
  
  private setupWebSocketServer(): void {
    this.websocketServer = new WebSocketServer({
      port: 8080,
      path: '/dashboard-updates'
    });
    
    this.websocketServer.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      
      // Send initial data
      this.sendInitialData(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      
      ws.on('message', (message: string) => {
        this.handleClientMessage(ws, JSON.parse(message));
      });
    });
  }
  
  private startUpdates(): void {
    this.updateInterval = setInterval(async () => {
      const updates = await this.gatherUpdates();
      this.broadcastUpdates(updates);
    }, 1000); // Update every second
  }
  
  private async gatherUpdates(): Promise<DashboardUpdate> {
    const [
      activeUsers,
      requestRate,
      errorRate,
      responseTime,
      systemHealth
    ] = await Promise.all([
      this.getActiveUsers(),
      this.getRequestRate(),
      this.getErrorRate(),
      this.getResponseTime(),
      this.getSystemHealth()
    ]);
    
    return {
      timestamp: Date.now(),
      metrics: {
        activeUsers,
        requestRate,
        errorRate,
        responseTime,
        systemHealth
      }
    };
  }
  
  private broadcastUpdates(update: DashboardUpdate): void {
    const message = JSON.stringify(update);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  private async getActiveUsers(): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_sessions
      WHERE last_activity > NOW() - INTERVAL '5 minutes'
    `;
    
    const result = await this.db.query(query);
    return result.rows[0].active_users;
  }
}
```

## Custom Alerting System

### Alert Rules Engine

```typescript
// monitoring/alerts/AlertRules.ts
export class AlertRules {
  private rules: Map<string, AlertRule> = new Map();
  private evaluator: RuleEvaluator;
  
  constructor() {
    this.setupRules();
    this.evaluator = new RuleEvaluator();
  }
  
  private setupRules(): void {
    // System health rules
    this.rules.set('high_cpu_usage', {
      name: 'High CPU Usage',
      query: 'avg(cpu_usage_percent) > 80',
      duration: '5m',
      severity: 'warning',
      description: 'CPU usage is above 80% for 5 minutes',
      actions: ['slack', 'email']
    });
    
    this.rules.set('critical_cpu_usage', {
      name: 'Critical CPU Usage',
      query: 'avg(cpu_usage_percent) > 95',
      duration: '1m',
      severity: 'critical',
      description: 'CPU usage is above 95% for 1 minute',
      actions: ['slack', 'email', 'pagerduty']
    });
    
    // Application performance rules
    this.rules.set('high_response_time', {
      name: 'High Response Time',
      query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2',
      duration: '3m',
      severity: 'warning',
      description: '95th percentile response time is above 2 seconds',
      actions: ['slack']
    });
    
    this.rules.set('high_error_rate', {
      name: 'High Error Rate',
      query: 'rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05',
      duration: '2m',
      severity: 'critical',
      description: 'Error rate is above 5%',
      actions: ['slack', 'email', 'pagerduty']
    });
    
    // Business metrics rules
    this.rules.set('low_active_users', {
      name: 'Low Active Users',
      query: 'active_users_total{type="real_time"} < 50',
      duration: '10m',
      severity: 'warning',
      description: 'Active users dropped below 50 for 10 minutes',
      actions: ['slack']
    });
    
    this.rules.set('payment_failures', {
      name: 'High Payment Failure Rate',
      query: 'rate(payment_failures_total[5m]) / rate(payment_attempts_total[5m]) > 0.10',
      duration: '5m',
      severity: 'critical',
      description: 'Payment failure rate is above 10%',
      actions: ['slack', 'email', 'webhook']
    });
  }
  
  async evaluateRules(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    for (const [ruleId, rule] of this.rules.entries()) {
      try {
        const result = await this.evaluator.evaluate(rule);
        
        if (result.firing) {
          alerts.push({
            ruleId,
            rule,
            value: result.value,
            timestamp: new Date(),
            fingerprint: this.generateFingerprint(rule, result)
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${ruleId}:`, error);
      }
    }
    
    return alerts;
  }
  
  private generateFingerprint(rule: AlertRule, result: EvaluationResult): string {
    const data = {
      ruleName: rule.name,
      query: rule.query,
      labels: result.labels
    };
    
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
}
```

### Alert Manager Implementation

```typescript
// monitoring/alerts/AlertManager.ts
export class AlertManager {
  private notificationChannels: Map<string, NotificationChannel>;
  private activeAlerts: Map<string, Alert> = new Map();
  private silences: Map<string, Silence> = new Map();
  
  constructor() {
    this.setupNotificationChannels();
  }
  
  private setupNotificationChannels(): void {
    this.notificationChannels = new Map([
      ['slack', new SlackNotification({
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#alerts',
        username: '7P Education Monitor'
      })],
      ['email', new EmailNotification({
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT),
        from: 'alerts@7peducation.com',
        recipients: process.env.ALERT_RECIPIENTS?.split(',') || []
      })],
      ['pagerduty', new PagerDutyNotification({
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY
      })],
      ['webhook', new WebhookNotification({
        url: process.env.ALERT_WEBHOOK_URL
      })]
    ]);
  }
  
  async handleAlert(alert: Alert): Promise<void> {
    const fingerprint = alert.fingerprint;
    
    // Check if alert is silenced
    if (this.isAlertSilenced(alert)) {
      return;
    }
    
    // Check if this is a new alert or update
    const existingAlert = this.activeAlerts.get(fingerprint);
    
    if (!existingAlert) {
      // New alert
      this.activeAlerts.set(fingerprint, alert);
      await this.sendNotifications(alert, 'firing');
    } else {
      // Update existing alert
      existingAlert.lastSeen = new Date();
    }
  }
  
  async resolveAlert(fingerprint: string): Promise<void> {
    const alert = this.activeAlerts.get(fingerprint);
    
    if (alert) {
      this.activeAlerts.delete(fingerprint);
      await this.sendNotifications(alert, 'resolved');
    }
  }
  
  private async sendNotifications(
    alert: Alert,
    status: 'firing' | 'resolved'
  ): Promise<void> {
    const actions = alert.rule.actions;
    
    const notifications = actions.map(action => {
      const channel = this.notificationChannels.get(action);
      return channel?.send({
        alert,
        status,
        timestamp: new Date(),
        runbookUrl: this.getRunbookUrl(alert)
      });
    });
    
    await Promise.allSettled(notifications);
  }
  
  private isAlertSilenced(alert: Alert): boolean {
    for (const [silenceId, silence] of this.silences.entries()) {
      if (this.alertMatchesSilence(alert, silence)) {
        return true;
      }
    }
    return false;
  }
  
  createSilence(silence: SilenceRequest): string {
    const silenceId = uuidv4();
    
    this.silences.set(silenceId, {
      id: silenceId,
      matchers: silence.matchers,
      startsAt: silence.startsAt || new Date(),
      endsAt: silence.endsAt,
      createdBy: silence.createdBy,
      comment: silence.comment
    });
    
    return silenceId;
  }
}
```

## Live User Activity Monitoring

### Real-Time User Tracking

```typescript
// monitoring/users/UserActivityMonitor.ts
export class UserActivityMonitor {
  private activeUsers: Map<string, UserSession> = new Map();
  private activityStream: EventEmitter;
  
  constructor() {
    this.activityStream = new EventEmitter();
    this.setupActivityTracking();
  }
  
  trackUserActivity(userId: string, activity: UserActivity): void {
    const session = this.getOrCreateSession(userId);
    
    // Update session
    session.lastActivity = new Date();
    session.activities.push(activity);
    
    // Emit real-time event
    this.activityStream.emit('user-activity', {
      userId,
      activity,
      session
    });
    
    // Update metrics
    this.updateActivityMetrics(activity);
  }
  
  private getOrCreateSession(userId: string): UserSession {
    let session = this.activeUsers.get(userId);
    
    if (!session) {
      session = {
        userId,
        startTime: new Date(),
        lastActivity: new Date(),
        activities: [],
        metadata: {
          userAgent: this.getCurrentUserAgent(userId),
          ipAddress: this.getCurrentIP(userId),
          location: this.getUserLocation(userId)
        }
      };
      
      this.activeUsers.set(userId, session);
      this.activityStream.emit('user-session-start', session);
    }
    
    return session;
  }
  
  getActiveUsers(): UserSessionSummary[] {
    const now = new Date();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    
    return Array.from(this.activeUsers.values())
      .filter(session => 
        now.getTime() - session.lastActivity.getTime() < activeThreshold
      )
      .map(session => ({
        userId: session.userId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        activityCount: session.activities.length,
        currentPage: this.getCurrentPage(session),
        location: session.metadata.location
      }));
  }
  
  private updateActivityMetrics(activity: UserActivity): void {
    // Update Prometheus metrics
    this.metrics.recordUserAction(activity.type, activity.userType);
    
    // Update active user count
    const activeCount = this.getActiveUsers().length;
    this.metrics.updateActiveUsers('real_time', activeCount);
    
    // Track specific activities
    switch (activity.type) {
      case 'lesson_view':
        this.metrics.recordCourseProgress(
          activity.courseId,
          activity.userType,
          activity.progress
        );
        break;
      case 'quiz_attempt':
        this.trackQuizMetrics(activity);
        break;
      case 'purchase':
        this.trackPurchaseMetrics(activity);
        break;
    }
  }
}
```

## System Health Monitoring

### Health Check Implementation

```typescript
// monitoring/health/HealthChecker.ts
export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private healthStatus: HealthStatus = 'healthy';
  
  constructor() {
    this.setupHealthChecks();
  }
  
  private setupHealthChecks(): void {
    // Database health check
    this.checks.set('database', {
      name: 'Database Connection',
      check: async () => {
        try {
          await this.db.query('SELECT 1');
          return { status: 'healthy', latency: Date.now() };
        } catch (error) {
          return { 
            status: 'unhealthy', 
            error: error.message,
            latency: null
          };
        }
      },
      timeout: 5000,
      critical: true
    });
    
    // Redis health check
    this.checks.set('redis', {
      name: 'Redis Cache',
      check: async () => {
        try {
          const start = Date.now();
          await this.redis.ping();
          return { 
            status: 'healthy', 
            latency: Date.now() - start 
          };
        } catch (error) {
          return { 
            status: 'unhealthy', 
            error: error.message,
            latency: null
          };
        }
      },
      timeout: 3000,
      critical: false
    });
    
    // External API health check
    this.checks.set('payment_gateway', {
      name: 'Payment Gateway',
      check: async () => {
        try {
          const response = await fetch(`${process.env.STRIPE_API}/health`, {
            timeout: 5000
          });
          
          return {
            status: response.ok ? 'healthy' : 'degraded',
            latency: Date.now(),
            details: { statusCode: response.status }
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error.message,
            latency: null
          };
        }
      },
      timeout: 10000,
      critical: true
    });
  }
  
  async performHealthCheck(): Promise<HealthReport> {
    const results = new Map<string, HealthResult>();
    
    // Run all health checks
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, check]) => {
        try {
          const result = await Promise.race([
            check.check(),
            this.timeout(check.timeout)
          ]);
          
          results.set(name, result);
        } catch (error) {
          results.set(name, {
            status: 'unhealthy',
            error: 'Health check timeout',
            latency: null
          });
        }
      }
    );
    
    await Promise.allSettled(checkPromises);
    
    // Determine overall health
    const overallHealth = this.calculateOverallHealth(results);
    
    return {
      status: overallHealth,
      timestamp: new Date(),
      checks: Object.fromEntries(results),
      uptime: process.uptime(),
      version: process.env.APP_VERSION
    };
  }
  
  private calculateOverallHealth(
    results: Map<string, HealthResult>
  ): HealthStatus {
    let hasUnhealthy = false;
    let hasDegraded = false;
    
    for (const [name, result] of results.entries()) {
      const check = this.checks.get(name);
      
      if (result.status === 'unhealthy' && check?.critical) {
        return 'unhealthy';
      }
      
      if (result.status === 'unhealthy') {
        hasUnhealthy = true;
      }
      
      if (result.status === 'degraded') {
        hasDegraded = true;
      }
    }
    
    if (hasUnhealthy || hasDegraded) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}
```

## Conclusion

This comprehensive real-time monitoring implementation provides the 7P Education Platform with enterprise-grade observability, enabling proactive issue detection, real-time insights, and automated incident response. The multi-layered approach ensures complete visibility into system health, user behavior, and business performance, driving operational excellence and user satisfaction.