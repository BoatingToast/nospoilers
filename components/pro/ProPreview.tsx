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
import {
  ArrowRightIcon,
  CheckIcon,
  ClapperboardIcon,
  LockIcon,
  MovieDnaIcon,
  RecsIcon,
  WatchlistIcon,
  type IconProps,
} from '@/components/icons'

interface ProPreviewProps {
  data: ProPreviewData
  username: string
}

type PreviewTab = 'tonight' | 'double' | 'taste'
type StartState = 'idle' | 'loading' | 'started' | 'error'

const TABS: Array<{
  id: PreviewTab
  label: string
  eyebrow: string
  Icon: React.ComponentType<IconProps>
}> = [
  { id: 'tonight', label: 'Tonight Mode', eyebrow: 'Make one good call', Icon: RecsIcon },
  { id: 'double', label: 'Double Feature', eyebrow: 'Build a two-film arc', Icon: ClapperboardIcon },
  { id: 'taste', label: 'Taste Lab', eyebrow: 'See the signal', Icon: MovieDnaIcon },
]

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
      <legend className="mb-2 text-[10px] font-heading font-semibold uppercase tracking-[0.16em] text-ns-muted">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {choices.map(choice => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            aria-pressed={choice.value === value}
            className={`rounded-xl border px-3 py-2 text-xs font-heading font-medium transition-colors ${
              choice.value === value
                ? 'border-ns-secondary/60 bg-ns-secondary/20 text-white'
                : 'border-ns-border bg-ns-bg/35 text-ns-muted hover:border-ns-secondary/35 hover:text-white'
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
      className={`relative block overflow-hidden rounded-2xl bg-ns-bg ${className}`}
      aria-label={`Open ${title}`}
    >
      <Image
        src={tmdbImageUrl(posterPath, 'w500')}
        alt=""
        fill
        className="object-cover transition-transform duration-300 hover:scale-[1.03]"
        sizes="(max-width: 640px) 45vw, 240px"
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ns-bg to-transparent" />
    </Link>
  )
}

export default function ProPreview({ data, username }: ProPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('tonight')
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

  function StartButton({ tmdbId }: { tmdbId: number }) {
    const state = startStates[tmdbId] ?? 'idle'
    return (
      <button
        type="button"
        onClick={() => void startWatching(tmdbId)}
        disabled={state === 'loading' || state === 'started'}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ns-secondary px-4 py-2 text-xs font-heading font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90 disabled:cursor-default disabled:opacity-70"
      >
        {state === 'started' ? <><CheckIcon size={14} /> Passport started</>
          : state === 'loading' ? 'Starting…'
            : 'Start watching'}
      </button>
    )
  }

  return (
    <section id="pro-lab" className="scroll-mt-28 border-y border-ns-secondary/20 bg-ns-surface/35" aria-labelledby="pro-lab-heading">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ns-success/30 bg-ns-success/10 px-3 py-1.5 text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-success">
              <span className="h-1.5 w-1.5 rounded-full bg-ns-success" /> Founding preview unlocked
            </div>
            <p className="text-xs font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">Your Pro Lab</p>
            <h2 id="pro-lab-heading" className="mt-2 font-display text-4xl tracking-wide text-white sm:text-6xl">
              LESS BROWSING. BETTER NIGHTS.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ns-muted">
              Built from @{username}&apos;s real queue and rating history. No plot summaries enter the decision.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { value: data.queueStats.count, label: 'Ready to watch' },
              { value: data.queueStats.knownRuntimeMinutes ? formatMinutes(data.queueStats.knownRuntimeMinutes) : '—', label: 'Queue time' },
              { value: `${data.taste.calibration}%`, label: 'Taste signal' },
            ].map(metric => (
              <div key={metric.label} className="min-w-24 rounded-2xl border border-ns-border bg-ns-surface/80 px-3 py-3 text-center sm:min-w-28">
                <p className="font-display text-2xl tracking-wide text-white">{metric.value}</p>
                <p className="mt-0.5 text-[9px] uppercase tracking-wider text-ns-muted">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Pro tools">
          {TABS.map(({ id, label, eyebrow, Icon }) => (
            <button
              key={id}
              id={`pro-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`pro-panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                activeTab === id
                  ? 'border-ns-secondary/55 bg-ns-secondary/15'
                  : 'border-ns-border bg-ns-surface/65 hover:border-ns-secondary/30'
              }`}
            >
              <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${activeTab === id ? 'bg-ns-secondary text-white' : 'bg-ns-bg text-ns-muted'}`}>
                <Icon size={19} />
              </span>
              <span>
                <span className="block font-heading text-sm font-semibold text-white">{label}</span>
                <span className="mt-0.5 block text-[10px] text-ns-muted">{eyebrow}</span>
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'tonight' && (
          <div id="pro-panel-tonight" role="tabpanel" aria-labelledby="pro-tab-tonight" className="mt-4 overflow-hidden rounded-3xl border border-ns-border bg-ns-surface">
            {selected ? (
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-ns-border p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <div className="grid gap-6 sm:grid-cols-[190px_1fr] lg:grid-cols-1 xl:grid-cols-[190px_1fr]">
                    <Poster tmdbId={selected.tmdbId} title={selected.title} posterPath={selected.posterPath} />
                    <div className="min-w-0 self-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-ns-secondary/15 px-2.5 py-1 text-[10px] font-semibold text-ns-secondary-readable">
                          {selected.proScore}% tonight fit
                        </span>
                        <span className="text-[10px] text-ns-muted">{selected.confidence}</span>
                      </div>
                      <Link href={`/movie/${selected.tmdbId}`} className="mt-3 block font-heading text-2xl font-semibold text-white hover:text-ns-secondary-readable">
                        {selected.title}
                      </Link>
                      <p className="mt-1 text-xs text-ns-muted">
                        {formatYear(selected.releaseDate)}{selected.runtime ? ` · ${selected.runtime} min` : ''}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {selected.reasons.map(reason => (
                          <li key={reason} className="flex gap-2 text-xs leading-5 text-ns-muted">
                            <CheckIcon size={14} className="mt-0.5 flex-shrink-0 text-ns-success" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <StartButton tmdbId={selected.tmdbId} />
                        <button
                          type="button"
                          onClick={() => setPickIndex(index => index + 1)}
                          className="min-h-10 rounded-xl border border-ns-border px-4 py-2 text-xs font-heading font-semibold text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-white"
                        >
                          Another pick
                        </button>
                      </div>
                      {startStates[selected.tmdbId] === 'error' && (
                        <p className="mt-2 text-xs text-ns-danger" role="alert">Could not update your Passport. Try again.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">Set tonight&apos;s brief</p>
                  <h3 className="mt-1 font-heading text-xl font-semibold text-white">Three constraints. One answer.</h3>
                  <p className="mt-2 max-w-lg text-xs leading-5 text-ns-muted">
                    Pro ranks the films you already meant to watch, so the result is useful without sending you into another discovery loop.
                  </p>
                  <div className="mt-7 space-y-6">
                    <ChoiceRow label="Time available" value={time} choices={TIME_CHOICES} onChange={value => changeTonight(setTime, value)} />
                    <ChoiceRow label="Mood" value={mood} choices={MOOD_CHOICES} onChange={value => changeTonight(setMood, value)} />
                    <ChoiceRow label="Who's watching" value={company} choices={COMPANY_CHOICES} onChange={value => changeTonight(setCompany, value)} />
                  </div>
                  <div className="mt-7 rounded-2xl border border-ns-border bg-ns-bg/40 p-4">
                    <div className="flex items-center justify-between text-[10px] text-ns-muted">
                      <span>Queue metadata coverage</span>
                      <span className="font-semibold text-white">{runtimeCoverage}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ns-border">
                      <div className="h-full rounded-full bg-ns-secondary-readable" style={{ width: `${runtimeCoverage}%` }} />
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-ns-muted/80">
                      Results get sharper as runtime and Movie DNA match data fill in.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyQueue />
            )}
          </div>
        )}

        {activeTab === 'double' && (
          <div id="pro-panel-double" role="tabpanel" aria-labelledby="pro-tab-double" className="mt-4 rounded-3xl border border-ns-border bg-ns-surface p-5 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">Double-feature builder</p>
                <h3 className="mt-1 font-heading text-2xl font-semibold text-white">Give the night an arc.</h3>
                <p className="mt-2 max-w-xl text-xs leading-5 text-ns-muted">
                  Pair two films from your own queue by total runtime and whether you want one sustained mood or a clean change of pace.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
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
              <div className="mt-8 grid gap-6 rounded-2xl border border-ns-secondary/25 bg-ns-bg/35 p-4 sm:p-6 lg:grid-cols-[1fr_auto_1fr_0.9fr] lg:items-center">
                {[selectedPair.first, selectedPair.second].map((movie, index) => (
                  <div key={movie.tmdbId} className="grid grid-cols-[100px_1fr] items-center gap-4 sm:grid-cols-[130px_1fr] lg:grid-cols-1 xl:grid-cols-[120px_1fr]">
                    <Poster tmdbId={movie.tmdbId} title={movie.title} posterPath={movie.posterPath} className="aspect-[2/3] w-full" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-ns-muted">Film {index + 1}</p>
                      <Link href={`/movie/${movie.tmdbId}`} className="mt-1 line-clamp-2 font-heading text-base font-semibold text-white hover:text-ns-secondary-readable">
                        {movie.title}
                      </Link>
                      <p className="mt-1 text-[10px] text-ns-muted">{movie.runtime ? `${movie.runtime} min` : 'Runtime unknown'}</p>
                      <div className="mt-3"><StartButton tmdbId={movie.tmdbId} /></div>
                    </div>
                  </div>
                )).reduce<React.ReactNode[]>((nodes, movie, index) => {
                  nodes.push(movie)
                  if (index === 0) nodes.push(
                    <div key="then" className="hidden h-10 w-10 place-items-center rounded-full border border-ns-border text-ns-secondary-readable lg:grid">
                      <ArrowRightIcon size={17} />
                    </div>,
                  )
                  return nodes
                }, [])}

                <div className="rounded-2xl border border-ns-border bg-ns-surface/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-ns-muted">Pair fit</span>
                    <span className="font-display text-2xl text-ns-secondary-readable">{selectedPair.score}%</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white">{selectedPair.reason}</p>
                  <p className="mt-3 text-xs text-ns-muted">
                    {selectedPair.totalRuntime ? `${formatMinutes(selectedPair.totalRuntime)} total` : 'Total runtime partly unknown'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPairIndex(index => index + 1)}
                    className="mt-5 w-full rounded-xl border border-ns-border px-4 py-2.5 text-xs font-heading font-semibold text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-white"
                  >
                    Build another
                  </button>
                </div>
              </div>
            ) : data.queue.length < 2 ? (
              <EmptyQueue needsPair />
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-ns-border px-6 py-12 text-center">
                <ClapperboardIcon size={34} className="mx-auto text-ns-muted/50" />
                <h4 className="mt-3 font-heading text-lg font-semibold text-white">No pair fits that runtime yet</h4>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-ns-muted">Some titles are missing runtime data, or the current cutoff is too tight.</p>
                <button type="button" onClick={() => { setPairBudget(0); setPairIndex(0) }} className="mt-4 rounded-xl bg-ns-secondary px-4 py-2 text-xs font-heading font-semibold text-white">
                  Remove the cutoff
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'taste' && (
          <div id="pro-panel-taste" role="tabpanel" aria-labelledby="pro-tab-taste" className="mt-4 rounded-3xl border border-ns-border bg-ns-surface p-5 sm:p-7">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">Taste calibration</p>
                    <p className="mt-3 font-display text-6xl tracking-wide text-white">{data.taste.calibration}%</p>
                    <p className="mt-1 text-sm font-heading font-semibold text-ns-secondary-readable">{data.taste.calibrationLabel}</p>
                  </div>
                  <MovieDnaIcon size={62} className="text-ns-secondary-readable/35" strokeWidth={1.2} />
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-ns-bg/60">
                  <div className="h-full rounded-full bg-ns-secondary-readable" style={{ width: `${data.taste.calibration}%` }} />
                </div>
                <p className="mt-4 text-xs leading-5 text-ns-muted">
                  Calibration measures signal depth—not whether your taste is good. It grows with ratings, genre coverage, and detailed craft scores.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">What your data says now</p>
                <h3 className="mt-1 font-heading text-2xl font-semibold text-white">Taste receipts, not a horoscope.</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    { value: data.taste.ratingCount, label: 'Ratings analyzed' },
                    { value: data.taste.averageScore ?? '—', label: 'Average score' },
                    { value: data.taste.scoreSpread ?? '—', label: 'Score spread' },
                  ].map(metric => (
                    <div key={metric.label} className="rounded-2xl border border-ns-border bg-ns-bg/35 p-4">
                      <p className="font-display text-3xl tracking-wide text-white">{metric.value}</p>
                      <p className="mt-1 text-[10px] text-ns-muted">{metric.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-ns-border bg-ns-bg/35 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-ns-secondary/15 text-ns-secondary-readable"><RecsIcon size={18} /></span>
                <div>
                  <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.15em] text-ns-secondary-readable">Best next signal</p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white">{data.taste.nextSignal}</p>
                </div>
              </div>
              <Link href="/ratings" className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ns-secondary/40 px-4 py-2.5 text-xs font-heading font-semibold text-ns-secondary-readable transition-colors hover:bg-ns-secondary hover:text-white">
                Open ratings <ArrowRightIcon size={13} />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 rounded-2xl border border-ns-border bg-ns-surface/65 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-ns-secondary/15 text-ns-secondary-readable"><LockIcon size={18} /></span>
            <div>
              <p className="font-heading text-sm font-semibold text-white">Spoiler safety stays underneath every Pro decision</p>
              <p className="mt-1 text-xs leading-5 text-ns-muted">
                {data.passport.protected} {data.passport.protected === 1 ? 'title is' : 'titles are'} protected, {data.passport.inProgress} in progress, and {data.passport.cleared} fully cleared in your Plot Passport.
              </p>
            </div>
          </div>
          <Link href="/plot-passport" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ns-border px-4 py-2.5 text-xs font-heading font-semibold text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-white">
            Review boundaries <ArrowRightIcon size={13} />
          </Link>
        </div>

        <p className="sr-only" aria-live="polite">
          {Object.values(startStates).some(state => state === 'started') ? 'Plot Passport updated.' : ''}
        </p>
      </div>
    </section>
  )
}

function EmptyQueue({ needsPair = false }: { needsPair?: boolean }) {
  return (
    <div className="px-6 py-16 text-center">
      <WatchlistIcon size={40} className="mx-auto text-ns-muted/50" />
      <h3 className="mt-4 font-heading text-lg font-semibold text-white">
        {needsPair ? 'Add one more film to build a pair' : 'Your ready-to-watch queue is empty'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-ns-muted">
        Pro only chooses from films you have intentionally saved, so it never manufactures a reason to keep browsing.
      </p>
      <Link href="/discover" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-ns-secondary px-5 py-2.5 text-xs font-heading font-semibold text-white">
        Find something worth saving <ArrowRightIcon size={13} />
      </Link>
    </div>
  )
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-ns-border bg-ns-bg/35 p-4">
      <p className="text-[9px] font-heading font-semibold uppercase tracking-[0.16em] text-ns-muted">{label}</p>
      <p className="mt-2 font-heading text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-ns-muted">{detail}</p>
    </div>
  )
}
