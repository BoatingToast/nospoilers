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
  const user = await prisma.user.findUnique({
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

  const values: TastePreferenceValues = user?.preferences ?? EMPTY_VALUES
  const years = [
    ...(user?.onboardingMovies ?? []),
    ...(user?.movieRatings ?? []),
  ].map(movie => yearOf(movie.releaseDate)).filter((year): year is number => year !== null)

  return buildRecommendationPreferenceProfile(values, years)
}
