# Error Tracking with Sentry Implementation Guide

## Executive Summary

This comprehensive guide details the implementation of advanced error tracking and monitoring using Sentry for the 7P Education Platform. Our error tracking architecture provides real-time error detection, automated alerting, performance monitoring, and detailed error analysis to ensure optimal platform reliability and user experience.

## Table of Contents

1. [Sentry Architecture Setup](#sentry-architecture-setup)
2. [Frontend Error Tracking](#frontend-error-tracking)
3. [Backend Error Monitoring](#backend-error-monitoring)
4. [Performance Monitoring](#performance-monitoring)
5. [Custom Error Classification](#custom-error-classification)
6. [Alert Configuration](#alert-configuration)
7. [Error Analysis & Reporting](#error-analysis-reporting)
8. [Integration with Development Workflow](#integration-development-workflow)

## Sentry Architecture Setup

### Project Configuration

```typescript
// sentry/config/SentryConfig.ts
import * as Sentry from '@sentry/node';
import * as SentryTracing from '@sentry/tracing';

export class SentryConfig {
  static initialize(): void {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Session tracking
      autoSessionTracking: true,
      
      // Capture console errors
      captureUnhandledRejections: true,
      captureUncaughtExceptions: true,
      
      // Advanced configuration
      beforeSend: this.beforeSend,
      beforeSendTransaction: this.beforeSendTransaction,
      
      // Integrations
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
        new SentryTracing.Integrations.Postgres(),
        new SentryTracing.Integrations.Mongo(),
        new SentryTracing.Integrations.GraphQL(),
        new Sentry.Integrations.OnUncaughtException({
          exitEvenIfOtherHandlersAreRegistered: false
        })
      ],
      
      // Error filtering
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'ChunkLoadError',
        'Loading chunk',
        'Non-Error promise rejection captured'
      ],
      
      // URL filtering
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
        /^safari-extension:\/\//i
      ]
    });
    
    // Set user context
    this.setUserContext();
    
    // Set custom tags
    this.setCustomTags();
  }
  
  private static beforeSend(event: Sentry.Event): Sentry.Event | null {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value?.includes('Network request failed')) {
        // Downgrade network errors to info level
        event.level = 'info';
      }
    }
    
    // Add custom context
    event.contexts = {
      ...event.contexts,
      business: {
        user_tier: this.getUserTier(),
        feature_flags: this.getActiveFeatureFlags(),
        subscription_status: this.getSubscriptionStatus()
      }
    };
    
    // Sanitize sensitive data
    if (event.request?.data) {
      event.request.data = this.sanitizeData(event.request.data);
    }
    
    return event;
  }
  
  private static beforeSendTransaction(
    transaction: Sentry.Transaction
  ): Sentry.Transaction | null {
    // Filter out non-critical transactions
    if (transaction.name?.includes('health-check')) {
      return null;
    }
    
    // Add business context to transactions
    transaction.setContext('business', {
      user_type: this.getUserType(),
      course_context: this.getCurrentCourseContext(),
      lesson_context: this.getCurrentLessonContext()
    });
    
    return transaction;
  }
  
  private static setUserContext(): void {
    // Set default user context
    Sentry.setUser({
      id: 'anonymous',
      email: undefined,
      username: undefined
    });
  }
  
  private static setCustomTags(): void {
    Sentry.setTags({
      component: '7p-education',
      tier: process.env.DEPLOYMENT_TIER || 'development',
      region: process.env.AWS_REGION || 'us-east-1',
      version: process.env.APP_VERSION || 'unknown'
    });
  }
}
```

### Environment-Specific Configuration

```yaml
# sentry/config/environments.yml
development:
  dsn: "https://your-dev-dsn@sentry.io/project-id"
  tracesSampleRate: 1.0
  debug: true
  attachStacktrace: true
  captureConsoleIntegration: true
  
staging:
  dsn: "https://your-staging-dsn@sentry.io/project-id"
  tracesSampleRate: 0.5
  debug: false
  attachStacktrace: true
  captureConsoleIntegration: false
  
production:
  dsn: "https://your-prod-dsn@sentry.io/project-id"
  tracesSampleRate: 0.1
  debug: false
  attachStacktrace: false
  captureConsoleIntegration: false
  
# Release configuration
releases:
  create_release: true
  upload_sourcemaps: true
  auto_session_tracking: true
  session_timeout: 1800 # 30 minutes
```

## Frontend Error Tracking

### React Error Boundary Implementation

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'error' | 'warning' | 'info';
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, eventId: null };
  }
  
  static getDerivedStateFromError(_: Error): State {
    return { hasError: true, eventId: null };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture error with Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      },
      level: this.props.level || 'error',
      tags: {
        component: 'error-boundary',
        error_boundary: true
      }
    });
    
    this.setState({ eventId });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }
  
  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We've been notified of this error and are working to fix it.</p>
          {this.state.eventId && (
            <details>
              <summary>Error ID</summary>
              <code>{this.state.eventId}</code>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, eventId: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Frontend Sentry Setup

```typescript
// lib/sentry-client.ts
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

export class FrontendSentry {
  static initialize(): void {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      
      // Performance monitoring
      tracesSampleRate: 0.1,
      
      // Integrations
      integrations: [
        new Integrations.BrowserTracing({
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          )
        })
      ],
      
      // User session tracking
      autoSessionTracking: true,
      
      // Error filtering
      beforeSend: this.beforeSend,
      
      // Breadcrumb filtering
      beforeBreadcrumb: this.beforeBreadcrumb
    });
    
    this.setupUserFeedback();
  }
  
  private static beforeSend(event: Sentry.Event): Sentry.Event | null {
    // Add user context
    if (typeof window !== 'undefined') {
      const user = this.getCurrentUser();
      if (user) {
        event.user = {
          id: user.id,
          email: user.email,
          username: user.name
        };
        
        // Add user tier context
        event.contexts = {
          ...event.contexts,
          user_tier: {
            subscription: user.subscription,
            role: user.role,
            account_type: user.accountType
          }
        };
      }
    }
    
    // Add page context
    if (typeof window !== 'undefined') {
      event.contexts = {
        ...event.contexts,
        page: {
          url: window.location.href,
          path: window.location.pathname,
          query: window.location.search,
          hash: window.location.hash,
          referrer: document.referrer
        }
      };
    }
    
    return event;
  }
  
  private static beforeBreadcrumb(
    breadcrumb: Sentry.Breadcrumb
  ): Sentry.Breadcrumb | null {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }
    
    // Filter out fetch requests to analytics endpoints
    if (breadcrumb.category === 'fetch' && 
        breadcrumb.data?.url?.includes('/analytics/')) {
      return null;
    }
    
    return breadcrumb;
  }
  
  static trackUser(user: User): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name
    });
    
    Sentry.setTags({
      user_tier: user.subscription,
      user_role: user.role,
      account_type: user.accountType
    });
  }
  
  static trackPageView(page: string, properties?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${page}`,
      level: 'info',
      data: properties
    });
  }
  
  private static setupUserFeedback(): void {
    // Show user feedback dialog on unhandled errors
    Sentry.showReportDialog({
      eventId: Sentry.lastEventId(),
      user: {
        email: this.getCurrentUser()?.email,
        name: this.getCurrentUser()?.name
      }
    });
  }
}
```

### Custom Frontend Error Tracking

```typescript
// hooks/useErrorTracking.ts
import { useCallback } from 'react';
import * as Sentry from '@sentry/react';

export const useErrorTracking = () => {
  const trackError = useCallback((
    error: Error,
    context?: Record<string, any>,
    level: 'error' | 'warning' | 'info' = 'error'
  ) => {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context) {
        scope.setContext('custom', context);
      }
      
      // Add component context
      scope.setTag('component', 'custom-hook');
      
      Sentry.captureException(error);
    });
  }, []);
  
  const trackMessage = useCallback((
    message: string,
    level: 'error' | 'warning' | 'info' = 'info',
    context?: Record<string, any>
  ) => {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context) {
        scope.setContext('message_context', context);
      }
      
      Sentry.captureMessage(message);
    });
  }, []);
  
  const addBreadcrumb = useCallback((
    message: string,
    category: string = 'custom',
    data?: Record<string, any>
  ) => {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data
    });
  }, []);
  
  return {
    trackError,
    trackMessage,
    addBreadcrumb
  };
};
```

## Backend Error Monitoring

### Express.js Middleware

```typescript
// middleware/SentryMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';

export class SentryMiddleware {
  static requestHandler() {
    return Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'username'],
      request: ['data', 'headers', 'method', 'query_string', 'url'],
      transaction: 'methodPath'
    });
  }
  
  static tracingHandler() {
    return Sentry.Handlers.tracingHandler();
  }
  
  static enrichRequestContext() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate request ID
      const requestId = uuidv4();
      req.requestId = requestId;
      
      // Set Sentry context
      Sentry.configureScope((scope) => {
        scope.setTag('request_id', requestId);
        scope.setContext('request', {
          id: requestId,
          method: req.method,
          path: req.path,
          query: req.query,
          ip: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        // Set user context if authenticated
        if (req.user) {
          scope.setUser({
            id: req.user.id,
            email: req.user.email,
            username: req.user.name
          });
          
          scope.setContext('user_details', {
            subscription: req.user.subscription,
            role: req.user.role,
            account_type: req.user.accountType,
            last_login: req.user.lastLogin
          });
        }
        
        // Set business context
        if (req.params.courseId) {
          scope.setTag('course_id', req.params.courseId);
        }
        
        if (req.params.lessonId) {
          scope.setTag('lesson_id', req.params.lessonId);
        }
      });
      
      next();
    };
  }
  
  static errorHandler() {
    return (
      error: Error,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      // Capture error with Sentry
      Sentry.withScope((scope) => {
        scope.setTag('error_handler', 'express');
        scope.setContext('error_details', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          request_id: req.requestId
        });
        
        // Set error level based on status code
        const statusCode = (error as any).statusCode || 500;
        if (statusCode >= 500) {
          scope.setLevel('error');
        } else if (statusCode >= 400) {
          scope.setLevel('warning');
        } else {
          scope.setLevel('info');
        }
        
        Sentry.captureException(error);
      });
      
      // Continue with error handling
      next(error);
    };
  }
}
```

### Database Error Tracking

```typescript
// utils/DatabaseErrorTracking.ts
import * as Sentry from '@sentry/node';

export class DatabaseErrorTracking {
  static trackDatabaseError(
    error: Error,
    query: string,
    params?: any[],
    connection?: string
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'database');
      scope.setTag('connection', connection || 'default');
      
      scope.setContext('database', {
        query: this.sanitizeQuery(query),
        params: this.sanitizeParams(params),
        error_code: (error as any).code,
        error_severity: (error as any).severity
      });
      
      // Classify error severity
      const errorCode = (error as any).code;
      if (this.isCriticalError(errorCode)) {
        scope.setLevel('error');
      } else if (this.isWarningError(errorCode)) {
        scope.setLevel('warning');
      } else {
        scope.setLevel('info');
      }
      
      Sentry.captureException(error);
    });
  }
  
  private static sanitizeQuery(query: string): string {
    // Remove sensitive data from queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/email\s*=\s*'[^']*'/gi, "email = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'");
  }
  
  private static sanitizeParams(params?: any[]): any[] | undefined {
    if (!params) return undefined;
    
    return params.map(param => {
      if (typeof param === 'string' && param.includes('@')) {
        return '[EMAIL_REDACTED]';
      }
      if (typeof param === 'string' && param.length > 20) {
        return '[LONG_STRING_REDACTED]';
      }
      return param;
    });
  }
  
  private static isCriticalError(code: string): boolean {
    const criticalCodes = [
      '08000', // connection_exception
      '08003', // connection_does_not_exist
      '08006', // connection_failure
      '57P01', // admin_shutdown
      '58000'  // system_error
    ];
    
    return criticalCodes.includes(code);
  }
  
  private static isWarningError(code: string): boolean {
    const warningCodes = [
      '23505', // unique_violation
      '23503', // foreign_key_violation
      '23502', // not_null_violation
      '42P01'  // undefined_table
    ];
    
    return warningCodes.includes(code);
  }
}
```

## Performance Monitoring

### Transaction Tracking

```typescript
// monitoring/PerformanceTracker.ts
import * as Sentry from '@sentry/node';

export class PerformanceTracker {
  static startTransaction(
    name: string,
    op: string,
    description?: string
  ): Sentry.Transaction {
    const transaction = Sentry.startTransaction({
      name,
      op,
      description
    });
    
    // Set default tags
    transaction.setTag('component', '7p-education');
    transaction.setTag('operation_type', op);
    
    return transaction;
  }
  
  static async trackDatabaseQuery<T>(
    query: string,
    operation: () => Promise<T>,
    connection: string = 'default'
  ): Promise<T> {
    const span = Sentry.getCurrentHub()
      .getScope()
      ?.getTransaction()
      ?.startChild({
        op: 'db.query',
        description: this.sanitizeQuery(query)
      });
    
    span?.setTag('db.connection', connection);
    
    try {
      const result = await operation();
      span?.setStatus('ok');
      return result;
    } catch (error) {
      span?.setStatus('internal_error');
      
      // Track database error
      DatabaseErrorTracking.trackDatabaseError(
        error as Error,
        query,
        undefined,
        connection
      );
      
      throw error;
    } finally {
      span?.finish();
    }
  }
  
  static async trackAPICall<T>(
    url: string,
    method: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = Sentry.getCurrentHub()
      .getScope()
      ?.getTransaction()
      ?.startChild({
        op: 'http.client',
        description: `${method} ${url}`
      });
    
    span?.setTag('http.method', method);
    span?.setTag('http.url', url);
    
    try {
      const result = await operation();
      span?.setStatus('ok');
      return result;
    } catch (error) {
      span?.setStatus('internal_error');
      throw error;
    } finally {
      span?.finish();
    }
  }
  
  static trackUserAction(
    action: string,
    userId: string,
    metadata?: Record<string, any>
  ): void {
    const transaction = this.startTransaction(
      `user.${action}`,
      'user_action',
      `User ${action} operation`
    );
    
    transaction.setTag('user_id', userId);
    transaction.setTag('action', action);
    
    if (metadata) {
      transaction.setContext('action_metadata', metadata);
    }
    
    transaction.finish();
  }
}
```

## Custom Error Classification

### Error Classification System

```typescript
// errors/ErrorClassifier.ts
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system'
}

export class ErrorClassifier {
  private static severityRules: Map<string, ErrorSeverity> = new Map([
    ['PaymentError', ErrorSeverity.CRITICAL],
    ['AuthenticationError', ErrorSeverity.HIGH],
    ['ValidationError', ErrorSeverity.MEDIUM],
    ['NetworkError', ErrorSeverity.LOW]
  ]);
  
  private static categoryRules: Map<string, ErrorCategory> = new Map([
    ['jwt', ErrorCategory.AUTHENTICATION],
    ['unauthorized', ErrorCategory.AUTHORIZATION],
    ['validation', ErrorCategory.VALIDATION],
    ['payment', ErrorCategory.BUSINESS_LOGIC],
    ['stripe', ErrorCategory.EXTERNAL_SERVICE],
    ['database', ErrorCategory.DATABASE],
    ['fetch', ErrorCategory.NETWORK],
    ['system', ErrorCategory.SYSTEM]
  ]);
  
  static classifyError(error: Error): ErrorClassification {
    const severity = this.determineSeverity(error);
    const category = this.determineCategory(error);
    const impact = this.assessImpact(error, severity);
    
    return {
      severity,
      category,
      impact,
      actionable: this.isActionable(error),
      businessCritical: this.isBusinessCritical(error, category)
    };
  }
  
  private static determineSeverity(error: Error): ErrorSeverity {
    // Check explicit severity rules
    for (const [pattern, severity] of this.severityRules.entries()) {
      if (error.name.includes(pattern) || error.message.includes(pattern)) {
        return severity;
      }
    }
    
    // Check status codes for HTTP errors
    const statusCode = (error as any).statusCode;
    if (statusCode) {
      if (statusCode >= 500) return ErrorSeverity.HIGH;
      if (statusCode >= 400) return ErrorSeverity.MEDIUM;
      return ErrorSeverity.LOW;
    }
    
    // Default classification
    return ErrorSeverity.MEDIUM;
  }
  
  private static determineCategory(error: Error): ErrorCategory {
    const errorText = `${error.name} ${error.message}`.toLowerCase();
    
    for (const [pattern, category] of this.categoryRules.entries()) {
      if (errorText.includes(pattern)) {
        return category;
      }
    }
    
    return ErrorCategory.SYSTEM;
  }
  
  private static assessImpact(
    error: Error,
    severity: ErrorSeverity
  ): UserImpact {
    // Assess user impact based on error type and severity
    if (severity === ErrorSeverity.CRITICAL) {
      return {
        usersAffected: 'all',
        functionalityImpact: 'complete_loss',
        businessImpact: 'revenue_loss'
      };
    }
    
    if (error.message.includes('payment')) {
      return {
        usersAffected: 'specific',
        functionalityImpact: 'feature_unavailable',
        businessImpact: 'revenue_impact'
      };
    }
    
    return {
      usersAffected: 'minimal',
      functionalityImpact: 'degraded_experience',
      businessImpact: 'minimal'
    };
  }
}
```

## Alert Configuration

### Sentry Alert Rules

```typescript
// alerts/SentryAlerts.ts
export class SentryAlerts {
  static configureAlerts(): void {
    // Critical error alerts
    this.configureCriticalAlerts();
    
    // Performance alerts
    this.configurePerformanceAlerts();
    
    // Business metric alerts
    this.configureBusinessAlerts();
    
    // Security alerts
    this.configureSecurityAlerts();
  }
  
  private static configureCriticalAlerts(): void {
    const criticalRules = [
      {
        name: 'Payment Processing Errors',
        conditions: {
          level: 'error',
          tags: { category: 'payment' },
          frequency: 5, // 5 errors
          timeWindow: '5m'
        },
        actions: [
          'email:finance-team@7peducation.com',
          'slack:#critical-alerts',
          'pagerduty:payment-escalation'
        ]
      },
      {
        name: 'Authentication System Failure',
        conditions: {
          level: 'error',
          tags: { category: 'authentication' },
          frequency: 10,
          timeWindow: '5m'
        },
        actions: [
          'email:security-team@7peducation.com',
          'slack:#security-alerts',
          'pagerduty:auth-escalation'
        ]
      },
      {
        name: 'Database Connection Errors',
        conditions: {
          level: 'error',
          message: 'contains:database connection',
          frequency: 3,
          timeWindow: '2m'
        },
        actions: [
          'email:devops-team@7peducation.com',
          'slack:#infrastructure-alerts',
          'pagerduty:db-escalation'
        ]
      }
    ];
    
    this.applyAlertRules(criticalRules);
  }
  
  private static configurePerformanceAlerts(): void {
    const performanceRules = [
      {
        name: 'High Response Time',
        conditions: {
          metric: 'transaction.duration',
          aggregation: 'p95',
          threshold: 5000, // 5 seconds
          timeWindow: '10m'
        },
        actions: [
          'slack:#performance-alerts',
          'email:performance-team@7peducation.com'
        ]
      },
      {
        name: 'High Error Rate',
        conditions: {
          metric: 'error_rate',
          threshold: 0.05, // 5%
          timeWindow: '5m'
        },
        actions: [
          'slack:#reliability-alerts',
          'email:engineering-team@7peducation.com'
        ]
      }
    ];
    
    this.applyPerformanceRules(performanceRules);
  }
}
```

## Error Analysis & Reporting

### Error Analytics Dashboard

```typescript
// analytics/ErrorAnalytics.ts
export class ErrorAnalytics {
  async generateErrorReport(
    timeRange: TimeRange
  ): Promise<ErrorReport> {
    const [
      errorTrends,
      topErrors,
      errorsByCategory,
      impactAnalysis,
      resolutionMetrics
    ] = await Promise.all([
      this.getErrorTrends(timeRange),
      this.getTopErrors(timeRange),
      this.getErrorsByCategory(timeRange),
      this.getImpactAnalysis(timeRange),
      this.getResolutionMetrics(timeRange)
    ]);
    
    return {
      summary: {
        totalErrors: errorTrends.reduce((sum, point) => sum + point.count, 0),
        uniqueErrors: topErrors.length,
        affectedUsers: impactAnalysis.affectedUsers,
        averageResolutionTime: resolutionMetrics.averageTime
      },
      trends: errorTrends,
      topErrors,
      categoryBreakdown: errorsByCategory,
      impact: impactAnalysis,
      resolution: resolutionMetrics,
      recommendations: this.generateRecommendations(
        errorsByCategory,
        resolutionMetrics
      )
    };
  }
  
  private async getErrorTrends(
    timeRange: TimeRange
  ): Promise<ErrorTrend[]> {
    // Query Sentry API for error trends
    const response = await this.sentryClient.get('/events/stats/', {
      params: {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString(),
        interval: '1h',
        stat: 'count'
      }
    });
    
    return response.data.map((point: any) => ({
      timestamp: new Date(point[0] * 1000),
      count: point[1]
    }));
  }
  
  private async getTopErrors(
    timeRange: TimeRange
  ): Promise<ErrorSummary[]> {
    const response = await this.sentryClient.get('/issues/', {
      params: {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString(),
        sort: 'freq',
        limit: 10
      }
    });
    
    return response.data.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      count: issue.count,
      userCount: issue.userCount,
      firstSeen: new Date(issue.firstSeen),
      lastSeen: new Date(issue.lastSeen),
      status: issue.status,
      level: issue.level,
      platform: issue.platform,
      classification: ErrorClassifier.classifyError(
        new Error(issue.title)
      )
    }));
  }
  
  private generateRecommendations(
    categories: CategoryBreakdown[],
    metrics: ResolutionMetrics
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Analyze categories for recommendations
    categories.forEach(category => {
      if (category.count > 100 && category.category === 'validation') {
        recommendations.push({
          type: 'improvement',
          priority: 'high',
          title: 'Improve Input Validation',
          description: 'High number of validation errors detected',
          action: 'Review and enhance form validation logic'
        });
      }
      
      if (category.category === 'external_service' && category.count > 50) {
        recommendations.push({
          type: 'reliability',
          priority: 'medium',
          title: 'Add Circuit Breaker Pattern',
          description: 'External service failures are impacting users',
          action: 'Implement circuit breaker for external API calls'
        });
      }
    });
    
    // Analyze resolution times
    if (metrics.averageTime > 24 * 60 * 60 * 1000) { // 24 hours
      recommendations.push({
        type: 'process',
        priority: 'high',
        title: 'Improve Error Response Time',
        description: 'Error resolution time is too high',
        action: 'Review alerting and escalation procedures'
      });
    }
    
    return recommendations;
  }
}
```

## Integration with Development Workflow

### CI/CD Integration

```yaml
# .github/workflows/sentry-release.yml
name: Sentry Release
on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  sentry-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: 7p-education
          SENTRY_PROJECT: platform
        with:
          environment: production
          sourcemaps: './dist'
          url_prefix: '~/'
          
      - name: Upload Source Maps
        run: |
          npx @sentry/cli sourcemaps upload \
            --org 7p-education \
            --project platform \
            --release $GITHUB_SHA \
            ./dist
```

### Deployment Integration

```typescript
// scripts/deployment/SentryDeployment.ts
export class SentryDeployment {
  static async notifyDeployment(
    environment: string,
    version: string
  ): Promise<void> {
    const deployment = await this.sentryClient.post('/deploys/', {
      environment,
      name: version,
      url: process.env.DEPLOYMENT_URL,
      dateStarted: new Date().toISOString(),
      dateFinished: new Date().toISOString()
    });
    
    console.log(`Sentry deployment notification sent: ${deployment.data.id}`);
  }
  
  static async markErrorsResolved(releaseVersion: string): Promise<void> {
    // Mark errors as resolved for new release
    await this.sentryClient.put(`/releases/${releaseVersion}/`, {
      status: 'resolved'
    });
  }
}
```

## Conclusion

This comprehensive error tracking implementation with Sentry provides the 7P Education Platform with enterprise-grade error monitoring, real-time alerting, and detailed analytics. The multi-layered approach ensures proactive issue detection, efficient resolution workflows, and continuous platform reliability improvement, ultimately enhancing user experience and platform stability.