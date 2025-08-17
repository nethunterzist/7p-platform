# Troubleshooting FAQ - 7P Education Platform

## 🆘 Quick Help Guide

Bu rehber, 7P Education Platform'da karşılaşabileceğiniz yaygın sorunlara hızlı çözümler sunar. Sorunuzun yanıtını bulamıyorsanız, destek ekibimizle iletişime geçin.

**🚨 Acil Durum:** critical-support@7peducation.com  
**📧 Genel Destek:** destek@7peducation.com  
**💬 Topluluk Desteği:** [Forum](https://7peducation.com/discussions)

---

## 🔍 Hızlı Sorun Çözme

### ⚡ En Yaygın Sorunlar

| Sorun | Hızlı Çözüm | Detaylı Çözüm |
|-------|-------------|---------------|
| **Giriş yapamıyorum** | Şifre sıfırla linkini kullan | [👆 Giriş Sorunları](#-giriş-ve-hesap-sorunları) |
| **Video oynatmıyor** | Sayfayı yenile, farklı tarayıcı dene | [🎥 Video Sorunları](#-video-ve-medya-sorunları) |
| **Ödeme geçmiyor** | Kart bilgilerini kontrol et | [💳 Ödeme Sorunları](#-ödeme-ve-faturalandırma-sorunları) |
| **İlerleme kaydolmuyor** | Cookies aktif et, cache temizle | [📊 İlerleme Sorunları](#-kurs-ve-ilerleme-sorunları) |
| **Sayfa yüklenmiyor** | İnternet bağlantısını kontrol et | [🌐 Teknik Sorunlar](#-teknik-sorunlar) |

---

## 🔐 Giriş ve Hesap Sorunları

### ❌ Giriş Yapamıyorum

**Sorun:** Platform'a giriş yapamıyorum, hata alıyorum.

**Olası Sebepler:**
- Yanlış e-posta veya şifre
- Hesap geçici olarak kilitlenmiş
- 2FA kodu yanlış veya süresi dolmuş
- Tarayıcı cache sorunu

**Çözüm Adımları:**

1. **E-posta ve Şifre Kontrolü**
   ```
   ✅ E-posta adresini doğru yazdığınızdan emin olun
   ✅ Caps Lock kapalı olduğunu kontrol edin
   ✅ Şifrede özel karakterleri doğru girdiğinizi kontrol edin
   ```

2. **Şifre Sıfırlama**
   ```
   1. Login sayfasında "Şifremi Unuttum" linkine tıklayın
   2. E-posta adresinizi girin
   3. Gelen kutunuzu kontrol edin (spam klasörü dahil)
   4. E-postadaki linke tıklayarak yeni şifre oluşturun
   ```

3. **2FA Sorunları**
   ```
   ✅ Authenticator app'inizdeki kodu doğru girdiğinizden emin olun
   ✅ Zaman senkronizasyonu problemleri için app'i restart edin
   ✅ Backup kodlarınızı deneyin
   ✅ Cihaz saatinin doğru olduğunu kontrol edin
   ```

4. **Tarayıcı Temizleme**
   ```bash
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   Safari: Cmd+Option+E
   
   # Temizlenecekler:
   - Çerezler (Cookies)
   - Önbellek (Cache)
   - Yerel depolama (Local Storage)
   ```

**Hala Çözülmedi mi?**
- Farklı tarayıcı deneyin (Chrome, Firefox, Safari)
- Gizli/Private mode'da deneyin
- Mobil uygulamayı kullanmayı deneyin
- Destek ekibiyle iletişime geçin: auth-support@7peducation.com

### 🔒 Hesap Kilitlendi

**Sorun:** "Hesabınız geçici olarak kilitlenmiştir" mesajı alıyorum.

**Sebepler:**
- 5 başarısız giriş denemesi
- Şüpheli aktivite algılandı
- Güvenlik ihlali şüphesi

**Çözüm:**
```yaml
Otomatik Kilit Açılması:
  - 30 dakika sonra otomatik açılır
  - Bu sürede yeni deneme yapmayın

Manuel Kilit Açma:
  1. security@7peducation.com'a e-posta gönderin
  2. Konu: "Hesap Kilit Açma Talebi"
  3. İçerik: Ad, soyad, e-posta, son giriş tarihi
  4. Kimlik doğrulama bilgileri ekleyin

Önleme:
  - Güçlü şifre kullanın
  - 2FA'yı aktif edin
  - Güvenli ağlardan giriş yapın
```

### 📧 E-posta Doğrulama Sorunu

**Sorun:** E-posta doğrulama linki çalışmıyor.

**Çözüm Adımları:**
1. **Spam Klasörü Kontrolü** - E-posta spam'e düşmüş olabilir
2. **Link Süresi** - Doğrulama linki 24 saat geçerlidir
3. **Yeni Doğrulama E-postası** - Ayarlar > Hesap > "E-posta Doğrula" butonuna basın
4. **E-posta Sağlayıcısı** - Gmail, Outlook, Yahoo önerilir
5. **Güvenlik Duvarı** - Kurumsal e-posta ise IT ekibine danışın

---

## 🎥 Video ve Medya Sorunları

### ▶️ Video Oynatma Sorunları

**Sorun:** Dersler açılmıyor, video oynatmıyor.

**Yaygın Sebepler:**
- Yavaş internet bağlantısı
- Tarayıcı uyumsuzluğu
- Ad-blocker engelleme
- Flash Player gerekliliği (eski videolar)

**Çözüm Rehberi:**

1. **İnternet Bağlantısı Testi**
   ```
   ✅ Minimum 5 Mbps hız gerekli
   ✅ Speedtest.net ile hızınızı test edin
   ✅ WiFi yerine kablolu bağlantı deneyin
   ✅ Mobil data ile test edin
   ```

2. **Tarayıcı Optimizasyonu**
   ```
   Desteklenen Tarayıcılar:
   ✅ Chrome 90+ (Önerilen)
   ✅ Firefox 88+
   ✅ Safari 14+
   ✅ Edge 90+
   
   Tarayıcı Ayarları:
   - JavaScript aktif
   - Çerezler etkin
   - Pop-up blocker kapalı
   ```

3. **Ad-Blocker Ayarları**
   ```
   uBlock Origin:
   1. Extension simgesine tıklayın
   2. "Bu sitede kapalı" seçin
   3. Sayfayı yenileyin
   
   AdBlock Plus:
   1. Extension menüsüne gidin
   2. "7peducation.com'u beyaz listeye ekle"
   3. Sayfayı yenileyin
   ```

4. **Video Kalitesi Ayarlama**
   ```
   Yavaş bağlantı için:
   - Video kalitesini 720p'ye düşürün
   - Otomatik kalite seçin
   - Video'yu duraklatıp biraz bekleyin (buffering)
   ```

### 🔊 Ses Sorunları

**Sorun:** Video oynatılıyor ama ses gelmiyor.

**Kontrol Listesi:**
```yaml
Cihaz Kontrolü:
  ✅ Bilgisayar/telefon ses açık mı?
  ✅ Kulaklık bağlıysa düzgün takılı mı?
  ✅ Ses mixer'da uygulama sessize alınmış mı?

Tarayıcı Kontrolü:
  ✅ Video player'da ses aktif mi?
  ✅ Tarayıcı tab'ı sessize alınmış mı?
  ✅ Autoplay policy ses açma engelliyor mu?

Platform Kontrolü:
  ✅ Diğer videolarda ses var mı?
  ✅ Farklı derste test edin
  ✅ Mobil app'te test edin
```

### 📱 Mobil Video Sorunları

**Sorun:** Mobil cihazda videolar açılmıyor.

**Çözümler:**
```yaml
Android:
  1. Chrome tarayıcısı kullanın
  2. "Masaüstü sitesi" seçeneğini kapatın
  3. Uygulamayı App Store'dan indirin
  4. Depolama alanını kontrol edin (min 1GB)

iOS:
  1. Safari veya Chrome kullanın
  2. iOS 14+ gerekli
  3. App Store'dan uygulamayı indirin
  4. "İçerik ve Gizlilik" kısıtlamalarını kontrol edin

Ortak Çözümler:
  - WiFi bağlantısı kullanın
  - Cihazı yeniden başlatın
  - Uygulamayı güncellemeyi kontrol edin
  - Background app refresh aktif edin
```

---

## 💳 Ödeme ve Faturalandırma Sorunları

### 💸 Ödeme Geçmiyor

**Sorun:** Kart ile ödeme yapamıyorum, hata alıyorum.

**Yaygın Ödeme Hataları:**

1. **Kart Reddedildi**
   ```
   Sebepler:
   - Yetersiz bakiye
   - Kart limit aşımı
   - Yanlış kart bilgileri
   - Kart güvenlik bloğu
   
   Çözüm:
   ✅ Kart bilgilerini tekrar kontrol edin
   ✅ Banka ile iletişime geçin
   ✅ Farklı kart deneyin
   ✅ Banka aplikasyonundan online ödemeleri açın
   ```

2. **3D Secure Sorunları**
   ```
   Sorun: SMS kodu gelmiyor/yanlış
   
   Çözüm:
   1. Telefon numaranızın bankada güncel olduğunu kontrol edin
   2. SMS'in gecikmeli gelebileceğini unutmayın (5 dakika)
   3. Bankanızın mobile app'i üzerinden onaylayın
   4. Bankanızı arayarak sorun bildirin
   ```

3. **Uluslararası Kart Sorunları**
   ```
   Yurtdışı kartlar için:
   ✅ USD/EUR cinsinden ödeme deneyin
   ✅ Bankanıza Türkiye ödemelerini açtırın
   ✅ PayPal alternatifini kullanın
   ✅ Visa/Mastercard yerine American Express deneyin
   ```

### 🔄 Abonelik Sorunları

**Sorun:** Aboneliğim iptal oldu/yenilenmedi.

**Abonelik Durumu Kontrolü:**
```
1. Dashboard > Ayarlar > Abonelik Bilgileri
2. Durum: Aktif/İptal/Beklemeде
3. Sonraki ödeme tarihi
4. Ödeme metodu aktif mi?
```

**Yenileme Sorunları:**
```yaml
Otomatik Yenileme Başarısız:
  Sebepler:
    - Kartın süresi dolmuş
    - Kart iptal edilmiş
    - Yetersiz bakiye
    - Banka blokajı

  Çözüm:
    1. Ayarlar > Ödeme Metodu > Güncelle
    2. Yeni kart ekleyin
    3. Eksik ödemeyi manuel olarak yapın
    4. Customer Portal'dan yönetin

İptal ve Iade:
  - Son 30 gün içinde iade edilebilir
  - Kullanılmayan süre oranında iade
  - İade 5-10 iş günü sürer
  - Otomatik iptal: Son ödeme + 7 gün
```

### 🧾 Fatura ve Makbuz

**Sorun:** Fatura/makbuz alamıyorum.

**Fatura İndirme:**
```
1. Dashboard > Ayarlar > Ödeme Geçmişi
2. İlgili ödemenin yanındaki "Fatura" linkine tıklayın
3. PDF otomatik indirilecek

Fatura Bulamıyorsanız:
- E-posta kutunuzu kontrol edin
- Spam klasörüne bakın
- Billing@7peducation.com'a yazın
```

---

## 📚 Kurs ve İlerleme Sorunları

### 📊 İlerleme Kaydolmuyor

**Sorun:** Ders tamamladım ama ilerleme güncellenmedi.

**Olası Sebepler:**
- Cookies devre dışı
- JavaScript hatası
- Ağ bağlantısı sorunu
- Tarayıcı önbellek problemi

**Adım Adım Çözüm:**

1. **Tarayıcı Ayarları Kontrolü**
   ```
   Chrome'da:
   1. Ayarlar > Gizlilik ve güvenlik > Çerezler
   2. "Tüm çerezlere izin ver" seçili olmalı
   3. "7peducation.com" için çerezler aktif olmalı
   
   Firefox'ta:
   1. Ayarlar > Gizlilik ve Güvenlik
   2. "Standart" koruma seviyesi seçin
   3. "Çerezleri kabul et" işaretli olmalı
   ```

2. **JavaScript Kontrolü**
   ```
   1. F12 tuşuna basın (Developer Tools)
   2. Console tab'ına gidin
   3. Kırmızı hata mesajları var mı kontrol edin
   4. Varsa ekran görüntüsü alıp destek ekibine gönderin
   ```

3. **Manuel İlerleme Senkronizasyonu**
   ```
   1. Dersi tam olarak izleyin (%100)
   2. Video bitince 5 saniye bekleyin
   3. "Sonraki Ders" butonuna tıklayın
   4. Sayfa yenilemeyin, bekleyin
   ```

### 🎯 Quiz Sorunu

**Sorun:** Quiz cevapları kaydolmuyor veya geçemiyor.

**Quiz Sorun Çözme:**
```yaml
Cevap Kaydetme Sorunları:
  1. Her soruyu tek tek cevaplayın
  2. "Kaydet" butonuna her soruda basın
  3. Sayfayı yenilemeyin
  4. Zaman dolmadan önce "Gönder" yapın

Geçme Puanı Sorunları:
  - Minimum geçme puanı: %70
  - Her quiz için 3 deneme hakkınız var
  - Yanlış cevapları gözden geçirin
  - Ders materyallerini tekrar inceleyin

Teknik Sorunlar:
  ✅ JavaScript aktif olmalı
  ✅ Çerezler etkin olmalı  
  ✅ Stable internet bağlantısı
  ✅ Tek sekmede çalışın
```

### 📜 Sertifika Sorunu

**Sorun:** Kursu tamamladım ama sertifika alamıyorum.

**Sertifika Gereklilikleri:**
```yaml
Tamamlanma Kriterleri:
  ✅ Tüm videoları %100 izleme
  ✅ Tüm quiz'leri %70+ ile geçme
  ✅ Pratik ödevleri tamamlama
  ✅ Final sınavını geçme (%80+)

Sertifika Oluşturma Süreci:
  1. Kriter kontrolü (otomatik)
  2. Sertifika oluşturma (1-2 saat)
  3. E-posta bildirimi
  4. Dashboard'da görünür olma

Sorun Çözme:
  - Dashboard > Kurslarım > Sertifikalar
  - "Sertifika Talep Et" butonuna basın
  - 24 saat bekleyin
  - Hala gelmezse: certificates@7peducation.com
```

---

## 🌐 Teknik Sorunlar

### 🐌 Yavaş Yükleme

**Sorun:** Platform çok yavaş açılıyor.

**Performans Optimizasyonu:**

1. **İnternet Hızı Testi**
   ```bash
   # Minimum gereksinimler:
   Download: 5 Mbps
   Upload: 1 Mbps
   Ping: <100ms
   
   # Test siteleri:
   - speedtest.net
   - fast.com
   - testmy.net
   ```

2. **Tarayıcı Optimizasyonu**
   ```
   Chrome Performans:
   1. chrome://settings/performance
   2. "Memory Saver" modu açın
   3. Gereksiz tab'ları kapatın
   4. Extension'ları devre dışı bırakın
   
   Genel Tarayıcı:
   - Cache temizleyin
   - Güncellemeyi kontrol edin
   - Hardware acceleration açın
   ```

3. **Sistem Optimizasyonu**
   ```yaml
   Windows:
     - Disk Cleanup çalıştırın
     - Antivirus real-time scan'i geçici kapatın
     - Background app'leri kapatın
     - RAM kullanımını kontrol edin

   Mac:
     - Activity Monitor'da CPU kontrol edin
     - Disk space boşaltın (min 10GB)
     - Background app'leri kapatın
     - Safari cache temizleyin
   ```

### 📱 Mobil App Sorunları

**Sorun:** Mobil uygulama çalışmıyor.

**Yaygın Mobil Sorunlar:**

1. **App Crash/Kapanma**
   ```
   iOS Çözümü:
   1. App'i tamamen kapatın (double-tap, swipe up)
   2. iPhone'u restart edin
   3. App Store'dan güncelleme kontrol edin
   4. App'i sil-yükle yapın (veriler kaybolur)

   Android Çözümü:
   1. App'i force close yapın
   2. Cache temizleyin: Ayarlar > Apps > 7P Education > Storage > Clear Cache
   3. Play Store'dan güncelleme kontrol edin
   4. Cihazı restart edin
   ```

2. **Offline Video Sorunları**
   ```yaml
   İndirme Sorunları:
     - WiFi bağlantısı gerekli
     - Minimum 2GB boş alan
     - Background app refresh aktif
     - iOS 12+/Android 8+ gerekli

   Oynatma Sorunları:
     - App'i güncellemeyi kontrol edin
     - Cihazı restart edin
     - Video'yu yeniden indirin
     - Storage kontrolü yapın
   ```

### 🔌 Bağlantı Sorunları

**Sorun:** "Bağlantı hatası" alıyorum.

**Ağ Sorunları Tanılama:**
```bash
# Windows Command Prompt:
ping 7peducation.com
nslookup 7peducation.com
tracert 7peducation.com

# Mac/Linux Terminal:
ping 7peducation.com
nslookup 7peducation.com
traceroute 7peducation.com
```

**Çözüm Adımları:**
```yaml
DNS Sorunları:
  1. DNS ayarlarını değiştirin:
     - Birincil: 8.8.8.8
     - İkincil: 8.8.4.4
  2. DNS cache'i temizleyin
  3. Router'ı restart edin

Firewall/Proxy:
  - Kurumsal ağda IT ekibine danışın
  - Antivirus'ün web korumasını kapatın
  - VPN bağlantısını test edin
  - Hotspot ile test edin

ISP Sorunları:
  - Farklı ağ ile test edin
  - Mobil data ile deneyin
  - ISP'yi arayarak sorun bildirin
```

---

## 🤝 Topluluk ve Forum Sorunları

### 💬 Forum Erişim Sorunu

**Sorun:** Forum'a yazı yazamıyorum, okuyamıyorum.

**Forum Yetkileri:**
```yaml
Yetki Seviyeleri:
  Yeni Kullanıcı (0-10 puan):
    - Okuma: ✅
    - Yazma: ❌ (7 gün sonra)
    - Yanıtlama: ✅

  Aktif Kullanıcı (10+ puan):
    - Okuma: ✅
    - Yazma: ✅
    - Yanıtlama: ✅
    - Resim ekleme: ✅

  Güvenilir Kullanıcı (100+ puan):
    - Tüm yetkiler: ✅
    - Moderasyon önerileri: ✅
```

**Yaygın Forum Sorunları:**
```
Mesaj Gönderememe:
✅ Hesap aktif mi? (email doğrulama)
✅ Spam limiti aşılmış mı? (günde 10 mesaj)
✅ Banned/suspended değil misiniz?
✅ İçerik politikalarına uygun mu?

Forum Görünmeme:
- Browser cache temizleyin
- Çerezleri kontrol edin
- Gizli/Private mode deneyin
- Mobil app'i deneyin
```

### 🏆 Puan ve Badge Sorunları

**Sorun:** Aktivitelerim puana dönüşmüyor.

**Puan Sistemi:**
```yaml
Puan Kazanma Yolları:
  ✅ Ders tamamlama: +10 puan
  ✅ Quiz geçme: +5 puan
  ✅ Forum mesajı: +2 puan
  ✅ Yararlı yanıt: +5 puan
  ✅ Günlük giriş: +1 puan

Badge Gereksinimleri:
  🥉 İlk Adım: 5 ders tamamla
  🥈 Kararlı Öğrenci: 30 gün aktif
  🥇 Uzman: 3 kurs tamamla
  🏆 Mentor: 50 yardımcı mesaj

Güncelleme Süresi:
  - Anlık: Video, quiz puanları
  - 1 saat: Forum aktiviteleri  
  - 24 saat: Badge'ler
```

---

## ⚙️ Ayarlar ve Kişiselleştirme

### 🌙 Tema ve Görünüm

**Sorun:** Koyu tema açılmıyor, arayüz bozuk.

**Tema Ayarları:**
```
Tema Değiştirme:
1. Sağ üst > Profil > Ayarlar
2. Görünüm sekmesi
3. "Koyu Tema" seçin
4. "Kaydet" butonuna basın

Bozuk Görünüm:
- Ctrl+F5 ile hard refresh
- Tarayıcı zoom'u %100'e ayarlayın
- CSS cache temizleyin
- Farklı tarayıcı deneyin
```

### 🔔 Bildirim Ayarları

**Sorun:** Bildirimler gelmiyor/çok geliyor.

**Bildirim Kontrolü:**
```yaml
E-posta Bildirimleri:
  Konum: Ayarlar > Bildirimler > E-posta
  Seçenekler:
    - Yeni dersler: ✅/❌
    - Kurs güncellemeleri: ✅/❌
    - Forum yanıtları: ✅/❌
    - Pazarlama e-postaları: ✅/❌

Push Bildirimleri:
  Browser:
    1. Site ayarlarından bildirimlere izin verin
    2. Tarayıcı bildirimlerini açın
    3. Focus/DND modunu kontrol edin

  Mobil App:
    1. Telefon ayarları > Uygulamalar > 7P Education
    2. Bildirimler > Tümünü aç
    3. Banner, ses, badge ayarlarını kontrol edin
```

---

## 🆘 Acil Durum ve Kritik Sorunlar

### 🚨 Hesap Güvenliği İhlali

**Sorun:** Hesabıma izinsiz giriş olduğunu düşünüyorum.

**Acil Güvenlik Adımları:**
```yaml
Anında Yapılacaklar:
  1. Şifreyi hemen değiştirin
  2. Tüm cihazlardan çıkış yapın
  3. 2FA'yı aktifleştirin
  4. Giriş geçmişini kontrol edin

Güvenlik Kontrolü:
  1. Ayarlar > Güvenlik > Aktif Oturumlar
  2. Tanımadığınız cihazları çıkartın
  3. Şüpheli aktiviteyi raporlayın
  4. security@7peducation.com'a bildirin

Önleme:
  - Güçlü, benzersiz şifre
  - 2FA aktifleştirme
  - Güvenli ağ kullanımı
  - Düzenli şifre değişimi
```

### 💳 Yanlış Ödeme/İade

**Sorun:** Yanlış tutar çekildi veya iade gerekiyor.

**Acil Ödeme Destek:**
```
📞 Acil Hat: +90 XXX XXX XXXX
⏰ Çalışma Saatleri: 09:00-18:00
📧 E-posta: billing-urgent@7peducation.com

Gerekli Bilgiler:
✅ Transaction ID
✅ Çekim tarihi ve tutarı
✅ Kart son 4 hanesi
✅ Hesap e-posta adresi
✅ Sorun açıklaması

İade Süreci:
- Talep: 0-1 gün
- İşlem: 3-5 iş günü
- Banka: 7-14 gün
- Toplam: Max 21 gün
```

### 🎓 Sınav/Sertifika Acil

**Sorun:** Sınav tarihi yaklaşıyor, teknik sorun var.

**Acil Sınav Desteği:**
```yaml
Sınav Öncesi Kontroller:
  ✅ İnternet hızı test (min 10 Mbps)
  ✅ Tarayıcı güncel ve temiz
  ✅ Backup internet hazır (mobil)
  ✅ Kimlik belgesi hazır
  ✅ Sessiz ortam

Sınav Sırasında Sorun:
  1. Panik yapmayın, zaman durdurulur
  2. F5 ile sayfayı yenileyin
  3. Farklı tarayıcı deneyin
  4. Mobil app'e geçin
  5. Exam support chat'i kullanın

Acil İletişim:
  📞 Sınav Destek: +90 XXX XXX XXXX
  💬 Live Chat: exam-support.7peducation.com
  📧 E-posta: exams@7peducation.com
```

---

## 📞 Destek Kanalları

### 🎯 Hangi Kanalı Kullanmalı?

| Sorun Türü | Kanal | Yanıt Süresi |
|-------------|-------|--------------|
| **Acil (Sınav, Ödeme)** | 📞 Telefon | 5 dakika |
| **Teknik Sorun** | 💬 Live Chat | 15 dakika |
| **Genel Sorular** | 📧 E-posta | 4 saat |
| **Topluluk Yardımı** | 💬 Forum | 1 saat |
| **Özellik İsteği** | 📝 Feedback Form | 24 saat |

### 📧 E-posta Destek Adresleri

```yaml
Genel Destek:
  📧 destek@7peducation.com
  🎯 Kullanım: Genel sorular, hesap sorunları

Teknik Destek:
  📧 tech-support@7peducation.com
  🎯 Kullanım: Platform hataları, performans sorunları

Ödeme Desteği:
  📧 billing@7peducation.com
  🎯 Kullanım: Faturalandırma, iade, ödeme sorunları

Güvenlik:
  📧 security@7peducation.com
  🎯 Kullanım: Hesap güvenliği, şüpheli aktivite

Sınav Desteği:
  📧 exams@7peducation.com
  🎯 Kullanım: Sınav sorunları, sertifika

Eğitim İçeriği:
  📧 content@7peducation.com
  🎯 Kullanım: Kurs içeriği, eğitmen soruları
```

### 💬 Canlı Destek

**Live Chat Kullanımı:**
```
1. Sağ alt köşedeki chat simgesine tıklayın
2. Sorununuzu kısa ve açık yazın
3. Destek temsilcisi 15 dakika içinde yanıtlar
4. Ekran görüntüsü paylaşabilirsiniz

Çalışma Saatleri:
- Hafta içi: 09:00-22:00
- Hafta sonu: 10:00-18:00
- Tatil günleri: Sınırlı destek

Diller:
- Türkçe (7/24)
- İngilizce (İş saatleri)
```

---

## 📊 Sorun Raporlama

### 🐛 Bug Raporu Nasıl Yazılır?

**Etkili Bug Raporu:**
```markdown
## Sorun Başlığı
[Kısa ve açıklayıcı başlık]

## Sorun Açıklaması
[Ne olduğunu detaylıca anlatın]

## Adım Adım Tekrar Etme
1. [İlk adım]
2. [İkinci adım]  
3. [Sorunun oluştuğu adım]

## Beklenen Sonuç
[Ne olmasını bekliyordunuz?]

## Gerçek Sonuç
[Gerçekte ne oldu?]

## Teknik Bilgiler
- Tarayıcı: Chrome 96.0.4664.110
- İşletim Sistemi: Windows 11
- Ekran Çözünürlüğü: 1920x1080
- İnternet Hızı: 50 Mbps

## Ek Bilgiler
- Ekran görüntüsü: [Dosya ekleme]
- Hata kodu: [Varsa]
- Console log: [F12 > Console'dan alın]
```

### 📸 Ekran Görüntüsü Alma

**Windows:**
```
🖨️ Print Screen: Tam ekran
🎯 Alt + Print Screen: Aktif pencere
✂️ Windows + Shift + S: Seçili alan
📱 Windows + G: Game bar (video kayıt)
```

**Mac:**
```
🖨️ Cmd + Shift + 3: Tam ekran
🎯 Cmd + Shift + 4: Seçili alan
📱 Cmd + Shift + 5: Ekran kaydı
🎥 QuickTime: Video kayıt
```

**Browser F12 Console:**
```
1. F12 tuşuna basın
2. Console sekmesine gidin
3. Hata mesajlarını kopyalayın
4. Sağ tık > Save as... ile kaydedin
```

---

## 📈 Sürekli İyileştirme

### 🔄 Geri Bildirim

**Deneyiminizi Paylaşın:**
```
Olumlu Geri Bildirim:
📧 feedback@7peducation.com
🌟 App Store/Play Store'da değerlendirme
💬 Sosyal medyada paylaşım

İyileştirme Önerileri:
📝 Feature Request Form
💡 Community Forum > Öneriler
📧 product@7peducation.com

Platform Değerlendirmesi:
⭐ 1-5 yıldız puanlama
📝 Detaylı yorum yazma
🎯 Hangi alanların geliştirilmesi gerektiği
```

### 📚 Yardım Kaynakları

**Self-Service Kaynaklar:**
- 📖 **Kullanıcı Kılavuzu:** Kapsamlı platform rehberi
- 🎥 **Video Tutorialları:** Adım adım görsel anlatım
- 💬 **Topluluk Forumu:** Kullanıcı deneyimleri
- 📋 **FAQ:** Bu dokümanda yer alan çözümler
- 🔍 **Arama:** Platform içi yardım arama

**Eğitim Materyalleri:**
- 🎓 **Platform Kullanımı Kursu:** Ücretsiz temel eğitim
- 📺 **Webinar'lar:** Canlı soru-cevap oturumları  
- 📰 **Blog:** İpuçları ve güncellemeler
- 📱 **Mobile App Guide:** Mobil kullanım rehberi

---

## ✅ Sorun Çözme Kontrol Listesi

### 🔧 Genel Sorun Çözme Adımları

**Her Sorun İçin İlk 5 Adım:**
```
1. ✅ Sayfayı yenileyin (Ctrl+F5)
2. ✅ Farklı tarayıcı deneyin
3. ✅ İnternet bağlantısını kontrol edin
4. ✅ Cache ve cookies temizleyin
5. ✅ Hesabınızdan çıkış yapıp tekrar girin
```

**Sorun Devam Ediyorsa:**
```
6. ✅ Gizli/Incognito mode deneyin
7. ✅ Ad-blocker'ı devre dışı bırakın
8. ✅ JavaScript aktif olduğunu kontrol edin
9. ✅ Firewall/antivirus geçici kapatın
10. ✅ Mobil app veya farklı cihaz deneyin
```

**Yardım İsterken Hazırlayın:**
```
📋 Temel Bilgiler:
- Hesap e-posta adresi
- Sorunun başladığı tarih/saat
- Hangi sayfada/özellikte sorun var
- Hata mesajı (varsa)

🖥️ Teknik Bilgiler:
- Tarayıcı ve versiyon
- İşletim sistemi
- İnternet hızı
- Ekran görüntüsü

📞 İletişim Tercihi:
- E-posta: Detaylı araştırma
- Live Chat: Hızlı çözüm
- Telefon: Acil durumlar
- Forum: Topluluk desteği
```

---

**🎯 Hızlı Çözüm:** Sorunun %80'i yukarıdaki temel adımlarla çözülür. Hala çözülmezse, bu dokümandaki spesifik bölümleri kontrol edin veya destek ekibimizle iletişime geçin.

**📞 7/24 Destek:** Acil durumlar için telefon desteğimiz her zaman hizmetinizde. Premium üyelerimiz öncelikli destek alır.

---

**📅 Son Güncelleme:** August 2025  
**📄 Versiyon:** 1.0  
**🔄 Güncelleme Sıklığı:** Aylık

*Bu dokümanda sorun çözümlerinizi bulamadıysanız, lütfen destek ekibimizle iletişime geçin. Geri bildirimleriniz sayesinde bu rehberi sürekli geliştiriyoruz.*