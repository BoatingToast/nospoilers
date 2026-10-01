/**
 * Offline evaluation for "Why Did I Love That?".
 *
 *   npm run eval:taste            (fixed seed, 400 simulated viewers)
 *   npm run eval:taste -- 7 1000  (seed, viewers)
 *
 * What it measures: how well each ranking recovers films a SIMULATED viewer
 * would enjoy, when that viewer's reasons are hidden from the ranker.
 *
 * What it cannot measure: whether real members agree with the picks. The
 * simulated viewers are built from the same nine facets the engine reasons
 * with, so the comparison favours the engine by construction. Each viewer also
 * has genre likes the facets do not capture, plus rating noise and unreliable
 * answers, so that the genre baseline has real signal to find and the engine
 * has something to get wrong. Read the numbers as "does asking help, and does
 * choosing the question help", not as accuracy on people.
 */

// @ts-expect-error explicit TypeScript extension is intentional for node
import { FACET_IDS, PRESENT, computeBelief, computeView, evidenceForAnswer, evidenceForCorrection, otherPresentFacets, rankCandidates, ratingsPrior, scoreQuestions, selectNextQuestion, type AnswerChoice, type AskedQuestion, type FacetId, type FacetVector, type RatedFilm, type TasteEvidence, type TasteFilm, type TasteQuestion } from '../lib/taste/engine.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node
import { deriveFacets } from '../lib/taste/catalog.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node
import { FIXTURE_FILMS } from '../lib/taste/fixtures.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node
import { calculateRatingAffinities } from '../services/dna-v2.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node
import { buildGenreAffinities, scoreGenreAffinity } from '../services/recommendation-ranking.ts'

const SEED = Number(process.argv[2] ?? 20261001)
const VIEWERS = Number(process.argv[3] ?? 400)
const RATED_PER_VIEWER = 12
const NOW = '2026-10-01T00:00:00.000Z'
const QUIET = { chosen: '', passed: '', both: '', neither: '' }

// ─── Deterministic randomness ─────────────────────────────────────────────────

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(SEED)
const between = (low: number, high: number) => low + random() * (high - low)
const normal = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

const FILMS: TasteFilm[] = FIXTURE_FILMS.map((film: (typeof FIXTURE_FILMS)[number]) => ({
  tmdbId: film.tmdbId,
  title: film.title,
  year: film.year,
  posterPath: null,
  genreIds: film.genreIds,
  runtime: film.runtime,
  voteAverage: film.voteAverage,
  ...deriveFacets({ genreIds: film.genreIds, keywords: film.keywords, runtime: film.runtime, popularity: null }),
}))
const GENRES = [...new Set(FILMS.flatMap(film => film.genreIds))]

// ─── Simulated viewers ────────────────────────────────────────────────────────

interface Viewer {
  reasons: FacetVector
  genreBias: Map<number, number>
}

function makeViewer(): Viewer {
  const reasons = Object.fromEntries(FACET_IDS.map((facet: FacetId) => [facet, 0])) as FacetVector
  const order = shuffled([...FACET_IDS]) as FacetId[]
  const drivers = 2 + Math.floor(random() * 2)
  const aversions = 1 + Math.floor(random() * 2)
  order.slice(0, drivers).forEach(facet => { reasons[facet] = between(0.5, 1) })
  order.slice(drivers, drivers + aversions).forEach(facet => { reasons[facet] = -between(0.3, 0.8) })
  order.slice(drivers + aversions).forEach(facet => { reasons[facet] = between(-0.1, 0.1) })
  // Likes and dislikes the facet model has no way to express.
  const genreBias = new Map(GENRES.map(genre => [genre, normal() * 0.18]))
  return { reasons, genreBias }
}

/** Noise-free enjoyment. The rankers never see this. */
function trueUtility(viewer: Viewer, film: TasteFilm): number {
  let utility = 0
  for (const facet of FACET_IDS as readonly FacetId[]) utility += viewer.reasons[facet] * (film.facets[facet] - 0.3)
  const genre = film.genreIds.reduce((sum, id) => sum + (viewer.genreBias.get(id) ?? 0), 0) / Math.max(1, film.genreIds.length)
  return utility + genre + ((film.voteAverage ?? 7) - 7) * 0.15
}

function rate(viewer: Viewer, film: TasteFilm): number {
  return Math.max(1, Math.min(100, Math.round(62 + 26 * trueUtility(viewer, film) + normal() * 6)))
}

/** A viewer answering from their hidden reasons, imperfectly. */
function answer(viewer: Viewer, question: TasteQuestion, rated: RatedFilm[]): AnswerChoice {
  if (random() < 0.1) return 'unsure'
  let wantA = viewer.reasons[question.facetA as FacetId]
  let wantB = viewer.reasons[question.facetB as FacetId]
  if (question.kind === 'tiebreak') {
    const [first, second] = question.filmIds.map(id => rated.find(film => film.tmdbId === id)!)
    wantA = trueUtility(viewer, first)
    wantB = trueUtility(viewer, second)
    if (Math.abs(wantA - wantB) < 0.08) return 'both'
    return (wantA > wantB) !== (random() < 0.1) ? 'a' : 'b'
  }
  const threshold = 0.25
  if (wantA < threshold && wantB < threshold) return 'neither'
  if (wantA >= threshold && wantB >= threshold && Math.abs(wantA - wantB) < 0.2) return 'both'
  const prefersA = wantA > wantB
  // One answer in ten names the wrong reason.
  return prefersA !== (random() < 0.1) ? 'a' : 'b'
}

// ─── Rankers ──────────────────────────────────────────────────────────────────

function genreBaseline(rated: RatedFilm[], candidates: TasteFilm[]): number[] {
  // The genre-affinity logic the existing NoSpoilers recommender ranks with.
  const affinities = buildGenreAffinities(rated.map(film => ({ score: film.score, genreIds: film.genreIds })))
  return [...candidates]
    .map(film => ({ id: film.tmdbId, points: scoreGenreAffinity(film.genreIds, affinities).points + ((film.voteAverage ?? 6.5) - 6.5) * 0.6 }))
    .sort((a, b) => b.points - a.points || a.id - b.id)
    .map(item => item.id)
}

function applyAnswer(question: TasteQuestion, choice: AnswerChoice, rated: RatedFilm[]): TasteEvidence[] {
  const others = question.kind === 'contrast'
    ? otherPresentFacets(rated.find(film => film.tmdbId === question.filmIds[0]), question)
    : []
  return evidenceForAnswer(question, choice, QUIET, NOW, others)
}

function interview(
  viewer: Viewer,
  rated: RatedFilm[],
  candidates: TasteFilm[],
  pick: (context: Parameters<typeof scoreQuestions>[0]) => TasteQuestion | null,
): TasteEvidence[] {
  const prior = ratingsPrior(rated)
  const confirmedIds = rated.filter(film => film.affinity > 0.2).map(film => film.tmdbId)
  let evidence: TasteEvidence[] = []
  const asked: AskedQuestion[] = []
  for (let turn = 0; turn < 3; turn++) {
    const question = pick({ rated, confirmedIds, candidates, prior, evidence, asked })
    if (!question) break
    const choice = answer(viewer, question, rated)
    evidence = [...evidence, ...applyAnswer(question, choice, rated)]
    asked.push({ id: question.id, kind: question.kind, filmIds: question.filmIds, facetA: question.facetA, facetB: question.facetB, choice })
  }
  return evidence
}

function randomQuestion(context: Parameters<typeof scoreQuestions>[0]): TasteQuestion | null {
  const pool = scoreQuestions(context)
  return pool.length ? pool[Math.floor(random() * pool.length)] : null
}

/** One sentence naming the viewer's strongest like and strongest dislike. */
function correction(viewer: Viewer): TasteEvidence[] {
  const sorted = ([...FACET_IDS] as FacetId[]).sort((a, b) => viewer.reasons[b] - viewer.reasons[a])
  return evidenceForCorrection([
    { facet: sorted[0], direction: 1, strength: 'clear', quote: 'liked' },
    { facet: sorted[sorted.length - 1], direction: -1, strength: 'clear', quote: 'not' },
  ], NOW)
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function ndcgAt10(order: number[], gain: Map<number, number>): number {
  const dcg = (ids: number[]) => ids.slice(0, 10).reduce((sum, id, index) => sum + (gain.get(id) ?? 0) / Math.log2(index + 2), 0)
  const ideal = [...gain.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  return dcg(order) / dcg(ideal)
}

function hitsAt3(order: number[], best: Set<number>): number {
  return order.slice(0, 3).filter(id => best.has(id)).length / 3
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

/** 95% bootstrap interval for the mean of paired differences. */
function interval(differences: number[]): [number, number] {
  const draws: number[] = []
  for (let draw = 0; draw < 2000; draw++) {
    let total = 0
    for (let index = 0; index < differences.length; index++) total += differences[Math.floor(random() * differences.length)]
    draws.push(total / differences.length)
  }
  draws.sort((a, b) => a - b)
  return [draws[Math.floor(0.025 * draws.length)], draws[Math.floor(0.975 * draws.length)]]
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const SYSTEMS = ['genre baseline', 'ratings only', '3 random questions', '3 adaptive questions', 'adaptive + 1 correction'] as const
type System = (typeof SYSTEMS)[number]

const ndcg: Record<System, number[]> = Object.fromEntries(SYSTEMS.map(system => [system, []])) as never
const hits: Record<System, number[]> = Object.fromEntries(SYSTEMS.map(system => [system, []])) as never
const pickPercentile: Record<string, number[]> = { close: [], adjacent: [], stretch: [] }
let unresolved = 0
let evaluated = 0

for (let index = 0; index < VIEWERS; index++) {
  const viewer = makeViewer()
  const sample = shuffled(FILMS)
  const ratedFilms = sample.slice(0, RATED_PER_VIEWER)
  const candidates = sample.slice(RATED_PER_VIEWER)
  const scores = ratedFilms.map(film => rate(viewer, film))
  const affinities: number[] = calculateRatingAffinities(scores).map((item: { combined: number }) => item.combined)
  const rated: RatedFilm[] = ratedFilms.map((film, position) => ({ ...film, score: scores[position], affinity: affinities[position] }))
  if (!rated.some(film => film.affinity > 0.2 && FACET_IDS.some((facet: FacetId) => film.facets[facet] >= PRESENT))) {
    unresolved += 1
    continue
  }
  evaluated += 1

  const utilities = candidates.map(film => trueUtility(viewer, film))
  const low = Math.min(...utilities)
  const high = Math.max(...utilities)
  const gain = new Map(candidates.map((film, position) => [film.tmdbId, (utilities[position] - low) / (high - low || 1)]))
  const best = new Set([...gain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id))

  const prior = ratingsPrior(rated)
  const order = (evidence: TasteEvidence[]) => rankCandidates(candidates, computeBelief(prior, evidence)).map((entry: { film: TasteFilm }) => entry.film.tmdbId)
  const adaptive = interview(viewer, rated, candidates, selectNextQuestion)

  const orders: Record<System, number[]> = {
    'genre baseline': genreBaseline(rated, candidates),
    'ratings only': order([]),
    '3 random questions': order(interview(viewer, rated, candidates, randomQuestion)),
    '3 adaptive questions': order(adaptive),
    'adaptive + 1 correction': order([...adaptive, ...correction(viewer)]),
  }
  for (const system of SYSTEMS) {
    ndcg[system].push(ndcgAt10(orders[system], gain))
    hits[system].push(hitsAt3(orders[system], best))
  }

  // Where each of the three picks sits in the viewer's true ordering of candidates.
  const sortedGain = [...gain.values()].sort((a, b) => a - b)
  for (const pick of computeView(rated, candidates, prior, adaptive).picks) {
    const value = gain.get(pick.film.tmdbId) ?? 0
    pickPercentile[pick.role].push(sortedGain.filter(other => other <= value).length / sortedGain.length)
  }
}

const row = (cells: Array<string | number>) => `| ${cells.join(' | ')} |`
const fixed = (value: number) => value.toFixed(3)

console.log(`seed ${SEED} · ${evaluated} simulated viewers evaluated (${unresolved} skipped: no liked film to ask about) · ${FILMS.length} films · ${RATED_PER_VIEWER} rated, ${FILMS.length - RATED_PER_VIEWER} candidates each\n`)
console.log(row(['Ranking', 'nDCG@10', 'top-3 in true top-10']))
console.log(row(['---', '---', '---']))
for (const system of SYSTEMS) console.log(row([system, fixed(mean(ndcg[system])), fixed(mean(hits[system]))]))

console.log('\nPaired differences in nDCG@10 (mean, 95% bootstrap interval)\n')
console.log(row(['Comparison', 'Difference', '95% interval']))
console.log(row(['---', '---', '---']))
const pairs: Array<[System, System]> = [
  ['ratings only', 'genre baseline'],
  ['3 adaptive questions', 'genre baseline'],
  ['3 adaptive questions', 'ratings only'],
  ['3 adaptive questions', '3 random questions'],
  ['adaptive + 1 correction', '3 adaptive questions'],
]
for (const [first, second] of pairs) {
  const differences = ndcg[first].map((value, position) => value - ndcg[second][position])
  const [lower, upper] = interval(differences)
  console.log(row([`${first} − ${second}`, `${mean(differences) >= 0 ? '+' : ''}${fixed(mean(differences))}`, `${fixed(lower)} to ${fixed(upper)}`]))
}

console.log('\nWhere the three picks fall in each viewer’s true ordering (1.00 = their best candidate)\n')
console.log(row(['Pick', 'Mean percentile']))
console.log(row(['---', '---']))
for (const role of ['close', 'adjacent', 'stretch']) console.log(row([role, mean(pickPercentile[role]).toFixed(2)]))
