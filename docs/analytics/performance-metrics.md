# Performance Metrics Implementation Guide

## Executive Summary

This comprehensive guide details the implementation of advanced performance monitoring and metrics collection for the 7P Education Platform. Our performance monitoring architecture provides real-time insights into application performance, user experience metrics, system resource utilization, and business-critical performance indicators to ensure optimal platform performance and user satisfaction.

## Table of Contents

1. [Performance Monitoring Architecture](#performance-monitoring-architecture)
2. [Core Web Vitals Implementation](#core-web-vitals-implementation)
3. [Application Performance Monitoring](#application-performance-monitoring)
4. [Database Performance Tracking](#database-performance-tracking)
5. [API Performance Metrics](#api-performance-metrics)
6. [User Experience Metrics](#user-experience-metrics)
7. [Real-Time Performance Dashboards](#real-time-performance-dashboards)
8. [Performance Optimization Automation](#performance-optimization-automation)

## Performance Monitoring Architecture

### Multi-Layer Performance Stack

```typescript
// performance/architecture/PerformanceMonitor.ts
export class PerformanceMonitor {
  private collectors: Map<string, MetricCollector>;
  private processors: Map<string, DataProcessor>;
  private alerting: AlertingSystem;
  private storage: MetricsStorage;
  
  constructor() {
    this.initializeCollectors();
    this.initializeProcessors();
    this.setupAlerting();
    this.configureStorage();
  }
  
  private initializeCollectors(): void {
    this.collectors = new Map([
      ['web-vitals', new WebVitalsCollector()],
      ['resource-timing', new ResourceTimingCollector()],
      ['navigation-timing', new NavigationTimingCollector()],
      ['server-timing', new ServerTimingCollector()],
      ['custom-metrics', new CustomMetricsCollector()],
      ['database-metrics', new DatabaseMetricsCollector()],
      ['api-metrics', new APIMetricsCollector()],
      ['system-metrics', new SystemMetricsCollector()]
    ]);
  }
  
  private initializeProcessors(): void {
    this.processors = new Map([
      ['aggregator', new MetricsAggregator({
        windowSize: 60000, // 1 minute
        functions: ['avg', 'p50', 'p90', 'p95', 'p99', 'max', 'min']
      })],
      ['anomaly-detector', new AnomalyDetector({
        algorithm: 'isolation-forest',
        sensitivity: 0.85,
        learningPeriod: 24 * 60 * 60 * 1000 // 24 hours
      })],
      ['trend-analyzer', new TrendAnalyzer({
        forecastHorizon: 7 * 24 * 60 * 60 * 1000, // 7 days
        seasonality: ['daily', 'weekly']
      })]
    ]);
  }
  
  async startMonitoring(): Promise<void> {
    // Start all collectors
    await Promise.all(
      Array.from(this.collectors.values()).map(
        collector => collector.start()
      )
    );
    
    // Setup data pipeline
    this.setupDataPipeline();
    
    // Start real-time processing
    this.startRealTimeProcessing();
    
    console.log('Performance monitoring started successfully');
  }
  
  private setupDataPipeline(): void {
    // Collector -> Processor pipeline
    this.collectors.forEach((collector, name) => {
      collector.on('metric', (metric) => {
        this.processMetric(metric);
      });
    });
    
    // Processor -> Storage pipeline
    this.processors.forEach((processor, name) => {
      processor.on('processed', (data) => {
        this.storage.store(data);
      });
    });
  }
  
  private async processMetric(metric: PerformanceMetric): Promise<void> {
    // Send to aggregator
    await this.processors.get('aggregator')?.process(metric);
    
    // Check for anomalies
    const anomaly = await this.processors.get('anomaly-detector')?.detect(metric);
    if (anomaly) {
      await this.alerting.handleAnomaly(anomaly);
    }
    
    // Update trends
    await this.processors.get('trend-analyzer')?.update(metric);
  }
}
```

### Performance Metrics Schema

```typescript
// performance/types/MetricsSchema.ts
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: MetricUnit;
  timestamp: Date;
  source: MetricSource;
  context: MetricContext;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export enum MetricUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  BYTES = 'bytes',
  PERCENTAGE = '%',
  COUNT = 'count',
  RATE = 'rate',
  SCORE = 'score'
}

export enum MetricSource {
  BROWSER = 'browser',
  SERVER = 'server',
  DATABASE = 'database',
  CDN = 'cdn',
  EXTERNAL_API = 'external_api',
  SYSTEM = 'system'
}

export interface MetricContext {
  userId?: string;
  sessionId: string;
  pageUrl: string;
  userAgent: string;
  device: DeviceInfo;
  network: NetworkInfo;
  location: LocationInfo;
}

export interface WebVitalsMetric extends PerformanceMetric {
  type: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB';
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigation: NavigationType;
}

export interface ResourceMetric extends PerformanceMetric {
  resourceType: 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'xmlhttprequest';
  size: number;
  transferSize: number;
  duration: number;
  cached: boolean;
  initiatorType: string;
}

export interface APIMetric extends PerformanceMetric {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  cached: boolean;
}
```

## Core Web Vitals Implementation

### Web Vitals Collector

```typescript
// performance/collectors/WebVitalsCollector.ts
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

export class WebVitalsCollector extends MetricCollector {
  private vitalsBuffer: WebVitalsMetric[] = [];
  private thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  };
  
  async start(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Initialize Web Vitals collection
    this.initializeWebVitals();
    
    // Setup periodic reporting
    this.setupPeriodicReporting();
    
    // Setup visibility change handling
    this.setupVisibilityHandling();
  }
  
  private initializeWebVitals(): void {
    // Largest Contentful Paint
    getLCP((metric) => {
      this.handleWebVital('LCP', metric);
    });
    
    // First Input Delay
    getFID((metric) => {
      this.handleWebVital('FID', metric);
    });
    
    // Cumulative Layout Shift
    getCLS((metric) => {
      this.handleWebVital('CLS', metric);
    });
    
    // First Contentful Paint
    getFCP((metric) => {
      this.handleWebVital('FCP', metric);
    });
    
    // Time to First Byte
    getTTFB((metric) => {
      this.handleWebVital('TTFB', metric);
    });
  }
  
  private handleWebVital(type: WebVitalType, metric: any): void {
    const webVital: WebVitalsMetric = {
      id: this.generateId(),
      name: `web_vitals_${type.toLowerCase()}`,
      value: metric.value,
      unit: type === 'CLS' ? MetricUnit.SCORE : MetricUnit.MILLISECONDS,
      timestamp: new Date(),
      source: MetricSource.BROWSER,
      context: this.getContext(),
      tags: {
        vital_type: type,
        page: window.location.pathname,
        navigation_type: this.getNavigationType()
      },
      type,
      rating: this.calculateRating(type, metric.value),
      delta: metric.delta,
      navigation: this.getNavigationType()
    };
    
    // Add to buffer
    this.vitalsBuffer.push(webVital);
    
    // Emit metric
    this.emit('metric', webVital);
    
    // Send real-time for poor ratings
    if (webVital.rating === 'poor') {
      this.sendImmediate(webVital);
    }
  }
  
  private calculateRating(type: WebVitalType, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[type];
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }
  
  private getNavigationType(): NavigationType {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) return 'navigate';
    
    switch (navigation.type) {
      case 'reload': return 'reload';
      case 'back_forward': return 'back-forward';
      case 'prerender': return 'prerender';
      default: return 'navigate';
    }
  }
  
  private setupPeriodicReporting(): void {
    // Send buffered metrics every 30 seconds
    setInterval(() => {
      if (this.vitalsBuffer.length > 0) {
        this.sendBatch(this.vitalsBuffer);
        this.vitalsBuffer = [];
      }
    }, 30000);
  }
  
  private setupVisibilityHandling(): void {
    // Send metrics when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendBatch(this.vitalsBuffer);
        this.vitalsBuffer = [];
      }
    });
    
    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      if (this.vitalsBuffer.length > 0) {
        navigator.sendBeacon(
          '/api/metrics/vitals',
          JSON.stringify(this.vitalsBuffer)
        );
      }
    });
  }
}
```

### Performance Observer Implementation

```typescript
// performance/collectors/PerformanceObserverCollector.ts
export class PerformanceObserverCollector extends MetricCollector {
  private observers: Map<string, PerformanceObserver> = new Map();
  
  async start(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    this.setupResourceObserver();
    this.setupNavigationObserver();
    this.setupLongTaskObserver();
    this.setupElementTimingObserver();
    this.setupEventTimingObserver();
  }
  
  private setupResourceObserver(): void {
    if (!PerformanceObserver.supportedEntryTypes.includes('resource')) return;
    
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        const metric: ResourceMetric = {
          id: this.generateId(),
          name: 'resource_timing',
          value: resourceEntry.duration,
          unit: MetricUnit.MILLISECONDS,
          timestamp: new Date(),
          source: MetricSource.BROWSER,
          context: this.getContext(),
          tags: {
            resource_name: resourceEntry.name,
            resource_type: this.getResourceType(resourceEntry),
            initiator_type: resourceEntry.initiatorType
          },
          resourceType: this.getResourceType(resourceEntry),
          size: resourceEntry.decodedBodySize || 0,
          transferSize: resourceEntry.transferSize || 0,
          duration: resourceEntry.duration,
          cached: this.isCachedResource(resourceEntry),
          initiatorType: resourceEntry.initiatorType
        };
        
        this.emit('metric', metric);
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', observer);
  }
  
  private setupLongTaskObserver(): void {
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return;
    
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const longTask = entry as PerformanceLongTaskTiming;
        
        const metric: PerformanceMetric = {
          id: this.generateId(),
          name: 'long_task',
          value: longTask.duration,
          unit: MetricUnit.MILLISECONDS,
          timestamp: new Date(),
          source: MetricSource.BROWSER,
          context: this.getContext(),
          tags: {
            task_type: 'long_task',
            attribution: longTask.attribution?.length > 0 ? 
              longTask.attribution[0].name : 'unknown'
          }
        };
        
        this.emit('metric', metric);
        
        // Alert for excessively long tasks
        if (longTask.duration > 500) {
          this.sendAlert({
            type: 'performance_degradation',
            message: `Long task detected: ${longTask.duration}ms`,
            severity: 'warning'
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['longtask'] });
    this.observers.set('longtask', observer);
  }
  
  private getResourceType(entry: PerformanceResourceTiming): string {
    const url = new URL(entry.name);
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, string> = {
      'js': 'script',
      'css': 'stylesheet',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'eot': 'font'
    };
    
    return typeMap[extension || ''] || entry.initiatorType;
  }
  
  private isCachedResource(entry: PerformanceResourceTiming): boolean {
    return entry.transferSize === 0 && entry.decodedBodySize > 0;
  }
}
```

## Application Performance Monitoring

### Server-Side Performance Tracking

```typescript
// performance/server/ServerPerformanceMonitor.ts
export class ServerPerformanceMonitor {
  private metrics: Map<string, PerformanceEntry> = new Map();
  private timers: Map<string, Timer> = new Map();
  
  // Track request performance
  trackRequest(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = req.requestId || this.generateId();
    
    // Track request start
    this.startTimer(`request_${requestId}`, {
      method: req.method,
      path: req.path,
      user_id: req.user?.id
    });
    
    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      const metric: APIMetric = {
        id: this.generateId(),
        name: 'api_request',
        value: duration,
        unit: MetricUnit.MILLISECONDS,
        timestamp: new Date(),
        source: MetricSource.SERVER,
        context: this.getServerContext(req),
        tags: {
          method: req.method,
          endpoint: this.normalizeEndpoint(req.path),
          status_code: res.statusCode.toString(),
          user_tier: req.user?.subscription || 'anonymous'
        },
        endpoint: req.path,
        method: req.method as any,
        statusCode: res.statusCode,
        responseTime: duration,
        requestSize: this.getRequestSize(req),
        responseSize: this.getResponseSize(res),
        cached: this.isCachedResponse(res)
      };
      
      this.emit('metric', metric);
      
      // Alert on slow requests
      if (duration > 5000) {
        this.sendAlert({
          type: 'slow_request',
          message: `Slow request: ${req.method} ${req.path} took ${duration}ms`,
          severity: 'warning'
        });
      }
      
      // Alert on errors
      if (res.statusCode >= 500) {
        this.sendAlert({
          type: 'server_error',
          message: `Server error: ${res.statusCode} for ${req.method} ${req.path}`,
          severity: 'error'
        });
      }
    });
    
    next();
  }
  
  // Track function performance
  async trackFunction<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const timerId = this.generateId();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      const metric: PerformanceMetric = {
        id: this.generateId(),
        name: `function_${name}`,
        value: duration,
        unit: MetricUnit.MILLISECONDS,
        timestamp: new Date(),
        source: MetricSource.SERVER,
        context: this.getServerContext(),
        tags: {
          function_name: name,
          status: 'success'
        },
        metadata: context
      };
      
      this.emit('metric', metric);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      const metric: PerformanceMetric = {
        id: this.generateId(),
        name: `function_${name}`,
        value: duration,
        unit: MetricUnit.MILLISECONDS,
        timestamp: new Date(),
        source: MetricSource.SERVER,
        context: this.getServerContext(),
        tags: {
          function_name: name,
          status: 'error',
          error_type: error.constructor.name
        },
        metadata: { ...context, error: error.message }
      };
      
      this.emit('metric', metric);
      throw error;
    }
  }
  
  // Memory usage tracking
  trackMemoryUsage(): void {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      
      Object.entries(memoryUsage).forEach(([type, value]) => {
        const metric: PerformanceMetric = {
          id: this.generateId(),
          name: `memory_${type}`,
          value: value,
          unit: MetricUnit.BYTES,
          timestamp: new Date(),
          source: MetricSource.SYSTEM,
          context: this.getServerContext(),
          tags: {
            memory_type: type,
            process_id: process.pid.toString()
          }
        };
        
        this.emit('metric', metric);
      });
    }, 10000); // Every 10 seconds
  }
  
  // CPU usage tracking
  trackCPUUsage(): void {
    let previousCPUUsage = process.cpuUsage();
    
    setInterval(() => {
      const currentCPUUsage = process.cpuUsage(previousCPUUsage);
      const cpuPercent = (currentCPUUsage.user + currentCPUUsage.system) / 1000 / 10; // 10 second interval
      
      const metric: PerformanceMetric = {
        id: this.generateId(),
        name: 'cpu_usage',
        value: cpuPercent,
        unit: MetricUnit.PERCENTAGE,
        timestamp: new Date(),
        source: MetricSource.SYSTEM,
        context: this.getServerContext(),
        tags: {
          process_id: process.pid.toString()
        }
      };
      
      this.emit('metric', metric);
      previousCPUUsage = process.cpuUsage();
    }, 10000);
  }
}
```

## Database Performance Tracking

### Database Query Monitoring

```typescript
// performance/database/DatabasePerformanceMonitor.ts
export class DatabasePerformanceMonitor {
  private queryMetrics: Map<string, QueryMetric[]> = new Map();
  private slowQueryThreshold = 1000; // 1 second
  
  // Track database queries
  async trackQuery<T>(
    query: string,
    params: any[] = [],
    operation: () => Promise<T>,
    connection: string = 'default'
  ): Promise<T> {
    const startTime = performance.now();
    const queryId = this.generateQueryId(query);
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      const metric: DatabaseMetric = {
        id: this.generateId(),
        name: 'database_query',
        value: duration,
        unit: MetricUnit.MILLISECONDS,
        timestamp: new Date(),
        source: MetricSource.DATABASE,
        context: this.getDatabaseContext(),
        tags: {
          query_type: this.getQueryType(query),
          connection,
          status: 'success',
          table: this.extractTableName(query)
        },
        query: this.sanitizeQuery(query),
        queryType: this.getQueryType(query),
        duration,
        rowsAffected: this.getRowsAffected(result),
        cached: false
      };
      
      this.emit('metric', metric);
      
      // Track slow queries
      if (duration > this.slowQueryThreshold) {
        this.trackSlowQuery(query, duration, params);
      }
      
      // Update query statistics
      this.updateQueryStats(queryId, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      const metric: DatabaseMetric = {
        id: this.generateId(),
        name: 'database_query',
        value: duration,
        unit: MetricUnit.MILLISECONDS,
        timestamp: new Date(),
        source: MetricSource.DATABASE,
        context: this.getDatabaseContext(),
        tags: {
          query_type: this.getQueryType(query),
          connection,
          status: 'error',
          error_code: (error as any).code,
          table: this.extractTableName(query)
        },
        query: this.sanitizeQuery(query),
        queryType: this.getQueryType(query),
        duration,
        rowsAffected: 0,
        cached: false,
        error: error.message
      };
      
      this.emit('metric', metric);
      throw error;
    }
  }
  
  // Track connection pool metrics
  trackConnectionPool(pool: any): void {
    setInterval(() => {
      const poolMetrics = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      Object.entries(poolMetrics).forEach(([type, value]) => {
        const metric: PerformanceMetric = {
          id: this.generateId(),
          name: `connection_pool_${type}`,
          value,
          unit: MetricUnit.COUNT,
          timestamp: new Date(),
          source: MetricSource.DATABASE,
          context: this.getDatabaseContext(),
          tags: {
            pool_type: type,
            database: 'postgresql'
          }
        };
        
        this.emit('metric', metric);
      });
    }, 5000); // Every 5 seconds
  }
  
  private trackSlowQuery(query: string, duration: number, params: any[]): void {
    const slowQueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      params: this.sanitizeParams(params),
      timestamp: new Date(),
      explainPlan: null // Could be added for PostgreSQL
    };
    
    this.emit('slow-query', slowQueryMetric);
    
    // Send alert for extremely slow queries
    if (duration > 10000) { // 10 seconds
      this.sendAlert({
        type: 'extremely_slow_query',
        message: `Extremely slow query detected: ${duration}ms`,
        severity: 'critical',
        metadata: slowQueryMetric
      });
    }
  }
  
  private getQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();
    
    if (normalizedQuery.startsWith('select')) return 'SELECT';
    if (normalizedQuery.startsWith('insert')) return 'INSERT';
    if (normalizedQuery.startsWith('update')) return 'UPDATE';
    if (normalizedQuery.startsWith('delete')) return 'DELETE';
    if (normalizedQuery.startsWith('create')) return 'CREATE';
    if (normalizedQuery.startsWith('drop')) return 'DROP';
    if (normalizedQuery.startsWith('alter')) return 'ALTER';
    
    return 'OTHER';
  }
  
  private extractTableName(query: string): string {
    // Simple table name extraction - could be enhanced
    const match = query.match(/(?:from|into|update|join)\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }
  
  private sanitizeQuery(query: string): string {
    return query
      .replace(/('[^']*')/g, "'?'") // Replace string literals
      .replace(/(\b\d+\b)/g, '?')    // Replace numbers
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();
  }
}
```

## API Performance Metrics

### External API Monitoring

```typescript
// performance/api/ExternalAPIMonitor.ts
export class ExternalAPIMonitor {
  private httpClient: AxiosInstance;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  constructor() {
    this.setupHTTPClient();
    this.setupCircuitBreakers();
  }
  
  private setupHTTPClient(): void {
    this.httpClient = axios.create({
      timeout: 30000,
      validateStatus: () => true // Don't throw on HTTP errors
    });
    
    // Request interceptor
    this.httpClient.interceptors.request.use((config) => {
      config.metadata = {
        startTime: Date.now(),
        requestId: this.generateId()
      };
      
      return config;
    });
    
    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.trackAPIResponse(response);
        return response;
      },
      (error) => {
        this.trackAPIError(error);
        return Promise.reject(error);
      }
    );
  }
  
  private trackAPIResponse(response: AxiosResponse): void {
    const config = response.config;
    const duration = Date.now() - config.metadata.startTime;
    
    const metric: APIMetric = {
      id: this.generateId(),
      name: 'external_api_call',
      value: duration,
      unit: MetricUnit.MILLISECONDS,
      timestamp: new Date(),
      source: MetricSource.EXTERNAL_API,
      context: this.getAPIContext(config),
      tags: {
        service: this.getServiceName(config.url),
        endpoint: this.normalizeEndpoint(config.url),
        method: config.method?.toUpperCase(),
        status_code: response.status.toString(),
        status_class: this.getStatusClass(response.status)
      },
      endpoint: config.url || '',
      method: (config.method?.toUpperCase() as any) || 'GET',
      statusCode: response.status,
      responseTime: duration,
      requestSize: this.getRequestSize(config),
      responseSize: this.getResponseSize(response),
      cached: this.isCachedResponse(response)
    };
    
    this.emit('metric', metric);
    
    // Update circuit breaker
    const serviceName = this.getServiceName(config.url);
    this.updateCircuitBreaker(serviceName, response.status < 500);
    
    // Track SLA compliance
    this.trackSLACompliance(serviceName, duration, response.status);
  }
  
  private trackAPIError(error: AxiosError): void {
    const config = error.config;
    const duration = config?.metadata ? 
      Date.now() - config.metadata.startTime : 0;
    
    const metric: APIMetric = {
      id: this.generateId(),
      name: 'external_api_call',
      value: duration,
      unit: MetricUnit.MILLISECONDS,
      timestamp: new Date(),
      source: MetricSource.EXTERNAL_API,
      context: this.getAPIContext(config),
      tags: {
        service: this.getServiceName(config?.url),
        endpoint: this.normalizeEndpoint(config?.url),
        method: config?.method?.toUpperCase(),
        status: 'error',
        error_type: error.code || 'unknown'
      },
      endpoint: config?.url || '',
      method: (config?.method?.toUpperCase() as any) || 'GET',
      statusCode: error.response?.status || 0,
      responseTime: duration,
      cached: false,
      error: error.message
    };
    
    this.emit('metric', metric);
    
    // Update circuit breaker
    const serviceName = this.getServiceName(config?.url);
    this.updateCircuitBreaker(serviceName, false);
  }
  
  private setupCircuitBreakers(): void {
    const services = ['stripe', 'sendgrid', 'aws', 'analytics'];
    
    services.forEach(service => {
      this.circuitBreakers.set(service, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000, // 1 minute
        onOpen: () => {
          this.sendAlert({
            type: 'circuit_breaker_open',
            message: `Circuit breaker opened for ${service}`,
            severity: 'critical'
          });
        },
        onHalfOpen: () => {
          this.sendAlert({
            type: 'circuit_breaker_half_open',
            message: `Circuit breaker half-open for ${service}`,
            severity: 'warning'
          });
        },
        onClose: () => {
          this.sendAlert({
            type: 'circuit_breaker_closed',
            message: `Circuit breaker closed for ${service}`,
            severity: 'info'
          });
        }
      }));
    });
  }
  
  private trackSLACompliance(
    service: string,
    duration: number,
    statusCode: number
  ): void {
    const slaTargets = {
      stripe: { responseTime: 2000, availability: 99.9 },
      sendgrid: { responseTime: 5000, availability: 99.5 },
      aws: { responseTime: 1000, availability: 99.99 }
    };
    
    const target = slaTargets[service as keyof typeof slaTargets];
    if (!target) return;
    
    const slaMetric: PerformanceMetric = {
      id: this.generateId(),
      name: 'sla_compliance',
      value: duration <= target.responseTime && statusCode < 500 ? 1 : 0,
      unit: MetricUnit.SCORE,
      timestamp: new Date(),
      source: MetricSource.EXTERNAL_API,
      context: this.getAPIContext(),
      tags: {
        service,
        metric_type: 'response_time_sla',
        target: target.responseTime.toString()
      }
    };
    
    this.emit('metric', slaMetric);
  }
}
```

## User Experience Metrics

### Real User Monitoring

```typescript
// performance/rum/RealUserMonitoring.ts
export class RealUserMonitoring {
  private sessionData: Map<string, UserSession> = new Map();
  private performanceObserver: PerformanceObserver;
  
  initialize(): void {
    this.setupPerformanceObserver();
    this.trackUserInteractions();
    this.monitorPageVisibility();
    this.trackCustomUserMetrics();
  }
  
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined') return;
    
    // Track user interactions
    if (PerformanceObserver.supportedEntryTypes.includes('event')) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'event') {
            this.trackInteractionMetric(entry as PerformanceEventTiming);
          }
        });
      });
      
      this.performanceObserver.observe({ 
        entryTypes: ['event'],
        buffered: true
      });
    }
  }
  
  private trackInteractionMetric(entry: PerformanceEventTiming): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      name: 'user_interaction',
      value: entry.processingEnd - entry.processingStart,
      unit: MetricUnit.MILLISECONDS,
      timestamp: new Date(),
      source: MetricSource.BROWSER,
      context: this.getContext(),
      tags: {
        interaction_type: entry.name,
        target: entry.target?.tagName?.toLowerCase() || 'unknown',
        interactionId: entry.interactionId?.toString() || 'unknown'
      },
      metadata: {
        startTime: entry.startTime,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        duration: entry.duration
      }
    };
    
    this.emit('metric', metric);
    
    // Track slow interactions
    if (entry.duration > 200) {
      this.trackSlowInteraction(entry);
    }
  }
  
  private trackSlowInteraction(entry: PerformanceEventTiming): void {
    const slowInteractionMetric = {
      type: 'slow_interaction',
      interaction: entry.name,
      duration: entry.duration,
      target: entry.target?.tagName,
      timestamp: new Date(),
      pageUrl: window.location.href
    };
    
    this.emit('slow-interaction', slowInteractionMetric);
  }
  
  // Track custom user experience metrics
  trackUserExperienceScore(): void {
    setInterval(() => {
      const score = this.calculateUserExperienceScore();
      
      const metric: PerformanceMetric = {
        id: this.generateId(),
        name: 'user_experience_score',
        value: score,
        unit: MetricUnit.SCORE,
        timestamp: new Date(),
        source: MetricSource.BROWSER,
        context: this.getContext(),
        tags: {
          score_type: 'composite',
          page: window.location.pathname
        }
      };
      
      this.emit('metric', metric);
    }, 60000); // Every minute
  }
  
  private calculateUserExperienceScore(): number {
    // Composite score based on various factors
    const factors = {
      performanceScore: this.getPerformanceScore(),
      interactionScore: this.getInteractionScore(),
      reliabilityScore: this.getReliabilityScore(),
      visualStabilityScore: this.getVisualStabilityScore()
    };
    
    // Weighted average
    const weights = {
      performanceScore: 0.3,
      interactionScore: 0.3,
      reliabilityScore: 0.2,
      visualStabilityScore: 0.2
    };
    
    return Object.entries(factors).reduce((score, [factor, value]) => {
      return score + (value * weights[factor as keyof typeof weights]);
    }, 0);
  }
  
  // Track rage clicks (multiple rapid clicks)
  trackRageClicks(): void {
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;
    
    document.addEventListener('click', (event) => {
      clickCount++;
      
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        if (clickCount >= 3) {
          // Rage click detected
          const metric: PerformanceMetric = {
            id: this.generateId(),
            name: 'rage_click',
            value: clickCount,
            unit: MetricUnit.COUNT,
            timestamp: new Date(),
            source: MetricSource.BROWSER,
            context: this.getContext(),
            tags: {
              target: (event.target as Element)?.tagName?.toLowerCase(),
              page: window.location.pathname
            }
          };
          
          this.emit('metric', metric);
        }
        
        clickCount = 0;
      }, 1000);
    });
  }
}
```

## Real-Time Performance Dashboards

### Performance Dashboard Implementation

```typescript
// dashboards/PerformanceDashboard.tsx
export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  
  useEffect(() => {
    loadPerformanceMetrics();
    
    // Setup real-time updates
    const interval = setInterval(loadPerformanceMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);
  
  return (
    <DashboardLayout title="Performance Monitoring">
      {/* Core Web Vitals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Largest Contentful Paint"
          value={formatMs(metrics?.lcp)}
          status={getWebVitalStatus(metrics?.lcp, 'LCP')}
          trend={metrics?.lcpTrend}
          target="< 2.5s"
        />
        <MetricCard
          title="First Input Delay"
          value={formatMs(metrics?.fid)}
          status={getWebVitalStatus(metrics?.fid, 'FID')}
          trend={metrics?.fidTrend}
          target="< 100ms"
        />
        <MetricCard
          title="Cumulative Layout Shift"
          value={metrics?.cls?.toFixed(3)}
          status={getWebVitalStatus(metrics?.cls, 'CLS')}
          trend={metrics?.clsTrend}
          target="< 0.1"
        />
      </div>
      
      {/* Performance Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <ChartWidget
          title="Response Time Trends"
          type="line"
          data={metrics?.responseTimeTrends}
          yAxis={{
            label: 'Response Time (ms)',
            min: 0
          }}
          series={[
            { name: 'P50', color: '#10B981' },
            { name: 'P90', color: '#F59E0B' },
            { name: 'P95', color: '#EF4444' }
          ]}
        />
        <ChartWidget
          title="Throughput"
          type="area"
          data={metrics?.throughputData}
          yAxis={{
            label: 'Requests/sec',
            min: 0
          }}
        />
      </div>
      
      {/* Database Performance */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <ChartWidget
          title="Database Query Performance"
          type="bar"
          data={metrics?.dbQueryPerformance}
          xAxis={{ label: 'Query Type' }}
          yAxis={{ label: 'Avg Duration (ms)' }}
        />
        <ChartWidget
          title="Connection Pool Status"
          type="gauge"
          data={metrics?.connectionPoolStatus}
          thresholds={[
            { value: 70, color: 'green' },
            { value: 85, color: 'yellow' },
            { value: 95, color: 'red' }
          ]}
        />
      </div>
      
      {/* Error Rates */}
      <div className="performance-errors">
        <ChartWidget
          title="Error Rates by Endpoint"
          type="heatmap"
          data={metrics?.errorRatesByEndpoint}
          colorScale="reds"
        />
      </div>
    </DashboardLayout>
  );
};
```

## Performance Optimization Automation

### Automated Performance Optimization

```typescript
// optimization/AutomaticOptimizer.ts
export class AutomaticOptimizer {
  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private metrics: MetricsCollector;
  
  constructor() {
    this.setupOptimizationRules();
  }
  
  private setupOptimizationRules(): void {
    // Database optimization rules
    this.optimizationRules.set('slow_queries', {
      condition: (metric) => 
        metric.name === 'database_query' && metric.value > 5000,
      action: this.optimizeSlowQueries,
      cooldown: 300000 // 5 minutes
    });
    
    // Cache optimization rules
    this.optimizationRules.set('cache_miss_rate', {
      condition: (metric) => 
        metric.name === 'cache_hit_rate' && metric.value < 0.8,
      action: this.optimizeCacheStrategy,
      cooldown: 600000 // 10 minutes
    });
    
    // API response time optimization
    this.optimizationRules.set('api_response_time', {
      condition: (metric) => 
        metric.name === 'api_request' && metric.value > 2000,
      action: this.optimizeAPIResponse,
      cooldown: 180000 // 3 minutes
    });
  }
  
  async processMetric(metric: PerformanceMetric): Promise<void> {
    for (const [ruleId, rule] of this.optimizationRules.entries()) {
      if (rule.condition(metric) && this.canExecuteRule(ruleId)) {
        await this.executeOptimization(ruleId, rule, metric);
      }
    }
  }
  
  private async optimizeSlowQueries(metric: PerformanceMetric): Promise<void> {
    // Analyze slow query patterns
    const analysis = await this.analyzeSlowQueryPatterns(metric);
    
    // Apply optimizations
    if (analysis.missingIndexes.length > 0) {
      await this.createMissingIndexes(analysis.missingIndexes);
    }
    
    if (analysis.inefficientQueries.length > 0) {
      await this.rewriteQueries(analysis.inefficientQueries);
    }
    
    // Update connection pool if needed
    if (analysis.connectionIssues) {
      await this.optimizeConnectionPool();
    }
  }
  
  private async optimizeCacheStrategy(metric: PerformanceMetric): Promise<void> {
    // Analyze cache patterns
    const cacheAnalysis = await this.analyzeCachePatterns();
    
    // Adjust TTL values
    if (cacheAnalysis.staleCacheRatio > 0.3) {
      await this.adjustCacheTTL(cacheAnalysis.recommendations);
    }
    
    // Implement cache warming for popular content
    if (cacheAnalysis.popularMisses.length > 0) {
      await this.implementCacheWarming(cacheAnalysis.popularMisses);
    }
  }
  
  private async optimizeAPIResponse(metric: PerformanceMetric): Promise<void> {
    // Analyze API performance patterns
    const apiAnalysis = await this.analyzeAPIPerformance(metric);
    
    // Enable compression if not already enabled
    if (!apiAnalysis.compressionEnabled) {
      await this.enableResponseCompression(metric.tags.endpoint);
    }
    
    // Implement response caching
    if (apiAnalysis.cacheable && !apiAnalysis.cached) {
      await this.implementResponseCaching(metric.tags.endpoint);
    }
    
    // Optimize database queries for this endpoint
    if (apiAnalysis.databaseBottleneck) {
      await this.optimizeEndpointQueries(metric.tags.endpoint);
    }
  }
}
```

## Conclusion

This comprehensive performance metrics implementation provides the 7P Education Platform with enterprise-grade performance monitoring, real-time optimization, and automated performance management. The multi-layered approach ensures optimal user experience, system reliability, and continuous performance improvement across all platform components.