'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import type { WatchlistItemData } from '@/types'
import { cn, formatYear } from '@/lib/utils'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { ArrowRightIcon, CheckIcon } from '@/components/icons'
import { Meter, posterZoomClass, revealDelay, useInView } from '@/components/watchlist/LibraryControls'

interface Props {
  initialItems: WatchlistItemData[]
}

type SyncState = 'idle' | 'syncing' | 'success' | 'missing'

const QUICK_STOPS: [string, number][] = [
  ['Not started', 0],
  ['Halfway', 50],
  ['Finished', 100],
]

function boundaryCopy(progress: number) {
  if (progress >= 100) return { label: 'Full story cleared', color: 'text-ns-success' }
  if (progress >= 50) return { label: 'Mid-movie cleared', color: 'text-ns-warning' }
  if (progress > 0) return { label: 'Spoiler shield active', color: 'text-ns-secondary-readable' }
  return { label: 'Everything protected', color: 'text-ns-secondary-readable' }
}

/**
 * The film as an iris redaction bar. Progress wipes the bar away from the left,
 * and the marker sits exactly where the viewer's permission ends.
 */
function BoundaryTrack({
  title,
  progress,
  disabled,
  onDraft,
  onCommit,
}: {
  title: string
  progress: number
  disabled: boolean
  onDraft: (value: number) => void
  onCommit: (value: number) => void
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const [settled, setSettled] = useState(false)

  // The first slide is slow and cinematic. After that the marker tracks the thumb.
  useEffect(() => {
    if (!inView) return
    const timer = window.setTimeout(() => setSettled(true), 950)
    return () => window.clearTimeout(timer)
  }, [inView])

  const motion = cn(
    'transition-transform ease-[cubic-bezier(0.23,1,0.32,1)]',
    settled ? 'duration-150' : 'duration-[900ms]',
  )

  return (
    <div ref={ref} className="relative h-11 overflow-hidden" style={{ '--boundary': progress / 100 } as CSSProperties}>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={progress}
        onChange={event => onDraft(Number(event.target.value))}
        onPointerUp={event => onCommit(Number(event.currentTarget.value))}
        onKeyUp={event => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
            onCommit(Number(event.currentTarget.value))
          }
        }}
        disabled={disabled}
        aria-label={`Viewing progress for ${title}`}
        aria-valuetext={`${progress}% cleared`}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3.5 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-ns-secondary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[6px] peer-focus-visible:outline-ns-text"
      >
        <div
          data-in={inView ? 'true' : undefined}
          className={cn(
            'h-full w-full bg-ns-text',
            motion,
            '[transform:translateX(calc((var(--boundary)-1)*100%))]',
            '[html[data-motion=on]_&:not([data-in=true])]:[transform:translateX(-100%)]',
          )}
        />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-3.5 inset-y-0">
        <div
          data-in={inView ? 'true' : undefined}
          className={cn(
            'h-full w-full',
            motion,
            '[transform:translateX(calc(var(--boundary)*100%))]',
            '[html[data-motion=on]_&:not([data-in=true])]:[transform:translateX(0)]',
          )}
        >
          <span className={cn(
            'absolute left-0 top-1/2 block h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-ns-text bg-ns-bg shadow-2xl',
            disabled && 'animate-pulse',
          )} />
        </div>
      </div>
    </div>
  )
}

export default function PlotPassportClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [drafts, setDrafts] = useState<Record<number, number>>({})
  const [updating, setUpdating] = useState<number | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [error, setError] = useState('')

  const stats = useMemo(() => ({
    protected: items.filter(item => item.progressPercent < 100).length,
    inProgress: items.filter(item => item.progressPercent > 0 && item.progressPercent < 100).length,
    cleared: items.filter(item => item.progressPercent === 100).length,
  }), [items])

  const protectedTitles = useMemo(
    () => items.filter(item => item.progressPercent < 100).map(item => item.title),
    [items],
  )

  async function saveProgress(item: WatchlistItemData, progressPercent: number) {
    const progress = Math.max(0, Math.min(100, Math.round(progressPercent)))
    const previous = items.find(row => row.tmdbId === item.tmdbId) ?? item
    setUpdating(item.tmdbId)
    setError('')
    setItems(current => current.map(row => row.tmdbId === item.tmdbId
      ? { ...row, progressPercent: progress }
      : row))
    try {
      const response = await fetch(`/api/watchlist/${item.tmdbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercent: progress }),
      })
      if (!response.ok) throw new Error('Could not update progress')
      const updated = await response.json() as WatchlistItemData
      setItems(current => current.map(row => row.tmdbId === item.tmdbId ? updated : row))
      setDrafts(current => {
        const next = { ...current }
        delete next[item.tmdbId]
        return next
      })
    } catch {
      setItems(current => current.map(row => row.tmdbId === item.tmdbId ? previous : row))
      setDrafts(current => ({ ...current, [item.tmdbId]: previous.progressPercent }))
      setError(`Could not update ${item.title}. Try again.`)
    } finally {
      setUpdating(null)
    }
  }

  function syncChromeShield() {
    setSyncState('syncing')
    const requestId = crypto.randomUUID()

    const handleResult = (event: MessageEvent) => {
      if (event.source !== window || event.data?.type !== 'NS_PLOT_PASSPORT_SYNC_RESULT' ||
          event.data?.requestId !== requestId) return
      window.removeEventListener('message', handleResult)
      setSyncState(event.data.ok ? 'success' : 'missing')
    }

    window.addEventListener('message', handleResult)
    window.postMessage({
      type: 'NS_PLOT_PASSPORT_SYNC',
      source: 'nospoilers-web',
      requestId,
      titles: protectedTitles,
    }, window.location.origin)

    window.setTimeout(() => {
      window.removeEventListener('message', handleResult)
      setSyncState(current => current === 'syncing' ? 'missing' : current)
    }, 1800)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <header className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <div>
          <h1 className="max-w-3xl font-display text-5xl text-ns-text lg:text-7xl">
            The internet stops where you <span className="ns-unredact" style={{ animationDelay: '420ms' }}>stopped.</span>
          </h1>
          <p className="ns-rise mt-5 max-w-2xl text-lg leading-relaxed text-ns-muted" style={{ animationDelay: '80ms' }}>
            Your progress is now your permission system. Reviews and conversations unlock only when you reach their safe viewing point, while unfinished titles can transfer directly to NoSpoilers Shield.
          </p>
          <div className="ns-rise mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center" style={{ animationDelay: '160ms' }}>
            <Button size="lg" onClick={syncChromeShield} loading={syncState === 'syncing'} className="flex-shrink-0">
              {syncState === 'success' && <CheckIcon size={18} strokeWidth={2.5} />}
              {syncState === 'syncing' ? 'Finding extension…'
                : syncState === 'success' ? 'Chrome Shield synced'
                  : syncState === 'missing' ? 'Extension not detected'
                    : 'Sync Chrome Shield'}
            </Button>
            <p key={syncState} role="status" className={cn('max-w-sm animate-fade-up text-sm leading-relaxed', syncState === 'missing' ? 'text-ns-warning' : 'text-ns-muted')}>
              {syncState === 'missing'
                ? 'Install or reload NoSpoilers Shield, then refresh this page and try again.'
                : <>Send {protectedTitles.length} unfinished {protectedTitles.length === 1 ? 'title' : 'titles'} to the Chrome shield. Finished titles are removed automatically.</>}
            </p>
          </div>
        </div>

        <section aria-label="Passport summary" className="rounded-3xl bg-ns-surface p-7 sm:p-8">
          <dl className="grid grid-cols-3 gap-3">
            {([
              ['Protected', stats.protected],
              ['In progress', stats.inProgress],
              ['Cleared', stats.cleared],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="mt-1 text-sm text-ns-muted">{label}</dt>
                <dd key={value} className="animate-fade-up font-display text-4xl tabular-nums text-ns-text sm:text-5xl">{value}</dd>
              </div>
            ))}
          </dl>
          <Meter
            value={items.length > 0 ? stats.cleared / items.length : 0}
            className="mt-6 h-2 bg-ns-secondary"
            fillClassName="bg-ns-text"
          />
          <p className="mt-2 text-sm tabular-nums text-ns-muted">
            {stats.cleared} of {items.length} {items.length === 1 ? 'title' : 'titles'} fully cleared
          </p>
        </section>
      </header>

      <section className="mt-14 lg:mt-20" aria-labelledby="passport-progress">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="passport-progress" className="font-display text-3xl text-ns-text sm:text-4xl">Viewing progress</h2>
          <Link href="/discover" className="inline-flex min-h-11 flex-shrink-0 items-center gap-1 text-sm font-semibold text-ns-secondary-readable transition-colors duration-150 hover:text-ns-text">
            Add movies <ArrowRightIcon size={15} />
          </Link>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-ns-danger/10 px-4 py-3 text-sm text-ns-danger">{error}</p>
        )}

        {items.length === 0 ? (
          <EmptyState
            title="Your Passport is empty"
            description="Add a movie to your watchlist and it will become protected automatically."
            action={<Button href="/discover">Discover movies <ArrowRightIcon size={16} /></Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {items.map((item, index) => {
              const progress = drafts[item.tmdbId] ?? item.progressPercent
              const boundary = boundaryCopy(progress)
              const isResumeDemo = item.tmdbId === 9900001
              const itemHref = isResumeDemo ? '/where-was-i' : `/movie/${item.tmdbId}`
              const isUpdating = updating === item.tmdbId
              return (
                <div key={item.tmdbId} className={index > 3 ? 'ns-reveal' : undefined} style={index > 3 ? revealDelay(index) : undefined}>
                  <article className="group flex h-full gap-4 rounded-2xl bg-ns-surface p-4 sm:gap-5 sm:p-5">
                    <Link
                      href={itemHref}
                      aria-label={`View ${item.title}`}
                      className="relative aspect-[2/3] w-20 flex-shrink-0 self-start overflow-hidden rounded-xl bg-ns-surface-2 sm:w-28"
                    >
                      <PosterFill path={item.posterPath} size="w342" className={posterZoomClass} sizes="112px" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={itemHref} tabIndex={-1} className="flex min-h-11 items-center truncate font-heading text-lg font-bold text-ns-text transition-colors duration-150 hover:text-ns-secondary-readable">
                        {item.title}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-2 text-sm text-ns-muted">
                        <span className="tabular-nums">{formatYear(item.releaseDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span key={boundary.label} className={cn('animate-fade-up font-semibold', boundary.color)}>{boundary.label}</span>
                      </p>

                      {isResumeDemo ? (
                        <div className="mt-auto pt-4">
                          <p className="text-base font-semibold text-ns-text">
                            {item.currentSeason && item.currentEpisode
                              ? `Finished S${item.currentSeason} E${item.currentEpisode}`
                              : 'No episode confirmed'}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ns-muted">
                            Episode checkpoints are managed in Where Was I? so the progress boundary stays exact.
                          </p>
                          <Link href="/where-was-i" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ns-secondary-readable transition-colors duration-150 hover:text-ns-text">
                            Update episode or resume <ArrowRightIcon size={14} />
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-auto pt-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-ns-muted">Plot clearance</span>
                            <span className="font-display text-2xl tabular-nums text-ns-text">{progress}%</span>
                          </div>
                          <BoundaryTrack
                            title={item.title}
                            progress={progress}
                            disabled={isUpdating}
                            onDraft={value => setDrafts(current => ({ ...current, [item.tmdbId]: value }))}
                            onCommit={value => void saveProgress(item, value)}
                          />
                          <div className="mt-1 grid grid-cols-3 gap-1 rounded-full bg-ns-surface-2 p-1">
                            {QUICK_STOPS.map(([label, value]) => (
                              <button
                                key={label}
                                type="button"
                                aria-pressed={progress === value}
                                onClick={() => void saveProgress(item, value)}
                                disabled={isUpdating}
                                className={cn(
                                  'min-h-11 min-w-0 rounded-full px-1 text-xs font-semibold transition-colors duration-150 disabled:cursor-wait sm:text-sm',
                                  progress === value ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text',
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="ns-reveal mt-14 flex flex-col gap-5 rounded-3xl bg-ns-tile-blue p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10 lg:mt-20">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-bold text-ns-text">Forgot the story, but don&apos;t want the future?</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">
            Where Was I? uses your Passport checkpoint for spoiler-safe recaps, character knowledge, and sourced answers. Opening it never advances your progress.
          </p>
        </div>
        <Button href="/where-was-i" variant="outline" className="flex-shrink-0">
          Try the mystery demo <ArrowRightIcon size={16} />
        </Button>
      </section>
    </div>
  )
}
