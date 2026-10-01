import Section from '@/components/ui/Section'
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

export default function DashboardDnaPreview({
  profile,
  username,
}: {
  profile: MovieDnaProfile | null
  username: string
}) {
  if (!profile) {
    return (
      <Section
        title="Build your Movie DNA"
        note="Rate a few films to turn your taste into better picks."
        href="/discover"
        linkLabel="Find films →"
      />
    )
  }

  const strongestTraits = (Object.entries(profile.scores) as [keyof DNAScores, number][])
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)

  return (
    <Section
      headingId="dna-preview-title"
      title={profile.identity?.name ?? 'Your taste fingerprint'}
      note={<span className="line-clamp-2">{profile.summary}</span>}
      href={`/profile/${username}`}
      linkLabel="View profile →"
    >
      <dl className="grid max-w-xl grid-cols-3 gap-4 border-t border-ns-border pt-4">
        {strongestTraits.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <dt className="truncate font-body text-xs text-ns-muted">{SCORE_LABELS[key]}</dt>
            <dd className="mt-1 font-display text-3xl leading-none tracking-wide text-ns-text">{value.toFixed(1)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-body text-xs text-ns-muted">
        Movie DNA · Based on {profile.ratingCount} {profile.ratingCount === 1 ? 'rating' : 'ratings'}
      </p>
    </Section>
  )
}
