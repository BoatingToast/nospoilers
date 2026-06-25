/**
 * Movie Vibe Engine
 * ─────────────────
 * Produces a DNAScores object for any TMDb movie using a multi-signal approach:
 *
 *   Priority 1 — FILM_SIGNATURES: hand-curated deltas for ~50 well-known films.
 *                Applied as offsets from the 5.0 baseline and returned immediately.
 *
 *   Priority 2 — Computed from metadata (runs for all other films):
 *     a. Genre IDs      — GENRE_TRAIT_MAP deltas (strongest per-signal)
 *     b. Keywords       — 80+ keyword → trait mappings (fetched from TMDb)
 *     c. Runtime        — short films lean lighter; epics lean complex/emotional
 *     d. Vote average   — critically acclaimed films get a quality lift
 *     e. Popularity     — blockbusters lean action/humor; arthouse leans complex
 *     f. Language       — non-English films lean realism/complexity
 *     g. Release era    — golden-era films lean complex; modern blockbusters lean action
 *     h. Budget signal  — tentpoles lean action; micro-budget leans realism
 *
 * Results are cached in-process (Map<tmdbId, DNAScores>) so repeated page renders
 * in the same server process pay zero recomputation cost. The TMDb fetch layer
 * already caches raw API responses across requests via Next.js fetch caching.
 */

import type { DNAScores } from '@/types'
import { FILM_SIGNATURES, GENRE_TRAIT_MAP } from './dna'

// ─── In-process cache ─────────────────────────────────────────────────────────
// Key: `${tmdbId}` — scores are deterministic from metadata so one entry per movie.
const _cache = new Map<number, DNAScores>()

// ─── Keyword → trait influence map ───────────────────────────────────────────
// Each entry is a partial DNAScores delta added when the keyword is present.
// Weights are intentionally modest (0.5–2.0) because many keywords stack.
const KEYWORD_TRAIT_MAP: Record<string, Partial<DNAScores>> = {
  // ── Darkness / violence ───────────────────────────────────────────────────
  'violence':                  { darknessScore: 1.5,  suspenseScore: 0.5  },
  'murder':                    { darknessScore: 1.2,  suspenseScore: 1.0  },
  'death':                     { darknessScore: 0.8,  emotionalImpactScore: 0.6 },
  'blood':                     { darknessScore: 1.0                        },
  'gore':                      { darknessScore: 1.5                        },
  'torture':                   { darknessScore: 1.8,  suspenseScore: 0.8  },
  'serial killer':             { darknessScore: 1.5,  suspenseScore: 1.5  },
  'psychopath':                { darknessScore: 1.3,  suspenseScore: 1.2  },
  'suicide':                   { darknessScore: 1.5,  emotionalImpactScore: 1.0 },
  'drugs':                     { darknessScore: 0.8,  realismScore: 0.5   },
  'addiction':                 { darknessScore: 1.0,  realismScore: 0.8,  emotionalImpactScore: 0.8 },
  'rape':                      { darknessScore: 2.0,  emotionalImpactScore: 1.5 },
  'abuse':                     { darknessScore: 1.5,  emotionalImpactScore: 1.2 },
  'tragedy':                   { darknessScore: 1.2,  emotionalImpactScore: 1.5 },
  'dystopia':                  { darknessScore: 1.2,  complexityScore: 0.8 },
  'post-apocalyptic':          { darknessScore: 1.2,  actionScore: 0.5    },
  'apocalypse':                { darknessScore: 1.0,  actionScore: 0.5    },

  // ── Suspense / thriller ────────────────────────────────────────────────────
  'chase':                     { suspenseScore: 1.2,  actionScore: 0.5    },
  'spy':                       { suspenseScore: 1.0,  actionScore: 0.5    },
  'heist':                     { suspenseScore: 1.2,  actionScore: 0.5,   complexityScore: 0.5 },
  'conspiracy':                { suspenseScore: 1.2,  complexityScore: 0.8 },
  'betrayal':                  { suspenseScore: 1.0,  emotionalImpactScore: 0.8, darknessScore: 0.5 },
  'plot twist':                { suspenseScore: 1.2,  complexityScore: 0.8 },
  'twist ending':              { suspenseScore: 1.0,  complexityScore: 1.0 },
  'whodunit':                  { suspenseScore: 1.5,  complexityScore: 1.0 },
  'investigation':             { suspenseScore: 1.0,  complexityScore: 0.5 },
  'escape':                    { suspenseScore: 1.0,  actionScore: 0.5    },
  'kidnapping':                { suspenseScore: 1.2,  darknessScore: 0.8  },
  'hostage':                   { suspenseScore: 1.5,  darknessScore: 0.8  },
  'paranoia':                  { suspenseScore: 1.2,  complexityScore: 0.8, darknessScore: 0.5 },

  // ── Complexity / intellect ─────────────────────────────────────────────────
  'nonlinear narrative':       { complexityScore: 2.0, suspenseScore: 0.5  },
  'time travel':               { complexityScore: 1.8, suspenseScore: 0.5  },
  'multiple timelines':        { complexityScore: 1.8                       },
  'unreliable narrator':       { complexityScore: 1.5, suspenseScore: 0.8  },
  'surrealism':                { complexityScore: 2.0, realismScore: -1.0  },
  'philosophical':             { complexityScore: 1.5                       },
  'existentialism':            { complexityScore: 1.8                       },
  'political':                 { complexityScore: 0.8, realismScore: 0.5   },
  'social commentary':         { complexityScore: 0.8, realismScore: 0.8   },
  'satire':                    { complexityScore: 0.8, humorScore: 1.0     },
  'psychological thriller':    { complexityScore: 1.5, suspenseScore: 1.5, darknessScore: 0.5 },
  'mind game':                 { complexityScore: 1.5, suspenseScore: 0.8  },
  'artificial intelligence':   { complexityScore: 1.2                       },
  'alternate history':         { complexityScore: 1.0                       },
  'alternate reality':         { complexityScore: 1.2, realismScore: -0.5  },
  'based on novel or book':    { complexityScore: 0.5, emotionalImpactScore: 0.5 },

  // ── Action / spectacle ─────────────────────────────────────────────────────
  'superhero':                 { actionScore: 1.5,    complexityScore: -0.5 },
  'martial arts':              { actionScore: 1.8                            },
  'kung fu':                   { actionScore: 1.8                            },
  'car chase':                 { actionScore: 1.5                            },
  'explosion':                 { actionScore: 1.2                            },
  'shootout':                  { actionScore: 1.5                            },
  'gunfight':                  { actionScore: 1.5                            },
  'battle':                    { actionScore: 1.5,    darknessScore: 0.5    },
  'war':                       { actionScore: 1.2,    darknessScore: 1.0,   realismScore: 0.5 },
  'combat':                    { actionScore: 1.5                            },
  'soldiers':                  { actionScore: 1.0,    realismScore: 0.5,    darknessScore: 0.5 },
  'space opera':               { actionScore: 1.0,    complexityScore: 0.5  },
  'blockbuster':               { actionScore: 0.8                            },

  // ── Humor ─────────────────────────────────────────────────────────────────
  'comedy':                    { humorScore: 1.0                            },
  'slapstick comedy':          { humorScore: 1.5,    darknessScore: -0.5   },
  'parody':                    { humorScore: 1.5,    complexityScore: 0.3  },
  'spoof':                     { humorScore: 1.5                            },
  'farce':                     { humorScore: 1.2                            },
  'dark comedy':               { humorScore: 0.8,    darknessScore: 0.8    },
  'mockumentary':              { humorScore: 1.0,    realismScore: 0.5     },
  'black comedy':              { humorScore: 0.8,    darknessScore: 0.8    },
  'sarcasm':                   { humorScore: 0.5,    complexityScore: 0.3  },
  'road comedy':               { humorScore: 1.0,    emotionalImpactScore: 0.5 },

  // ── Emotion / heart ───────────────────────────────────────────────────────
  'coming of age':             { emotionalImpactScore: 1.5, humorScore: 0.3 },
  'grief':                     { emotionalImpactScore: 1.8, darknessScore: 0.5 },
  'loss':                      { emotionalImpactScore: 1.5, darknessScore: 0.5 },
  'love':                      { emotionalImpactScore: 1.0, darknessScore: -0.3 },
  'romance':                   { emotionalImpactScore: 1.0                  },
  'friendship':                { emotionalImpactScore: 1.0                  },
  'family relationships':      { emotionalImpactScore: 1.2                  },
  'father son relationship':   { emotionalImpactScore: 1.2                  },
  'mother daughter relationship': { emotionalImpactScore: 1.2               },
  'redemption':                { emotionalImpactScore: 1.5, darknessScore: 0.3 },
  'self-discovery':            { emotionalImpactScore: 1.0, complexityScore: 0.3 },
  'nostalgia':                 { emotionalImpactScore: 0.8                  },
  'holocaust':                 { emotionalImpactScore: 2.0, darknessScore: 2.0, realismScore: 1.0 },

  // ── Realism / grounded ────────────────────────────────────────────────────
  'based on true story':       { realismScore: 2.0                          },
  'based on a true story':     { realismScore: 2.0                          },
  'biographical':              { realismScore: 1.5, complexityScore: 0.3    },
  'docudrama':                 { realismScore: 2.0                          },
  'journalism':                { realismScore: 1.5, complexityScore: 0.5    },
  'working class':             { realismScore: 1.5                          },
  'poverty':                   { realismScore: 1.5, darknessScore: 0.5      },
  'immigration':               { realismScore: 1.2, emotionalImpactScore: 0.8 },
  'racism':                    { realismScore: 1.2, darknessScore: 0.5,    emotionalImpactScore: 0.8 },
  'independent film':          { realismScore: 1.0, complexityScore: 0.5   },
  'slice of life':             { realismScore: 1.5, emotionalImpactScore: 0.5 },
  'true crime':                { realismScore: 1.5, darknessScore: 1.0,    suspenseScore: 0.8 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo = 1, hi = 10): number {
  return Math.max(lo, Math.min(hi, v))
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function applyDelta(scores: DNAScores, delta: Partial<DNAScores>, weight = 1) {
  for (const key of Object.keys(delta) as (keyof DNAScores)[]) {
    scores[key] = clamp(scores[key] + (delta[key] ?? 0) * weight)
  }
}

// ─── Input type ───────────────────────────────────────────────────────────────
// Accepts any superset of TMDbMovieDetail — passes the full object in so we can
// use runtime, popularity, vote_average, language, release_date, budget, genres.
export interface MovieVibeInput {
  id:                number
  genres:            { id: number; name: string }[]
  runtime:           number | null
  vote_average:      number
  vote_count:        number
  popularity:        number
  release_date:      string       // "YYYY-MM-DD"
  original_language: string
  budget?:           number
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function computeMovieVibe(movie: MovieVibeInput, keywords: string[] = []): DNAScores {
  // ── Cache hit ──────────────────────────────────────────────────────────────
  if (_cache.has(movie.id)) return _cache.get(movie.id)!

  // ── Baseline ──────────────────────────────────────────────────────────────
  const scores: DNAScores = {
    suspenseScore:        5,
    emotionalImpactScore: 5,
    complexityScore:      5,
    humorScore:           5,
    realismScore:         5,
    actionScore:          5,
    darknessScore:        5,
  }

  // ── Priority 1: curated signature ─────────────────────────────────────────
  const sig = FILM_SIGNATURES[movie.id]
  if (sig) {
    applyDelta(scores, sig)
    const result = finalise(scores)
    _cache.set(movie.id, result)
    return result
  }

  // ── Priority 2: computed from metadata ───────────────────────────────────

  // 2a. Genre IDs — use GENRE_TRAIT_MAP with full weight
  const genreIds = movie.genres.map(g => g.id)
  for (const gid of genreIds) {
    const delta = GENRE_TRAIT_MAP[gid]
    if (delta) applyDelta(scores, delta, 1.1)  // slightly stronger than before (was 0.8)
  }

  // 2b. Keywords — stack matching keyword deltas at reduced weight
  for (const kw of keywords) {
    const delta = KEYWORD_TRAIT_MAP[kw]
    if (delta) applyDelta(scores, delta, 0.7)
  }

  // 2c. Runtime
  const rt = movie.runtime ?? 100
  if (rt < 80) {
    // Short film → lighter, less complex
    applyDelta(scores, { humorScore: 0.8, complexityScore: -0.8 })
  } else if (rt < 95) {
    applyDelta(scores, { humorScore: 0.3, complexityScore: -0.3 })
  } else if (rt >= 130 && rt < 160) {
    // Long film → more complex / emotional
    applyDelta(scores, { complexityScore: 0.8, emotionalImpactScore: 0.3 })
  } else if (rt >= 160) {
    // Epic → strongly complex and emotional
    applyDelta(scores, { complexityScore: 1.5, emotionalImpactScore: 0.7 })
  }

  // 2d. Vote average — quality signal
  const va = movie.vote_average
  if (va >= 8.5 && movie.vote_count >= 500) {
    // Critically acclaimed — push whichever trait is already leading
    const top = topTrait(scores)
    applyDelta(scores, { [top]: 0.8 } as Partial<DNAScores>)
    applyDelta(scores, { emotionalImpactScore: 0.5 })
  } else if (va >= 7.5) {
    applyDelta(scores, { emotionalImpactScore: 0.4 })
  } else if (va < 6.0) {
    // Lower-rated films tend to be crowd-pleasing action/comedy rather than thoughtful
    applyDelta(scores, { actionScore: 0.4, complexityScore: -0.4 })
  } else if (va < 5.0) {
    applyDelta(scores, { actionScore: 0.7, complexityScore: -0.7, humorScore: 0.3 })
  }

  // 2e. Popularity (TMDb's own score, typically 0–1000+)
  const pop = movie.popularity
  if (pop >= 400) {
    // Blockbuster — heavy action lean, humor boost, complexity penalty
    applyDelta(scores, { actionScore: 1.2, humorScore: 0.4, complexityScore: -0.7 })
  } else if (pop >= 100) {
    applyDelta(scores, { actionScore: 0.5, complexityScore: -0.2 })
  } else if (pop < 5) {
    // Very niche — likely arthouse
    applyDelta(scores, { complexityScore: 1.4, realismScore: 1.0 })
  } else if (pop < 15) {
    applyDelta(scores, { complexityScore: 0.8, realismScore: 0.6 })
  } else if (pop < 40) {
    applyDelta(scores, { complexityScore: 0.4, realismScore: 0.3 })
  }

  // 2f. Original language — foreign-language films lean grounded and complex
  if (movie.original_language !== 'en') {
    applyDelta(scores, { realismScore: 1.0, complexityScore: 0.5 })
  }

  // 2g. Release era
  const year = parseInt(movie.release_date?.slice(0, 4) ?? '2000', 10)
  if (!isNaN(year)) {
    if (year < 1970) {
      // Classic cinema era — slower, more contemplative
      applyDelta(scores, { complexityScore: 1.2, realismScore: 0.5, actionScore: -0.8 })
    } else if (year < 1990) {
      applyDelta(scores, { complexityScore: 0.5 })
    } else if (year >= 2010 && pop >= 150) {
      // Modern tentpole era
      applyDelta(scores, { actionScore: 0.4 })
    }
  }

  // 2h. Budget signal (budget === 0 means unknown/unreported, not literally zero-budget)
  const budget = movie.budget ?? 0
  if (budget > 150_000_000) {
    // Major studio tentpole
    applyDelta(scores, { actionScore: 0.8, complexityScore: -0.3 })
  } else if (budget > 0 && budget < 5_000_000) {
    // Low-budget — likely indie / realism-driven
    applyDelta(scores, { realismScore: 0.7, complexityScore: 0.3 })
  }

  const result = finalise(scores)
  _cache.set(movie.id, result)
  return result
}

// ─── Returns the dimension key currently with the highest score ───────────────
function topTrait(scores: DNAScores): keyof DNAScores {
  let best: keyof DNAScores = 'emotionalImpactScore'
  let bestVal = 0
  for (const key of Object.keys(scores) as (keyof DNAScores)[]) {
    if (scores[key] > bestVal) { bestVal = scores[key]; best = key }
  }
  return best
}

// ─── Clamp + round all dimensions ────────────────────────────────────────────
function finalise(scores: DNAScores): DNAScores {
  const result = {} as DNAScores
  for (const key of Object.keys(scores) as (keyof DNAScores)[]) {
    result[key] = round1(clamp(scores[key]))
  }
  return result
}

// ─── Cache management ─────────────────────────────────────────────────────────
/** Call this if you need to force a recalculation (e.g. after metadata update). */
export function invalidateVibeCache(tmdbId: number) {
  _cache.delete(tmdbId)
}

/** Wipe the entire in-process cache (useful for tests). */
export function clearVibeCache() {
  _cache.clear()
}
