# 7P Education - Post-Deployment Smoke Testing Guide

**Date**: 2025-08-26  
**Purpose**: Comprehensive validation after production deployment  
**Environment**: Production (https://your-domain.com)  

**⚠️ CRITICAL**: Run ALL tests immediately after deployment before declaring success

---

## 🎯 Testing Overview

### Test Categories & Priority
```yaml
P0_Critical:
  duration: 5-10 minutes
  scope: Core functionality, payment processing, authentication
  failure_impact: Immediate rollback required
  
P1_Essential:
  duration: 10-20 minutes  
  scope: Course management, user flows, API endpoints
  failure_impact: Fix within 2 hours or rollback

P2_Important:
  duration: 15-30 minutes
  scope: UI/UX, performance, security headers
  failure_impact: Fix in next deployment cycle
```

### Test Execution Order
1. **Infrastructure Tests** (2 min): Health, security headers
2. **Authentication Tests** (3 min): Login, registration, session
3. **Payment Tests** (3 min): Stripe integration, webhooks
4. **Core Features** (10 min): Courses, enrollment, Q&A
5. **Performance Tests** (5 min): Load times, API response
6. **Security Tests** (7 min): Headers, authentication, XSS protection

---

## 🚀 P0 - Critical Tests (Must Pass)

### Infrastructure Health
```bash
# Test 1: Health Endpoint
curl -s https://your-domain.com/api/health | jq '.'

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-08-26T...",
  "database": "connected",
  "environment": "production"
}

# ❌ Failure Criteria: 500 error, "unhealthy" status, database disconnected
# 🔧 Action on Failure: Immediate rollback
```

```bash
# Test 2: Homepage Load
curl -I https://your-domain.com

# Expected: HTTP/2 200 OK + security headers
# ❌ Failure Criteria: 500 error, missing security headers
# 🔧 Action on Failure: Investigate, possible rollback
```

```bash
# Test 3: API Connectivity
curl -s https://your-domain.com/api/courses -H "Accept: application/json"

# Expected: JSON response (empty array or course list)
# ❌ Failure Criteria: 500 error, compilation errors
# 🔧 Action on Failure: Immediate rollback
```

### Authentication System
```bash
# Test 4: Authentication Providers
curl -s https://your-domain.com/api/auth/providers | jq '.'

# Expected: List of auth providers (credentials, etc.)
# ❌ Failure Criteria: 500 error, empty response
# 🔧 Action on Failure: Fix authentication config or rollback
```

**Manual Test 5: User Login Flow**
1. Navigate to: `https://your-domain.com/auth/signin`
2. Attempt login with test credentials
3. Verify redirect to dashboard
4. Check session persistence

```
✅ Success: Successful login and redirect
❌ Failure: Login fails, no redirect, session issues
🔧 Action on Failure: Fix authentication or rollback
```

### Payment Processing
```bash
# Test 6: Stripe Configuration
curl -s https://your-domain.com/api/create-payment-intent \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: Error message about missing auth (not 500 server error)
# ❌ Failure Criteria: 500 error, Stripe configuration issues
# 🔧 Action on Failure: Fix Stripe integration or rollback
```

**Manual Test 7: Stripe Webhook**
1. Navigate to Stripe Dashboard → Webhooks
2. Send test event to your webhook endpoint
3. Verify webhook receives and processes event

```
✅ Success: Webhook receives test event
❌ Failure: Webhook unreachable, processing errors
🔧 Action on Failure: Fix webhook configuration
```

---

## ⚡ P1 - Essential Tests (High Priority)

### Course Management System
**Test 8: Course API Endpoints**
```bash
# Get courses (should work without auth for public courses)
curl -s https://your-domain.com/api/courses | jq 'length'

# Get specific course (replace with actual course ID if available)
curl -s https://your-domain.com/api/courses/sample-course-id

# Expected: Proper JSON responses, not 500 errors
# ❌ Failure: API returns 500, malformed JSON
# 🔧 Action: Fix API endpoints within 2 hours
```

**Manual Test 9: Course Creation Flow**
1. Login as admin user
2. Navigate to course creation
3. Create test course with content
4. Verify course appears in listings

```
✅ Success: Course created and visible
❌ Failure: Creation fails, course not saved
🔧 Action: Fix course management system
```

### User Management
**Test 10: User Registration**
```bash
# Test registration endpoint exists
curl -I https://your-domain.com/auth/signup

# Expected: 200 OK or proper redirect
# ❌ Failure: 404, 500 errors
# 🔧 Action: Fix registration flow
```

**Manual Test 11: User Profile**
1. Login with test account
2. Navigate to profile page
3. Update profile information
4. Verify changes persist

```
✅ Success: Profile updates and persists
❌ Failure: Updates fail, data loss
🔧 Action: Fix user profile system
```

### File Upload System
**Test 12: Storage Configuration**
```bash
# Test if storage is accessible (replace with actual file if available)
curl -I https://riupkkggupogdgubnhmy.supabase.co/storage/v1/object/public/course-materials/test

# Expected: 404 (file not found) or 200 (if test file exists)
# ❌ Failure: 500 error, connection refused
# 🔧 Action: Fix Supabase storage configuration
```

### Database Operations
**Test 13: Database Performance**
```bash
# Test database query performance via health endpoint
time curl -s https://your-domain.com/api/health

# Expected: Response time < 2 seconds
# ❌ Failure: Timeout, very slow responses (>5s)
# 🔧 Action: Investigate database performance
```

---

## 🔒 P2 - Security & Performance Tests

### Security Headers Validation
```bash
# Test 14: Security Headers
curl -I https://your-domain.com | grep -E "(X-|Content-Security|Strict-Transport)"

# Expected Headers:
# - Strict-Transport-Security: max-age=...
# - X-Content-Type-Options: nosniff  
# - X-Frame-Options: DENY
# - Content-Security-Policy: ...
# - X-XSS-Protection: 1; mode=block

# ❌ Failure: Missing critical security headers
# 🔧 Action: Fix security configuration
```

```bash
# Test 15: CSP Policy
curl -I https://your-domain.com | grep "Content-Security-Policy"

# Expected: Comprehensive CSP policy
# ❌ Failure: Missing or overly permissive CSP
# 🔧 Action: Update CSP configuration
```

### SSL/TLS Configuration
**Test 16: SSL Labs Test**
1. Visit: https://www.ssllabs.com/ssltest/
2. Enter your domain: `your-domain.com`
3. Wait for analysis completion

```
✅ Success: Grade A or A+
❌ Failure: Grade B or lower
🔧 Action: Fix SSL configuration
```

### Performance Validation
**Test 17: Core Web Vitals**
1. Visit: https://pagespeed.web.dev/
2. Enter URL: `https://your-domain.com`
3. Run analysis for mobile and desktop

```
Target Metrics:
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s  
- Cumulative Layout Shift: <0.1
- Speed Index: <3.0s

✅ Success: All metrics in green/yellow
❌ Failure: Multiple red metrics
🔧 Action: Performance optimization needed
```

**Test 18: API Response Times**
```bash
# Test API endpoint performance
time curl -s https://your-domain.com/api/courses > /dev/null

# Expected: < 1 second response time
# ❌ Failure: > 3 seconds response time
# 🔧 Action: Optimize API performance
```

### Error Handling
**Test 19: 404 Error Page**
```bash
curl -I https://your-domain.com/nonexistent-page

# Expected: 404 with proper error page
# ❌ Failure: 500 error, no custom 404 page
# 🔧 Action: Fix error handling
```

**Test 20: API Error Responses**
```bash
curl -s https://your-domain.com/api/nonexistent-endpoint

# Expected: Proper JSON error response
# ❌ Failure: HTML error page, 500 errors
# 🔧 Action: Fix API error handling
```

---

## 📊 Test Results Documentation

### Test Results Template
```yaml
deployment_info:
  url: https://your-domain.com
  deployment_time: "2025-08-26T..."
  vercel_deployment_id: "dpl_..."
  git_commit: "abc123..."

test_summary:
  p0_critical: "8/8 passed" 
  p1_essential: "6/6 passed"
  p2_security_performance: "6/6 passed"
  total_score: "20/20 (100%)"
  
test_duration:
  start_time: "2025-08-26T..."
  end_time: "2025-08-26T..."
  total_duration: "15 minutes"

issues_found:
  critical: []
  non_critical: []
  
recommendations:
  immediate: []
  short_term: []
  
approval_status: "✅ APPROVED FOR PRODUCTION"
```

### Failure Response Procedures

#### Critical Test Failures (P0)
```yaml
immediate_actions:
  - Stop deployment announcement
  - Notify technical team
  - Begin rollback procedure
  - Document failure details
  
rollback_steps:
  - vercel rollback --url your-domain.com
  - Verify previous version working
  - Communicate status to stakeholders
  - Schedule fix and redeployment
```

#### Non-Critical Failures (P1/P2)
```yaml
assessment_actions:
  - Document issue details
  - Assess user impact
  - Determine fix priority
  - Schedule resolution
  
communication:
  - Update deployment notes
  - Notify relevant stakeholders
  - Track in issue management system
```

---

## 🔧 Automated Test Scripts

### Quick Health Check Script
```bash
#!/bin/bash
# quick-health-check.sh

DOMAIN="https://your-domain.com"

echo "🔍 Running Quick Health Check..."

# Test 1: Health endpoint
echo "Testing health endpoint..."
HEALTH=$(curl -s $DOMAIN/api/health | jq -r '.status')
if [ "$HEALTH" = "healthy" ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed: $HEALTH"
  exit 1
fi

# Test 2: Homepage
echo "Testing homepage..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Homepage accessible"
else
  echo "❌ Homepage failed: HTTP $HTTP_CODE"
  exit 1
fi

# Test 3: API endpoint
echo "Testing API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/api/courses)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API endpoint accessible"
else
  echo "❌ API endpoint failed: HTTP $HTTP_CODE"
  exit 1
fi

echo "🎉 Quick health check completed successfully"
```

### Security Headers Check Script  
```bash
#!/bin/bash
# security-check.sh

DOMAIN="https://your-domain.com"

echo "🔒 Checking security headers..."

HEADERS=$(curl -s -I $DOMAIN)

# Check for required headers
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
  echo "✅ HSTS header present"
else
  echo "❌ HSTS header missing"
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff"; then
  echo "✅ Content-Type-Options header present"
else
  echo "❌ Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -q "X-Frame-Options: DENY"; then
  echo "✅ Frame-Options header present"
else
  echo "❌ Frame-Options header missing"
fi

if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
  echo "✅ CSP header present"
else
  echo "❌ CSP header missing"
fi

echo "🔒 Security headers check completed"
```

---

## 📱 Manual Testing Checklist

### User Experience Flow
```yaml
homepage:
  - [ ] Page loads without errors
  - [ ] Navigation menu works
  - [ ] Call-to-action buttons functional
  - [ ] Responsive on mobile

authentication:
  - [ ] Registration form works
  - [ ] Login form works  
  - [ ] Password reset works
  - [ ] Session persistence works

courses:
  - [ ] Course listing displays
  - [ ] Course details accessible
  - [ ] Enrollment process works
  - [ ] Progress tracking works

payments:
  - [ ] Payment form loads
  - [ ] Stripe integration works
  - [ ] Success/failure handling
  - [ ] Receipt generation

administration:
  - [ ] Admin login works
  - [ ] Course creation works
  - [ ] User management accessible
  - [ ] Analytics dashboard loads
```

### Browser Compatibility
```yaml
desktop_browsers:
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)  
  - [ ] Safari (latest)
  - [ ] Edge (latest)

mobile_browsers:
  - [ ] Chrome Mobile
  - [ ] Safari Mobile
  - [ ] Samsung Internet
  - [ ] Firefox Mobile

responsive_design:
  - [ ] Mobile layout (320px+)
  - [ ] Tablet layout (768px+)
  - [ ] Desktop layout (1024px+)
  - [ ] Large desktop (1440px+)
```

---

## 📋 Post-Test Actions

### Success Checklist
```yaml
immediate:
  - [ ] Document test results
  - [ ] Update deployment status
  - [ ] Notify stakeholders
  - [ ] Enable monitoring alerts

within_24_hours:
  - [ ] Monitor error rates
  - [ ] Review performance metrics
  - [ ] Check user feedback
  - [ ] Validate analytics data

within_week:
  - [ ] User acceptance testing
  - [ ] Performance optimization
  - [ ] Security monitoring review
  - [ ] Documentation updates
```

### Communication Templates

#### Success Notification
```
🎉 DEPLOYMENT SUCCESSFUL: 7P Education Platform

✅ Status: Production deployment completed
🚀 URL: https://your-domain.com
⏱️ Deploy Time: [timestamp]
📊 Tests: 20/20 passed (100%)

All critical systems verified:
✅ Authentication system operational
✅ Payment processing functional  
✅ Course management active
✅ Security headers configured
✅ Performance metrics within targets

Next Steps:
- 24-hour monitoring active
- User feedback collection enabled
- Performance optimization scheduled

Team: [deployment team]
```

#### Issue Notification  
```
⚠️ DEPLOYMENT NOTICE: 7P Education Platform

🚀 Status: Deployed with non-critical issues
📊 Tests: 18/20 passed (90%)
🔧 Issues: 2 non-critical items identified

Critical Systems: ✅ All operational
Known Issues:
- [Issue 1 description and timeline]
- [Issue 2 description and timeline]

User Impact: Minimal to none
Resolution: Scheduled for next maintenance window

Monitoring: Enhanced monitoring active
Team: [deployment team]
```

---

**Test Status**: 📋 **READY FOR EXECUTION**  
**Last Updated**: 2025-08-26  
**Test Version**: 1.0  
**Estimated Duration**: 20-30 minutes complete validation