import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeCompatibility } from '@/services/compatibility'
import { getPersonalityBySlug, getUserPersonality } from '@/services/personality'
import CompatibilityScore from '@/components/compatibility/CompatibilityScore'
import DNAComparison from '@/components/compatibility/DNAComparison'
import SharedMovies from '@/components/compatibility/SharedMovies'
import PersonalityBadge from '@/components/profile/PersonalityBadge'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `Compatibility with @${username} — NoSpoilers` }
}

export default async function CompatibilityPage({ params }: Props) {
  const { username } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const target = await prisma.user.findUnique({
    where:  { username },
    select: { id: true, username: true, onboardingCompleted: true },
  })
  if (!target || !target.onboardingCompleted) notFound()
  if (target.id === session.user.id) redirect(`/profile/${username}`)

  const [result, myPersonality, theirPersonality] = await Promise.all([
    computeCompatibility(session.user.id, target.id),
    getUserPersonality(session.user.id),
    getUserPersonality(target.id),
  ])

  // Get the session user's username
  const me = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { username: true },
  })

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Back link */}
        <Link href={`/profile/${username}`} className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-8">
          ← Back to @{username}
        </Link>

        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-3">Taste Compatibility</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-4">
            @{me?.username ?? 'you'} × @{username}
          </h1>
        </div>

        {/* Big score */}
        <CompatibilityScore score={result.score} insight={result.insight} reasons={result.reasons} />

        {/* Personalities side by side */}
        {(myPersonality || theirPersonality) && (
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div>
              <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-2 text-center">You</p>
              {myPersonality ? (
                <PersonalityBadge primary={myPersonality.primaryType} secondary={myPersonality.secondaryType} compact />
              ) : (
                <div className="bg-ns-surface border border-ns-border rounded-2xl p-4 text-center text-ns-muted text-sm font-body">
                  No personality yet
                </div>
              )}
            </div>
            <div>
              <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-2 text-center">@{username}</p>
              {theirPersonality ? (
                <PersonalityBadge primary={theirPersonality.primaryType} secondary={theirPersonality.secondaryType} compact />
              ) : (
                <div className="bg-ns-surface border border-ns-border rounded-2xl p-4 text-center text-ns-muted text-sm font-body">
                  No personality yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shared movies */}
        {result.sharedMovies.length > 0 && (
          <SharedMovies movies={result.sharedMovies} />
        )}

        {/* DNA comparison */}
        <DNAComparison
          dnaDiff={result.dnaDiff}
          yourUsername={me?.username ?? 'You'}
          theirUsername={username}
        />

        {/* Shared genres */}
        {result.sharedGenres.length > 0 && (
          <div className="mt-8 bg-ns-surface border border-ns-border rounded-2xl p-6">
            <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Shared Genres</p>
            <div className="flex flex-wrap gap-2">
              {result.sharedGenres.map(g => (
                <span key={g} className="px-3 py-1.5 rounded-full bg-ns-gold/10 border border-ns-gold/30 text-ns-gold text-xs font-body capitalize">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
