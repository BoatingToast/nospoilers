import { NextResponse } from 'next/server'
import { getMovieSimilar } from '@/services/tmdb'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const movieId = parseInt(id, 10)
  if (isNaN(movieId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const data = await getMovieSimilar(movieId)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
