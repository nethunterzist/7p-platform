# 🧠 Claude Planlama Modu - Master Prompt

## 🎯 ANA PROMPT (Her Seferinde Yapıştırın)

```
🤖 CLAUDE PLANLAMA MODU AKTİF 

ROL: Sen "Task Planner & Prompt Engineer" olarak çalışıyorsun
GÖREV: Acemi geliştiriciye sub-agent koordinasyonu için optimize edilmiş promptlar hazırlamak

📋 SİSTEM KURALLARI:
1. Ben acemi bir yazılımcıyım, sen uzman planlamacısın
2. Bana görev verdiğimde sen bunu analiz edip sub-agent'lara uygun prompt yazacaksın
3. @docs/CLAUDE_CODE_SETUP_RAPORU.md dosyasındaki sub-agent listesini referans alacaksın
4. Her prompt şu formatta olacak:

🎯 GÖREV: [Görev tanımı]
🤖 AGENT: [Hangi sub-agent kullanılacak]  
📝 PROMPT: [Diğer terminale kopyalanacak optimize edilmiş komut]
🔧 CONFIG: [Gerekli flag'lar ve özelleştirilmiş ayarlar]
⚡ DOCS: [Hangi docs dosyalarını okuması gerektiği]
📋 LOG: [Otomatik oluşturulacak session log dosyası yolu]

📚 REFERANS KAYNAK:
- @docs/CLAUDE_CODE_SETUP_RAPORU.md (Sub-agent listesi)
- @docs/ klasörü (Tüm dokümantasyon)
- Proje yapısı ve mevcut kodlar

🎨 ÇıKTı STİLİ:
- Net ve kopyalanabilir promptlar
- Teknik detayları basitleştir  
- Step-by-step yaklaşım
- Error handling dahil et
- Best practices uygula
- Otomatik session logging aktivasyonu

📋 LOGGING SİSTEMİ:
- Her prompt için uygun log kategori ve dosya yolu belirt
- Log kategorileri: authentication, database, ui-components, api-development, deployment, performance, security, testing, bug-fixes, general
- Dosya formatı: docs/05-logs/[kategori]/YYYY-MM-DD-[konu].md
- Execution terminal'da otomatik log oluşturma talimatı ver

🚀 HAZIR DURUMDA
Görevinizi söyleyin, size mükemmel prompt hazırlayayım!
```

---

## 🔧 Kullanım Talimatları

### 📝 Nasıl Kullanılır:
1. **Yeni proje başlarken** yukarıdaki prompt'u Claude'a yapıştırın
2. **Görevinizi söyleyin** (örn: "Supabase kurulumu yap")
3. **Aldığınız prompt'u** diğer terminale kopyalayın
4. **Sub-agent'ları çalıştırın**
5. **Sonuçları gözlemleyin**

### 🎯 Örnek Kullanım:
```
SİZ: [CLAUDE-PLANLAMA-MODU-PROMPT.md içeriğini yapıştır]
SİZ: "Dashboard component geliştirmek istiyorum"
CLAUDE: 
🎯 GÖREV: Dashboard UI component development
🤖 AGENT: frontend-developer + ui-designer
📝 PROMPT: [Optimize edilmiş komut]
🔧 CONFIG: --magic --c7 --persona-frontend
⚡ DOCS: @docs/02-development/
📋 LOG: docs/05-logs/ui-components/2025-08-23-dashboard-component.md

SİZ: [Bu prompt'u diğer terminale kopyalar ve log otomatik oluşur]
```

### 💡 Pro Tips:
- Bu prompt'u bookmark'layın
- Her yeni görev için fresh terminal açın  
- Görevlerinizi mümkün olduğunca net tanımlayın
- Claude'un verdiği config'leri mutlaka kullanın
- Log dosyalarını düzenli gözden geçirin (token limit yok!)
- Her session sonunda log'u tamamlayın

---

## 📊 Sub-Agent Referans Kılavuzu

### 🔗 Mevcut Sub-Agent'lar:
(CLAUDE_CODE_SETUP_RAPORU.md'den referans alınacak)

#### 🎨 Frontend & UI Development
- **frontend-developer**: React/Next.js UI/UX geliştirme, responsive design
- **ui-designer**: Design systems, component libraries, user experience
- **accessibility-auditor**: WCAG compliance, screen reader uyumluluğu

#### 🏗️ Backend & Database
- **backend-architect**: Server-side logic, API architecture, scalability
- **database-architect**: **Supabase database design, automated migrations** ⭐
- **api-design-specialist**: RESTful API design, OpenAPI documentation
- **realtime-communication-architect**: WebSocket, Socket.io, real-time features

#### 🔐 Security & Performance  
- **security-vulnerability-scanner**: Security audits, vulnerability assessment
- **performance-optimization-expert**: Performance tuning, bottleneck elimination
- **error-handler-specialist**: Error handling strategies, logging implementation

#### 🧪 Testing & Quality
- **test-writer**: Unit tests, integration tests, test coverage
- **code-review-specialist**: Code quality review, best practices
- **accessibility-auditor**: Web accessibility compliance

#### 🚀 DevOps & Infrastructure
- **devops-automator**: CI/CD pipelines, deployment automation
- **environment-config-specialist**: Environment variables, configuration management

#### 📚 Documentation & Architecture
- **technical-documentation-writer**: API docs, README files, code documentation
- **code-refactoring-expert**: Code quality improvement, technical debt management

### 🎛️ Yaygın Kullanım Senaryoları:

#### 🏗️ Database & Backend (Updated for Supabase)
- **Database Migration** → database-architect (automated Supabase migrations) ⭐
- **Backend API Development** → backend-architect + api-design-specialist
- **Real-time Features** → realtime-communication-architect + backend-architect
- **Authentication System** → backend-architect + security-vulnerability-scanner

#### 🎨 Frontend Development
- **UI Component Development** → frontend-developer + ui-designer
- **Responsive Design** → frontend-developer + accessibility-auditor
- **Component Libraries** → ui-designer + frontend-developer

#### 🔒 Security & Performance
- **Security Audit** → security-vulnerability-scanner + code-review-specialist
- **Performance Optimization** → performance-optimization-expert + database-architect
- **Error Handling** → error-handler-specialist + backend-architect

#### 🧪 Testing & Quality
- **Test Implementation** → test-writer + code-review-specialist
- **Code Quality Review** → code-review-specialist + code-refactoring-expert
- **Accessibility Testing** → accessibility-auditor + frontend-developer

#### 🚀 DevOps & Infrastructure
- **Deployment Setup** → devops-automator + environment-config-specialist
- **Environment Configuration** → environment-config-specialist + devops-automator

#### 📝 Documentation
- **Technical Documentation** → technical-documentation-writer + api-design-specialist
- **Code Documentation** → technical-documentation-writer + code-review-specialist

---

## 📈 Workflow Örneği

### 1️⃣ Başlangıç:
```bash
# Terminal 1 (Planlama Modu)
Claude'a CLAUDE-PLANLAMA-MODU-PROMPT.md'yi yapıştır
```

### 2️⃣ Görev Verme:
```
"Supabase database migration sistemi kurarak otomatik schema deployment yapmak istiyorum"
```

### 3️⃣ Prompt Alma:
```
🎯 GÖREV: Supabase automated migration system setup
🤖 AGENT: database-architect + devops-automator
📝 PROMPT: [Supabase migration automation için optimize edilmiş komut]
🔧 CONFIG: --supabase --automated-migration --dotenvx-security
⚡ DOCS: @docs/database/ @docs/database-security-guide.md
```

### 4️⃣ Execution:
```bash  
# Terminal 2 (Execution)
[Alınan prompt'u yapıştır ve çalıştır]
```

---

## 📋 Updated Documentation & Tracking

### 🗂️ New Docs Structure
Claude Planlama Modu artık yeni organize docs yapısıyla çalışır:

```
docs/
├── README.md                    # 📚 Ana navigasyon
├── CLAUDE-PLANLAMA-MODU.md     # 🤖 Bu dosya
│
├── 01-setup/                   # 🚀 Kurulum rehberleri
├── 02-development/              # 🔧 Aktif geliştirme dokümanları
├── 03-completed/                # ✅ Tamamlanan milestone'lar
└── 04-reference/                # 📖 Referans dokümanlar
```

### 🤖 Modern Development Tracking
**Artık günlük tutmak yerine, Git-based tracking kullanıyoruz:**

#### 📝 Recommended Workflow:
1. **Git Commits**: Meaningful commit messages with context
2. **Pull Requests**: Detailed PR descriptions with what/why/how
3. **Milestone Documentation**: Completed features → `docs/03-completed/`
4. **Setup Guides**: New configurations → `docs/01-setup/`

#### 🎯 When to Document:
- ✅ **Major Feature Completion**: New milestone doc in `03-completed/`
- 🔧 **Setup Changes**: Update relevant guide in `01-setup/`
- 🚀 **Production Changes**: Update deployment checklists
- 📊 **Architecture Changes**: Update `02-development/` docs

#### 🤖 Sub-Agent Coordination Best Practices:
Instead of detailed logging, focus on:
1. **Clear Commit Messages**: Include sub-agent info in commits
2. **PR Templates**: Standard format for feature completion
3. **Documentation Updates**: Keep docs current with changes
4. **Git Tags**: Mark major milestones and releases

**Example Git Workflow:**
```bash
# Feature development with sub-agent info
git commit -m "feat: implement real-time notifications

- Used realtime-communication-architect for WebSocket setup
- Added frontend-developer for UI components  
- Integrated with existing auth system

Co-authored-by: Claude-Code-Assistant"

# Milestone completion
git commit -m "milestone: authentication system complete

- All auth features implemented and tested
- Added to docs/03-completed/auth-system.md
- Ready for production deployment"
```

---

*Bu dokümantasyon, Claude Planlama Modu sisteminin master prompt'u ve kullanım kılavuzudur.*
*Her yeni projede bu prompt'u kullanarak tutarlı ve etkili geliştirme yapabilirsiniz.*

**🔄 Son Güncelleme:** 23 Ağustos 2025
**📝 Oluşturan:** Claude AI Assistant  
**🎯 Amaç:** Acemi geliştiriciler için sub-agent koordinasyonu
**📋 v2.0 Özellik:** Clean docs structure + Git-based tracking