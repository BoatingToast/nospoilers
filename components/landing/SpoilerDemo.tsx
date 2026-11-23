'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ClapperboardIcon,
  DashboardIcon,
  FriendsIcon,
  LockIcon,
  RatingsIcon,
  WatchlistIcon,
} from '@/components/icons'

const STEP_MS = 3400

const LEVELS = [
  { id: 'blind',    label: 'Blind',    note: 'Premise, cast, and trailer stay hidden.', risk: 'None' },
  { id: 'safe',     label: 'Safe',     note: 'Read the premise. Cast and trailer stay covered.', risk: 'Low' },
  { id: 'standard', label: 'Standard', note: 'Everything is visible.', risk: 'Your call' },
] as const

const PREVIEW_NAV = [
  { label: 'Home', Icon: DashboardIcon },
  { label: 'Discover', Icon: ClapperboardIcon, active: true },
  { label: 'Watchlist', Icon: WatchlistIcon, count: 12 },
  { label: 'Ratings', Icon: RatingsIcon },
  { label: 'Friends', Icon: FriendsIcon, count: 3 },
  { label: 'Plot Passport', Icon: LockIcon },
]

function Redactable({ hidden, children }: { hidden: boolean; children: string }) {
  return (
    <>
      <span aria-hidden={hidden || undefined} data-open={!hidden} className="ns-redact">{children}</span>
      {hidden && <span className="sr-only">Hidden</span>}
    </>
  )
}

export default function SpoilerDemo() {
  const [index, setIndex] = useState(1)
  const [playing, setPlaying] = useState(true)
  const [inView, setInView] = useState(false)
  const [canAnimate, setCanAnimate] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCanAnimate(document.documentElement.dataset.motion === 'on')
    const frame = frameRef.current
    if (!frame) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const autoplay = playing && inView && canAnimate

  useEffect(() => {
    if (!autoplay) return
    const timer = window.setInterval(() => {
      if (document.documentElement.dataset.motionPaused) return
      setIndex(current => (current + 1) % LEVELS.length)
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [autoplay])

  const level = LEVELS[index]
  const stats = [
    { label: 'Taste match', value: '94%', tile: 'bg-ns-tile-blue' },
    { label: 'Runtime', value: '2h 04m', tile: 'bg-ns-tile-yellow' },
    { label: 'Mood', value: 'Slow burn', tile: 'bg-ns-tile-peach' },
    { label: 'Spoiler risk', value: level.risk, tile: 'bg-ns-tile-lilac' },
  ]

  return (
    <section aria-labelledby="spoiler-demo-title" className="px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="ns-reveal mx-auto max-w-2xl text-center">
          <h2 id="spoiler-demo-title" className="font-display text-4xl text-ns-text sm:text-5xl lg:text-6xl">
            You decide what you see.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ns-muted">
            Every movie page has a spoiler dial. Turn it down and the story stays covered until you are ready.
          </p>
        </div>

        <div
          ref={frameRef}
          className="ns-scroll-expand mt-10 grid overflow-hidden rounded-2xl bg-ns-surface shadow-2xl ring-1 ring-ns-border lg:mt-14 lg:grid-cols-[13.5rem_1fr]"
        >
          <div aria-hidden="true" className="hidden border-r border-ns-border p-3 lg:block">
            {PREVIEW_NAV.map(({ label, Icon, active, count }) => (
              <div
                key={label}
                className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium ${active ? 'bg-ns-surface-3 text-ns-text' : 'text-ns-muted'}`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
                {count && <span className="ml-auto rounded-full bg-ns-accent px-1.5 text-xs font-semibold text-ns-secondary-foreground">{count}</span>}
              </div>
            ))}
          </div>

          <div className="min-w-0 p-5 sm:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-ns-muted">Example film · Drama</p>
                <p className="mt-1 font-display text-3xl text-ns-text">The Last Ferry Home</p>
              </div>

              <div role="group" aria-label="Spoiler level" className="grid grid-cols-3 gap-1 rounded-full bg-ns-bg p-1 md:w-80">
                {LEVELS.map((item, itemIndex) => {
                  const selected = itemIndex === index
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setIndex(itemIndex)
                        setPlaying(false)
                      }}
                      className={`relative min-h-10 overflow-hidden rounded-full text-sm font-semibold transition-colors duration-150 ${
                        selected ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:text-ns-text'
                      }`}
                    >
                      {item.label}
                      {selected && autoplay && (
                        <span
                          key={index}
                          aria-hidden="true"
                          className="ns-progress absolute inset-x-0 bottom-0 h-0.5 bg-ns-secondary"
                          style={{ '--ns-progress-duration': `${STEP_MS}ms` } as React.CSSProperties}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map(stat => (
                <div key={stat.label} className={`rounded-xl p-4 ${stat.tile}`}>
                  <p className="text-xs font-medium text-ns-muted">{stat.label}</p>
                  <p key={stat.value} className="mt-1 animate-fade-up font-heading text-xl font-bold text-ns-text sm:text-2xl">{stat.value}</p>
                </div>
              ))}
            </div>

            <dl className="mt-5 divide-y divide-ns-border text-sm">
              <div className="grid gap-1 py-3.5 sm:grid-cols-[6rem_1fr] sm:gap-4">
                <dt className="font-medium text-ns-muted">Premise</dt>
                <dd className="leading-relaxed text-ns-text">
                  <Redactable hidden={level.id === 'blind'}>
                    A retired ferry pilot returns to the island she left thirty years ago to look for her missing brother.
                  </Redactable>
                </dd>
              </div>
              <div className="grid gap-1 py-3.5 sm:grid-cols-[6rem_1fr] sm:gap-4">
                <dt className="font-medium text-ns-muted">Cast</dt>
                <dd className="text-ns-text">
                  <Redactable hidden={level.id !== 'standard'}>Mara Voss, Elias Quinn, June Adeyemi</Redactable>
                </dd>
              </div>
              <div className="grid gap-1 py-3.5 sm:grid-cols-[6rem_1fr] sm:gap-4">
                <dt className="font-medium text-ns-muted">Trailer</dt>
                <dd className="text-ns-text">
                  <Redactable hidden={level.id !== 'standard'}>Official trailer, 2:14</Redactable>
                </dd>
              </div>
            </dl>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p aria-live="polite" className="text-sm text-ns-muted">{level.note}</p>
              {canAnimate && (
                <button
                  type="button"
                  onClick={() => setPlaying(value => !value)}
                  className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text"
                >
                  {playing ? 'Pause demo' : 'Play demo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
