export type ProTimeBudget = 'quick' | 'standard' | 'epic' | 'any'
export type ProMood = 'comfort' | 'gripping' | 'thoughtful' | 'surprise'
export type ProCompany = 'solo' | 'date' | 'crowd'
export type ProPairingStyle = 'cohesive' | 'contrast'
export type ProPairingBudget = 210 | 270 | 0

export interface ProQueueMovie {
  tmdbId: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  genreIds: number[]
  runtime: number | null
  voteAverage: number | null
  matchScore: number | null
  addedAt: string
}

export interface ProTonightOptions {
  time: ProTimeBudget
  mood: ProMood
  company: ProCompany
}

export interface RankedProMovie extends ProQueueMovie {
  proScore: number
  reasons: string[]
  confidence: 'High confidence' | 'Good signal' | 'Exploratory'
}

export interface ProDoubleFeature {
  first: ProQueueMovie
  second: ProQueueMovie
  score: number
  totalRuntime: number | null
  sharedGenres: string[]
  reason: string
}

export interface ProRatingSignal {
  score: number
  genreIds: number[]
  storytelling: number | null
  characters: number | null
  entertainment: number | null
  emotion: number | null
  complexity: number | null
  suspense: number | null
}

export interface ProTasteReport {
  calibration: number
  calibrationLabel: string
  ratingCount: number
  averageScore: number | null
  scoreSpread: number | null
  genreCount: number
  strongestLane: {
    genre: string
    averageScore: number
    count: number
  } | null
  blindSpot: string | null
  topDimension: {
    label: string
    average: number
    count: number
  } | null
  nextSignal: string
}

export const PRO_GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

const GENRE_IDS_BY_NAME = new Map(
  Object.entries(PRO_GENRE_NAMES).map(([id, name]) => [name.toLowerCase(), Number(id)]),
)

const MOOD_GENRES: Record<Exclude<ProMood, 'surprise'>, number[]> = {
  comfort: [35, 16, 10751, 10749, 10402, 12],
  gripping: [53, 9648, 80, 28, 27, 878],
  thoughtful: [18, 99, 36, 9648, 878, 10752],
}

const COMPANY_GENRES: Record<ProCompany, number[]> = {
  solo: [9648, 99, 18, 878, 36],
  date: [10749, 35, 18, 9648, 10402],
  crowd: [28, 12, 35, 27, 16, 53],
}

const DIMENSIONS: Array<{ key: keyof Omit<ProRatingSignal, 'score' | 'genreIds'>; label: string }> = [
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'characters', label: 'Characters' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'suspense', label: 'Suspense' },
]

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function movieSignal(movie: ProQueueMovie): number {
  if (movie.matchScore !== null) return clamp(movie.matchScore)
  if (movie.voteAverage !== null) return clamp(movie.voteAverage * 10)
  return 62
}

function genreMatches(movie: ProQueueMovie, target: number[]): number[] {
  const targets = new Set(target)
  return movie.genreIds.filter(id => targets.has(id))
}

function timeFit(movie: ProQueueMovie, budget: ProTimeBudget): { score: number; reason: string } {
  if (budget === 'any') {
    return {
      score: 11,
      reason: movie.runtime ? `${movie.runtime} min with no hard cutoff` : 'Runtime is still being learned',
    }
  }

  if (movie.runtime === null) {
    return { score: 4, reason: 'Runtime is unknown, so this is a looser fit' }
  }

  if (budget === 'epic') {
    const score = movie.runtime >= 130
      ? 20 - Math.abs(movie.runtime - 165) * 0.08
      : 8 - (130 - movie.runtime) * 0.18
    return {
      score,
      reason: movie.runtime >= 130
        ? `${movie.runtime} min makes use of your open schedule`
        : `${movie.runtime} min leaves room after the credits`,
    }
  }

  const config = budget === 'quick'
    ? { target: 92, max: 105, label: 'short-night limit' }
    : { target: 118, max: 135, label: 'two-hour window' }
  const score = movie.runtime <= config.max
    ? 20 - Math.abs(movie.runtime - config.target) * 0.12
    : 3 - (movie.runtime - config.max) * 0.65

  return {
    score,
    reason: movie.runtime <= config.max
      ? `${movie.runtime} min fits your ${config.label}`
      : `${movie.runtime} min runs past your ${config.label}`,
  }
}

function readableGenres(ids: number[], limit = 2): string[] {
  return ids.map(id => PRO_GENRE_NAMES[id]).filter(Boolean).slice(0, limit)
}

export function rankProTonight(
  movies: ProQueueMovie[],
  options: ProTonightOptions,
): RankedProMovie[] {
  return movies
    .map(movie => {
      const time = timeFit(movie, options.time)
      const companyIds = genreMatches(movie, COMPANY_GENRES[options.company])
      const moodIds = options.mood === 'surprise'
        ? []
        : genreMatches(movie, MOOD_GENRES[options.mood])
      const quality = movieSignal(movie)
      const surpriseBonus = options.mood === 'surprise'
        ? Math.max(4, 16 - Math.max(0, quality - 65) * 0.18) + (movie.genreIds.length >= 3 ? 3 : 0)
        : 0
      const moodScore = options.mood === 'surprise'
        ? surpriseBonus
        : Math.min(17, moodIds.length * 7.5)
      const companyScore = Math.min(10, companyIds.length * 4.5)
      const proScore = clamp(quality * 0.55 + time.score + moodScore + companyScore)
      const reasons = [time.reason]

      if (movie.matchScore !== null) reasons.push(`${movie.matchScore}% match to your Movie DNA`)
      else if (movie.voteAverage !== null) reasons.push(`${movie.voteAverage.toFixed(1)} community rating`)

      if (options.mood === 'surprise') {
        reasons.push('Broadens tonight without ignoring quality')
      } else if (moodIds.length > 0) {
        reasons.push(`${readableGenres(moodIds).join(' + ')} fits the mood`)
      }

      if (companyIds.length > 0 && reasons.length < 3) {
        const label = options.company === 'date' ? 'two-person pick' : options.company === 'crowd' ? 'group pick' : 'solo pick'
        reasons.push(`${readableGenres(companyIds).join(' + ')} makes it a strong ${label}`)
      }

      const knownSignals = Number(movie.runtime !== null) + Number(movie.matchScore !== null) + Number(movie.voteAverage !== null)
      const confidence = knownSignals >= 3
        ? 'High confidence'
        : knownSignals >= 1
          ? 'Good signal'
          : 'Exploratory'

      return { ...movie, proScore: Math.round(proScore), reasons: reasons.slice(0, 3), confidence } satisfies RankedProMovie
    })
    .sort((a, b) => b.proScore - a.proScore || a.title.localeCompare(b.title))
}

function jaccard(first: number[], second: number[]): number {
  const a = new Set(first)
  const b = new Set(second)
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0
  let overlap = 0
  for (const value of a) if (b.has(value)) overlap++
  return overlap / union.size
}

export function buildProDoubleFeatures(
  movies: ProQueueMovie[],
  style: ProPairingStyle,
  budget: ProPairingBudget,
): ProDoubleFeature[] {
  const pairs: ProDoubleFeature[] = []

  for (let firstIndex = 0; firstIndex < movies.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < movies.length; secondIndex++) {
      const first = movies[firstIndex]
      const second = movies[secondIndex]
      const totalRuntime = first.runtime !== null && second.runtime !== null
        ? first.runtime + second.runtime
        : null

      if (budget !== 0 && (totalRuntime === null || totalRuntime > budget)) continue

      const similarity = jaccard(first.genreIds, second.genreIds)
      const pairFit = style === 'cohesive' ? similarity : 1 - similarity
      const quality = (movieSignal(first) + movieSignal(second)) / 2
      const runtimeFit = budget === 0 || totalRuntime === null
        ? 6
        : clamp(14 - Math.abs(budget - totalRuntime) * 0.08, 2, 14)
      const score = clamp(quality * 0.68 + pairFit * 22 + runtimeFit)
      const secondGenreSet = new Set(second.genreIds)
      const sharedGenres = readableGenres(first.genreIds.filter(id => secondGenreSet.has(id)), 3)
      const reason = style === 'cohesive'
        ? sharedGenres.length > 0
          ? `${sharedGenres.join(' and ')} carry one mood across both films.`
          : 'A steady quality pairing with a subtle tonal handoff.'
        : sharedGenres.length === 0
          ? 'A clean genre switch keeps the second film feeling fresh.'
          : `Shared ${sharedGenres[0]} DNA, then a turn into different territory.`

      pairs.push({
        first,
        second,
        score: Math.round(score),
        totalRuntime,
        sharedGenres,
        reason,
      })
    }
  }

  return pairs.sort((a, b) => b.score - a.score || a.first.title.localeCompare(b.first.title)).slice(0, 12)
}

export function buildProTasteReport(
  ratings: ProRatingSignal[],
  preferredGenres: string[],
): ProTasteReport {
  const genreBuckets = new Map<number, number[]>()
  for (const rating of ratings) {
    for (const genreId of new Set(rating.genreIds)) {
      const bucket = genreBuckets.get(genreId) ?? []
      bucket.push(rating.score)
      genreBuckets.set(genreId, bucket)
    }
  }

  const genreStats = Array.from(genreBuckets.entries())
    .map(([genreId, scores]) => ({
      genreId,
      genre: PRO_GENRE_NAMES[genreId] ?? 'Other',
      count: scores.length,
      averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    }))
    .sort((a, b) => {
      const aReliability = Math.min(a.count, 4) * 5
      const bReliability = Math.min(b.count, 4) * 5
      return (b.averageScore + bReliability) - (a.averageScore + aReliability) || b.count - a.count
    })

  const reliableGenres = genreStats.filter(stat => stat.count >= 2)
  const strongestLane = (reliableGenres[0] ?? genreStats[0]) ?? null
  const sampledGenreIds = new Set(genreStats.map(stat => stat.genreId))
  const preferredIds = preferredGenres
    .map(genre => GENRE_IDS_BY_NAME.get(genre.toLowerCase()))
    .filter((id): id is number => id !== undefined)
  const blindSpotId = preferredIds.find(id => !sampledGenreIds.has(id))
  const blindSpot = blindSpotId !== undefined ? PRO_GENRE_NAMES[blindSpotId] : null

  const dimensionStats = DIMENSIONS.map(dimension => {
    const values = ratings
      .map(rating => rating[dimension.key])
      .filter((value): value is number => typeof value === 'number')
    return {
      label: dimension.label,
      average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
      count: values.length,
    }
  }).filter(dimension => dimension.count > 0)
    .sort((a, b) => b.average - a.average || b.count - a.count)

  const topDimension = dimensionStats[0]
    ? { ...dimensionStats[0], average: Number(dimensionStats[0].average.toFixed(1)) }
    : null
  const averageScore = ratings.length
    ? Math.round(ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length)
    : null
  const scoreSpread = averageScore === null
    ? null
    : Math.round(Math.sqrt(
      ratings.reduce((sum, rating) => sum + Math.pow(rating.score - averageScore, 2), 0) / ratings.length,
    ))
  const dimensionCoverage = ratings.length === 0
    ? 0
    : dimensionStats.reduce((sum, dimension) => sum + dimension.count, 0) / (ratings.length * DIMENSIONS.length)
  const calibration = Math.round(clamp(
    ratings.length * 3.2 + genreStats.length * 4 + dimensionCoverage * 24,
    0,
    100,
  ))
  const calibrationLabel = calibration >= 80
    ? 'Deep read'
    : calibration >= 55
      ? 'Well defined'
      : calibration >= 30
        ? 'Taking shape'
        : 'Early read'

  let nextSignal: string
  if (ratings.length < 5) {
    const remaining = 5 - ratings.length
    nextSignal = `Rate ${remaining} more ${remaining === 1 ? 'film' : 'films'} to sharpen your first reliable taste lane.`
  } else if (blindSpot) {
    nextSignal = `You picked ${blindSpot} as an interest but have not rated one yet. Two ratings would test that signal.`
  } else if (dimensionCoverage < 0.4) {
    nextSignal = 'Add detailed scores to your next two ratings so Taste Lab can see what craft you value most.'
  } else {
    nextSignal = 'Rate one film outside your usual genres next; contrast makes every existing signal more precise.'
  }

  return {
    calibration,
    calibrationLabel,
    ratingCount: ratings.length,
    averageScore,
    scoreSpread,
    genreCount: genreStats.length,
    strongestLane: strongestLane ? {
      genre: strongestLane.genre,
      averageScore: strongestLane.averageScore,
      count: strongestLane.count,
    } : null,
    blindSpot,
    topDimension,
    nextSignal,
  }
}
