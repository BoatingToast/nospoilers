import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncTopFiveFromOnboarding } from '@/services/top-five'
import type { OnboardingMovieInput } from '@/types'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { movies }: { movies: OnboardingMovieInput[] } = await req.json()

  if (!Array.isArray(movies) || movies.length < 5 || movies.length > 10) {
    return NextResponse.json({ error: 'Select between 5 and 10 movies.' }, { status: 400 })
  }

  const tmdbIds = movies.map(m => m.tmdbId)
  if (new Set(tmdbIds).size !== tmdbIds.length) {
    return NextResponse.json({ error: 'Select each movie only once.' }, { status: 400 })
  }

  // Replace the onboarding selection, then mirror the first five picks into Top 5.
  await prisma.$transaction(
    [
      prisma.onboardingMovie.deleteMany({
        where: {
          userId: session.user.id,
          tmdbId: { notIn: tmdbIds },
        },
      }),
      ...movies.map(m =>
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
      ),
    ]
  )
  await syncTopFiveFromOnboarding(session.user.id, movies)

  return NextResponse.json({ ok: true })
}
