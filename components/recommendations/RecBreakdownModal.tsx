'use client'

import { useEffect } from 'react'
import type { EnrichedRec } from '@/services/curated-recs'
import Badge from '@/components/ui/Badge'
import {
  CloseIcon, StarIcon, MovieDnaIcon,
  ComplexityIcon, EmotionIcon, SuspenseIcon, DarknessIcon,
  ActionIcon, HumorIcon, RealismIcon, RatingsIcon,
  type IconProps,
} from '@/components/icons'

interface Props {
  rec:     EnrichedRec
  onClose: () => void
}

// ─── DNA trait label config ───────────────────────────────────────────────────

interface TraitMeta {
  label: string
  Icon:  React.ComponentType<IconProps>
  color: string
}

const TRAIT_META: Record<string, TraitMeta> = {
  complexityScore:      { label: 'Complexity',       Icon: ComplexityIcon, color: 'from-violet-500 to-violet-800' },
  emotionalImpactScore: { label: 'Emotional Impact', Icon: EmotionIcon,    color: 'from-rose-500 to-rose-800'    },
  suspenseScore:        { label: 'Suspense',         Icon: SuspenseIcon,   color: 'from-amber-500 to-amber-800'  },
  darknessScore:        { label: 'Darkness',         Icon: DarknessIcon,   color: 'from-slate-500 to-slate-800'  },
  actionScore:          { label: 'Action',           Icon: ActionIcon,     color: 'from-orange-500 to-orange-800' },
  humorScore:           { label: 'Humor',            Icon: HumorIcon,      color: 'from-yellow-500 to-yellow-800' },
  realismScore:         { label: 'Realism',          Icon: RealismIcon,    color: 'from-teal-500 to-teal-800'    },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecBreakdownModal({ rec, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-ns-surface border border-ns-border rounded max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-ns-surface border-b border-ns-border px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-heading font-semibold text-ns-text leading-tight line-clamp-1">
              {rec.title}
            </h3>
            <p className="mt-0.5 text-xs font-body text-ns-muted">
              Why We Recommend
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-ns-muted hover:text-ns-text transition-colors ml-3 flex-shrink-0"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Match score */}
          <div className="flex items-end gap-4 border-b-2 border-ns-text pb-4">
            <span className="font-display text-5xl leading-none tracking-wide text-ns-secondary-readable">{rec.matchScore}%</span>
            <div>
              <p className="text-xs font-body text-ns-text font-semibold">Overall Match</p>
              <p className="text-xs font-body text-ns-muted">
                {rec.matchScore >= 90 ? 'Exceptional fit for your taste DNA'
                  : rec.matchScore >= 75 ? 'Strong alignment with your preferences'
                  : 'Good match on several key dimensions'}
              </p>
            </div>
          </div>

          {/* DNA Dimension breakdown */}
          {rec.matchedTraits && rec.matchedTraits.length > 0 && (
            <section>
              <h4 className="text-xs font-body text-ns-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MovieDnaIcon size={12} /> DNA Dimension Match
              </h4>
              <div className="space-y-2.5">
                {rec.matchedTraits.map(trait => {
                  const key  = Object.keys(TRAIT_META).find(k => TRAIT_META[k].label === trait.trait) ?? trait.trait
                  const meta = TRAIT_META[key] ?? { label: trait.trait, Icon: RatingsIcon, color: 'from-ns-muted to-ns-border' }
                  const matchPct = Math.round(100 - Math.abs(trait.yourScore - trait.movieScore) * 10)
                  const MetaIcon = meta.Icon
                  return (
                    <div key={trait.trait}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <MetaIcon size={13} className="text-ns-secondary-readable/70" />
                          <span className="text-xs font-body text-ns-text">{meta.label}</span>
                        </div>
                        <span className="text-xs font-mono text-ns-secondary-readable">{matchPct}% match</span>
                      </div>
                      <div className="h-1.5 bg-ns-border overflow-hidden">
                        <div
                          className="h-full bg-ns-secondary"
                          style={{ width: `${matchPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[11px] text-ns-muted">You: {trait.yourScore.toFixed(1)}</span>
                        <span className="text-[11px] text-ns-muted">Film: {trait.movieScore.toFixed(1)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Because you liked */}
          {rec.matchedFavorites.length > 0 && (
            <section>
              <h4 className="text-xs font-body text-ns-muted uppercase tracking-wider mb-2">
                Similarity To Favorites
              </h4>
              <div className="space-y-1.5">
                {rec.matchedFavorites.map(fav => (
                  <div key={fav} className="flex items-center gap-2 text-xs font-body text-ns-text">
                    <StarIcon size={12} className="text-ns-secondary-readable flex-shrink-0" />
                    <span>Because you liked <strong className="text-ns-text">{fav}</strong></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* High-rating anchors */}
          {rec.matchedRatings.length > 0 && (
            <section>
              <h4 className="text-xs font-body text-ns-muted uppercase tracking-wider mb-2">
                Your Highest Ratings
              </h4>
              <div className="space-y-1.5">
                {rec.matchedRatings.map(rating => (
                  <div key={`${rating.title}-${rating.score}`} className="flex items-center justify-between gap-3 text-xs font-body">
                    <span className="text-ns-text">Because you rated <strong className="text-ns-text">{rating.title}</strong></span>
                    <span className="text-ns-secondary-readable font-mono flex-shrink-0">{rating.score}/100</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {rec.matchedLikedPicks.length > 0 && (
            <section>
              <h4 className="text-xs font-body text-ns-muted uppercase tracking-wider mb-2">
                Your Recommendation Feedback
              </h4>
              <p className="text-xs font-body text-ns-text border-l-2 border-ns-border pl-3">
                You liked {rec.matchedLikedPicks.join(' and ')}, so this result follows that signal.
              </p>
            </section>
          )}

          {/* Genre matches */}
          {rec.matchedGenres.length > 0 && (
            <section>
              <h4 className="text-xs font-body text-ns-muted uppercase tracking-wider mb-2">
                Genre Alignment
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedGenres.map(g => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Rating insight */}
          {rec.ratingInsight && (
            <section>
              <h4 className="text-xs font-body text-ns-muted uppercase tracking-wider mb-2">
                Your Rating Pattern
              </h4>
              <p className="text-xs font-body text-ns-text border-l-2 border-ns-border pl-3">
                {rec.ratingInsight}
              </p>
            </section>
          )}

          {/* Group context */}
          {rec.similarToTitle && (
            <p className="text-xs font-body text-ns-muted italic">
              Surfaced because it&apos;s similar to <strong className="text-ns-text">{rec.similarToTitle}</strong>.
            </p>
          )}
          {rec.classicEra && (
            <p className="text-xs font-body text-ns-muted italic">
              A {rec.classicEra} classic that aligns with your taste profile.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
