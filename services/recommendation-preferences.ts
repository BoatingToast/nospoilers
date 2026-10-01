import { prisma } from '@/lib/db'
import {
  buildRecommendationPreferenceProfile,
  type RecommendationPreferenceProfile,
  type TastePreferenceValues,
} from '@/lib/recommendation-preferences'

const EMPTY_VALUES: TastePreferenceValues = {
  pacingScale: null,
  endingClosure: null,
  storytellingScale: null,
  toneScale: null,
  complexity: 5,
  plotTwists: 5,
  escapism: null,
  emotionalIntensity: null,
  eraOpenness: null,
  runtimePreference: null,
  popularityPreference: null,
  discoveryPreference: null,
  subtitleOpenness: null,
  violenceTolerance: null,
  horrorTolerance: null,
  animationOpenness: null,
  documentaryOpenness: null,
  excludedGenres: [],
}

function yearOf(value: string | null): number | null {
  const year = Number(String(value ?? '').slice(0, 4))
  return Number.isInteger(year) && year >= 1888 ? year : null
}

export async function getRecommendationPreferenceProfile(
  userId: string,
): Promise<RecommendationPreferenceProfile> {
  let user
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferences: {
          select: {
            pacingScale: true,
            endingClosure: true,
            storytellingScale: true,
            toneScale: true,
            complexity: true,
            plotTwists: true,
            escapism: true,
            emotionalIntensity: true,
            eraOpenness: true,
            runtimePreference: true,
            popularityPreference: true,
            discoveryPreference: true,
            subtitleOpenness: true,
            violenceTolerance: true,
            horrorTolerance: true,
            animationOpenness: true,
            documentaryOpenness: true,
            excludedGenres: true,
          },
        },
        onboardingMovies: { select: { releaseDate: true } },
        movieRatings: {
          where: { score: { gte: 75 } },
          select: { releaseDate: true },
        },
      },
    })
  } catch (error) {
    // Deployments can briefly run this code before the additive preference
    // migration reaches the database. Keep recommendations available with the
    // legacy signals during that window instead of failing the whole endpoint.
    if (!isMissingColumnError(error)) throw error

    const legacyUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferences: { select: { complexity: true, plotTwists: true } },
        onboardingMovies: { select: { releaseDate: true } },
        movieRatings: {
          where: { score: { gte: 75 } },
          select: { releaseDate: true },
        },
      },
    })

    const legacyYears = [
      ...(legacyUser?.onboardingMovies ?? []),
      ...(legacyUser?.movieRatings ?? []),
    ].map(movie => yearOf(movie.releaseDate)).filter((year): year is number => year !== null)

    return buildRecommendationPreferenceProfile(
      { ...EMPTY_VALUES, ...(legacyUser?.preferences ?? {}) },
      legacyYears,
    )
  }

  const values: TastePreferenceValues = user?.preferences ?? EMPTY_VALUES
  const years = [
    ...(user?.onboardingMovies ?? []),
    ...(user?.movieRatings ?? []),
  ].map(movie => yearOf(movie.releaseDate)).filter((year): year is number => year !== null)

  return buildRecommendationPreferenceProfile(values, years)
}

function isMissingColumnError(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'P2022'
}
