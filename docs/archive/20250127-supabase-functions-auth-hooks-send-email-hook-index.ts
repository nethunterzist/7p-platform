/**
 * SUPABASE AUTH EMAIL HOOK - 7P Education
 * Custom email sending with Turkish templates and audit logging
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmailHookPayload {
  user_id: string;
  email_address: string;
  token_hash: string;
  token_new: string;
  redirect_to?: string;
  email_action_type: 'signup' | 'recovery' | 'invite' | 'email_change_current' | 'email_change_new';
}

interface EmailTemplate {
  subject: string;
  html_content: string;
  text_content: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: EmailHookPayload = await req.json();
    console.log('Auth Email Hook triggered:', payload.email_action_type, payload.email_address);

    // Get client IP and user agent from headers
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Generate email content based on action type
    const emailTemplate = generateEmailTemplate(payload);
    
    // Send email via your preferred email service
    const emailResult = await sendEmail({
      to: payload.email_address,
      subject: emailTemplate.subject,
      html: emailTemplate.html_content,
      text: emailTemplate.text_content
    });

    // Log email event for audit
    await logEmailEvent(supabase, payload, clientIP, userAgent, emailResult.success);

    // Apply additional security checks
    if (payload.email_action_type === 'signup') {
      await performSignupValidation(supabase, payload, clientIP);
    } else if (payload.email_action_type === 'recovery') {
      await logPasswordResetAttempt(supabase, payload, clientIP, userAgent);
    }

    return new Response(
      JSON.stringify({ 
        success: emailResult.success,
        message: emailResult.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: emailResult.success ? 200 : 400,
      }
    );

  } catch (error) {
    console.error('Auth email hook error:', error);
    return new Response(
      JSON.stringify({ error: 'Email gönderimi başarısız' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateEmailTemplate(payload: EmailHookPayload): EmailTemplate {
  const baseUrl = Deno.env.get('SITE_URL') || 'https://7peducation.vercel.app';
  
  switch (payload.email_action_type) {
    case 'signup':
      const confirmUrl = `${baseUrl}/auth/confirm?token_hash=${payload.token_hash}&type=signup&next=${payload.redirect_to || '/dashboard'}`;
      return {
        subject: '7P Education - E-posta Doğrulama',
        html_content: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">7P Education</h1>
              <p style="color: #dbeafe; margin: 5px 0 0 0;">Eğitimde Mükemmellik</p>
            </div>
            
            <div style="padding: 30px; background-color: #f8fafc;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hoş Geldiniz! 🎉</h2>
              
              <p style="color: #4b5563; line-height: 1.6;">
                7P Education ailesine katıldığınız için teşekkür ederiz. 
                Hesabınızı aktifleştirmek ve öğrenme yolculuğunuza başlamak için 
                aşağıdaki butona tıklayın.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" 
                   style="background: #2563eb; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold;
                          display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                  E-posta Adresimi Doğrula
                </a>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  ⚠️ <strong>Önemli:</strong> Bu bağlantının geçerlilik süresi 24 saattir.
                </p>
              </div>
              
              <div style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p>Bu e-postayı siz talep etmediyseniz, güvenle silebilirsiniz.</p>
                <p>Sorunuz mu var? <a href="mailto:destek@7peducation.com">destek@7peducation.com</a></p>
              </div>
            </div>
          </div>
        `,
        text_content: `
7P Education - E-posta Doğrulama

Hoş Geldiniz!

7P Education ailesine katıldığınız için teşekkür ederiz.
Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:

${confirmUrl}

ÖNEMLI: Bu bağlantının geçerlilik süresi 24 saattir.

Bu e-postayı siz talep etmediyseniz, güvenle silebilirsiniz.

Saygılarımızla,
7P Education Ekibi
        `
      };

    case 'recovery':
      const resetUrl = `${baseUrl}/auth/reset-password?token_hash=${payload.token_hash}&type=recovery`;
      return {
        subject: '7P Education - Şifre Sıfırlama',
        html_content: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">7P Education</h1>
              <p style="color: #fecaca; margin: 5px 0 0 0;">Şifre Sıfırlama</p>
            </div>
            
            <div style="padding: 30px; background-color: #f8fafc;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Şifre Sıfırlama Talebi 🔐</h2>
              
              <p style="color: #4b5563; line-height: 1.6;">
                Hesabınız için şifre sıfırlama talebinde bulundunuz. 
                Yeni bir şifre belirlemek için aşağıdaki butona tıklayın.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #dc2626; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold;
                          display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                  Şifremi Sıfırla
                </a>
              </div>
              
              <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  🛡️ <strong>Güvenlik:</strong> Bu bağlantı 1 saat içinde geçersiz olacaktır.
                  Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelin.
                </p>
              </div>
              
              <div style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p>Güvenliğiniz için hiçbir zaman şifrenizi e-posta ile paylaşmayız.</p>
                <p>Şüpheli aktivite mi fark ettiniz? <a href="mailto:guvenlik@7peducation.com">guvenlik@7peducation.com</a></p>
              </div>
            </div>
          </div>
        `,
        text_content: `
7P Education - Şifre Sıfırlama

Şifre Sıfırlama Talebi

Hesabınız için şifre sıfırlama talebinde bulundunuz.
Yeni bir şifre belirlemek için aşağıdaki bağlantıya tıklayın:

${resetUrl}

GÜVENLİK: Bu bağlantı 1 saat içinde geçersiz olacaktır.
Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelin.

Saygılarımızla,
7P Education Ekibi
        `
      };

    case 'email_change_current':
      return {
        subject: '7P Education - E-posta Adresi Değişikliği Onayı',
        html_content: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
            <h2>E-posta Adresi Değişiklik Talebi</h2>
            <p>Hesabınızla ilişkili e-posta adresini değiştirmek için talepte bulundunuz.</p>
            <p>Bu değişikliği onaylamak için herhangi bir işlem yapmanız gerekmemektedir.</p>
            <p><strong>Önemli:</strong> Bu talebi siz yapmadıysanız, derhal destek ekibiyle iletişime geçin.</p>
          </div>
        `,
        text_content: `
E-posta Adresi Değişiklik Talebi

Hesabınızla ilişkili e-posta adresini değiştirmek için talepte bulundunuz.
Bu değişikliği onaylamak için herhangi bir işlem yapmanız gerekmemektedir.

ÖNEMLI: Bu talebi siz yapmadıysanız, derhal destek ekibiyle iletişime geçin.
        `
      };

    default:
      return {
        subject: '7P Education - Hesap Bildirimi',
        html_content: `<p>Hesabınızla ilgili bir işlem gerçekleştirildi.</p>`,
        text_content: `Hesabınızla ilgili bir işlem gerçekleştirildi.`
      };
  }
}

async function sendEmail(emailData: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate sending
    
    console.log(`Sending email to ${emailData.to} with subject: ${emailData.subject}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      message: 'E-posta başarıyla gönderildi'
    };
    
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      message: 'E-posta gönderimi başarısız'
    };
  }
}

async function logEmailEvent(
  supabase: any,
  payload: EmailHookPayload,
  clientIP: string,
  userAgent: string,
  success: boolean
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      event_type: `email_${payload.email_action_type}`,
      user_id: payload.user_id,
      ip_address: clientIP,
      user_agent: userAgent,
      success,
      details: {
        email: payload.email_address,
        action_type: payload.email_action_type,
        redirect_to: payload.redirect_to
      },
      risk_level: payload.email_action_type === 'recovery' ? 'medium' : 'low'
    });
  } catch (error) {
    console.error('Failed to log email event:', error);
  }
}

async function performSignupValidation(
  supabase: any,
  payload: EmailHookPayload,
  clientIP: string
): Promise<void> {
  try {
    // Check for suspicious signup patterns
    const { data: recentSignups } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('ip_address', clientIP)
      .eq('event_type', 'email_signup')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentSignups && recentSignups.length > 3) {
      // Log suspicious activity
      await supabase.from('audit_logs').insert({
        event_type: 'suspicious_signup_rate',
        user_id: payload.user_id,
        ip_address: clientIP,
        user_agent: 'auth-hook',
        success: false,
        details: {
          email: payload.email_address,
          recent_signups: recentSignups.length,
          reason: 'multiple_signups_same_ip'
        },
        risk_level: 'high'
      });
    }
  } catch (error) {
    console.error('Signup validation failed:', error);
  }
}

async function logPasswordResetAttempt(
  supabase: any,
  payload: EmailHookPayload,
  clientIP: string,
  userAgent: string
): Promise<void> {
  try {
    // Check for suspicious password reset patterns
    const { data: recentResets } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('event_type', 'email_recovery')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (recentResets && recentResets.length > 2) {
      // Log suspicious password reset activity
      await supabase.from('audit_logs').insert({
        event_type: 'suspicious_password_reset',
        user_id: payload.user_id,
        ip_address: clientIP,
        user_agent: userAgent,
        success: false,
        details: {
          email: payload.email_address,
          recent_resets: recentResets.length,
          reason: 'multiple_reset_attempts'
        },
        risk_level: 'high'
      });
    }
  } catch (error) {
    console.error('Password reset logging failed:', error);
  }
}