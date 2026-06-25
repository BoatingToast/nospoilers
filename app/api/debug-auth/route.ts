import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { AUTH_SECRET } from '@/lib/auth-secret'
import { prisma } from '@/lib/db'

// TEMPORARY DEBUG ENDPOINT — delete after fixing the Forbidden issue
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: AUTH_SECRET })

  // Check first collection in DB to compare userId format
  const sampleCollection = await prisma.collection.findFirst({
    select: { id: true, userId: true, title: true },
  })

  // Also try getToken with NO explicit secret (uses process.env.NEXTAUTH_SECRET internally)
  const { getToken: gt } = await import('next-auth/jwt')
  const tokenNoSecret = await gt({ req })

  return NextResponse.json({
    token: token
      ? { id: token.id, sub: token.sub, email: token.email }
      : null,
    tokenNoSecret: tokenNoSecret
      ? { id: (tokenNoSecret as Record<string,unknown>).id, sub: tokenNoSecret.sub }
      : null,
    env: {
      NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_SECRET_preview: process.env.NEXTAUTH_SECRET?.slice(0, 6) + '…',
      NODE_ENV: process.env.NODE_ENV,
    },
    secretUsed: AUTH_SECRET.slice(0, 8) + '…',
    sampleCollection,
  })
}
