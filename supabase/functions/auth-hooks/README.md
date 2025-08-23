# Supabase Auth Hooks - 7P Education

Bu klasör, 7P Education platformu için gelişmiş güvenlik ve denetleme özellikleri sağlayan Supabase Auth Hook'larını içerir.

## Özellikler

### 🔐 Gelişmiş Güvenlik
- **Şifre Doğrulama**: Türkçe hata mesajları ile kapsamlı şifre güvenlik politikaları
- **MFA Doğrulama**: TOTP ve SMS destekli çok faktörlü kimlik doğrulama
- **E-posta Güvenliği**: Özel Türkçe e-posta şablonları ve güvenlik denetimleri
- **Şüpheli Aktivite Tespiti**: Otomatik risk değerlendirmesi ve denetim kaydı

### 📊 Denetim ve İzleme
- **Kapsamlı Loglama**: Tüm kimlik doğrulama olayları için detaylı audit log
- **Performans İzleme**: Hook performansı ve başarı oranları
- **Güvenlik Metrikleri**: Şüpheli aktivite ve risk analizi
- **Rate Limiting**: IP ve kullanıcı bazlı hız sınırlama

## Hook Türleri

### 1. Send Email Hook (`send-email-hook`)
**Amaç**: Özel e-posta şablonları ve güvenlik denetimleri

**Özellikler**:
- Türkçe e-posta şablonları (kayıt, şifre sıfırlama, e-posta değişikliği)
- Şüpheli kayıt aktivitesi tespiti
- Çoklu şifre sıfırlama girişimi izleme
- E-posta gönderim audit kaydı

**Tetikleme**: Supabase auth e-posta olayları

### 2. Password Verification Hook (`password-verification-hook`)
**Amaç**: Gelişmiş şifre güvenlik politikaları

**Özellikler**:
- 8+ karakter, büyük/küçük harf, rakam, özel karakter zorunluluğu
- Yaygın şifre kontrolü (İngilizce + Türkçe)
- Kişisel bilgi kullanım kontrolü
- Şifre geçmişi kontrolü (son 5 şifre)
- Entropi ve karmaşıklık scoring

**Tetikleme**: Şifre oluşturma/değiştirme işlemleri

### 3. MFA Verification Hook (`mfa-verification-hook`)
**Amaç**: Çok faktörlü kimlik doğrulama

**Özellikler**:
- TOTP (Authenticator app) desteği
- SMS kod doğrulama
- Rate limiting (3 deneme/dakika)
- Otomatik hesap kilitleme (15 dakika)
- MFA başarısızlık takibi

**Tetikleme**: MFA kod doğrulama istekleri

## Kurulum

### 1. Supabase Edge Functions Deploy
```bash
# Auth hooks klasörüne git
cd supabase/functions/auth-hooks

# Her hook'u ayrı ayrı deploy et
supabase functions deploy send-email-hook
supabase functions deploy password-verification-hook
supabase functions deploy mfa-verification-hook

# Database yapılarını oluştur
supabase db push --file deploy-hooks.sql
```

### 2. Supabase Dashboard Konfigürasyonu

**Authentication > Hooks**'a git ve aşağıdaki URL'leri ekle:

```
Send Email Hook:
URL: https://[project-ref].supabase.co/functions/v1/auth-hooks/send-email-hook
Events: signup, recovery, email_change

Password Verification Hook:
URL: https://[project-ref].supabase.co/functions/v1/auth-hooks/password-verification-hook
Events: password_verification

MFA Verification Hook:
URL: https://[project-ref].supabase.co/functions/v1/auth-hooks/mfa-verification-hook
Events: mfa_verification
```

### 3. Environment Variables

Aşağıdaki ortam değişkenlerini ayarlayın:

```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site Configuration
SITE_URL=https://yourdomain.com

# Email Service (İsteğe bağlı)
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

### 4. RLS Policies ve Permissions

Database migration otomatik olarak aşağıdakileri oluşturur:
- SMS verifications tablosu
- RLS policies
- Audit log indexes
- Performance monitoring views
- Cleanup functions

## Kullanım

### Frontend Entegrasyonu

```typescript
// Email verification hook otomatik çalışır
const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Password validation hook otomatik çalışır
const { error } = await supabase.auth.updateUser({
  password: 'NewSecurePass456!'
});

// MFA verification
const { error } = await supabase.auth.mfa.verify({
  factorId: 'factor-id',
  challengeId: 'challenge-id',
  code: '123456'
});
```

### Audit Log Sorgulama

```sql
-- Son 24 saatteki auth olayları
SELECT * FROM audit_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
AND event_type LIKE '%auth%'
ORDER BY timestamp DESC;

-- Hook performance metrikleri
SELECT * FROM auth_hook_performance 
WHERE event_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY event_date DESC;
```

## İzleme ve Troubleshooting

### 1. Hook Logs
```bash
# Hook loglarını izle
supabase functions logs send-email-hook --follow
supabase functions logs password-verification-hook --follow
supabase functions logs mfa-verification-hook --follow
```

### 2. Performance Metrikleri
- Dashboard: Authentication > Hooks
- Database: `auth_hook_performance` view
- Audit logs: `audit_logs` tablosu

### 3. Yaygın Sorunlar

**Hook çalışmıyor**:
- Environment variables kontrol edin
- Hook URL'lerinin doğru olduğunu kontrol edin
- Service role permissions kontrol edin

**E-posta gönderilmiyor**:
- SMTP konfigürasyonunu kontrol edin
- Email service provider limitleri kontrol edin
- Audit logs'ta hata mesajlarını kontrol edin

**MFA doğrulama başarısız**:
- TOTP secret'ların doğru olduğunu kontrol edin
- SMS verification tablosunu kontrol edin
- Rate limiting durumunu kontrol edin

## Güvenlik Hususları

### 1. Rate Limiting
- Password validation: Sınırsız (hook seviyesinde)
- Email sending: 3 deneme/saat (application seviyesinde)
- MFA verification: 3 deneme/dakika, 15 dakika kilit

### 2. Data Protection
- Audit logs kişisel verileri hash'ler
- SMS kodları 5 dakika sonra expire olur
- Password hash'leri güvenli şekilde saklanır

### 3. Monitoring
- Şüpheli aktivite otomatik tespit edilir
- Failed login attempts track edilir
- IP bazlı rate limiting uygulanır

## Bakım

### 1. Database Cleanup
Otomatik cleanup functions mevcuttur:
- SMS verifications: 1 saat sonra
- Expired email verifications: 7 gün sonra
- Old audit logs: Retention policy'e göre

### 2. Monitoring Alerts
Aşağıdaki durumlar için alert kurulması önerilir:
- Hook failure rate > %5
- Unusual authentication activity
- Rate limit violations
- Database storage usage

## Test

### 1. Unit Tests
```bash
# Hook functionality test
deno test auth-hooks/tests/

# Integration tests
npm run test:auth-hooks
```

### 2. Manual Testing
- Registration flow test
- Password change test
- MFA setup and verification test
- Email sending test

## Lisans

Bu hook'lar 7P Education projesi kapsamında MIT lisansı altında geliştirilmiştir.