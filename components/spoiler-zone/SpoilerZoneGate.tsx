'use client'

import Button from '@/components/ui/Button'

interface Props {
  movieTitle: string
  onEnter:    () => void
}

export default function SpoilerZoneGate({ movieTitle, onEnter }: Props) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
      <div className="min-w-0">
        <h3 className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">
          ENTER THE SPOILER ZONE?
        </h3>
        <p className="mt-3 font-body text-base text-ns-text">
          Everything inside may contain full spoilers for{' '}
          <span className="break-words font-semibold text-ns-secondary-readable">{movieTitle}</span>
        </p>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ns-muted">
          The Spoiler Zone is an open discussion room for people who have already watched this film.
          Plot twists, endings, and theories are fair game inside.
        </p>
      </div>

      <div className="min-w-0 border-t border-ns-border pt-4">
        <Button variant="primary" size="lg" onClick={onEnter} className="w-full sm:w-auto">
          Enter Spoiler Zone
        </Button>
        <p className="mt-3 font-body text-xs text-ns-muted">
          We&apos;ll remember your choice for this movie
        </p>
      </div>
    </div>
  )
}
