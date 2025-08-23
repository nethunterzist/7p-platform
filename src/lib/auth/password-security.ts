/**
 * PASSWORD SECURITY SYSTEM - 7P Education
 * Advanced password validation, history tracking, and policy enforcement
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@/utils/supabase/server';
import { PRODUCTION_AUTH_CONFIG, PASSWORD_PATTERNS, AUTH_MESSAGES_TR } from './production-config';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  strength: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong';
  estimatedCrackTime: string;
}

export interface PasswordHistoryEntry {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: string;
  isActive: boolean;
}

export interface PasswordPolicy {
  enforced: boolean;
  lastChanged?: string;
  mustChangeBy?: string;
  historyCount: number;
}

export class PasswordSecurityService {
  private static readonly SALT_ROUNDS = 12;
  
  /**
   * Validate password strength and policy compliance
   */
  static async validatePassword(
    password: string, 
    userId?: string, 
    userInfo?: { email?: string; name?: string }
  ): Promise<PasswordValidationResult> {
    const result: PasswordValidationResult = {
      isValid: false,
      score: 0,
      errors: [],
      warnings: [],
      strength: 'very_weak',
      estimatedCrackTime: '< 1 second'
    };

    // Length check
    if (password.length < PRODUCTION_AUTH_CONFIG.password.minLength) {
      result.errors.push(`Şifre en az ${PRODUCTION_AUTH_CONFIG.password.minLength} karakter olmalıdır.`);
    } else {
      result.score += 20;
    }

    // Character composition checks
    const checks = {
      uppercase: PASSWORD_PATTERNS.uppercase.test(password),
      lowercase: PASSWORD_PATTERNS.lowercase.test(password),
      numbers: PASSWORD_PATTERNS.numbers.test(password),
      specialChars: PASSWORD_PATTERNS.specialChars.test(password)
    };

    if (!checks.uppercase && PRODUCTION_AUTH_CONFIG.password.requireUppercase) {
      result.errors.push('Şifre en az bir büyük harf içermelidir.');
    } else if (checks.uppercase) {
      result.score += 15;
    }

    if (!checks.lowercase && PRODUCTION_AUTH_CONFIG.password.requireLowercase) {
      result.errors.push('Şifre en az bir küçük harf içermelidir.');
    } else if (checks.lowercase) {
      result.score += 15;
    }

    if (!checks.numbers && PRODUCTION_AUTH_CONFIG.password.requireNumbers) {
      result.errors.push('Şifre en az bir rakam içermelidir.');
    } else if (checks.numbers) {
      result.score += 15;
    }

    if (!checks.specialChars && PRODUCTION_AUTH_CONFIG.password.requireSpecialChars) {
      result.errors.push('Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)');
    } else if (checks.specialChars) {
      result.score += 15;
    }

    // Advanced pattern checks
    if (PASSWORD_PATTERNS.sequential.test(password)) {
      result.errors.push('Şifre art arda tekrar eden karakterler içeremez (örn: aaa, 111)');
      result.score -= 10;
    }

    // Check against common passwords
    if (this.isCommonPassword(password)) {
      result.errors.push('Bu şifre çok yaygın kullanılıyor. Daha özgun bir şifre seçin.');
      result.score -= 20;
    }

    // Check personal information usage
    if (userInfo && this.containsPersonalInfo(password, userInfo)) {
      result.errors.push('Şifre kişisel bilgilerinizi içeremez.');
      result.score -= 15;
    }

    // Entropy and complexity bonus
    result.score += this.calculateEntropyBonus(password);

    // Dictionary word check (simple)
    if (this.isDictionaryWord(password)) {
      result.warnings.push('Şifre sözlük kelimesi içeriyor. Daha karmaşık bir şifre önerilir.');
      result.score -= 5;
    }

    // Password history check
    if (userId) {
      const isReused = await this.checkPasswordHistory(userId, password);
      if (isReused) {
        result.errors.push(AUTH_MESSAGES_TR.PASSWORD_REUSED);
        result.score -= 25;
      }
    }

    // Finalize score and strength
    result.score = Math.max(0, Math.min(100, result.score));
    result.strength = this.calculateStrength(result.score);
    result.estimatedCrackTime = this.estimateCrackTime(password, result.score);
    result.isValid = result.errors.length === 0 && result.score >= 60;

    return result;
  }

  /**
   * Check password against history
   */
  static async checkPasswordHistory(userId: string, password: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data: history, error } = await supabase
        .from('password_history')
        .select('password_hash')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(PRODUCTION_AUTH_CONFIG.password.historyLimit);

      if (error) {
        console.error('Error checking password history:', error);
        return false; // Fail open for availability
      }

      if (!history || history.length === 0) {
        return false;
      }

      // Check against each historical password
      for (const entry of history) {
        const isMatch = await bcrypt.compare(password, entry.password_hash);
        if (isMatch) {
          return true; // Password was used before
        }
      }

      return false;
    } catch (error) {
      console.error('Password history check failed:', error);
      return false; // Fail open
    }
  }

  /**
   * Store password in history
   */
  static async storePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      const supabase = createClient();

      // Add new password to history
      const { error: insertError } = await supabase
        .from('password_history')
        .insert({
          user_id: userId,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
          is_active: true
        });

      if (insertError) {
        throw insertError;
      }

      // Clean up old entries beyond limit
      const { data: allHistory, error: selectError } = await supabase
        .from('password_history')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (selectError) {
        throw selectError;
      }

      if (allHistory && allHistory.length > PRODUCTION_AUTH_CONFIG.password.historyLimit) {
        const idsToDeactivate = allHistory
          .slice(PRODUCTION_AUTH_CONFIG.password.historyLimit)
          .map(entry => entry.id);

        const { error: updateError } = await supabase
          .from('password_history')
          .update({ is_active: false })
          .in('id', idsToDeactivate);

        if (updateError) {
          throw updateError;
        }
      }

    } catch (error) {
      console.error('Failed to store password history:', error);
      // Don't throw - this shouldn't block password changes
    }
  }

  /**
   * Check if password change is required
   */
  static async checkPasswordAge(userId: string): Promise<{ mustChange: boolean; daysUntilExpiry?: number }> {
    try {
      const supabase = createClient();
      
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select('password_changed_at')
        .eq('user_id', userId)
        .single();

      if (error || !user?.password_changed_at) {
        return { mustChange: false };
      }

      const passwordAge = Date.now() - new Date(user.password_changed_at).getTime();
      const maxAge = PRODUCTION_AUTH_CONFIG.password.maxAge;

      if (passwordAge >= maxAge) {
        return { mustChange: true };
      }

      const daysUntilExpiry = Math.ceil((maxAge - passwordAge) / (24 * 60 * 60 * 1000));
      return { mustChange: false, daysUntilExpiry };

    } catch (error) {
      console.error('Failed to check password age:', error);
      return { mustChange: false };
    }
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    // Ensure at least one character from each required category
    if (PRODUCTION_AUTH_CONFIG.password.requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (PRODUCTION_AUTH_CONFIG.password.requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (PRODUCTION_AUTH_CONFIG.password.requireNumbers) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (PRODUCTION_AUTH_CONFIG.password.requireSpecialChars) {
      password += symbols[Math.floor(Math.random() * symbols.length)];
    }
    
    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Hash password securely
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Private helper methods
  private static isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return PASSWORD_PATTERNS.common.some(common => 
      lowerPassword.includes(common.toLowerCase())
    );
  }

  private static containsPersonalInfo(password: string, userInfo: { email?: string; name?: string }): boolean {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(' ');
      if (nameParts.some(part => part.length >= 3 && lowerPassword.includes(part))) {
        return true;
      }
    }
    
    if (userInfo.email) {
      const emailPart = userInfo.email.split('@')[0].toLowerCase();
      if (emailPart.length >= 3 && lowerPassword.includes(emailPart)) {
        return true;
      }
    }
    
    return false;
  }

  private static isDictionaryWord(password: string): boolean {
    // Simple dictionary check - in production, use a proper dictionary service
    const commonWords = [
      'password', 'admin', 'user', 'login', 'welcome', 'hello', 'world',
      'test', 'demo', 'example', 'sample', 'default', 'guest'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonWords.some(word => lowerPassword.includes(word));
  }

  private static calculateEntropyBonus(password: string): number {
    const uniqueChars = new Set(password).size;
    const lengthBonus = Math.min(20, (password.length - 8) * 2);
    const diversityBonus = Math.min(15, (uniqueChars - 4) * 2);
    
    return lengthBonus + diversityBonus;
  }

  private static calculateStrength(score: number): 'very_weak' | 'weak' | 'fair' | 'good' | 'strong' {
    if (score < 30) return 'very_weak';
    if (score < 50) return 'weak';
    if (score < 70) return 'fair';
    if (score < 85) return 'good';
    return 'strong';
  }

  private static estimateCrackTime(password: string, score: number): string {
    const charsetSize = this.getCharsetSize(password);
    const combinations = Math.pow(charsetSize, password.length);
    
    // Simplified crack time estimation (assuming 10^9 attempts/second)
    const secondsToCrack = combinations / (2 * Math.pow(10, 9)); // Average case
    
    if (secondsToCrack < 1) return '< 1 saniye';
    if (secondsToCrack < 60) return `${Math.round(secondsToCrack)} saniye`;
    if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} dakika`;
    if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} saat`;
    if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} gün`;
    if (secondsToCrack < 3153600000) return `${Math.round(secondsToCrack / 31536000)} yıl`;
    
    return 'yüzyıllar';
  }

  private static getCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) size += 32; // Special characters
    return size;
  }
}

// SQL for password_history table (to be added to migration)
export const PASSWORD_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT password_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);
CREATE INDEX IF NOT EXISTS idx_password_history_active ON password_history(user_id, is_active, created_at);

-- Add password tracking to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;

-- Row Level Security
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own password history" 
  ON password_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert password history" 
  ON password_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
`;

export default PasswordSecurityService;