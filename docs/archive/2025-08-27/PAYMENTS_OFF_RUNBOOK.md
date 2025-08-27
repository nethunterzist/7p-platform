# 🔧 PAYMENTS_OFF_RUNBOOK.md

**7P Education - Payments Disabled Mode Operation Guide**

Comprehensive guide for operating the 7P Education platform with payments disabled (`PAYMENTS_MODE=disabled`). This mode enables live testing, demos, and content validation without payment processing.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Feature Behavior](#feature-behavior)
4. [API Endpoints](#api-endpoints)
5. [UI/UX Changes](#uiux-changes)
6. [Testing Procedures](#testing-procedures)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Rollback Procedures](#rollback-procedures)

---

## 🔍 Overview

### Purpose
Payments disabled mode allows the platform to operate without Stripe integration while maintaining full course enrollment and learning functionality through a free enrollment system.

### Key Benefits
- ✅ Live testing without payment processing
- ✅ Content validation and QA workflows
- ✅ Demo environments for stakeholders
- ✅ Development and staging environments
- ✅ Emergency fallback if payment processor unavailable

### Mode Indicators
- All payment routes return `501 Not Implemented`
- UI shows "Enroll (Free/Test)" instead of payment buttons
- Health check excludes Stripe validation
- Course cards display "TEST ÜCRETSİZ" badges

---

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Core Configuration
PAYMENTS_MODE=disabled              # Disables payment processing
FEATURE_ENROLL_FREE=true           # Enables free enrollment API

# Optional Configuration
FREE_ENROLLMENT_CODE=TEST2024      # Optional access code for enrollment
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Environment Files

**Production (.env.production)**
```bash
PAYMENTS_MODE=disabled
FEATURE_ENROLL_FREE=true
FREE_ENROLLMENT_CODE=PROD_TEST_2024
```

**Staging (.env.staging)**
```bash
PAYMENTS_MODE=disabled
FEATURE_ENROLL_FREE=true
# No enrollment code for easier testing
```

**Local Development (.env.local)**
```bash
PAYMENTS_MODE=disabled
FEATURE_ENROLL_FREE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Configuration

```bash
# Set via Vercel Dashboard or CLI
vercel env add PAYMENTS_MODE production disabled
vercel env add FEATURE_ENROLL_FREE production true
vercel env add FREE_ENROLLMENT_CODE production YOUR_CODE_HERE
```

### Docker Configuration

```dockerfile
# Dockerfile
ENV PAYMENTS_MODE=disabled
ENV FEATURE_ENROLL_FREE=true
```

---

## 🎯 Feature Behavior

### Payment Processing
- **Status**: Completely disabled
- **API Response**: All payment endpoints return `501 Not Implemented`
- **UI Impact**: Payment buttons replaced with free enrollment
- **Webhooks**: Stripe webhooks ignored (return early with 200 OK)

### Course Enrollment
- **Method**: Free enrollment via `/api/enroll/free`
- **Authentication**: Required (users must be logged in)
- **Access Code**: Optional (controlled by `FREE_ENROLLMENT_CODE`)
- **Validation**: Course existence and publication status checked
- **Audit**: All enrollments logged for compliance

### User Experience
- **Visual Indicator**: "TEST ÜCRETSİZ" badges on course cards
- **Button Text**: "Enroll (Free/Test)" instead of "Buy Now"
- **Price Display**: Original price crossed out with "TEST ÜCRETSİZ" label
- **Purchase Pages**: Redirect to course pages with payment disabled notice

### Course Access
- **Immediate**: Users gain immediate access after enrollment
- **Full Content**: Complete course materials and features available
- **Progress Tracking**: Normal progress tracking and certificates
- **Social Features**: Comments, reviews, and community features active

---

## 🔌 API Endpoints

### Disabled Endpoints (Return 501)

```bash
POST /api/payments/create-checkout-session
POST /api/payments/create-payment-intent
POST /api/payments/customer-portal
GET  /api/payments/history
GET  /api/payments/subscriptions
PATCH /api/payments/subscriptions
```

**Standard Response:**
```json
{
  "success": false,
  "message": "payments_disabled",
  "error": "Payment processing is currently disabled. Contact support for assistance.",
  "mode": "disabled"
}
```

### Active Endpoints

#### Free Enrollment API
```bash
POST /api/enroll/free
```

**Request Body:**
```json
{
  "courseId": "uuid-course-id",
  "code": "optional-enrollment-code"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully enrolled in course",
  "enrollment": {
    "id": "enrollment-uuid",
    "courseId": "course-uuid",
    "userId": "user-uuid",
    "plan": "free",
    "status": "active",
    "enrolledAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401`: Authentication required
- `400`: Invalid course ID or missing required fields
- `403`: Invalid enrollment code (if required)
- `404`: Course not found or not published
- `409`: Already enrolled in course
- `429`: Rate limit exceeded
- `501`: Free enrollment disabled

#### Health Check API
```bash
GET /api/health
```

**Response with Payments Disabled:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "memory": true,
    "disk": true,
    "stripe": null
  }
}
```

---

## 🎨 UI/UX Changes

### Course Cards

**Before (Payments Enabled):**
```
[Course Image]
Course Title
₺299 BETA ÜCRETSİZ
[Detail] [Beta'da Ücretsiz Al!]
```

**After (Payments Disabled):**
```
[Course Image]
TEST ÜCRETSİZ Badge
Course Title
₺299 TEST ÜCRETSİZ
[Detail] [Enroll (Free/Test)]
```

### Course Detail Pages
- Purchase buttons replaced with enrollment buttons
- Payment information sections hidden
- "Free enrollment available" notices displayed
- Pricing crossed out with test indicators

### Purchase Page Behavior
- Automatic redirect to course page
- URL parameter: `?payments=disabled`
- Information banner about test mode

### Dashboard Changes
- Normal course access and progress
- Payment history sections hidden
- Subscription management unavailable

---

## 🧪 Testing Procedures

### Pre-Deployment Checklist

1. **Environment Validation**
```bash
# Verify environment variables
echo $PAYMENTS_MODE        # Should be "disabled"
echo $FEATURE_ENROLL_FREE  # Should be "true"

# Health check
curl https://your-domain.com/api/health
# Verify: stripe: null
```

2. **API Testing**
```bash
# Test payment endpoints are blocked
curl -X POST https://your-domain.com/api/payments/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"courseId":"test-id"}'
# Expected: 501 status

# Test free enrollment works
curl -X POST https://your-domain.com/api/enroll/free \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"courseId":"valid-course-id"}'
# Expected: 201 status
```

3. **UI Testing**
- [ ] Course cards show "TEST ÜCRETSİZ" badges
- [ ] Purchase buttons replaced with enrollment buttons
- [ ] Purchase pages redirect properly
- [ ] Free enrollment flow works end-to-end
- [ ] Course access granted immediately after enrollment

### Automated Tests

```bash
# Run payment guard tests
npm test tests/api/payment-guard.test.ts

# Run free enrollment tests
npm test tests/enrollment/free-enroll.test.ts

# Run UI hook tests
npm test tests/hooks/usePaymentMode.test.tsx

# Full test suite
npm test
```

### Manual Testing Flow

1. **User Journey Test**
   - Navigate to course catalog
   - Verify "TEST ÜCRETSİZ" indicators
   - Click "Enroll (Free/Test)" button
   - Complete enrollment process
   - Access course content
   - Verify full functionality

2. **Error Handling Test**
   - Test enrollment without authentication
   - Test enrollment with invalid course ID
   - Test enrollment with wrong access code
   - Test duplicate enrollment prevention

3. **Admin Testing**
   - Verify course management still works
   - Check enrollment analytics
   - Validate audit logs

---

## 📊 Monitoring & Health Checks

### Key Metrics to Monitor

1. **API Health**
   - `/api/health` response time and status
   - Payment endpoint 501 responses (should be 100%)
   - Free enrollment success rate

2. **Enrollment Metrics**
   - Free enrollments per hour/day
   - Enrollment failure rate
   - Time from enrollment to first content access

3. **User Experience**
   - Page load times for course pages
   - Bounce rate on purchase pages (should be low due to redirects)
   - User session duration

### Monitoring Commands

```bash
# Health check
curl -s https://your-domain.com/api/health | jq '.checks.stripe'
# Expected: null

# Payment endpoint status
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://your-domain.com/api/payments/create-payment-intent
# Expected: 501

# Free enrollment availability
curl -s https://your-domain.com/api/enroll/free \
  -X POST -H "Content-Type: application/json" -d '{}' | jq '.success'
# Expected: false (but endpoint should respond)
```

### Alerting Setup

```yaml
# Example alerting rules
- alert: PaymentsNotDisabled
  expr: health_check_stripe_enabled == 1
  for: 1m
  annotations:
    summary: "Payments not properly disabled"
    
- alert: FreeEnrollmentDown
  expr: free_enrollment_success_rate < 0.95
  for: 5m
  annotations:
    summary: "Free enrollment success rate below 95%"
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Payment Buttons Still Showing
**Symptom:** Course cards show payment buttons instead of enrollment buttons

**Diagnosis:**
```bash
# Check environment
echo $PAYMENTS_MODE
# Should output: disabled

# Check health endpoint
curl https://your-domain.com/api/health | jq '.checks.stripe'
# Should output: null
```

**Solutions:**
- Verify `PAYMENTS_MODE=disabled` in environment
- Clear browser cache and CDN cache
- Restart application servers
- Check if environment variables are properly loaded

#### 2. Free Enrollment API Not Working
**Symptom:** `/api/enroll/free` returns 501 or 404

**Diagnosis:**
```bash
# Check feature flag
echo $FEATURE_ENROLL_FREE
# Should output: true

# Check API directly
curl -X POST https://your-domain.com/api/enroll/free \
  -H "Content-Type: application/json" -d '{}'
```

**Solutions:**
- Set `FEATURE_ENROLL_FREE=true`
- Verify API route is deployed
- Check database connectivity
- Review application logs

#### 3. Enrollment Code Issues
**Symptom:** Valid codes rejected or codes required when not set

**Diagnosis:**
```bash
# Check enrollment code setting
echo $FREE_ENROLLMENT_CODE

# Test with/without code
curl -X POST https://your-domain.com/api/enroll/free \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"courseId":"test-id","code":"TEST_CODE"}'
```

**Solutions:**
- Verify code matches environment variable exactly
- Clear code variable if not needed: `unset FREE_ENROLLMENT_CODE`
- Check for whitespace or encoding issues

#### 4. Health Check Shows Payments Enabled
**Symptom:** Health endpoint shows `"stripe": true`

**Diagnosis:**
```bash
# Check all related environment variables
env | grep -E "(PAYMENTS_MODE|STRIPE)"

# Test health endpoint
curl https://your-domain.com/api/health | jq '.checks'
```

**Solutions:**
- Ensure `PAYMENTS_MODE=disabled` (not `PAYMENTS_MODE=stripe`)
- Remove or unset `STRIPE_SECRET_KEY` environment variable
- Restart application to reload environment
- Check for environment variable conflicts

### Error Codes Reference

| Code | Endpoint | Meaning | Action |
|------|----------|---------|---------|
| 501 | `/api/payments/*` | Payments disabled (expected) | Normal behavior |
| 501 | `/api/enroll/free` | Feature disabled | Set `FEATURE_ENROLL_FREE=true` |
| 401 | `/api/enroll/free` | Authentication required | Ensure user logged in |
| 403 | `/api/enroll/free` | Invalid enrollment code | Check code or remove requirement |
| 404 | `/api/enroll/free` | Course not found | Verify course ID and publication status |
| 409 | `/api/enroll/free` | Already enrolled | Normal behavior, user has access |
| 429 | `/api/enroll/free` | Rate limited | Wait and retry, check rate limits |

### Logs to Monitor

```bash
# Application logs
tail -f logs/application.log | grep -E "(payment|enroll|stripe)"

# Error logs
tail -f logs/error.log | grep -E "(501|payment|stripe)"

# Access logs
tail -f logs/access.log | grep -E "(/api/payments|/api/enroll)"
```

---

## 🔒 Security Considerations

### Data Protection
- **User Data**: All user data handling remains secure
- **Course Content**: Full access control maintained
- **Audit Trails**: All enrollments logged with IP and user agent
- **Rate Limiting**: Applied to free enrollment endpoint

### Access Control
- **Authentication**: Required for all enrollment actions
- **Authorization**: Course-level permissions respected
- **Enrollment Codes**: Optional additional access control layer
- **Admin Functions**: Unaffected by payment mode changes

### Risk Mitigation
- **Abuse Prevention**: Rate limiting and enrollment validation
- **Data Integrity**: Full validation of course and user states
- **Monitoring**: Comprehensive logging and alerting
- **Reversibility**: Easy rollback to payment-enabled mode

### Compliance Considerations
- **GDPR**: Data processing transparency maintained
- **Audit Requirements**: Enhanced logging for free enrollments
- **Terms of Service**: Consider updating for test/demo usage
- **Data Retention**: Standard policies apply to enrollment data

---

## 🔄 Rollback Procedures

### Emergency Rollback

**Immediate Actions (< 5 minutes):**
```bash
# Option 1: Environment variable change
export PAYMENTS_MODE=stripe
# Restart application

# Option 2: Vercel environment (if using)
vercel env add PAYMENTS_MODE production stripe
# Redeploy application

# Option 3: Docker restart
docker restart your-app-container
```

**Verification:**
```bash
# Confirm payments re-enabled
curl https://your-domain.com/api/health | jq '.checks.stripe'
# Should output: true or false (not null)

# Confirm payment endpoints work
curl -X POST https://your-domain.com/api/payments/create-payment-intent \
  -H "Content-Type: application/json" -d '{"courseId":"test"}'
# Should not return 501
```

### Planned Rollback

1. **Pre-rollback Checklist**
   - [ ] Ensure Stripe credentials are available
   - [ ] Verify payment processing infrastructure
   - [ ] Test payment endpoints in staging
   - [ ] Plan communication to users

2. **Rollback Steps**
   ```bash
   # Step 1: Update environment
   PAYMENTS_MODE=stripe
   FEATURE_ENROLL_FREE=false  # Optional: disable free enrollment
   
   # Step 2: Deploy changes
   # (Method depends on deployment process)
   
   # Step 3: Verify functionality
   # - Test payment processing
   # - Check UI changes
   # - Monitor error rates
   ```

3. **Post-rollback Validation**
   - [ ] Payment processing works
   - [ ] UI shows payment buttons
   - [ ] Health checks pass
   - [ ] No 501 errors in logs

### Data Considerations

**Free Enrollments:** Users enrolled via free enrollment system retain access when payments are re-enabled. Consider:
- Migrating to appropriate payment plans
- Grandfathering free access
- Converting to trial periods

**Audit Data:** Maintain all enrollment audit logs for compliance and analysis.

---

## 📞 Support & Contacts

### Technical Issues
- **Development Team**: [dev-team@7peducation.com]
- **DevOps Team**: [devops@7peducation.com]
- **On-call Engineer**: [oncall@7peducation.com]

### Business Decisions
- **Product Manager**: [product@7peducation.com]
- **Business Lead**: [business@7peducation.com]

### Emergency Escalation
- **CTO**: [cto@7peducation.com]
- **CEO**: [ceo@7peducation.com]

---

## 📚 Related Documentation

- [Environment Configuration Guide](./ENVIRONMENT_SETUP.md)
- [API Documentation](./API_DOCS.md)
- [Payment Processing Documentation](./PAYMENT_INTEGRATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guidelines](./SECURITY.md)

---

## 📝 Change Log

| Date | Version | Changes | Author |
|------|---------|---------|---------|
| 2024-01-01 | 1.0.0 | Initial implementation of payments disabled mode | Development Team |
| 2024-01-01 | 1.1.0 | Added comprehensive testing and monitoring | QA Team |
| 2024-01-01 | 1.2.0 | Enhanced security and audit logging | Security Team |

---

**⚠️ Important Notes:**
- Always test changes in staging environment first
- Maintain regular backups of enrollment data
- Monitor system health continuously during disabled mode
- Keep Stripe credentials secure even when payments disabled
- Document any custom configurations or modifications

**✅ Status:** Production Ready
**🔄 Last Updated:** 2024-01-01
**👥 Maintained By:** 7P Education Development Team