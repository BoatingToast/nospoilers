/**
 * GET  /api/notifications        — list notifications (30 most recent)
 * PATCH /api/notifications        — mark all as read
 * PATCH /api/notifications?id=x  — mark one as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { getNotifications, getUnreadCount, markAllRead, markOneRead } from '@/services/notifications'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const myId   = token.id as string
  const url    = req.nextUrl
  const limit  = Math.min(50, parseInt(url.searchParams.get('limit') ?? '30', 10))

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(myId, limit),
    getUnreadCount(myId),
  ])
  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myId = token.id as string
  const url  = req.nextUrl
  const id   = url.searchParams.get('id')

  if (id) {
    await markOneRead(id, myId)
  } else {
    await markAllRead(myId)
  }

  return NextResponse.json({ ok: true })
}
