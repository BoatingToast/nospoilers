'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/icons'
import type { TheaterParticipant } from '@/lib/theater'
import styles from './theater.module.css'

export async function theaterRequest<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const data = await response.json()
  if (!response.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: response.status })
  return data as T
}

/** Solid floating panel for controls layered over the 3D scenes. */
export const hudSurface = 'rounded-2xl bg-ns-surface text-ns-text shadow-2xl'
export const hudControl = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ns-text transition-colors duration-150 hover:bg-ns-surface-3 disabled:cursor-not-allowed disabled:opacity-50'
export const fieldClass = 'min-h-12 w-full rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base font-normal text-ns-text transition-colors duration-150 [color-scheme:dark] placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text'
export const labelClass = 'grid gap-1.5 text-sm font-semibold text-ns-text'

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-full pr-4 text-sm font-semibold text-ns-muted transition-colors duration-150 hover:text-ns-text">
      <ArrowRightIcon size={15} className="rotate-180" />
      {children}
    </Link>
  )
}

export function LivePing({ className = 'bg-ns-accent text-ns-accent' }: { className?: string }) {
  return <span aria-hidden="true" className={`relative block h-2 w-2 flex-shrink-0 rounded-full ${className} ${styles.ping}`} />
}

export function TheaterAccess({ error, retry, callbackUrl = '/theater', headingLevel = 2 }: { error: string; retry?: () => void; callbackUrl?: string; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-ns-surface p-8 text-center sm:p-12">
      <Heading className="font-display text-4xl text-ns-text">Your seat is waiting.</Heading>
      <p role="alert" className="mt-3 text-lg leading-relaxed text-ns-muted">{error}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in</Button>
        <Button href="/pro/access" variant="outline">Get Pro access</Button>
        {retry && <Button variant="ghost" onClick={retry}>Try again</Button>}
      </div>
    </div>
  )
}

export function premiereDate(date: string) {
  return new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

export function durationLabel(seconds: number) {
  return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)} min`
}

function countdownParts(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const pad = (value: number) => value.toString().padStart(2, '0')
  const days = Math.floor(total / 86400)
  const parts = [
    { label: 'hours', value: pad(Math.floor(total % 86400 / 3600)) },
    { label: 'min', value: pad(Math.floor(total % 3600 / 60)) },
    { label: 'sec', value: pad(total % 60) },
  ]
  return days > 0 ? [{ label: days === 1 ? 'day' : 'days', value: String(days) }, ...parts] : parts
}

/** Large premiere clock. Only the digit that changed ticks, so it stays easy to read. */
export function Countdown({ ms }: { ms: number }) {
  const parts = countdownParts(ms)

  return (
    <div role="timer" aria-label={parts.map(part => `${Number(part.value)} ${part.label}`).join(', ')} className="flex gap-2 sm:gap-3">
      {parts.map(part => (
        <div key={part.label} aria-hidden="true" className="min-w-0 flex-1 rounded-xl bg-ns-surface-2 px-1 py-3 text-center sm:py-4">
          <span className="block overflow-hidden font-display text-3xl tabular-nums text-ns-text sm:text-5xl">
            {part.value.split('').map((digit, index) => (
              <span key={`${part.value.length - index}-${digit}`} className={`inline-block ${styles.digit}`}>{digit}</span>
            ))}
          </span>
          <span className="mt-1 block text-xs text-ns-muted">{part.label}</span>
        </div>
      ))}
    </div>
  )
}

function seatTone(person: TheaterParticipant | undefined, mine: boolean) {
  if (mine) return 'bg-ns-text'
  if (!person) return 'bg-ns-surface-3'
  return person.present ? 'bg-ns-accent' : 'bg-ns-secondary-dim'
}

/** Live house map. It shows which seats are taken, never who is in them. */
export function SeatMap({ capacity, participants, mySeat, reserved }: { capacity: number; participants: TheaterParticipant[]; mySeat: number | null; reserved: number }) {
  const bySeat = new Map(participants.map(person => [person.seat, person]))
  const present = participants.filter(person => person.present).length

  return (
    <div className="mx-auto w-full max-w-[18rem]">
      <div aria-hidden="true" className="mx-auto mb-4 h-1 w-4/5 rounded-full bg-ns-border-strong" />
      <div
        role="img"
        aria-label={`${reserved} of ${capacity} seats reserved, ${present} in the room`}
        className="grid grid-cols-[repeat(4,minmax(0,1fr))_0.6fr_repeat(4,minmax(0,1fr))] gap-1"
      >
        {Array.from({ length: capacity }, (_, seat) => {
          const person = bySeat.get(seat)
          const mine = seat === mySeat
          const state = mine ? 'mine' : person ? (person.present ? 'present' : 'away') : 'open'
          const column = seat % 8
          return (
            <span
              key={`${seat}-${state}`}
              style={{ gridColumn: column < 4 ? column + 1 : column + 2, gridRow: Math.floor(seat / 8) + 1 }}
              className={`aspect-square rounded-[4px] transition-colors duration-300 ${seatTone(person, mine)} ${state === 'open' ? '' : styles.seatIn}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export function SeatLegend({ showMine }: { showMine: boolean }) {
  const legend = [
    { tone: 'bg-ns-accent', label: 'In the room' },
    { tone: 'bg-ns-secondary-dim', label: 'Reserved' },
    { tone: 'bg-ns-surface-3', label: 'Open' },
    ...(showMine ? [{ tone: 'bg-ns-text', label: 'You' }] : []),
  ]

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {legend.map(item => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ns-muted">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[3px] ${item.tone}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

function Glyph({ size = 18, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const PlayGlyph = () => <Glyph><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></Glyph>
export const VolumeGlyph = () => <Glyph><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="M16 9a4.2 4.2 0 0 1 0 6" /><path d="M18.8 6.5a8 8 0 0 1 0 11" /></Glyph>
export const MuteGlyph = () => <Glyph><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="m16.5 9.5 5 5" /><path d="m21.5 9.5-5 5" /></Glyph>
export const FullscreenGlyph = () => <Glyph><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></Glyph>
export const RecenterGlyph = () => <Glyph><circle cx="12" cy="12" r="3.5" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></Glyph>
