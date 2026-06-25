import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHiddenGemsForUser } from '@/services/hidden-gems'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const gems = await getHiddenGemsForUser(session.user.id)
    return NextResponse.json(gems)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
