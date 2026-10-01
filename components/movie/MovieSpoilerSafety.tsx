'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { tmdbImageUrl } from '@/lib/utils'
import type { TMDbCastMember, TMDbVideo } from '@/types'
import MovieTrailers from './MovieTrailers'

type SafetyMode = 'blind' | 'safe' | 'standard'

interface Props {
  movieTitle: string
  overview: string
  condensedPremise: string
  cast: TMDbCastMember[]
  trailers: TMDbVideo[]
}

const MODES: Array<{ mode: SafetyMode; label: string; description: string }> = [
  { mode: 'blind', label: 'Blind', description: 'No story, cast, or trailer details' },
  { mode: 'safe', label: 'Safe', description: 'A short premise; cast and trailers hidden' },
  { mode: 'standard', label: 'Standard', description: 'Full synopsis, cast, and trailers' },
]

export default function MovieSpoilerSafety({
  movieTitle,
  overview,
  condensedPremise,
  cast,
  trailers,
}: Props) {
  const [mode, setMode] = useState<SafetyMode>('safe')

  return (
    <section aria-labelledby="spoiler-safety-heading" className="mb-10">
      <div className="rounded-2xl border border-ns-border bg-ns-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ns-secondary" aria-hidden="true" />
              <h2 id="spoiler-safety-heading" className="font-body text-xs uppercase tracking-widest text-ns-secondary-readable">
                Spoiler safety
              </h2>
            </div>
            <p className="font-body text-xs leading-relaxed text-ns-muted">
              Choose how much this page reveals. Safe mode starts with cast and trailers covered.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-ns-border bg-ns-bg/60 p-1" role="group" aria-label="Spoiler safety level">
            {MODES.map(option => (
              <button
                key={option.mode}
                type="button"
                aria-pressed={mode === option.mode}
                title={option.description}
                onClick={() => setMode(option.mode)}
                className={`rounded-lg px-3 py-2 font-body text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary ${
                  mode === option.mode
                    ? 'bg-ns-secondary text-ns-secondary-foreground shadow-sm'
                    : 'text-ns-muted hover:bg-ns-surface hover:text-ns-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 font-body text-[10px] text-ns-muted/60" aria-live="polite">
          {MODES.find(option => option.mode === mode)?.description}
        </p>
      </div>

      {mode === 'blind' && (
        <div className="mt-4 rounded-xl border border-dashed border-ns-border px-5 py-7 text-center">
          <p className="font-body text-sm font-medium text-ns-text">Story details are covered.</p>
          <p className="mt-1 font-body text-xs text-ns-muted">
            Vibe, audience fit, and viewing options remain available below.
          </p>
        </div>
      )}

      {mode === 'safe' && (
        <div className="mt-4 rounded-xl border border-ns-border bg-ns-surface p-4">
          <p className="mb-2 font-body text-xs uppercase tracking-widest text-ns-secondary-readable">
            Condensed premise
          </p>
          <p className="font-body text-sm leading-relaxed text-ns-text">{condensedPremise}</p>
          <p className="mt-3 border-t border-ns-border/70 pt-3 font-body text-[10px] leading-relaxed text-ns-muted/60">
            Automatically shortened from TMDb’s overview. Automated text cannot guarantee zero spoilers.
          </p>
        </div>
      )}

      {mode === 'standard' && (
        <div className="mt-6">
          <div className="mb-8 rounded-xl border border-ns-border bg-ns-surface p-4">
            <p className="mb-2 font-body text-xs uppercase tracking-widest text-ns-secondary-readable">Full synopsis</p>
            <p className="font-body text-sm leading-relaxed text-ns-text">
              {overview.trim() || 'No synopsis is available for this film.'}
            </p>
          </div>

          {cast.length > 0 && (
            <div className="mb-10">
              <p className="mb-4 font-body text-xs uppercase tracking-widest text-ns-muted">Cast</p>
              <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
                {cast.map(member => (
                  <Link
                    key={member.id}
                    href={`/actor/${member.id}`}
                    aria-label={`View ${member.name}'s movies`}
                    className="group w-[80px] flex-shrink-0 rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
                  >
                    <div className="mx-auto mb-2 h-[80px] w-[80px] overflow-hidden rounded-full border border-ns-border bg-ns-surface transition-all duration-200 group-hover:scale-105 group-hover:border-ns-secondary/60">
                      <Image
                        src={tmdbImageUrl(member.profile_path, 'w185')}
                        alt={member.name}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-body font-medium leading-tight text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                      {member.name}
                    </p>
                    <p className="truncate text-[10px] font-body leading-tight text-ns-muted/60">{member.character}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <MovieTrailers movieTitle={movieTitle} trailers={trailers} />
        </div>
      )}
    </section>
  )
}
