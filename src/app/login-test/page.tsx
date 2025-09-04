"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginTestPage() {
  const [email, setEmail] = useState('test@7ponline.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/dashboard',
        redirect: true,
      });
      if ((result as any)?.error) {
        setMessage('Giriş başarısız: ' + (result as any).error);
      }
    } catch (err) {
      setMessage('Giriş hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4">Test Giriş (Credentials)</h1>
        <p className="text-sm text-gray-500 mb-3">Sadece TEST_CREDENTIALS_ENABLED=true iken çalışır</p>
        {message && <div className="mb-3 text-red-600 text-sm">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full border rounded p-2" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Parola (TEST_CREDENTIALS_PASSWORD)</label>
            <input type="password" className="w-full border rounded p-2" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 text-white rounded p-2">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

