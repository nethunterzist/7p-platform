# 7P Education Platform - Documentation

> Modern eğitim platformu: Next.js 15 + Supabase + Stripe + TypeScript

## 🚀 Kritik Bilgiler

- **Framework**: Next.js 15.4.4 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (opsiyonel, PAYMENTS_MODE kontrolü)
- **Deployment**: Vercel + Edge/Node hybrid runtime
- **Auth**: NextAuth.js + Supabase integration

## 📖 Bu Dokümanları Nasıl Kullanırım?

### Yeni Geliştirici (İlk Kez)
1. 📋 [DOC_INDEX.md](./DOC_INDEX.md) - Tüm dokümanları görüntüle
2. 🗺️ [CODEMAP.md](./CODEMAP.md) - Kod yapısını anla
3. ⚙️ [ENVIRONMENT.md](./ENVIRONMENT.md) - ENV setup yap
4. 🔐 [AUTH.md](./AUTH.md) - Auth sistemi öğren

### Production Deployment
1. 🚀 [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md) - Prod hazırlık
2. 💳 [PAYMENTS.md](./PAYMENTS.md) - Payment sistem setup
3. 🛡️ [SECURITY.md](./SECURITY.md) - Güvenlik checklist

### Problem Çözme
1. 🔍 [API-REFERENCE.md](./API-REFERENCE.md) - API endpoint'ler
2. 🛠️ [MIDDLEWARE.md](./MIDDLEWARE.md) - Auth/routing sorunları
3. 📊 [MONITORING.md](./MONITORING.md) - Log/monitoring

## ⚡ Hızlı Başlama

### Local Development
```bash
# 1. Clone ve dependencies
git clone [repo-url]
npm install

# 2. Environment setup
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Database setup
npm run db:verify
npm run db:migrate

# 4. Run development server
npm run dev
```

## Vercel Deployment
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Environment variables (via Vercel dashboard)
# Copy from .env.production.secure
```

## 🗂️ Dokümantasyon Kategorileri

### Core Architecture
- [CODEMAP.md](./CODEMAP.md) - Module structure & dependencies
- [ROUTEMAP.md](./ROUTEMAP.md) - All pages & API routes
- [RUNTIME.md](./RUNTIME.md) - Edge vs Node.js decisions

### Authentication & Security
- [AUTH.md](./AUTH.md) - NextAuth + Supabase flow
- [SECURITY.md](./SECURITY.md) - Security policies & best practices
- [MIDDLEWARE.md](./MIDDLEWARE.md) - Route protection & access control

### Database & Data
- [DB/SCHEMA.md](./DB/SCHEMA.md) - Database tables & relationships
- [ENROLLMENT.md](./ENROLLMENT.md) - Course enrollment system

### Payments & Business Logic
- [PAYMENTS.md](./PAYMENTS.md) - Payment system & modes
- [ENROLLMENT.md](./ENROLLMENT.md) - Free enrollment flow

### Operations & Monitoring
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables
- [MONITORING.md](./MONITORING.md) - Logging & observability
- [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md) - Production runbook

### Reference
- [API-REFERENCE.md](./API-REFERENCE.md) - Complete API documentation
- [CHANGELOG.md](./CHANGELOG.md) - Version history & changes

## 🔗 Quick Links

| Need | Document | Key Info |
|------|----------|----------|
| Setup Environment | [ENVIRONMENT.md](./ENVIRONMENT.md) | Required ENV vars |
| Understand Auth | [AUTH.md](./AUTH.md) | Login/logout flow |
| Payment Issues | [PAYMENTS.md](./PAYMENTS.md) | PAYMENTS_MODE control |
| Database Schema | [DB/SCHEMA.md](./DB/SCHEMA.md) | Tables & RLS policies |
| API Endpoints | [API-REFERENCE.md](./API-REFERENCE.md) | Request/response specs |
| Deployment Issues | [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md) | Troubleshooting |

## 🧭 Legacy Documentation Structure

### 🚀 01-setup/ - Project Setup & Deployment
- **[supabase-config.md](./01-setup/supabase-config.md)** - Supabase database configuration
- **[vercel-deployment.md](./01-setup/vercel-deployment.md)** - Production deployment guide
- **[production-checklist.md](./01-setup/production-checklist.md)** - 30-minute production checklist

### 🔧 02-development/ - Active Development
- **[database-schema.md](./02-development/database-schema.md)** - Current database structure
- **API Endpoints** - RESTful API documentation (see codebase)
- **Testing Guide** - Test implementation strategies

### ✅ 03-completed/ - Completed Milestones
- **[deployment-checklist.md](./03-completed/deployment-checklist.md)** - Vercel deployment completed
- **[monitoring-setup.md](./03-completed/monitoring-setup.md)** - Monitoring system implemented
- **[database-setup.md](./03-completed/database-setup.md)** - Production database configured
- **[performance-optimization.md](./03-completed/performance-optimization.md)** - Speed optimization completed

### 📖 04-reference/ - Reference Materials
- **[security-guidelines.md](./04-reference/security-guidelines.md)** - Security best practices

### 📋 05-logs/ - Session Logs (NEW!)
- **[README.md](./05-logs/README.md)** - Automatic logging system guide
- **Topic-based folders**: authentication, database, ui-components, api-development, deployment, performance, security, testing, bug-fixes, general

## ❓ Sorun mu Var?

1. **ENV errors**: [ENVIRONMENT.md](./ENVIRONMENT.md) kontrol et
2. **Auth problems**: [AUTH.md](./AUTH.md) + [MIDDLEWARE.md](./MIDDLEWARE.md)
3. **Payment issues**: [PAYMENTS.md](./PAYMENTS.md) PAYMENTS_MODE kontrolü
4. **Database errors**: [DB/SCHEMA.md](./DB/SCHEMA.md) RLS policies
5. **Production issues**: [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md)

## 📝 Dokümantasyon Durumu

**Current State**: Production-ready educational platform  
**Core Features**: Authentication, Course Management, Material System, Progress Tracking  
**Deployment**: Live on Vercel with Supabase backend  
**Completion**: 14/15 documents complete (93%)

Tüm dokümanların güncel durumu için: [DOC_INDEX.md](./DOC_INDEX.md)

---
*Last updated: 2025-01-27*  
*Maintainer: 7P Education Team*