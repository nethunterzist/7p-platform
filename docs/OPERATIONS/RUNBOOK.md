# 7P Education - Operations Runbook

> Production operations, incident response ve deployment procedures

## 🎯 Kritik Bilgiler

- **Platform**: Vercel Edge Network + Supabase
- **Monitoring**: Sentry + Vercel Analytics + Health endpoints
- **Deployment**: Automatic via GitHub commits
- **Recovery Time**: <5 minutes for most incidents

## 🚨 Emergency Contacts & Escalation

### Incident Response Team
| Role | Contact | Responsibility | Response Time |
|------|---------|---------------|---------------|
| **Platform Lead** | @7p-team | System architecture, critical decisions | <15 min |
| **DevOps** | @devops-team | Infrastructure, deployments | <30 min |
| **Security** | @security-team | Security incidents, data breaches | <15 min |
| **Database** | @db-admin | Database issues, data integrity | <30 min |

### External Services
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Sentry Support**: [sentry.io/support](https://sentry.io/support)

## 🔥 Critical Incident Response

### Severity Levels

#### P0 - Critical (Response: <15 min)
- **Complete service outage**
- **Data breach or security incident**
- **Payment system complete failure**
- **Database corruption**

#### P1 - High (Response: <30 min)
- **Major feature unavailable**
- **Performance degradation >80%**
- **Authentication system issues**
- **High error rates (>5%)**

#### P2 - Medium (Response: <2 hours)
- **Minor feature issues**
- **Performance degradation 20-80%**
- **Non-critical API endpoints down**

#### P3 - Low (Response: <1 day)
- **Cosmetic issues**
- **Documentation updates**
- **Non-urgent improvements**

### Incident Response Procedure

#### 1. Detection & Alerting
```bash
# Health check
curl https://7peducation.vercel.app/api/health

# Response analysis
{
  "status": "healthy|unhealthy",
  "checks": {
    "basic": true|false,
    "memory": true|false,
    "stripe": "enabled|disabled|error"
  }
}
```

### 2. Initial Assessment (5 minutes)
- **Verify incident scope**: Single user vs. system-wide
- **Check monitoring dashboards**: Sentry, Vercel Analytics
- **Document initial findings**: Time, symptoms, affected users

#### 3. Communication
```yaml
# Incident channels
slack: "#incidents"
email: "incidents@7peducation.com"
status_page: "status.7peducation.com"

# Update template
title: "[INCIDENT] Brief description"
severity: "P0|P1|P2|P3"
status: "Investigating|Identified|Monitoring|Resolved"
impact: "Affected services and user count"
eta: "Expected resolution time"
```

### 4. Investigation & Resolution
- **Access production logs**: `vercel logs --follow`
- **Check error tracking**: Sentry dashboard
- **Database health**: Supabase dashboard
- **Apply fixes**: Hotfix deployment if needed

#### 5. Post-Incident Review
- **Root cause analysis** (within 24h)
- **Action items** for prevention
- **Documentation updates**
- **Process improvements**

## 📊 Monitoring & Alerting

### Health Monitoring

#### Application Health
```bash
# Health endpoint monitoring
GET /api/health

# Expected response structure
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "environment": "production",
  "paymentsMode": "stripe|disabled",
  "checks": {
    "basic": true,
    "memory": true,
    "database": true,
    "stripe": true|null
  },
  "metrics": {
    "responseTime": 45,
    "memoryUsage": 128
  }
}
```

### Key Metrics Dashboard
| Metric | Threshold | Alert Level | Action |
|--------|-----------|-------------|---------|
| **Response Time** | >2s | P2 | Investigate performance |
| **Error Rate** | >1% | P1 | Check logs immediately |
| **Memory Usage** | >400MB | P2 | Monitor for leaks |
| **Database Connections** | >80% | P1 | Scale connections |
| **Payment Success Rate** | <95% | P0 | Check Stripe status |

### Automated Monitoring Scripts

#### Health Check Script
```bash
#!/bin/bash
# scripts/health-monitor.sh

URL="https://7peducation.vercel.app"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL/api/health)

if [ $RESPONSE != "200" ]; then
  echo "ALERT: Health check failed with status $RESPONSE"
  # Send alert to Slack/email
fi
```

### Performance Monitor
```bash
#!/bin/bash
# scripts/performance-monitor.sh

# Check response times
for endpoint in "/api/courses" "/api/health" "/api/auth/session"; do
  RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null $URL$endpoint)
  echo "$endpoint: ${RESPONSE_TIME}s"
done
```

## 🚀 Deployment Operations

### Deployment Pipeline

#### Automatic Deployment (Production)
```yaml
trigger: push to main branch
stages:
  1. build: Next.js build + type checking
  2. test: Run test suite
  3. security: SAST scanning
  4. deploy: Vercel deployment
  5. verify: Health check + smoke tests

rollback_trigger: Health check failure
rollback_time: <2 minutes
```

#### Manual Deployment Commands
```bash
# Deploy to production
git push origin main

# Force deployment
vercel deploy --prod --force

# Rollback to previous deployment
vercel rollback [deployment-url]

# Environment variables update
vercel env add VARIABLE_NAME
vercel env rm VARIABLE_NAME
```

### Deployment Checklist

#### Pre-Deployment
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables updated
- [ ] Security scan completed
- [ ] Backup verification

#### Post-Deployment
- [ ] Health check passes
- [ ] Key user journeys tested
- [ ] Error rate monitoring (30 min)
- [ ] Performance metrics review
- [ ] Rollback plan confirmed

### Zero-Downtime Deployment

#### Strategy
1. **Blue-Green Deployment**: Vercel automatic
2. **Feature Flags**: PAYMENTS_MODE for major features
3. **Database Migrations**: Run before deployment
4. **Cache Warming**: Automatic via Vercel Edge

#### Rollback Procedure
```bash
# Immediate rollback (< 2 minutes)
vercel rollback

# Manual rollback with specific deployment
vercel rollback https://7peducation-abc123.vercel.app

# Database rollback (if needed)
npm run db:rollback
```

## 💾 Database Operations

### Backup & Recovery

#### Automated Backups
- **Supabase Automatic**: Daily full backups (7 days retention)
- **Point-in-time Recovery**: Available for 7 days
- **Manual Backup**: Before major releases

#### Backup Verification
```bash
# Test backup integrity
npm run db:backup:verify

# List available backups
supabase db backups list

# Restore from backup
supabase db restore [backup-id]
```

### Database Maintenance

#### Migration Procedure
```bash
# Development
supabase db reset
supabase db migrate up

# Production (automated via CI/CD)
npm run db:migrate:production

# Rollback migration
npm run db:migrate:rollback
```

#### Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Check connection pool
SELECT count(*) FROM pg_stat_activity;

-- Monitor table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔧 Troubleshooting Guides

### Common Issues & Solutions

#### 1. "Application Not Loading"
**Symptoms**: White screen, loading spinner forever
**Investigation**:
```bash
# Check deployment status
vercel ls

# Check build logs
vercel logs [deployment-url]

# Verify DNS
nslookup 7peducation.vercel.app
```

**Solutions**:
- Rollback to previous deployment
- Check for JavaScript errors in browser console
- Verify environment variables

#### 2. "Authentication Issues"
**Symptoms**: Login failures, session timeouts
**Investigation**:
```bash
# Check NextAuth configuration
GET /api/auth/session

# Verify Supabase connection
GET /api/health
```

**Solutions**:
- Verify NextAuth environment variables
- Check Supabase service status
- Clear browser cookies/localStorage

#### 3. "Payment System Down"
**Symptoms**: Payment buttons not working, checkout failures
**Investigation**:
```bash
# Check payment mode
GET /api/health
# Look for "paymentsMode": "disabled"

# Test Stripe connectivity
curl -X POST /api/payments/test
```

**Solutions**:
- Verify PAYMENTS_MODE environment variable
- Check Stripe webhook configuration
- Test Stripe API keys

#### 4. "Database Connection Issues"
**Symptoms**: 500 errors, database timeouts
**Investigation**:
```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Solutions**:
- Scale database connections
- Kill long-running queries
- Restart connection pool

#### 5. "High Memory Usage"
**Symptoms**: Application slowdown, memory alerts
**Investigation**:
```bash
# Check memory usage
GET /api/health
# Look at "memoryUsage" value

# Profile memory
node --inspect-brk server.js
```

**Solutions**:
- Restart application (automatic on Vercel)
- Investigate memory leaks
- Optimize data queries

## ⚙️ Environment Management

### Environment Variables

#### Production Environment
```bash
# Critical variables for production
NEXTAUTH_URL=https://7peducation.vercel.app
NEXTAUTH_SECRET=[secure-random-string]
NEXT_PUBLIC_SUPABASE_URL=[supabase-url]
SUPABASE_SERVICE_ROLE_KEY=[service-key]
PAYMENTS_MODE=stripe
STRIPE_SECRET_KEY=[stripe-key]
STRIPE_WEBHOOK_SECRET=[webhook-secret]
```

#### Environment Verification
```bash
# Verify all required variables
npm run env:verify

# Test environment connectivity
npm run env:test
```

### Configuration Management

#### Feature Flags
```javascript
// Feature flag configuration
const FEATURE_FLAGS = {
  PAYMENTS_MODE: process.env.PAYMENTS_MODE, // 'stripe' | 'disabled'
  FREE_ENROLLMENT: process.env.FREE_ENROLLMENT_CODE ? true : false,
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
  DEBUG_MODE: process.env.NODE_ENV === 'development'
};
```

## 📈 Performance Optimization

### Performance Monitoring

#### Key Performance Indicators
- **First Contentful Paint (FCP)**: <1.8s
- **Largest Contentful Paint (LCP)**: <2.5s
- **First Input Delay (FID)**: <100ms
- **Cumulative Layout Shift (CLS)**: <0.1
- **Time to Interactive (TTI)**: <3.8s

#### Performance Optimization Checklist
- [ ] Image optimization (Next.js Image component)
- [ ] Bundle size monitoring (<500KB initial load)
- [ ] Code splitting implementation
- [ ] CDN cache optimization
- [ ] Database query optimization
- [ ] API response compression

### Scaling Procedures

#### Automatic Scaling
- **Vercel Functions**: Automatic scaling based on demand
- **Supabase**: Connection pooling and read replicas
- **CDN**: Global edge caching via Vercel Edge Network

#### Manual Scaling
```bash
# Increase function timeout
vercel env add VERCEL_FUNCTION_TIMEOUT 30

# Database connection scaling
# Update Supabase project settings for connection limits
```

## 🔍 Log Analysis

### Log Aggregation

#### Vercel Logs
```bash
# Real-time logs
vercel logs --follow

# Function-specific logs
vercel logs --function=api/health

# Filter by time
vercel logs --since=1h
```

#### Sentry Integration
- **Error Grouping**: Automatic error clustering
- **Release Tracking**: Deployment-based error tracking
- **Performance Monitoring**: Transaction monitoring
- **Alerting**: Real-time incident alerts

### Log Analysis Patterns

#### Common Error Patterns
```bash
# Database connection errors
grep "ECONNREFUSED" logs/*.log

# Authentication errors
grep "NextAuth" logs/*.log | grep "ERROR"

# Payment processing errors
grep "Stripe" logs/*.log | grep "failed"
```

## 📋 Maintenance Procedures

### Regular Maintenance Tasks

#### Daily (Automated)
- [ ] Health check monitoring
- [ ] Error rate analysis
- [ ] Performance metrics review
- [ ] Security scan results

#### Weekly
- [ ] Dependency update review
- [ ] Database performance analysis
- [ ] Backup verification
- [ ] Security patches application

#### Monthly
- [ ] Full system health review
- [ ] Capacity planning assessment
- [ ] Incident post-mortem reviews
- [ ] Documentation updates

### Maintenance Windows

#### Scheduled Maintenance
- **Window**: Sundays 2-4 AM EST (lowest traffic)
- **Notification**: 24h advance notice
- **Communication**: Status page + email alerts
- **Rollback Plan**: <30 minute rollback capability

## 📞 Support Procedures

### User Support Escalation

#### Support Ticket Classification
| Level | Response Time | Examples |
|-------|---------------|----------|
| **L1** | <1 hour | Account access, basic questions |
| **L2** | <4 hours | Technical issues, payment problems |
| **L3** | <24 hours | Complex technical issues, data issues |

#### Support Investigation Tools
```bash
# User lookup
supabase db query "SELECT * FROM user_profiles WHERE email = 'user@example.com'"

# Payment history
supabase db query "SELECT * FROM payments WHERE user_id = 'user-id'"

# Enrollment status
supabase db query "SELECT * FROM course_enrollments WHERE user_id = 'user-id'"
```

---

**Related Docs**: [MONITORING.md](../MONITORING.md) | [SECURITY.md](../SECURITY.md) | [ENVIRONMENT.md](../ENVIRONMENT.md)  
*Last updated: 2025-01-27*