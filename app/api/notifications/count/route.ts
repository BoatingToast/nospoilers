/** GET /api/notifications/count — unread count only (lightweight navbar poll) */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { getUnreadCount }             from '@/services/notifications'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ count: 0 })

  const count = await getUnreadCount(token.id as string)
  return NextResponse.json({ count })
}
