import { NextResponse } from 'next/server'
import { searchMulti } from '@/services/tmdb'
import type { SearchApiResponse, TMDbMovie, TMDbPerson } from '@/types'
import { enforceRateLimit } from '@/lib/rate-limit'

function resultLimit(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), 20)
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, {
    scope: 'unified-search', limit: 60, windowMs: 60 * 1000,
  })
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const requestedLimit = searchParams.get('limit')
  const movieLimit = resultLimit(requestedLimit, 6)
  const peopleLimit = resultLimit(requestedLimit, 4)

  if (!query) {
    const emptyResponse: SearchApiResponse = {
      query: '',
      movies: [],
      people: [],
      totalResults: 0,
    }
    return NextResponse.json(emptyResponse)
  }

  try {
    const data = await searchMulti(query)

    const movies: TMDbMovie[] = []
    const people: TMDbPerson[] = []

    for (const result of data.results) {
      if (result.media_type === 'movie') {
        movies.push(result as TMDbMovie & { media_type: 'movie' })
      } else if (result.media_type === 'person') {
        people.push(result as TMDbPerson & { media_type: 'person' })
      }
    }

    const response: SearchApiResponse = {
      query,
      movies: movies.slice(0, movieLimit),
      people: people.slice(0, peopleLimit),
      totalResults: data.total_results,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[search]', error)
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }
}
