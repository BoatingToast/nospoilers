import type { DNAScores, RecommendationMood } from '../types'

export const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  'sci-fi': 878,
  thriller: 53,
  war: 10752,
  western: 37,
}

export interface TastePreferenceValues {
  pacingScale: number | null
  endingClosure: number | null
  storytellingScale: number | null
  toneScale: number | null
  complexity: number
  plotTwists: number
  escapism: number | null
  emotionalIntensity: number | null
  eraOpenness: number | null
  runtimePreference: number | null
  popularityPreference: number | null
  discoveryPreference: number | null
  subtitleOpenness: number | null
  violenceTolerance: number | null
  horrorTolerance: number | null
  animationOpenness: number | null
  documentaryOpenness: number | null
  excludedGenres: string[]
}

export interface RecommendationPreferenceProfile extends TastePreferenceValues {
  medianPreferredYear: number | null
  hasClassicEvidence: boolean
  excludedGenreIds: number[]
}

export interface PreferenceCandidate {
  genre_ids: number[]
  release_date: string | null | undefined
  original_language: string | null | undefined
  popularity: number | null | undefined
  runtime?: number | null
}

export interface PreferenceScoreOptions {
  movieDNA?: DNAScores
  sourceStrength?: number
  allowClassics?: boolean
  mood?: RecommendationMood
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function yearOf(value: string | null | undefined): number | null {
  const year = Number(String(value ?? '').slice(0, 4))
  return Number.isInteger(year) && year >= 1888 && year <= new Date().getFullYear() + 2
    ? year
    : null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle]
}

function preference(value: number | null): number {
  return value ?? 5
}

function closeness(candidate: number, target: number, weight: number): number {
  return (1 - Math.abs(candidate - target) / 9) * weight - weight * 0.55
}

export function buildRecommendationPreferenceProfile(
  values: TastePreferenceValues,
  positiveEvidenceYears: number[],
): RecommendationPreferenceProfile {
  const validYears = positiveEvidenceYears.filter(
    year => Number.isInteger(year) && year >= 1888 && year <= new Date().getFullYear() + 1,
  )
  const classicCount = validYears.filter(year => year < 1970).length

  return {
    ...values,
    medianPreferredYear: median(validYears),
    hasClassicEvidence: classicCount >= 1 && classicCount / Math.max(validYears.length, 1) >= 0.15,
    excludedGenreIds: values.excludedGenres
      .map(genre => GENRE_NAME_TO_ID[genre.toLowerCase()])
      .filter((id): id is number => Boolean(id)),
  }
}

/** Hard constraints only. Dedicated classic shelves may opt out of the era gate. */
export function isCandidateAllowed(
  movie: PreferenceCandidate,
  profile: RecommendationPreferenceProfile,
  options: Pick<PreferenceScoreOptions, 'allowClassics'> = {},
): boolean {
  const genreIds = movie.genre_ids ?? []
  if (genreIds.some(id => profile.excludedGenreIds.includes(id))) return false

  if (preference(profile.horrorTolerance) <= 2 && genreIds.includes(27)) return false
  if (preference(profile.animationOpenness) <= 2 && genreIds.includes(16)) return false
  if (preference(profile.documentaryOpenness) <= 2 && genreIds.includes(99)) return false
  if (
    preference(profile.subtitleOpenness) <= 2 &&
    movie.original_language &&
    movie.original_language.toLowerCase() !== 'en'
  ) return false

  const year = yearOf(movie.release_date)
  if (year === null) return false
  if (!options.allowClassics) {
    const eraOpenness = preference(profile.eraOpenness)
    const classicsWelcome = eraOpenness >= 7 || profile.hasClassicEvidence
    if (year < 1970 && !classicsWelcome) return false

    if (profile.medianPreferredYear !== null && eraOpenness <= 3) {
      const lookback = eraOpenness <= 1 ? 10 : eraOpenness === 2 ? 15 : 22
      if (year < profile.medianPreferredYear - lookback) return false
    }
  }

  return true
}

/**
 * Returns a bounded additive score adjustment. Positive values indicate a
 * strong explicit match; negative values keep merely-popular candidates from
 * outranking the user's stated boundaries.
 */
export function preferenceScoreAdjustment(
  movie: PreferenceCandidate,
  profile: RecommendationPreferenceProfile,
  options: PreferenceScoreOptions = {},
): number {
  if (!isCandidateAllowed(movie, profile, options)) return -1000

  const mood = options.mood
  const dna = options.movieDNA
  const genreIds = movie.genre_ids ?? []
  let score = 0

  const year = yearOf(movie.release_date)
  if (!options.allowClassics && year !== null && profile.medianPreferredYear !== null) {
    const olderBy = Math.max(0, profile.medianPreferredYear - year)
    const freeLookback = 8 + preference(profile.eraOpenness) * 4
    score -= Math.min(28, Math.max(0, olderBy - freeLookback) * 0.65)
  }

  if (
    profile.subtitleOpenness !== null &&
    movie.original_language &&
    movie.original_language.toLowerCase() !== 'en'
  ) {
    score += (profile.subtitleOpenness - 5) * 1.4
  }

  const popularity = Math.max(0, movie.popularity ?? 0)
  const mainstreamLevel = clamp((Math.log10(popularity + 1) - 0.8) / 1.7, 0, 1) * 9 + 1
  if (profile.popularityPreference !== null) {
    const popularityTarget = 11 - profile.popularityPreference
    score += closeness(mainstreamLevel, popularityTarget, 7)
  }

  const sourceStrength = clamp(options.sourceStrength ?? 0.5, 0, 1)
  if (profile.discoveryPreference !== null) {
    score += ((5 - profile.discoveryPreference) / 5) * (sourceStrength - 0.45) * 10
  }

  if (genreIds.includes(27) && profile.horrorTolerance !== null) score += (profile.horrorTolerance - 5) * 1.1
  if (genreIds.includes(16) && profile.animationOpenness !== null) score += (profile.animationOpenness - 5) * 0.9
  if (genreIds.includes(99) && profile.documentaryOpenness !== null) score += (profile.documentaryOpenness - 5) * 0.9

  if (movie.runtime) {
    if (profile.runtimePreference !== null) {
      const runtimeTarget = 75 + profile.runtimePreference * 11
      score += closeness(clamp((movie.runtime - 65) / 13 + 1, 1, 10), clamp((runtimeTarget - 65) / 13 + 1, 1, 10), 6)
    }
    if (mood && mood.runtime !== 5) {
      const moodRuntimeTarget = 75 + clamp(mood.runtime, 1, 10) * 11
      score += closeness(clamp((movie.runtime - 65) / 13 + 1, 1, 10), clamp((moodRuntimeTarget - 65) / 13 + 1, 1, 10), 5)
    }
  }

  if (dna) {
    if (profile.pacingScale !== null) {
      const pace = clamp((dna.actionScore * 0.65 + dna.suspenseScore * 0.35), 1, 10)
      score += closeness(pace, profile.pacingScale, 6)
    }
    if (profile.storytellingScale !== null) {
      const plotFocus = clamp(
        5 + ((dna.complexityScore + dna.suspenseScore) - (dna.emotionalImpactScore + dna.realismScore)) / 4,
        1,
        10,
      )
      score += closeness(plotFocus, profile.storytellingScale, 4)
    }
    if (profile.endingClosure !== null) score += closeness(dna.complexityScore, profile.endingClosure, 3)
    if (profile.toneScale !== null) score += closeness(dna.darknessScore, profile.toneScale, 6)
    if (profile.escapism !== null) score += closeness(11 - dna.realismScore, profile.escapism, 6)
    if (profile.emotionalIntensity !== null) score += closeness(dna.emotionalImpactScore, profile.emotionalIntensity, 6)
    score += closeness(dna.complexityScore, profile.complexity, 4)
    score += closeness(dna.suspenseScore, profile.plotTwists, 3)

    const candidateIntensity = clamp(
      (dna.emotionalImpactScore + dna.suspenseScore + dna.darknessScore + dna.actionScore) / 4,
      1,
      10,
    )
    if (mood && mood.intensity !== 5) {
      score += closeness(candidateIntensity, clamp(mood.intensity, 1, 10), 8)
    }

    // Tolerance is a ceiling, not a request for violent content.
    if (profile.violenceTolerance !== null) {
      const violenceProxy = (dna.actionScore + dna.darknessScore) / 2
      score -= Math.max(0, violenceProxy - profile.violenceTolerance) * 2.4
    }
  }

  if (mood && mood.adventure !== 5) {
    const adventure = clamp(mood.adventure, 1, 10)
    score += ((adventure - 5) / 5) * ((1 - mainstreamLevel / 10) + (1 - sourceStrength)) * 5
  }

  return Math.round(clamp(score, -35, 18))
}

export function parseRecommendationMood(params: URLSearchParams): RecommendationMood {
  const read = (key: string) => {
    const value = Number(params.get(key))
    return Number.isInteger(value) ? clamp(value, 1, 10) : 5
  }
  return { intensity: read('intensity'), runtime: read('runtime'), adventure: read('adventure') }
}
