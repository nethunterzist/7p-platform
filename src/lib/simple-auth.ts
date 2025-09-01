// Çok basit auth sistemi - localStorage ile (SSR safe)
import { safeLocalStorage, getStorageJson, setStorageJson } from '@/utils/clientStorage';
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
}

// Mock users - gerçek sistemde backend'den gelir
const MOCK_USERS = [
  { id: '1', email: 'admin@7peducation.com', password: '123456', name: 'Admin User', role: 'admin' as const },
  { id: '2', email: 'test@test.com', password: '123456', name: 'Test User', role: 'student' as const },
  { id: '3', email: 'furkanyy@gmail.com', password: '123456', name: 'Furkan Y', role: 'student' as const }
];

export const login = async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
  
  if (!mockUser) {
    return { error: 'Email veya şifre hatalı' };
  }
  
  const user: User = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    role: mockUser.role
  };
  
  // Save to localStorage (SSR safe)
  setStorageJson('auth_user', user);
  safeLocalStorage.setItem('auth_token', 'mock_token_' + Date.now());
  
  return { user };
};

export const logout = () => {
  safeLocalStorage.removeItem('auth_user');
  safeLocalStorage.removeItem('auth_token');
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const user = getStorageJson<User>('auth_user');
    const token = safeLocalStorage.getItem('auth_token');
    
    if (!user || !token) return null;
    
    return user;
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};