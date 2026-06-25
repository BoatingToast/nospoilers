import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeCompatibility } from '@/services/compatibility'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const target = await prisma.user.findUnique({
    where:  { username },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot compare with yourself' }, { status: 400 })
  }

  try {
    const result = await computeCompatibility(session.user.id, target.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Compatibility calculation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
