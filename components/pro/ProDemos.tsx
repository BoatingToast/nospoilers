'use client'

import type { CSSProperties } from 'react'
import { ArrowRightIcon, CheckIcon, LockIcon } from '@/components/icons'

/**
 * Small self-playing previews of each Pro tool. Every film and line of text is
 * invented for the demo, so nothing here can spoil a real movie.
 */

const FILMS = {
  ferry: { title: 'The Last Ferry Home', meta: '2h 04m · Drama', minutes: 124, tile: 'bg-ns-tile-blue' },
  lanterns: { title: 'Paper Lanterns', meta: '1h 38m · Comedy', minutes: 98, tile: 'bg-ns-tile-peach' },
  shift: { title: 'Night Shift', meta: '1h 52m · Thriller', minutes: 112, tile: 'bg-ns-tile-lilac' },
  harbor: { title: 'Salt Harbor', meta: '1h 46m · Drama', minutes: 106, tile: 'bg-ns-tile-green' },
} as const

type Film = (typeof FILMS)[keyof typeof FILMS]

function formatRuntime(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

function PosterTile({ film, className = '' }: { film: Film; className?: string }) {
  return (
    <div className={`flex aspect-[2/3] flex-col justify-end rounded-xl p-3 ${film.tile} ${className}`}>
      <p className="font-heading text-base font-bold leading-tight text-ns-text sm:text-lg">{film.title}</p>
    </div>
  )
}

// ─── Tonight Mode ─────────────────────────────────────────────────────────────

const TONIGHT_FILMS: Film[] = [FILMS.ferry, FILMS.lanterns, FILMS.shift]
const TONIGHT_STEPS = [
  { mood: 'Comfort', ranks: [1, 0, 2], fit: [82, 96, 58] },
  { mood: 'Gripping', ranks: [1, 2, 0], fit: [87, 54, 94] },
  { mood: 'Thoughtful', ranks: [0, 2, 1], fit: [97, 61, 78] },
]

function TonightDemo({ step }: { step: number }) {
  const current = TONIGHT_STEPS[step]
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1.5">
        {TONIGHT_STEPS.map(item => (
          <span
            key={item.mood}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-300 ${
              item.mood === current.mood ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted'
            }`}
          >
            {item.mood}
          </span>
        ))}
      </div>
      <div className="relative mt-5 min-h-0 flex-1">
        <div className="absolute inset-x-0 top-0 h-1/3 rounded-2xl bg-ns-surface-2" />
        {TONIGHT_FILMS.map((film, filmIndex) => (
          <div
            key={film.title}
            className="absolute inset-x-0 top-0 flex h-1/3 items-center gap-3 px-3 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ transform: `translateY(${current.ranks[filmIndex] * 100}%)` }}
          >
            <div className={`aspect-[2/3] h-[72%] flex-shrink-0 rounded-md ${film.tile}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-bold text-ns-text">{film.title}</p>
              <p className="truncate text-sm text-ns-muted">{film.meta}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ns-surface-3">
                <div
                  className="h-full origin-left rounded-full bg-ns-secondary transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ transform: `scaleX(${current.fit[filmIndex] / 100})` }}
                />
              </div>
            </div>
            <p key={current.fit[filmIndex]} className="w-11 flex-shrink-0 animate-fade-up text-right font-heading text-lg font-bold tabular-nums text-ns-text">
              {current.fit[filmIndex]}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lumi ─────────────────────────────────────────────────────────────────────

function LumiDemo({ step }: { step: number }) {
  return (
    <div className="flex h-full flex-col justify-end gap-3">
      <p className="ml-auto max-w-[85%] animate-fade-up rounded-2xl rounded-br-md bg-ns-surface-3 px-4 py-3 text-base leading-relaxed text-ns-text">
        Something warm and funny, under two hours.
      </p>
      {step === 1 && (
        <div className="flex w-fit animate-fade-up items-center gap-1.5 rounded-2xl bg-ns-surface-2 px-4 py-4">
          {[0, 1, 2].map(dot => (
            <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ns-muted" style={{ animationDelay: `${dot * 140}ms` }} />
          ))}
        </div>
      )}
      {step >= 2 && (
        <p className="max-w-[92%] animate-fade-up text-base leading-relaxed text-ns-text">
          Try <span className="font-semibold">Paper Lanterns</span>. It is light, quick, and easy to share. I will leave the plot to the film.
        </p>
      )}
      {step >= 3 && (
        <div className="flex animate-fade-up items-center gap-3 rounded-2xl bg-ns-surface-2 p-3">
          <div className={`aspect-[2/3] h-14 flex-shrink-0 rounded-md ${FILMS.lanterns.tile}`} />
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-bold text-ns-text">{FILMS.lanterns.title}</p>
            <p className="truncate text-sm text-ns-muted">{FILMS.lanterns.meta}</p>
          </div>
          <span className="ml-auto inline-flex flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-ns-success">
            <CheckIcon size={14} /> Plot-free
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Identity Forge ───────────────────────────────────────────────────────────

const LOOKS = [
  { name: 'NOVA-07', suit: 'var(--ns-tile-blue)', aura: 'var(--ns-secondary)', detail: 'Classic · Visor' },
  { name: 'ECHO-22', suit: 'var(--ns-tile-lilac)', aura: 'var(--ns-chart-3)', detail: 'Sleek · Audio halo' },
  { name: 'ORBIT-5', suit: 'var(--ns-tile-green)', aura: 'var(--ns-chart-2)', detail: 'Cosmic · Orbit ring' },
]

function IdentityDemo({ step }: { step: number }) {
  const look = LOOKS[step]
  const fill = (token: string): CSSProperties => ({ fill: `rgb(${token})`, transition: 'fill 500ms ease' })
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <svg viewBox="0 0 120 150" className="h-44 w-auto sm:h-52">
        <circle cx="60" cy="38" r="26" style={fill('var(--ns-chart-5)')} />
        <rect x="35" y="30" width="50" height="11" rx="5.5" style={fill(look.aura)} />
        <path d="M18 150v-34c0-24 19-42 42-42s42 18 42 42v34z" style={fill(look.suit)} />
        <circle cx="60" cy="104" r="5" style={fill(look.aura)} />
      </svg>
      <div key={look.name} className="animate-fade-up text-center">
        <p className="font-display text-3xl text-ns-text">{look.name}</p>
        <p className="mt-1 text-sm text-ns-muted">{look.detail}</p>
      </div>
    </div>
  )
}

// ─── Double Feature ───────────────────────────────────────────────────────────

const PAIRS = [
  { style: 'Contrast', first: FILMS.shift, second: FILMS.lanterns },
  { style: 'Contrast', first: FILMS.shift, second: FILMS.lanterns },
  { style: 'Same vibe', first: FILMS.ferry, second: FILMS.harbor },
]

function DoubleDemo({ step }: { step: number }) {
  const pair = PAIRS[step]
  const total = pair.first.minutes + pair.second.minutes
  const share = pair.first.minutes / total
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1.5">
        {['Contrast', 'Same vibe'].map(style => (
          <span
            key={style}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-300 ${
              style === pair.style ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted'
            }`}
          >
            {style}
          </span>
        ))}
      </div>
      <div key={pair.style} className="mt-4 flex min-h-0 flex-1 animate-fade-up items-center justify-center gap-3">
        <PosterTile film={pair.first} className="h-full max-h-[220px]" />
        <ArrowRightIcon size={18} className="flex-shrink-0 text-ns-muted" />
        <PosterTile film={pair.second} className="h-full max-h-[220px]" />
      </div>
      <div className="mt-4">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          <div className="h-full flex-1 origin-left bg-ns-secondary transition-transform duration-700" style={{ transform: step === 0 ? 'scaleX(0)' : `scaleX(${share * 2 > 1 ? 1 : share * 2})` }} />
          <div className="h-full flex-1 origin-left bg-ns-text transition-transform duration-700" style={{ transform: step === 0 ? 'scaleX(0)' : 'scaleX(1)' }} />
        </div>
        <p key={total} className="mt-2 animate-fade-up text-sm tabular-nums text-ns-muted">
          <span className="font-semibold text-ns-text">{formatRuntime(total)}</span> for the whole night
        </p>
      </div>
    </div>
  )
}

// ─── Taste Lab ────────────────────────────────────────────────────────────────

const FACETS = [
  { label: 'Atmosphere', values: [0.3, 0.55, 0.8] },
  { label: 'Pacing', values: [0.45, 0.2, 0.15] },
  { label: 'Humor', values: [-0.1, 0.25, 0.4] },
  { label: 'Dark intensity', values: [0.35, 0.1, -0.5] },
]
const TASTE_NOTES = [
  'From your ratings',
  'You said the mood mattered most',
  'You said: less violence',
]

function TasteDemo({ step }: { step: number }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <ul className="space-y-5">
        {FACETS.map(facet => {
          const value = facet.values[step]
          return (
            <li key={facet.label}>
              <p className="text-sm font-semibold text-ns-text">{facet.label}</p>
              <div className="relative mt-2 h-2 rounded-full bg-ns-surface-3">
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-ns-border-strong" />
                <span
                  className={`absolute inset-y-0 left-1/2 w-1/2 origin-left rounded-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${value < 0 ? 'bg-ns-warning' : 'bg-ns-secondary'}`}
                  style={{ transform: `scaleX(${value})` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p key={step} className="mt-6 animate-fade-up text-sm font-semibold text-ns-muted">{TASTE_NOTES[step]}</p>
    </div>
  )
}

// ─── Spoiler Field ────────────────────────────────────────────────────────────

const FIELD_PROGRESS = [15, 40, 70, 100]
const FIELD_LAYERS = [
  { name: 'Mood', detail: 'Pace, tone, and atmosphere', at: 0 },
  { name: 'Craft', detail: 'Direction, sound, and acting', at: 20 },
  { name: 'Themes', detail: 'Big ideas, with details filtered', at: 55 },
  { name: 'Full discussion', detail: 'Open once you finish', at: 100 },
]

function FieldDemo({ step }: { step: number }) {
  const progress = FIELD_PROGRESS[step]
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-ns-muted">Story progress</p>
        <p key={progress} className="animate-fade-up font-display text-4xl tabular-nums text-ns-text">{progress}%</p>
      </div>
      <div className="relative mt-2 h-2 flex-shrink-0 overflow-hidden rounded-full bg-ns-surface-3">
        <div
          className="h-full origin-left rounded-full bg-ns-secondary transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      <ul className="mt-3 divide-y divide-ns-border">
        {FIELD_LAYERS.map(layer => {
          const open = progress >= layer.at
          return (
            <li key={layer.name} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ns-text">{layer.name}</p>
                <p className="mt-0.5 text-sm text-ns-muted">
                  <span data-open={open} className="ns-redact">{layer.detail}</span>
                </p>
              </div>
              {open
                ? <CheckIcon size={16} className="flex-shrink-0 text-ns-success" />
                : <LockIcon size={16} className="flex-shrink-0 text-ns-muted" />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Theater ──────────────────────────────────────────────────────────────────

const SEAT_ORDER = [18, 21, 11, 28, 13, 26, 4, 19, 30, 9, 22, 2, 15, 25, 6, 31, 12, 29, 1, 17, 8, 27]
const SEATS_FILLED = [7, 14, 22]
const YOUR_SEAT = 20

function TheaterDemo({ step }: { step: number }) {
  const filled = new Set(SEAT_ORDER.slice(0, SEATS_FILLED[step]))
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mx-auto h-1.5 w-3/4 rounded-full bg-ns-text" />
      <p className="mt-2 text-center text-sm text-ns-muted">Tonight&apos;s premiere</p>
      <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-8 gap-2">
        {Array.from({ length: 32 }, (_, seat) => (
          <span
            key={seat}
            className={`aspect-square rounded-md transition-colors duration-500 ${
              seat === YOUR_SEAT ? 'bg-ns-secondary' : filled.has(seat) ? 'bg-ns-muted' : 'bg-ns-surface-3'
            }`}
          />
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-ns-muted">
        <span key={step} className="inline-block animate-fade-up font-semibold tabular-nums text-ns-text">{SEATS_FILLED[step] + 1} film fans</span> in the room
      </p>
    </div>
  )
}

export const PRO_DEMOS = {
  tonight: { steps: TONIGHT_STEPS.length, Demo: TonightDemo },
  lumi: { steps: 4, Demo: LumiDemo },
  identity: { steps: LOOKS.length, Demo: IdentityDemo },
  'double-feature': { steps: PAIRS.length, Demo: DoubleDemo },
  'taste-lab': { steps: TASTE_NOTES.length, Demo: TasteDemo },
  'spoiler-field': { steps: FIELD_PROGRESS.length, Demo: FieldDemo },
  theater: { steps: SEATS_FILLED.length, Demo: TheaterDemo },
} as const

export type ProDemoId = keyof typeof PRO_DEMOS
