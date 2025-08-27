/**
 * Authentication Context and Provider
 * Comprehensive auth state management with NextAuth.js integration
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSession, signIn, signOut, SessionProvider } from 'next-auth/react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

// Types
export type UserRole = 'student' | 'instructor' | 'admin' | 'support'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  emailVerified: boolean
  phone?: string
  timezone?: string
  language?: string
  preferences?: {
    email_notifications: boolean
    course_updates: boolean
    marketing_emails: boolean
    assignment_reminders: boolean
  }
  stats?: {
    total_enrollments: number
    completed_courses: number
    active_courses: number
    recent_activity: any[]
  }
  created_at: string
  last_active_at?: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface AuthContextType extends AuthState {
  // Authentication methods
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>
  logout: () => Promise<void>
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>
  
  // Social authentication
  loginWithGoogle: () => Promise<void>
  loginWithGitHub: () => Promise<void>
  
  // Password management
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  
  // Profile management
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  refreshProfile: () => Promise<void>
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>
  
  // Email verification
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>
  
  // Role and permission checks
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canAccess: (resource: string) => boolean
  
  // Session management
  refreshSession: () => Promise<void>
  clearError: () => void
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
  phone?: string
  role?: UserRole
  terms_accepted: boolean
  privacy_accepted: boolean
  marketing_consent?: boolean
}

// Supabase client for profile operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Permission map for role-based access control
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  student: ['course.enroll', 'course.view', 'profile.edit'],
  instructor: ['course.create', 'course.edit', 'course.view', 'student.view', 'profile.edit'],
  admin: ['*'], // Admin has all permissions
  support: ['user.view', 'course.view', 'support.respond']
}

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  )
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const isLoading = status === 'loading' || profileLoading
  const isAuthenticated = !!session?.user && !!user

  // Fetch detailed user profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true)
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Update user profile when session changes
  useEffect(() => {
    if (session?.user?.id && !user) {
      fetchUserProfile(session.user.id)
    } else if (!session?.user) {
      setUser(null)
    }
  }, [session, user, fetchUserProfile])

  // Authentication methods
  const login = useCallback(async (email: string, password: string, rememberMe = false): Promise<boolean> => {
    try {
      setError(null)
      const result = await signIn('credentials', {
        email,
        password,
        rememberMe: rememberMe.toString(),
        redirect: false
      })

      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        return false
      }

      if (result?.ok) {
        toast.success('Giriş başarılı!')
        return true
      }

      return false
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Giriş başarısız'
      setError(message)
      toast.error(message)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut({ redirect: false })
      setUser(null)
      setError(null)
      toast.success('Çıkış yapıldı')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [])

  const register = useCallback(async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Hesap oluşturuldu! E-posta doğrulama linkini kontrol edin.')
        return { success: true }
      } else {
        setError(data.error)
        toast.error(data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kayıt başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      setError(null)
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google giriş başarısız'
      setError(message)
      toast.error(message)
    }
  }, [])

  const loginWithGitHub = useCallback(async () => {
    try {
      setError(null)
      await signIn('github', { callbackUrl: '/dashboard' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub giriş başarısız'
      setError(message)
      toast.error(message)
    }
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Şifre sıfırlama e-postası gönderildi!')
        return { success: true }
      } else {
        setError(data.error)
        toast.error(data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Şifre sıfırlama başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Şifre başarıyla değiştirildi!')
        return { success: true }
      } else {
        setError(data.error)
        toast.error(data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Şifre değiştirme başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const updateProfile = useCallback(async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setUser(prev => prev ? { ...prev, ...result.data } : null)
        toast.success('Profil güncellendi!')
        return { success: true }
      } else {
        setError(result.error)
        toast.error(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profil güncelleme başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchUserProfile(session.user.id)
    }
  }, [session, fetchUserProfile])

  const deleteAccount = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        await signOut({ redirect: false })
        setUser(null)
        toast.success('Hesap silindi')
        return { success: true }
      } else {
        setError(data.error)
        toast.error(data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hesap silme başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const sendVerificationEmail = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Doğrulama e-postası gönderildi!')
        return { success: true }
      } else {
        setError(data.error)
        toast.error(data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'E-posta gönderimi başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const verifyEmail = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('E-posta doğrulandı!')
        await refreshProfile()
        return { success: true }
      } else {
        setError(data.error)
        toast.error(data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'E-posta doğrulama başarısız'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    }
  }, [refreshProfile])

  // Role and permission methods
  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role
  }, [user])

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return !!user?.role && roles.includes(user.role)
  }, [user])

  const canAccess = useCallback((resource: string): boolean => {
    if (!user?.role) return false
    
    const permissions = ROLE_PERMISSIONS[user.role]
    return permissions.includes('*') || permissions.includes(resource)
  }, [user])

  const refreshSession = useCallback(async () => {
    await updateSession()
  }, [updateSession])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const contextValue: AuthContextType = {
    // State
    user,
    isLoading,
    isAuthenticated,
    error,
    
    // Authentication methods
    login,
    logout,
    register,
    
    // Social authentication
    loginWithGoogle,
    loginWithGitHub,
    
    // Password management
    resetPassword,
    changePassword,
    
    // Profile management
    updateProfile,
    refreshProfile,
    deleteAccount,
    
    // Email verification
    sendVerificationEmail,
    verifyEmail,
    
    // Role and permission checks
    hasRole,
    hasAnyRole,
    canAccess,
    
    // Session management
    refreshSession,
    clearError
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for role-based access control
export function useRoleGuard(allowedRoles: UserRole[]) {
  const { user, isLoading, hasAnyRole } = useAuth()
  
  const hasAccess = hasAnyRole(allowedRoles)
  
  return {
    hasAccess,
    isLoading,
    user,
    role: user?.role
  }
}

// Hook for permission-based access control
export function usePermissionGuard(requiredPermissions: string[]) {
  const { canAccess, isLoading, user } = useAuth()
  
  const hasAllPermissions = requiredPermissions.every(permission => canAccess(permission))
  const hasAnyPermission = requiredPermissions.some(permission => canAccess(permission))
  
  return {
    hasAllPermissions,
    hasAnyPermission,
    isLoading,
    user,
    canAccess
  }
}