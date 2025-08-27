/**
 * NextAuth.js Configuration with Supabase Integration
 * Complete authentication system for 7P Education Platform
 */

export const runtime = 'nodejs'; // Force Node.js runtime for bcrypt, Supabase admin client

import NextAuth from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { createClient } from '@supabase/supabase-js'
import { EmailVerificationService } from '@/lib/auth/email-verification'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Environment validation with fallbacks
const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
})

let env: any = {};

try {
  env = envSchema.parse({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
  });
} catch (error) {
  console.warn('NextAuth environment validation failed:', error);
  // Use fallback env values
  env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
  };
}

// Supabase admin client for user operations
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Rate limiting for authentication attempts
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const current = rateLimitMap.get(identifier)
  
  if (!current || now - current.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now })
    return true
  }
  
  if (current.count >= MAX_ATTEMPTS) {
    return false
  }
  
  current.count++
  return true
}

// User role enum for type safety
type UserRole = 'student' | 'instructor' | 'admin' | 'support'

interface ExtendedUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  email_verified: boolean
  phone?: string
  created_at: string
  last_active_at?: string
}

// Enhanced authentication service
class AuthService {
  static async authenticateUser(email: string, password: string): Promise<{
    success: boolean
    user?: ExtendedUser
    error?: string
  }> {
    try {
      // Get user from database with password hash
      const { data: user, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url,
          phone,
          created_at,
          last_active_at,
          password_hash,
          email_verified_at,
          account_locked_until,
          failed_login_attempts
        `)
        .eq('email', email.toLowerCase())
        .eq('status', 'active')
        .is('deleted_at', null)
        .single()

      if (error || !user) {
        return { success: false, error: 'Invalid credentials' }
      }

      // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        return { success: false, error: 'Account temporarily locked' }
      }

      // Verify password
      if (!user.password_hash) {
        return { success: false, error: 'Password not set' }
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        // Increment failed attempts
        await this.handleFailedLogin(user.id)
        return { success: false, error: 'Invalid credentials' }
      }

      // Check email verification status
      const isEmailVerified = await EmailVerificationService.isEmailVerified(user.id)
      
      if (!isEmailVerified) {
        return { 
          success: false, 
          error: 'Email not verified. Please check your email for verification link.' 
        }
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user.id)

      // Update last active timestamp
      await supabaseAdmin
        .from('user_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role as UserRole,
          avatar_url: user.avatar_url,
          email_verified: true, // Already verified in check above
          phone: user.phone,
          created_at: user.created_at,
          last_active_at: user.last_active_at
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      return { success: false, error: 'Authentication failed' }
    }
  }

  static async handleFailedLogin(userId: string) {
    const { data: user } = await supabaseAdmin
      .from('user_profiles')
      .select('failed_login_attempts')
      .eq('id', userId)
      .single()

    const attempts = (user?.failed_login_attempts || 0) + 1
    const updateData: any = { failed_login_attempts: attempts }

    // Lock account after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      updateData.account_locked_until = lockUntil.toISOString()
    }

    await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
  }

  static async resetFailedAttempts(userId: string) {
    await supabaseAdmin
      .from('user_profiles')
      .update({ 
        failed_login_attempts: 0, 
        account_locked_until: null 
      })
      .eq('id', userId)
  }

  static async createUserProfile(user: any, provider: string) {
    try {
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.name || user.user_metadata?.full_name || '',
        avatar_url: user.avatar_url || user.user_metadata?.avatar_url,
        role: 'student' as UserRole,
        status: 'active',
        email_verified_at: user.email_confirmed_at,
        provider_data: {
          [provider]: {
            provider_id: user.user_metadata?.provider_id,
            username: user.user_metadata?.user_name || user.user_metadata?.username
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData)

      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating user profile:', error)
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error)
    }
  }

  static async getUserById(id: string): Promise<ExtendedUser | null> {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url,
          phone,
          created_at,
          last_active_at,
          email_verified_at
        `)
        .eq('id', id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single()

      if (error || !user) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role as UserRole,
        avatar_url: user.avatar_url,
        email_verified: !!user.email_verified_at,
        phone: user.phone,
        created_at: user.created_at,
        last_active_at: user.last_active_at
      }
    } catch (error) {
      console.error('Error getting user by ID:', error)
      return null
    }
  }
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Rate limiting
        const clientIP = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown'
        const rateLimitKey = `${credentials.email}-${clientIP}`
        
        if (!checkRateLimit(rateLimitKey)) {
          throw new Error('Too many login attempts. Please try again later.')
        }

        const result = await AuthService.authenticateUser(
          credentials.email,
          credentials.password
        )

        if (!result.success || !result.user) {
          // If email not verified, send verification email
          if (result.error?.includes('Email not verified')) {
            try {
              const { data: userData } = await supabaseAdmin
                .from('user_profiles')
                .select('id, email')
                .eq('email', credentials.email.toLowerCase())
                .single()
              
              if (userData) {
                await EmailVerificationService.sendVerificationEmail({
                  userId: userData.id,
                  email: userData.email,
                  ipAddress: clientIP,
                  userAgent: req.headers?.['user-agent'] || 'unknown'
                })
              }
            } catch (error) {
              console.error('Error sending verification email:', error)
            }
          }
          
          throw new Error(result.error || 'Authentication failed')
        }

        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.full_name,
          image: result.user.avatar_url,
          role: result.user.role,
          emailVerified: result.user.email_verified
        }
      }
    }),

    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope: 'openid email profile',
            prompt: 'select_account'
          }
        }
      })
    ] : []),

    ...(env.GITHUB_ID && env.GITHUB_SECRET ? [
      GitHubProvider({
        clientId: env.GITHUB_ID,
        clientSecret: env.GITHUB_SECRET
      })
    ] : [])
  ],

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update every hour
  },

  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // For OAuth providers, create or update user profile
        if (account?.provider !== 'credentials') {
          await AuthService.createUserProfile(user, account?.provider || 'unknown')
          
          // For OAuth providers, mark email as verified since provider verified it
          if (user.id && user.email) {
            await supabaseAdmin
              .from('user_profiles')
              .update({ 
                email_verified: true,
                email_verified_at: new Date().toISOString()
              })
              .eq('id', user.id)
          }
        }

        return true
      } catch (error) {
        console.error('SignIn error:', error)
        return false
      }
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && account) {
        const dbUser = await AuthService.getUserById(user.id)
        if (dbUser) {
          token.role = dbUser.role
          token.emailVerified = dbUser.email_verified
          token.userId = dbUser.id
        }
      }

      // Return previous token if the access token has not expired yet
      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as UserRole
        session.user.emailVerified = token.emailVerified as boolean
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      // Log successful sign-in
      console.log(`User ${user.email} signed in via ${account?.provider}`)
      
      // Update last login time
      if (user.id) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    },
    
    async signOut({ token }) {
      // Log sign-out
      console.log(`User ${token?.email} signed out`)
    }
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user'
  },

  debug: process.env.NODE_ENV === 'development',

  secret: env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }