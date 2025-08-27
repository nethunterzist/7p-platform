/**
 * Fallback authentication system for development
 * Used when Supabase is unavailable or having issues
 */

export interface FallbackUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
  created_at: string;
}

export interface FallbackSession {
  user: FallbackUser;
  access_token: string;
  expires_at: number;
}

class FallbackAuth {
  private session: FallbackSession | null = null;

  constructor() {
    console.log('🏗️ FALLBACK_AUTH: Constructor called');
    // Try to restore session from localStorage
    if (typeof window !== 'undefined') {
      console.log('🌐 FALLBACK_AUTH: Window available, checking localStorage');
      const stored = localStorage.getItem('fallback_session');
      console.log('📦 FALLBACK_AUTH: Stored session data:', stored ? 'Found' : 'Not found');
      
      if (stored) {
        try {
          const session = JSON.parse(stored);
          console.log('📋 FALLBACK_AUTH: Parsed session:', {
            email: session.user?.email,
            expires_at: new Date(session.expires_at).toISOString(),
            now: new Date().toISOString(),
            valid: session.expires_at > Date.now()
          });
          
          if (session.expires_at > Date.now()) {
            this.session = session;
            console.log('✅ FALLBACK_AUTH: Session restored successfully:', session.user.email);
            console.log('👤 FALLBACK_AUTH: Current session object:', this.session);
          } else {
            localStorage.removeItem('fallback_session');
            console.log('⏰ FALLBACK_AUTH: Expired session removed');
          }
        } catch (error) {
          console.error('❌ FALLBACK_AUTH: Error restoring session:', error);
        }
      } else {
        console.log('🔍 FALLBACK_AUTH: No stored session found in localStorage');
      }
    } else {
      console.log('🚫 FALLBACK_AUTH: Window not available (SSR)');
    }
  }

  async signInWithPassword(credentials: { email: string; password: string }) {
    console.log('🚀 FALLBACK_AUTH: Attempting login with:', credentials.email);
    
    // Simple validation for demo purposes
    if (!credentials.email || !credentials.password) {
      throw new Error('E-posta ve şifre gerekli');
    }

    if (credentials.password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalı');
    }

    // Create mock user session
    const user: FallbackUser = {
      id: 'mock-user-' + Date.now(),
      email: credentials.email,
      user_metadata: {
        full_name: credentials.email.split('@')[0]
      },
      created_at: new Date().toISOString()
    };

    const session: FallbackSession = {
      user,
      access_token: 'mock-token-' + Date.now(),
      expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    this.session = session;

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('fallback_session', JSON.stringify(session));
    }

    console.log('✅ FALLBACK_AUTH: Login successful:', user.email);
    return { data: { user, session }, error: null };
  }

  async signUp(credentials: { email: string; password: string; options?: any }) {
    console.log('🚀 FALLBACK_AUTH: Attempting registration with:', credentials.email);
    
    if (!credentials.email || !credentials.password) {
      throw new Error('E-posta ve şifre gerekli');
    }

    if (credentials.password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalı');
    }

    // Create mock user
    const user: FallbackUser = {
      id: 'mock-user-' + Date.now(),
      email: credentials.email,
      user_metadata: {
        full_name: credentials.options?.data?.full_name || credentials.email.split('@')[0]
      },
      created_at: new Date().toISOString()
    };

    console.log('✅ FALLBACK_AUTH: Registration successful:', user.email);
    return { data: { user }, error: null };
  }

  async signInWithOAuth(options: { provider: string; options?: any }) {
    console.log('🚀 FALLBACK_AUTH: OAuth not supported in fallback mode');
    throw new Error('OAuth giriş şu anda mevcut değil. Lütfen e-posta ile giriş yapın.');
  }

  async signOut() {
    console.log('🚀 FALLBACK_AUTH: Signing out');
    this.session = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fallback_session');
    }
    return { error: null };
  }

  async getUser() {
    console.log('👤 FALLBACK_AUTH: getUser() called');
    console.log('📊 FALLBACK_AUTH: Current session state:', {
      hasSession: !!this.session,
      expired: this.session ? this.session.expires_at <= Date.now() : 'N/A',
      email: this.session?.user?.email || 'None'
    });
    
    if (this.session && this.session.expires_at > Date.now()) {
      console.log('✅ FALLBACK_AUTH: Returning valid user:', this.session.user.email);
      return { data: { user: this.session.user }, error: null };
    }
    
    console.log('❌ FALLBACK_AUTH: No valid user session');
    return { data: { user: null }, error: null };
  }

  async getSession() {
    if (this.session && this.session.expires_at > Date.now()) {
      return { data: { session: this.session }, error: null };
    }
    return { data: { session: null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Simple implementation - in a real app you'd want proper event handling
    console.log('🔄 FALLBACK_AUTH: Auth state change listener registered');
    return { data: { subscription: null } };
  }
}

export const fallbackAuth = new FallbackAuth();