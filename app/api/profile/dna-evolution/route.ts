import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { DnaEvolution, DNAScores } from '@/types'

const DNA_KEYS: (keyof DNAScores)[] = [
  'suspenseScore', 'emotionalImpactScore', 'complexityScore',
  'humorScore', 'realismScore', 'actionScore', 'darknessScore',
]

// GET /api/profile/dna-evolution
// Returns current DNA, previous DNA snapshot, per-dimension deltas, and top influencing ratings.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, topRatings] = await Promise.all([
    prisma.tasteProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.movieRating.findMany({
      where:   { userId: session.user.id, score: { gte: 85 } },
      orderBy: { score: 'desc' },
      take:    5,
      select:  { tmdbId: true, title: true, posterPath: true, score: true },
    }),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'No taste profile' }, { status: 404 })
  }

  const current: DNAScores = {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }

  // Parse JSON snapshot
  let previous: DNAScores | null = null
  if (profile.dnaSnapshot && typeof profile.dnaSnapshot === 'object') {
    const snap = profile.dnaSnapshot as Record<string, unknown>
    const isValid = DNA_KEYS.every(k => typeof snap[k] === 'number')
    if (isValid) {
      previous = Object.fromEntries(DNA_KEYS.map(k => [k, snap[k] as number])) as unknown as DNAScores
    }
  }

  const deltas: Partial<Record<keyof DNAScores, number>> = {}
  if (previous) {
    for (const k of DNA_KEYS) {
      const delta = parseFloat((current[k] - previous[k]).toFixed(2))
      if (Math.abs(delta) >= 0.05) deltas[k] = delta
    }
  }

  const result: DnaEvolution = {
    current,
    previous,
    deltas,
    ratingCount:    profile.ratingCount,
    snapshotAt:     profile.dnaSnapshotAt?.toISOString() ?? null,
    topInfluencers: topRatings,
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, max-age=120' } })
}
