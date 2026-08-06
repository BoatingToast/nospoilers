import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateDNA } from '@/services/dna'
import { ensureTopFiveFromOnboarding } from '@/services/top-five'
import { recalcTasteProfile } from '@/services/ratings'
import type { PreferencesInput } from '@/types'

const SCALE_KEYS = [
  'pacingScale', 'endingClosure', 'storytellingScale', 'toneScale',
  'escapism', 'emotionalIntensity', 'eraOpenness', 'runtimePreference',
  'popularityPreference', 'discoveryPreference', 'subtitleOpenness',
  'violenceTolerance', 'horrorTolerance', 'animationOpenness',
  'documentaryOpenness',
] as const

function scale(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10
    ? value
    : null
}

function requiredScale(value: unknown): number {
  return scale(value) ?? 5
}

function legacyAnswers(preferences: Record<string, unknown>) {
  const pacing = scale(preferences.pacingScale)
  const endings = scale(preferences.endingClosure)
  const storytelling = scale(preferences.storytellingScale)
  const tone = scale(preferences.toneScale)

  return {
    pacing: pacing === null || (pacing >= 4 && pacing <= 6)
      ? 'balanced'
      : pacing < 4 ? 'slow_burn' : 'fast_paced',
    endings: endings === null || (endings >= 4 && endings <= 6)
      ? 'bittersweet'
      : endings < 4 ? 'happy' : 'ambiguous',
    storytelling: storytelling === null || (storytelling >= 4 && storytelling <= 6)
      ? 'equal'
      : storytelling < 4 ? 'characters' : 'plot',
    tone: tone === null || (tone >= 4 && tone <= 6)
      ? 'balanced'
      : tone < 4 ? 'lighthearted' : 'dark',
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    genres?: unknown
    preferences?: unknown
  } | null
  if (!body || !Array.isArray(body.genres) || !body.preferences || typeof body.preferences !== 'object') {
    return NextResponse.json({ error: 'Invalid preference data.' }, { status: 400 })
  }

  const genres = body.genres
    .filter((genre): genre is string => typeof genre === 'string')
    .map(genre => genre.toLowerCase())
    .slice(0, 20)
  if (genres.length === 0) {
    return NextResponse.json({ error: 'Choose at least one genre.' }, { status: 400 })
  }

  const rawPreferences = body.preferences as Record<string, unknown>
  const legacy = legacyAnswers(rawPreferences)
  const spectrumValues = Object.fromEntries(
    SCALE_KEYS.map(key => [key, scale(rawPreferences[key])]),
  ) as Pick<PreferencesInput, (typeof SCALE_KEYS)[number]>
  const excludedGenres = Array.isArray(rawPreferences.excludedGenres)
    ? rawPreferences.excludedGenres
        .filter((genre): genre is string => typeof genre === 'string')
        .map(genre => genre.toLowerCase())
        .filter((genre, index, all) => all.indexOf(genre) === index)
        .slice(0, 20)
    : []

  const preferences: Omit<PreferencesInput, 'genres'> = {
    ...legacy,
    ...spectrumValues,
    complexity: requiredScale(rawPreferences.complexity),
    plotTwists: requiredScale(rawPreferences.plotTwists),
    excludedGenres,
  }

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
