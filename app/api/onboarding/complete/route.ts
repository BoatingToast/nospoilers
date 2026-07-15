import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateDNA } from '@/services/dna'
import { ensureTopFiveFromOnboarding } from '@/services/top-five'
import { recalcTasteProfile } from '@/services/ratings'
import type { PreferencesInput } from '@/types'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { genres, preferences }: { genres: string[]; preferences: Omit<PreferencesInput, 'genres'> } = await req.json()

  // Fetch the movies already saved in step 1
  const movies = await prisma.onboardingMovie.findMany({
    where:  { userId: session.user.id },
    select: { tmdbId: true, genreIds: true, posterPath: true, releaseDate: true, title: true },
  })

  if (movies.length < 5) {
    return NextResponse.json({ error: 'Complete movie selection first.' }, { status: 400 })
  }

  const prefsInput: PreferencesInput = { genres, ...preferences }
  const dna = generateDNA(movies, prefsInput)

  await prisma.$transaction([
    // Save preferences
    prisma.userPreferences.upsert({
      where:  { userId: session.user.id },
      create: { userId: session.user.id, genres, ...preferences },
      update: { genres, ...preferences },
    }),
    // Save DNA profile
    prisma.tasteProfile.upsert({
      where:  { userId: session.user.id },
      create: { userId: session.user.id, ...dna },
      update: dna,
    }),
    // Mark onboarding complete
    prisma.user.update({
      where: { id: session.user.id },
      data:  { onboardingCompleted: true },
    }),
  ])
  // The questionnaire DNA above is the source of truth for completing
  // onboarding. These derived-data refreshes improve the finished profile,
  // but a stale schema or transient dependency failure must not strand the
  // user on the final step after onboardingCompleted has already been saved.
  await ensureTopFiveFromOnboarding(session.user.id).catch(error => {
    console.error('Failed to seed Top 5 during onboarding completion:', error)
  })
  await recalcTasteProfile(session.user.id).catch(error => {
    console.error('Failed to refresh Movie DNA during onboarding completion:', error)
  })

  const finalProfile = await prisma.tasteProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      suspenseScore: true, emotionalImpactScore: true, complexityScore: true,
      humorScore: true, realismScore: true, actionScore: true, darknessScore: true,
    },
  })

  return NextResponse.json({ ok: true, dna: finalProfile ?? dna })
}
