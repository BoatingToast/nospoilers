import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { OnboardingMovieInput } from '@/types'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { movies }: { movies: OnboardingMovieInput[] } = await req.json()

  if (!Array.isArray(movies) || movies.length < 5 || movies.length > 10) {
    return NextResponse.json({ error: 'Select between 5 and 10 movies.' }, { status: 400 })
  }

  // Upsert each movie (idempotent — safe to call multiple times)
  await prisma.$transaction(
    movies.map(m =>
      prisma.onboardingMovie.upsert({
        where:  { userId_tmdbId: { userId: session.user.id, tmdbId: m.tmdbId } },
        create: {
          userId:      session.user.id,
          tmdbId:      m.tmdbId,
          title:       m.title,
          posterPath:  m.posterPath,
          releaseDate: m.releaseDate,
          genreIds:    m.genreIds,
        },
        update: {
          title:       m.title,
          posterPath:  m.posterPath,
          releaseDate: m.releaseDate,
          genreIds:    m.genreIds,
        },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
