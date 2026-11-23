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
import EmptyState from '@/components/ui/EmptyState'
import { ArrowRightIcon, CheckIcon } from '@/components/icons'

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

const BAR_MOTION = 'transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]'

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

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
    <fieldset>
      <legend className="mb-2.5 text-sm font-semibold text-ns-text">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {choices.map(choice => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            aria-pressed={choice.value === value}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${
              choice.value === value
                ? 'bg-ns-text text-ns-bg'
                : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'
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
  className = 'w-full',
  sizes = '(max-width: 640px) 40vw, 240px',
}: {
  tmdbId: number
  title: string
  posterPath: string | null
  className?: string
  sizes?: string
}) {
  return (
    <Link
      href={`/movie/${tmdbId}`}
      className={`group relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface-2 ${className}`}
      aria-label={`Open ${title}`}
    >
      <Image
        src={tmdbImageUrl(posterPath, 'w500')}
        alt=""
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes={sizes}
      />
    </Link>
  )
}

function StartButton({
  state,
  onStart,
  variant = 'primary',
}: {
  state: StartState
  onStart: () => void
  variant?: 'primary' | 'outline'
}) {
  if (state === 'started') {
    return (
      <span className="inline-flex min-h-11 animate-fade-up items-center gap-2 rounded-full bg-ns-success/10 px-5 text-sm font-semibold text-ns-success">
        <CheckIcon size={15} /> Passport started
      </span>
    )
  }
  return (
    <Button variant={variant} loading={state === 'loading'} onClick={onStart}>
      {state === 'loading' ? 'Starting…' : 'Start watching'}
    </Button>
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

  const pairFirstShare = selectedPair?.first.runtime && selectedPair.second.runtime
    ? selectedPair.first.runtime / (selectedPair.first.runtime + selectedPair.second.runtime)
    : 0.5

  return (
    <div className="space-y-4 lg:space-y-6">
      {activeTab === 'tonight' && (
        selected ? (
          <section aria-label="Tonight Mode workspace" className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
            <div className="rounded-3xl bg-ns-surface p-6 sm:p-8 lg:p-10">
              <h2 className="font-display text-3xl text-ns-text">Three constraints. One answer.</h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-ns-muted">
                Pro ranks the films you already meant to watch, so the result is useful without sending you into another discovery loop.
              </p>
              <div className="mt-7 space-y-6">
                <ChoiceRow label="Time available" value={time} choices={TIME_CHOICES} onChange={value => changeTonight(setTime, value)} />
                <ChoiceRow label="Mood" value={mood} choices={MOOD_CHOICES} onChange={value => changeTonight(setMood, value)} />
                <ChoiceRow label="Who's watching" value={company} choices={COMPANY_CHOICES} onChange={value => changeTonight(setCompany, value)} />
              </div>
              <div className="mt-8 border-t border-ns-border pt-5">
                <div className="flex items-center justify-between gap-3 text-sm text-ns-muted">
                  <span>Queue metadata coverage</span>
                  <span className="font-semibold tabular-nums text-ns-text">{runtimeCoverage}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
                  <div className={`h-full origin-left rounded-full bg-ns-muted ${BAR_MOTION}`} style={{ transform: `scaleX(${runtimeCoverage / 100})` }} />
                </div>
                <p className="mt-2 text-sm leading-6 text-ns-muted">
                  Results get sharper as runtime and Movie DNA match data fill in.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[112px_minmax(0,1fr)] content-center gap-x-5 gap-y-6 rounded-3xl bg-ns-surface p-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-x-8 sm:p-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-10">
              <div key={selected.tmdbId} className="animate-fade-up sm:row-span-2">
                <Poster tmdbId={selected.tmdbId} title={selected.title} posterPath={selected.posterPath} sizes="(max-width: 640px) 112px, 300px" />
              </div>
              <div className="min-w-0 self-center sm:self-start">
                <p className="text-sm text-ns-muted">
                  {formatYear(selected.releaseDate)}{selected.runtime ? ` · ${selected.runtime} min` : ''}
                </p>
                <Link key={selected.tmdbId} href={`/movie/${selected.tmdbId}`} className="mt-1 block animate-fade-up break-words font-display text-2xl text-ns-text transition-colors hover:text-ns-secondary-readable sm:text-4xl">
                  {selected.title}
                </Link>
                <div className="mt-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span key={selected.proScore} className="animate-fade-up font-heading text-xl font-bold tabular-nums text-ns-text">{selected.proScore}%</span>
                    <span className="text-sm text-ns-muted">tonight fit</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
                    <div className={`h-full origin-left rounded-full bg-ns-secondary ${BAR_MOTION}`} style={{ transform: `scaleX(${selected.proScore / 100})` }} />
                  </div>
                  <p className="mt-2 text-sm text-ns-muted">{selected.confidence}</p>
                </div>
              </div>
              <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
                <ul key={selected.tmdbId} className="animate-fade-up space-y-2.5">
                  {selected.reasons.map(reason => (
                    <li key={reason} className="flex gap-2.5 text-base leading-6 text-ns-text">
                      <CheckIcon size={16} className="mt-1 flex-shrink-0 text-ns-success" />
                      {reason}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-2">
                  <StartButton state={startStates[selected.tmdbId] ?? 'idle'} onStart={() => void startWatching(selected.tmdbId)} />
                  <Button variant="outline" onClick={() => setPickIndex(index => index + 1)}>Another pick</Button>
                </div>
                {startStates[selected.tmdbId] === 'error' && (
                  <p className="mt-3 text-sm text-ns-danger" role="alert">Could not update your Passport. Try again.</p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section aria-label="Tonight Mode workspace"><EmptyQueue /></section>
        )
      )}

      {activeTab === 'double' && (
        <section aria-label="Double Feature workspace" className="space-y-4 lg:space-y-6">
          <div className="flex flex-col gap-6 rounded-3xl bg-ns-surface p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl text-ns-text">Give the night an arc.</h2>
              <p className="mt-3 text-base leading-relaxed text-ns-muted">
                Pair two films from your own queue by total runtime and whether you want one sustained mood or a clean change of pace.
              </p>
            </div>
            <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
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
          </div>

          {selectedPair ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-6">
              <div className="rounded-3xl bg-ns-surface p-6 sm:p-8 lg:p-10">
                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                  {[selectedPair.first, selectedPair.second].map((movie, index) => (
                    <div key={movie.tmdbId} className="min-w-0 animate-fade-up lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start lg:gap-5">
                      <Poster tmdbId={movie.tmdbId} title={movie.title} posterPath={movie.posterPath} sizes="(max-width: 1024px) 42vw, 150px" />
                      <div className="min-w-0">
                        <p className="mt-4 text-sm text-ns-muted lg:mt-0">Film {index + 1}</p>
                        <Link href={`/movie/${movie.tmdbId}`} className="flex min-h-11 items-center font-heading text-lg font-bold leading-tight text-ns-text transition-colors hover:text-ns-secondary-readable sm:text-xl">
                          <span className="line-clamp-2">{movie.title}</span>
                        </Link>
                        <p className="text-sm tabular-nums text-ns-muted">{movie.runtime ? `${movie.runtime} min` : 'Runtime unknown'}</p>
                        <div className="mt-3">
                          <StartButton variant="outline" state={startStates[movie.tmdbId] ?? 'idle'} onStart={() => void startWatching(movie.tmdbId)} />
                        </div>
                        {startStates[movie.tmdbId] === 'error' && (
                          <p className="mt-2 text-sm text-ns-danger" role="alert">Could not update your Passport. Try again.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div aria-hidden="true" className="mt-7 flex h-2 gap-1">
                  <div className="h-full flex-1 overflow-hidden rounded-full bg-ns-surface-3">
                    <div className={`h-full origin-left rounded-full bg-ns-secondary ${BAR_MOTION}`} style={{ transform: `scaleX(${Math.min(1, pairFirstShare * 2)})` }} />
                  </div>
                  <div className="h-full flex-1 overflow-hidden rounded-full bg-ns-surface-3">
                    <div className={`h-full origin-left rounded-full bg-ns-text ${BAR_MOTION}`} style={{ transform: `scaleX(${Math.min(1, (1 - pairFirstShare) * 2)})` }} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col rounded-3xl bg-ns-surface p-6 sm:p-8">
                <p className="text-sm text-ns-muted">Pair fit</p>
                <p key={selectedPair.score} className="mt-1 animate-fade-up font-display text-6xl tabular-nums text-ns-text">{selectedPair.score}%</p>
                <p className="mt-5 text-base leading-relaxed text-ns-text">{selectedPair.reason}</p>
                <p className="mt-3 text-sm tabular-nums text-ns-muted">
                  {selectedPair.totalRuntime ? `${formatMinutes(selectedPair.totalRuntime)} total` : 'Total runtime partly unknown'}
                </p>
                <Button variant="outline" className="mt-6 w-full lg:mt-auto" onClick={() => setPairIndex(index => index + 1)}>
                  Build another
                </Button>
              </div>
            </div>
          ) : data.queue.length < 2 ? (
            <EmptyQueue needsPair />
          ) : (
            <EmptyState
              title="No pair fits that runtime yet"
              description="Some titles are missing runtime data, or the current cutoff is too tight."
              action={<Button onClick={() => { setPairBudget(0); setPairIndex(0) }}>Remove the cutoff</Button>}
            />
          )}
        </section>
      )}

      {activeTab === 'taste' && (
        <section aria-label="Taste Lab workspace" className="space-y-4 lg:space-y-6">
          <h2 className="ns-reveal font-display text-3xl text-ns-text sm:text-4xl">Taste receipts, not a horoscope.</h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
            <div className="ns-reveal rounded-3xl bg-ns-tile-rose p-7 sm:p-10">
              <p className="text-sm font-semibold text-ns-text">Taste calibration</p>
              <p className="mt-3 font-display text-7xl tabular-nums text-ns-text">{data.taste.calibration}%</p>
              <p className="mt-1 font-heading text-lg font-bold text-ns-text">{data.taste.calibrationLabel}</p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-ns-bg/60">
                <div className={`h-full origin-left rounded-full bg-ns-secondary ${BAR_MOTION}`} style={{ transform: `scaleX(${data.taste.calibration / 100})` }} />
              </div>
              <p className="mt-4 text-sm leading-6 text-ns-muted">
                Calibration measures signal depth, not whether your taste is good. It grows with ratings, genre coverage, and detailed craft scores.
              </p>
            </div>

            <div className="ns-reveal rounded-3xl bg-ns-surface p-6 sm:p-8 lg:p-10" style={{ '--i': 1 } as React.CSSProperties}>
              <dl className="grid grid-cols-3 gap-4">
                {[
                  { value: data.taste.ratingCount, label: 'Ratings analyzed' },
                  { value: data.taste.averageScore ?? '—', label: 'Average score' },
                  { value: data.taste.scoreSpread ?? '—', label: 'Score spread' },
                ].map(metric => (
                  <div key={metric.label} className="flex min-w-0 flex-col-reverse justify-end">
                    <dt className="mt-1 text-sm leading-5 text-ns-muted">{metric.label}</dt>
                    <dd className="font-display text-3xl tabular-nums text-ns-text sm:text-5xl">{metric.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 divide-y divide-ns-border border-t border-ns-border">
                <InsightRow
                  label="Strongest lane"
                  value={data.taste.strongestLane?.genre ?? 'Not enough signal'}
                  detail={data.taste.strongestLane
                    ? `${data.taste.strongestLane.averageScore}/100 average across ${data.taste.strongestLane.count} ${data.taste.strongestLane.count === 1 ? 'rating' : 'ratings'}`
                    : 'Rate films in a few genres to reveal it.'}
                />
                <InsightRow
                  label="Craft you reward"
                  value={data.taste.topDimension?.label ?? 'Add detailed ratings'}
                  detail={data.taste.topDimension
                    ? `${data.taste.topDimension.average}/10 across ${data.taste.topDimension.count} detailed ${data.taste.topDimension.count === 1 ? 'rating' : 'ratings'}`
                    : 'Detailed scores separate what worked from the overall result.'}
                />
              </div>
            </div>
          </div>

          <div className="ns-reveal flex flex-col gap-4 rounded-3xl bg-ns-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h3 className="font-heading text-lg font-bold text-ns-text">Best next signal</h3>
              <p className="mt-1 max-w-2xl text-base leading-relaxed text-ns-muted">{data.taste.nextSignal}</p>
            </div>
            <Button href="/ratings" variant="outline" className="flex-shrink-0">
              Open ratings <ArrowRightIcon size={15} />
            </Button>
          </div>
        </section>
      )}

      <section className="ns-reveal flex flex-col gap-4 rounded-3xl bg-ns-surface p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-ns-text">Spoiler safety stays underneath every Pro decision</h2>
          <p className="mt-1 text-base leading-relaxed text-ns-muted">
            {data.passport.protected} {data.passport.protected === 1 ? 'title is' : 'titles are'} protected, {data.passport.inProgress} in progress, and {data.passport.cleared} fully cleared in your Plot Passport.
          </p>
        </div>
        <Button href="/plot-passport" variant="outline" className="flex-shrink-0">
          Review boundaries <ArrowRightIcon size={15} />
        </Button>
      </section>

      <p className="sr-only" aria-live="polite">
        {Object.values(startStates).some(state => state === 'started') ? 'Plot Passport updated.' : ''}
      </p>
    </div>
  )
}

function EmptyQueue({ needsPair = false }: { needsPair?: boolean }) {
  return (
    <EmptyState
      className="rounded-3xl"
      title={needsPair ? 'Add one more film to build a pair' : 'Your ready-to-watch queue is empty'}
      description="Pro only chooses from films you have intentionally saved, so it never manufactures a reason to keep browsing."
      action={<Button href="/discover">Find something worth saving <ArrowRightIcon size={15} /></Button>}
    />
  )
}

function InsightRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <p className="text-sm text-ns-muted">{label}</p>
      <div className="min-w-0">
        <p className="font-heading text-lg font-bold text-ns-text">{value}</p>
        <p className="mt-0.5 text-sm leading-5 text-ns-muted">{detail}</p>
      </div>
    </div>
  )
}

