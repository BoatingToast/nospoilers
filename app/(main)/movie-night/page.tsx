import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import MovieNightPlanner from '@/components/movie-night/MovieNightPlanner'
import { getMovieNightSeed } from '@/services/movie-night'

export const metadata: Metadata = {
  title: 'Movie Night Picker - NoSpoilers',
  description: 'Plan a spoiler-free movie night with friends using shared taste signals.',
}

export default async function MovieNightPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const seed = await getMovieNightSeed(session.user.id)
  return <MovieNightPlanner seed={seed} />
}
