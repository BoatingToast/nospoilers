import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecommendations } from '@/services/recommendations'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10', 10))

  try {
    const result = await getRecommendations(session.user.id, page, limit)

    // Attach feedback to each recommendation
    const recIds = result.items.map((r: any) => r.id)
    const feedbacks = await prisma.recommendationFeedback.findMany({
      where: { recommendationId: { in: recIds } },
      select: { recommendationId: true, feedback: true },
    })
    const feedbackMap = new Map(feedbacks.map(f => [f.recommendationId, f.feedback]))

    const itemsWithFeedback = result.items.map((r: any) => ({
      ...r,
      feedback: feedbackMap.get(r.id) ?? null,
    }))

    return NextResponse.json({ ...result, items: itemsWithFeedback })
  } catch (error) {
    console.error('[recommendations/GET]', error)
    return NextResponse.json({ error: 'Failed to load recommendations.' }, { status: 500 })
  }
}
