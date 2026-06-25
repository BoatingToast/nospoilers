import { NextResponse } from 'next/server'
import { searchMovies, getTrendingMovies } from '@/services/tmdb'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const page  = parseInt(searchParams.get('page') ?? '1', 10)

  try {
    if (query && query.trim()) {
      const results = await searchMovies(query.trim(), page)
      return NextResponse.json(results)
    }

    const trending = await getTrendingMovies('week')
    return NextResponse.json(trending)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch movies.'
    console.error('[movies/search]', message)

    // Surface credential errors clearly so they show up in the UI
    const isCredentialError = message.includes('credentials missing')
    return NextResponse.json(
      { error: isCredentialError ? 'TMDb API key not configured.' : 'Search unavailable. Please try again.' },
      { status: isCredentialError ? 503 : 500 }
    )
  }
}
