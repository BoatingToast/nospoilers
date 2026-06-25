import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPersonalityBySlug } from '@/services/personality'
import type { PublicProfile, DNAScores } from '@/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where:  { username },
    select: {
      id: true, username: true, createdAt: true,
      onboardingCompleted: true,
      avatarUrl:        true,
      displayName:      true,
      bio:              true,
      location:         true,
      favoriteDecade:   true,
      favoriteDirector: true,
      favoriteActor:    true,
      twitterUrl:       true,
      letterboxdUrl:    true,
      instagramUrl:     true,
      tasteProfile:     true,
      onboardingMovies: { select: { tmdbId: true, title: true, posterPath: true } },
      preferences:      { select: { genres: true } },
      personality:      { select: { primaryType: true, secondaryType: true, assignedAt: true } },
      followers:        { select: { followerId: true } },
      following:        { select: { followingId: true } },
      recommendations:  { select: { id: true } },
    },
  })

  if (!user || !user.onboardingCompleted) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const dnaScores: DNAScores | null = user.tasteProfile ? {
    suspenseScore:        user.tasteProfile.suspenseScore,
    emotionalImpactScore: user.tasteProfile.emotionalImpactScore,
    complexityScore:      user.tasteProfile.complexityScore,
    humorScore:           user.tasteProfile.humorScore,
    realismScore:         user.tasteProfile.realismScore,
    actionScore:          user.tasteProfile.actionScore,
    darknessScore:        user.tasteProfile.darknessScore,
  } : null

  const profile: PublicProfile = {
    id:               user.id,
    username:         user.username,
    avatarUrl:        user.avatarUrl        ?? null,
    displayName:      user.displayName      ?? null,
    bio:              user.bio              ?? null,
    location:         user.location         ?? null,
    favoriteDecade:   user.favoriteDecade   ?? null,
    favoriteDirector: user.favoriteDirector ?? null,
    favoriteActor:    user.favoriteActor    ?? null,
    twitterUrl:       user.twitterUrl       ?? null,
    letterboxdUrl:    user.letterboxdUrl    ?? null,
    instagramUrl:     user.instagramUrl     ?? null,
    createdAt:        user.createdAt.toISOString(),
    personality: user.personality ? {
      primaryType:   getPersonalityBySlug(user.personality.primaryType) ?? { slug: 'thinker' as const, name: 'The Thinker', description: '', icon: '🧠', color: 'bg-violet-900/40', accentHex: '#7C3AED', traits: [] },
      secondaryType: user.personality.secondaryType ? getPersonalityBySlug(user.personality.secondaryType) : null,
      assignedAt:    user.personality.assignedAt.toISOString(),
    } : null,
    dnaScores,
    favoriteMovies:  user.onboardingMovies.map(m => ({ tmdbId: m.tmdbId, title: m.title, posterPath: m.posterPath })),
    favoriteGenres:  user.preferences?.genres ?? [],
    followerCount:   user.followers.length,
    followingCount:  user.following.length,
    recommendationCount: user.recommendations.length,
  }

  return NextResponse.json(profile)
}
