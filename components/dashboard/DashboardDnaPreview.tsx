import Button from '@/components/ui/Button'
import Meter from './Meter'
import { SectionLink } from './SectionHeading'
import type { DNAScores, MovieDnaProfile } from '@/types'

const SCORE_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore: 'Suspense',
  emotionalImpactScore: 'Emotion',
  complexityScore: 'Complexity',
  humorScore: 'Humor',
  realismScore: 'Realism',
  actionScore: 'Action',
  darknessScore: 'Darkness',
}

const RATING_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000]

export default function DashboardDnaPreview({
  profile,
  username,
}: {
  profile: MovieDnaProfile | null
  username: string
}) {
  if (!profile) {
    return (
      <section aria-labelledby="dna-preview-title" className="ns-reveal flex flex-col gap-5 rounded-2xl bg-ns-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 id="dna-preview-title" className="font-display text-2xl text-ns-text sm:text-3xl">Build your Movie DNA</h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">Rate a few films to turn your taste into better picks.</p>
        </div>
        <Button variant="secondary" href="/discover" className="flex-shrink-0 self-start bg-ns-surface-2 hover:bg-ns-surface-3 sm:self-auto">Find films</Button>
      </section>
    )
  }

  const strongestTraits = (Object.entries(profile.scores) as [keyof DNAScores, number][])
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)

  const nextMilestone = RATING_MILESTONES.find(milestone => milestone > profile.ratingCount)

  return (
    <section aria-labelledby="dna-preview-title" className="ns-reveal rounded-2xl bg-ns-surface p-6 sm:p-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-semibold text-ns-muted">Your Movie DNA</p>
          <h2 id="dna-preview-title" className="mt-2 font-display text-2xl text-ns-text sm:text-3xl">
            {profile.identity?.name ?? 'Your taste fingerprint'}
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ns-muted line-clamp-3">{profile.summary}</p>
          <div className="-ml-3 mt-3 sm:mt-auto sm:pt-4">
            <SectionLink href={`/profile/${username}`}>View profile</SectionLink>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <dl className="flex flex-col gap-4">
            {strongestTraits.map(([key, value], index) => (
              <div key={key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <dt className="text-sm font-semibold text-ns-text">{SCORE_LABELS[key]}</dt>
                  <dd className="text-sm tabular-nums text-ns-muted">{value.toFixed(1)}</dd>
                </div>
                <Meter value={value * 10} index={index} />
              </div>
            ))}
          </dl>

          <div className="border-t border-ns-border pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <p className="font-semibold text-ns-text">
                Based on {profile.ratingCount} {profile.ratingCount === 1 ? 'rating' : 'ratings'}
              </p>
              {nextMilestone && (
                <p className="tabular-nums text-ns-muted">{nextMilestone - profile.ratingCount} more to reach {nextMilestone}</p>
              )}
            </div>
            {nextMilestone && (
              <Meter value={(profile.ratingCount / nextMilestone) * 100} index={3} className="mt-2" barClassName="bg-ns-text" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
