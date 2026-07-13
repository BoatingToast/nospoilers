import type { DNAScores } from '../types'

/**
 * Pure Movie DNA v2 scoring engine.
 *
 * The result depends only on the evidence passed to this function. Persisted
 * TasteProfile values are deliberately not an input, which makes recalculation
 * idempotent and makes deleting evidence fully reversible.
 */

export const DNA_DIMENSIONS: (keyof DNAScores)[] = [
  'suspenseScore',
  'emotionalImpactScore',
  'complexityScore',
  'humorScore',
  'realismScore',
  'actionScore',
  'darknessScore',
]

export const NEUTRAL_DNA: DNAScores = {
  suspenseScore: 5,
  emotionalImpactScore: 5,
  complexityScore: 5,
  humorScore: 5,
  realismScore: 5,
  actionScore: 5,
  darknessScore: 5,
}

export interface RatingDnaEvidence {
  vibe: DNAScores
  /** User's explicit rating on the app's 1–100 scale. */
  score: number
  /** Reliability of this evidence. Full ratings use 1; review-only evidence is lower. */
  confidence?: number
}

export interface TopFiveDnaEvidence {
  vibe: DNAScores
  weight: number
}

export interface DeterministicDnaInput {
  baseline: DNAScores
  ratings: RatingDnaEvidence[]
  topFive: TopFiveDnaEvidence[]
}

export interface RatingAffinity {
  absolute: number
  relative: number
  combined: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Convert raw ratings into preference strengths.
 *
 * With little history, the app-wide neutral point (60) carries the signal.
 * As history grows, the user's own average and spread increasingly matter. A
 * generous rater's 75 and a harsh rater's 75 therefore stop meaning the same
 * thing, without making the first few ratings unstable.
 */
export function calculateRatingAffinities(
  scores: number[],
  confidences: number[] = scores.map(() => 1),
): RatingAffinity[] {
  if (scores.length === 0) return []

  const bounded = scores.map(score => clamp(score, 1, 100))
  const weights = bounded.map((_, index) => clamp(confidences[index] ?? 1, 0, 1))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1
  const mean = bounded.reduce((sum, score, index) => sum + score * weights[index], 0) / totalWeight
  const variance = bounded.reduce(
    (sum, score, index) => sum + (score - mean) ** 2 * weights[index],
    0,
  ) / totalWeight
  const spread = Math.max(8, Math.sqrt(variance))

  // Relative normalization becomes useful at 3 ratings and tops out at 70%.
  const relativeShare = totalWeight < 3
    ? 0
    : Math.min(0.7, 0.15 + (totalWeight - 3) * 0.061)

  return bounded.map(score => {
    const absolute = clamp((score - 60) / 35, -1.25, 1.25)
    const relative = totalWeight < 3
      ? 0
      : clamp((score - mean) / spread, -1.25, 1.25)
    const combined = clamp(
      absolute * (1 - relativeShare) + relative * relativeShare,
      -1.25,
      1.25,
    )
    return { absolute, relative, combined }
  })
}

function ratingShare(count: number): number {
  if (count === 0) return 0
  // One rating is useful but modest; confidence approaches 58% with history.
  return Math.min(0.58, 0.18 + 0.4 * (1 - Math.exp(-(count - 1) / 7)))
}

function topFiveShare(count: number): number {
  // Explicit favourites are a strong anchor, capped so observed ratings can refine them.
  return Math.min(0.3, count * 0.06)
}

function ratingTarget(
  ratings: RatingDnaEvidence[],
  affinities: RatingAffinity[],
  dim: keyof DNAScores,
): number {
  let sum = 0
  let totalConfidence = 0

  ratings.forEach((rating, index) => {
    const confidence = clamp(rating.confidence ?? 1, 0, 1)
    sum += affinities[index].combined * (rating.vibe[dim] - 5) * confidence
    totalConfidence += confidence
  })

  if (totalConfidence === 0) return 5
  return clamp(5 + sum / totalConfidence, 1, 10)
}

function topFiveTarget(topFive: TopFiveDnaEvidence[], dim: keyof DNAScores): number {
  const totalWeight = topFive.reduce((sum, movie) => sum + Math.max(0, movie.weight), 0)
  if (totalWeight === 0) return 5
  return clamp(
    topFive.reduce((sum, movie) => sum + movie.vibe[dim] * Math.max(0, movie.weight), 0) / totalWeight,
    1,
    10,
  )
}

export function computeDeterministicDNA(input: DeterministicDnaInput): DNAScores {
  const confidences = input.ratings.map(rating => clamp(rating.confidence ?? 1, 0, 1))
  const effectiveRatingCount = confidences.reduce((sum, confidence) => sum + confidence, 0)
  const affinities = calculateRatingAffinities(
    input.ratings.map(rating => rating.score),
    confidences,
  )
  const ratingsWeight = ratingShare(effectiveRatingCount)
  const topFiveWeight = topFiveShare(input.topFive.length)
  const baselineWeight = 1 - ratingsWeight - topFiveWeight

  return Object.fromEntries(DNA_DIMENSIONS.map(dim => {
    const value =
      clamp(input.baseline[dim], 1, 10) * baselineWeight +
      ratingTarget(input.ratings, affinities, dim) * ratingsWeight +
      topFiveTarget(input.topFive, dim) * topFiveWeight

    return [dim, round2(clamp(value, 1, 10))]
  })) as unknown as DNAScores
}

const REVIEW_TRAIT_TERMS: { key: keyof DNAScores; terms: string[] }[] = [
  {
    key: 'complexityScore',
    terms: ['complex', 'layered', 'nuanced', 'deep', 'intricate', 'thought-provoking',
      'cerebral', 'philosophical', 'multi-layered', 'dense', 'sophisticated',
      'intelligent', 'profound', 'rich narrative', 'subtlety', 'subtext'],
  },
  {
    key: 'emotionalImpactScore',
    terms: ['emotional', 'moving', 'heartbreaking', 'tears', 'cried', 'powerful',
      'touching', 'poignant', 'devastating', 'beautiful', 'stirring', 'gut-wrenching',
      'uplifting', 'resonant', 'deeply felt', 'haunting'],
  },
  {
    key: 'actionScore',
    terms: ['action', 'exciting', 'fast-paced', 'adrenaline', 'explosive', 'spectacle',
      'thrilling action', 'chase', 'fight scene', 'intense sequences', 'kinetic'],
  },
  {
    key: 'humorScore',
    terms: ['funny', 'hilarious', 'witty', 'comedy', 'laugh', 'clever humor', 'charming',
      'delightful', 'quirky', 'playful', 'light-hearted', 'amusing', 'comedic'],
  },
  {
    key: 'suspenseScore',
    terms: ['tense', 'suspense', 'edge of my seat', 'gripping', 'nail-biting',
      "couldn't stop", 'unpredictable', 'mystery', 'kept me guessing', 'twist',
      'dread', 'mounting tension', 'anticipation'],
  },
  {
    key: 'darknessScore',
    terms: ['dark', 'gritty', 'disturbing', 'bleak', 'unsettling', 'brutal', 'harrowing',
      'nihilistic', 'oppressive', 'visceral', 'hard to watch', 'trauma', 'heavy', 'pitch black'],
  },
  {
    key: 'realismScore',
    terms: ['realistic', 'authentic', 'genuine', 'true to life', 'believable', 'grounded',
      'naturalistic', 'documentary-like', 'raw', 'honest', 'real performances', 'lifelike'],
  },
]

/** Extract movie traits from review prose on the same 1–10 scale as DNA. */
export function analyzeReviewTraits(body: string): Partial<Record<keyof DNAScores, number>> {
  const text = body.toLowerCase()
  const traits: Partial<Record<keyof DNAScores, number>> = {}

  for (const { key, terms } of REVIEW_TRAIT_TERMS) {
    const hits = terms.filter(term => text.includes(term)).length
    if (hits > 0) traits[key] = Math.min(10, 5 + hits * 1.25)
  }

  return traits
}

/** Review/sub-rating descriptions refine what the movie is, not the user's score. */
export function applyTraitEvidence(
  vibe: DNAScores,
  traits: Partial<Record<keyof DNAScores, number>>,
  weight = 0.45,
): DNAScores {
  const refined = { ...vibe }
  const boundedWeight = clamp(weight, 0, 1)

  for (const dim of DNA_DIMENSIONS) {
    const trait = traits[dim]
    if (trait === undefined) continue
    refined[dim] = round2(clamp(
      vibe[dim] * (1 - boundedWeight) + clamp(trait, 1, 10) * boundedWeight,
      1,
      10,
    ))
  }

  return refined
}
