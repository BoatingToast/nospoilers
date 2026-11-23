'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import PosterImage from '@/components/discover/PosterImage'
import PosterRail from '@/components/discover/PosterRail'
import type { TMDbCastMember, TMDbVideo } from '@/types'
import MovieTrailers from './MovieTrailers'
import WipeText from './WipeText'

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

/**
 * Bars that stand in for withheld content. Their sizes are fixed so they
 * reveal nothing about the length of what is hidden, and they hold no text.
 */
function CoverBars({ label, widths, inline = false, animate }: {
  label: string
  widths: string[]
  inline?: boolean
  animate: boolean
}) {
  const [covered, setCovered] = useState(!animate)

  useEffect(() => {
    if (covered) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setCovered(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [covered])

  return (
    <div role="img" aria-label={label} className={inline ? 'flex flex-wrap gap-2.5' : 'space-y-2.5'}>
      {widths.map((width, index) => (
        <span
          key={`${width}-${index}`}
          className={`block h-5 origin-left rounded bg-ns-secondary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${width} ${covered ? 'scale-x-100' : 'scale-x-0'}`}
          style={{ transitionDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  )
}

function DetailRow({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-3 py-7 first:pt-0 last:pb-0 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      <h3 id={id} className="font-heading text-lg font-semibold text-ns-text">{label}</h3>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default function MovieSpoilerSafety({
  movieTitle,
  overview,
  condensedPremise,
  cast,
  trailers,
}: Props) {
  const [mode, setMode] = useState<SafetyMode>('safe')
  // Content already allowed on first load is shown immediately. The wipe only
  // plays after the viewer deliberately changes the level.
  const [changed, setChanged] = useState(false)
  const selectedIndex = MODES.findIndex(option => option.mode === mode)

  function chooseMode(next: SafetyMode) {
    if (next === mode) return
    setMode(next)
    setChanged(true)
  }

  return (
    <section aria-labelledby="spoiler-safety-heading" className="rounded-3xl bg-ns-surface p-6 sm:p-10 lg:p-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="max-w-xl">
          <h2 id="spoiler-safety-heading" className="font-display text-4xl text-ns-text sm:text-5xl">
            Spoiler safety
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-ns-muted">
            Choose how much this page reveals. Safe mode starts with cast and trailers covered.
          </p>
        </div>

        <div className="w-full flex-shrink-0 lg:w-[27rem]">
          <div role="group" aria-label="Spoiler safety level" className="relative grid grid-cols-3 rounded-full bg-ns-bg p-1.5">
            <span
              aria-hidden="true"
              className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-ns-secondary transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `translateX(${selectedIndex * 100}%)` }}
            />
            {MODES.map(option => (
              <button
                key={option.mode}
                type="button"
                aria-pressed={mode === option.mode}
                title={option.description}
                onClick={() => chooseMode(option.mode)}
                className={`relative min-h-14 rounded-full text-base font-semibold ${
                  mode === option.mode
                    ? 'bg-ns-secondary text-ns-secondary-foreground [transition:background-color_0ms_linear_280ms,color_200ms_linear]'
                    : 'text-ns-muted [transition:color_200ms_linear] hover:text-ns-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p key={mode} className="mt-3 animate-fade-up text-center text-sm text-ns-muted" aria-live="polite">
            {MODES[selectedIndex].description}
          </p>
        </div>
      </div>

      <div className="mt-8 divide-y divide-ns-border border-t border-ns-border pt-7 lg:mt-10">
        {mode === 'blind' && (
          <DetailRow label="Premise">
            <CoverBars label="Premise hidden" widths={['w-full', 'w-11/12', 'w-3/5']} animate={changed} />
            <p className="mt-4 text-base font-medium text-ns-text">Story details are covered.</p>
            <p className="mt-1 text-sm text-ns-muted">
              Vibe, audience fit, and viewing options remain available below.
            </p>
          </DetailRow>
        )}

        {mode === 'safe' && (
          <DetailRow label="Condensed premise">
            <p className="max-w-2xl text-lg leading-relaxed text-ns-text">
              <WipeText key="safe" animate={changed}>{condensedPremise}</WipeText>
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ns-muted">
              Automatically shortened from TMDb’s overview. Automated text cannot guarantee zero spoilers.
            </p>
          </DetailRow>
        )}

        {mode === 'standard' && (
          <DetailRow label="Full synopsis">
            <p className="max-w-2xl text-lg leading-relaxed text-ns-text">
              <WipeText key="standard" animate={changed}>
                {overview.trim() || 'No synopsis is available for this film.'}
              </WipeText>
            </p>
          </DetailRow>
        )}

        {cast.length > 0 && (
          <DetailRow label="Cast">
            {mode === 'standard' ? (
              <PosterRail label={`${movieTitle} cast`} controlsLabel="cast" bleed={false}>
                {cast.map(member => (
                  <Link
                    key={member.id}
                    href={`/actor/${member.id}`}
                    aria-label={`View ${member.name}'s movies`}
                    className="group w-24 flex-shrink-0 snap-start rounded-xl text-center"
                  >
                    <span className="relative mx-auto mb-2 block h-20 w-20 overflow-hidden rounded-full bg-ns-surface-2">
                      <PosterImage
                        path={member.profile_path}
                        size="w185"
                        sizes="80px"
                        fallback="person"
                        className="transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                      />
                    </span>
                    <span className="line-clamp-2 text-sm font-semibold leading-tight text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                      <WipeText animate={changed}>{member.name}</WipeText>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ns-muted">
                      <WipeText animate={changed}>{member.character}</WipeText>
                    </span>
                  </Link>
                ))}
              </PosterRail>
            ) : (
              <CoverBars key={mode} label="Cast hidden" widths={['w-28', 'w-36', 'w-24']} inline animate={changed} />
            )}
          </DetailRow>
        )}

        {trailers.length > 0 && (
          <DetailRow id="movie-trailers-heading" label="Trailers">
            {mode === 'standard' ? (
              <MovieTrailers movieTitle={movieTitle} trailers={trailers} />
            ) : (
              <CoverBars key={mode} label="Trailers hidden" widths={['w-44', 'w-32']} inline animate={changed} />
            )}
          </DetailRow>
        )}
      </div>
    </section>
  )
}
