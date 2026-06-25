import { NextRequest, NextResponse }  from 'next/server'
import { getToken }                    from 'next-auth/jwt'
import { assignPersonality }           from '@/services/personality'
import { notifyDnaEvolved }            from '@/services/notifications'
import { prisma }                      from '@/lib/db'

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = token.id as string

  try {
    // Capture old personality type before reassignment
    const oldPersonality = await prisma.userPersonality.findUnique({
      where:  { userId: myId },
      select: { primaryType: true },
    })
    const oldType = oldPersonality?.primaryType ?? null

    const result = await assignPersonality(myId)

    const newType = result.primaryType.slug
    // Notify only if the type actually changed
    if (oldType && oldType !== newType) {
      void notifyDnaEvolved(myId, oldType, newType).catch(() => {})
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign personality'
    console.error('[personality/assign]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
