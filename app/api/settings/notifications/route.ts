/** GET/PUT /api/settings/notifications — notification preferences */

import { NextRequest, NextResponse }                       from 'next/server'
import { getToken }                                        from 'next-auth/jwt'
import { getNotificationPrefs, updateNotificationPrefs }  from '@/services/notifications'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await getNotificationPrefs(token.id as string)
  return NextResponse.json(prefs)
}

export async function PUT(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const prefs = await updateNotificationPrefs(token.id as string, body)
  return NextResponse.json(prefs)
}
