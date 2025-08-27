# 🛡️ Supabase Production Configuration Guide
## 7P Education Platform - Production Security Setup

**📅 Created**: 2024-08-20  
**🎯 Purpose**: Complete manual configuration guide for Supabase Dashboard production settings  
**⚠️ Critical**: These settings must be configured manually in the Supabase Dashboard

---

## 🚀 Pre-Configuration Checklist

- [ ] All auth hooks deployed via `scripts/deploy-auth-hooks.js`
- [ ] Database migrations completed
- [ ] Production environment variables set
- [ ] SSL certificates configured
- [ ] Domain verified for production

---

## 🔧 JWT Configuration

### Navigate to: **Authentication > Settings > JWT Settings**

```yaml
JWT Settings:
  JWT expiry: 900 seconds (15 minutes)
  JWT secret: [Auto-generated - DO NOT CHANGE]
  
Advanced Settings:
  Refresh token expiry: 604800 seconds (7 days)
  Refresh token rotation: ENABLED
  
Security Headers:
  Additional JWT claims: 
    - session_timeout: 1800 (30 minutes)
    - max_sessions: 3
```

**Configuration Steps:**
1. Click **Authentication** → **Settings**
2. Scroll to **JWT Settings** section
3. Set **JWT expiry** to `900` (15 minutes)
4. Enable **Refresh token rotation**
5. Set **Refresh token expiry** to `604800` (7 days)
6. Click **Save** to apply changes

---

## 📧 Email Authentication Configuration

### Navigate to: **Authentication > Settings > Email**

```yaml
Email Settings:
  Enable email confirmations: ✅ ENABLED
  Email confirmation grace period: 0 seconds (mandatory)
  
Email Templates:
  Confirmation Email:
    Subject: "7P Education - E-posta Adresinizi Doğrulayın"
    Template: [See Turkish template below]
    
  Recovery Email:
    Subject: "7P Education - Şifre Sıfırlama Talebi"
    Template: [See Turkish template below]
    
  Email Change:
    Subject: "7P Education - E-posta Değişikliği Doğrulama"
    Template: [See Turkish template below]
```

**Configuration Steps:**
1. Click **Authentication** → **Settings**
2. Navigate to **Email** tab
3. Ensure **Enable email confirmations** is checked
4. Set **Email confirmation grace period** to `0`
5. Configure email templates (see templates section below)

### 🇹🇷 Turkish Email Templates

**Confirmation Email Template:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
    <h1 style="color: #2563eb;">7P Education</h1>
    <h2 style="color: #374151;">E-posta Adresinizi Doğrulayın</h2>
  </div>
  
  <div style="padding: 20px 0;">
    <p>Merhaba,</p>
    <p>7P Education platformuna hoş geldiniz! Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        E-posta Adresimi Doğrula
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Bu bağlantı 24 saat boyunca geçerlidir. Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
    </p>
  </div>
  
  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
    <p>© 2024 7P Education. Tüm hakları saklıdır.</p>
    <p>Bu otomatik bir e-postadır, lütfen yanıtlamayın.</p>
  </div>
</div>
```

**Recovery Email Template:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
    <h1 style="color: #2563eb;">7P Education</h1>
    <h2 style="color: #374151;">Şifre Sıfırlama</h2>
  </div>
  
  <div style="padding: 20px 0;">
    <p>Merhaba,</p>
    <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni bir şifre belirlemek için aşağıdaki bağlantıya tıklayın:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Şifremi Sıfırla
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Bu bağlantı 1 saat boyunca geçerlidir. Eğer bu işlemi siz yapmadıysanız, hesabınız güvende - bu e-postayı görmezden gelebilirsiniz.
    </p>
    
    <p style="color: #dc2626; font-size: 14px; font-weight: bold;">
      🔒 Güvenlik: Şifrenizi hiçbir zaman başkalarıyla paylaşmayın.
    </p>
  </div>
  
  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
    <p>© 2024 7P Education. Tüm hakları saklıdır.</p>
  </div>
</div>
```

---

## 🔗 Auth Hooks Configuration

### Navigate to: **Authentication > Hooks**

**Required Hook URLs** (Replace `YOUR_PROJECT_URL` with your actual Supabase project URL):

```yaml
Hooks to Configure:

1. Custom Email Hook:
   Name: "Turkish Email Service"
   Events: ["send.signup", "send.recovery", "send.email_change"]
   URL: "https://YOUR_PROJECT_URL.supabase.co/functions/v1/auth-hooks/send-email-hook"
   HTTP Method: POST
   
2. Password Verification Hook:
   Name: "Advanced Password Security"
   Events: ["password_verification"]
   URL: "https://YOUR_PROJECT_URL.supabase.co/functions/v1/auth-hooks/password-verification-hook"
   HTTP Method: POST
   
3. MFA Verification Hook:
   Name: "Multi-Factor Authentication"
   Events: ["mfa_verification"]
   URL: "https://YOUR_PROJECT_URL.supabase.co/functions/v1/auth-hooks/mfa-verification-hook"
   HTTP Method: POST
```

**Configuration Steps:**
1. Click **Authentication** → **Hooks**
2. Click **Add Hook** for each hook
3. Fill in the details as specified above
4. Test each hook URL before saving
5. Enable hooks in production environment

---

## 🛡️ Security Settings

### Navigate to: **Authentication > Settings > Security**

```yaml
Security Configuration:

Site URL:
  - https://7peducation.vercel.app (Primary)
  - https://www.7peducation.com (Custom domain if applicable)
  
Redirect URLs:
  - https://7peducation.vercel.app/auth/callback
  - https://7peducation.vercel.app/auth/verification-success
  - https://7peducation.vercel.app/auth/verification-error
  
Security Settings:
  Enable email confirmations: ✅ ENABLED
  Enable phone confirmations: ❌ DISABLED (unless SMS setup)
  Enable custom SMTP: ✅ RECOMMENDED (use production SMTP)
  
Password Requirements:
  Minimum characters: 8
  Require uppercase: ✅ ENABLED
  Require lowercase: ✅ ENABLED  
  Require numbers: ✅ ENABLED
  Require symbols: ✅ ENABLED
```

**Configuration Steps:**
1. Click **Authentication** → **Settings** → **Security**
2. Add production URLs to **Site URL** and **Redirect URLs**
3. Enable **email confirmations**
4. Configure **custom SMTP** for production email delivery
5. Enable all **password requirements**

---

## 📊 Rate Limiting Configuration

### Navigate to: **Authentication > Rate Limits**

```yaml
Rate Limits (Per Hour):

Authentication Endpoints:
  Sign Up: 10 attempts/hour/IP
  Sign In: 20 attempts/hour/IP
  Password Recovery: 5 attempts/hour/IP
  Email Resend: 10 attempts/hour/IP
  
Advanced Protection:
  Captcha after: 3 failed attempts
  Account lockout: 5 failed attempts (15 min lockout)
  Progressive delays: ✅ ENABLED
  
IP-based Protection:
  Global rate limit: 1000 requests/hour/IP
  Auth endpoint limit: 50 requests/hour/IP
  Suspicious IP blocking: ✅ ENABLED
```

**Configuration Steps:**
1. Navigate to **Authentication** → **Rate Limits**
2. Set conservative limits for production
3. Enable **progressive delays**
4. Configure **captcha thresholds**
5. Enable **IP-based protection**

---

## 🔐 Advanced Security Configuration

### Navigate to: **Settings > Database > Extensions**

```yaml
Required Extensions:
  - pgcrypto: ✅ ENABLED (for password hashing)
  - uuid-ossp: ✅ ENABLED (for token generation) 
  - http: ✅ ENABLED (for webhook calls)
```

### Navigate to: **Settings > API**

```yaml
API Configuration:

RLS (Row Level Security):
  Default policy: ENABLED for all tables
  Anonymous access: RESTRICTED
  
Service Role:
  Usage: Server-side operations only
  Permissions: Minimal required scope
  
Database Settings:
  Max connections: 100 (adjust based on usage)
  Statement timeout: 30 seconds
  Connection pooling: ✅ ENABLED
```

---

## 📝 Production Checklist

### Pre-Launch Security Verification:

- [ ] **JWT Configuration**
  - [ ] JWT expiry set to 15 minutes
  - [ ] Refresh token expiry set to 7 days
  - [ ] Token rotation enabled

- [ ] **Email Configuration** 
  - [ ] Email confirmations enabled
  - [ ] Turkish email templates configured
  - [ ] Production SMTP configured
  - [ ] Email verification mandatory

- [ ] **Auth Hooks**
  - [ ] All 3 auth hooks deployed and configured
  - [ ] Hook URLs tested and responding
  - [ ] Hooks enabled in production

- [ ] **Security Settings**
  - [ ] Production URLs configured
  - [ ] Redirect URLs whitelisted
  - [ ] Password policy enforced
  - [ ] RLS enabled on all tables

- [ ] **Rate Limiting**
  - [ ] Conservative rate limits set
  - [ ] Progressive delays enabled
  - [ ] IP-based protection active
  - [ ] Account lockout configured

- [ ] **Database Security**
  - [ ] Required extensions enabled
  - [ ] Service role permissions minimal
  - [ ] Connection limits appropriate
  - [ ] RLS policies verified

### Post-Launch Monitoring:

- [ ] **Monitor Authentication Metrics**
  - Login success/failure rates
  - Password reset frequency
  - Email verification completion rates
  - Rate limiting triggers

- [ ] **Security Event Monitoring**
  - Failed login attempts
  - Suspicious IP activities
  - Hook failure rates
  - Audit log completeness

- [ ] **Performance Monitoring**
  - JWT token refresh patterns
  - Hook response times
  - Database connection usage
  - Email delivery success rates

---

## 🚨 Emergency Procedures

### If Authentication Issues Occur:

1. **Check Supabase Dashboard Status**
   - Service status page
   - Error logs in Functions
   - Database connection status

2. **Auth Hook Debugging**
   - Check hook response codes
   - Verify hook URL accessibility
   - Review hook logs in Functions

3. **Rate Limit Issues**
   - Temporarily increase limits if legitimate traffic spike
   - Check for DDoS or abuse patterns
   - Review IP-based blocks

4. **Email Delivery Problems**
   - Verify SMTP configuration
   - Check email provider status
   - Review bounce/complaint rates

### Emergency Contacts:

- **Technical Lead**: [Add contact info]
- **Supabase Support**: support@supabase.com
- **Production Infrastructure**: [Add monitoring alert contacts]

---

## 📚 Additional Resources

### Documentation References:
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)

### Internal Documentation:
- `src/lib/auth/production-config.ts` - Application security configuration
- `scripts/deploy-auth-hooks.js` - Automated deployment script
- `tests/security/` - Comprehensive security test suite

---

**🎯 Implementation Priority**: **CRITICAL - MUST BE COMPLETED BEFORE PRODUCTION LAUNCH**

**⏰ Estimated Configuration Time**: 2-3 hours

**✅ Verification**: Run full security test suite after configuration: `npm run security:test`