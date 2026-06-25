/**
 * curated-recs.ts
 *
 * Produces four personalised recommendation groups powered by:
 *   • Movie DNA (computeMovieVibe)
 *   • User taste profile (TasteProfile)
 *   • Favorite movies (onboardingMovies)
 *   • Favorite genres (UserPreferences)
 *   • Watch history + ratings (WatchlistItem / MovieRating)
 *
 * Groups:
 *   1. "We Think You'd Like"   — highest overall match score
 *   2. "Similar To Favorites"  — explicitly tied to a specific favorite film
 *   3. "Expand Your Taste"     — scores well on the user's weakest DNA traits
 *   4. "Rediscover Classics"   — pre-1990 films that align with user DNA
 */

import { prisma } from '@/lib/db'
import {
  getMovieRecommendations,
  getMovieSimilar,
  getMoviesByGenre,
  getTopRatedMovies,
} from './tmdb'
import { computeMovieVibe } from './movie-vibe'
import type { DNAScores, TMDbMovie } from '@/types'

// ─── Public types ──────────────────────────────────────────────────────────────

export type RecGroup =
  | 'we-think-youd-like'
  | 'similar-to-favorites'
  | 'dna-based-picks'
  | 'expand-your-taste'
  | 'rediscover-classics'

export interface MatchedTrait {
  trait:       string   // e.g. "Complexity"
  icon:        string   // emoji
  yourScore:   number   // user's DNA score on this trait
  movieScore:  number   // movie's DNA score on this trait
}

export interface EnrichedRec {
  tmdbId:           number
  title:            string
  posterPath:       string | null
  releaseDate:      string | null
  voteAverage:      number
  genreIds:         number[]
  matchScore:       number   // 0-100
  group:            RecGroup
  explanation:      string   // one compelling sentence
  // Attribution (used by Why? modal)
  matchedFavorites: string[]       // "Because you liked …"
  matchedGenres:    string[]       // genres the user prefers that appear in this film
  matchedTraits:    MatchedTrait[] // DNA dimensions that align
  ratingInsight:    string | null  // e.g. "You rate sci-fi films 83/100 on average"
  // Internal: computed vibe stored so Expand group can reuse without a second call
  _movieDNA?:       DNAScores
  // Group-specific extras
  similarToTitle?:  string   // "Similar To Favorites" — which favorite drove this
  expandTrait?:     string   // "Expand Taste" — which weak trait this expands
  classicEra?:      string   // "Rediscover Classics" — decade label
}

export interface CuratedRecGroups {
  nextFavorite:       EnrichedRec | null        // single highest-confidence pick
  weThinkYoudLike:    EnrichedRec[]
  similarToFavorites: EnrichedRec[]
  dnaBasedPicks:      EnrichedRec[]             // pure DNA / top-trait driven
  expandYourTaste:    EnrichedRec[]
  rediscoverClassics: EnrichedRec[]
  // Per-trait context for the DNA section UI
  topTraits:          Array<{ label: string; icon: string; score: number }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRE_ID_TO_NAME: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
}

const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35,
  crime: 80, documentary: 99, drama: 18, family: 10751,
  fantasy: 14, history: 36, horror: 27, music: 10402,
  mystery: 9648, romance: 10749, 'sci-fi': 878, thriller: 53,
  war: 10752, western: 37,
}

const DNA_META: Record<keyof DNAScores, { label: string; icon: string }> = {
  suspenseScore:        { label: 'Suspense',         icon: '⚡' },
  emotionalImpactScore: { label: 'Emotion',           icon: '❤️' },
  complexityScore:      { label: 'Complexity',        icon: '🧩' },
  humorScore:           { label: 'Humor',             icon: '😄' },
  realismScore:         { label: 'Realism',           icon: '🎯' },
  actionScore:          { label: 'Action',            icon: '💥' },
  darknessScore:        { label: 'Darkness',          icon: '🌑' },
}

const DNA_KEYS = Object.keys(DNA_META) as (keyof DNAScores)[]

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getCuratedRecs(userId: string): Promise<CuratedRecGroups> {
  // ── 1. Fetch all user signals ─────────────────────────────────────────────
  const [user, watchlistRows, ratingRows, membershipRows] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        tasteProfile:     true,
        onboardingMovies: {
          select:  { tmdbId: true, title: true, genreIds: true, posterPath: true },
          orderBy: { addedAt: 'asc' },
        },
        preferences: { select: { genres: true } },
      },
    }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { tmdbId: true, status: true, genreIds: true } }),
    prisma.movieRating.findMany({
      where:  { userId },
      select: { tmdbId: true, score: true },
    }),
    // Spoiler Zone memberships — weak additional genre signal
    prisma.spoilerZoneMembership.findMany({
      where:  { userId },
      select: { tmdbId: true },
    }),
  ])

  if (!user) return empty()

  const userDNA: DNAScores = user.tasteProfile
    ? extractDNA(user.tasteProfile)
    : neutralDNA()

  const favorites   = user.onboardingMovies
  const userGenres  = (user.preferences?.genres ?? []).map(g => g.toLowerCase())

  // All tmdbIds the user has already encountered — exclude from recommendations
  // Include SZ memberships: user has seen (or is very interested in) those films
  const membershipTmdbIds = new Set(membershipRows.map(m => m.tmdbId))
  const seenIds = new Set<number>([
    ...favorites.map(m => m.tmdbId),
    ...watchlistRows.map(r => r.tmdbId),
    ...ratingRows.map(r => r.tmdbId),
    ...membershipTmdbIds,
  ])

  // ── 2. Build rating genre affinity ────────────────────────────────────────
  // Join ratings with watchlist rows (which carry genreIds) by tmdbId
  const ratingScoreMap = new Map(ratingRows.map(r => [r.tmdbId, r.score]))
  const ratingGenreAffinity = new Map<number, { total: number; count: number }>()
  for (const w of watchlistRows) {
    const score = ratingScoreMap.get(w.tmdbId)
    if (score === undefined) continue
    for (const gid of w.genreIds ?? []) {
      const entry = ratingGenreAffinity.get(gid) ?? { total: 0, count: 0 }
      ratingGenreAffinity.set(gid, { total: entry.total + score, count: entry.count + 1 })
    }
  }

  // Spoiler Zone memberships → weak genre boost (equivalent to a neutral 65/100 rating)
  // Use watchlist genreIds for membership movies if available (they were already fetched)
  const watchlistGenreMap = new Map(watchlistRows.map(r => [r.tmdbId, r.genreIds ?? []]))
  for (const tmdbId of membershipTmdbIds) {
    const genreIds = watchlistGenreMap.get(tmdbId) ?? []
    for (const gid of genreIds) {
      const entry = ratingGenreAffinity.get(gid) ?? { total: 0, count: 0 }
      // Treat a SZ membership as a soft 65/100 signal (weaker than a real rating)
      ratingGenreAffinity.set(gid, { total: entry.total + 65, count: entry.count + 1 })
    }
  }

  // ── 3. Gather candidate pools ─────────────────────────────────────────────
  const take5Favs = favorites.slice(0, 5)

  const [recResults, similarResults, genreResults, classicPageResults] = await Promise.all([
    // TMDb recs for each favorite
    Promise.allSettled(take5Favs.map(f => getMovieRecommendations(f.tmdbId))),
    // TMDb similar for each favorite (different signal than recs)
    Promise.allSettled(take5Favs.map(f => getMovieSimilar(f.tmdbId))),
    // Genre-based discovery for the user's top 2 genres
    Promise.allSettled(
      userGenres.slice(0, 2)
        .map(g => GENRE_NAME_TO_ID[g])
        .filter(Boolean)
        .map(id => getMoviesByGenre(id, 1))
    ),
    // Top-rated all time across pages 1-3 (for classics pool — we need pre-1990 films)
    Promise.allSettled([
      getTopRatedMovies(1),
      getTopRatedMovies(2),
      getTopRatedMovies(3),
    ]),
  ])

  // Merge candidates per favorite (so we can track origin)
  const favCandidates: Map<number, { movie: TMDbMovie; fromFavTitle: string }[]> = new Map()

  for (let i = 0; i < take5Favs.length; i++) {
    const fav   = take5Favs[i]
    const recR  = recResults[i]
    const simR  = similarResults[i]
    const pool: TMDbMovie[] = []
    if (recR.status  === 'fulfilled') pool.push(...recR.value.results)
    if (simR.status  === 'fulfilled') pool.push(...simR.value.results)
    for (const m of pool) {
      if (!favCandidates.has(fav.tmdbId)) favCandidates.set(fav.tmdbId, [])
      favCandidates.get(fav.tmdbId)!.push({ movie: m, fromFavTitle: fav.title })
    }
  }

  // Deduplicate all candidates into a flat map keyed by tmdbId
  const allMovies = new Map<number, { movie: TMDbMovie; fromFavTitles: string[] }>()

  for (const [, entries] of favCandidates) {
    for (const { movie, fromFavTitle } of entries) {
      if (seenIds.has(movie.id) || !movie.poster_path || movie.vote_count < 80) continue
      const existing = allMovies.get(movie.id)
      if (existing) {
        if (!existing.fromFavTitles.includes(fromFavTitle))
          existing.fromFavTitles.push(fromFavTitle)
      } else {
        allMovies.set(movie.id, { movie, fromFavTitles: [fromFavTitle] })
      }
    }
  }

  // Add genre-based candidates (no specific favorite attribution)
  for (const r of genreResults) {
    if (r.status !== 'fulfilled') continue
    for (const m of r.value.results) {
      if (seenIds.has(m.id) || !m.poster_path || m.vote_count < 80) continue
      if (!allMovies.has(m.id)) allMovies.set(m.id, { movie: m, fromFavTitles: [] })
    }
  }

  // Classic pool: merge top-rated pages 1-3, filter to pre-1990
  const classicMoviesRaw: TMDbMovie[] = []
  const classicSeen = new Set<number>()
  for (const r of classicPageResults) {
    if (r.status !== 'fulfilled') continue
    for (const m of r.value.results) {
      if (!classicSeen.has(m.id)) { classicSeen.add(m.id); classicMoviesRaw.push(m) }
    }
  }
  const classicPool: TMDbMovie[] = classicMoviesRaw
    .filter(m =>
      !seenIds.has(m.id) &&
      m.poster_path &&
      m.vote_count >= 500 &&
      m.vote_average >= 7.5 &&
      m.release_date &&
      parseInt(m.release_date.slice(0, 4), 10) < 1990
    )

  // ── 4. Score every candidate ──────────────────────────────────────────────
  const scored: EnrichedRec[] = []

  for (const [, { movie, fromFavTitles }] of allMovies) {
    const enriched = scoreMovie({
      movie,
      fromFavTitles,
      favorites,
      userDNA,
      userGenres,
      ratingGenreAffinity,
    })
    if (enriched && enriched.matchScore > 10) scored.push(enriched)
  }

  // Also score classics separately
  const scoredClassics: EnrichedRec[] = []
  for (const movie of classicPool) {
    const enriched = scoreMovie({
      movie,
      fromFavTitles: [],
      favorites,
      userDNA,
      userGenres,
      ratingGenreAffinity,
    })
    if (enriched && enriched.matchScore > 10) {
      const year   = parseInt(movie.release_date.slice(0, 4), 10)
      const decade = `${Math.floor(year / 10) * 10}s`
      scoredClassics.push({ ...enriched, group: 'rediscover-classics', classicEra: decade })
    }
  }

  scored.sort((a, b) => b.matchScore - a.matchScore)

  // ── 5. Partition into groups ──────────────────────────────────────────────
  const usedIds = new Set<number>()

  // Group 1 — "We Think You'd Like": top overall
  const weThinkYoudLike = scored
    .filter(r => !usedIds.has(r.tmdbId))
    .slice(0, 8)
    .map(r => { usedIds.add(r.tmdbId); return { ...r, group: 'we-think-youd-like' as RecGroup } })

  // Group 2 — "Similar To Favorites": best match per favorite (must have explicit attribution)
  const simToFavsMap = new Map<string, EnrichedRec>()
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    for (const favTitle of rec.matchedFavorites) {
      if (!simToFavsMap.has(favTitle)) {
        simToFavsMap.set(favTitle, { ...rec, group: 'similar-to-favorites', similarToTitle: favTitle })
        usedIds.add(rec.tmdbId)
        break
      }
    }
  }
  // Fill with remaining if needed
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    if (simToFavsMap.size >= 6) break
    const key = `gen-${rec.tmdbId}`
    simToFavsMap.set(key, { ...rec, group: 'similar-to-favorites' })
    usedIds.add(rec.tmdbId)
  }
  const similarToFavorites = Array.from(simToFavsMap.values()).slice(0, 6)

  // Group 3 — "Expand Your Taste": best scores on user's weakest DNA dimensions
  const sortedDims = [...DNA_KEYS].sort((a, b) => userDNA[a] - userDNA[b])
  const weakestDims = sortedDims.slice(0, 3)

  const expandCandidates: EnrichedRec[] = []
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    // Reuse the DNA already computed during scoring — no second API/compute call
    const movieVibe = rec._movieDNA
    if (!movieVibe) continue
    // Find which weak dimension this movie scores highly on
    const expandDim = weakestDims.find(d => movieVibe[d] >= 6.5 && userDNA[d] < 5)
    if (expandDim) {
      const traitLabel = DNA_META[expandDim].label
      expandCandidates.push({
        ...rec,
        group:       'expand-your-taste',
        expandTrait: traitLabel,
        explanation: `Scores ${movieVibe[expandDim].toFixed(1)}/10 in ${traitLabel.toLowerCase()} — higher than your usual preference. A great way to broaden your cinematic range.`,
      })
      usedIds.add(rec.tmdbId)
      if (expandCandidates.length >= 6) break
    }
  }
  // If not enough, fill with remaining high-quality candidates
  if (expandCandidates.length < 4) {
    for (const rec of scored) {
      if (usedIds.has(rec.tmdbId)) continue
      if (expandCandidates.length >= 6) break
      expandCandidates.push({ ...rec, group: 'expand-your-taste' })
      usedIds.add(rec.tmdbId)
    }
  }
  const expandYourTaste = expandCandidates.slice(0, 6)

  // Group 3B — "DNA Based Picks": driven purely by user's STRONGEST DNA dimensions
  // Pick movies where the movie's score on the user's top traits is highest —
  // different from "We Think You'd Like" which optimises total DNA distance.
  const sortedDimsDesc = [...DNA_KEYS].sort((a, b) => userDNA[b] - userDNA[a])
  const topDims = sortedDimsDesc.slice(0, 3)  // user's top 3 traits

  const dnaCandidates: EnrichedRec[] = []
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    const movieVibe = rec._movieDNA
    if (!movieVibe) continue
    // Must score well on at least 2 of the user's top 3 traits
    const traitHits = topDims.filter(d => movieVibe[d] >= 6.0).length
    if (traitHits >= 2) {
      const traitNames = topDims
        .filter(d => movieVibe[d] >= 6.0)
        .map(d => DNA_META[d].label.toLowerCase())
        .slice(0, 2)
      dnaCandidates.push({
        ...rec,
        group:       'dna-based-picks',
        explanation: traitNames.length >= 2
          ? `Scores highly in ${traitNames[0]} and ${traitNames[1]} — your two strongest traits.`
          : `Strongly matches your ${traitNames[0]} preference.`,
      })
      usedIds.add(rec.tmdbId)
      if (dnaCandidates.length >= 8) break
    }
  }
  // Fill if pool was thin
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    if (dnaCandidates.length >= 6) break
    dnaCandidates.push({ ...rec, group: 'dna-based-picks' })
    usedIds.add(rec.tmdbId)
  }
  const dnaBasedPicks = dnaCandidates.slice(0, 8)

  // Group 4 — "Rediscover Classics": sorted by DNA match
  const rediscoverClassics = scoredClassics
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8)

  // ── Next Favorite — single top pick above confidence threshold ────────────
  const ALL_RANKED = [...weThinkYoudLike].sort((a, b) => b.matchScore - a.matchScore)
  const nextFavoriteRaw = ALL_RANKED.find(r => r.matchScore >= 82) ?? ALL_RANKED[0] ?? null

  // Top traits for the DNA section header
  const topTraits = sortedDimsDesc.slice(0, 3).map(d => ({
    label: DNA_META[d].label,
    icon:  DNA_META[d].icon,
    score: parseFloat(userDNA[d].toFixed(1)),
  }))

  // Strip internal _movieDNA before returning to client
  function strip(recs: EnrichedRec[]): EnrichedRec[] {
    return recs.map(({ _movieDNA: _, ...r }) => r)
  }
  function stripOne(rec: EnrichedRec | null): EnrichedRec | null {
    if (!rec) return null
    const { _movieDNA: _, ...r } = rec
    return r
  }

  return {
    nextFavorite:       stripOne(nextFavoriteRaw),
    weThinkYoudLike:    strip(weThinkYoudLike),
    similarToFavorites: strip(similarToFavorites),
    dnaBasedPicks:      strip(dnaBasedPicks),
    expandYourTaste:    strip(expandYourTaste),
    rediscoverClassics: strip(rediscoverClassics),
    topTraits,
  }
}

// ─── Scoring function ─────────────────────────────────────────────────────────

function scoreMovie(opts: {
  movie:               TMDbMovie
  fromFavTitles:       string[]
  favorites:           { tmdbId: number; title: string; genreIds: number[] }[]
  userDNA:             DNAScores
  userGenres:          string[]
  ratingGenreAffinity: Map<number, { total: number; count: number }>
}): EnrichedRec | null {
  const { movie, fromFavTitles, favorites, userDNA, userGenres, ratingGenreAffinity } = opts

  // Compute movie vibe
  const movieDNA = computeMovieVibe({
    id:                movie.id,
    genres:            (movie.genre_ids ?? []).map(id => ({ id, name: '' })),
    runtime:           null,
    vote_average:      movie.vote_average,
    vote_count:        movie.vote_count,
    popularity:        movie.popularity,
    release_date:      movie.release_date,
    original_language: movie.original_language,
  })

  // ── Score components ───────────────────────────────────────────────────────

  // 1. DNA compatibility (0-40)
  const totalDiff = DNA_KEYS.reduce((sum, k) => sum + Math.abs(movieDNA[k] - userDNA[k]), 0)
  const avgDiff   = totalDiff / DNA_KEYS.length
  const dnaPts    = Math.max(0, 40 - avgDiff * 5)

  // 2. Genre match (0-20)
  const movieGenreNames = (movie.genre_ids ?? []).map(id => GENRE_ID_TO_NAME[id]?.toLowerCase()).filter(Boolean)
  const matchedGenres   = movieGenreNames.filter(g => userGenres.includes(g))
  const genrePts        = Math.min(20, matchedGenres.length * 8)

  // 3. Quality (0-20)
  const qualityPts = Math.min(
    (movie.vote_average / 10) * 15 + (movie.vote_count > 500 ? 5 : 0),
    20
  )

  // 4. Favorite similarity (0-15)
  const bestOverlapFavs: string[] = []
  for (const fav of favorites) {
    const overlap = (movie.genre_ids ?? []).filter(g => (fav.genreIds ?? []).includes(g)).length
    if (overlap >= 2) bestOverlapFavs.push(fav.title)
  }
  // Also include fromFavTitles (TMDb-sourced)
  const allMatchedFavs = [...new Set([...bestOverlapFavs, ...fromFavTitles])].slice(0, 3)
  const favPts         = Math.min(15, allMatchedFavs.length * 6)

  // 5. Rating affinity (0-5)
  let ratingPts   = 0
  let ratingInsight: string | null = null
  for (const gid of (movie.genre_ids ?? [])) {
    const aff = ratingGenreAffinity.get(gid)
    if (aff && aff.count >= 2) {
      const avg = Math.round(aff.total / aff.count)
      if (avg >= 70) {
        ratingPts   = 5
        ratingInsight = `You rate ${GENRE_ID_TO_NAME[gid] ?? 'similar'} films ${avg}/100 on average`
        break
      }
    }
  }

  const totalScore = Math.min(100, Math.round(dnaPts + genrePts + qualityPts + favPts + ratingPts))

  // ── Matched traits ─────────────────────────────────────────────────────────
  const matchedTraits: MatchedTrait[] = DNA_KEYS
    .filter(k => movieDNA[k] >= 6.5 && Math.abs(movieDNA[k] - userDNA[k]) < 2.5)
    .sort((a, b) => movieDNA[b] - movieDNA[a])
    .slice(0, 4)
    .map(k => ({
      trait:      DNA_META[k].label,
      icon:       DNA_META[k].icon,
      yourScore:  parseFloat(userDNA[k].toFixed(1)),
      movieScore: parseFloat(movieDNA[k].toFixed(1)),
    }))

  // ── Explanation ────────────────────────────────────────────────────────────
  let explanation: string
  if (allMatchedFavs.length > 0) {
    const fav = allMatchedFavs[0]
    const trait = matchedTraits[0]?.trait
    explanation = trait
      ? `If you loved ${fav}, this shares its ${trait.toLowerCase()} and visual world.`
      : `If you enjoyed ${fav}, this film occupies a very similar cinematic space.`
  } else if (matchedTraits.length > 0) {
    const traits = matchedTraits.slice(0, 2).map(t => t.trait.toLowerCase()).join(' and ')
    explanation = `Matches your DNA profile in ${traits}.`
  } else if (matchedGenres.length > 0) {
    explanation = `A strong ${matchedGenres[0]} film that fits your taste.`
  } else {
    explanation = 'Aligns well with your overall cinematic DNA.'
  }

  return {
    tmdbId:           movie.id,
    title:            movie.title,
    posterPath:       movie.poster_path,
    releaseDate:      movie.release_date,
    voteAverage:      movie.vote_average,
    genreIds:         movie.genre_ids ?? [],
    matchScore:       totalScore,
    group:            'we-think-youd-like',
    explanation,
    matchedFavorites: allMatchedFavs,
    matchedGenres:    matchedGenres.map(g => g.charAt(0).toUpperCase() + g.slice(1)),
    matchedTraits,
    ratingInsight,
    _movieDNA:        movieDNA,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function empty(): CuratedRecGroups {
  return {
    nextFavorite:       null,
    weThinkYoudLike:    [],
    similarToFavorites: [],
    dnaBasedPicks:      [],
    expandYourTaste:    [],
    rediscoverClassics: [],
    topTraits:          [],
  }
}

function extractDNA(p: {
  suspenseScore: number; emotionalImpactScore: number; complexityScore: number
  humorScore: number; realismScore: number; actionScore: number; darknessScore: number
}): DNAScores {
  return {
    suspenseScore:        p.suspenseScore,
    emotionalImpactScore: p.emotionalImpactScore,
    complexityScore:      p.complexityScore,
    humorScore:           p.humorScore,
    realismScore:         p.realismScore,
    actionScore:          p.actionScore,
    darknessScore:        p.darknessScore,
  }
}

function neutralDNA(): DNAScores {
  return { suspenseScore: 5, emotionalImpactScore: 5, complexityScore: 5,
           humorScore: 5, realismScore: 5, actionScore: 5, darknessScore: 5 }
}
