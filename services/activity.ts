import { prisma } from '@/lib/db'
import type { ActivityEventItem } from '@/types'

// ─── Event type constants ─────────────────────────────────────────────────────
export type ActivityType =
  | 'added_favorite'
  | 'dna_updated'
  | 'personality_assigned'
  | 'followed_user'
  | 'onboarding_completed'
  // Phase 8: Friends & Social
  | 'sent_friend_request'
  | 'accepted_friend_request'
  | 'rated_movie'
  | 'added_to_watchlist'
  | 'created_collection'
  | 'earned_achievement'

// ─── Log an activity event ────────────────────────────────────────────────────
export async function logActivity(
  userId: string,
  type: ActivityType,
  data: Record<string, unknown>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.activityEvent.create({ data: { userId, type, data: data as any } }).catch(() => {})
}

// ─── Fetch a user's activity feed ────────────────────────────────────────────
export async function getActivityFeed(userId: string, limit = 20): Promise<ActivityEventItem[]> {
  const events = await prisma.activityEvent.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })

  return events.map(e => ({
    id:        e.id,
    type:      e.type,
    data:      e.data as Record<string, unknown>,
    createdAt: e.createdAt.toISOString(),
  }))
}

// ─── Human-readable label for an event ───────────────────────────────────────
export function formatActivityEvent(event: ActivityEventItem, username: string): string {
  const d = event.data
  switch (event.type) {
    case 'added_favorite':
      return `${username} added ${d.movieTitle ?? 'a movie'} to favorites`
    case 'dna_updated':
      return `${username}'s Movie DNA was updated`
    case 'personality_assigned':
      return `${username} became "${d.personalityName ?? 'a Personality Type'}"`
    case 'followed_user':
      return `${username} started following ${d.targetUsername ?? 'someone'}`
    case 'onboarding_completed':
      return `${username} joined NoSpoilers`
    default:
      return `${username} did something cinematic`
  }
}

// ─── Wrapped stats infrastructure ────────────────────────────────────────────
export async function upsertWrappedStats(userId: string): Promise<void> {
  const year = new Date().getFullYear()

  const [movies, events, profile, personality] = await Promise.all([
    prisma.onboardingMovie.count({ where: { userId } }),
    prisma.activityEvent.count({ where: { userId, createdAt: { gte: new Date(`${year}-01-01`) } } }),
    prisma.tasteProfile.findUnique({ where: { userId } }),
    prisma.userPersonality.findUnique({ where: { userId } }),
  ])

  // Find top genre from preferences
  const prefs = await prisma.userPreferences.findUnique({ where: { userId }, select: { genres: true } })
  const topGenre = prefs?.genres?.[0] ?? null

  // Find top DNA trait
  let topTrait: string | null = null
  if (profile) {
    const scores: Record<string, number> = {
      Suspense:        profile.suspenseScore,
      'Emotional Depth': profile.emotionalImpactScore,
      Complexity:      profile.complexityScore,
      Humor:           profile.humorScore,
      Realism:         profile.realismScore,
      Action:          profile.actionScore,
      Darkness:        profile.darknessScore,
    }
    topTrait = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
  }

  const data = {
    year,
    moviesInLibrary:    movies,
    activityCount:      events,
    topGenre,
    topTrait,
    personalityType:    personality?.primaryType ?? null,
    generatedAt:        new Date().toISOString(),
  }

  await prisma.wrappedStats.upsert({
    where:  { userId_year: { userId, year } },
    create: { userId, year, data },
    update: { data, updatedAt: new Date() },
  }).catch(() => {})
}
