import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { db } from '@/lib/database'

export const authOptions: NextAuthOptions = {
  debug: true,
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(process.env.TEST_CREDENTIALS_ENABLED === 'true'
      ? [
          CredentialsProvider({
            name: 'Test Credentials',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
              const email = credentials?.email?.toString().toLowerCase() || '';
              const password = credentials?.password?.toString() || '';
              const expected = process.env.TEST_CREDENTIALS_PASSWORD || '';
              if (!email || !password || !expected) return null;
              if (password !== expected) return null;
              // Create or fetch user from DB for session enrichment
              try {
                const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
                if (existing.rows.length === 0) {
                  await db.query(
                    'INSERT INTO users (email, full_name, password_hash, role, is_active, is_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
                    [email, 'Test User', null, 'student', true, true]
                  );
                }
              } catch (e) {
                console.error('Credentials authorize DB error:', e);
              }
              return {
                id: email,
                email,
                name: 'Test User',
              } as any;
            },
          }),
        ]
      : []),
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
      if (account?.provider === 'credentials') {
        return true;
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
