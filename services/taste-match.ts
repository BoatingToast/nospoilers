/**
 * Taste Match Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Calculates a 0–100% taste compatibility score between two users.
 *
 * Algorithm:
 *  1. DNA distance (60% weight) — normalised Euclidean distance across 7 DNA dims
 *  2. Genre overlap (25% weight) — Jaccard similarity of preferred genres
 *  3. Pacing / tone preferences (15% weight) — exact-match bonuses from onboarding prefs
 *
 * Returns null when either user lacks a TasteProfile (insufficient data).
 */

export interface DNAVector {
  suspenseScore:        number
  emotionalImpactScore: number
  complexityScore:      number
  humorScore:           number
  realismScore:         number
  actionScore:          number
  darknessScore:        number
}

export interface TasteMatchInput {
  dna:    DNAVector | null
  genres: string[]   // e.g. ['Drama', 'Sci-Fi', 'Thriller']
  pacing?:  string | null
  tone?:    string | null
}

const DNA_DIMS: (keyof DNAVector)[] = [
  'suspenseScore',
  'emotionalImpactScore',
  'complexityScore',
  'humorScore',
  'realismScore',
  'actionScore',
  'darknessScore',
]

// Max possible Euclidean distance: sqrt(7 * (10-1)^2) ≈ 23.81
const MAX_DNA_DISTANCE = Math.sqrt(DNA_DIMS.length * Math.pow(9, 2))

/** Normalised Euclidean similarity: 1 at identical, 0 at maximum divergence */
function dnaSimilarity(a: DNAVector, b: DNAVector): number {
  const sumSq = DNA_DIMS.reduce((acc, k) => acc + Math.pow(a[k] - b[k], 2), 0)
  return 1 - Math.sqrt(sumSq) / MAX_DNA_DISTANCE
}

/** Jaccard similarity: |intersection| / |union| */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1
  const setA = new Set(a.map(g => g.toLowerCase()))
  const setB = new Set(b.map(g => g.toLowerCase()))
  const intersection = [...setA].filter(g => setB.has(g)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Computes taste match between two users.
 * Returns a 0–100 integer, or null if DNA data is unavailable for either.
 */
export function computeTasteMatch(me: TasteMatchInput, other: TasteMatchInput): number | null {
  // DNA is the primary signal — if either user lacks it, we can still estimate
  // from genres alone, but mark as lower confidence
  let score = 0

  if (me.dna && other.dna) {
    // 60% from DNA similarity
    score += dnaSimilarity(me.dna, other.dna) * 60
  } else {
    // No DNA: redistribute the DNA weight to genres
    // (genres will contribute up to 85% instead of 25%)
    const genreScore = jaccardSimilarity(me.genres, other.genres)
    return Math.round(genreScore * 85)
  }

  // 25% from genre overlap
  score += jaccardSimilarity(me.genres, other.genres) * 25

  // 15% from pacing + tone matches
  let prefScore = 0
  if (me.pacing && other.pacing && me.pacing === other.pacing)  prefScore += 50
  if (me.tone   && other.tone   && me.tone   === other.tone)    prefScore += 50
  score += (prefScore / 100) * 15

  return Math.round(Math.max(0, Math.min(100, score)))
}

/** Convenience: extracts TasteMatchInput from the nested Prisma result shape */
export function extractTasteInput(user: {
  tasteProfile?: {
    suspenseScore:        number
    emotionalImpactScore: number
    complexityScore:      number
    humorScore:           number
    realismScore:         number
    actionScore:          number
    darknessScore:        number
  } | null
  preferences?: { genres: string[]; pacing?: string; tone?: string } | null
}): TasteMatchInput {
  return {
    dna:    user.tasteProfile ?? null,
    genres: user.preferences?.genres ?? [],
    pacing: user.preferences?.pacing ?? null,
    tone:   user.preferences?.tone   ?? null,
  }
}
