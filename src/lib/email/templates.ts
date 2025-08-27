/**
 * EMAIL TEMPLATES - 7P Education
 * Turkish email templates for Supabase Auth
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export const EMAIL_TEMPLATES = {
  // Email verification template
  emailConfirmation: (confirmationUrl: string, userName?: string): EmailTemplate => ({
    subject: "7P Education - E-posta Adresinizi Doğrulayın",
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-posta Doğrulama</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2d3748;
        }
        .message {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 30px;
            color: #4a5568;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .alternative-link {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .alternative-link p {
            margin: 0 0 10px;
            font-size: 14px;
            color: #718096;
        }
        .alternative-link code {
            word-break: break-all;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            color: #2d3748;
            background-color: #edf2f7;
            padding: 2px 4px;
            border-radius: 4px;
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 0;
            font-size: 14px;
            color: #718096;
        }
        .footer .company-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .security-notice {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #744210;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .header, .content { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .cta-button { display: block; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 7P Education</h1>
            <p>E-posta Doğrulama</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${userName ? `Merhaba ${userName}!` : 'Merhaba!'}
            </div>
            
            <div class="message">
                7P Education'a hoş geldiniz! Hesabınızı oluşturduğunuz için teşekkür ederiz.
                <br><br>
                E-posta adresinizi doğrulamak ve hesabınızı aktif hale getirmek için aşağıdaki butona tıklayın:
            </div>
            
            <div style="text-align: center;">
                <a href="${confirmationUrl}" class="cta-button">
                    ✨ E-posta Adresimi Doğrula
                </a>
            </div>
            
            <div class="security-notice">
                <strong>🔒 Güvenlik Uyarısı:</strong> Bu bağlantı sadece 24 saat geçerlidir. 
                Hesabınızı korumak için doğrulama bağlantısını kimseyle paylaşmayın.
            </div>
            
            <div class="alternative-link">
                <p><strong>Butona tıklayamıyor musunuz?</strong></p>
                <p>Aşağıdaki bağlantıyı kopyalayıp tarayıcınızın adres çubuğuna yapıştırın:</p>
                <code>${confirmationUrl}</code>
            </div>
        </div>
        
        <div class="footer">
            <p>
                Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
                <br>
                Herhangi bir sorunuz varsa <a href="mailto:destek@7peducation.com" style="color: #667eea;">destek@7peducation.com</a> adresinden bize ulaşabilirsiniz.
            </p>
            
            <div class="company-info">
                <p><strong>7P Education</strong></p>
                <p>Kaliteli eğitim, erişilebilir öğrenim</p>
                <p><a href="https://7peducation.com" style="color: #667eea;">7peducation.com</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `,
    text: `
7P Education - E-posta Doğrulama

${userName ? `Merhaba ${userName}!` : 'Merhaba!'}

7P Education'a hoş geldiniz! E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:

${confirmationUrl}

Bu bağlantı 24 saat geçerlidir.

Herhangi bir sorunuz varsa destek@7peducation.com adresinden bize ulaşabilirsiniz.

7P Education
https://7peducation.com
    `
  }),

  // Password reset template
  passwordReset: (resetUrl: string, userName?: string): EmailTemplate => ({
    subject: "7P Education - Şifre Sıfırlama Talebi",
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Şifre Sıfırlama</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2d3748;
        }
        .message {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 30px;
            color: #4a5568;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .alternative-link {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .alternative-link p {
            margin: 0 0 10px;
            font-size: 14px;
            color: #718096;
        }
        .alternative-link code {
            word-break: break-all;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            color: #2d3748;
            background-color: #edf2f7;
            padding: 2px 4px;
            border-radius: 4px;
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 0;
            font-size: 14px;
            color: #718096;
        }
        .footer .company-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .security-notice {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #744210;
        }
        .warning-notice {
            background-color: #fed7d7;
            border: 1px solid #fc8181;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #9b2c2c;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .header, .content { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .cta-button { display: block; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 7P Education</h1>
            <p>Şifre Sıfırlama</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${userName ? `Merhaba ${userName}!` : 'Merhaba!'}
            </div>
            
            <div class="message">
                Hesabınız için şifre sıfırlama talebi aldık. 
                <br><br>
                Yeni bir şifre belirlemek için aşağıdaki butona tıklayın:
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="cta-button">
                    🔑 Şifremi Sıfırla
                </a>
            </div>
            
            <div class="warning-notice">
                <strong>⚠️ Bu talebi siz yapmadıysanız:</strong>
                <br>
                Bu e-postayı görmezden gelin. Şifreniz değiştirilmeyecektir.
                Güvenliğiniz için şifrenizi düzenli olarak güncelleyin.
            </div>
            
            <div class="security-notice">
                <strong>🔒 Güvenlik Uyarısı:</strong> Bu bağlantı sadece 1 saat geçerlidir. 
                Hesabınızı korumak için şifre sıfırlama bağlantısını kimseyle paylaşmayın.
            </div>
            
            <div class="alternative-link">
                <p><strong>Butona tıklayamıyor musunuz?</strong></p>
                <p>Aşağıdaki bağlantıyı kopyalayıp tarayıcınızın adres çubuğuna yapıştırın:</p>
                <code>${resetUrl}</code>
            </div>
        </div>
        
        <div class="footer">
            <p>
                Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
                <br>
                Herhangi bir sorunuz varsa <a href="mailto:destek@7peducation.com" style="color: #f5576c;">destek@7peducation.com</a> adresinden bize ulaşabilirsiniz.
            </p>
            
            <div class="company-info">
                <p><strong>7P Education</strong></p>
                <p>Kaliteli eğitim, erişilebilir öğrenim</p>
                <p><a href="https://7peducation.com" style="color: #f5576c;">7peducation.com</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `,
    text: `
7P Education - Şifre Sıfırlama

${userName ? `Merhaba ${userName}!` : 'Merhaba!'}

Hesabınız için şifre sıfırlama talebi aldık. Yeni bir şifre belirlemek için aşağıdaki bağlantıya tıklayın:

${resetUrl}

Bu bağlantı 1 saat geçerlidir.

Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelin. Şifreniz değiştirilmeyecektir.

Herhangi bir sorunuz varsa destek@7peducation.com adresinden bize ulaşabilirsiniz.

7P Education
https://7peducation.com
    `
  }),

  // Welcome email template
  welcome: (userName: string, userEmail: string): EmailTemplate => ({
    subject: "7P Education'a Hoş Geldiniz! 🎓",
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hoş Geldiniz</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 600;
        }
        .header p {
            margin: 15px 0 0;
            opacity: 0.9;
            font-size: 18px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 20px;
            margin-bottom: 25px;
            color: #2d3748;
            text-align: center;
        }
        .message {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 30px;
            color: #4a5568;
        }
        .features {
            margin: 30px 0;
        }
        .feature {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 15px;
            background-color: #f7fafc;
            border-radius: 8px;
        }
        .feature-icon {
            font-size: 24px;
            margin-right: 15px;
        }
        .feature-text {
            flex: 1;
        }
        .feature-title {
            font-weight: 600;
            color: #2d3748;
            margin: 0 0 5px;
        }
        .feature-desc {
            margin: 0;
            font-size: 14px;
            color: #718096;
        }
        .cta-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 10px;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .cta-button.secondary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 0;
            font-size: 14px;
            color: #718096;
        }
        .footer .company-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .header, .content { padding: 30px 20px; }
            .header h1 { font-size: 28px; }
            .cta-button { display: block; margin: 10px 0; }
            .feature { display: block; text-align: center; }
            .feature-icon { margin: 0 0 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Hoş Geldiniz!</h1>
            <p>7P Education ailesine katıldınız</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba ${userName}! 👋
            </div>
            
            <div class="message">
                7P Education'a katıldığınız için teşekkür ederiz! Artık kaliteli eğitim içeriklerimize 
                erişebilir ve öğrenme yolculuğunuza başlayabilirsiniz.
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">📚</div>
                    <div class="feature-text">
                        <div class="feature-title">Zengin İçerik Kütüphanesi</div>
                        <div class="feature-desc">Uzman eğitmenlerden çeşitli konularda kurslar</div>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <div class="feature-text">
                        <div class="feature-title">İlerleme Takibi</div>
                        <div class="feature-desc">Öğrenme sürecinizi takip edin ve başarılarınızı görün</div>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">💬</div>
                    <div class="feature-text">
                        <div class="feature-title">Topluluk Desteği</div>
                        <div class="feature-desc">Diğer öğrenciler ve eğitmenlerle etkileşim kurun</div>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">📜</div>
                    <div class="feature-text">
                        <div class="feature-title">Sertifika Programları</div>
                        <div class="feature-desc">Kurs tamamladığınızda sertifikanızı alın</div>
                    </div>
                </div>
            </div>
            
            <div class="cta-buttons">
                <a href="https://7peducation.com/courses" class="cta-button">
                    🚀 Kursları Keşfet
                </a>
                <a href="https://7peducation.com/profile" class="cta-button secondary">
                    👤 Profilimi Tamamla
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>
                Sorularınız mı var? <a href="mailto:destek@7peducation.com" style="color: #4facfe;">Destek ekibimiz</a> size yardımcı olmaktan mutluluk duyar!
                <br>
                <a href="https://7peducation.com/help" style="color: #4facfe;">Yardım Merkezi</a> | 
                <a href="https://7peducation.com/community" style="color: #4facfe;">Topluluk</a>
            </p>
            
            <div class="company-info">
                <p><strong>7P Education</strong></p>
                <p>Kaliteli eğitim, erişilebilir öğrenim</p>
                <p><a href="https://7peducation.com" style="color: #4facfe;">7peducation.com</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `,
    text: `
7P Education'a Hoş Geldiniz! 🎓

Merhaba ${userName}!

7P Education ailesine katıldığınız için teşekkür ederiz! Artık kaliteli eğitim içeriklerimize erişebilirsiniz.

Platforma erişmek için: https://7peducation.com

Neler yapabilirsiniz:
📚 Zengin İçerik Kütüphanesi - Uzman eğitmenlerden çeşitli konularda kurslar
📊 İlerleme Takibi - Öğrenme sürecinizi takip edin
💬 Topluluk Desteği - Diğer öğrencilerle etkileşim kurun
📜 Sertifika Programları - Kursları tamamladığınızda sertifika alın

Sorularınız için: destek@7peducation.com

7P Education
https://7peducation.com
    `
  })
};

// Helper function to get template by type
export function getEmailTemplate(
  type: 'emailConfirmation' | 'passwordReset' | 'welcome',
  params: { url?: string; userName?: string; userEmail?: string }
): EmailTemplate {
  switch (type) {
    case 'emailConfirmation':
      return EMAIL_TEMPLATES.emailConfirmation(params.url || '', params.userName);
    case 'passwordReset':
      return EMAIL_TEMPLATES.passwordReset(params.url || '', params.userName);
    case 'welcome':
      return EMAIL_TEMPLATES.welcome(params.userName || '', params.userEmail || '');
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
}