# 7P Education - Vercel Production Deployment Checklist

**Date**: 2025-08-26  
**Purpose**: Complete step-by-step production deployment guide  
**Target**: Vercel deployment with full production hardening  

## 🎯 Pre-Deployment Preparation

### ✅ Repository Status Check
- [x] **Code Quality**: All critical fixes applied (rate limiting, health check)
- [x] **Security Headers**: Enterprise-grade security headers configured
- [x] **Image Domains**: Supabase storage domains configured
- [x] **Sentry Integration**: Source maps and monitoring ready
- [ ] **Environment Variables**: All production values ready (see VERCEL_ENV.template)

### 📋 Required Resources Before Starting
1. **Supabase Project**: Live project with production database
2. **Stripe Account**: Live keys and webhook endpoint ready
3. **Sentry Project**: DSN and organization settings ready
4. **Domain Name**: Custom domain (optional but recommended)
5. **Vercel Account**: With GitHub integration enabled

---

## 🚀 Step 1: Vercel Project Setup

### 1.1 Create New Vercel Project
```bash
# Option A: Via Vercel CLI
npx vercel --prod

# Option B: Via Vercel Dashboard (Recommended)
# 1. Visit vercel.com/dashboard
# 2. Click "Add New" → "Project"
# 3. Import from GitHub: furkanyigit/7peducation
# 4. Configure project settings
```

### 1.2 Project Configuration
**Framework Preset**: Next.js  
**Root Directory**: `./`  
**Build Command**: `npm run build`  
**Output Directory**: `.next` (auto-detected)  
**Node.js Version**: `20.x`  

### 1.3 Initial Environment Variables Setup
```bash
# Required IMMEDIATELY for first deployment:
NEXT_PUBLIC_SUPABASE_URL=https://riupkkggupogdgubnhmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_KEY=[YOUR_SUPABASE_SERVICE_KEY]
NEXTAUTH_SECRET=[GENERATE_32_CHAR_SECRET]
NEXTAUTH_URL=[WILL_BE_SET_AFTER_DEPLOYMENT]
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

**⚠️ CRITICAL**: Never commit real values to repository. Use Vercel Dashboard → Settings → Environment Variables.

---

## 🔧 Step 2: Environment Variables Configuration

### 2.1 Access Environment Variables Settings
1. Go to Vercel Dashboard → Your Project
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production** environment

### 2.2 Required Environment Variables (Complete List)

#### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL
# Value: https://riupkkggupogdgubnhmy.supabase.co
# Environment: Production
# Description: Supabase project URL (safe for browser)

NEXT_PUBLIC_SUPABASE_ANON_KEY  
# Value: [GET_FROM_SUPABASE_DASHBOARD]
# Environment: Production
# Description: Supabase anonymous key (safe for browser)

SUPABASE_SERVICE_KEY
# Value: [GET_FROM_SUPABASE_DASHBOARD] 
# Environment: Production
# Description: Supabase service role key (SERVER ONLY)
```

#### Authentication Configuration
```bash
NEXTAUTH_SECRET
# Value: [GENERATE_WITH: openssl rand -hex 32]
# Environment: Production
# Description: NextAuth.js session encryption secret

NEXTAUTH_URL
# Value: https://your-domain.vercel.app
# Environment: Production  
# Description: Full production URL (set AFTER first deployment)
```

#### Stripe Payment Configuration
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Value: pk_live_[YOUR_LIVE_KEY] or pk_test_[YOUR_TEST_KEY]
# Environment: Production
# Description: Stripe publishable key (safe for browser)

STRIPE_SECRET_KEY  
# Value: sk_live_[YOUR_LIVE_KEY] or sk_test_[YOUR_TEST_KEY]
# Environment: Production
# Description: Stripe secret key (SERVER ONLY)

STRIPE_WEBHOOK_SECRET
# Value: whsec_[GENERATED_BY_STRIPE]
# Environment: Production
# Description: Stripe webhook endpoint secret (set AFTER webhook creation)
```

#### Monitoring & Analytics
```bash
NEXT_PUBLIC_SENTRY_DSN
# Value: https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
# Environment: Production
# Description: Sentry error monitoring DSN

SENTRY_ORG
# Value: [YOUR_SENTRY_ORG]
# Environment: Production
# Description: Sentry organization slug

SENTRY_PROJECT
# Value: [YOUR_SENTRY_PROJECT]
# Environment: Production  
# Description: Sentry project slug
```

#### Application Settings
```bash
NODE_ENV
# Value: production
# Environment: Production
# Description: Node.js environment mode

NEXT_PUBLIC_APP_ENV
# Value: production
# Environment: Production
# Description: Application environment indicator

ENABLE_USER_REGISTRATION
# Value: true
# Environment: Production
# Description: Enable user registration feature

ENABLE_EMAIL_VERIFICATION  
# Value: true
# Environment: Production
# Description: Enable email verification flow
```

### 2.3 Environment Variables Validation
After adding all variables, use this checklist:
- [ ] All Supabase keys added and verified
- [ ] NextAuth secret generated and added
- [ ] Stripe keys match intended mode (test/live)
- [ ] Sentry DSN and org settings correct
- [ ] All required variables marked as "Production"
- [ ] No variables contain placeholder text

---

## 🚀 Step 3: Initial Deployment

### 3.1 Trigger First Deployment
```bash
# Option A: Via GitHub push (if auto-deploy enabled)
git push origin main

# Option B: Via Vercel Dashboard
# 1. Go to Deployments tab
# 2. Click "Create Deployment"
# 3. Select main branch
# 4. Click "Deploy"
```

### 3.2 Monitor Deployment
1. **Build Logs**: Watch for compilation errors
2. **Function Deployment**: Verify API routes deploy successfully
3. **Static Assets**: Confirm static files uploaded
4. **Deployment Status**: Wait for "Ready" status

### 3.3 First Deployment Validation
```bash
# Test basic connectivity (replace with your URL)
curl -I https://your-app-name.vercel.app

# Expected: HTTP/2 200 OK with security headers
```

---

## 🔗 Step 4: Domain Configuration (Optional but Recommended)

### 4.1 Custom Domain Setup
1. **Vercel Dashboard** → Settings → **Domains**
2. **Add Domain**: `your-domain.com`
3. **DNS Configuration**: Add CNAME record pointing to `cname.vercel-dns.com`
4. **SSL Certificate**: Auto-provisioned by Vercel

### 4.2 Update NEXTAUTH_URL
After domain configuration:
1. **Environment Variables** → Edit `NEXTAUTH_URL`
2. **New Value**: `https://your-domain.com`
3. **Redeploy**: Trigger new deployment for changes to take effect

### 4.3 Supabase Auth Configuration
Update redirect URLs in Supabase:
1. **Supabase Dashboard** → Authentication → **URL Configuration**
2. **Site URL**: `https://your-domain.com`  
3. **Redirect URLs**: Add `https://your-domain.com/api/auth/callback/credentials`

---

## 🔐 Step 5: Security Hardening

### 5.1 Verify Security Headers
```bash
# Test security headers (replace with your domain)
curl -I https://your-domain.com

# Required headers should be present:
# - Strict-Transport-Security
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy
# - X-XSS-Protection
```

### 5.2 SSL/TLS Configuration
- [x] **SSL Certificate**: Auto-provisioned by Vercel
- [x] **HSTS**: Configured in next.config.ts
- [x] **Secure Headers**: Enterprise-grade headers active
- [ ] **SSL Labs Test**: Run SSL test at ssllabs.com (Grade A expected)

### 5.3 Content Security Policy Validation
```bash
# Test CSP compliance
# Visit: https://csp-evaluator.withgoogle.com/
# Enter your domain URL for analysis
```

---

## 💳 Step 6: Stripe Webhook Configuration

### 6.1 Create Production Webhook
1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Add endpoint**: `https://your-domain.com/api/webhooks/stripe`
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### 6.2 Configure Webhook Secret
1. **Copy webhook signing secret** from Stripe dashboard
2. **Vercel Environment Variables** → Add `STRIPE_WEBHOOK_SECRET`
3. **Redeploy** to activate webhook processing

### 6.3 Test Webhook Connectivity
```bash
# Test webhook endpoint accessibility
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Expected: 400 Bad Request (signature required)
# This confirms endpoint is accessible
```

---

## 📊 Step 7: Monitoring Setup

### 7.1 Sentry Configuration
1. **Verify Sentry DSN** in environment variables
2. **Create Release**:
   ```bash
   # This will happen automatically on deployment
   # Sentry will create release: 7p-education@{commit-sha}
   ```
3. **Source Maps**: Auto-uploaded during build process

### 7.2 Vercel Analytics (Built-in)
- [x] **Web Vitals**: Automatically enabled
- [x] **Function Metrics**: Automatically tracked
- [x] **Deployment Logs**: Available in dashboard

### 7.3 Health Check Monitoring
```bash
# Set up external monitoring (recommended)
# Options: UptimeRobot, Pingdom, StatusCake
# Monitor: https://your-domain.com/api/health
# Expected: 200 OK with {"status":"healthy"}
```

---

## ✅ Step 8: Post-Deployment Validation

### 8.1 Critical Endpoints Test
```bash
# Health check
curl https://your-domain.com/api/health

# Authentication providers
curl https://your-domain.com/api/auth/providers

# API functionality (should require auth)
curl https://your-domain.com/api/courses
```

### 8.2 User Flow Validation
- [ ] **Homepage loads** without errors
- [ ] **Registration page** accessible
- [ ] **Login page** functional
- [ ] **Course listing** displays
- [ ] **Admin panel** requires authentication

### 8.3 Performance Validation
```bash
# Test Core Web Vitals (use Google PageSpeed Insights)
# Visit: https://pagespeed.web.dev/
# Test URL: https://your-domain.com
# Target: Score > 90 for all metrics
```

---

## 🚨 Step 9: Production Readiness Final Checks

### 9.1 Security Validation
- [ ] **SSL certificate** active and valid
- [ ] **Security headers** present and correct
- [ ] **CSP policy** configured and working
- [ ] **No console.log** statements in production build
- [ ] **Error monitoring** capturing issues

### 9.2 Functionality Validation
- [ ] **Database connectivity** confirmed
- [ ] **Authentication flow** working
- [ ] **API endpoints** responding correctly
- [ ] **File uploads** (if applicable) working
- [ ] **Payment processing** ready for testing

### 9.3 Performance Validation
- [ ] **Page load times** < 3 seconds
- [ ] **API response times** < 500ms
- [ ] **Image optimization** working
- [ ] **Caching headers** correct

### 9.4 Monitoring Validation
- [ ] **Health checks** returning healthy status
- [ ] **Error tracking** active in Sentry
- [ ] **Deployment notifications** working
- [ ] **Webhook processing** functional

---

## 📋 Deployment Completion Checklist

### Technical Sign-off
- [ ] All environment variables configured and verified
- [ ] Domain and SSL configuration complete
- [ ] Security headers and CSP policies active
- [ ] Stripe webhooks configured and tested
- [ ] Monitoring and error tracking operational
- [ ] Performance metrics within acceptable ranges
- [ ] Database connectivity confirmed
- [ ] API endpoints functional

### Business Sign-off  
- [ ] User flows tested end-to-end
- [ ] Admin functionality accessible
- [ ] Content management operational
- [ ] Payment processing ready
- [ ] User registration and authentication working

### Operational Sign-off
- [ ] Backup and recovery procedures documented
- [ ] Monitoring alerts configured
- [ ] Support documentation updated
- [ ] Incident response plan ready
- [ ] Team access and permissions configured

---

## 🔄 Post-Deployment Actions

### Immediate (0-24 hours)
1. **Monitor deployment** for any critical errors
2. **Test all critical user flows** manually
3. **Verify monitoring systems** are capturing data
4. **Check payment processing** with test transactions

### Short-term (1-7 days)
1. **Performance optimization** based on real usage data
2. **User feedback collection** and issue resolution
3. **Security monitoring** review and adjustment
4. **Content and feature testing** by end users

### Medium-term (1-4 weeks)
1. **Analytics review** and optimization opportunities
2. **Feature rollout** of advanced functionality
3. **User onboarding** improvements based on feedback
4. **Scaling preparation** for increased usage

---

## 🆘 Troubleshooting Common Issues

### Build Failures
```bash
# Common issues:
# 1. Environment variables missing → Check VERCEL_ENV.template
# 2. TypeScript errors → Review next.config.ts settings
# 3. Dependency issues → Check package.json and lock files
```

### Runtime Errors
```bash  
# Check Function logs in Vercel Dashboard
# Common issues:
# 1. Database connection → Verify Supabase keys
# 2. Authentication → Check NEXTAUTH_URL and redirects  
# 3. API errors → Review rate limiting and security
```

### Performance Issues
```bash
# Monitor in Vercel Dashboard → Analytics
# Common issues:
# 1. Slow API responses → Check database queries
# 2. Large bundle sizes → Review imports and code splitting
# 3. Image loading → Verify image domains configuration
```

---

**Deployment Status**: 🚀 **READY FOR PRODUCTION**  
**Next Step**: Follow this checklist step-by-step  
**Support**: See RUNBOOK_PROD.md for ongoing operations

**Last Updated**: 2025-08-26  
**Checklist Version**: 1.0  
**Project**: 7P Education Platform