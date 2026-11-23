'use client'

import { formatYear } from '@/lib/utils'
import type { EnrichedRec } from '@/services/curated-recs'
import PosterImage from '@/components/discover/PosterImage'
import GrowBar from '@/components/movie/GrowBar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface Props {
  rec:     EnrichedRec
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h3 className="mb-2.5 font-heading text-base font-semibold text-ns-text">{title}</h3>
      {children}
    </section>
  )
}

function ScoreBar({ label, score, fill }: { label: string; score: number; fill: string }) {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2rem] items-center gap-2">
      <span className="text-xs text-ns-muted">{label}</span>
      <GrowBar value={score / 10} growOnMount fillClassName={fill} />
      <span className="text-right text-xs tabular-nums text-ns-text">{score}</span>
    </div>
  )
}

export default function WhyModal({ rec, onClose }: Props) {
  const titleId = `why-title-${rec.tmdbId}`
  const hasContent =
    rec.matchedFavorites.length > 0  ||
    rec.matchedRatings.length   > 0  ||
    rec.matchedLikedPicks.length > 0 ||
    rec.matchedGenres.length    > 0  ||
    rec.matchedTraits.length    > 0  ||
    rec.ratingInsight !== null

  return (
    <Modal onClose={onClose} ariaLabelledBy={titleId} maxWidth="max-w-lg">
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-4 pr-10">
          <div className="relative aspect-[2/3] w-16 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-2">
            <PosterImage path={rec.posterPath} size="w185" sizes="64px" alt={rec.title} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ns-muted">Why this recommendation?</p>
            <h2 id={titleId} className="mt-0.5 line-clamp-2 font-display text-2xl text-ns-text">{rec.title}</h2>
            {rec.releaseDate && (
              <p className="mt-0.5 text-sm tabular-nums text-ns-muted">{formatYear(rec.releaseDate)}</p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-ns-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-3xl tabular-nums text-ns-text">
              {rec.matchScore}% <span className="font-body text-sm font-medium text-ns-muted">match</span>
            </p>
            <Button href={`/movie/${rec.tmdbId}`} size="sm">View film</Button>
          </div>
          <GrowBar value={rec.matchScore / 100} growOnMount className="mt-3" />
        </div>

        <p className="mt-5 text-base leading-relaxed text-ns-text">{rec.explanation}</p>

        <div className="mt-5 divide-y divide-ns-border border-t border-ns-border pt-5">
          {rec.matchedFavorites.length > 0 && (
            <Section title="Because you liked">
              <ul className="space-y-1.5 text-sm text-ns-muted">
                {rec.matchedFavorites.map(title => <li key={title}>{title}</li>)}
              </ul>
            </Section>
          )}

          {rec.matchedRatings.length > 0 && (
            <Section title="Because you rated">
              <ul className="space-y-1.5">
                {rec.matchedRatings.map(rating => (
                  <li key={`${rating.title}-${rating.score}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ns-muted">{rating.title}</span>
                    <span className="flex-shrink-0 font-semibold tabular-nums text-ns-text">{rating.score}/100</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {rec.matchedLikedPicks.length > 0 && (
            <Section title="Learned from your feedback">
              <p className="text-sm leading-relaxed text-ns-muted">
                You liked {rec.matchedLikedPicks.join(' and ')}, so this pick follows that signal.
              </p>
            </Section>
          )}

          {rec.matchedGenres.length > 0 && (
            <Section title="Shared genres">
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedGenres.map(genre => <Badge key={genre} className="!bg-ns-surface-3">{genre}</Badge>)}
              </div>
            </Section>
          )}

          {rec.matchedTraits.length > 0 && (
            <Section title="Shared DNA traits">
              <div className="space-y-3.5">
                {rec.matchedTraits.map(trait => (
                  <div key={trait.trait}>
                    <p className="mb-1.5 text-sm text-ns-text">{trait.trait}</p>
                    <div className="space-y-1">
                      <ScoreBar label="You" score={trait.yourScore} fill="bg-ns-secondary" />
                      <ScoreBar label="Film" score={trait.movieScore} fill="bg-ns-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {rec.ratingInsight && (
            <Section title="Rating patterns">
              <p className="text-sm leading-relaxed text-ns-muted">{rec.ratingInsight}</p>
            </Section>
          )}

          {rec.expandTrait && (
            <Section title="Expands your taste">
              <p className="text-sm leading-relaxed text-ns-muted">
                This film scores highly in <span className="text-ns-text">{rec.expandTrait}</span>
                {' '}— a dimension below your usual preferences. Great for broadening your cinematic range.
              </p>
            </Section>
          )}

          {rec.classicEra && (
            <Section title="Classic era">
              <p className="text-sm leading-relaxed text-ns-muted">
                From the <span className="text-ns-text">{rec.classicEra}</span>, a highly-regarded film
                that matches your DNA profile.
              </p>
            </Section>
          )}

          {!hasContent && (
            <p className="py-2 text-sm text-ns-muted">
              This recommendation aligns broadly with your Movie DNA profile.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
