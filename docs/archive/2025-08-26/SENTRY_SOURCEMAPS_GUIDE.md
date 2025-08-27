# 7P Education - Sentry Integration & Sourcemaps Guide

**Date**: 2025-08-26  
**Purpose**: Complete Sentry setup for production error monitoring with sourcemaps  
**Target**: Enhanced debugging with source-mapped stack traces  

**⚠️ PREREQUISITE**: Sentry account and project created at https://sentry.io

---

## 🎯 Overview

Sentry provides real-time error monitoring and performance tracking for your production application. With sourcemaps, you get:
- **Readable Stack Traces**: Original source code instead of minified JavaScript
- **Source Context**: Exact line numbers and surrounding code
- **Enhanced Debugging**: Faster issue identification and resolution
- **Performance Monitoring**: Track application performance metrics

### Architecture
```
Next.js App → Sentry SDK → Sentry Dashboard
     ↓
Source Maps → Uploaded to Sentry → Enhanced Stack Traces
```

---

## 🚀 Step 1: Sentry Project Setup

### 1.1 Create Sentry Project
1. **Login to Sentry**: https://sentry.io
2. **Create New Project**: 
   - Platform: **Next.js**
   - Project Name: **7p-education**
   - Team: Select your team or create new
3. **Copy DSN**: Save the DSN (starts with `https://`)

### 1.2 Create Organization Auth Token
1. **Navigate to Settings** → **Account** → **User Auth Tokens**
2. **Create New Token**:
   - Name: `7p-education-sourcemaps`
   - Scopes: `project:releases`, `org:read`
3. **Copy Token**: Save securely (starts with `sntrys_`)

### 1.3 Get Organization & Project Slugs
```bash
# Organization slug: Found in URL https://sentry.io/organizations/[org-slug]/
# Project slug: Found in project settings or URL
```

---

## 🔐 Step 2: Environment Variables Configuration

### 2.1 Add Sentry Variables to Vercel
```bash
# Via Vercel Dashboard (Recommended)
# Go to Project Settings → Environment Variables

# Public DSN (safe for browser)
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456

# Organization slug
SENTRY_ORG=your-organization-slug

# Project slug  
SENTRY_PROJECT=7p-education

# Auth token for sourcemaps (sensitive)
SENTRY_AUTH_TOKEN=sntrys_1234567890abcdef...
```

### 2.2 Verify Configuration
Your `next.config.ts` is already configured with Sentry:

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

### 2.3 Sentry SDK Configuration
Check `src/lib/sentry.ts` for proper SDK initialization:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Additional configuration
  beforeSend(event) {
    // Filter sensitive data
    if (event.exception) {
      // Remove sensitive information from stack traces
    }
    return event;
  },
});
```

---

## 🛠️ Step 3: Deployment with Sourcemaps

### 3.1 Environment Variables Checklist
Verify all required variables are set in Vercel:
```bash
vercel env ls

# Required for Sentry:
# ✓ NEXT_PUBLIC_SENTRY_DSN
# ✓ SENTRY_ORG  
# ✓ SENTRY_PROJECT
# ✓ SENTRY_AUTH_TOKEN
```

### 3.2 Deploy Application
```bash
# Commit any final changes
git add .
git commit -m "🔍 Configure Sentry monitoring with sourcemaps"

# Deploy to production
git push origin main

# Or via Vercel CLI
vercel --prod
```

### 3.3 Monitor Deployment
```bash
# Watch deployment logs
vercel logs your-domain.com --tail

# Look for Sentry-related logs:
# - "Uploading source maps to Sentry"
# - "Successfully uploaded source maps"
# - "Sentry webpack plugin completed"
```

---

## 🧪 Step 4: Testing Sentry Integration

### 4.1 Test Error Reporting
Create a test error to verify Sentry is working:

```bash
# Test error endpoint (if available)
curl https://your-domain.com/api/test-error

# Or add temporary test code:
# throw new Error("Sentry test error - " + new Date().toISOString());
```

### 4.2 Verify in Sentry Dashboard
1. **Navigate to Sentry Dashboard**
2. **Go to Issues**: Should see test error
3. **Check Stack Trace**: Should show original source code
4. **Verify Source Context**: Code snippets should be readable

### 4.3 Test Performance Monitoring
```bash
# Test performance tracking
curl https://your-domain.com/api/health
curl https://your-domain.com/api/courses

# Check Performance tab in Sentry Dashboard
# Should see transaction data and performance metrics
```

---

## 📊 Step 5: Sourcemap Validation

### 5.1 Check Sourcemap Upload
In Sentry Dashboard:
1. **Go to Settings** → **Projects** → **7p-education**
2. **Navigate to Source Maps**
3. **Verify uploads**: Should see recent deployments
4. **Check file list**: Should include `.js.map` files

### 5.2 Validate Stack Traces
Create an error and check the stack trace:

```javascript
// Example error that should show original source
function testSentryStackTrace() {
  const user = null;
  return user.profile.name; // This will throw TypeError
}
```

**Expected Result**:
- Stack trace shows original function names
- Line numbers match source code
- Code context is visible

### 5.3 Release Association
Verify releases are properly tracked:
```bash
# Check if release is created
# Sentry Dashboard → Releases

# Release should be tagged with Git commit SHA
# Format: 7p-education@abc123def456
```

---

## 🔍 Step 6: Error Monitoring Configuration

### 6.1 Error Filtering
Configure error filtering in `sentry.client.config.js`:

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    const error = hint.originalException;
    
    // Ignore network errors from ad blockers
    if (error?.message?.includes('Non-Error promise rejection')) {
      return null;
    }
    
    // Ignore specific URLs or user agents
    if (event.request?.url?.includes('/api/health')) {
      return null;
    }
    
    return event;
  },
  
  // Sample rate for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

### 6.2 Performance Monitoring
Enable performance tracking for key operations:

```javascript
// Track API endpoint performance
export async function GET(request) {
  return Sentry.withScope(async (scope) => {
    scope.setTag("endpoint", "courses");
    scope.setContext("request", {
      url: request.url,
      method: request.method,
    });
    
    const transaction = Sentry.startTransaction({
      name: "GET /api/courses",
      op: "http.server",
    });
    
    try {
      // Your API logic here
      const result = await getCourses();
      return Response.json(result);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction.finish();
    }
  });
}
```

### 6.3 User Context
Add user context for better debugging:

```javascript
// In your authentication middleware
Sentry.configureScope((scope) => {
  scope.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
  
  scope.setTag("userRole", user.role);
  scope.setContext("subscription", {
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
  });
});
```

---

## 📈 Step 7: Monitoring & Alerts

### 7.1 Alert Rules Configuration
In Sentry Dashboard:
1. **Navigate to Alerts** → **Rules**
2. **Create New Rule**:
   - **Conditions**: When error count ≥ 10 in 5 minutes
   - **Actions**: Send email notification
   - **Environment**: Production only

### 7.2 Performance Alerts
Configure performance monitoring alerts:
```yaml
performance_alerts:
  high_error_rate:
    condition: "Error rate > 1% for 10 minutes"
    action: "Immediate notification"
  
  slow_response_time:
    condition: "P95 response time > 2 seconds"
    action: "Warning notification"
  
  high_transaction_volume:
    condition: "Transaction rate > 1000/minute"
    action: "Scale monitoring"
```

### 7.3 Dashboard Configuration
Create custom dashboards for:
- **Error Trends**: Daily/weekly error patterns
- **Performance Metrics**: Response times, throughput
- **User Impact**: Affected users, error distribution
- **Release Health**: Error rates by deployment

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Issue 1: Sourcemaps Not Uploading
```yaml
symptom: "Stack traces show minified code"
causes:
  - Missing SENTRY_AUTH_TOKEN
  - Incorrect organization/project slugs
  - Build process not generating sourcemaps
solutions:
  - Verify all environment variables in Vercel
  - Check build logs for sourcemap upload messages
  - Ensure auth token has correct permissions
```

#### Issue 2: No Errors Appearing in Sentry
```yaml
symptom: "Sentry dashboard shows no errors"
causes:
  - Incorrect DSN configuration
  - Network blocking (ad blockers, firewalls)
  - Errors filtered out by beforeSend
solutions:
  - Test DSN with manual error
  - Check browser network tab for Sentry requests
  - Review beforeSend filtering logic
```

#### Issue 3: Performance Data Missing
```yaml
symptom: "No performance transactions in dashboard"
causes:
  - tracesSampleRate set to 0
  - Performance monitoring not enabled
  - Transaction instrumentation missing
solutions:
  - Set tracesSampleRate > 0 in production
  - Enable performance monitoring in project settings
  - Add manual transaction tracking
```

### Debugging Commands
```bash
# Test Sentry DSN connectivity
curl -X POST 'https://sentry.io/api/[PROJECT_ID]/store/' \
  -H 'X-Sentry-Auth: Sentry sentry_key=[KEY]' \
  -H 'Content-Type: application/json' \
  -d '{"message": "test"}'

# Check sourcemap uploads
curl -H "Authorization: Bearer [AUTH_TOKEN]" \
  https://sentry.io/api/0/organizations/[ORG]/projects/[PROJECT]/releases/

# Monitor build logs for Sentry messages
vercel logs --since 30m | grep -i sentry
```

---

## 📊 Performance Optimization

### 6.1 Sourcemap Upload Optimization
```yaml
build_optimization:
  parallel_uploads: true
  source_map_reference: "hidden" # Don't expose source maps publicly
  file_compression: true # Compress sourcemaps before upload
  
upload_strategy:
  on_build: true # Upload during build process
  incremental: true # Only upload changed files
  cleanup: true # Remove old releases
```

### 6.2 Error Volume Management
```javascript
// Implement error rate limiting
let errorCount = 0;
let lastReset = Date.now();

Sentry.init({
  beforeSend(event) {
    const now = Date.now();
    
    // Reset count every minute
    if (now - lastReset > 60000) {
      errorCount = 0;
      lastReset = now;
    }
    
    // Limit to 10 errors per minute
    if (errorCount >= 10) {
      return null; // Drop additional errors
    }
    
    errorCount++;
    return event;
  },
});
```

### 6.3 Bundle Size Impact
Monitor Sentry's impact on bundle size:
```bash
# Analyze bundle with Sentry included
npm run build
npm run analyze # If you have bundle analyzer

# Sentry SDK typically adds ~50KB gzipped
# Consider lazy loading for non-critical pages
```

---

## 📋 Maintenance Checklist

### Daily Monitoring
```yaml
error_review:
  - [ ] Check new errors in dashboard
  - [ ] Review error trends and spikes
  - [ ] Validate critical error alerts
  - [ ] Monitor user-affected incidents

performance_review:
  - [ ] Check response time trends
  - [ ] Review transaction volume
  - [ ] Validate performance budgets
  - [ ] Monitor Core Web Vitals
```

### Weekly Tasks
```yaml
configuration:
  - [ ] Review alert rules effectiveness
  - [ ] Update error filtering rules
  - [ ] Clean up old releases (keep 30 days)
  - [ ] Review user feedback integration

optimization:
  - [ ] Analyze error patterns for fixes
  - [ ] Review performance bottlenecks
  - [ ] Update sampling rates if needed
  - [ ] Monitor quota usage
```

### Monthly Tasks
```yaml
security:
  - [ ] Rotate Sentry auth tokens
  - [ ] Review team access permissions
  - [ ] Audit data retention settings
  - [ ] Update privacy configurations

analysis:
  - [ ] Generate error trends report
  - [ ] Analyze user impact metrics
  - [ ] Review release health scores
  - [ ] Plan performance improvements
```

---

## 📞 Resources & Support

### Sentry Documentation
- **Next.js Setup**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Sourcemaps**: https://docs.sentry.io/platforms/javascript/sourcemaps/
- **Performance**: https://docs.sentry.io/product/performance/
- **Releases**: https://docs.sentry.io/product/releases/

### Configuration Files
Your application includes these Sentry configuration files:
- `sentry.client.config.js`: Client-side configuration
- `sentry.server.config.js`: Server-side configuration  
- `sentry.edge.config.js`: Edge runtime configuration
- `next.config.ts`: Build-time sourcemap upload

### Testing Tools
```yaml
sentry_cli:
  install: "npm install -g @sentry/cli"
  test_dsn: "sentry-cli info"
  upload_sourcemaps: "sentry-cli sourcemaps upload"
  
browser_tools:
  extension: "Sentry Browser Extension"
  devtools: "Check Network tab for Sentry requests"
  
monitoring:
  uptime: "Monitor Sentry ingestion endpoint"
  quotas: "Track error/transaction quotas"
```

---

## 📈 Success Metrics

### Key Performance Indicators
```yaml
error_monitoring:
  detection_time: "< 5 minutes for critical errors"
  resolution_time: "< 2 hours for P0 issues"
  false_positive_rate: "< 10%"
  
performance_tracking:
  transaction_coverage: "> 95% of user flows"
  performance_budget_compliance: "> 90%"
  core_web_vitals: "All metrics in green"
  
development_efficiency:
  debugging_time_reduction: "> 50%"
  error_resolution_speed: "> 3x faster"
  production_confidence: "High visibility into issues"
```

---

**Setup Status**: 🎯 **READY FOR CONFIGURATION**  
**Last Updated**: 2025-08-26  
**Integration Version**: 1.0  
**Next Step**: Configure Sentry environment variables in Vercel