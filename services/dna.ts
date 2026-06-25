import type { DNAScores, OnboardingMovieInput, PreferencesInput } from '@/types'

// ─── Film signature database ──────────────────────────────────────────────────
// Curated adjustments for well-known films (delta from neutral 5.0 baseline)
export const FILM_SIGNATURES: Record<number, Partial<DNAScores>> = {
  // Psychological / intellectual
  157336: { complexityScore: 3,   emotionalImpactScore: 2.5, suspenseScore: 1   }, // Interstellar
  496243: { complexityScore: 2.5, emotionalImpactScore: 2,   suspenseScore: 2,   darknessScore: 2   }, // Parasite
  244786: { complexityScore: 1.5, emotionalImpactScore: 3,   suspenseScore: 2,   darknessScore: 1.5 }, // Whiplash
  27205:  { complexityScore: 3,   suspenseScore: 2,           actionScore: 1   }, // Inception
  62:     { complexityScore: 3.5, realismScore: -1,           suspenseScore: 1.5 }, // 2001: A Space Odyssey
  1018:   { complexityScore: 3.5, suspenseScore: 1.5,         darknessScore: 2   }, // Mulholland Drive
  335984: { complexityScore: 2.5, realismScore: 1.5,          emotionalImpactScore: 2, darknessScore: 1.5 }, // Blade Runner 2049

  // Dark / intense drama
  155:    { suspenseScore: 3,    darknessScore: 2.5, complexityScore: 1.5, actionScore: 2   }, // The Dark Knight
  550:    { complexityScore: 2.5, darknessScore: 2.5, suspenseScore: 2,   emotionalImpactScore: 1.5 }, // Fight Club
  1152:   { complexityScore: 2.5, emotionalImpactScore: 2.5, darknessScore: 2, realismScore: 2 }, // There Will Be Blood
  475557: { darknessScore: 3,    complexityScore: 2,  emotionalImpactScore: 2.5, realismScore: 1 }, // Joker
  6977:   { suspenseScore: 3,    darknessScore: 3,    realismScore: 2,    complexityScore: 1.5 }, // No Country for Old Men

  // Emotional / grounded drama
  278:    { emotionalImpactScore: 3,  realismScore: 2,    complexityScore: 1   }, // Shawshank Redemption
  238:    { complexityScore: 2.5, darknessScore: 2,    emotionalImpactScore: 2, realismScore: 1.5 }, // The Godfather
  240:    { complexityScore: 2.5, darknessScore: 2,    emotionalImpactScore: 2.5, realismScore: 1.5 }, // Godfather II
  530915: { realismScore: 2.5,   suspenseScore: 2.5,  emotionalImpactScore: 2, actionScore: 1.5 }, // 1917
  374720: { realismScore: 2.5,   suspenseScore: 3,    actionScore: 2            }, // Dunkirk

  // Horror / thriller
  419430: { suspenseScore: 3,    darknessScore: 2,    complexityScore: 1.5, emotionalImpactScore: 1.5 }, // Get Out
  493922: { darknessScore: 3,    suspenseScore: 2.5,  emotionalImpactScore: 2  }, // Hereditary
  539885: { darknessScore: 2.5,  suspenseScore: 2.5,  emotionalImpactScore: 1.5 }, // Midsommar

  // Crime / thriller
  680:    { complexityScore: 2,  darknessScore: 1.5,  suspenseScore: 1.5, humorScore: 1 }, // Pulp Fiction
  769:    { realismScore: 2.5,   darknessScore: 1.5,  suspenseScore: 1.5, emotionalImpactScore: 1.5 }, // Goodfellas
  1422:   { emotionalImpactScore: 2.5, realismScore: 2, complexityScore: 1.5, darknessScore: 1 }, // The Departed

  // Action / sci-fi
  603:    { actionScore: 2.5,    complexityScore: 2,  suspenseScore: 1.5 }, // The Matrix
  76341:  { actionScore: 3,      suspenseScore: 2,    darknessScore: 1.5 }, // Mad Max Fury Road
  299534: { actionScore: 2.5,    emotionalImpactScore: 2, humorScore: 1  }, // Avengers Endgame
  24428:  { actionScore: 2,      humorScore: 1.5,     emotionalImpactScore: 1 }, // The Avengers

  // Comedy / lighter fare
  120467: { humorScore: 2.5,     complexityScore: 1,  realismScore: -1   }, // The Grand Budapest Hotel
  8363:   { humorScore: 3,       realismScore: 1,     darknessScore: -1.5 }, // Superbad
  10625:  { humorScore: 3,       emotionalImpactScore: 1.5               }, // Ferris Bueller
  334543: { humorScore: 2.5,     emotionalImpactScore: 2                 }, // Three Billboards

  // Romantic / emotional
  313369: { emotionalImpactScore: 2.5, humorScore: 1, darknessScore: -0.5 }, // La La Land
  14160:  { emotionalImpactScore: 3,   humorScore: 1.5, darknessScore: -1  }, // Up
  508442: { emotionalImpactScore: 2.5, humorScore: 2,  darknessScore: -0.5 }, // Soul

  // Documentary-adjacent / realism
  49051:  { realismScore: 2,     complexityScore: 1.5, emotionalImpactScore: 1.5 }, // The Hobbit
  121:    { actionScore: 1.5,    emotionalImpactScore: 2, complexityScore: 1.5   }, // LOTR Fellowship
}

// ─── Genre ID → trait influences ─────────────────────────────────────────────
export const GENRE_TRAIT_MAP: Record<number, Partial<DNAScores>> = {
  28:    { actionScore: 1.5,    suspenseScore: 0.5  },                    // Action
  12:    { actionScore: 1,      emotionalImpactScore: 0.5 },              // Adventure
  16:    { humorScore: 0.5,     emotionalImpactScore: 0.5 },              // Animation
  35:    { humorScore: 1.5,     darknessScore: -0.5 },                    // Comedy
  80:    { darknessScore: 1,    suspenseScore: 1,   realismScore: 0.5 },  // Crime
  99:    { realismScore: 2,     complexityScore: 0.5 },                   // Documentary
  18:    { emotionalImpactScore: 1.5, realismScore: 0.5 },                // Drama
  14:    { complexityScore: 0.5, realismScore: -0.5 },                    // Fantasy
  36:    { realismScore: 1,     complexityScore: 0.5 },                   // History
  27:    { darknessScore: 1.5,  suspenseScore: 1.5  },                    // Horror
  9648:  { suspenseScore: 1.5,  complexityScore: 1  },                    // Mystery
  10749: { emotionalImpactScore: 1, darknessScore: -0.5 },               // Romance
  878:   { complexityScore: 1,  realismScore: -0.5  },                    // Sci-Fi
  53:    { suspenseScore: 1.5,  darknessScore: 0.5  },                    // Thriller
  10752: { realismScore: 1.5,   darknessScore: 1,   emotionalImpactScore: 1 }, // War
  37:    { realismScore: 1,     actionScore: 1      },                    // Western
}

// ─── Genre preference labels → trait influences ───────────────────────────────
const GENRE_PREF_MAP: Record<string, Partial<DNAScores>> = {
  drama:       { emotionalImpactScore: 1.5, realismScore: 0.5 },
  thriller:    { suspenseScore: 1.5,        darknessScore: 0.5 },
  crime:       { darknessScore: 1,          suspenseScore: 1,   realismScore: 0.5 },
  'sci-fi':    { complexityScore: 1,        realismScore: -0.5 },
  horror:      { darknessScore: 1.5,        suspenseScore: 1.5 },
  comedy:      { humorScore: 2,             darknessScore: -0.5 },
  action:      { actionScore: 1.5,          suspenseScore: 0.5 },
  romance:     { emotionalImpactScore: 1,   darknessScore: -0.5 },
  mystery:     { suspenseScore: 1.5,        complexityScore: 1 },
  documentary: { realismScore: 2,           complexityScore: 0.5 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v: number, lo = 1, hi = 10): number {
  return Math.max(lo, Math.min(hi, v))
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function apply(scores: DNAScores, delta: Partial<DNAScores>, weight = 1) {
  for (const key of Object.keys(delta) as (keyof DNAScores)[]) {
    scores[key] += (delta[key] ?? 0) * weight
  }
}

// ─── Main algorithm ───────────────────────────────────────────────────────────
export function generateDNA(
  movies: OnboardingMovieInput[],
  preferences: PreferencesInput
): DNAScores {
  const scores: DNAScores = {
    suspenseScore:        5,
    emotionalImpactScore: 5,
    complexityScore:      5,
    humorScore:           5,
    realismScore:         5,
    actionScore:          5,
    darknessScore:        5,
  }

  // 1 ── Questionnaire (highest weight — this is what the user explicitly told us) ──
  const { pacing, endings, storytelling, tone, complexity, plotTwists } = preferences

  if (pacing === 'slow_burn') {
    apply(scores, { complexityScore: 2, suspenseScore: 0.5 })
  } else if (pacing === 'fast_paced') {
    apply(scores, { actionScore: 2, complexityScore: -1 })
  }

  if (endings === 'ambiguous') {
    apply(scores, { complexityScore: 2, suspenseScore: 0.5 })
  } else if (endings === 'happy') {
    apply(scores, { humorScore: 0.5, darknessScore: -0.5 })
  } else if (endings === 'bittersweet') {
    apply(scores, { emotionalImpactScore: 1.5, darknessScore: 0.5 })
  }

  if (storytelling === 'characters') {
    apply(scores, { emotionalImpactScore: 2, realismScore: 0.5 })
  } else if (storytelling === 'plot') {
    apply(scores, { complexityScore: 1.5, suspenseScore: 0.5 })
  } else {
    apply(scores, { complexityScore: 0.5, emotionalImpactScore: 0.5 })
  }

  if (tone === 'dark') {
    apply(scores, { darknessScore: 2.5, emotionalImpactScore: 1 })
  } else if (tone === 'lighthearted') {
    apply(scores, { humorScore: 2, darknessScore: -1.5 })
  }

  // Sliders: map 1–10 onto a ±2 range around 0
  const complexityDelta  = ((complexity - 5) / 5) * 2
  const plotTwistsDelta  = ((plotTwists - 5) / 5) * 2
  apply(scores, { complexityScore: complexityDelta })
  apply(scores, { suspenseScore: plotTwistsDelta, complexityScore: plotTwistsDelta * 0.5 })

  // 2 ── Genre preferences ───────────────────────────────────────────────────
  for (const genre of preferences.genres) {
    const delta = GENRE_PREF_MAP[genre.toLowerCase()]
    if (delta) apply(scores, delta, 0.6)
  }

  // 3 ── Movie selections ────────────────────────────────────────────────────
  const movieWeight = 1 / Math.max(movies.length, 1)

  for (const movie of movies) {
    const sig = FILM_SIGNATURES[movie.tmdbId]
    if (sig) {
      // Known film — use curated signature
      apply(scores, sig, movieWeight * 0.7)
    } else {
      // Unknown film — derive from genre IDs
      for (const genreId of (movie.genreIds ?? [])) {
        const delta = GENRE_TRAIT_MAP[genreId]
        if (delta) apply(scores, delta, movieWeight * 0.4)
      }
    }
  }

  // 4 ── Clamp + round ───────────────────────────────────────────────────────
  const result = {} as DNAScores
  for (const key of Object.keys(scores) as (keyof DNAScores)[]) {
    result[key] = round1(clamp(scores[key]))
  }
  return result
}

// ─── Taste summary text ───────────────────────────────────────────────────────
export function generateTasteSummary(scores: DNAScores): string {
  type Trait = { key: keyof DNAScores; high: string; low: string; threshold: number }

  const traits: Trait[] = [
    { key: 'complexityScore',      high: 'intellectually demanding',  low: 'accessible',      threshold: 6.5 },
    { key: 'emotionalImpactScore', high: 'emotionally powerful',      low: '',                threshold: 6.5 },
    { key: 'suspenseScore',        high: 'edge-of-your-seat tense',   low: '',                threshold: 7   },
    { key: 'darknessScore',        high: 'dark and intense',          low: 'uplifting',       threshold: 6.5 },
    { key: 'humorScore',           high: 'funny',                     low: '',                threshold: 7   },
    { key: 'actionScore',          high: 'action-packed',             low: '',                threshold: 7   },
    { key: 'realismScore',         high: 'grounded and realistic',    low: '',                threshold: 7   },
  ]

  const descriptors: string[] = []
  for (const t of traits) {
    if (scores[t.key] >= t.threshold && t.high) descriptors.push(t.high)
    else if (scores[t.key] <= 10 - t.threshold && t.low) descriptors.push(t.low)
  }

  if (descriptors.length === 0) {
    return 'You have broad, eclectic tastes — you appreciate all kinds of films.'
  }
  if (descriptors.length === 1) {
    return `You tend to gravitate toward ${descriptors[0]} films.`
  }
  if (descriptors.length === 2) {
    return `You tend to enjoy ${descriptors[0]}, ${descriptors[1]} films with strong storytelling.`
  }
  return `You tend to enjoy ${descriptors.slice(0, -1).join(', ')}, and ${descriptors[descriptors.length - 1]} films with strong storytelling.`
}

// ─── Estimate a movie's DNA from its TMDb data ────────────────────────────────
// Used by both the recommendation engine and the movie detail vibe profile.
export function estimateMovieDNA(tmdbId: number, genreIds: number[]): DNAScores {
  const scores: DNAScores = {
    suspenseScore: 5, emotionalImpactScore: 5, complexityScore: 5,
    humorScore: 5, realismScore: 5, actionScore: 5, darknessScore: 5,
  }

  // Prefer curated signature when available
  const sig = FILM_SIGNATURES[tmdbId]
  if (sig) {
    for (const key of Object.keys(sig) as (keyof DNAScores)[]) {
      scores[key] = clamp(scores[key] + (sig[key] ?? 0))
    }
    return scores
  }

  // Fallback: derive from genre IDs
  for (const genreId of (genreIds ?? [])) {
    const delta = GENRE_TRAIT_MAP[genreId]
    if (delta) {
      for (const key of Object.keys(delta) as (keyof DNAScores)[]) {
        scores[key] = clamp(scores[key] + (delta[key] ?? 0) * 0.8)
      }
    }
  }

  return scores
}
