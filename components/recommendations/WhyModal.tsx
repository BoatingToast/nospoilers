'use client'

import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { EnrichedRec } from '@/services/curated-recs'
import Badge from '@/components/ui/Badge'
import {
  FilmIcon, CompassIcon, MovieDnaIcon, RatingsIcon, TrendingIcon, CalendarIcon,
  CloseIcon, ArrowRightIcon, RecsIcon,
  type IconProps,
} from '@/components/icons'

interface Props {
  rec:     EnrichedRec
  onClose: () => void
}

function matchVariant(score: number): 'success' | 'secondary' | 'info' | 'muted' {
  if (score >= 85) return 'success'
  if (score >= 70) return 'secondary'
  if (score >= 55) return 'info'
  return 'muted'
}

export default function WhyModal({ rec, onClose }: Props) {
  const hasContent =
    rec.matchedFavorites.length > 0  ||
    rec.matchedRatings.length   > 0  ||
    rec.matchedLikedPicks.length > 0 ||
    rec.matchedGenres.length    > 0  ||
    rec.matchedTraits.length    > 0  ||
    rec.ratingInsight !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-ns-bg border border-ns-border rounded
                      overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-0">
          <div className="flex items-start gap-4">
            {/* Mini poster */}
            <div className="relative w-14 h-20 rounded overflow-hidden flex-shrink-0 border border-ns-border">
              <Image
                src={tmdbImageUrl(rec.posterPath, 'w185')}
                alt={rec.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl tracking-wide text-ns-text leading-none line-clamp-2">
                {rec.title.toUpperCase()}
              </h2>
              <p className="text-ns-muted text-xs font-body mt-1.5">
                {rec.releaseDate && <>{formatYear(rec.releaseDate)} · </>}
                Why this recommendation?
              </p>
            </div>

            <button
              onClick={onClose}
              className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center text-ns-muted hover:text-ns-text transition-colors flex-shrink-0"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Match score + view link */}
          <div className="flex items-center justify-between mt-4 border-b-2 border-ns-text pb-4">
            <Badge variant={matchVariant(rec.matchScore)} size="md">
              {rec.matchScore}% Match
            </Badge>
            <Link href={`/movie/${rec.tmdbId}`}
              className="inline-flex min-h-10 items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
              View film <ArrowRightIcon size={12} className="inline-block" />
            </Link>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Explanation */}
          <p className="text-ns-text font-body text-sm leading-relaxed border-l-2 border-ns-secondary/40 pl-3">
            {rec.explanation}
          </p>

          {/* Because you liked… */}
          {rec.matchedFavorites.length > 0 && (
            <Section Icon={FilmIcon} title="Because you liked">
              <div className="flex flex-col gap-1.5">
                {rec.matchedFavorites.map(title => (
                  <div key={title} className="border-t border-ns-border pt-1.5">
                    <span className="text-ns-text font-body text-sm">{title}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Because you rated… */}
          {rec.matchedRatings.length > 0 && (
            <Section Icon={RatingsIcon} title="Because you rated">
              <div className="flex flex-col gap-1.5">
                {rec.matchedRatings.map(rating => (
                  <div key={`${rating.title}-${rating.score}`} className="flex items-center justify-between gap-3 border-t border-ns-border pt-1.5">
                    <span className="text-ns-text font-body text-sm">{rating.title}</span>
                    <span className="text-ns-secondary-readable font-mono text-xs flex-shrink-0">{rating.score}/100</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Learned from recommendation feedback */}
          {rec.matchedLikedPicks.length > 0 && (
            <Section Icon={RecsIcon} title="Learned from your feedback">
              <p className="text-ns-text font-body text-sm">
                You liked {rec.matchedLikedPicks.join(' and ')}, so this pick follows that signal.
              </p>
            </Section>
          )}

          {/* Matched genres */}
          {rec.matchedGenres.length > 0 && (
            <Section Icon={CompassIcon} title="Shared genres">
              <p className="text-ns-text font-body text-sm">
                {rec.matchedGenres.join(' · ')}
              </p>
            </Section>
          )}

          {/* DNA trait matches */}
          {rec.matchedTraits.length > 0 && (
            <Section Icon={MovieDnaIcon} title="Shared DNA traits">
              <div className="space-y-3">
                {rec.matchedTraits.map(t => (
                  <div key={t.trait}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-ns-text text-xs font-body flex items-center gap-1.5">
                        {t.trait}
                      </span>
                    </div>
                    {/* Two independent bars — one per score */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-body text-ns-secondary-readable w-6 flex-shrink-0">You</span>
                        <div className="flex-1 h-1.5 bg-ns-surface-2 overflow-hidden">
                          <div className="h-full bg-ns-secondary"
                            style={{ width: `${t.yourScore * 10}%` }} />
                        </div>
                        <span className="text-[11px] font-body text-ns-secondary-readable w-5 text-right">{t.yourScore}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-body text-ns-muted w-6 flex-shrink-0">Film</span>
                        <div className="flex-1 h-1.5 bg-ns-surface-2 overflow-hidden">
                          <div className="h-full bg-ns-muted"
                            style={{ width: `${t.movieScore * 10}%` }} />
                        </div>
                        <span className="text-[11px] font-body text-ns-muted w-5 text-right">{t.movieScore}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Rating pattern insight */}
          {rec.ratingInsight && (
            <Section Icon={RatingsIcon} title="Rating patterns">
              <p className="text-ns-text font-body text-sm">{rec.ratingInsight}</p>
            </Section>
          )}

          {/* Expand / classic extras */}
          {rec.expandTrait && (
            <Section Icon={TrendingIcon} title="Expands your taste">
              <p className="text-ns-muted font-body text-xs">
                This film scores highly in <span className="text-ns-text">{rec.expandTrait}</span>
                — a dimension below your usual preferences. Great for broadening your cinematic range.
              </p>
            </Section>
          )}

          {rec.classicEra && (
            <Section Icon={CalendarIcon} title="Classic era">
              <p className="text-ns-muted font-body text-xs">
                From the <span className="text-ns-text">{rec.classicEra}</span>, a highly-regarded film
                that matches your DNA profile.
              </p>
            </Section>
          )}

          {!hasContent && (
            <p className="text-ns-muted font-body text-sm text-center py-4">
              This recommendation aligns broadly with your Movie DNA profile.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section sub-component ────────────────────────────────────────────────────

function Section({ Icon, title, children }: {
  Icon: React.ComponentType<IconProps>
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
        <Icon size={12} className="flex-shrink-0" /> {title}
      </p>
      {children}
    </div>
  )
}
