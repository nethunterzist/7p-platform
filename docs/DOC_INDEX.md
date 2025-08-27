# 7P Education - Documentation Index

> **Yeni Yapı!** Dokümantasyon konsolidasyon sonrası güncellenmiş navigasyon rehberi  
> [📚 Complete Catalog - MANIFEST.md](./MANIFEST.md) | **Last Updated**: 2025-08-27

---

## 🎯 Quick Navigation

### 🚀 **Get Started** (New Users)
| Document | Purpose | Priority |
|----------|---------|----------|
| [guides/ONBOARDING.md](./guides/ONBOARDING.md) | 10-minute quick start setup | **CRITICAL** |
| [README.md](./README.md) | Project overview & introduction | **HIGH** |
| [reference/ENVIRONMENT.md](./reference/ENVIRONMENT.md) | Environment variables setup | **CRITICAL** |

### 📖 **Reference Documents** (Technical Specs)
| Document | Purpose | Priority |
|----------|---------|----------|
| [reference/API-REFERENCE.md](./reference/API-REFERENCE.md) | Complete API endpoint documentation | **HIGH** |
| [reference/ROUTEMAP.md](./reference/ROUTEMAP.md) | All routes & endpoints map | **HIGH** |
| [reference/AUTH.md](./reference/AUTH.md) | Authentication system specs | **CRITICAL** |
| [reference/MIDDLEWARE.md](./reference/MIDDLEWARE.md) | Middleware & route protection | **HIGH** |
| [reference/PAYMENTS.md](./reference/PAYMENTS.md) | Payment system (Stripe) integration | **MEDIUM** |
| [reference/ENROLLMENT.md](./reference/ENROLLMENT.md) | Course enrollment system | **MEDIUM** |
| [reference/DB/SCHEMA.md](./reference/DB/SCHEMA.md) | Database schema & RLS policies | **HIGH** |

### 🔧 **Operations** (Production Management)
| Document | Purpose | Priority |
|----------|---------|----------|
| [operations/RUNBOOK.md](./operations/RUNBOOK.md) | **Canonical** production operations guide | **CRITICAL** |
| [operations/MONITORING.md](./operations/MONITORING.md) | Logging & observability setup | **HIGH** |
| [operations/SECURITY.md](./operations/SECURITY.md) | Security policies & guidelines | **CRITICAL** |

### 📊 **Reports** (Status & Analytics)
| Document | Purpose | Last Updated |
|----------|---------|--------------|
| [reports/CURRENT_HEALTH_SNAPSHOT.md](./reports/CURRENT_HEALTH_SNAPSHOT.md) | Live system health status | 2025-08-27 |
| [reports/LAUNCH_MONITORING_REPORT.md](./reports/LAUNCH_MONITORING_REPORT.md) | 48-hour launch monitoring | 2025-08-27 |
| [reports/GO_LIVE_HARDENING_REPORT.md](./reports/GO_LIVE_HARDENING_REPORT.md) | Pre-launch security hardening | 2025-08-27 |
| [reports/PRODUCTION_READINESS_FINAL_REPORT.md](./reports/PRODUCTION_READINESS_FINAL_REPORT.md) | Final production readiness | 2025-08-27 |
| [reports/ENVIRONMENT_CLEAN.md](./reports/ENVIRONMENT_CLEAN.md) | Production environment audit | 2025-08-27 |

### 💡 **Dev Notes** (Technical Decisions)
| Document | Purpose | Audience |
|----------|---------|----------|
| [dev-notes/CODEMAP.md](./dev-notes/CODEMAP.md) | Code structure & dependencies | Developers |
| [dev-notes/RUNTIME.md](./dev-notes/RUNTIME.md) | Edge vs Node.js runtime decisions | Developers |
| [dev-notes/CLAUDE-PLANLAMA-MODU-PROMPT.md](./dev-notes/CLAUDE-PLANLAMA-MODU-PROMPT.md) | Claude planning mode prompts | AI-Assistants |

---

## 🏗️ Documentation Categories Explained

### 🎯 **By Priority Level**
- **CRITICAL**: Must read before production deployment
- **HIGH**: Important for understanding core systems
- **MEDIUM**: Useful for specific features/integrations  
- **LOW**: Historical reference or optional features

### 📁 **By Category Purpose**
- **`/reference/`**: Technical specifications, API docs, configuration
- **`/operations/`**: Production management, monitoring, runbooks  
- **`/reports/`**: Status reports, health snapshots, analysis
- **`/guides/`**: Step-by-step tutorials and onboarding
- **`/dev-notes/`**: Technical decisions, code maps, developer notes
- **`/archive/`**: Historical documentation and deprecated content

---

## 🛤️ Recommended Learning Paths

### Path 1: **New Developer Onboarding** (45-60 minutes)
1. 📖 [guides/ONBOARDING.md](./guides/ONBOARDING.md) *(10 min)*
2. 🏗️ [dev-notes/CODEMAP.md](./dev-notes/CODEMAP.md) *(15 min)*
3. 🔐 [reference/AUTH.md](./reference/AUTH.md) *(15 min)*
4. 🗺️ [reference/ROUTEMAP.md](./reference/ROUTEMAP.md) *(15 min)*

### Path 2: **Production Deployment** (30-45 minutes)
1. ⚙️ [reference/ENVIRONMENT.md](./reference/ENVIRONMENT.md) *(10 min)*
2. 📋 [operations/RUNBOOK.md](./operations/RUNBOOK.md) *(20 min)*
3. 🛡️ [operations/SECURITY.md](./operations/SECURITY.md) *(15 min)*

### Path 3: **Feature Development** (60-90 minutes)  
1. 📖 [reference/API-REFERENCE.md](./reference/API-REFERENCE.md) *(30 min)*
2. 🗃️ [reference/DB/SCHEMA.md](./reference/DB/SCHEMA.md) *(20 min)*
3. 🔧 [reference/MIDDLEWARE.md](./reference/MIDDLEWARE.md) *(15 min)*
4. 💳 [reference/PAYMENTS.md](./reference/PAYMENTS.md) *(15 min)* - if needed

### Path 4: **System Administration** (45-60 minutes)
1. 📊 [operations/MONITORING.md](./operations/MONITORING.md) *(20 min)*
2. 📈 [reports/CURRENT_HEALTH_SNAPSHOT.md](./reports/CURRENT_HEALTH_SNAPSHOT.md) *(10 min)*
3. 🚀 [reports/LAUNCH_MONITORING_REPORT.md](./reports/LAUNCH_MONITORING_REPORT.md) *(15 min)*

---

## 🔗 Cross-References & Dependencies

### Authentication Flow Dependencies
```mermaid
AUTH.md → MIDDLEWARE.md → ROUTEMAP.md → API-REFERENCE.md
```

### Database & Backend Dependencies  
```mermaid
DB/SCHEMA.md → ENROLLMENT.md → PAYMENTS.md → API-REFERENCE.md
```

### Operations Dependencies
```mermaid
ENVIRONMENT.md → RUNBOOK.md → MONITORING.md → SECURITY.md
```

---

## 📚 External Documentation Links

### Related Repositories
- [📜 Scripts Documentation](../scripts/README.md)
- [🔧 Supabase Auth Hooks](../supabase/functions/auth-hooks/README.md)

### Platform Documentation
- [Next.js 15.4.4 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs) 
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Vercel Deployment Guide](https://vercel.com/docs)

### Monitoring & Error Tracking
- [Sentry Documentation](https://docs.sentry.io/)
- [Vercel Analytics](https://vercel.com/analytics)

---

## 🔍 Document Search Tips

### By File Type/Purpose
```bash
# Find API-related docs
find docs/ -name "*API*" -o -name "*ROUTE*"

# Find security-related docs  
find docs/ -name "*SECURITY*" -o -name "*AUTH*"

# Find production-related docs
find docs/ -name "*PRODUCTION*" -o -name "*DEPLOY*" -o -name "*RUNBOOK*"
```

### By Content Keywords
- **Environment Setup**: `ENVIRONMENT.md`, `ONBOARDING.md`
- **API Integration**: `API-REFERENCE.md`, `ROUTEMAP.md`, `AUTH.md`
- **Database**: `DB/SCHEMA.md`, `ENROLLMENT.md`
- **Security**: `SECURITY.md`, `AUTH.md`, `MIDDLEWARE.md`
- **Monitoring**: `MONITORING.md`, `reports/LAUNCH_MONITORING_REPORT.md`

---

## 📝 Recent Documentation Updates

### 2025-08-27: Major Consolidation ✨
- **Restructured** entire documentation with category-based folders
- **Created** comprehensive MANIFEST.md catalog  
- **Moved** 18 files from root to categorized folders
- **Added** canonical references for duplicate documents
- **Updated** all cross-references and navigation links

### Key Changes:
- ✅ **Single Source of Truth**: operations/RUNBOOK.md is now canonical
- ✅ **Clear Categories**: reports/, reference/, operations/, guides/, dev-notes/
- ✅ **Complete Catalog**: MANIFEST.md tracks all 76 documentation files  
- ✅ **Deprecated Warnings**: Added to outdated archive documents

---

**Index Last Updated**: 2025-08-27 15:10:00 UTC  
**Next Review**: After documentation consolidation PR merge  
**Maintainer**: Claude Code Documentation Team