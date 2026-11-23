'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

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
    <div className={`flex items-center justify-center px-4 py-16 ${fullPage ? 'min-h-dvh' : 'min-h-[65vh]'}`}>
      <section
        className="w-full max-w-lg"
        role="alert"
        aria-labelledby="route-error-title"
        aria-describedby="route-error-description"
      >
        <h1 id="route-error-title" className="font-display text-4xl text-ns-text sm:text-5xl">
          {title}
        </h1>
        <p id="route-error-description" className="mt-3 text-base leading-relaxed text-ns-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" href="/">Back to home</Button>
        </div>
      </section>
    </div>
  )
}
