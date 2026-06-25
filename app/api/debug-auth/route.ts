import { NextResponse }    from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)

  const sampleCollection = await prisma.collection.findFirst({
    select: { id: true, userId: true, title: true },
  })

  return NextResponse.json({
    session: session
      ? { userId: session.user?.id, email: session.user?.email }
      : null,
    sampleCollection,
  })
}
