# 7P Education - Monitoring & Observability

> Logging, error tracking ve system monitoring sistemi

## 🎯 Kritik Bilgiler

- **Logger**: Winston-based multi-transport logging
- **Error Tracking**: Sentry integration with source maps
- **Performance**: Vercel Analytics + Web Vitals
- **Deployment**: Vercel read-only filesystem (console fallback)

## 📊 Monitoring Stack

### Core Components

| Component | Tool | Purpose | Status |
|-----------|------|---------|--------|
| **Application Logs** | Winston | Structured logging | ✅ Active |
| **Error Tracking** | Sentry | Error monitoring & alerts | ✅ Active |
| **Performance** | Vercel Analytics | Web Vitals & metrics | ✅ Active |
| **Health Monitoring** | `/api/health` | System health checks | ✅ Active |
| **Security Auditing** | Audit logs table | Security event tracking | ✅ Active |

## 📝 Logging System

### Winston Configuration (`src/lib/monitoring/logger.ts`)

```typescript
import winston from 'winston';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Create logger instance
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport (Vercel compatible)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

### Vercel Logging Strategy

#### File Rotation Disabled
```typescript
// ❌ Vercel read-only filesystem
const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log' // This fails on Vercel
});

// ✅ Console fallback (Vercel compatible)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}
```

#### Structured Console Logging
```typescript
// Log format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Usage examples
logger.info('User login successful', {
  userId: session.user.id,
  email: session.user.email,
  timestamp: new Date().toISOString()
});

logger.error('Payment processing failed', {
  userId: user.id,
  courseId: course.id,
  stripeSessionId: session.id,
  error: error.message,
  stack: error.stack
});
```

## 🚨 Sentry Error Tracking

### Configuration Files

#### Sentry Client (`sentry.client.config.ts`)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Error Filtering
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
  
  // User Context
  integrations: [
    new Sentry.BrowserTracing({
      // Custom routing for App Router
      routingInstrumentation: Sentry.nextRouterInstrumentation(router)
    }),
  ],
});
```

#### Sentry Server (`sentry.server.config.ts`)  
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Server-side Performance
  tracesSampleRate: 0.01, // Lower rate for server
  
  // Environment tagging
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
```

#### Sentry Edge (`sentry.edge.config.ts`)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Edge Runtime specific
  runtime: 'edge',
  tracesSampleRate: 0.01,
  
  // Minimal configuration for Edge
  integrations: [],
});
```

### Source Maps Configuration (`next.config.ts`)
```typescript
// Sentry configuration
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Upload source maps in production only
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring/tunnel",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

// Wrap config with Sentry
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
```

### Tunnel Route (`src/app/monitoring/tunnel/route.ts`)
```typescript
// Sentry tunnel to bypass ad blockers
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const envelope = await request.text();
  
  const response = await fetch('https://o4506901088296960.ingest.sentry.io/api/4506901088296961/envelope/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
    },
    body: envelope,
  });
  
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
```

## 💊 Health Monitoring

### Health Check API (`src/app/api/health/route.ts`)
```typescript
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    paymentsMode: process.env.PAYMENTS_MODE,
    checks: {
      basic: true,
      memory: true,
      database: null, // TODO: Add DB health check
      stripe: process.env.PAYMENTS_MODE === 'stripe' ? 'enabled' : null,
    },
    metrics: {
      responseTime: Math.round(performance.now() - startTime),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
    }
  };
  
  const allChecksHealthy = Object.values(healthData.checks)
    .every(check => check === true || check === null);
  
  healthData.status = allChecksHealthy ? 'healthy' : 'unhealthy';
  
  return NextResponse.json(healthData, { 
    status: allChecksHealthy ? 200 : 503 
  });
}
```

### Health Monitoring Script (`scripts/ping-health.ts`)
```typescript
import fetch from 'node-fetch';

async function pingHealth(url: string = 'http://localhost:3000') {
  try {
    const response = await fetch(`${url}/api/health`);
    const health = await response.json();
    
    console.log(`Health Status: ${health.status}`);
    console.log(`Response Time: ${health.metrics.responseTime}ms`);
    console.log(`Memory Usage: ${health.metrics.memoryUsage}MB`);
    
    if (health.status !== 'healthy') {
      console.error('Unhealthy checks:', 
        Object.entries(health.checks)
          .filter(([_, status]) => status === false)
      );
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

// Usage: tsx scripts/ping-health.ts [URL]
const url = process.argv[2] || 'http://localhost:3000';
pingHealth(url);
```

## 📈 Performance Monitoring

### Vercel Analytics Integration
```typescript
// Automatic integration via Vercel
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
```

### Web Vitals Tracking (`src/lib/performance/webVitals.ts`)
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Track Core Web Vitals
function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  
  // Send to Vercel Analytics
  if ('sendBeacon' in navigator) {
    navigator.sendBeacon('/_vercel/insights/vitals', body);
  } else {
    fetch('/_vercel/insights/vitals', {
      body,
      method: 'POST',
      keepalive: true,
    });
  }
}

// Initialize tracking
export function initWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}
```

## 🔍 Audit Logging

### Security Event Tracking
```typescript
// Audit log structure
interface AuditLogEntry {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// Audit logging function
export async function logAuditEvent(
  action: string,
  resourceType: string,
  details: Record<string, any>,
  request?: NextRequest,
  userId?: string
) {
  const auditEntry: AuditLogEntry = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: details.resource_id,
    details,
    ip_address: request?.headers.get('x-forwarded-for') || 'unknown',
    user_agent: request?.headers.get('user-agent') || 'unknown',
    created_at: new Date().toISOString(),
  };
  
  // Store in database
  await supabase
    .from('audit_logs')
    .insert(auditEntry);
    
  // Log to application logger
  logger.info('Audit event', auditEntry);
}
```

### Tracked Events
- **Authentication**: login, logout, registration, password_reset
- **Enrollment**: course_enrollment, payment_completion
- **Content**: course_creation, material_upload
- **Administration**: user_role_change, system_configuration

## 📊 Monitoring Dashboard

### Key Metrics

#### Application Metrics
- **Response Time**: API endpoint performance
- **Error Rate**: 4xx/5xx response percentage  
- **Memory Usage**: Node.js heap usage
- **Active Sessions**: Concurrent user count

#### Business Metrics  
- **Course Enrollments**: Daily/weekly enrollment rates
- **Payment Success**: Payment completion rates
- **User Engagement**: Session duration and page views
- **Content Consumption**: Material view/completion rates

### Alerting Strategy

#### Critical Alerts (Immediate Response)
```typescript
// Server errors (5xx)
if (errorRate > 5 || responseTime > 5000) {
  alert('CRITICAL: High error rate or slow response');
}

// Memory leaks
if (memoryUsage > 400) { // MB
  alert('CRITICAL: High memory usage detected');
}

// Payment system down
if (paymentFailureRate > 10) {
  alert('CRITICAL: Payment system issues');
}
```

#### Warning Alerts (Monitor)
```typescript
// Performance degradation
if (responseTime > 2000) {
  warn('Performance degradation detected');
}

// Elevated error rate
if (errorRate > 2) {
  warn('Elevated error rate detected');
}
```

## 🛠️ Development Monitoring

### Local Development Logging
```bash
# Run with verbose logging
VERBOSE_LOGGING=true npm run dev

# Monitor health in watch mode
npm run ping-health:watch

# Production smoke test
npm run prod-smoke:prod
```

### Log Analysis
```bash
# View recent logs
vercel logs --follow

# Filter by function
vercel logs --follow --since=1h

# Search for errors
vercel logs | grep -i "error"
```

## 🚨 Troubleshooting

### Common Monitoring Issues

#### Issue 1: "Sentry events not appearing"
```bash
# Check DSN configuration
echo $NEXT_PUBLIC_SENTRY_DSN

# Verify tunnel route
curl -X POST http://localhost:3000/monitoring/tunnel \
  -H "Content-Type: application/x-sentry-envelope"
```

#### Issue 2: "High memory usage alerts"
```typescript
// Monitor memory in health check
const memUsage = process.memoryUsage();
console.log('Heap Used:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');

// Force garbage collection (development only)
if (global.gc) global.gc();
```

#### Issue 3: "Missing Web Vitals"
```typescript
// Verify Analytics integration
import { Analytics } from '@vercel/analytics/react';

// Check in browser DevTools
// Look for _vercel/insights requests
```

---

**Related Docs**: [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md) | [SECURITY.md](./SECURITY.md)  
*Last updated: 2025-01-27*