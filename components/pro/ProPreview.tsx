'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  buildProDoubleFeatures,
  rankProTonight,
  type ProCompany,
  type ProMood,
  type ProPairingBudget,
  type ProPairingStyle,
  type ProTimeBudget,
} from '@/lib/pro-features'
import type { ProPreviewData } from '@/services/pro'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

interface ProPreviewProps {
  data: ProPreviewData
  activeTab: PreviewTab
}

type PreviewTab = 'tonight' | 'double' | 'taste'
type StartState = 'idle' | 'loading' | 'started' | 'error'

const TIME_CHOICES: Array<{ value: ProTimeBudget; label: string }> = [
  { value: 'quick', label: '≤ 1h 45m' },
  { value: 'standard', label: 'About 2h' },
  { value: 'epic', label: 'Epic night' },
  { value: 'any', label: 'No limit' },
]

const MOOD_CHOICES: Array<{ value: ProMood; label: string }> = [
  { value: 'comfort', label: 'Comfort' },
  { value: 'gripping', label: 'Gripping' },
  { value: 'thoughtful', label: 'Thoughtful' },
  { value: 'surprise', label: 'Surprise me' },
]

const COMPANY_CHOICES: Array<{ value: ProCompany; label: string }> = [
  { value: 'solo', label: 'Solo' },
  { value: 'date', label: 'Two people' },
  { value: 'crowd', label: 'A crowd' },
]

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

const LABEL = 'text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-ns-muted'
const TEXT_LINK = 'inline-flex min-h-10 items-center font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text'

function ChoiceRow<T extends string | number>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string
  value: T
  choices: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={LABEL}>{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {choices.map(choice => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            aria-pressed={choice.value === value}
            className={`min-h-10 rounded border px-3 font-heading text-sm transition-colors ${
              choice.value === value
                ? 'border-ns-text bg-ns-surface-2 text-ns-text'
                : 'border-ns-border text-ns-muted hover:border-ns-text hover:text-ns-text'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Poster({
  tmdbId,
  title,
  posterPath,
  className = 'aspect-[2/3] w-full',
}: {
  tmdbId: number
  title: string
  posterPath: string | null
  className?: string
}) {
  return (
    <Link
      href={`/movie/${tmdbId}`}
      className={`relative block overflow-hidden rounded border border-ns-border bg-ns-surface transition-colors hover:border-ns-text/60 ${className}`}
      aria-label={`Open ${title}`}
    >
      <Image
        src={tmdbImageUrl(posterPath, 'w500')}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 640px) 45vw, 240px"
      />
    </Link>
  )
}

export default function ProPreview({ data, activeTab }: ProPreviewProps) {
  const [time, setTime] = useState<ProTimeBudget>('standard')
  const [mood, setMood] = useState<ProMood>('gripping')
  const [company, setCompany] = useState<ProCompany>('solo')
  const [pickIndex, setPickIndex] = useState(0)
  const [pairStyle, setPairStyle] = useState<ProPairingStyle>('contrast')
  const [pairBudget, setPairBudget] = useState<ProPairingBudget>(270)
  const [pairIndex, setPairIndex] = useState(0)
  const [startStates, setStartStates] = useState<Record<number, StartState>>({})

  const ranked = useMemo(
    () => rankProTonight(data.queue, { time, mood, company }),
    [company, data.queue, mood, time],
  )
  const selected = ranked.length ? ranked[pickIndex % ranked.length] : null
  const pairs = useMemo(
    () => buildProDoubleFeatures(data.queue, pairStyle, pairBudget),
    [data.queue, pairBudget, pairStyle],
  )
  const selectedPair = pairs.length ? pairs[pairIndex % pairs.length] : null
  const runtimeCoverage = data.queueStats.count
    ? Math.round((data.queueStats.knownRuntimeCount / data.queueStats.count) * 100)
    : 0

  function changeTonight<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPickIndex(0)
  }

  async function startWatching(tmdbId: number) {
    setStartStates(current => ({ ...current, [tmdbId]: 'loading' }))
    try {
      const response = await fetch(`/api/watchlist/${tmdbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'watching', progressPercent: 1 }),
      })
      if (!response.ok) throw new Error('Could not start movie')
      setStartStates(current => ({ ...current, [tmdbId]: 'started' }))
    } catch {
      setStartStates(current => ({ ...current, [tmdbId]: 'error' }))
    }
  }

  function StartButton({ tmdbId, variant = 'primary' }: { tmdbId: number; variant?: 'primary' | 'secondary' }) {
    const state = startStates[tmdbId] ?? 'idle'
    return (
      <Button
        variant={variant}
        className="min-h-10 disabled:cursor-default"
        onClick={() => void startWatching(tmdbId)}
        disabled={state === 'loading' || state === 'started'}
      >
        {state === 'started' ? 'Passport started'
          : state === 'loading' ? 'Starting…'
            : 'Start watching'}
      </Button>
    )
  }

  return (
    <div className="min-w-0">
      {activeTab === 'tonight' && (
        <div aria-label="Tonight Mode workspace" className="min-w-0">
          {selected ? (
            <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="grid min-w-0 gap-6 border-t-2 border-ns-text pt-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                <Poster tmdbId={selected.tmdbId} title={selected.title} posterPath={selected.posterPath} className="aspect-[2/3] w-full max-w-[200px]" />
                <div className="min-w-0">
                  <Link href={`/movie/${selected.tmdbId}`} className="block break-words font-display text-4xl leading-none tracking-wide text-ns-text hover:text-ns-secondary-readable sm:text-5xl">
                    {selected.title}
                  </Link>
                  <p className="mt-3 font-body text-sm text-ns-muted">
                    {formatYear(selected.releaseDate)}{selected.runtime ? ` · ${selected.runtime} min` : ''} · <span className="text-ns-secondary-readable">{selected.proScore}% tonight fit</span> · {selected.confidence}
                  </p>
                  <ul className="mt-5 border-b border-ns-border">
                    {selected.reasons.map(reason => (
                      <li key={reason} className="border-t border-ns-border py-3 font-body text-sm leading-relaxed text-ns-text">
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <StartButton tmdbId={selected.tmdbId} />
                    <Button variant="outline" className="min-h-10" onClick={() => setPickIndex(index => index + 1)}>
                      Another pick
                    </Button>
                  </div>
                  {startStates[selected.tmdbId] === 'error' && (
                    <p className="mt-3 font-body text-sm text-ns-danger" role="alert">Could not update your Passport. Try again.</p>
                  )}
                </div>
              </div>

              <Section
                title="Three constraints. One answer."
                note="Pro ranks the films you already meant to watch, so the result is useful without sending you into another discovery loop."
              >
                <div className="space-y-6">
                  <ChoiceRow label="Time available" value={time} choices={TIME_CHOICES} onChange={value => changeTonight(setTime, value)} />
                  <ChoiceRow label="Mood" value={mood} choices={MOOD_CHOICES} onChange={value => changeTonight(setMood, value)} />
                  <ChoiceRow label="Who's watching" value={company} choices={COMPANY_CHOICES} onChange={value => changeTonight(setCompany, value)} />
                </div>
                <div className="mt-7 border-t border-ns-border pt-4">
                  <div className="flex items-baseline justify-between gap-4 font-body text-sm text-ns-muted">
                    <span>Queue metadata coverage</span>
                    <span className="font-heading font-semibold text-ns-text">{runtimeCoverage}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden bg-ns-border">
                    <div className="h-full bg-ns-secondary-readable" style={{ width: `${runtimeCoverage}%` }} />
                  </div>
                  <p className="mt-2 font-body text-xs leading-relaxed text-ns-muted">
                    Results get sharper as runtime and Movie DNA match data fill in.
                  </p>
                </div>
              </Section>
            </div>
          ) : (
            <EmptyQueue />
          )}
        </div>
      )}

      {activeTab === 'double' && (
        <div aria-label="Double Feature workspace" className="min-w-0">
          <Section
            title="Give the night an arc."
            note="Pair two films from your own queue by total runtime and whether you want one sustained mood or a clean change of pace."
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
              <ChoiceRow
                label="Pairing"
                value={pairStyle}
                choices={[{ value: 'contrast', label: 'Contrast' }, { value: 'cohesive', label: 'Same vibe' }]}
                onChange={value => { setPairStyle(value); setPairIndex(0) }}
              />
              <ChoiceRow
                label="Total time"
                value={pairBudget}
                choices={[{ value: 210, label: '≤ 3h 30m' }, { value: 270, label: '≤ 4h 30m' }, { value: 0, label: 'No limit' }]}
                onChange={value => { setPairBudget(value); setPairIndex(0) }}
              />
            </div>
          </Section>

          {selectedPair ? (
            <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="min-w-0 border-b border-ns-border">
                {[selectedPair.first, selectedPair.second].map((movie, index) => (
                  <div key={movie.tmdbId} className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 border-t border-ns-border py-5 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-6">
                    <Poster tmdbId={movie.tmdbId} title={movie.title} posterPath={movie.posterPath} className="aspect-[2/3] w-full" />
                    <div className="min-w-0">
                      <p className={LABEL}>Film {index + 1}</p>
                      <Link href={`/movie/${movie.tmdbId}`} className="mt-1 line-clamp-2 break-words font-heading text-xl font-semibold text-ns-text hover:text-ns-secondary-readable">
                        {movie.title}
                      </Link>
                      <p className="mt-1 font-body text-sm text-ns-muted">{movie.runtime ? `${movie.runtime} min` : 'Runtime unknown'}</p>
                      <div className="mt-4"><StartButton tmdbId={movie.tmdbId} variant="secondary" /></div>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="min-w-0 border-t-2 border-ns-text pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={LABEL}>Pair fit</span>
                  <span className="font-display text-5xl leading-none tracking-wide text-ns-text">{selectedPair.score}%</span>
                </div>
                <p className="mt-4 font-body text-base leading-relaxed text-ns-text">{selectedPair.reason}</p>
                <p className="mt-3 font-body text-sm text-ns-muted">
                  {selectedPair.totalRuntime ? `${formatMinutes(selectedPair.totalRuntime)} total` : 'Total runtime partly unknown'}
                </p>
                <Button variant="outline" className="mt-5 min-h-10 w-full sm:w-auto" onClick={() => setPairIndex(index => index + 1)}>
                  Build another
                </Button>
              </aside>
            </div>
          ) : data.queue.length < 2 ? (
            <div className="mt-10"><EmptyQueue needsPair /></div>
          ) : (
            <div className="mt-10 border-t border-ns-border pt-5">
              <h3 className="font-heading text-lg font-semibold text-ns-text">No pair fits that runtime yet</h3>
              <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-ns-muted">Some titles are missing runtime data, or the current cutoff is too tight.</p>
              <Button variant="primary" className="mt-4 min-h-10" onClick={() => { setPairBudget(0); setPairIndex(0) }}>
                Remove the cutoff
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'taste' && (
        <div aria-label="Taste Lab workspace" className="mt-12 min-w-0">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Section title="Taste receipts, not a horoscope." note="What your data says now.">
              <div className="grid grid-cols-3 gap-4 border-t border-ns-border pt-4">
                {[
                  { value: data.taste.ratingCount, label: 'Ratings analyzed' },
                  { value: data.taste.averageScore ?? '—', label: 'Average score' },
                  { value: data.taste.scoreSpread ?? '—', label: 'Score spread' },
                ].map(metric => (
                  <div key={metric.label} className="min-w-0">
                    <p className="font-display text-4xl leading-none tracking-wide text-ns-text">{metric.value}</p>
                    <p className="mt-1 font-body text-xs text-ns-muted">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-b border-ns-border">
                <InsightCard
                  label="Strongest lane"
                  value={data.taste.strongestLane?.genre ?? 'Not enough signal'}
                  detail={data.taste.strongestLane
                    ? `${data.taste.strongestLane.averageScore}/100 average across ${data.taste.strongestLane.count} ${data.taste.strongestLane.count === 1 ? 'rating' : 'ratings'}`
                    : 'Rate films in a few genres to reveal it.'}
                />
                <InsightCard
                  label="Craft you reward"
                  value={data.taste.topDimension?.label ?? 'Add detailed ratings'}
                  detail={data.taste.topDimension
                    ? `${data.taste.topDimension.average}/10 across ${data.taste.topDimension.count} detailed ${data.taste.topDimension.count === 1 ? 'rating' : 'ratings'}`
                    : 'Detailed scores separate what worked from the overall result.'}
                />
                <div className="grid gap-1 border-t border-ns-border py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                  <p className={LABEL}>Best next signal</p>
                  <div className="min-w-0">
                    <p className="font-body text-sm leading-relaxed text-ns-text">{data.taste.nextSignal}</p>
                    <Link href="/ratings" className={`${TEXT_LINK} mt-1`}>Open ratings</Link>
                  </div>
                </div>
              </div>
            </Section>

            <aside className="min-w-0 border-t-2 border-ns-text pt-4">
              <p className={LABEL}>Taste calibration</p>
              <p className="mt-3 font-display text-7xl leading-none tracking-wide text-ns-text">{data.taste.calibration}%</p>
              <p className="mt-2 font-heading text-sm font-semibold text-ns-secondary-readable">{data.taste.calibrationLabel}</p>
              <div className="mt-5 h-1.5 overflow-hidden bg-ns-border">
                <div className="h-full bg-ns-secondary-readable" style={{ width: `${data.taste.calibration}%` }} />
              </div>
              <p className="mt-4 font-body text-sm leading-relaxed text-ns-muted">
                Calibration measures signal depth—not whether your taste is good. It grows with ratings, genre coverage, and detailed craft scores.
              </p>
            </aside>
          </div>
        </div>
      )}

      <div className="mt-12 grid gap-2 border-t border-ns-border pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold text-ns-text">Spoiler safety stays underneath every Pro decision</p>
          <p className="mt-1 font-body text-sm leading-relaxed text-ns-muted">
            {data.passport.protected} {data.passport.protected === 1 ? 'title is' : 'titles are'} protected, {data.passport.inProgress} in progress, and {data.passport.cleared} fully cleared in your Plot Passport.
          </p>
        </div>
        <Link href="/plot-passport" className={TEXT_LINK}>Review boundaries</Link>
      </div>

      <p className="sr-only" aria-live="polite">
        {Object.values(startStates).some(state => state === 'started') ? 'Plot Passport updated.' : ''}
      </p>
    </div>
  )
}

function EmptyQueue({ needsPair = false }: { needsPair?: boolean }) {
  return (
    <div className="border-t-2 border-ns-text pt-4">
      <h3 className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">
        {needsPair ? 'Add one more film to build a pair' : 'Your ready-to-watch queue is empty'}
      </h3>
      <p className="mt-3 max-w-md font-body text-sm leading-relaxed text-ns-muted">
        Pro only chooses from films you have intentionally saved, so it never manufactures a reason to keep browsing.
      </p>
      <Button variant="primary" href="/discover" className="mt-5 min-h-10">
        Find something worth saving
      </Button>
    </div>
  )
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-1 border-t border-ns-border py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
      <p className={LABEL}>{label}</p>
      <div className="min-w-0">
        <p className="font-heading text-lg font-semibold text-ns-text">{value}</p>
        <p className="mt-1 font-body text-sm leading-relaxed text-ns-muted">{detail}</p>
      </div>
    </div>
  )
}
