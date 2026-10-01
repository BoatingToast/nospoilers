import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { deriveFacets } from '@/lib/taste/catalog'
import {
  computeBelief,
  durableEvidence,
  preferencePatch,
  ratingsPrior,
  sanitizeState,
  type HypothesisNote,
  type PreferencePatch,
  type RatedFilm,
  type TasteEvidence,
  type TasteFilm,
  type TasteState,
} from '@/lib/taste/engine'
import { buildFixtureSet, FIXTURE_FILMS } from '@/lib/taste/fixtures'
import { isCandidateAllowed } from '@/lib/recommendation-preferences'
import { calculateRatingAffinities } from './dna-v2'
import { generateRecommendations } from './recommendations'
import { getRecommendationPreferenceProfile } from './recommendation-preferences'
import { makeCondensedPremise } from './spoiler-free'
import { getMovieById, getMovieRecommendations, getMovieWithKeywords } from './tmdb'
import type { TMDbMovie } from '@/types'

const MIN_RATINGS = 4
const MAX_RATINGS = 150
const MAX_ANCHORS = 6
const MAX_CANDIDATES = 36

export type StoryMode = 'safe' | 'standard'

export interface SavedTasteProfile {
  evidence: TasteEvidence[]
  notes: Record<string, HypothesisNote>
  confirmedIds: number[]
  savedAt: string
}

export interface TasteBootstrap {
  /** Whose ratings these are: the member's own, or the labeled sample sheet. */
  catalog: 'member' | 'fixture'
  status: 'ready' | 'needs-ratings' | 'catalog-unavailable'
  /** Whether a saved profile can be read and written. */
  storage: 'ready' | 'unavailable' | 'fixture'
  ratingCount: number
  rated: RatedFilm[]
  candidates: TasteFilm[]
  saved: SavedTasteProfile | null
}

function affinities(scores: number[]): number[] {
  return calculateRatingAffinities(scores).map(affinity => affinity.combined)
}

function yearOf(value: string | null | undefined): number | null {
  const year = Number(String(value ?? '').slice(0, 4))
  return Number.isInteger(year) && year >= 1888 ? year : null
}

function isMissingStorage(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await mapper(items[index])
    }
  }))
  return results
}

// ─── Fixture mode ─────────────────────────────────────────────────────────────

export function getFixtureBootstrap(): TasteBootstrap {
  const { rated, candidates } = buildFixtureSet({ deriveFacets, affinities })
  return {
    catalog: 'fixture',
    status: 'ready',
    storage: 'fixture',
    ratingCount: rated.length,
    rated,
    candidates,
    saved: null,
  }
}

// ─── Member data ──────────────────────────────────────────────────────────────

async function loadRatedFilms(userId: string): Promise<RatedFilm[]> {
  const rows = await prisma.movieRating.findMany({
    where: { userId },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    take: MAX_RATINGS,
    select: {
      tmdbId: true, title: true, posterPath: true, releaseDate: true, score: true,
      genreIds: true, runtime: true, voteAverage: true, popularity: true,
      budget: true, keywords: true,
    },
  })

  // Rows that predate cached metadata have no genres, so nothing can be said
  // about why they were liked. They are skipped rather than guessed at.
  const usable = rows.filter(row => row.genreIds.length > 0)
  const signals = affinities(usable.map(row => row.score))

  return usable.map((row, index) => ({
    tmdbId: row.tmdbId,
    title: row.title,
    year: yearOf(row.releaseDate),
    posterPath: row.posterPath,
    genreIds: row.genreIds,
    runtime: row.runtime,
    voteAverage: row.voteAverage,
    score: row.score,
    affinity: signals[index],
    ...deriveFacets({
      genreIds: row.genreIds,
      keywords: row.keywords,
      runtime: row.runtime,
      popularity: row.popularity,
      budget: row.budget,
    }),
  }))
}

async function loadCandidates(userId: string, rated: RatedFilm[]): Promise<TasteFilm[]> {
  const anchors = rated.filter(film => film.affinity > 0.2).slice(0, MAX_ANCHORS)
  if (anchors.length === 0) return []

  const [pools, watchlist, preferences] = await Promise.all([
    Promise.allSettled(anchors.map(anchor => getMovieRecommendations(anchor.tmdbId))),
    prisma.watchlistItem.findMany({ where: { userId, status: 'watched' }, select: { tmdbId: true } }),
    getRecommendationPreferenceProfile(userId),
  ])

  const seen = new Set([...rated.map(film => film.tmdbId), ...watchlist.map(item => item.tmdbId)])
  const merged = new Map<number, { movie: TMDbMovie; votes: number }>()
  for (const pool of pools) {
    if (pool.status !== 'fulfilled') continue
    for (const movie of pool.value.results ?? []) {
      if (seen.has(movie.id) || !movie.poster_path || movie.vote_count < 80) continue
      // The member's existing hard boundaries still apply here.
      if (!isCandidateAllowed(movie, preferences)) continue
      const entry = merged.get(movie.id)
      if (entry) entry.votes += 1
      else merged.set(movie.id, { movie, votes: 1 })
    }
  }

  const shortlist = [...merged.values()]
    .sort((a, b) => b.votes - a.votes || b.movie.vote_count - a.movie.vote_count)
    .slice(0, MAX_CANDIDATES)

  return mapWithConcurrency(shortlist, 6, async ({ movie }) => {
    const base = {
      tmdbId: movie.id,
      title: movie.title,
      year: yearOf(movie.release_date),
      posterPath: movie.poster_path,
      voteAverage: movie.vote_average,
    }
    try {
      const detail = await getMovieWithKeywords(movie.id)
      const genreIds = detail.movie.genres.map(genre => genre.id)
      return {
        ...base,
        genreIds,
        runtime: detail.movie.runtime,
        ...deriveFacets({
          genreIds,
          keywords: detail.keywords,
          runtime: detail.movie.runtime,
          popularity: detail.movie.popularity,
          budget: detail.movie.budget,
        }),
      }
    } catch {
      // Without detail the film is still scoreable from its genres alone.
      return {
        ...base,
        genreIds: movie.genre_ids,
        runtime: null,
        ...deriveFacets({ genreIds: movie.genre_ids, keywords: [], runtime: null, popularity: movie.popularity }),
      }
    }
  })
}

async function loadSaved(userId: string): Promise<{ saved: SavedTasteProfile | null; storage: 'ready' | 'unavailable' }> {
  try {
    const row = await prisma.tasteReasonProfile.findUnique({ where: { userId } })
    if (!row) return { saved: null, storage: 'ready' }
    const state = sanitizeState({ evidence: row.evidence, notes: row.notes, confirmedIds: row.confirmedIds })
    return {
      saved: {
        evidence: state.evidence.map(item => ({ ...item, scope: 'saved' as const })),
        notes: state.notes,
        confirmedIds: state.confirmedIds,
        savedAt: row.updatedAt.toISOString(),
      },
      storage: 'ready',
    }
  } catch (error) {
    if (!isMissingStorage(error)) throw error
    return { saved: null, storage: 'unavailable' }
  }
}

export async function getTasteBootstrap(userId: string): Promise<TasteBootstrap> {
  const [rated, { saved, storage }] = await Promise.all([loadRatedFilms(userId), loadSaved(userId)])
  const empty = { catalog: 'member' as const, storage, ratingCount: rated.length, rated, candidates: [], saved }

  if (rated.length < MIN_RATINGS || !rated.some(film => film.affinity > 0.2)) {
    return { ...empty, status: 'needs-ratings' }
  }

  const candidates = await loadCandidates(userId, rated)
  if (candidates.length < 6) return { ...empty, status: 'catalog-unavailable' }

  return { ...empty, status: 'ready', candidates }
}

// ─── Story text, released per spoiler mode ────────────────────────────────────

/**
 * Premise text for the three picks. Blind mode never calls this, so no story
 * text reaches the page until the member asks for it.
 */
export async function getStoryText(
  tmdbIds: number[],
  mode: StoryMode,
  fixture: boolean,
): Promise<Record<number, string>> {
  const result: Record<number, string> = {}
  if (fixture) {
    for (const id of tmdbIds) {
      const film = FIXTURE_FILMS.find(item => item.tmdbId === id)
      if (film) result[id] = film.premise
    }
    return result
  }

  await Promise.all(tmdbIds.map(async id => {
    try {
      const movie = await getMovieById(id)
      result[id] = mode === 'standard'
        ? movie.overview.trim() || 'No synopsis is available for this film.'
        : makeCondensedPremise(movie.overview)
    } catch {
      // A missing premise is not worth failing the whole request for.
    }
  }))
  return result
}

// ─── Saving ───────────────────────────────────────────────────────────────────

const PATCH_FIELDS = [
  'pacingScale', 'toneScale', 'violenceTolerance', 'emotionalIntensity',
  'complexity', 'plotTwists', 'escapism',
] as const satisfies ReadonlyArray<keyof PreferencePatch>

type PreviousPreferences = Partial<Record<(typeof PATCH_FIELDS)[number], number | null>>

export type SaveResult =
  | { saved: true; savedAt: string; evidence: TasteEvidence[]; updatedPreferences: string[]; refreshed: boolean }
  | { saved: false; reason: 'storage-unavailable' }

/**
 * Write the member's taste reasons to their durable profile, carry the facets
 * they spoke to into the existing recommendation preferences, and rebuild
 * their recommendations from those.
 */
export async function saveTasteProfile(
  userId: string,
  input: unknown,
  options: { keepTweak: boolean },
): Promise<SaveResult> {
  const state: TasteState = sanitizeState(input)
  const evidence = durableEvidence(state.evidence, options)

  let previous: PreviousPreferences = {}
  try {
    const existing = await prisma.tasteReasonProfile.findUnique({
      where: { userId },
      select: { previousPreferences: true },
    })
    previous = (existing?.previousPreferences ?? {}) as PreviousPreferences
  } catch (error) {
    if (isMissingStorage(error)) return { saved: false, reason: 'storage-unavailable' }
    throw error
  }

  const rated = await loadRatedFilms(userId)
  const belief = computeBelief(ratingsPrior(rated), evidence)
  const patch = preferencePatch(belief, evidence)
  const patchKeys = PATCH_FIELDS.filter(field => patch[field] !== undefined)

  const preferences = patchKeys.length
    ? await prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        pacingScale: true, toneScale: true, violenceTolerance: true,
        emotionalIntensity: true, complexity: true, plotTwists: true, escapism: true,
      },
    })
    : null

  // Remember each value the first time it is replaced, so it can be restored.
  if (preferences) {
    for (const field of patchKeys) {
      if (!(field in previous)) previous[field] = preferences[field]
    }
  }

  const data = {
    evidence: evidence as unknown as Prisma.InputJsonValue,
    notes: state.notes as unknown as Prisma.InputJsonValue,
    confirmedIds: state.confirmedIds,
    previousPreferences: previous as Prisma.InputJsonValue,
  }
  const row = await prisma.$transaction(async tx => {
    const savedRow = await tx.tasteReasonProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })
    if (preferences && patchKeys.length) {
      await tx.userPreferences.update({ where: { userId }, data: patch })
    }
    return savedRow
  })

  let refreshed = false
  if (preferences && patchKeys.length) {
    try {
      await generateRecommendations(userId)
      refreshed = true
    } catch (error) {
      console.error('[taste-reasons] recommendation refresh failed', error)
    }
  }

  return {
    saved: true,
    savedAt: row.updatedAt.toISOString(),
    evidence,
    updatedPreferences: preferences ? patchKeys : [],
    refreshed,
  }
}

/** Remove the saved profile and put back any preference it replaced. */
export async function forgetTasteProfile(userId: string): Promise<{ forgotten: boolean }> {
  try {
    const row = await prisma.tasteReasonProfile.findUnique({
      where: { userId },
      select: { previousPreferences: true },
    })
    if (!row) return { forgotten: false }

    const previous = (row.previousPreferences ?? {}) as PreviousPreferences
    const restore: Record<string, number | null> = {}
    for (const field of PATCH_FIELDS) {
      const value = previous[field]
      if (value === undefined) continue
      // `complexity` and `plotTwists` are required columns with a neutral default.
      restore[field] = value === null && (field === 'complexity' || field === 'plotTwists') ? 5 : value
    }

    await prisma.$transaction(async tx => {
      if (Object.keys(restore).length) {
        await tx.userPreferences.updateMany({ where: { userId }, data: restore })
      }
      await tx.tasteReasonProfile.delete({ where: { userId } })
    })
    if (Object.keys(restore).length) {
      await generateRecommendations(userId).catch(error => {
        console.error('[taste-reasons] recommendation refresh failed', error)
      })
    }
    return { forgotten: true }
  } catch (error) {
    if (isMissingStorage(error)) return { forgotten: false }
    throw error
  }
}
