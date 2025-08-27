# 7P Education - Production Operations Runbook

> **⚠️ DEPRECATED**: Bu dokümantasyon arşivlenmiştir. 
> Güncel bilgi için: [docs/operations/RUNBOOK.md](../../../operations/RUNBOOK.md) sayfasına bakın.

**Date**: 2025-08-26  
**Purpose**: Complete production deployment and operations guide  
**Target**: DevOps team, project owner  

---

## 📋 Quick Reference

### Critical Commands
```bash
# Health check
curl https://your-domain.com/api/health

# Emergency rollback
vercel rollback --url your-domain.com

# View production logs
vercel logs your-domain.com

# Environment variables
vercel env ls
```

### Emergency Contacts & Resources
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Sentry Dashboard**: https://sentry.io/organizations/your-org/

---

## 🚀 Deployment Workflow

### Pre-Deployment Checklist
```yaml
repository:
  - [ ] All critical fixes applied (rate limiting, health check)
  - [ ] Code tested locally
  - [ ] Database migrations ready
  - [ ] Security headers configured
  - [ ] Dependencies up to date
  
environment:
  - [ ] Environment variables configured in Vercel
  - [ ] Database accessible from production
  - [ ] Stripe keys match environment (test vs live)
  - [ ] Domain DNS configured (if using custom domain)
```

### Deployment Process

#### 1. Initial Deployment
```bash
# Via GitHub (Recommended)
git add .
git commit -m "🚀 Production deployment: [description]"
git push origin main

# Via Vercel CLI
vercel --prod

# Monitor deployment
vercel logs --tail
```

#### 2. Environment Configuration
```bash
# Set critical environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add NEXTAUTH_SECRET production
vercel env add STRIPE_SECRET_KEY production

# Verify variables
vercel env ls
```

#### 3. Domain Setup (Optional)
```bash
# Add custom domain
vercel domains add your-domain.com

# Verify DNS configuration
vercel domains ls
```

### Post-Deployment Validation

#### Immediate Checks (0-5 minutes)
```bash
# Health endpoint
curl -I https://your-domain.com/api/health
# Expected: 200 OK

# Homepage load
curl -I https://your-domain.com
# Expected: 200 OK with security headers

# API functionality
curl https://your-domain.com/api/courses
# Expected: Proper API response (not 500)
```

#### Comprehensive Validation (5-30 minutes)
Follow **POST_DEPLOY_SMOKE.md** for complete testing procedures.

---

## 🔄 Ongoing Operations

### Daily Operations

#### Health Monitoring
```bash
# Check application health
curl https://your-domain.com/api/health | jq '.'

# Check Vercel function status
vercel inspect your-domain.com

# Review error logs
vercel logs your-domain.com --since 1d
```

#### Performance Monitoring
```bash
# Check Core Web Vitals
# Use: https://pagespeed.web.dev/

# Monitor function performance
vercel logs your-domain.com --since 1h | grep "REPORT"
```

### Weekly Operations

#### Security Updates
```bash
# Check for dependency vulnerabilities
npm audit

# Update dependencies
npm update

# Verify security headers
curl -I https://your-domain.com | grep -E "(X-|Content-Security|Strict-Transport)"
```

#### Performance Review
1. **Analytics Review**: Vercel Analytics dashboard
2. **Error Rate**: Sentry error dashboard
3. **Database Performance**: Supabase dashboard metrics
4. **API Response Times**: Function logs analysis

### Monthly Operations

#### Security Audit
```bash
# Run security smoke test
npm run test:security:prod

# Review access logs
# Check Supabase → Logs → Database
# Check Vercel → Functions → Logs
```

#### Backup Verification
1. **Database Backups**: Verify Supabase automatic backups
2. **Code Backups**: Verify GitHub repository integrity
3. **Environment Variables**: Export and securely store

---

## 🚨 Incident Response

### Severity Levels

#### P0 - Critical (Service Down)
- **Response Time**: Immediate (< 15 minutes)
- **Scope**: Complete service unavailability
- **Actions**: Immediate rollback, escalate to team

#### P1 - High (Major Feature Down)
- **Response Time**: < 1 hour
- **Scope**: Core features unavailable (auth, payments, courses)
- **Actions**: Investigate, fix, or rollback within 4 hours

#### P2 - Medium (Minor Issues)
- **Response Time**: < 4 hours
- **Scope**: Non-critical features affected
- **Actions**: Plan fix for next deployment window

#### P3 - Low (Cosmetic/Enhancement)
- **Response Time**: Next business day
- **Scope**: UI/UX improvements, minor bugs
- **Actions**: Add to backlog, address in regular cycle

### Emergency Procedures

#### Immediate Response (0-5 minutes)
```bash
# 1. Check service status
curl -I https://your-domain.com/api/health

# 2. Check recent deployments
vercel ls

# 3. Review recent logs
vercel logs your-domain.com --since 30m

# 4. If necessary, immediate rollback
vercel rollback --url your-domain.com
```

#### Investigation (5-30 minutes)
```bash
# Check function errors
vercel logs your-domain.com --since 1h | grep ERROR

# Check database connectivity
# Via Supabase Dashboard → Logs

# Check external services
# Stripe Dashboard → Events
# Sentry Dashboard → Issues
```

#### Communication Template
```
🚨 INCIDENT ALERT: [Service Name] - [Severity Level]

STATUS: [Investigating|Identified|Fixing|Resolved]
START TIME: [UTC timestamp]
IMPACT: [Description of user impact]
AFFECTED: [Features/users affected]

CURRENT STATUS:
- [Action taken]
- [Investigation findings]
- [Next steps]

ETA: [Expected resolution time]
UPDATES: Will update every 15 minutes

Team: [Responder names]
```

### Recovery Procedures

#### Rollback Process
```bash
# 1. Identify last known good deployment
vercel ls --limit 10

# 2. Rollback to specific deployment
vercel rollback --url your-domain.com [deployment-url]

# 3. Verify rollback successful
curl -I https://your-domain.com/api/health

# 4. Monitor for 15 minutes
vercel logs your-domain.com --tail
```

#### Database Recovery
```bash
# Access Supabase Dashboard
# Navigate to Database → Backups
# Select restore point
# Follow Supabase restore procedures

# Verify database connectivity after restore
curl https://your-domain.com/api/health
```

---

## 📊 Monitoring & Alerting

### Key Metrics

#### Application Metrics
- **Uptime**: Target 99.9% (43.2 minutes/month downtime)
- **Response Time**: API <500ms, Pages <3s
- **Error Rate**: <0.1% for critical endpoints
- **Availability**: Health endpoint returning 200

#### Business Metrics
- **User Registration**: Daily/weekly trends
- **Course Completion**: Success rates
- **Payment Processing**: Transaction success rate
- **API Usage**: Requests per minute/hour

### Alert Configuration

#### Critical Alerts (Immediate)
- Health endpoint returning 500
- Payment processing failures
- Authentication system down
- Database connectivity issues

#### Warning Alerts (15 minutes)
- Response time >2s for 5+ minutes
- Error rate >1% for 10+ minutes
- High memory usage (>80%)
- Failed deployments

### Monitoring Tools Setup

#### Vercel Analytics
- **Built-in**: Automatically enabled
- **Access**: Vercel Dashboard → Analytics
- **Metrics**: Core Web Vitals, function performance

#### Sentry Error Monitoring
```bash
# Verify Sentry integration
curl https://your-domain.com/api/health?test_error=true

# Check Sentry dashboard for test error
# Navigate to: https://sentry.io/organizations/your-org/
```

#### External Monitoring
Recommended external monitoring services:
- **Pingdom**: Uptime monitoring
- **StatusCake**: Multi-location monitoring
- **UptimeRobot**: Free basic monitoring

---

## 🛠️ Maintenance

### Regular Maintenance Windows

#### Monthly Maintenance (First Saturday, 2-4 AM UTC)
```yaml
tasks:
  - Dependency updates and security patches
  - Database maintenance and optimization
  - SSL certificate renewal (automatic)
  - Backup verification
  - Performance optimization
```

#### Quarterly Maintenance (First Saturday of Quarter, 2-6 AM UTC)
```yaml
tasks:
  - Major framework updates
  - Infrastructure optimization
  - Security audit and penetration testing
  - Disaster recovery testing
  - Documentation updates
```

### Maintenance Procedures

#### Pre-Maintenance
```bash
# 1. Notify users (if necessary)
# 2. Create database backup
# 3. Test changes in staging environment
# 4. Prepare rollback plan
# 5. Have team on standby
```

#### During Maintenance
```bash
# 1. Enable maintenance mode (if needed)
# 2. Apply updates
# 3. Run validation tests
# 4. Monitor system health
# 5. Document changes
```

#### Post-Maintenance
```bash
# 1. Disable maintenance mode
# 2. Run comprehensive smoke tests
# 3. Monitor for 30 minutes
# 4. Update documentation
# 5. Notify completion
```

---

## 📈 Performance Optimization

### Performance Targets
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Time to Interactive**: <3.5s
- **API Response Time**: <500ms

### Optimization Strategies

#### Frontend Optimization
```yaml
images:
  - Use Next.js Image optimization
  - Implement proper image sizing
  - Use WebP/AVIF formats

bundles:
  - Monitor bundle sizes
  - Implement code splitting
  - Remove unused dependencies

caching:
  - Static assets: 1 year cache
  - API responses: Appropriate cache headers
  - CDN optimization via Vercel Edge Network
```

#### Backend Optimization
```yaml
database:
  - Implement query optimization
  - Add database indexes
  - Use connection pooling

api:
  - Implement response caching
  - Optimize API payload sizes
  - Use proper HTTP status codes

functions:
  - Optimize function cold starts
  - Minimize function bundle sizes
  - Implement proper error handling
```

### Performance Monitoring
```bash
# Generate Lighthouse report
npm run lighthouse:prod

# Check Core Web Vitals
# Visit: https://pagespeed.web.dev/

# Monitor function performance
vercel logs your-domain.com --since 1h | grep "REPORT RequestId"
```

---

## 🔐 Security Operations

### Security Checklist

#### Daily Security Checks
- [ ] Review failed authentication attempts
- [ ] Check for suspicious API usage patterns
- [ ] Monitor error logs for security-related issues
- [ ] Verify SSL certificate status

#### Weekly Security Review
- [ ] Review user access patterns
- [ ] Check for dependency vulnerabilities
- [ ] Analyze security headers compliance
- [ ] Review Stripe webhook security

#### Monthly Security Audit
- [ ] Run comprehensive security scan
- [ ] Review and rotate API keys
- [ ] Audit user permissions and roles
- [ ] Test backup and recovery procedures

### Security Monitoring
```bash
# Check security headers
curl -I https://your-domain.com | grep -E "(X-|Content-Security|Strict-Transport)"

# Test SSL configuration
# Visit: https://www.ssllabs.com/ssltest/

# Run security smoke test
npm run test:security:prod
```

---

## 📚 Documentation & Knowledge Base

### Runbook Documentation
- **VERCEL_DEPLOY_CHECKLIST.md**: Complete deployment guide
- **POST_DEPLOY_SMOKE.md**: Post-deployment validation
- **STRIPE_WEBHOOK_SETUP.md**: Payment integration setup
- **SENTRY_SOURCEMAPS_GUIDE.md**: Error monitoring setup

### Troubleshooting Guides
- **Common Issues**: Database connectivity, authentication, payments
- **Error Codes**: HTTP status codes and their meanings
- **Recovery Procedures**: Step-by-step recovery instructions

### Contact Information
```yaml
emergency_contacts:
  - role: Project Owner
    contact: [to be provided]
  - role: Technical Lead  
    contact: [to be provided]
  - role: DevOps Engineer
    contact: [to be provided]

escalation_path:
  - Level 1: On-call engineer
  - Level 2: Technical lead
  - Level 3: Project owner
  - Level 4: External support (Vercel, Supabase)
```

---

## 🔄 Change Management

### Deployment Approval Process

#### Hotfix Deployment (Critical Issues)
1. **Approval**: Technical lead approval required
2. **Testing**: Minimal testing in staging
3. **Deployment**: Direct deployment to production
4. **Monitoring**: Intensive monitoring for 1 hour post-deployment

#### Regular Deployment (Features/Improvements)
1. **Code Review**: PR review and approval
2. **Testing**: Full testing suite in staging
3. **Scheduling**: Deploy during maintenance windows
4. **Documentation**: Update relevant documentation

#### Major Release (Breaking Changes)
1. **Planning**: 1-week advance notice
2. **Testing**: Comprehensive testing in staging
3. **Rollback Plan**: Detailed rollback procedures
4. **Communication**: User notification if necessary

### Rollback Procedures
```bash
# Quick rollback (emergency)
vercel rollback --url your-domain.com

# Planned rollback with specific version
vercel ls  # Find deployment ID
vercel rollback --url your-domain.com [deployment-id]

# Verify rollback
curl -I https://your-domain.com/api/health
```

---

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-08-26  
**Next Review**: 2025-09-26  
**Owner**: 7P Education Technical Team