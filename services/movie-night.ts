import { prisma } from '@/lib/db'
import { GENRE_NAMES, generateTasteSummary } from './dna'
import { getMovieById } from './tmdb'
import type {
  DNAScores,
  MovieNightCandidate,
  MovieNightParticipant,
  MovieNightSeed,
  MovieNightSeenBy,
  MovieNightSupport,
  MovieNightSupportType,
} from '@/types'

type MovieSnapshot = {
  tmdbId: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  genreIds?: number[] | null
  runtime?: number | null
  voteAverage?: number | null
}

const MAX_FRIENDS = 8
const MAX_CANDIDATES = 36
const METADATA_CONCURRENCY = 6

function dnaFromProfile(profile: {
  suspenseScore: number
  emotionalImpactScore: number
  complexityScore: number
  humorScore: number
  realismScore: number
  actionScore: number
  darknessScore: number
}): DNAScores {
  return {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }
}

function topGenresFromIds(genreIds: number[]): string[] {
  const freq = new Map<number, number>()
  for (const id of genreIds) freq.set(id, (freq.get(id) ?? 0) + 1)

  return [...freq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => GENRE_NAMES[id] ?? 'Other')
}

function candidateFromMovie(movie: MovieSnapshot): MovieNightCandidate {
  return {
    tmdbId:      movie.tmdbId,
    title:       movie.title,
    posterPath:  movie.posterPath,
    releaseDate: movie.releaseDate,
    genreIds:    movie.genreIds ?? [],
    runtime:     movie.runtime ?? null,
    voteAverage: movie.voteAverage ?? null,
    baseScore:   0,
    explanation: '',
    supporters:  [],
    seenBy:      [],
  }
}

function upsertCandidate(candidates: Map<number, MovieNightCandidate>, movie: MovieSnapshot) {
  const existing = candidates.get(movie.tmdbId)
  if (existing) {
    if (existing.genreIds.length === 0 && movie.genreIds?.length) existing.genreIds = movie.genreIds
    if (!existing.runtime && movie.runtime) existing.runtime = movie.runtime
    if (!existing.voteAverage && movie.voteAverage) existing.voteAverage = movie.voteAverage
    if (!existing.posterPath && movie.posterPath) existing.posterPath = movie.posterPath
    if (!existing.releaseDate && movie.releaseDate) existing.releaseDate = movie.releaseDate
    return existing
  }

  const candidate = candidateFromMovie(movie)
  candidates.set(movie.tmdbId, candidate)
  return candidate
}

function addSupport(candidate: MovieNightCandidate, support: MovieNightSupport) {
  const duplicate = candidate.supporters.some(s => s.userId === support.userId && s.type === support.type)
  if (!duplicate) candidate.supporters.push(support)
}

function addSeen(seen: Map<number, MovieNightSeenBy[]>, tmdbId: number, viewer: MovieNightSeenBy) {
  const existing = seen.get(tmdbId) ?? []
  if (!existing.some(v => v.userId === viewer.userId)) {
    seen.set(tmdbId, [...existing, viewer])
  }
}

function supportFor(
  type: MovieNightSupportType,
  user: { id: string; username: string },
  score: number,
  note: string,
): MovieNightSupport {
  return {
    userId: user.id,
    username: user.username,
    type,
    score: Math.max(1, Math.min(100, Math.round(score))),
    note,
  }
}

function summarizeCandidate(candidate: MovieNightCandidate): string {
  const supporters = [...candidate.supporters].sort((a, b) => b.score - a.score)
  const first = supporters[0]
  const second = supporters.find(s => s.userId !== first?.userId)

  if (first && second) {
    return `${first.note}; ${second.note.toLowerCase()}.`
  }
  if (first) return `${first.note}.`
  return 'A flexible pick from the group pool.'
}

function finalizeScore(candidate: MovieNightCandidate, participantCount: number): MovieNightCandidate {
  const supportTotal = candidate.supporters.reduce((sum, support) => sum + support.score, 0)
  const distinctSupporters = new Set(candidate.supporters.map(s => s.userId)).size
  const coverage = distinctSupporters / Math.max(participantCount, 1)
  const quality = candidate.voteAverage ? Math.max(0, (candidate.voteAverage - 5.5) * 5) : 0

  return {
    ...candidate,
    supporters:  [...candidate.supporters].sort((a, b) => b.score - a.score),
    seenBy:      [...candidate.seenBy].sort((a, b) => a.username.localeCompare(b.username)),
    baseScore:   Math.max(1, Math.min(100, Math.round(38 + supportTotal / 4 + coverage * 18 + quality))),
    explanation: summarizeCandidate(candidate),
  }
}

async function hydrateCandidateMetadata(candidates: MovieNightCandidate[]): Promise<MovieNightCandidate[]> {
  const hydrated = [...candidates]

  for (let start = 0; start < hydrated.length; start += METADATA_CONCURRENCY) {
    const batch = hydrated.slice(start, start + METADATA_CONCURRENCY)
    const details = await Promise.all(batch.map(async candidate => {
      if (candidate.genreIds.length > 0 && candidate.runtime && candidate.voteAverage) return candidate

      try {
        const movie = await getMovieById(candidate.tmdbId)
        return {
          ...candidate,
          genreIds: candidate.genreIds.length > 0 ? candidate.genreIds : movie.genres.map(genre => genre.id),
          runtime: candidate.runtime ?? movie.runtime ?? null,
          voteAverage: candidate.voteAverage ?? movie.vote_average ?? null,
        }
      } catch {
        // Filtering treats missing metadata conservatively, so a temporary
        // TMDb failure cannot let an overlong or vetoed movie slip through.
        return candidate
      }
    }))

    details.forEach((candidate, index) => {
      hydrated[start + index] = candidate
    })
  }

  return hydrated
}

export async function getMovieNightSeed(userId: string): Promise<MovieNightSeed> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: { select: { id: true, username: true, avatarUrl: true } },
      userB: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    take:    MAX_FRIENDS,
  })

  const friendIds = friendships.map(f => f.userAId === userId ? f.userBId : f.userAId)
  const targetIds = [userId, ...friendIds]

  const [users, watchlist, recommendations, ratings, topFive] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: targetIds } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        tasteProfile: true,
        watchlistItems: { select: { genreIds: true }, take: 20 },
        topFiveMovies:  { select: { genreIds: true }, take: 5 },
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: { in: targetIds } },
      orderBy: [{ status: 'asc' }, { addedAt: 'desc' }],
      take: 180,
      select: {
        userId: true,
        tmdbId: true,
        title: true,
        posterPath: true,
        releaseDate: true,
        genreIds: true,
        runtime: true,
        voteAverage: true,
        status: true,
        matchScore: true,
      },
    }),
    prisma.recommendation.findMany({
      where: { userId: { in: targetIds } },
      orderBy: { matchScore: 'desc' },
      take: 120,
      select: {
        userId: true,
        tmdbId: true,
        title: true,
        posterPath: true,
        releaseDate: true,
        matchScore: true,
        explanation: true,
      },
    }),
    prisma.movieRating.findMany({
      where: { userId: { in: targetIds } },
      orderBy: { score: 'desc' },
      take: 180,
      select: {
        userId: true,
        tmdbId: true,
        title: true,
        posterPath: true,
        releaseDate: true,
        genreIds: true,
        runtime: true,
        voteAverage: true,
        score: true,
      },
    }),
    prisma.topFiveMovie.findMany({
      where: { userId: { in: targetIds } },
      orderBy: { position: 'asc' },
      select: {
        userId: true,
        tmdbId: true,
        title: true,
        posterPath: true,
        releaseDate: true,
        genreIds: true,
        position: true,
      },
    }),
  ])

  const userMap = new Map(users.map(user => [user.id, user]))
  const participants: MovieNightParticipant[] = targetIds
    .map(id => userMap.get(id))
    .filter((user): user is NonNullable<typeof user> => !!user)
    .map(user => {
      const genreIds = [
        ...user.watchlistItems.flatMap(item => item.genreIds ?? []),
        ...user.topFiveMovies.flatMap(movie => movie.genreIds ?? []),
      ]
      return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isViewer: user.id === userId,
        topGenres: topGenresFromIds(genreIds),
        dnaSummary: user.tasteProfile ? generateTasteSummary(dnaFromProfile(user.tasteProfile)) : null,
      }
    })

  const candidates = new Map<number, MovieNightCandidate>()
  const seen = new Map<number, MovieNightSeenBy[]>()

  for (const item of watchlist) {
    const user = userMap.get(item.userId)
    if (!user) continue

    if (item.status === 'watched') {
      addSeen(seen, item.tmdbId, { userId: user.id, username: user.username })
      continue
    }

    const candidate = upsertCandidate(candidates, item)
    const statusLabel = item.status === 'watching' ? 'has it in progress' : 'wants to watch it'
    addSupport(candidate, supportFor(
      'watchlist',
      user,
      item.status === 'watching' ? 30 : 36,
      `${user.username} ${statusLabel}`,
    ))
  }

  for (const rec of recommendations) {
    const user = userMap.get(rec.userId)
    if (!user) continue

    const candidate = upsertCandidate(candidates, { ...rec, genreIds: [] })
    addSupport(candidate, supportFor(
      'recommendation',
      user,
      18 + rec.matchScore * 0.24,
      `${user.username} has a ${rec.matchScore}% personal match`,
    ))
  }

  for (const rating of ratings) {
    const user = userMap.get(rating.userId)
    if (!user) continue

    addSeen(seen, rating.tmdbId, { userId: user.id, username: user.username })
    const existingCandidate = candidates.get(rating.tmdbId)
    if (existingCandidate) upsertCandidate(candidates, rating)
    if (rating.score < 85) continue

    const candidate = upsertCandidate(candidates, rating)
    addSupport(candidate, supportFor(
      'high_rating',
      user,
      18 + rating.score * 0.18,
      `${user.username} rated it ${rating.score}/100`,
    ))
  }

  for (const favorite of topFive) {
    const user = userMap.get(favorite.userId)
    if (!user) continue

    addSeen(seen, favorite.tmdbId, { userId: user.id, username: user.username })
    const candidate = upsertCandidate(candidates, favorite)
    addSupport(candidate, supportFor(
      'top_five',
      user,
      38 - favorite.position,
      `${user.username} keeps it in their Top 5`,
    ))
  }

  const finalized = [...candidates.values()]
    .map(candidate => ({
      ...candidate,
      seenBy: seen.get(candidate.tmdbId) ?? [],
    }))
    .map(candidate => finalizeScore(candidate, participants.length))
    .filter(candidate => candidate.supporters.length > 0)
    .sort((a, b) => b.baseScore - a.baseScore)
    .slice(0, MAX_CANDIDATES)
  const hydrated = await hydrateCandidateMetadata(finalized)

  return {
    viewerId: userId,
    participants,
    candidates: hydrated,
    generatedAt: new Date().toISOString(),
  }
}
