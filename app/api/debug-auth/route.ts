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

  return NextResponse.json({
    token: token
      ? {
          id:  token.id,
          sub: token.sub,
          email: token.email,
          name: token.name,
        }
      : null,
    secretUsed: AUTH_SECRET.slice(0, 8) + '…',
    sampleCollection,
  })
}
