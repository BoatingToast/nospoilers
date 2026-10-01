'use client'

import { useEffect } from 'react'
import Link from 'next/link'
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
    <div className={`flex items-center justify-center px-4 py-16 ${fullPage ? 'min-h-screen' : 'min-h-[65vh]'}`}>
      <section
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-ns-danger/25 bg-ns-surface px-6 py-10 text-center shadow-2xl shadow-black/20 sm:px-10"
        role="alert"
        aria-labelledby="route-error-title"
        aria-describedby="route-error-description"
      >
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ns-danger/60 to-transparent" />
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-ns-danger/30 bg-ns-danger/10 text-ns-danger">
          <WarningIcon size={22} />
        </div>
        <p className="mb-2 font-body text-[10px] uppercase tracking-[0.24em] text-ns-danger">
          Playback interrupted
        </p>
        <h1 id="route-error-title" className="font-heading text-2xl text-ns-text sm:text-3xl">
          {title}
        </h1>
        <p id="route-error-description" className="mx-auto mt-3 max-w-md font-body text-sm leading-relaxed text-ns-muted">
          {description}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-ns-secondary px-5 py-2.5 font-body text-sm font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ns-surface"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-ns-border px-5 py-2.5 font-body text-sm text-ns-text transition-colors hover:border-ns-muted hover:bg-ns-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ns-surface"
          >
            Back to home
          </Link>
        </div>
      </section>
    </div>
  )
}
