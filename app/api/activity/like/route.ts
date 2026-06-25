/** POST /api/activity/like  — toggle like on an activity event */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { prisma }                     from '@/lib/db'

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myId = token.id as string
  const { activityEventId } = await req.json()
  if (!activityEventId) return NextResponse.json({ error: 'activityEventId required' }, { status: 400 })

  const existing = await prisma.activityLike.findUnique({
    where: { userId_activityEventId: { userId: myId, activityEventId } },
  })

  if (existing) {
    await prisma.activityLike.delete({ where: { id: existing.id } })
  } else {
    await prisma.activityLike.create({ data: { userId: myId, activityEventId } })
  }

  const likeCount = await prisma.activityLike.count({ where: { activityEventId } })
  return NextResponse.json({ liked: !existing, likeCount })
}
