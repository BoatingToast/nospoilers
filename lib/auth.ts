import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) return null

        return { id: user.id, email: user.email, name: user.username, image: user.avatarUrl ?? null }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // Initial sign-in — load onboardingCompleted + avatarUrl from DB
      if (user) {
        token.id = user.id
        const dbUser = await prisma.user.findUnique({
          where:  { id: user.id },
          select: { onboardingCompleted: true, avatarUrl: true },
        })
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false
        token.image               = dbUser?.avatarUrl ?? null
      }

      // Client called useSession().update({ ... })
      if (trigger === 'update') {
        if (sessionUpdate?.onboardingCompleted !== undefined) {
          token.onboardingCompleted = sessionUpdate.onboardingCompleted as boolean
        }
        if ('avatarUrl' in (sessionUpdate ?? {})) {
          token.image = (sessionUpdate as { avatarUrl: string | null }).avatarUrl
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id                  = token.id
        session.user.onboardingCompleted  = token.onboardingCompleted ?? false
        session.user.image               = token.image ?? null
      }
      return session
    },
  },
}
