# Admin Training Guide - 7P Education Platform

## 🎯 Admin Panel Giriş

7P Education Platform Admin Panel'e hoş geldiniz! Bu rehber, platform'un yönetim özelliklerini etkili bir şekilde kullanmanız için hazırlanmıştır.

**Admin Panel URL:** https://7peducation.com/admin  
**Destek:** admin-support@7peducation.com  
**Acil Durum:** +90 XXX XXX XXXX

---

## 🔑 Admin Erişimi ve Güvenlik

### 🚀 İlk Giriş

**Admin Hesabı Kurulumu:**
1. **Admin Davetiyesi** - E-posta ile davet linki alın
2. **Güvenli Şifre** - En az 12 karakter, büyük/küçük harf, sayı ve sembol
3. **2FA Aktivasyonu** - İki faktörlü kimlik doğrulamayı etkinleştirin
4. **Recovery Codes** - Yedek kodlarınızı güvenli bir yerde saklayın

### 🔐 Güvenlik En İyi Uygulamaları

**Hesap Güvenliği:**
```yaml
Şifre Politikası:
  - Minimum 12 karakter
  - Büyük ve küçük harfler
  - En az 1 sayı ve 1 sembol
  - Her 90 günde bir değiştirin

2FA Gereklilikleri:
  - TOTP uygulaması (Google Authenticator, Authy)
  - Backup codes kaydetme
  - Cihaz güvenliği kontrolü
  - Düzenli access log kontrolü

Session Yönetimi:
  - Otomatik logout: 30 dakika inaktivite
  - Concurrent sessions: Maksimum 3
  - Şüpheli giriş bildirimleri
  - IP whitelist (opsiyonel)
```

### 👥 Admin Rolleri ve Yetkileri

**Rol Hiyerarşisi:**
```
🔴 Super Admin (Platform Sahibi)
├── Tam sistem erişimi
├── Tüm admin paneli özellikleri
├── Finansal raporlar ve ödeme yönetimi
├── Sistem konfigürasyonu
└── Diğer admin'leri yönetme

🟠 Content Admin (İçerik Yöneticisi)
├── Kurs ve modül yönetimi
├── Quiz ve assessment oluşturma
├── Öğrenci progress takibi
├── Forum moderasyonu
└── Library kaynak yönetimi

🟡 Support Admin (Destek Yöneticisi)
├── Kullanıcı destek talepleri
├── Forum moderasyonu
├── Kullanıcı hesap yönetimi
├── Basic reporting
└── Community management

🟢 Instructor (Eğitmen)
├── Sadece kendi kursları
├── Öğrenci progress görüntüleme
├── Quiz sonuçları
├── Kurs forum moderasyonu
└── Sınırlı reporting
```

---

## 📊 Admin Dashboard

### 🎯 Dashboard Genel Bakış

**Ana Metrikler:**
```yaml
Öğrenci Metrikleri:
  Toplam Öğrenci: 1,247
  Aktif Öğrenci (30 gün): 856
  Yeni Kayıtlar (bu ay): 123
  Churn Rate: %5.2

Kurs Performance:
  Toplam Kurs: 12
  Tamamlanma Oranı: %78
  Ortalama İlerleme: %65
  En Popüler Kurs: Amazon FBA Fundamentals

Finansal Özet:
  Bu Ay Gelir: ₺45,670
  Subscription Revenue: ₺38,200
  One-time Purchases: ₺7,470
  Refund Rate: %2.1

Sistem Sağlığı:
  Server Uptime: %99.97
  Ortalama Yanıt Süresi: 245ms
  Error Rate: %0.08
  Son Backup: 2 saat önce
```

### 📈 Real-time Analytics

**Live Dashboard Widgets:**
- **👥 Çevrimiçi Kullanıcılar** - Şu anda aktif olan öğrenciler
- **📊 Video İzleme İstatistikleri** - Canlı izlenme verileri
- **💰 Günlük Gelir** - Real-time satış takibi
- **🔔 Sistem Bildirimleri** - Önemli sistem olayları
- **⚠️ Error Monitor** - Sistem hataları ve uyarıları

---

## 👥 Kullanıcı Yönetimi

### 🔍 Kullanıcı Arama ve Filtreleme

**Gelişmiş Arama:**
```
🔍 Arama Kriterleri:
├── 📧 E-posta adresi
├── 📝 Ad/Soyad
├── 📱 Telefon numarası
├── 🆔 User ID
├── 🏷️ Subscription durumu
├── 📅 Kayıt tarihi aralığı
├── 🎯 Son aktivite
└── 💳 Ödeme durumu
```

**Filtreleme Seçenekleri:**
- **📊 Subscription Status** - Free, Premium, Enterprise
- **🎯 Activity Level** - Aktif, Pasif, Churned
- **📅 Registration Date** - Son 30 gün, 3 ay, 6 ay, 1 yıl
- **🏆 Completion Rate** - %0-25, %25-50, %50-75, %75-100
- **💰 Lifetime Value** - Harcama aralığına göre

### ✏️ Kullanıcı Profili Düzenleme

**Düzenlenebilir Alanlar:**
```yaml
Temel Bilgiler:
  - Ad, Soyad
  - E-posta adresi
  - Telefon numarası
  - Profil fotoğrafı
  - Biyografi

Hesap Durumu:
  - Active/Inactive/Suspended
  - E-posta doğrulama durumu
  - 2FA aktivasyon durumu
  - Son giriş tarihi

Subscription Yönetimi:
  - Plan türü değiştirme
  - Subscription uzatma/iptal
  - Free trial başlatma
  - Custom pricing atama

Learning Analytics:
  - Progress override
  - Kurs erişimi yönetimi
  - Certificate manual issue
  - Quiz attempts reset
```

### 🚫 Kullanıcı Moderasyonu

**Moderasyon Aksiyonları:**
```
⚠️ Warning (Uyarı):
├── E-posta ile uyarı gönderme
├── Platform içi bildirim
├── Temporary restrictions
└── Warning history tracking

🔒 Temporary Suspension:
├── 24 saat, 7 gün, 30 gün seçenekleri
├── Specific feature restrictions
├── Automatic unsuspension
└── Suspension reason logging

❌ Permanent Ban:
├── Account deactivation
├── Content removal
├── Refund processing (if applicable)
└── IP/Device blocking

🔄 Account Recovery:
├── Suspended account reactivation
├── Data restoration
├── Custom reinstatement terms
└── Monitoring period setup
```

---

## 📚 Kurs ve İçerik Yönetimi

### ➕ Yeni Kurs Oluşturma

**Kurs Oluşturma Süreci:**
```
1. 📋 Kurs Bilgileri:
   ├── Kurs adı ve açıklaması
   ├── Kategori ve seviye
   ├── Eğitmen atama
   ├── Fiyat ve pricing strategy
   └── Kapak görsel upload

2. 📂 Modül Yapısı:
   ├── Modül başlıkları ve açıklamaları
   ├── Modül sıralaması
   ├── Prerequisite tanımları
   └── Learning objectives

3. 📝 Ders İçerikleri:
   ├── Video upload/streaming link
   ├── Ders notları ve materyaller
   ├── Downloadable resources
   ├── Interactive elements
   └── Duration tahminleri

4. 🧪 Assessment Oluşturma:
   ├── Quiz sorularını yazma/import
   ├── Passing score belirleme
   ├── Attempt limits
   ├── Time limits
   └── Feedback messages

5. 🚀 Yayınlama:
   ├── Draft/Published status
   ├── Release date scheduling
   ├── Access permissions
   ├── Preview generation
   └── SEO optimization
```

### 📝 İçerik Editörü

**Gelişmiş Editör Özellikleri:**
- **📝 Rich Text Editor** - Formatting, linkler, görseller
- **🎥 Video Uploader** - Direct upload veya URL embedding
- **📊 Interactive Elements** - Polls, quizzes, assignments
- **📁 File Manager** - Document, PDF, Excel file yönetimi
- **🖼️ Media Library** - Görsel ve video asset yönetimi
- **🔗 URL Shortener** - Traceable link generation

### 🧪 Quiz ve Assessment Yönetimi

**Quiz Oluşturma Araçları:**
```yaml
Soru Türleri:
  Multiple Choice:
    - 2-6 seçenek
    - Single/Multiple correct answers
    - Randomization support
    - Image/Video integration

  True/False:
    - Simple binary questions
    - Explanation support
    - Batch creation tools

  Fill in the Blank:
    - Text input validation
    - Multiple correct answers
    - Case sensitivity options

  Essay/Long Answer:
    - Manual grading required
    - Rubric support
    - Word count limits
    - Auto-save functionality

Gelişmiş Özellikler:
  - Question banking
  - Random question selection
  - Adaptive difficulty
  - Time limits per question
  - Progress saving
  - Instant feedback
  - Detailed analytics
```

---

## 💰 Ödeme ve Finansal Yönetim

### 💳 Ödeme İşlemleri Takibi

**Finansal Dashboard:**
```yaml
Revenue Metrikleri:
  Günlük Gelir: ₺2,340
  Haftalık Gelir: ₺16,380
  Aylık Gelir: ₺67,890
  Yıllık Gelir: ₺814,680

Subscription Analytics:
  Aktif Subscriptions: 1,247
  Yeni Subscriptions (bu ay): 156
  Cancelled Subscriptions: 23
  Churn Rate: %1.8
  MRR (Monthly Recurring Revenue): ₺45,670

Payment Methods:
  Kredi Kartı: %78
  Banka Transferi: %15
  Digital Wallets: %7

Refund Statistics:
  Toplam Refund Requests: 12
  Approved Refunds: 9
  Refund Amount: ₺1,240
  Refund Rate: %1.8
```

### 🔄 Abonelik Yönetimi

**Subscription Operations:**
```
📋 Plan Yönetimi:
├── Plan oluşturma/düzenleme
├── Pricing değişiklikleri
├── Promotional pricing
├── Bulk plan updates
└── Plan migration tools

👥 Subscriber Management:
├── Manual subscription creation
├── Plan upgrade/downgrade
├── Subscription pause/resume
├── Early termination handling
└── Proration calculations

💰 Billing Operations:
├── Invoice generation
├── Payment retry logic
├── Failed payment handling
├── Manual payment processing
└── Credit/Debit adjustments
```

### 📊 Finansal Raporlama

**Rapor Türleri:**
- **📈 Revenue Reports** - Günlük, haftalık, aylık gelir analizi
- **👥 Customer LTV** - Lifetime value analysis
- **💳 Payment Analytics** - Payment method performance
- **🔄 Churn Analysis** - Subscription cancellation patterns
- **📊 Cohort Analysis** - User behavior over time
- **💰 Profitability Reports** - Course-level profitability
- **📉 Refund Analysis** - Refund patterns and reasons

---

## 🔔 Bildirim ve Komunikasyon

### 📧 E-posta Campaigns

**Campaign Türleri:**
```yaml
Welcome Series:
  - Welcome email (Registration)
  - Onboarding sequence (Days 1, 3, 7)
  - First course recommendation
  - Community introduction

Educational Content:
  - Weekly newsletter
  - New course announcements
  - Featured content highlights
  - Success stories

Engagement Campaigns:
  - Re-engagement for inactive users
  - Course completion celebrations
  - Achievement notifications
  - Community highlights

Promotional:
  - Sales and discounts
  - Limited-time offers
  - Premium plan upgrades
  - Referral programs
```

### 📱 Push Notifications

**Notification Strategy:**
```
🎯 Personalized Notifications:
├── Learning reminders
├── Quiz deadlines
├── New content alerts
├── Forum activity
└── Achievement unlocks

📊 Behavioral Triggers:
├── Inactivity reminders (3, 7, 14 days)
├── Course progress milestones
├── Peer interaction prompts
├── Subscription renewal alerts
└── Special offer eligibility

⚙️ Notification Controls:
├── User preference management
├── Frequency capping
├── Quiet hours support
├── Channel preferences
└── Unsubscribe handling
```

### 💬 Forum Moderasyonu

**Moderasyon Araçları:**
```yaml
Content Moderation:
  Auto-Detection:
    - Spam filtering
    - Inappropriate content
    - Link validation
    - Duplicate post detection

  Manual Actions:
    - Post editing/deletion
    - User warnings
    - Thread locking
    - Category reorganization

Community Management:
  - Featured posts highlighting
  - Expert badge assignment
  - Community challenges
  - Q&A session organization
  - User spotlight features

Reporting System:
  - User-generated reports
  - Admin investigation tools
  - Resolution tracking
  - Appeal process
  - Pattern analysis
```

---

## 📊 Analytics ve Raporlama

### 📈 Öğrenme Analytics

**Performance Metrikleri:**
```yaml
Course Analytics:
  Completion Rates:
    - Overall: %78
    - By course level: Beginner %85, Intermediate %75, Advanced %68
    - By duration: <2 hours %92, 2-5 hours %78, >5 hours %65

  Engagement Metrics:
    - Average session duration: 23 minutes
    - Video completion rate: %84
    - Quiz attempt rate: %91
    - Forum participation: %34

  Learning Paths:
    - Most popular sequences
    - Drop-off points analysis
    - Optimal learning schedules
    - Content effectiveness scores

Student Progress:
  Individual Tracking:
    - Learning velocity
    - Knowledge retention
    - Skill progression
    - Achievement patterns

  Cohort Analysis:
    - Group performance trends
    - Comparative analysis
    - Success factor identification
    - Intervention opportunities
```

### 🎯 Business Intelligence

**KPI Dashboard:**
```yaml
Growth Metrics:
  User Acquisition:
    - New registrations: 156 (bu ay)
    - Acquisition cost: ₺45/user
    - Conversion rate: %12.3
    - Traffic sources analysis

  Retention Metrics:
    - Day 1 retention: %78
    - Day 7 retention: %56
    - Day 30 retention: %34
    - Cohort retention curves

  Revenue Metrics:
    - MRR growth: %8.5
    - ARPU: ₺67
    - LTV/CAC ratio: 3.2:1
    - Revenue per course: ₺340

Operational Metrics:
  - Support ticket volume: 23/week
  - Response time: 4.2 hours
  - Resolution rate: %94
  - Customer satisfaction: 4.6/5
```

### 📊 Custom Reports

**Rapor Oluşturucu:**
```
🔧 Report Builder:
├── Drag-and-drop interface
├── Multiple data sources
├── Custom date ranges
├── Filter combinations
├── Chart type selection
├── Automated scheduling
├── Export options (PDF, Excel, CSV)
└── Dashboard embedding

📈 Visualization Options:
├── Line charts (trends)
├── Bar charts (comparisons)
├── Pie charts (distributions)
├── Heat maps (patterns)
├── Funnel charts (conversions)
├── Cohort tables
├── Geographic maps
└── Real-time counters
```

---

## ⚙️ Sistem Yönetimi

### 🔧 Platform Konfigürasyonu

**Sistem Ayarları:**
```yaml
General Settings:
  - Platform name and branding
  - Default language and timezone
  - Currency settings
  - Email templates
  - Legal pages (Terms, Privacy)

Learning Settings:
  - Default course access duration
  - Certificate templates
  - Quiz passing scores
  - Progress tracking rules
  - Completion criteria

Security Settings:
  - Password policies
  - 2FA requirements
  - Session timeouts
  - IP restrictions
  - API rate limits

Integration Settings:
  - Payment gateway configuration
  - Email service setup
  - Analytics tracking codes
  - CDN configuration
  - Backup settings
```

### 🗄️ Database Yönetimi

**Veri Yönetimi Araçları:**
```
📊 Database Health:
├── Storage utilization
├── Query performance
├── Index optimization
├── Backup status
└── Connection monitoring

🔄 Data Operations:
├── Bulk data import/export
├── Data cleanup tools
├── Migration utilities
├── Archival management
└── Integrity checks

📈 Performance Optimization:
├── Query optimization
├── Cache management
├── Index analysis
├── Slow query identification
└── Resource monitoring
```

### 🔐 Güvenlik Monitoring

**Güvenlik Dashboard:**
```yaml
Threat Monitoring:
  Failed Login Attempts: 23 (son 24 saat)
  Suspicious IPs: 3 flagged
  Malware Scans: All clean
  DDoS Protection: Active

Access Logs:
  Admin Logins: 12 (bugün)
  API Calls: 45,670 (son saat)
  File Downloads: 234 (son saat)
  Unusual Patterns: None detected

Security Measures:
  SSL Certificate: Valid until 2025-12-15
  Firewall Status: Active
  Backup Encryption: Enabled
  2FA Adoption: %78 of admins
  
Compliance Status:
  GDPR Compliance: ✅ Active
  KVKK Compliance: ✅ Active
  PCI DSS: ✅ Level 1
  Data Retention: Policy enforced
```

---

## 🆘 Sorun Çözme ve Destek

### 🔧 Yaygın Admin Sorunları

**Teknik Problemler ve Çözümler:**

**🎥 Video Upload Sorunları**
```
Semptomlar:
- Video upload başarısız oluyor
- Encoding hatası alınıyor
- Thumbnail oluşmuyor

Çözüm Adımları:
✅ Video format kontrolü (MP4, MOV, AVI desteklenir)
✅ Dosya boyutu kontrolü (Max 2GB)
✅ Internet bağlantısı testi
✅ CDN status kontrolü
✅ Encoding queue status
✅ Storage quota kontrolü

Önleme:
- Recommended formats kullanın
- Video compression tools
- Batch upload for large files
```

**👥 Kullanıcı Sync Sorunları**
```
Semptomlar:
- Progress sync olmuyor
- Duplicate accounts
- Missing subscription data

Çözüm Adımları:
✅ Database integrity check
✅ API connection test
✅ User ID validation
✅ Subscription sync tool
✅ Manual data correction
✅ Cache clearing

Önleme:
- Regular sync monitoring
- Automated conflict detection
- Backup procedures
```

### 📞 Escalation Procedures

**Destek Seviyeleri:**
```
Level 1 - Basic Support:
├── Common user issues
├── Account management
├── Content access problems
├── Basic troubleshooting
└── FAQ referrals

Level 2 - Technical Support:
├── Payment processing issues
├── Video streaming problems
├── Platform bugs
├── Integration problems
└── Performance issues

Level 3 - Expert Support:
├── Security incidents
├── Data corruption
├── System outages
├── Critical bugs
└── Emergency procedures

Escalation Triggers:
- Unresolved for >24 hours
- Security-related issues
- System-wide problems
- VIP customer issues
- Revenue impact >₺1000
```

### 🚨 Acil Durum Protokolleri

**Emergency Response:**
```yaml
System Outage:
  Immediate Actions:
    1. Status page update
    2. Social media announcement
    3. Emergency team notification
    4. Backup system activation
    5. User communication

  Recovery Process:
    1. Root cause identification
    2. Fix implementation
    3. System testing
    4. Gradual traffic restoration
    5. Post-incident review

Security Breach:
  Immediate Actions:
    1. System isolation
    2. Threat assessment
    3. Law enforcement notification
    4. User notification preparation
    5. Damage assessment

  Recovery Process:
    1. Security patch deployment
    2. Password reset enforcement
    3. Audit trail analysis
    4. Compliance reporting
    5. Security improvement plan
```

---

## 📚 Best Practices ve İpuçları

### 🎯 Etkili Yönetim Stratejileri

**Content Management:**
1. **📅 Content Calendar** - Kurs yayın planlaması
2. **👥 Peer Review** - İçerik kalite kontrolü
3. **📊 A/B Testing** - Başlık ve açıklama optimizasyonu
4. **🔄 Regular Updates** - İçerik güncelliği kontrolü
5. **📈 Performance Tracking** - KPI'ları düzenli takip

**User Engagement:**
1. **🎯 Personalization** - Kişiselleştirilmiş deneyim
2. **🏆 Gamification** - Achievement ve badge sistemi
3. **💬 Community Building** - Aktif forum yönetimi
4. **📧 Email Campaigns** - Segmentasyon ile targeting
5. **📱 Multi-channel** - Çoklu platform entegrasyonu

### 🔄 Workflow Optimization

**Daily Admin Tasks:**
```
🌅 Sabah Rutini (9:00-10:00):
├── Dashboard metrikleri kontrol
├── Overnight alerts review
├── New support tickets
├── Revenue summary
└── System health check

📊 Gündüz Takibi (10:00-17:00):
├── Content moderation
├── User support responses
├── Campaign monitoring
├── Performance analytics
└── Team coordination

🌙 Akşam Değerlendirme (17:00-18:00):
├── Daily metrics summary
├── Tomorrow's planning
├── Backup verification
├── Security log review
└── Team updates
```

**Weekly Admin Tasks:**
- **📈 Analytics Review** - Haftalık performance raporu
- **👥 Team Meeting** - Progress ve sorunlar
- **📧 Newsletter Preparation** - İçerik planlama
- **🔧 System Maintenance** - Update ve optimizasyon
- **📊 Financial Review** - Revenue ve cost analysis

### 💡 Pro Tips

**Efficiency Hacks:**
1. **⌨️ Keyboard Shortcuts** - Admin panel navigasyon
2. **📊 Custom Dashboards** - Kişisel metrik ekranları
3. **🔔 Smart Notifications** - Sadece önemli alerts
4. **📱 Mobile Admin** - Mobil cihazdan yönetim
5. **🤖 Automation** - Tekrarlayan görevleri otomatize

**Quality Control:**
1. **📝 Content Guidelines** - Standart kalite kriterleri
2. **👥 Multiple Reviews** - İçerik onay süreci
3. **🧪 Testing Protocols** - Yeni özellik test prosedürleri
4. **📊 Regular Audits** - Sistem ve içerik denetimi
5. **🔄 Continuous Improvement** - Sürekli iyileştirme döngüsü

---

## 📖 Kaynaklar ve Referanslar

### 📚 Ek Dokümantasyon

**Technical Resources:**
- **[API Documentation](../technical/API-Reference.md)** - Sistem entegrasyonları
- **[Database Schema](../technical/Database-Schema-Report.md)** - Veri yapısı
- **[Security Guide](../security-report.md)** - Güvenlik protokolleri
- **[Troubleshooting FAQ](Troubleshooting-FAQ.md)** - Yaygın sorunlar

**Business Resources:**
- **[User Manual](User-Manual.md)** - Kullanıcı deneyimi anlama
- **[Feature Analysis](../technical/Feature-Analysis-Report.md)** - Platform özellikleri
- **[Analytics Guide](../technical/Main-Project-Analysis.md)** - Performans metrikleri

### 🎓 Training Materials

**Video Tutorials:**
- **Admin Panel Overview** - 15 dakikalık giriş videosu
- **User Management** - Kullanıcı yönetimi detayları
- **Content Creation** - Kurs oluşturma workshop
- **Analytics Deep Dive** - Raporlama ve analiz
- **Emergency Procedures** - Acil durum protokolleri

**Interactive Guides:**
- **Step-by-step Walkthrough** - İlk admin kurulumu
- **Feature Discovery** - Platform özelliklerini keşfetme
- **Troubleshooting Simulator** - Sorun çözme pratiği

### 📞 Support Contacts

**Internal Support:**
- **Technical Team:** tech-support@7peducation.com
- **Content Team:** content@7peducation.com
- **Finance Team:** finance@7peducation.com
- **Security Team:** security@7peducation.com

**External Vendors:**
- **Stripe Support:** Business account hotline
- **Supabase Support:** Enterprise support ticket
- **CDN Provider:** Technical support 24/7
- **Email Service:** Delivery monitoring

---

## 🔄 Admin Onboarding Checklist

### ✅ İlk Gün - Temel Kurulum
- [ ] Admin hesabı aktivasyonu
- [ ] 2FA kurulumu ve backup codes
- [ ] Dashboard tour tamamlama
- [ ] Role ve permissions anlama
- [ ] Emergency contact bilgileri
- [ ] Güvenlik protokollerini okuma

### ✅ İlk Hafta - Sistem Öğrenme
- [ ] User management araçlarını öğrenme
- [ ] Content creation workflow
- [ ] Basic analytics interpretation
- [ ] Support ticket handling
- [ ] Forum moderation tools
- [ ] Payment system basics

### ✅ İlk Ay - Advanced Features
- [ ] Custom report creation
- [ ] Advanced user segmentation
- [ ] Email campaign management
- [ ] System configuration changes
- [ ] Performance optimization
- [ ] Emergency procedure training

### ✅ Ongoing - Continuous Learning
- [ ] Weekly team meetings participation
- [ ] Monthly training sessions
- [ ] Quarterly system reviews
- [ ] Annual security audits
- [ ] Platform update training
- [ ] Best practices sharing

---

**🎯 Admin Başarısı:** Bu rehber ile 7P Education Platform'unu etkili bir şekilde yönetebilir, kullanıcılarınıza en iyi deneyimi sunabilirsiniz. Sorularınız için destek ekibimizle iletişime geçmekten çekinmeyin.

**📈 Sürekli Gelişim:** Platform sürekli gelişmekte ve yeni özellikler eklenmektedir. Güncel kalmak için dokümantasyonu düzenli olarak kontrol edin ve training sessionlarına katılın.

---

**📅 Son Güncelleme:** August 2025  
**📄 Versiyon:** 1.0  
**👥 Hazırlayan:** 7P Education Admin Team