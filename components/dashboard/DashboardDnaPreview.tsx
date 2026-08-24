import Link from 'next/link'
import { MovieDnaIcon, ArrowRightIcon } from '@/components/icons'
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
      <section className="rounded-2xl border border-dashed border-ns-border bg-ns-surface/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3">
          <MovieDnaIcon size={22} className="mt-0.5 flex-shrink-0 text-ns-secondary-readable/60" />
          <div>
            <h2 className="text-sm font-heading font-semibold text-ns-text">Build your Movie DNA</h2>
            <p className="mt-1 text-xs font-body leading-relaxed text-ns-muted">Rate a few films to turn your taste into better picks.</p>
          </div>
        </div>
        <Link href="/discover" className="mt-4 inline-flex items-center gap-1 text-xs font-body text-ns-secondary-readable hover:text-amber-300 sm:mt-0">
          Find films <ArrowRightIcon size={11} />
        </Link>
      </section>
    )
  }

  const strongestTraits = (Object.entries(profile.scores) as [keyof DNAScores, number][])
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)

  return (
    <section aria-labelledby="dna-preview-title" className="rounded-2xl border border-ns-border bg-ns-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-body uppercase tracking-[0.2em] text-ns-secondary-readable">
            <MovieDnaIcon size={12} /> Movie DNA
          </p>
          <h2 id="dna-preview-title" className="mt-1 font-heading text-base font-semibold text-ns-text">
            {profile.identity?.name ?? 'Your taste fingerprint'}
          </h2>
          <p className="mt-1 max-w-2xl text-xs font-body leading-relaxed text-ns-muted line-clamp-2">{profile.summary}</p>
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-2">
          {strongestTraits.map(([key, value]) => (
            <span key={key} className="rounded-full border border-ns-secondary/20 bg-ns-secondary/10 px-2.5 py-1 text-[10px] font-body text-ns-secondary-readable">
              {SCORE_LABELS[key]} {value.toFixed(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ns-border/60 pt-3">
        <p className="text-[10px] font-body text-ns-muted">Based on {profile.ratingCount} {profile.ratingCount === 1 ? 'rating' : 'ratings'}</p>
        <Link href={`/profile/${username}`} className="inline-flex items-center gap-1 text-xs font-body text-ns-secondary-readable hover:text-amber-300">
          View profile <ArrowRightIcon size={11} />
        </Link>
      </div>
    </section>
  )
}
