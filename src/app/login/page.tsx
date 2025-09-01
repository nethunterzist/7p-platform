"use client";

import { useState, useEffect } from 'react';
import { login, getCurrentUser } from '@/lib/simple-auth';
import { safeLocalStorage } from '@/utils/clientStorage';

export default function LoginPage() {
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check if already logged in - sadece mount'ta bir kez kontrol et
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser && typeof window !== 'undefined') {
      // Redirect'i 100ms sonra yap, infinite loop'u önle
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    }
  }, []); // Dependency array boş - sadece mount'ta çalış

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { user, error } = await login(email, password);

    if (error) {
      setMessage(`❌ ${error}`);
      setLoading(false);
      return;
    }

    if (user) {
      // Set cookie for middleware
      document.cookie = `auth_token=mock_token_${Date.now()}; path=/; max-age=86400`;
      
      setMessage('✅ Giriş başarılı!');
      window.location.href = '/dashboard';
    }
  };

  const handleClearAuth = () => {
    safeLocalStorage.clear();
    document.cookie = 'auth_token=; path=/; max-age=0';
    setMessage('✅ Auth temizlendi');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">7P Education Giriş</h1>
        
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
          <p className="font-semibold mb-2">Test Hesapları:</p>
          <p>• admin@7peducation.com : 123456</p>
          <p>• test@test.com : 123456</p>
          <p>• furkanyy@gmail.com : 123456</p>
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
          🧹 Auth Temizle
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