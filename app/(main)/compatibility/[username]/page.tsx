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
import { ArrowRightIcon } from '@/components/icons'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `Compatibility with @${username}` }
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
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
      <Link
        href={`/profile/${username}`}
        className="-ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface hover:text-ns-text"
      >
        <ArrowRightIcon size={14} className="rotate-180" />
        Back to @{username}
      </Link>

      <h1 className="mt-4 break-words font-display text-4xl text-ns-text sm:text-5xl">
        @{me?.username ?? 'you'} <span className="text-ns-subtle">×</span> @{username}
      </h1>

      <div className="mt-8">
        <CompatibilityScore score={result.score} insight={result.insight} reasons={result.reasons} />
      </div>

      {/* Personalities side by side */}
      {(myPersonality || theirPersonality) && (
        <section className="ns-reveal mt-12">
          <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Movie personalities</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col">
              <p className="mb-2 text-sm font-semibold text-ns-muted">You</p>
              {myPersonality ? (
                <div className="flex-1">
                  <PersonalityBadge primary={myPersonality.primaryType} secondary={myPersonality.secondaryType} compact />
                </div>
              ) : (
                <p className="flex-1 rounded-2xl bg-ns-surface p-5 text-base text-ns-muted">No personality yet</p>
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="mb-2 truncate text-sm font-semibold text-ns-muted">@{username}</p>
              {theirPersonality ? (
                <div className="flex-1">
                  <PersonalityBadge primary={theirPersonality.primaryType} secondary={theirPersonality.secondaryType} compact />
                </div>
              ) : (
                <p className="flex-1 rounded-2xl bg-ns-surface p-5 text-base text-ns-muted">No personality yet</p>
              )}
            </div>
          </div>
        </section>
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
        <section className="ns-reveal mt-12">
          <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Shared genres</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.sharedGenres.map(g => (
              <span key={g} className="rounded-full bg-ns-surface-2 px-4 py-2 text-sm font-medium capitalize text-ns-text">
                {g}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
