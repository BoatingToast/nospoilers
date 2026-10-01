/**
 * "Why Did I Love That?" taste engine.
 *
 * Pure and dependency-free: the browser uses it for instant feedback, the
 * server uses it before saving, and node:test exercises it directly.
 *
 * The model is deliberately inspectable. A taste profile is a list of evidence
 * items. Each one says "this facet is about this attractive, with this much
 * weight, because of this". A belief per facet is the weighted mean of that
 * evidence, and its uncertainty shrinks as weight accumulates. Nothing here is
 * a calibrated probability.
 */

export const FACET_IDS = [
  'relationships',
  'ideas',
  'atmosphere',
  'momentum',
  'tension',
  'intensity',
  'humor',
  'grounding',
  'spectacle',
] as const

export type FacetId = (typeof FACET_IDS)[number]

/** How strongly a film expresses each facet, 0 (absent) to 1 (defining). */
export type FacetVector = Record<FacetId, number>

export interface TasteFilm {
  tmdbId: number
  title: string
  year: number | null
  posterPath: string | null
  genreIds: number[]
  runtime: number | null
  voteAverage: number | null
  facets: FacetVector
  /** Spoiler-safe catalog descriptors that produced each facet value. */
  tags: Partial<Record<FacetId, string[]>>
}

export interface RatedFilm extends TasteFilm {
  /** The member's 1-100 rating. */
  score: number
  /** Rating-style-normalized preference, roughly -1.25 to 1.25. */
  affinity: number
}

export type EvidenceSource = 'answer' | 'hypothesis' | 'correction' | 'tweak'

/**
 * saved   - part of the member's durable profile
 * session - learned in this visit, not yet saved
 * tweak   - a temporary "change one thing" exploration
 */
export type EvidenceScope = 'saved' | 'session' | 'tweak'

export interface TasteEvidence {
  id: string
  facet: FacetId
  /** Target preference for the facet, -1 (works against) to 1 (main draw). */
  value: number
  /** How much this observation counts. The neutral prior counts 4. */
  weight: number
  source: EvidenceSource
  scope: EvidenceScope
  /** Short provenance shown to the member. Never contains plot details. */
  note: string
  filmIds: number[]
  at: string
}

export interface FacetPrior {
  mean: number
  weight: number
  /** Liked films where this facet is clearly present. */
  filmCount: number
  /** The facet the ratings cannot separate this one from, if any. */
  tangledWith: FacetId | null
  tangle: number
}

export type RatingsPrior = Record<FacetId, FacetPrior>

export interface FacetBelief {
  facet: FacetId
  mean: number
  sd: number
  weight: number
  ratingsMean: number
  ratingsWeight: number
  explicitCount: number
  sources: Array<EvidenceSource | 'ratings'>
  tentative: boolean
}

export type TasteBelief = Record<FacetId, FacetBelief>

export interface RankedFilm {
  film: TasteFilm
  score: number
  contributions: FacetVector
  quality: number
}

export type QuestionKind = 'contrast' | 'tiebreak'
export type AnswerChoice = 'a' | 'b' | 'both' | 'neither' | 'unsure'

export interface TasteQuestion {
  id: string
  kind: QuestionKind
  /** One film for a contrast question, two for a tiebreak. */
  filmIds: number[]
  facetA: FacetId
  facetB: FacetId
  /** Expected change to the top-10 ordering, 0 (none) to 1 (fully reordered). */
  expectedChange: number
  /** What questions are ordered by: expected change, weighted by coverage and variety. */
  priority: number
  /** Expected number of top-5 slots that end up holding a different film. */
  expectedSwaps: number
  /** Liked films where both facets are clearly present. */
  coOccurCount: number
  likedCount: number
}

export interface AskedQuestion {
  id: string
  kind: QuestionKind
  filmIds: number[]
  facetA: FacetId
  facetB: FacetId
  choice: AnswerChoice
}

export type HypothesisKind = 'driver' | 'condition' | 'aversion' | 'hunch'

export interface TasteHypothesis {
  key: string
  kind: HypothesisKind
  facet: FacetId
  /** For a condition: the facet enjoyed "when the main facet stays central". */
  other: FacetId | null
  tentative: boolean
  strength: number
  grounding: {
    /** Rated films that back this up: loved ones, or disliked ones for an aversion. */
    ratedFilmCount: number
    ratedFilmTone: 'high' | 'low'
    notes: string[]
  }
}

export type HypothesisVerdict = 'agree' | 'disagree'

export interface HypothesisNote {
  status: 'agree' | 'disagree' | 'refined'
  text: string | null
}

export type PickRole = 'close' | 'adjacent' | 'stretch'

export interface PickReason {
  facet: FacetId
  contribution: number
  tags: string[]
  /** Where the member's preference for this facet mostly comes from. */
  because: EvidenceSource | 'ratings'
  tentative: boolean
}

export interface TastePick {
  role: PickRole
  film: TasteFilm
  reasons: PickReason[]
  tradeoff: { facet: FacetId; direction: 'more' | 'less' } | null
  /** How many of the member's strongest reasons this film clearly has. */
  matched: number
  of: number
  support: 'supported' | 'tentative'
  familiarity: number
}

export interface TasteTweak {
  facet: FacetId
  direction: 1 | -1
}

export interface TasteState {
  version: 1
  confirmedIds: number[]
  asked: AskedQuestion[]
  evidence: TasteEvidence[]
  notes: Record<string, HypothesisNote>
}

export interface TasteChange {
  facets: Array<{ facet: FacetId; before: number; after: number }>
  picks: Array<{
    role: PickRole
    beforeId: number | null
    afterId: number | null
    beforeTitle: string | null
    afterTitle: string | null
  }>
  movers: Array<{ tmdbId: number; title: string; from: number; to: number }>
  /** Share of the top-10 ordering that survived, 1 = unchanged. */
  overlap: number
}

export interface PreferenceExtraction {
  facet: FacetId
  direction: 1 | -1
  strength: 'clear' | 'strong'
  /** The member's own words that support this reading. */
  quote: string
}

// ─── Tunable constants ────────────────────────────────────────────────────────
// Kept together so the ranking stays easy to audit.

/** Weight of the "no opinion" prior every facet starts with. */
export const NEUTRAL_WEIGHT = 4
/** Ratings can never count for more than this, however many there are. */
const MAX_RATINGS_WEIGHT = 6
/** A facet value at or above this counts as clearly present in a film. */
export const PRESENT = 0.45
/** Typical facet presence; a film has to exceed it to earn credit. */
const BASELINE = 0.3
const FACET_SCALE = 10
/** A preference at or above this is assumed strong enough to be named as a reason. */
const REASON_THRESHOLD = 0.2
const TOP_K = 10
const MAX_EVIDENCE = 60
const MAX_QUESTIONS = 3
export const QUESTION_LIMIT = MAX_QUESTIONS

// ─── Small helpers ────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, places = 3): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

export function emptyFacetVector(fill = 0): FacetVector {
  return Object.fromEntries(FACET_IDS.map(facet => [facet, fill])) as FacetVector
}

export function isFacetId(value: unknown): value is FacetId {
  return typeof value === 'string' && (FACET_IDS as readonly string[]).includes(value)
}

function cosine(a: FacetVector, b: FacetVector): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const facet of FACET_IDS) {
    dot += a[facet] * b[facet]
    normA += a[facet] ** 2
    normB += b[facet] ** 2
  }
  if (normA === 0 || normB === 0) return 0
  return dot / Math.sqrt(normA * normB)
}

function jaccard(a: number[], b: number[]): number {
  const left = new Set(a)
  const right = new Set(b)
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const value of left) if (right.has(value)) shared += 1
  return shared / new Set([...left, ...right]).size
}

function likedFilms(rated: RatedFilm[]): RatedFilm[] {
  return rated.filter(film => film.affinity > 0.2)
}

// ─── Ratings prior ────────────────────────────────────────────────────────────

/**
 * What the ratings alone suggest, and how far to trust it.
 *
 * A facet earns positive credit when films that have more of it than the
 * member's average film are rated above the member's own norm. When two facets
 * rise and fall together across the rated films, the ratings cannot say which
 * one is responsible, so both are trusted less. Those tangles are exactly what
 * the questions are for.
 */
export function ratingsPrior(rated: RatedFilm[]): RatingsPrior {
  const count = rated.length
  const means = emptyFacetVector()
  for (const facet of FACET_IDS) {
    means[facet] = count ? rated.reduce((sum, film) => sum + film.facets[facet], 0) / count : 0
  }

  const centered = rated.map(film => {
    const vector = emptyFacetVector()
    for (const facet of FACET_IDS) vector[facet] = film.facets[facet] - means[facet]
    return vector
  })

  function correlation(first: FacetId, second: FacetId): number {
    if (count < 3) return 0
    let cross = 0
    let varFirst = 0
    let varSecond = 0
    for (const vector of centered) {
      cross += vector[first] * vector[second]
      varFirst += vector[first] ** 2
      varSecond += vector[second] ** 2
    }
    if (varFirst < 1e-6 || varSecond < 1e-6) return 0
    return cross / Math.sqrt(varFirst * varSecond)
  }

  const liked = likedFilms(rated)
  const prior = {} as RatingsPrior

  for (const facet of FACET_IDS) {
    let signal = 0
    let spread = 0
    rated.forEach((film, index) => {
      signal += film.affinity * centered[index][facet]
      spread += Math.abs(centered[index][facet])
    })

    let tangledWith: FacetId | null = null
    let tangle = 0
    for (const other of FACET_IDS) {
      if (other === facet) continue
      const value = correlation(facet, other)
      if (value > tangle) {
        tangle = value
        tangledWith = other
      }
    }
    // With very few films every co-occurrence is a coincidence we cannot rule out.
    if (count < 3) tangle = 0.6
    if (tangle < 0.5) tangledWith = null

    const mean = clamp(signal / (spread + 0.75), -1, 1)
    const weight = Math.min(MAX_RATINGS_WEIGHT, spread * 4) / (1 + 1.5 * Math.max(0, tangle))

    prior[facet] = {
      mean: round(mean),
      weight: round(weight),
      filmCount: liked.filter(film => film.facets[facet] >= PRESENT).length,
      tangledWith,
      tangle: round(tangle),
    }
  }

  return prior
}

export function neutralPrior(): RatingsPrior {
  return Object.fromEntries(FACET_IDS.map(facet => [
    facet,
    { mean: 0, weight: 0, filmCount: 0, tangledWith: null, tangle: 0 },
  ])) as RatingsPrior
}

// ─── Belief ───────────────────────────────────────────────────────────────────

export function computeBelief(
  prior: RatingsPrior,
  evidence: TasteEvidence[],
  scopes: EvidenceScope[] = ['saved', 'session', 'tweak'],
): TasteBelief {
  const included = evidence.filter(item => scopes.includes(item.scope))
  const belief = {} as TasteBelief

  for (const facet of FACET_IDS) {
    const facetPrior = prior[facet]
    const items = included.filter(item => item.facet === facet)
    let weight = NEUTRAL_WEIGHT + facetPrior.weight
    let total = facetPrior.mean * facetPrior.weight
    for (const item of items) {
      weight += item.weight
      total += item.value * item.weight
    }

    const sd = 1 / Math.sqrt(weight)
    const sources: Array<EvidenceSource | 'ratings'> = []
    if (facetPrior.weight >= 0.5) sources.push('ratings')
    for (const item of items) if (!sources.includes(item.source)) sources.push(item.source)

    belief[facet] = {
      facet,
      mean: round(clamp(total / weight, -1, 1)),
      sd: round(sd),
      weight: round(weight),
      ratingsMean: facetPrior.mean,
      ratingsWeight: facetPrior.weight,
      explicitCount: items.length,
      sources,
      tentative: sd > 0.33 || (items.length === 0 && facetPrior.tangle >= 0.6),
    }
  }

  return belief
}

/** The source that contributes the most weight to a facet's belief. */
function dominantSource(facet: FacetId, belief: TasteBelief, evidence: TasteEvidence[]): EvidenceSource | 'ratings' {
  const totals = new Map<EvidenceSource | 'ratings', number>([['ratings', belief[facet].ratingsWeight]])
  for (const item of evidence) {
    if (item.facet !== facet) continue
    totals.set(item.source, (totals.get(item.source) ?? 0) + item.weight)
  }
  return [...totals].sort((a, b) => b[1] - a[1])[0][0]
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Score = sum over facets of (how much the member wants it) x (how much of it
 * the film has beyond a typical film), plus a small catalog-quality term.
 * Every term is returned so the interface can show why a film ranked where it did.
 */
export function rankCandidates(candidates: TasteFilm[], belief: TasteBelief): RankedFilm[] {
  return candidates
    .map(film => {
      const contributions = emptyFacetVector()
      let score = 0
      for (const facet of FACET_IDS) {
        const contribution = belief[facet].mean * (film.facets[facet] - BASELINE) * FACET_SCALE
        contributions[facet] = round(contribution)
        score += contribution
      }
      const quality = round(clamp(((film.voteAverage ?? 6.5) - 6.5) * 0.6, -0.9, 1.2))
      return { film, score: round(score + quality), contributions, quality }
    })
    .sort((a, b) => b.score - a.score || a.film.tmdbId - b.film.tmdbId)
}

/** Average overlap of two orderings at depths 1..k. 1 = identical top-k. */
export function averageOverlap(first: number[], second: number[], k = TOP_K): number {
  const depth = Math.min(k, Math.max(first.length, second.length))
  if (depth === 0) return 1
  let total = 0
  for (let size = 1; size <= depth; size++) {
    const left = new Set(first.slice(0, size))
    let shared = 0
    for (const id of second.slice(0, size)) if (left.has(id)) shared += 1
    total += shared / size
  }
  return total / depth
}

function topIds(ranked: RankedFilm[], k: number): number[] {
  return ranked.slice(0, k).map(entry => entry.film.tmdbId)
}

// ─── Questions ────────────────────────────────────────────────────────────────

let evidenceSequence = 0

function makeEvidence(
  partial: Omit<TasteEvidence, 'id' | 'at' | 'scope'> & { scope?: EvidenceScope },
  now: string,
): TasteEvidence {
  evidenceSequence += 1
  return {
    scope: 'session',
    ...partial,
    id: `${partial.source}-${partial.facet}-${Date.parse(now) || 0}-${evidenceSequence}`,
    value: clamp(partial.value, -1, 1),
    at: now,
  }
}

function questionId(kind: QuestionKind, filmIds: number[], facetA: FacetId, facetB: FacetId): string {
  return `${kind}:${filmIds.join('+')}:${facetA}:${facetB}`
}

/**
 * Turn an answer into evidence.
 *
 * Choosing one reason over another for a film the member loved says the chosen
 * facet is a draw. It does not say the other facet is disliked, only that it is
 * not what drove the rating, so it is pulled toward neutral rather than negative.
 *
 * "Neither" says the film was loved for something else, so whatever else the
 * film clearly has (`otherPresent`) gets a small share of the credit.
 * "Not sure" adds nothing.
 */
export function evidenceForAnswer(
  question: Pick<TasteQuestion, 'kind' | 'filmIds' | 'facetA' | 'facetB'>,
  choice: AnswerChoice,
  note: { chosen: string; passed: string; both: string; neither: string },
  now: string,
  otherPresent: FacetId[] = [],
): TasteEvidence[] {
  if (choice === 'unsure') return []
  const base = { source: 'answer' as const, filmIds: question.filmIds }
  const strong = question.kind === 'contrast'

  if (choice === 'both') {
    return [question.facetA, question.facetB].map(facet => makeEvidence(
      { ...base, facet, value: 0.6, weight: strong ? 4 : 3, note: note.both }, now,
    ))
  }
  if (choice === 'neither') {
    return [
      ...[question.facetA, question.facetB].map(facet => makeEvidence(
        { ...base, facet, value: 0, weight: strong ? 4 : 2, note: note.neither }, now,
      )),
      ...(strong ? otherPresent : [])
        .filter(facet => facet !== question.facetA && facet !== question.facetB)
        .map(facet => makeEvidence({ ...base, facet, value: 0.4, weight: 1.5, note: note.neither }, now)),
    ]
  }

  const chosen = choice === 'a' ? question.facetA : question.facetB
  const passed = choice === 'a' ? question.facetB : question.facetA
  return [
    makeEvidence({ ...base, facet: chosen, value: strong ? 0.8 : 0.7, weight: strong ? 6 : 4, note: note.chosen }, now),
    makeEvidence({ ...base, facet: passed, value: strong ? 0 : 0.15, weight: strong ? 4 : 2, note: note.passed }, now),
  ]
}

/** Facets a film clearly has, other than the two a question asks about. */
export function otherPresentFacets(film: TasteFilm | undefined, question: Pick<TasteQuestion, 'facetA' | 'facetB'>): FacetId[] {
  if (!film) return []
  return FACET_IDS.filter(facet => film.facets[facet] >= PRESENT && facet !== question.facetA && facet !== question.facetB)
}

const QUIET_NOTE = { chosen: '', passed: '', both: '', neither: '' }

/**
 * How likely each answer is, according to the current belief.
 *
 * Each facet's true preference is taken to be one of three values (a standard
 * deviation below the estimate, the estimate, or a standard deviation above),
 * and the member is assumed to name a facet as a reason only when their true
 * preference for it is clearly positive. A facet the ratings already count
 * against is therefore expected to draw "neither", so asking about it scores
 * low: the answer is predictable and would change little.
 */
function answerProbabilities(belief: TasteBelief, facetA: FacetId, facetB: FacetId) {
  const odds = { a: 0, b: 0, both: 0, neither: 0 }
  const steps: Array<[number, number]> = [[-1, 0.25], [0, 0.5], [1, 0.25]]
  for (const [stepA, shareA] of steps) {
    for (const [stepB, shareB] of steps) {
      const wantA = belief[facetA].mean + stepA * belief[facetA].sd
      const wantB = belief[facetB].mean + stepB * belief[facetB].sd
      const share = shareA * shareB
      if (wantA < REASON_THRESHOLD && wantB < REASON_THRESHOLD) odds.neither += share
      else if (wantB < REASON_THRESHOLD) odds.a += share
      else if (wantA < REASON_THRESHOLD) odds.b += share
      else if (Math.abs(wantA - wantB) < 0.25) odds.both += share
      else if (wantA > wantB) odds.a += share
      else odds.b += share
    }
  }
  return odds
}

export interface QuestionContext {
  rated: RatedFilm[]
  confirmedIds: number[]
  candidates: TasteFilm[]
  prior: RatingsPrior
  evidence: TasteEvidence[]
  asked: AskedQuestion[]
}

/**
 * Every question that could be asked right now, scored by expected ranking
 * change: for each possible answer, apply the update it would cause, rerank
 * the candidates, and measure how much the top of the list moves. Weight those
 * by a rough guess at how likely each answer is.
 *
 * This is an approximation of value of information. The answer likelihoods are
 * a heuristic, and only the top ten positions are compared. Questions are then
 * ordered by that expected change, weighted toward facet pairs that appear
 * together across more of the member's loved films and away from films already
 * asked about.
 */
export function scoreQuestions(context: QuestionContext): TasteQuestion[] {
  const { rated, candidates, prior, evidence, asked } = context
  const confirmed = likedFilms(rated).filter(film => context.confirmedIds.includes(film.tmdbId))
  if (confirmed.length === 0 || candidates.length === 0) return []

  const belief = computeBelief(prior, evidence)
  const current = rankCandidates(candidates, belief)
  const currentTop10 = topIds(current, TOP_K)
  const currentTop5 = new Set(topIds(current, 5))

  const askedPairs = new Set(asked.map(item => [item.facetA, item.facetB].sort().join('|')))
  const filmUse = new Map<number, number>()
  for (const item of asked) for (const id of item.filmIds) filmUse.set(id, (filmUse.get(id) ?? 0) + 1)

  const liked = likedFilms(rated)
  const coOccur = (first: FacetId, second: FacetId) =>
    liked.filter(film => film.facets[first] >= PRESENT && film.facets[second] >= PRESENT).length

  function evaluate(kind: QuestionKind, filmIds: number[], facetA: FacetId, facetB: FacetId): TasteQuestion {
    const shape = { kind, filmIds, facetA, facetB }
    const odds = answerProbabilities(belief, facetA, facetB)
    let expectedChange = 0
    let expectedSwaps = 0

    const others = kind === 'contrast'
      ? otherPresentFacets(rated.find(film => film.tmdbId === filmIds[0]), shape)
      : []

    for (const choice of ['a', 'b', 'both', 'neither'] as const) {
      const hypothetical = [...evidence, ...evidenceForAnswer(shape, choice, QUIET_NOTE, '1970-01-01T00:00:00.000Z', others)]
      const reranked = rankCandidates(candidates, computeBelief(prior, hypothetical))
      expectedChange += odds[choice] * (1 - averageOverlap(currentTop10, topIds(reranked, TOP_K)))
      expectedSwaps += odds[choice] * topIds(reranked, 5).filter(id => !currentTop5.has(id)).length
    }

    // Prefer spreading questions across films the member confirmed.
    const reuse = Math.max(0, ...filmIds.map(id => filmUse.get(id) ?? 0))
    const variety = reuse === 0 ? 1 : reuse === 1 ? 0.8 : 0.55
    // An answer about two facets that appear together in several loved films
    // explains more of the member's history than one about a single film.
    const together = coOccur(facetA, facetB)
    const coverage = liked.length ? together / liked.length : 0

    return {
      id: questionId(kind, filmIds, facetA, facetB),
      kind,
      filmIds,
      facetA,
      facetB,
      expectedChange: round(expectedChange, 4),
      priority: round(expectedChange * variety * (0.6 + 0.8 * coverage), 4),
      expectedSwaps: round(expectedSwaps, 2),
      coOccurCount: together,
      likedCount: liked.length,
    }
  }

  const questions: TasteQuestion[] = []

  // Contrast: one film that clearly has both facets. Which one was the reason?
  for (const film of confirmed) {
    const present = FACET_IDS.filter(facet => film.facets[facet] >= PRESENT)
    for (let first = 0; first < present.length; first++) {
      for (let second = first + 1; second < present.length; second++) {
        const pair = [present[first], present[second]].sort().join('|')
        if (askedPairs.has(pair)) continue
        questions.push(evaluate('contrast', [film.tmdbId], present[first], present[second]))
      }
    }
  }

  // Tiebreak: two liked films that pull in different directions.
  for (let first = 0; first < confirmed.length; first++) {
    for (let second = first + 1; second < confirmed.length; second++) {
      const filmA = confirmed[first]
      const filmB = confirmed[second]
      let best: { facetA: FacetId; facetB: FacetId; gap: number } | null = null
      for (const facetA of FACET_IDS) {
        for (const facetB of FACET_IDS) {
          if (facetA === facetB) continue
          const gap = Math.min(
            filmA.facets[facetA] - filmB.facets[facetA],
            filmB.facets[facetB] - filmA.facets[facetB],
          )
          if (gap >= 0.3 && (!best || gap > best.gap)) best = { facetA, facetB, gap }
        }
      }
      if (!best) continue
      if (askedPairs.has([best.facetA, best.facetB].sort().join('|'))) continue
      questions.push(evaluate('tiebreak', [filmA.tmdbId, filmB.tmdbId], best.facetA, best.facetB))
    }
  }

  return questions.sort((a, b) =>
    b.priority - a.priority ||
    b.coOccurCount - a.coOccurCount ||
    a.id.localeCompare(b.id),
  )
}

/** The question whose answer is expected to move the ranking most, if any is worth asking. */
export function selectNextQuestion(context: QuestionContext): TasteQuestion | null {
  if (context.asked.length >= MAX_QUESTIONS) return null
  const best = scoreQuestions(context)[0]
  // Below this, no answer would visibly change the picks.
  return best && best.expectedChange >= 0.01 ? best : null
}

// ─── Hypotheses ───────────────────────────────────────────────────────────────

function groundingFor(
  kind: HypothesisKind,
  facets: FacetId[],
  prior: RatingsPrior,
  rated: RatedFilm[],
  evidence: TasteEvidence[],
): TasteHypothesis['grounding'] {
  const notes = evidence
    .filter(item => facets.includes(item.facet) && item.note)
    .map(item => item.note)
  const aversion = kind === 'aversion'
  return {
    ratedFilmCount: aversion
      ? rated.filter(film => film.affinity < 0 && film.facets[facets[0]] >= PRESENT).length
      : Math.max(...facets.map(facet => prior[facet].filmCount)),
    ratedFilmTone: aversion ? 'low' : 'high',
    notes: [...new Set(notes)].slice(-3),
  }
}

/**
 * Up to three statements about the member's taste, strongest first:
 * the main draw, a condition or second draw, and something that works
 * against a film (or an honest "we cannot tell yet").
 */
export function buildHypotheses(
  belief: TasteBelief,
  prior: RatingsPrior,
  rated: RatedFilm[],
  evidence: TasteEvidence[],
): TasteHypothesis[] {
  const byMean = [...FACET_IDS].sort((a, b) => belief[b].mean - belief[a].mean || a.localeCompare(b))
  const liked = likedFilms(rated)
  const used = new Set<FacetId>()
  const hypotheses: TasteHypothesis[] = []

  function add(kind: HypothesisKind, facet: FacetId, other: FacetId | null = null) {
    const facets = other ? [facet, other] : [facet]
    facets.forEach(item => used.add(item))
    hypotheses.push({
      key: `${kind}:${facets.join('+')}`,
      kind,
      facet,
      other,
      tentative: facets.some(item => belief[item].tentative),
      strength: round(Math.abs(belief[facet].mean)),
      grounding: groundingFor(kind, facets, prior, rated, evidence),
    })
  }

  const driver = byMean[0]
  if (belief[driver].mean > 0.1) add('driver', driver)

  if (hypotheses.length > 0) {
    // A facet that keeps turning up beside the main draw but is not itself the
    // draw: "you enjoy this most when that stays central".
    const companion = FACET_IDS
      .filter(facet => facet !== driver)
      .filter(facet => belief[facet].mean > -0.05 && belief[facet].mean < belief[driver].mean - 0.15)
      .map(facet => ({
        facet,
        together: liked.filter(film => film.facets[facet] >= PRESENT && film.facets[driver] >= PRESENT).length,
      }))
      .filter(item => item.together >= 2)
      .sort((a, b) => b.together - a.together || a.facet.localeCompare(b.facet))[0]
    if (companion) add('condition', driver, companion.facet)
  }

  const second = byMean.find(facet => !used.has(facet) && belief[facet].mean > 0.1)
  if (hypotheses.length < 2 && second) add('driver', second)

  const lowest = [...byMean].reverse().find(facet => !used.has(facet))
  if (lowest && belief[lowest].mean < -0.1) add('aversion', lowest)

  while (hypotheses.length < 3) {
    const next = byMean.find(facet => !used.has(facet) && belief[facet].mean > 0.1)
    if (next) {
      add('driver', next)
      continue
    }
    // Nothing else is clear. Say so, about the facet we know least about.
    const unknown = [...FACET_IDS]
      .filter(facet => !used.has(facet))
      .sort((a, b) => belief[b].sd - belief[a].sd || a.localeCompare(b))[0]
    if (!unknown) break
    add('hunch', unknown)
  }

  return hypotheses.slice(0, 3)
}

export function evidenceForHypothesis(
  hypothesis: Pick<TasteHypothesis, 'kind' | 'facet' | 'other'>,
  verdict: HypothesisVerdict,
  note: string,
  now: string,
): TasteEvidence[] {
  const base = { source: 'hypothesis' as const, filmIds: [], note }
  const negative = hypothesis.kind === 'aversion'

  if (verdict === 'agree') {
    const items = [makeEvidence({ ...base, facet: hypothesis.facet, value: negative ? -0.7 : 0.7, weight: 4 }, now)]
    // Agreeing with "X works best when Y stays central" confirms X as a mild plus.
    if (hypothesis.other) items.push(makeEvidence({ ...base, facet: hypothesis.other, value: 0.25, weight: 3 }, now))
    return items
  }

  // Disagreeing says the statement is wrong, not that the opposite is true.
  const items = [makeEvidence({ ...base, facet: hypothesis.facet, value: negative ? 0.1 : -0.15, weight: 6 }, now)]
  if (hypothesis.other) items.push(makeEvidence({ ...base, facet: hypothesis.other, value: 0, weight: 2 }, now))
  return items
}

export function evidenceForCorrection(
  extractions: PreferenceExtraction[],
  now: string,
  scope: EvidenceScope = 'session',
): TasteEvidence[] {
  return extractions.map(item => makeEvidence({
    source: 'correction',
    scope,
    facet: item.facet,
    value: item.direction * (item.strength === 'strong' ? 0.9 : 0.75),
    weight: 8,
    note: `You said: “${item.quote}”`,
    filmIds: [],
  }, now))
}

export function evidenceForTweak(tweak: TasteTweak, note: string, now: string): TasteEvidence {
  return makeEvidence({
    source: 'tweak',
    scope: 'tweak',
    facet: tweak.facet,
    value: tweak.direction * 0.9,
    weight: 10,
    note,
    filmIds: [],
  }, now)
}

// ─── Picks ────────────────────────────────────────────────────────────────────

function familiarity(film: TasteFilm, liked: RatedFilm[]): number {
  if (liked.length === 0) return 0
  const shape = Math.max(...liked.map(other => cosine(film.facets, other.facets)))
  const genres = Math.max(...liked.map(other => jaccard(film.genreIds, other.genreIds)))
  return round(0.6 * shape + 0.4 * genres)
}

function likedMeans(liked: RatedFilm[]): FacetVector {
  const means = emptyFacetVector()
  if (liked.length === 0) return means
  for (const facet of FACET_IDS) {
    means[facet] = liked.reduce((sum, film) => sum + film.facets[facet], 0) / liked.length
  }
  return means
}

/**
 * Three picks with different jobs:
 *   close    - the best-scoring film that resembles what the member already loves
 *   adjacent - a strong score in a lane they have not rated much
 *   stretch  - keeps their main draw but deliberately differs somewhere else
 *
 * Picks are reported with the reasons that produced them and how many of the
 * member's strongest reasons they hit. No percentage is implied.
 */
export function choosePicks(
  ranked: RankedFilm[],
  belief: TasteBelief,
  rated: RatedFilm[],
  evidence: TasteEvidence[],
): TastePick[] {
  if (ranked.length === 0) return []

  const liked = likedFilms(rated)
  const means = likedMeans(liked)
  const strongest = [...FACET_IDS]
    .filter(facet => belief[facet].mean > 0.1)
    .sort((a, b) => belief[b].mean - belief[a].mean || a.localeCompare(b))
    .slice(0, 3)

  const entries = ranked.map(entry => ({ ...entry, familiarity: familiarity(entry.film, liked) }))
  const byFamiliarity = [...entries].map(entry => entry.familiarity).sort((a, b) => a - b)
  const quantile = (share: number) => byFamiliarity[Math.min(byFamiliarity.length - 1, Math.floor(share * byFamiliarity.length))] ?? 0
  const upper = quantile(0.66)
  const lower = quantile(0.33)
  const medianScore = [...entries].map(entry => entry.score).sort((a, b) => a - b)[Math.floor(entries.length / 2)]

  // Everything a pick is drawn from is still a good match: the top of the ranking.
  const pool = entries.slice(0, Math.max(12, Math.ceil(entries.length * 0.4)))
  const chosen = new Set<number>()
  const take = <T extends { film: TasteFilm }>(entry: T | undefined): T | undefined => {
    if (entry) chosen.add(entry.film.tmdbId)
    return entry
  }

  const close = take(pool.find(entry => entry.familiarity >= upper) ?? pool[0])
  const closeLead = close?.film.genreIds[0]
  const adjacent = take(
    pool.find(entry => !chosen.has(entry.film.tmdbId) && entry.familiarity < upper && entry.familiarity >= lower && entry.film.genreIds[0] !== closeLead) ??
    pool.find(entry => !chosen.has(entry.film.tmdbId) && entry.familiarity < upper) ??
    pool.find(entry => !chosen.has(entry.film.tmdbId)),
  )
  const driver = strongest[0]
  const stretch = take(
    entries.find(entry =>
      !chosen.has(entry.film.tmdbId) &&
      entry.familiarity <= lower &&
      entry.score >= medianScore &&
      (!driver || entry.film.facets[driver] >= PRESENT)) ??
    entries.find(entry => !chosen.has(entry.film.tmdbId) && entry.familiarity <= lower && entry.score >= medianScore) ??
    [...entries].filter(entry => !chosen.has(entry.film.tmdbId)).sort((a, b) => a.familiarity - b.familiarity || b.score - a.score)[0],
  )

  function describe(role: PickRole, entry: (typeof entries)[number]): TastePick {
    const reasons = [...FACET_IDS]
      .filter(facet => entry.contributions[facet] > 0.25 && entry.film.facets[facet] >= PRESENT)
      .sort((a, b) => entry.contributions[b] - entry.contributions[a] || a.localeCompare(b))
      .slice(0, 3)
      .map(facet => ({
        facet,
        contribution: entry.contributions[facet],
        tags: (entry.film.tags[facet] ?? []).slice(0, 3),
        because: dominantSource(facet, belief, evidence),
        tentative: belief[facet].tentative,
      }))

    // The honest downside: what scored against it, or failing that, where it
    // departs most from the films the member already loves.
    let tradeoff: TastePick['tradeoff'] = null
    const against = [...FACET_IDS].sort((a, b) => entry.contributions[a] - entry.contributions[b])[0]
    if (entry.contributions[against] < -0.3) {
      tradeoff = { facet: against, direction: entry.film.facets[against] >= BASELINE ? 'more' : 'less' }
    } else if (liked.length > 0) {
      const departure = [...FACET_IDS]
        .map(facet => ({ facet, gap: entry.film.facets[facet] - means[facet] }))
        .filter(item => !reasons.some(reason => reason.facet === item.facet))
        .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0]
      if (departure && Math.abs(departure.gap) >= (role === 'stretch' ? 0.15 : 0.25)) {
        tradeoff = { facet: departure.facet, direction: departure.gap > 0 ? 'more' : 'less' }
      }
    }

    return {
      role,
      film: entry.film,
      reasons,
      tradeoff,
      matched: strongest.filter(facet => entry.film.facets[facet] >= PRESENT).length,
      of: strongest.length,
      support: reasons.length === 0 || reasons.slice(0, 2).some(reason => reason.tentative) ? 'tentative' : 'supported',
      familiarity: entry.familiarity,
    }
  }

  const picks: TastePick[] = []
  if (close) picks.push(describe('close', close))
  if (adjacent) picks.push(describe('adjacent', adjacent))
  if (stretch) picks.push(describe('stretch', stretch))
  return picks
}

// ─── Everything at once ───────────────────────────────────────────────────────

export interface TasteView {
  belief: TasteBelief
  ranked: RankedFilm[]
  picks: TastePick[]
  hypotheses: TasteHypothesis[]
}

export function computeView(
  rated: RatedFilm[],
  candidates: TasteFilm[],
  prior: RatingsPrior,
  evidence: TasteEvidence[],
  scopes?: EvidenceScope[],
): TasteView {
  const used = scopes ? evidence.filter(item => scopes.includes(item.scope)) : evidence
  const belief = computeBelief(prior, used)
  const ranked = rankCandidates(candidates, belief)
  return {
    belief,
    ranked,
    picks: choosePicks(ranked, belief, rated, used),
    hypotheses: buildHypotheses(belief, prior, rated, used),
  }
}

/** A concise account of what an update changed, for the before-and-after panel. */
export function summarizeChange(before: TasteView, after: TasteView): TasteChange {
  const facets = FACET_IDS
    .map(facet => ({ facet, before: before.belief[facet].mean, after: after.belief[facet].mean }))
    .filter(item => Math.abs(item.after - item.before) >= 0.05)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))

  const roles: PickRole[] = ['close', 'adjacent', 'stretch']
  const picks = roles
    .map(role => {
      const was = before.picks.find(pick => pick.role === role)
      const now = after.picks.find(pick => pick.role === role)
      return {
        role,
        beforeId: was?.film.tmdbId ?? null,
        afterId: now?.film.tmdbId ?? null,
        beforeTitle: was?.film.title ?? null,
        afterTitle: now?.film.title ?? null,
      }
    })
    .filter(item => item.beforeId !== item.afterId)

  const previousRank = new Map(before.ranked.map((entry, index) => [entry.film.tmdbId, index + 1]))
  const movers = after.ranked
    .slice(0, 5)
    .map((entry, index) => ({
      tmdbId: entry.film.tmdbId,
      title: entry.film.title,
      from: previousRank.get(entry.film.tmdbId) ?? before.ranked.length + 1,
      to: index + 1,
    }))
    .filter(item => item.from !== item.to)
    .sort((a, b) => (b.from - b.to) - (a.from - a.to))
    .slice(0, 3)

  return {
    facets,
    picks,
    movers,
    overlap: round(averageOverlap(topIds(before.ranked, TOP_K), topIds(after.ranked, TOP_K))),
  }
}

// ─── Session versus saved ─────────────────────────────────────────────────────

export function emptyState(): TasteState {
  return { version: 1, confirmedIds: [], asked: [], evidence: [], notes: {} }
}

/** Replace any active "change one thing" exploration. Only one runs at a time. */
export function withTweak(evidence: TasteEvidence[], tweak: TasteEvidence | null): TasteEvidence[] {
  const kept = evidence.filter(item => item.scope !== 'tweak')
  return tweak ? [...kept, tweak] : kept
}

/**
 * What gets written to the durable profile on an explicit save. Session
 * learning is promoted; a "change one thing" exploration is dropped unless the
 * member asked to keep it.
 */
export function durableEvidence(evidence: TasteEvidence[], options: { keepTweak: boolean }): TasteEvidence[] {
  return evidence
    .filter(item => item.scope !== 'tweak' || options.keepTweak)
    .map(item => ({ ...item, scope: 'saved' as const }))
    .slice(-MAX_EVIDENCE)
}

export function hasUnsavedLearning(evidence: TasteEvidence[]): boolean {
  return evidence.some(item => item.scope === 'session')
}

const SOURCES: EvidenceSource[] = ['answer', 'hypothesis', 'correction', 'tweak']
const SCOPES: EvidenceScope[] = ['saved', 'session', 'tweak']
const CHOICES: AnswerChoice[] = ['a', 'b', 'both', 'neither', 'unsure']

function cleanText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : ''
}

function cleanIds(value: unknown, limit: number): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is number => Number.isInteger(id) && id > 0))].slice(0, limit)
}

/**
 * State travels through the browser, so nothing in it is trusted: unknown
 * facets are dropped, numbers are clamped, and lists are bounded.
 */
export function sanitizeState(input: unknown): TasteState {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const state = emptyState()
  state.confirmedIds = cleanIds(raw.confirmedIds, 12)

  if (Array.isArray(raw.evidence)) {
    for (const entry of raw.evidence.slice(-MAX_EVIDENCE)) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      if (!isFacetId(item.facet)) continue
      if (!SOURCES.includes(item.source as EvidenceSource)) continue
      if (!SCOPES.includes(item.scope as EvidenceScope)) continue
      const value = Number(item.value)
      const weight = Number(item.weight)
      if (!Number.isFinite(value) || !Number.isFinite(weight)) continue
      state.evidence.push({
        id: cleanText(item.id, 120) || `restored-${state.evidence.length}`,
        facet: item.facet,
        value: clamp(value, -1, 1),
        weight: clamp(weight, 0, 10),
        source: item.source as EvidenceSource,
        scope: item.scope as EvidenceScope,
        note: cleanText(item.note, 200),
        filmIds: cleanIds(item.filmIds, 2),
        at: cleanText(item.at, 40) || new Date(0).toISOString(),
      })
    }
  }

  if (Array.isArray(raw.asked)) {
    for (const entry of raw.asked.slice(0, MAX_QUESTIONS)) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      if (!isFacetId(item.facetA) || !isFacetId(item.facetB)) continue
      if (item.kind !== 'contrast' && item.kind !== 'tiebreak') continue
      if (!CHOICES.includes(item.choice as AnswerChoice)) continue
      state.asked.push({
        id: cleanText(item.id, 120),
        kind: item.kind,
        filmIds: cleanIds(item.filmIds, 2),
        facetA: item.facetA,
        facetB: item.facetB,
        choice: item.choice as AnswerChoice,
      })
    }
  }

  if (raw.notes && typeof raw.notes === 'object') {
    for (const [key, entry] of Object.entries(raw.notes as Record<string, unknown>).slice(0, 12)) {
      if (!entry || typeof entry !== 'object') continue
      const note = entry as Record<string, unknown>
      if (note.status !== 'agree' && note.status !== 'disagree' && note.status !== 'refined') continue
      state.notes[cleanText(key, 60)] = {
        status: note.status,
        text: cleanText(note.text, 220) || null,
      }
    }
  }

  return state
}

// ─── Bridge to the existing recommendation preferences ───────────────────────

export interface PreferencePatch {
  pacingScale?: number
  toneScale?: number
  violenceTolerance?: number
  emotionalIntensity?: number
  complexity?: number
  plotTwists?: number
  escapism?: number
}

function toScale(mean: number): number {
  return clamp(Math.round(5.5 + 4.5 * mean), 1, 10)
}

/**
 * Translate saved taste reasons into the 1-10 controls the rest of NoSpoilers
 * already ranks with. Only facets the member spoke to directly are written;
 * a guess from ratings never overwrites an onboarding answer.
 */
export function preferencePatch(belief: TasteBelief, saved: TasteEvidence[]): PreferencePatch {
  const explicit = new Set(saved.map(item => item.facet))
  const patch: PreferencePatch = {}
  if (explicit.has('momentum')) patch.pacingScale = toScale(belief.momentum.mean)
  if (explicit.has('intensity')) {
    patch.toneScale = toScale(belief.intensity.mean)
    // Tolerance is a ceiling. Only lower it when intensity works against a film.
    if (belief.intensity.mean < -0.15) patch.violenceTolerance = clamp(Math.round(5 + 4 * belief.intensity.mean), 1, 10)
  }
  if (explicit.has('relationships')) patch.emotionalIntensity = toScale(belief.relationships.mean)
  if (explicit.has('ideas')) patch.complexity = toScale(belief.ideas.mean)
  if (explicit.has('tension')) patch.plotTwists = toScale(belief.tension.mean)
  if (explicit.has('grounding')) patch.escapism = 11 - toScale(belief.grounding.mean)
  return patch
}
