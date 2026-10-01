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
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
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
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/compatibility/${username}`)}`)

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

  const noPersonality = (
    <p className="font-body text-sm text-ns-muted">No personality yet</p>
  )

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">

        {/* Back link */}
        <Link href={`/profile/${username}`} className="mb-6 inline-flex min-h-[40px] items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 transition-colors hover:text-ns-text hover:underline">
          ← Back to @{username}
        </Link>

        {/* Heading */}
        <PageHeader
          title={`@${me?.username ?? 'you'} × `}
          accent={`@${username}`}
          lede="Taste Compatibility: how closely your Movie DNA, ratings and favourite genres line up."
          className="mb-10 [overflow-wrap:anywhere]"
        />

        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-10">
            {/* Big score */}
            <CompatibilityScore score={result.score} insight={result.insight} reasons={result.reasons} />

            {/* DNA comparison */}
            <DNAComparison
              dnaDiff={result.dnaDiff}
              yourUsername={me?.username ?? 'You'}
              theirUsername={username}
            />
          </div>

          <div className="min-w-0 space-y-10">
            {/* Personalities */}
            {(myPersonality || theirPersonality) && (
              <Section title="Personalities">
                <div className="border-b border-ns-border">
                  <div className="border-t border-ns-border py-4">
                    <p className="mb-2 font-body text-[11px] uppercase tracking-widest text-ns-muted">You</p>
                    {myPersonality ? (
                      <PersonalityBadge primary={myPersonality.primaryType} secondary={myPersonality.secondaryType} compact />
                    ) : noPersonality}
                  </div>
                  <div className="border-t border-ns-border py-4">
                    <p className="mb-2 font-body text-[11px] tracking-widest text-ns-muted [overflow-wrap:anywhere]">@{username}</p>
                    {theirPersonality ? (
                      <PersonalityBadge primary={theirPersonality.primaryType} secondary={theirPersonality.secondaryType} compact />
                    ) : noPersonality}
                  </div>
                </div>
              </Section>
            )}

            {/* Shared movies */}
            {result.sharedMovies.length > 0 && (
              <SharedMovies movies={result.sharedMovies} />
            )}

            {/* Shared genres */}
            {result.sharedGenres.length > 0 && (
              <Section title="Shared Genres">
                <div className="flex flex-wrap gap-2">
                  {result.sharedGenres.map(g => (
                    <Badge key={g} variant="secondary" size="md" className="capitalize">
                      {g}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
