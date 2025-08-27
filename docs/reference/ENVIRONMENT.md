# 7P Education - Environment Variables

> Kapsamlı environment variable referansı ve konfigürasyon rehberi

## 🎯 Kritik Bilgiler

- **Total ENV Vars**: ~40 variables
- **Required for Basic**: 4 (Supabase + NextAuth)
- **Payment Dependent**: 3 (Stripe keys)
- **Feature Flags**: 2 (Payments, Free enrollment)

## 📋 Environment Matrix

### 🔐 Core Authentication (REQUIRED)

| Key | Nerede Okunuyor | Zorunlu | Varsayılan | Not |
|-----|-----------------|---------|------------|-----|
| `NEXTAUTH_SECRET` | NextAuth config | ✅ | - | Generate: `openssl rand -hex 32` |
| `NEXTAUTH_URL` | NextAuth config | ✅ prod | `http://localhost:3000` | Production domain |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | ✅ | - | Public, browser-safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client | ✅ | - | Public, browser-safe |
| `SUPABASE_SERVICE_KEY` | Server-side operations | ✅ | - | **NEVER expose to browser** |
| `SUPABASE_DB_URL` | Migration scripts | ❌ | - | For direct DB access |

### 💳 Payment System (CONDITIONAL)

| Key | Nerede Okunuyor | Zorunlu | Varsayılan | Not |
|-----|-----------------|---------|------------|-----|
| `PAYMENTS_MODE` | `src/lib/env.ts` | ❌ | `disabled` | `stripe` \| `disabled` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client | ❓ | - | Only when `PAYMENTS_MODE=stripe` |
| `STRIPE_SECRET_KEY` | Payment routes | ❓ | - | Only when `PAYMENTS_MODE=stripe` |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | ❓ | - | Required in production |

### 🎓 Feature Flags

| Key | Nerede Okunuyor | Zorunlu | Varsayılan | Not |
|-----|-----------------|---------|------------|-----|
| `FEATURE_ENROLL_FREE` | `src/lib/env.ts` | ❌ | `false` | Enable free enrollment |
| `FREE_ENROLLMENT_CODE` | Free enrollment API | ❌ | `null` | Optional enrollment code |

### 📊 Monitoring & Analytics (OPTIONAL)

| Key | Nerede Okunuyor | Zorunlu | Varsayılan | Not |
|-----|-----------------|---------|------------|-----|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry config | ❌ | - | Error tracking |
| `SENTRY_ORG` | Source maps | ❌ | - | Sentry organization |
| `SENTRY_PROJECT` | Source maps | ❌ | - | Sentry project |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | Vercel Analytics | ❌ | auto | Auto-set by Vercel |

### 📧 Email System (FUTURE)

| Key | Nerede Okunuyor | Zorunlu | Varsayılan | Not |
|-----|-----------------|---------|------------|-----|
| `SMTP_HOST` | Email service | ❌ | - | Future feature |
| `SMTP_PORT` | Email service | ❌ | `587` | Future feature |
| `SMTP_USER` | Email service | ❌ | - | Future feature |
| `SMTP_PASSWORD` | Email service | ❌ | - | Future feature |

### 🔧 Development & Debug

| Key | Nerede Okunuyor | Zorunlu | Varsayılan | Not |
|-----|-----------------|---------|------------|-----|
| `NODE_ENV` | Multiple places | ❌ | `development` | Auto-set by platform |
| `DEBUG_DATABASE` | Database operations | ❌ | `false` | Enable DB logging |
| `VERBOSE_LOGGING` | Logger config | ❌ | `false` | Detailed logs |

## 🔍 Environment File Strategy

### Local Development (`.env.local`)
```bash
# Core required
NEXTAUTH_SECRET=your_32_char_secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Optional features
PAYMENTS_MODE=disabled
FEATURE_ENROLL_FREE=true
# FREE_ENROLLMENT_CODE=BETA2025

# Development debugging
DEBUG_DATABASE=false
VERBOSE_LOGGING=false
```

### Production (Vercel Environment Variables)
```bash
# Core (required)
NEXTAUTH_SECRET=production_secret_32_chars
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Payments (if enabled)
PAYMENTS_MODE=stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## ⚡ Quick Setup Guide

### 1. Minimum Viable Setup
```bash
# Copy template
cp .env.example .env.local

# Required minimums:
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

### 2. Test Configuration
```bash
# Verify environment
npm run check-env

# Test Supabase connection
npm run supabase:test

# Test database
npm run db:verify
```

## 🔐 Security Guidelines

### Browser-Safe Variables (NEXT_PUBLIC_*)
- ✅ Supabase URL and anon key
- ✅ Stripe publishable key  
- ✅ Analytics IDs
- ✅ Feature flags (if non-sensitive)

### Server-Only Variables (NO NEXT_PUBLIC_*)
- 🚨 NEXTAUTH_SECRET
- 🚨 SUPABASE_SERVICE_KEY
- 🚨 STRIPE_SECRET_KEY
- 🚨 STRIPE_WEBHOOK_SECRET
- 🚨 Database passwords

### Environment Isolation
```
Development → .env.local (git ignored)
Staging     → Vercel environment variables  
Production  → Vercel environment variables (separate project)
```

## 📊 Validation System

### Built-in Validation (`src/lib/env.ts`)
```typescript
export const validateEnvironment = () => {
  const errors: string[] = [];
  
  // Core validation
  if (!NEXT_PUBLIC_SUPABASE_URL) errors.push('Missing SUPABASE_URL');
  if (!NEXTAUTH_SECRET) errors.push('Missing NEXTAUTH_SECRET');
  
  // Conditional validation  
  if (STRIPE_ENABLED && !STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY required when payments enabled');
  }
  
  return { valid: errors.length === 0, errors };
};
```

### Runtime Validation
```bash
# Check all environment variables
npm run check-env

# Template mode (show expected structure)
npm run check-env:template
```

## 🔄 Feature Flag Matrix

| PAYMENTS_MODE | FEATURE_ENROLL_FREE | UI Behavior | API Behavior |
|---------------|---------------------|-------------|--------------|
| `disabled` | `true` | "Enroll (Free)" buttons | `/api/enroll/free` active |
| `disabled` | `false` | Course info only | No enrollment |
| `stripe` | `true` | Payment buttons + free option | Both APIs active |
| `stripe` | `false` | Payment buttons only | Payment APIs only |

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid Supabase URL"
```bash
# Check format
echo $NEXT_PUBLIC_SUPABASE_URL
# Should be: https://your-project.supabase.co

# Test connection
npm run supabase:test
```

### Issue 2: "NextAuth Configuration Error"
```bash
# Generate new secret
openssl rand -hex 32

# Check URL matches deployment
echo $NEXTAUTH_URL
# Local: http://localhost:3000
# Prod: https://your-domain.vercel.app
```

### Issue 3: "Payments Not Working"
```bash
# Check payment mode
npm run check-env | grep PAYMENTS_MODE

# Verify Stripe keys format
# Publishable: pk_test_... or pk_live_...
# Secret: sk_test_... or sk_live_...
```

### Issue 4: "Database Access Denied"
```bash
# Test service key permissions
npm run db:verify

# Check RLS policies
npm run supabase:test
```

## 📝 Environment Templates

### Complete .env.local Template
See: [`.env.example`](../.env.example) in project root

### Vercel Import Script
```bash
# Import from file
./scripts/vercel_env_import.sh .env.production

# Or manual via CLI
vercel env add NEXTAUTH_SECRET production
```

## 🔧 Advanced Configuration

### Rate Limiting
```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### File Upload  
```bash
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,jpg,png,gif,mp4,mp3
```

### Redis Caching (Future)
```bash
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=3600
```

---

**Related Docs**: [AUTH.md](./AUTH.md) | [PAYMENTS.md](./PAYMENTS.md) | [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md)  
*Last updated: 2025-01-27*