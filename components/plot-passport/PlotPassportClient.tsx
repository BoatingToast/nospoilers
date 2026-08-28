'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { WatchlistItemData } from '@/types'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import { LockIcon, ArrowRightIcon } from '@/components/icons'

interface Props {
  initialItems: WatchlistItemData[]
}

type SyncState = 'idle' | 'syncing' | 'success' | 'missing'

function boundaryCopy(progress: number) {
  if (progress >= 100) return { label: 'Full story cleared', color: 'text-emerald-400' }
  if (progress >= 50) return { label: 'Mid-movie cleared', color: 'text-amber-300' }
  if (progress > 0) return { label: 'Spoiler shield active', color: 'text-violet-300' }
  return { label: 'Everything protected', color: 'text-ns-secondary-readable' }
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
    <main className="min-h-screen pb-24">
      <section className="relative overflow-hidden border-b border-ns-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_15%_70%,rgba(245,158,11,0.08),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ns-secondary/30 bg-ns-secondary/10 px-3 py-1.5 text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">
              <LockIcon size={13} /> Plot Passport
            </div>
            <h1 className="font-display text-5xl tracking-wide text-white sm:text-7xl">
              THE INTERNET STOPS WHERE YOU STOPPED.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ns-muted sm:text-base">
              Your progress is now your permission system. Reviews and conversations unlock only when you reach their safe viewing point, while unfinished titles can transfer directly to NoSpoilers Shield.
            </p>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[
              ['Protected', stats.protected, 'text-ns-secondary-readable'],
              ['In progress', stats.inProgress, 'text-amber-300'],
              ['Cleared', stats.cleared, 'text-emerald-400'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-2xl border border-ns-border bg-ns-surface/70 p-4 backdrop-blur-sm">
                <p className={`font-display text-3xl ${color}`}>{value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-ns-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-8 flex flex-col gap-5 rounded-2xl border border-ns-secondary/25 bg-gradient-to-r from-violet-950/50 to-ns-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-heading font-semibold uppercase tracking-[0.16em] text-ns-secondary-readable">Browser handoff</p>
            <h2 className="mt-1 font-heading text-lg font-semibold text-white">Carry your Passport onto the web</h2>
            <p className="mt-1 text-xs leading-5 text-ns-muted">
              Send {protectedTitles.length} unfinished {protectedTitles.length === 1 ? 'title' : 'titles'} to the Chrome shield. Finished titles are removed automatically.
            </p>
          </div>
          <button
            onClick={syncChromeShield}
            disabled={syncState === 'syncing'}
            className="flex-shrink-0 rounded-xl bg-ns-secondary px-5 py-2.5 text-sm font-heading font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90 disabled:opacity-60"
          >
            {syncState === 'syncing' ? 'Finding extension…'
              : syncState === 'success' ? 'Chrome Shield synced ✓'
                : syncState === 'missing' ? 'Extension not detected'
                  : 'Sync Chrome Shield'}
          </button>
        </section>

        {syncState === 'missing' && (
          <p className="-mt-5 mb-8 text-right text-xs text-amber-300/80">
            Install or reload NoSpoilers Shield, then refresh this page and try again.
          </p>
        )}

        {error && (
          <p role="alert" className="mb-6 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ns-muted">Your boundaries</p>
            <h2 className="mt-1 font-display text-3xl tracking-wide text-white">VIEWING PROGRESS</h2>
          </div>
          <Link href="/discover" className="hidden items-center gap-1 text-xs text-ns-secondary-readable hover:text-white sm:flex">
            Add movies <ArrowRightIcon size={13} />
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ns-border px-6 py-16 text-center">
            <LockIcon size={42} className="mx-auto text-ns-secondary-readable/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-white">Your Passport is empty</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ns-muted">Add a movie to your watchlist and it will become protected automatically.</p>
            <Link href="/discover" className="mt-5 inline-flex items-center gap-1 rounded-xl bg-ns-secondary px-5 py-2.5 text-sm font-heading font-semibold text-ns-secondary-foreground">
              Discover movies <ArrowRightIcon size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map(item => {
              const progress = drafts[item.tmdbId] ?? item.progressPercent
              const boundary = boundaryCopy(progress)
              return (
                <article key={item.tmdbId} className="flex gap-4 rounded-2xl border border-ns-border bg-ns-surface/75 p-4 transition-colors hover:border-ns-secondary/25">
                  <Link href={`/movie/${item.tmdbId}`} className="relative h-32 w-[86px] flex-shrink-0 overflow-hidden rounded-xl bg-ns-bg">
                    <Image src={tmdbImageUrl(item.posterPath, 'w342')} alt={item.title} fill className="object-cover" sizes="86px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/movie/${item.tmdbId}`} className="line-clamp-1 font-heading text-sm font-semibold text-white hover:text-ns-secondary-readable">{item.title}</Link>
                        <p className="mt-0.5 text-[10px] text-ns-muted">{formatYear(item.releaseDate)}</p>
                      </div>
                      <span className={`whitespace-nowrap text-[10px] font-semibold ${boundary.color}`}>{boundary.label}</span>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-[10px] text-ns-muted">
                        <span>Plot clearance</span>
                        <span className="font-semibold text-white">{progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progress}
                        onChange={event => setDrafts(current => ({ ...current, [item.tmdbId]: Number(event.target.value) }))}
                        onPointerUp={event => void saveProgress(item, Number(event.currentTarget.value))}
                        onKeyUp={event => void saveProgress(item, Number(event.currentTarget.value))}
                        disabled={updating === item.tmdbId}
                        aria-label={`Viewing progress for ${item.title}`}
                        className="h-1.5 w-full cursor-pointer accent-violet-500"
                      />
                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                        {[
                          ['Not started', 0],
                          ['Halfway', 50],
                          ['Finished', 100],
                        ].map(([label, value]) => (
                          <button
                            key={String(label)}
                            onClick={() => void saveProgress(item, Number(value))}
                            disabled={updating === item.tmdbId}
                            className={`rounded-lg border px-2 py-1.5 text-[10px] transition-colors ${
                              progress === value
                                ? 'border-ns-secondary/50 bg-ns-secondary/15 text-ns-secondary-readable'
                                : 'border-ns-border text-ns-muted hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
