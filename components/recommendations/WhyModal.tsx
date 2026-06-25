'use client'

import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { EnrichedRec } from '@/services/curated-recs'
import {
  FilmIcon, CompassIcon, MovieDnaIcon, RatingsIcon, TrendingIcon, CalendarIcon,
  CloseIcon, ArrowRightIcon,
  type IconProps,
} from '@/components/icons'

interface Props {
  rec:     EnrichedRec
  onClose: () => void
}

function matchColor(score: number): string {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-ns-gold'
  if (score >= 55) return 'text-blue-400'
  return 'text-ns-muted'
}

function matchBg(score: number): string {
  if (score >= 85) return 'bg-emerald-400/10 border-emerald-400/30'
  if (score >= 70) return 'bg-ns-gold/10 border-ns-gold/30'
  if (score >= 55) return 'bg-blue-400/10 border-blue-400/30'
  return 'bg-ns-surface border-ns-border'
}

export default function WhyModal({ rec, onClose }: Props) {
  const hasContent =
    rec.matchedFavorites.length > 0  ||
    rec.matchedGenres.length    > 0  ||
    rec.matchedTraits.length    > 0  ||
    rec.ratingInsight !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-ns-bg border border-ns-border rounded-2xl
                      shadow-2xl shadow-black/80 overflow-hidden max-h-[85vh] flex flex-col">

        {/* Gold accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-ns-gold/0 via-ns-gold to-ns-gold/0 flex-shrink-0" />

        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-0">
          <div className="flex items-start gap-4">
            {/* Mini poster */}
            <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-ns-border">
              <Image
                src={tmdbImageUrl(rec.posterPath, 'w185')}
                alt={rec.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-ns-gold text-[9px] tracking-widest uppercase font-body mb-1">
                Why this recommendation?
              </p>
              <h2 className="font-display text-xl tracking-wider text-ns-text leading-tight line-clamp-2">
                {rec.title.toUpperCase()}
              </h2>
              {rec.releaseDate && (
                <p className="text-ns-muted text-xs font-body mt-0.5">{formatYear(rec.releaseDate)}</p>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-ns-muted hover:text-ns-text transition-colors flex-shrink-0"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Match score + view link */}
          <div className="flex items-center justify-between mt-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
                             text-sm font-body font-semibold ${matchColor(rec.matchScore)} ${matchBg(rec.matchScore)}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                rec.matchScore >= 85 ? 'bg-emerald-400' :
                rec.matchScore >= 70 ? 'bg-ns-gold' : 'bg-blue-400'
              }`} />
              {rec.matchScore}% Match
            </div>
            <Link href={`/movie/${rec.tmdbId}`}
              className="text-ns-gold text-xs font-body hover:text-amber-400 transition-colors">
              View film <ArrowRightIcon size={11} className="inline-block" />
            </Link>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Explanation */}
          <p className="text-ns-text font-body text-sm leading-relaxed border-l-2 border-ns-gold/40 pl-3">
            {rec.explanation}
          </p>

          {/* Because you liked… */}
          {rec.matchedFavorites.length > 0 && (
            <Section Icon={FilmIcon} title="Because you liked">
              <div className="flex flex-col gap-1.5">
                {rec.matchedFavorites.map(title => (
                  <div key={title} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-ns-gold flex-shrink-0" />
                    <span className="text-ns-text font-body text-sm">{title}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Matched genres */}
          {rec.matchedGenres.length > 0 && (
            <Section Icon={CompassIcon} title="Shared genres">
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedGenres.map(g => (
                  <span key={g}
                    className="px-2.5 py-1 rounded-full border border-ns-border bg-ns-surface
                               text-ns-muted text-xs font-body">
                    {g}
                  </span>
                ))}
              </div>
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
                        <span className="text-[9px] font-body text-ns-gold w-6 flex-shrink-0">You</span>
                        <div className="flex-1 h-1.5 bg-ns-bg rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-ns-gold transition-all duration-500"
                            style={{ width: `${t.yourScore * 10}%` }} />
                        </div>
                        <span className="text-[9px] font-body text-ns-gold w-5 text-right">{t.yourScore}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-body text-ns-muted w-6 flex-shrink-0">Film</span>
                        <div className="flex-1 h-1.5 bg-ns-bg rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-white/30 transition-all duration-500"
                            style={{ width: `${t.movieScore * 10}%` }} />
                        </div>
                        <span className="text-[9px] font-body text-ns-muted w-5 text-right">{t.movieScore}</span>
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
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
        <Icon size={12} className="flex-shrink-0" /> {title}
      </p>
      {children}
    </div>
  )
}
