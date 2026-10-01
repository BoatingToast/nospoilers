'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { tmdbImageUrl } from '@/lib/utils'
import type { TMDbCastMember, TMDbVideo } from '@/types'
import Section from '@/components/ui/Section'
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
    <>
      <Section
        headingId="spoiler-safety-heading"
        title="Spoiler safety"
        note="Choose how much this page reveals. Safe mode starts with cast and trailers covered."
        action={
          <div className="grid w-full grid-cols-3 overflow-hidden rounded border border-ns-border sm:w-auto" role="group" aria-label="Spoiler safety level">
            {MODES.map(option => (
              <button
                key={option.mode}
                type="button"
                aria-pressed={mode === option.mode}
                title={option.description}
                onClick={() => setMode(option.mode)}
                className={`min-h-10 border-l border-ns-border px-4 py-2 font-heading text-sm transition-colors first:border-l-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ns-secondary-readable ${
                  mode === option.mode
                    ? 'bg-ns-secondary text-ns-secondary-foreground'
                    : 'text-ns-muted hover:bg-ns-surface hover:text-ns-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        <p className="font-body text-sm text-ns-text" aria-live="polite">
          {MODES.find(option => option.mode === mode)?.description}
        </p>

        {mode === 'blind' && (
          <div className="mt-5 border-t border-ns-border pt-5">
            <p className="font-body text-sm font-medium text-ns-text">Story details are covered.</p>
            <p className="mt-1 font-body text-sm text-ns-muted">
              Vibe, audience fit, and viewing options remain available below.
            </p>
          </div>
        )}
      </Section>

      {mode === 'safe' && (
        <Section title="Condensed premise">
          <p className="max-w-3xl font-body text-base leading-relaxed text-ns-text">{condensedPremise}</p>
          <p className="mt-4 max-w-3xl font-body text-xs leading-relaxed text-ns-muted">
            Automatically shortened from TMDb’s overview. Automated text cannot guarantee zero spoilers.
          </p>
        </Section>
      )}

      {mode === 'standard' && (
        <>
          <Section title="Full synopsis">
            <p className="max-w-3xl font-body text-base leading-relaxed text-ns-text">
              {overview.trim() || 'No synopsis is available for this film.'}
            </p>
          </Section>

          {cast.length > 0 && (
            <Section title="Cast">
              <div className="grid gap-x-10 sm:grid-cols-2">
                {cast.map(member => (
                  <Link
                    key={member.id}
                    href={`/actor/${member.id}`}
                    aria-label={`View ${member.name}'s movies`}
                    className="group flex min-h-16 min-w-0 items-center gap-4 border-t border-ns-border py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary"
                  >
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-ns-border bg-ns-surface">
                      <Image
                        src={tmdbImageUrl(member.profile_path, 'w185')}
                        alt={member.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                        {member.name}
                      </p>
                      <p className="mt-0.5 truncate font-body text-xs text-ns-muted">{member.character}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <MovieTrailers movieTitle={movieTitle} trailers={trailers} />
        </>
      )}
    </>
  )
}
