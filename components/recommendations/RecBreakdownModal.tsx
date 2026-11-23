'use client'

import type { EnrichedRec } from '@/services/curated-recs'
import GrowBar from '@/components/movie/GrowBar'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

interface Props {
  rec:     EnrichedRec
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h4 className="mb-2.5 font-heading text-base font-semibold text-ns-text">{title}</h4>
      {children}
    </section>
  )
}

export default function RecBreakdownModal({ rec, onClose }: Props) {
  const titleId = `breakdown-title-${rec.tmdbId}`

  return (
    <Modal onClose={onClose} ariaLabelledBy={titleId} maxWidth="max-w-lg">
      <div className="p-6 sm:p-7">
        <div className="pr-10">
          <p className="text-sm font-medium text-ns-muted">Why we recommend</p>
          <h3 id={titleId} className="mt-0.5 line-clamp-2 font-display text-2xl text-ns-text">{rec.title}</h3>
        </div>

        <div className="mt-5 rounded-xl bg-ns-surface-2 p-4">
          <p className="font-display text-4xl tabular-nums text-ns-text">{rec.matchScore}%</p>
          <p className="mt-1 text-sm font-semibold text-ns-text">Overall match</p>
          <p className="text-sm text-ns-muted">
            {rec.matchScore >= 90 ? 'Exceptional fit for your taste DNA'
              : rec.matchScore >= 75 ? 'Strong alignment with your preferences'
              : 'Good match on several key dimensions'}
          </p>
          <GrowBar value={rec.matchScore / 100} growOnMount className="mt-3" />
        </div>

        <div className="mt-5 divide-y divide-ns-border">
          {rec.matchedTraits && rec.matchedTraits.length > 0 && (
            <Section title="DNA dimension match">
              <div className="space-y-3.5">
                {rec.matchedTraits.map(trait => {
                  const matchPct = Math.round(100 - Math.abs(trait.yourScore - trait.movieScore) * 10)
                  return (
                    <div key={trait.trait}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="text-ns-text">{trait.trait}</span>
                        <span className="font-semibold tabular-nums text-ns-text">{matchPct}% match</span>
                      </div>
                      <GrowBar value={matchPct / 100} growOnMount fillClassName="bg-ns-muted" />
                      <div className="mt-1 flex justify-between text-xs tabular-nums text-ns-muted">
                        <span>You: {trait.yourScore.toFixed(1)}</span>
                        <span>Film: {trait.movieScore.toFixed(1)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {rec.matchedFavorites.length > 0 && (
            <Section title="Similarity to favorites">
              <ul className="space-y-1.5 text-sm text-ns-muted">
                {rec.matchedFavorites.map(fav => (
                  <li key={fav}>Because you liked <strong className="font-semibold text-ns-text">{fav}</strong></li>
                ))}
              </ul>
            </Section>
          )}

          {rec.matchedRatings.length > 0 && (
            <Section title="Your highest ratings">
              <ul className="space-y-1.5">
                {rec.matchedRatings.map(rating => (
                  <li key={`${rating.title}-${rating.score}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 text-ns-muted">Because you rated <strong className="font-semibold text-ns-text">{rating.title}</strong></span>
                    <span className="flex-shrink-0 font-semibold tabular-nums text-ns-text">{rating.score}/100</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {rec.matchedLikedPicks.length > 0 && (
            <Section title="Your recommendation feedback">
              <p className="text-sm leading-relaxed text-ns-muted">
                You liked {rec.matchedLikedPicks.join(' and ')}, so this result follows that signal.
              </p>
            </Section>
          )}

          {rec.matchedGenres.length > 0 && (
            <Section title="Genre alignment">
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedGenres.map(genre => <Badge key={genre} className="!bg-ns-surface-3">{genre}</Badge>)}
              </div>
            </Section>
          )}

          {rec.ratingInsight && (
            <Section title="Your rating pattern">
              <p className="text-sm leading-relaxed text-ns-muted">{rec.ratingInsight}</p>
            </Section>
          )}

          {(rec.similarToTitle || rec.classicEra) && (
            <div className="space-y-1 py-5 text-sm text-ns-muted last:pb-0">
              {rec.similarToTitle && (
                <p>Surfaced because it&apos;s similar to <strong className="font-semibold text-ns-text">{rec.similarToTitle}</strong>.</p>
              )}
              {rec.classicEra && <p>A {rec.classicEra} classic that aligns with your taste profile.</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
