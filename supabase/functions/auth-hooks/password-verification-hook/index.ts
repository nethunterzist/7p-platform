/**
 * SUPABASE AUTH PASSWORD VERIFICATION HOOK - 7P Education
 * Custom password validation with enterprise security policies
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PasswordVerificationPayload {
  user_id?: string;
  email: string;
  password: string;
  user_metadata?: Record<string, any>;
}

interface PasswordValidationResult {
  valid: boolean;
  message: string;
  score: number;
  requirements_met: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    special_chars: boolean;
    not_common: boolean;
    not_personal: boolean;
    not_reused: boolean;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Production password policy configuration
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  historyLimit: 5,
  maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
};

const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  numbers: /\d/,
  specialChars: /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/,
  sequential: /(.)\\1{2,}/, // 3 or more repeated characters
  common: [
    'password', '123456', 'password123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'qwerty', 'abc123',
    'password1', '123123', 'admin123', 'root', 'toor',
    'pass', 'test', 'guest', 'info', 'adm', 'administrator'
  ]
};

const TURKISH_COMMON_PASSWORDS = [
  'sifre', 'parola', 'şifre', '123456', 'password',
  'admin', 'asdf', 'qwerty', '111111', '000000',
  '123123', 'asd123', 'sifre123', 'parola123',
  'istanbul', 'ankara', 'izmir', 'turkey', 'turkiye'
];

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

    const payload: PasswordVerificationPayload = await req.json();
    console.log('Password verification hook triggered for:', payload.email);

    // Get client information
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Perform comprehensive password validation
    const validationResult = await validatePassword(
      payload.password,
      payload.email,
      payload.user_metadata,
      payload.user_id ? supabase : null,
      payload.user_id
    );

    // Log password validation attempt
    await logPasswordValidation(
      supabase,
      payload,
      clientIP,
      userAgent,
      validationResult
    );

    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({
          error: 'password_validation_failed',
          message: validationResult.message,
          details: {
            score: validationResult.score,
            requirements: validationResult.requirements_met
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Password is valid
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Şifre güvenlik gereksinimlerini karşılıyor',
        score: validationResult.score
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Password verification hook error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: 'Şifre doğrulama sırasında hata oluştu' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function validatePassword(
  password: string,
  email: string,
  userMetadata?: Record<string, any>,
  supabase?: any,
  userId?: string
): Promise<PasswordValidationResult> {
  const result: PasswordValidationResult = {
    valid: false,
    message: '',
    score: 0,
    requirements_met: {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      special_chars: false,
      not_common: true,
      not_personal: true,
      not_reused: true
    }
  };

  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= PASSWORD_POLICY.minLength) {
    result.requirements_met.length = true;
    score += 20;
  } else {
    errors.push(`Şifre en az ${PASSWORD_POLICY.minLength} karakter olmalıdır.`);
  }

  // Character composition checks
  if (PASSWORD_PATTERNS.uppercase.test(password)) {
    result.requirements_met.uppercase = true;
    score += 15;
  } else if (PASSWORD_POLICY.requireUppercase) {
    errors.push('Şifre en az bir büyük harf içermelidir.');
  }

  if (PASSWORD_PATTERNS.lowercase.test(password)) {
    result.requirements_met.lowercase = true;
    score += 15;
  } else if (PASSWORD_POLICY.requireLowercase) {
    errors.push('Şifre en az bir küçük harf içermelidir.');
  }

  if (PASSWORD_PATTERNS.numbers.test(password)) {
    result.requirements_met.numbers = true;
    score += 15;
  } else if (PASSWORD_POLICY.requireNumbers) {
    errors.push('Şifre en az bir rakam içermelidir.');
  }

  if (PASSWORD_PATTERNS.specialChars.test(password)) {
    result.requirements_met.special_chars = true;
    score += 15;
  } else if (PASSWORD_POLICY.requireSpecialChars) {
    errors.push('Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)');
  }

  // Advanced pattern checks
  if (PASSWORD_PATTERNS.sequential.test(password)) {
    errors.push('Şifre art arda tekrar eden karakterler içeremez (örn: aaa, 111)');
    score -= 10;
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  const isCommon = [...PASSWORD_PATTERNS.common, ...TURKISH_COMMON_PASSWORDS]
    .some(common => lowerPassword.includes(common.toLowerCase()));

  if (isCommon) {
    result.requirements_met.not_common = false;
    errors.push('Bu şifre çok yaygın kullanılıyor. Daha özgun bir şifre seçin.');
    score -= 20;
  }

  // Check personal information usage
  if (containsPersonalInfo(password, email, userMetadata)) {
    result.requirements_met.not_personal = false;
    errors.push('Şifre kişisel bilgilerinizi içeremez.');
    score -= 15;
  }

  // Check dictionary words
  if (isDictionaryWord(password)) {
    errors.push('Şifre basit kelime içeriyor. Daha karmaşık bir şifre önerilir.');
    score -= 5;
  }

  // Check password history (if user exists)
  if (supabase && userId) {
    const isReused = await checkPasswordHistory(supabase, userId, password);
    if (isReused) {
      result.requirements_met.not_reused = false;
      errors.push('Bu şifre son 5 şifrenizden biri. Lütfen farklı bir şifre seçin.');
      score -= 25;
    }
  }

  // Entropy and complexity bonus
  score += calculateEntropyBonus(password);

  // Finalize validation
  result.score = Math.max(0, Math.min(100, score));
  result.valid = errors.length === 0 && result.score >= 60;

  if (!result.valid) {
    result.message = errors.length > 0 ? errors[0] : 'Şifre güvenlik gereksinimlerini karşılamıyor.';
  }

  return result;
}

function containsPersonalInfo(
  password: string,
  email: string,
  userMetadata?: Record<string, any>
): boolean {
  const lowerPassword = password.toLowerCase();

  // Check email username part
  const emailPart = email.split('@')[0].toLowerCase();
  if (emailPart.length >= 3 && lowerPassword.includes(emailPart)) {
    return true;
  }

  // Check user metadata (name, etc.)
  if (userMetadata) {
    const checkFields = ['name', 'full_name', 'first_name', 'last_name', 'username'];
    
    for (const field of checkFields) {
      const value = userMetadata[field];
      if (typeof value === 'string' && value.length >= 3) {
        const nameParts = value.toLowerCase().split(/\\s+/);
        if (nameParts.some(part => part.length >= 3 && lowerPassword.includes(part))) {
          return true;
        }
      }
    }
  }

  return false;
}

function isDictionaryWord(password: string): boolean {
  const commonWords = [
    'password', 'admin', 'user', 'login', 'welcome', 'hello', 'world',
    'test', 'demo', 'example', 'sample', 'default', 'guest',
    // Turkish words
    'merhaba', 'dünya', 'karşılama', 'test', 'örnek', 'varsayılan'
  ];

  const lowerPassword = password.toLowerCase();
  return commonWords.some(word => lowerPassword.includes(word));
}

function calculateEntropyBonus(password: string): number {
  const uniqueChars = new Set(password).size;
  const lengthBonus = Math.min(20, (password.length - 8) * 2);
  const diversityBonus = Math.min(15, (uniqueChars - 4) * 2);

  return lengthBonus + diversityBonus;
}

async function checkPasswordHistory(
  supabase: any,
  userId: string,
  password: string
): Promise<boolean> {
  try {
    const { data: history, error } = await supabase
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(PASSWORD_POLICY.historyLimit);

    if (error || !history || history.length === 0) {
      return false;
    }

    // In a real implementation, you would compare hashes
    // This is a simplified version
    for (const entry of history) {
      // You would use bcrypt.compare here with entry.password_hash
      // For now, we'll skip this check in the hook
    }

    return false;
  } catch (error) {
    console.error('Password history check failed:', error);
    return false; // Fail open
  }
}

async function logPasswordValidation(
  supabase: any,
  payload: PasswordVerificationPayload,
  clientIP: string,
  userAgent: string,
  validationResult: PasswordValidationResult
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      event_type: 'password_validation',
      user_id: payload.user_id || null,
      ip_address: clientIP,
      user_agent: userAgent,
      success: validationResult.valid,
      details: {
        email: payload.email,
        score: validationResult.score,
        requirements_met: validationResult.requirements_met,
        validation_source: 'auth_hook'
      },
      risk_level: validationResult.valid ? 'low' : 'medium'
    });
  } catch (error) {
    console.error('Failed to log password validation:', error);
  }
}