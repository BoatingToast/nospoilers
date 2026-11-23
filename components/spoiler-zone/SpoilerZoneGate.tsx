'use client'

import Button from '@/components/ui/Button'

interface Props {
  movieTitle: string
  onEnter:    () => void
}

// Purely decorative: empty bars, never message text.
const PREVIEW_ROWS = [
  ['w-11/12', 'w-3/5'],
  ['w-2/3'],
  ['w-full', 'w-10/12', 'w-1/3'],
]

export default function SpoilerZoneGate({ movieTitle, onEnter }: Props) {
  return (
    <div className="ns-reveal">
      <div className="grid gap-10 overflow-hidden rounded-3xl bg-ns-surface p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-16 lg:p-14">
        <div className="min-w-0">
          <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Enter the Spoiler Zone?</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ns-muted">
            Everything inside may contain full spoilers for{' '}
            <span className="break-words font-semibold text-ns-text">{movieTitle}</span>
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ns-muted">
            The Spoiler Zone is an open discussion room for people who have already watched this film.
            Plot twists, endings, and theories are fair game inside.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button size="lg" onClick={onEnter}>Enter Spoiler Zone</Button>
            <p className="text-sm text-ns-muted">We&apos;ll remember your choice for this movie</p>
          </div>
        </div>

        <div aria-hidden="true" className="space-y-5 rounded-2xl bg-ns-bg p-5 sm:p-6">
          {PREVIEW_ROWS.map((lines, row) => (
            <div key={row} className="flex items-start gap-3">
              <span className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
              <span className="flex-1 space-y-2 pt-1">
                {lines.map((width, line) => (
                  <span key={line} className={`block h-3.5 rounded-sm bg-ns-secondary ${width}`} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
