# 🧹 DRY RUN - Repo Temizliği Envanter Raporu

**Oluşturulma Tarihi**: 2025-08-27
**Durum**: DRY_RUN=true (Sadece Planlama)
**Hedef**: Güvenli repo temizliği - ARCHIVE öncelikli, silme işlemi onay bekliyor

---

## 📋 ENVANTER ÖZETİ

### Markdown Dosyaları (Kök Dizin)
**Toplam**: 27 dosya
- **KEEP**: 2 dosya (README.md, CHANGELOG.md)
- **MIGRATE**: 0 dosya
- **ARCHIVE**: 25 dosya
- **DELETE_CANDIDATE**: 0 dosya

### Test Dosyaları
**Toplam**: 13 dosya
- **KEEP**: 11 dosya (aktif testler)
- **MIGRATE**: 0 dosya
- **ARCHIVE**: 2 dosya (orphan testler)
- **DELETE_CANDIDATE**: 0 dosya

---

## 🗂️ DOSYA DETAYLI ANALİZİ

### Markdown Dosyaları - Sınıflandırma

| Dosya | Son Değişiklik | Boyut (KB) | Referans | Sebep | Karar |
|-------|---------------|-------------|----------|-------|--------|
| README.md | Aug 27 13:48 | 8.4 | Ana proje | Ana proje belgesi | **KEEP** |
| CHANGELOG.md | Aug 27 13:50 | 5.7 | Süreğen | Versiyon geçmişi | **KEEP** |
| MOCK-PAYMENT-IMPLEMENTATION-COMPLETE.md | Aug 23 19:01 | 7.4 | 0 | Tamamlanmış operasyon raporu | **ARCHIVE** |
| SECURITY-AUDIT-REPORT.md | Aug 24 11:11 | 16.5 | 0 | Operasyon raporu | **ARCHIVE** |
| VERCEL-DEPLOYMENT-GUIDE.md | Aug 24 16:13 | 8.0 | 0 | Operasyonel guide | **ARCHIVE** |
| PRODUCTION-MONITORING-SETUP.md | Aug 24 16:14 | 10.6 | 0 | Operasyon raporu | **ARCHIVE** |
| FINAL-SECURITY-VALIDATION-REPORT.md | Aug 24 16:15 | 7.1 | 0 | Final rapor | **ARCHIVE** |
| NEXT_STEPS.md | Aug 26 20:20 | 8.8 | 0 | Geçici not | **ARCHIVE** |
| CHECKS.md | Aug 26 20:23 | 13.9 | 0 | Debug raporu | **ARCHIVE** |
| RUNBOOK.md | Aug 26 20:57 | 9.2 | 0 | Operasyonel runbook | **ARCHIVE** |
| CHECKLIST.md | Aug 26 20:58 | 9.3 | 0 | Operasyonel checklist | **ARCHIVE** |
| STATUS.md | Aug 26 21:00 | 9.5 | 0 | Durum raporu | **ARCHIVE** |
| SMOKE_REPORT.md | Aug 26 23:21 | 9.2 | 0 | Test raporu | **ARCHIVE** |
| FIXES.md | Aug 26 23:23 | 10.0 | 0 | Fix listesi | **ARCHIVE** |
| RLS_TEST.md | Aug 26 23:24 | 10.0 | 0 | Test raporu | **ARCHIVE** |
| STRIPE_WEBHOOK_CHECK.md | Aug 26 23:25 | 11.6 | 0 | Test raporu | **ARCHIVE** |
| PRODUCTION_READY_PATCHES.md | Aug 26 23:29 | 7.7 | 0 | Operasyon raporu | **ARCHIVE** |
| VERCEL_DEPLOY_CHECKLIST.md | Aug 26 23:40 | 13.3 | 0 | Operasyonel checklist | **ARCHIVE** |
| RUNBOOK_PROD.md | Aug 26 23:44 | 12.9 | 0 | Operasyonel runbook | **ARCHIVE** |
| POST_DEPLOY_SMOKE.md | Aug 26 23:46 | 13.8 | 0 | Test raporu | **ARCHIVE** |
| STRIPE_WEBHOOK_SETUP.md | Aug 26 23:47 | 13.9 | 0 | Setup guide | **ARCHIVE** |
| SENTRY_SOURCEMAPS_GUIDE.md | Aug 26 23:49 | 14.4 | 0 | Setup guide | **ARCHIVE** |
| NEXT_ACTIONS_FOR_OWNER.md | Aug 26 23:56 | 9.7 | 0 | Geçici not | **ARCHIVE** |
| DEPLOYMENT_SUMMARY.md | Aug 26 23:57 | 8.6 | 0 | Operasyon özeti | **ARCHIVE** |
| PAYMENTS_OFF_RUNBOOK.md | Aug 27 10:06 | 16.7 | 0 | Operasyonel runbook | **ARCHIVE** |
| ENV_IMPORT_LOG.md | Aug 27 11:16 | 1.2 | 0 | Operasyon logu | **ARCHIVE** |
| ENV_IMPORT_FINAL_REPORT.md | Aug 27 11:44 | 7.2 | 0 | Final rapor | **ARCHIVE** |
| MIDDLEWARE_FIX_REPORT.md | Aug 27 12:56 | 7.6 | 0 | Fix raporu | **ARCHIVE** |

### Test Dosyaları - Sınıflandırma

| Dosya | Son Değişiklik | Durum | Target Mevcut? | Karar |
|-------|---------------|--------|---------------|--------|
| tests/security/penetration-tests.test.ts | Aug 20 10:45 | Aktif | ✅ | **KEEP** |
| tests/security/auth-security.test.ts | Aug 20 10:43 | Aktif | ✅ | **KEEP** |
| tests/security/integration-tests.test.ts | Aug 20 10:46 | Aktif | ✅ | **KEEP** |
| tests/enrollment/free-enroll.test.ts | Aug 27 10:03 | Aktif | ✅ | **KEEP** |
| tests/hooks/usePaymentMode.test.tsx | Aug 27 10:04 | Aktif | ✅ | **KEEP** |
| tests/api/courses.test.ts | Aug 26 20:53 | Aktif | ✅ | **KEEP** |
| tests/api/payment-guard.test.ts | Aug 27 10:04 | Aktif | ✅ | **KEEP** |
| tests/api/auth.test.ts | Aug 26 20:53 | Aktif | ✅ | **KEEP** |
| tests/api/storage.test.ts | Aug 26 20:54 | Aktif | ✅ | **KEEP** |
| tests/e2e/student-flow.spec.ts | Aug 26 20:55 | Aktif | ✅ | **KEEP** |
| tests/e2e/admin-flow.spec.ts | Aug 26 20:56 | Aktif | ✅ | **KEEP** |
| src/app/api/auth/__tests__/security.test.ts | Aug  2 01:27 | Eski | Belirsiz | **ARCHIVE** |
| src/tests/auth-integration.test.ts | Aug 20 21:17 | Eski | Kısmen | **ARCHIVE** |

---

## 📁 ÖNERİLEN YENİ DOSYA YERLEŞİMİ

### Arşiv Yapısı
```
docs/
├── archive/
│   ├── 2025-08-23/
│   │   ├── MOCK-PAYMENT-IMPLEMENTATION-COMPLETE.md
│   │   └── [diğer Aug 23 raporları]
│   ├── 2025-08-24/
│   │   ├── SECURITY-AUDIT-REPORT.md
│   │   ├── VERCEL-DEPLOYMENT-GUIDE.md
│   │   └── [diğer Aug 24 raporları]
│   ├── 2025-08-26/
│   │   ├── CHECKS.md
│   │   ├── RUNBOOK.md
│   │   └── [diğer Aug 26 raporları]
│   └── 2025-08-27/
│       ├── ENV_IMPORT_FINAL_REPORT.md
│       ├── MIDDLEWARE_FIX_REPORT.md
│       └── [diğer Aug 27 raporları]
```

### Test Arşiv Yapısı
```
tests/
├── archive/
│   └── legacy/
│       ├── auth-security-old.test.ts (eski src/app/api/auth/__tests__/security.test.ts)
│       └── auth-integration-old.test.ts (eski src/tests/auth-integration.test.ts)
```

---

## 🔧 ÖNERİLEN OTOMASYON SCRİPTLERİ

### package.json Eklemeleri
```json
{
  "scripts": {
    "docs:check": "node scripts/docs-check.mjs",
    "docs:migrate": "DRY_RUN=true node scripts/docs-migrate.mjs",
    "docs:migrate:apply": "DRY_RUN=false node scripts/docs-migrate.mjs",
    "tests:orphan-scan": "node scripts/tests-orphan-scan.mjs",
    "routemap:gen": "node scripts/generate-routemap.mjs",
    "env:report": "node scripts/env-report.mjs"
  }
}
```

---

## ⚠️ GÜVENLİK KONTROL POİNTLERİ

### Önemli Güvenlik Dosyaları
- ✅ **SECURITY-AUDIT-REPORT.md**: Güvenlik raporları ARCHIVE edilecek (silinmeyecek)
- ✅ **ENV_IMPORT_FINAL_REPORT.md**: Environment bilgileri kontrol edildi
- ✅ **MIDDLEWARE_FIX_REPORT.md**: Middleware değişiklikleri takip altında

### Silme İçin DELETE_CANDIDATE Yok
- 🔒 **Güvenli Yaklaşım**: Hiçbir dosya kalıcı silinmeyecek
- 📁 **Arşiv Önceliği**: Tüm operasyon dosyaları tarihi arşive taşınacak
- 🔄 **Geri Dönüş**: git mv ile yapılan tüm işlemler kolayca geri alınabilir

---

## 📊 OPERASYON ETKİSİ TAHMİNİ

### Kırılma Riski
- **Düşük Risk** ✅: Kök README.md korunuyor
- **Sıfır Risk** ✅: Kod dosyalarına dokunulmuyor
- **BREAKING Yok** ✅: Tüm internal linkler update edilecek

### Performans Faydası
- **Kök Dizin Temizliği**: 25 dosya → 2 dosya (92% azalma)
- **Daha Temiz Git Status**: Daha az clutter
- **Doküman Organizasyonu**: Tarihi arşiv ile düzen

### Token/Boyut Tasarrufu
- **Kök MD Dosyaları**: ~260KB → ~14KB (94% azalma)
- **Test Orphans**: 2 dosya arşive taşınacak

---

## ✅ ONAY SONRASI EXECUTION PLANI

### Adım 1: Arşiv Klasörleri Oluştur
```bash
mkdir -p docs/archive/{2025-08-23,2025-08-24,2025-08-26,2025-08-27}
mkdir -p tests/archive/legacy
```

### Adım 2: Dosya Taşıma (git mv)
```bash
# Tarihe göre markdown arşivleme
git mv MOCK-PAYMENT-IMPLEMENTATION-COMPLETE.md docs/archive/2025-08-23/
git mv SECURITY-AUDIT-REPORT.md docs/archive/2025-08-24/
# ... diğer dosyalar

# Test arşivleme
git mv src/app/api/auth/__tests__/security.test.ts tests/archive/legacy/auth-security-old.test.ts
git mv src/tests/auth-integration.test.ts tests/archive/legacy/auth-integration-old.test.ts
```

### Adım 3: Script'leri Oluştur ve Test Et
- docs-check.mjs, docs-migrate.mjs, tests-orphan-scan.mjs
- CI workflow ekleme

### Adım 4: Link Güncellemeleri
- Tüm internal linkler otomatik update
- docs/DOC_INDEX.md güncelleme

---

## 🎯 KABUL KRİTERLERİ

- [ ] DRY RUN raporu oluşturuldu ✅
- [ ] Owner onayı alındı (BEKLİYOR)
- [ ] Arşiv yapısı oluşturuldu
- [ ] git mv ile güvenli taşıma yapıldı
- [ ] Otomasyon script'leri çalışıyor
- [ ] CI workflow eklendi
- [ ] Link'ler güncellendi ve npm run docs:check yeşil
- [ ] Geri dönüş planı test edildi

---

**⚠️ UYARI**: Bu bir DRY RUN raporu. Gerçek işlemler için `DRY_RUN=false` onayı gerekli.

**🔄 Geri Dönüş**: Tüm değişiklikler `git revert` veya `git mv` ile kolayca geri alınabilir.