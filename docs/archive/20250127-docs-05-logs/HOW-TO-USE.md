# 🚀 Session Logging Sistemi - Nasıl Kullanılır

**Token limit sorununu çözen otomatik session tracking sistemi**

## 📋 Hızlı Başlangıç

### 1️⃣ Planning Mode'da Görev Ver
```bash
# Terminal 1'de Claude Planning Mode açın
# CLAUDE-PLANLAMA-MODU-PROMPT.md içeriğini yapıştırın
# Sonra görevinizi söyleyin:

"Dashboard component geliştirmek istiyorum"
```

### 2️⃣ Prompt'u Al ve Kopyala
Planning Mode Claude size şu formatta yanıt verir:
```
🎯 GÖREV: Dashboard UI component development
🤖 AGENT: frontend-developer + ui-designer
📝 PROMPT: [Execution terminal'e kopyalanacak komut]
🔧 CONFIG: --magic --c7 --persona-frontend
⚡ DOCS: @docs/02-development/
📋 LOG: docs/05-logs/ui-components/2025-08-23-dashboard-component.md
```

### 3️⃣ Execution Terminal'da Çalıştır
```bash
# Terminal 2'de Claude Code açın
# Aldığınız prompt'u yapıştırın
# Session otomatik olarak log'lanacak
```

## 📂 Log Kategorileri & Ne Zaman Kullan

| Kategori | Konu | Örnek İşler |
|----------|------|-------------|
| `authentication` | Giriş, kayıt, yetki | "Google login ekle", "JWT token fix" |
| `database` | Schema, migration, Supabase | "Yeni tablo oluştur", "Migration yap" |
| `ui-components` | Component, design, frontend | "Button component", "Dashboard tasarım" |
| `api-development` | Backend API, endpoint | "User API", "Course CRUD endpoint" |
| `deployment` | Vercel, production, hosting | "Production deploy", "Environment setup" |
| `performance` | Optimizasyon, hız | "Bundle size", "Loading optimization" |
| `security` | Güvenlik, audit | "Security scan", "Vulnerability fix" |
| `testing` | Test, QA, validation | "Unit test", "E2E testing setup" |
| `bug-fixes` | Hata çözme, debug | "Login bug fix", "Error handling" |
| `general` | Diğer işler | "Documentation", "Config update" |

## 🎯 Log Template Kullanımı

### Manuel Log Oluşturma (Gerekirse):
```bash
# Template'i kopyala
cp docs/05-logs/_template.md docs/05-logs/[kategori]/$(date +%Y-%m-%d)-[konu].md

# Örnek:
cp docs/05-logs/_template.md docs/05-logs/database/2025-08-23-user-table-migration.md
```

### Session Sırasında Log Güncellemesi:
1. **Başlangıç**: Hedef ve plan bölümünü doldur
2. **İş Sırasında**: Tamamlanan işleri işaretle
3. **Problem**: Karşılaştığın problemleri not et
4. **Bitiş**: Session metrics ve değerlendirme yap

## 💡 Professional Tips

### ✅ İyi Pratikler:
- Her session'da sadece 1 log dosyası kullan
- Session bitince mutlaka tamamla
- Öğrendiklerini not et (gelecekte faydalı)
- Problem-çözüm ikililerini kaydet
- Next steps'i mutlaka belirt

### ❌ Kaçınılması Gerekenler:
- Multiple topic'leri tek log'da karıştırma
- Log'u yarım bırakma
- Generic açıklamalar (specific ol)
- Copy-paste kod blokları (sadece key insights)
- Çok uzun açıklamalar (token efficient ol)

## 📊 Log Takibi & Analytics

### Haftalık Review:
```bash
# Bu haftaki tüm log'ları listele
find docs/05-logs -name "2025-08-2*.md" -type f

# Kategori bazında sayım
find docs/05-logs -name "2025-08-*.md" | xargs dirname | sort | uniq -c
```

### Öğrenme Takibi:
```bash
# Öğrenilen şeyleri ara
grep -r "Öğrenilenler" docs/05-logs/*/2025-08-*.md

# Problem pattern'leri analiz et
grep -r "Problem:" docs/05-logs/*/2025-08-*.md
```

## 🔧 Advanced Features

### Session Metrics Tracking:
Her log'da şu metrikleri takip et:
- **Süre**: Session ne kadar sürdü
- **Tamamlama**: Hedeflerin yüzde kaçını başardın
- **Öğrenme**: Ne kadar yeni şey öğrendin
- **Quality**: Kod kaliten nasıl
- **Token Usage**: Ne kadar token harcandı

### Problem Pattern Analysis:
Recurring problemleri tespit etmek için:
1. Similar problem'leri log'larda ara
2. Root cause pattern'leri belirle  
3. Preventive measure'lar geliştir
4. Best practice'leri dokümante et

## 🚨 Troubleshooting

### Token Limit Sorunu (Tekrar):
- Log dosyan çok büyüdüyse yeni dosyaya geç
- Multiple topic'leri separate et
- Specific session'larda specific topic'lere odaklan

### Log Organization Karmaşası:
- Clear naming convention kullan: YYYY-MM-DD-konu-açıklaması.md
- Kategori seçiminde kararsız kalırsan `general` kullan
- Multiple kategori gerekiyorsa primary kategori seç

### Session Tracking Unutma:
- Her Planning Mode session'ında LOG field'ını kontrol et
- Template'i bookmark'la
- Session başında hemen log dosyasını aç ve hedefi yaz

---

**💪 Başarı Formülü:**
1. **Plan** (Planning Mode)
2. **Execute** (Execution Terminal)  
3. **Log** (Session tracking)
4. **Review** (Haftalık analiz)
5. **Learn** (Pattern recognition)

Bu sistem ile token limit problemi tarihe karışacak ve professional development tracking yapacaksın! 🚀