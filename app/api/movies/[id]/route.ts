import { NextResponse } from 'next/server'
import { getMovieById } from '@/services/tmdb'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const movieId = parseInt(id, 10)

  if (isNaN(movieId)) {
    return NextResponse.json({ error: 'Invalid movie ID.' }, { status: 400 })
  }

  try {
    const movie = await getMovieById(movieId)
    return NextResponse.json(movie)
  } catch (error) {
    console.error('[movies/id]', error)
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 })
  }
}
