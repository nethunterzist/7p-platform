import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AdminStatus {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useAdmin(): AdminStatus {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Kullanıcıyı kontrol et
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }

        setUser(user);

        if (!user) {
          setIsAdmin(false);
          return;
        }

        // Basit admin kontrolü
        const adminEmails = ['admin@7peducation.com', 'furkan@7peducation.com'];
        const isUserAdmin = adminEmails.includes(user.email || '') || 
                           user.user_metadata?.role === 'admin';

        setIsAdmin(isUserAdmin);

      } catch (err) {
        console.error('Admin check error:', err);
        setError(err instanceof Error ? err.message : 'Admin check failed');
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { user, isAdmin, loading, error };
}