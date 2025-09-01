# 🤖 CLAUDE CODE PROMPT - 7P Education Platform Documentation

## 📋 Original Comprehensive Documentation Prompt

Bu dosya, 7P Education Platform için kapsamlı dokümantasyon oluşturmak üzere kullanılan orijinal Claude Code prompt'unu içerir.

---

## 🎯 Prompt Detayları

### 📊 Görev Tanımı
Sen 65 farklı uzmanlık alanından oluşan bir AI ekibi olarak hareket edeceksin. 7P Education Platform projesini her açıdan analiz edip, docs klasöründe kapsamlı teknik dokümantasyon oluşturacaksın.

### 🏗️ Proje Detayları
**Platform**: 7P Education - Amazon FBA ve E-ticaret eğitim platformu

**Teknoloji Stack**:
- Frontend: Next.js 15.4.4 + React 19.1.0 + TypeScript 5.7.2
- Backend: Supabase (Auth aktif, content mock)
- Database: PostgreSQL + Row Level Security (RLS)
- Payments: Stripe integration (hazır)
- Styling: Tailwind CSS + Radix UI
- Components: 61 React/TypeScript component

**Mevdu Durum**:
- ✅ Frontend %95 tamamlanmış
- ✅ Authentication sistemi aktif
- ✅ Mock data ile çalışan UI
- ✅ Stripe payment entegrasyonu hazır
- ❌ Database connection eksik (sadece auth)
- ❌ Real-time features eksik
- ❌ Production deployment eksik

## 📁 Dokümantasyon Yapısı

```
docs/
├── README.md (Master Index)
├── NAVIGATION.md (Dokümantasyon rehberi)
├── CLAUDE-PROMPTS.md (Bu prompt dosyası)
│
├── technical/ (15 dosya)
├── database/ (12 dosya)
├── payments/ (8 dosya)
├── security/ (10 dosya)
├── devops/ (8 dosya)
├── analytics/ (6 dosya)
└── business/ (6 dosya)
```

## 🎯 65 Sub-Agent Görevleri

### 🏗️ Technical Architecture (15 Agent)
1. **Frontend Architecture Deep Dive** - Next.js 15 + React 19 mimarisi
2. **Backend API Design Patterns** - RESTful API + GraphQL stratejileri
3. **Database Schema Optimization** - PostgreSQL performans optimizasyonu
4. **Authentication Security Analysis** - Supabase Auth güvenlik analizi
5. **Payment System Integration** - Stripe entegrasyon detayları
6. **Real-time Features Architecture** - WebSocket + Server-Sent Events
7. **File Management System** - Upload/download sistem tasarımı
8. **Caching Strategy Design** - Redis + CDN caching stratejileri
9. **CDN & Performance Optimization** - Global content delivery
10. **Mobile Responsiveness Analysis** - Cross-device uyumluluk
11. **PWA Implementation Guide** - Progressive Web App özellikleri
12. **SEO & Meta Optimization** - Search engine optimization
13. **Error Handling & Logging** - Comprehensive error management
14. **Testing Strategy & Coverage** - Unit/Integration/E2E testing
15. **CI/CD Pipeline Design** - Automated deployment pipeline

### 💾 Database & Backend (12 Agent)
1. **PostgreSQL Schema Deep Analysis** - Database design patterns
2. **Supabase Integration Guide** - BaaS entegrasyon rehberi
3. **RLS Policies Optimization** - Row Level Security optimizasyonu
4. **Database Performance Tuning** - Query optimization
5. **Backup & Recovery Strategy** - Data protection strategies
6. **Data Migration Strategies** - Schema migration best practices
7. **API Rate Limiting** - Request throttling implementation
8. **Webhook Implementation** - Event-driven architecture
9. **Background Jobs System** - Asynchronous task processing
10. **Database Monitoring** - Performance monitoring setup
11. **Query Optimization** - SQL performance tuning
12. **Data Integrity Validation** - Data consistency checks

### 💳 Payment & E-commerce (8 Agent)
1. **Stripe Integration Complete Guide** - Payment gateway setup
2. **Payment Flow Optimization** - Checkout experience optimization
3. **Subscription Management** - Recurring payment handling
4. **Refund & Dispute Handling** - Payment issue resolution
5. **Tax Calculation System** - Multi-region tax compliance
6. **Multi-currency Support** - International payment support
7. **Payment Analytics** - Revenue tracking and analysis
8. **Fraud Prevention** - Payment security measures

### 🔒 Security & Compliance (10 Agent)
1. **Security Audit Report** - Comprehensive security assessment
2. **GDPR Compliance Guide** - Data protection compliance
3. **Data Privacy Implementation** - Privacy-by-design principles
4. **Authentication Security** - Auth system hardening
5. **API Security Best Practices** - Secure API development
6. **XSS & CSRF Protection** - Web security vulnerabilities
7. **Rate Limiting & DDoS Protection** - Attack prevention
8. **Secure File Upload** - Safe file handling
9. **Encryption Strategies** - Data encryption implementation
10. **Security Monitoring** - Threat detection and response

### 🚀 DevOps & Deployment (8 Agent)
1. **Production Deployment Guide** - Live environment setup
2. **Environment Configuration** - Multi-environment management
3. **Docker Containerization** - Container deployment strategy
4. **Kubernetes Orchestration** - Container orchestration
5. **Monitoring & Alerting** - System health monitoring
6. **Performance Monitoring** - Application performance tracking
7. **Log Management** - Centralized logging strategy
8. **Disaster Recovery** - Business continuity planning

### 📊 Analytics & Monitoring (6 Agent)
1. **User Analytics Implementation** - User behavior tracking
2. **Business Intelligence Setup** - Data analytics platform
3. **Performance Metrics** - KPI tracking and reporting
4. **Error Tracking System** - Error monitoring and alerting
5. **A/B Testing Framework** - Experimentation platform
6. **Revenue Analytics** - Financial performance tracking

### 👥 User Experience & Business (6 Agent)
1. **User Journey Optimization** - UX improvement strategies
2. **Conversion Rate Analysis** - Sales funnel optimization
3. **Customer Support System** - Help desk implementation
4. **Content Management Strategy** - Educational content workflow
5. **Marketing Integration** - Marketing automation setup
6. **Business Process Automation** - Workflow optimization

## 📝 Dokümantasyon Format Standardı

Her MD dosyası şu yapıda olacak:

```markdown
# [BAŞLIK] - 7P Education Platform

## 📋 Özet
[Kısa açıklama]

## 🎯 Amaç ve Kapsam
[Detaylı amaç]

## 🏗️ Mevcut Durum Analizi
[Current state assessment]

## 🔧 Teknik Detaylar
[Implementation details]

## 💡 Öneriler ve Best Practices
[Recommendations]

## 📊 Implementation Roadmap
[Step-by-step implementation]

## 🔗 İlgili Dosyalar
[Cross-references]

## 📚 Kaynaklar
[External resources]
```

## 🚀 Execution Instructions

1. **Klasör Yapısı**: docs klasöründe tüm klasörleri oluştur
2. **Dosya Oluşturma**: 65 MD dosyasını sırayla oluştur (her biri 2000-5000 kelime)
3. **Index Dosyası**: README.md master index oluştur
4. **Navigation**: NAVIGATION.md rehber dosyası oluştur
5. **Prompt Saklama**: CLAUDE-PROMPTS.md bu prompt dosyasını kaydet

## 🎯 Kalite Kriterleri

- ✅ Her dosya minimum 2000 kelime
- ✅ Teknik derinlik ve implementation detayları
- ✅ Code examples ve snippets
- ✅ Cross-reference linkler
- ✅ Türkçe + İngilizce karışık (teknik terimler İngilizce)
- ✅ Markdown formatting
- ✅ Practical implementation focus

## 🔥 Execution Status

**Prompt Execution Date**: ${new Date().toLocaleDateString('tr-TR')}
**Documentation Target**: 65 files
**Current Progress**: In Progress
**Completion Target**: 100%

---

## 📊 Implementation Progress Tracking

### ✅ Completed Tasks
1. **Documentation Structure**: Folder hierarchy created
2. **Master README**: Comprehensive overview document
3. **Navigation Guide**: Complete navigation system
4. **Prompt Archive**: This file created

### 🔄 In Progress
- Technical Architecture Documentation (15 files)
- Database & Backend Documentation (12 files)
- Payment & E-commerce Documentation (8 files)
- Security & Compliance Documentation (10 files)
- DevOps & Deployment Documentation (8 files)
- Analytics & Monitoring Documentation (6 files)
- Business & UX Documentation (6 files)

### ⏳ Pending
- Quality review and validation
- Cross-reference linking verification
- Code example testing
- Documentation completeness audit

## 🎯 Success Metrics

- **File Count**: 65 total documentation files
- **Word Count**: 2000-5000 words per file
- **Technical Depth**: Implementation-ready details
- **Cross-References**: Inter-document linking
- **Code Examples**: Practical implementation snippets
- **Format Consistency**: Standardized markdown structure

---

## 📝 Notes for Future Updates

### Documentation Maintenance
- Regular updates required as platform evolves
- Code examples must be tested and validated
- Cross-references need periodic verification
- New features require documentation updates

### Improvement Areas
- Interactive examples could be added
- Video tutorials could supplement written docs
- Community contributions could be encouraged
- Translation to other languages could be considered

---

*Prompt created and executed: ${new Date().toLocaleDateString('tr-TR')}*
*Documentation Generation Status: Active*
*Target Completion: 65 comprehensive documentation files*