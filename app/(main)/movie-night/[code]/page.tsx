import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import LiveMovieNightRoom from '@/components/movie-night/LiveMovieNightRoom'

export const metadata: Metadata = {
  title: 'Movie Night Live - NoSpoilers',
  description: 'Vote privately with friends and reveal the movie everyone wants to watch.',
}

export default async function LiveMovieNightPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const session = await getServerSession(authOptions)

  return (
    <LiveMovieNightRoom
      code={code.toUpperCase()}
      initialDisplayName={session?.user?.name ?? ''}
    />
  )
}
