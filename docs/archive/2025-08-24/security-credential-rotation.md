# 🔐 Security Credential Rotation Guide

## IMMEDIATE ACTION REQUIRED - COMPROMISED CREDENTIALS DETECTED

### Critical Security Issues Found:
1. **Database Password**: `Furkan1453@@` - Weak and exposed in multiple environment files
2. **JWT Secrets**: Exposed in version control and multiple environment files  
3. **Service Role Key**: Exposed in .env.local (CRITICAL - bypasses all RLS policies)
4. **NextAuth Secret**: Reused across environments

## Emergency Credential Rotation Steps

### Step 1: Immediate Actions (Do Now - 15 minutes)

#### 1.1 Supabase Database Password Rotation
```bash
# 1. Log into Supabase Dashboard: https://app.supabase.com
# 2. Navigate to Settings → Database
# 3. Reset database password with strong password:
#    - Minimum 16 characters
#    - Mix of uppercase, lowercase, numbers, symbols
#    - Avoid dictionary words
# 4. Generate new password:
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
# Example result: K8mN2pQ7rT5vW9xA3zBc
```

#### 1.2 Service Role Key Rotation  
```bash
# 1. In Supabase Dashboard → Settings → API
# 2. Click "Generate new service role key"
# 3. Copy the new key immediately
# 4. Update all applications using this key
```

#### 1.3 Generate New JWT Secrets
```bash
# New JWT Secret (256-bit minimum)
openssl rand -base64 64

# New NextAuth Secret (256-bit minimum)  
openssl rand -base64 32
```

### Step 2: Update Environment Files (30 minutes)

#### 2.1 Production Environment
```bash
# Update .env.production with new credentials:
SUPABASE_DB_URL=postgresql://postgres.riupkkggupogdgubnhmy:NEW_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_SERVICE_ROLE_KEY=NEW_SERVICE_ROLE_KEY
JWT_SECRET=NEW_JWT_SECRET
NEXTAUTH_SECRET=NEW_NEXTAUTH_SECRET
ENABLE_EMAIL_VERIFICATION=true  # ENABLE this!
```

#### 2.2 Development Environment  
```bash
# Update .env.local with different secrets (never reuse production secrets):
SUPABASE_DB_URL=postgresql://postgres.riupkkggupogdgubnhmy:DEV_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_SERVICE_ROLE_KEY=DEV_SERVICE_ROLE_KEY
JWT_SECRET=DEV_JWT_SECRET  
NEXTAUTH_SECRET=DEV_NEXTAUTH_SECRET
```

### Step 3: Vercel Deployment Update (10 minutes)

#### 3.1 Update Vercel Environment Variables
```bash
# Using Vercel CLI
vercel env add SUPABASE_DB_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production  
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add ENABLE_EMAIL_VERIFICATION production

# Set to: true (enable email verification!)
```

#### 3.2 Redeploy Application
```bash
vercel deploy --prod
```

### Step 4: Security Validation (15 minutes)

#### 4.1 Test Authentication Flow
- [ ] Login with existing account
- [ ] Logout and verify session terminated
- [ ] Test protected route access
- [ ] Verify email verification is required for new users
- [ ] Test rate limiting (5 failed attempts should trigger lockout)

#### 4.2 Database Access Validation
- [ ] Test application can connect to database
- [ ] Verify RLS policies are active
- [ ] Test API endpoints function correctly
- [ ] Check that service role access works

### Step 5: Monitoring & Cleanup (10 minutes)

#### 5.1 Enable Security Monitoring
```bash
# Monitor security logs for any unusual activity
tail -f /var/log/app/security.log

# Check Supabase Auth logs:
# Dashboard → Auth → Logs
```

#### 5.2 Revoke Old Credentials
- [ ] Confirm old database password no longer works
- [ ] Verify old service role key is disabled
- [ ] Check that old JWT tokens are invalidated
- [ ] Monitor for any failed authentication attempts

## Post-Rotation Security Checklist

### Immediate Verification (Next 24 hours)
- [ ] All critical functions working with new credentials
- [ ] No authentication errors in production
- [ ] Email verification working for new signups  
- [ ] Rate limiting active and functioning
- [ ] Security headers properly configured
- [ ] Session timeouts working correctly

### Security Hardening
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Implement comprehensive input validation
- [ ] Configure production-grade rate limiting
- [ ] Enable security event monitoring
- [ ] Set up security alerting

## Ongoing Security Practices

### Regular Credential Rotation Schedule
- **JWT Secrets**: Every 90 days
- **Database Passwords**: Every 180 days  
- **Service Role Keys**: Every 365 days
- **NextAuth Secrets**: Every 180 days

### Security Monitoring
- Enable failed login attempt alerting
- Monitor suspicious IP address activity
- Track credential usage patterns
- Set up database access monitoring

## Emergency Contact Information

**If you suspect ongoing breach or need immediate assistance:**

- **Security Team**: security@7peducation.com
- **Emergency**: admin@7peducation.com  
- **Supabase Support**: https://supabase.com/support

## Documentation References

- [Supabase Security Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [7P Education Security Guidelines](../docs/04-reference/security-guidelines.md)

---

**Generated**: August 24, 2025  
**Severity**: CRITICAL  
**Action Required**: IMMEDIATE (Within 1 hour)  
**Classification**: CONFIDENTIAL