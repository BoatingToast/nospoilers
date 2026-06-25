import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'

// TEMPORARY DEBUG ENDPOINT — delete after fixing the Forbidden issue
export async function GET(req: NextRequest) {
  const token = await getToken({ req })

  const sampleCollection = await prisma.collection.findFirst({
    select: { id: true, userId: true, title: true },
  })

  return NextResponse.json({
    token: token
      ? {
          id:    (token as Record<string,unknown>).id,
          sub:   token.sub,
          email: token.email,
        }
      : null,
    env: {
      NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    },
    sampleCollection,
  })
}
