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
2. 🗺️ [dev-notes/CODEMAP.md](./dev-notes/CODEMAP.md) - Kod yapısını anla
3. ⚙️ [reference/ENVIRONMENT.md](./reference/ENVIRONMENT.md) - ENV setup yap
4. 🔐 [reference/AUTH.md](./reference/AUTH.md) - Auth sistemi öğren

### Production Deployment
1. 🚀 [operations/RUNBOOK.md](./operations/RUNBOOK.md) - Prod hazırlık
2. 💳 [reference/PAYMENTS.md](./reference/PAYMENTS.md) - Payment sistem setup
3. 🛡️ [operations/SECURITY.md](./operations/SECURITY.md) - Güvenlik checklist

### Problem Çözme
1. 🔍 [reference/API-REFERENCE.md](./reference/API-REFERENCE.md) - API endpoint'ler
2. 🛠️ [reference/MIDDLEWARE.md](./reference/MIDDLEWARE.md) - Auth/routing sorunları
3. 📊 [operations/MONITORING.md](./operations/MONITORING.md) - Log/monitoring

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

## 📚 Archived Documentation
> Eski numaralı klasörler (01-05) **docs/archive/** altına taşınmıştır.  
> Güncel dokümantasyon için yukarıdaki ana linkleri kullanın.

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