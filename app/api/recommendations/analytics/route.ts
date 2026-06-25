import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecAccuracy, getFeedbackBreakdown } from '@/services/rec-analytics'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [accuracy, breakdown] = await Promise.all([
    getRecAccuracy(session.user.id),
    getFeedbackBreakdown(session.user.id),
  ])

  return NextResponse.json({ accuracy, breakdown })
}
