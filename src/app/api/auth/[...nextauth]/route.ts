import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import { db } from '@/lib/database'

const authOptions: NextAuthOptions = {
  debug: true,
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Check if user exists in our database
          const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [user.email]
          )
          
          if (existingUser.rows.length === 0) {
            // Create new user in our database (OAuth users don't need password)
            await db.query(
              'INSERT INTO users (email, full_name, password_hash, role, is_active, is_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
              [user.email, user.name, null, 'student', true, true]
            )
          }
          
          return true
        } catch (error) {
          console.error('Error during Google sign in:', error)
          return false
        }
      }
      
      return true
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        try {
          // Get user data from our database
          const userResult = await db.query(
            'SELECT id, email, full_name, role FROM users WHERE email = $1',
            [session.user.email]
          )
          
          if (userResult.rows.length > 0) {
            const dbUser = userResult.rows[0]
            session.user.id = dbUser.id
            session.user.role = dbUser.role
            session.user.fullName = dbUser.full_name
          }
        } catch (error) {
          console.error('Error fetching user session:', error)
        }
      }
      
      return session
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + '/dashboard'
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
