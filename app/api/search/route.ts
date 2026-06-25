import { NextResponse } from 'next/server'
import { searchMulti } from '@/services/tmdb'
import type { TMDbMovie, TMDbPerson } from '@/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()

  if (!query) return NextResponse.json({ movies: [], people: [] })

  try {
    const data = await searchMulti(query)

    const movies: TMDbMovie[] = []
    const people: TMDbPerson[] = []

    for (const result of data.results.slice(0, 15)) {
      if (result.media_type === 'movie') {
        movies.push(result as TMDbMovie & { media_type: 'movie' })
      } else if (result.media_type === 'person') {
        people.push(result as TMDbPerson & { media_type: 'person' })
      }
    }

    return NextResponse.json({
      movies: movies.slice(0, 6),
      people: people.slice(0, 4),
    })
  } catch (error) {
    console.error('[search]', error)
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }
}
