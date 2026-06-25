import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecPersonas } from '@/services/rec-personas'

export const revalidate = 0   // always fresh (personas change as favorites change)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const personas = await getRecPersonas(session.user.id)
  return NextResponse.json(personas)
}
