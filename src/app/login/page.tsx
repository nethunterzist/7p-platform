"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/auth/supabase-auth';
import { useAuth } from '@/lib/auth/simple-context';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@7peducation.com');
  const [password, setPassword] = useState('admin123456');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Check if already logged in
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Try Supabase first, fallback to simple auth
      try {
        const result = await supabaseAuth.signIn({ email, password });

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.user) {
          setMessage('✅ Supabase giriş başarılı! Yönlendiriliyorsunuz...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
          return;
        }
      } catch (supabaseError) {
        console.warn('Supabase auth failed, using fallback:', supabaseError);
        
        // Fallback to simple auth
        if (email === 'admin@7peducation.com' && password === 'admin123456') {
          // Set simple auth data
          const userData = {
            id: '1',
            email: email,
            name: 'Admin User',
            role: 'admin'
          };
          
          localStorage.setItem('auth_user', JSON.stringify(userData));
          localStorage.setItem('auth_token', 'simple-auth-token-' + Date.now());
          
          setMessage('✅ Fallback giriş başarılı! Yönlendiriliyorsunuz...');
          setTimeout(() => {
            window.location.href = '/admin/dashboard';
          }, 1000);
          return;
        } else {
          throw new Error('Geçersiz email veya şifre');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`❌ ${error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuth = async () => {
    try {
      await supabaseAuth.signOut();
      localStorage.clear();
      document.cookie = 'auth_token=; path=/; max-age=0';
      setMessage('✅ Oturum kapatıldı');
    } catch (error) {
      console.error('Logout error:', error);
      setMessage('⚠️ Logout hatası oluştu ama yerel veriler temizlendi');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">7P Education Giriş</h1>
        
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
          <p className="font-semibold mb-2">✅ Middleware Sorunu Çözüldü!</p>
          <p className="font-semibold mb-2">Test Hesabı:</p>
          <p>• admin@7peducation.com : admin123456</p>
          <p className="text-xs text-gray-600 mt-2">
            ℹ️ Gerçek Supabase backend kullanılıyor (fallback ile)
          </p>
        </div>
        
        {message && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            {message}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="test@test.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? '⏳ Giriş yapılıyor...' : '🚀 Giriş Yap'}
          </button>
        </form>
        
        <button
          onClick={handleClearAuth}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 text-sm mb-4"
        >
          🚪 Oturumu Kapat
        </button>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Hesabınız yok mu?{' '}
            <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium underline">
              Kayıt olun
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}