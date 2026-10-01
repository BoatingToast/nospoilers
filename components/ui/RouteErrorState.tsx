'use client'

import { useEffect } from 'react'
import Button from './Button'
import { WarningIcon } from '@/components/icons'

interface RouteErrorStateProps {
  error: Error & { digest?: string }
  reset: () => void
  fullPage?: boolean
  title?: string
  description?: string
}

export default function RouteErrorState({
  error,
  reset,
  fullPage = false,
  title = 'That reel stopped unexpectedly',
  description = 'We could not load this page. Your account and movie data are safe.',
}: RouteErrorStateProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={`px-4 py-16 sm:px-6 sm:py-24 ${fullPage ? 'min-h-screen' : 'min-h-[65vh]'}`}>
      <section
        className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-10"
        role="alert"
        aria-labelledby="route-error-title"
        aria-describedby="route-error-description"
      >
        <h1 id="route-error-title" className="min-w-0 font-display text-[clamp(2.6rem,9vw,5.5rem)] leading-[0.88] tracking-wide text-ns-text">
          {title}
        </h1>
        <div className="min-w-0 border-t-2 border-ns-danger pt-4">
          <p className="flex items-center gap-2 font-body text-sm font-semibold text-ns-danger">
            <WarningIcon size={16} />
            Playback interrupted
          </p>
          <p id="route-error-description" className="mt-3 font-body text-base leading-relaxed text-ns-text">
            {description}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <Button variant="secondary" href="/">
              Back to home
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
