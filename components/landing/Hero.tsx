'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import SearchBar from './SearchBar'

export default function Hero() {
  const [revealed, setRevealed] = useState(false)
  const { status } = useSession()
  const loggedIn = status === 'authenticated'

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative min-w-0 border-b border-ns-border bg-ns-bg px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end">
        <div className="min-w-0">
          {/* Keep the complete search topic in the visible primary heading. */}
          <h1 className="font-display text-[clamp(3rem,12.5vw,7rem)] leading-[0.86] tracking-wide text-ns-text">
            DISCOVER MOVIES
          </h1>

          {/* Signature reveal: the second line arrives redacted, then clears. */}
          <div className="relative mt-2 inline-block max-w-full">
            <h2 className="font-display text-[clamp(3rem,12.5vw,7rem)] leading-[0.86] tracking-wide text-ns-secondary-readable">
              WITHOUT SPOILERS
            </h2>
            <div
              aria-hidden="true"
              className="absolute inset-0 origin-left bg-ns-text transition-transform duration-[900ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
              style={{ transform: revealed ? 'scaleX(0)' : 'scaleX(1)' }}
            />
          </div>
        </div>

        <div className="min-w-0 border-t-2 border-ns-text pt-5">
          <p className="font-body text-base leading-relaxed text-ns-text sm:text-lg">
            Find your next movie with NoSpoilers. Personalized movie recommendations
            based on your taste, with story details under your control.
          </p>

          <div className="mt-6 w-full min-w-0">
            <SearchBar />
          </div>

          {/* CTAs: single source of truth from useSession() */}
          <div className="mt-4 flex w-full flex-col gap-3 sm:flex-row">
            {loggedIn ? (
              <>
                <Button variant="primary" size="lg" href="/dashboard" className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
                <Button variant="secondary" size="lg" href="/discover" className="w-full sm:w-auto">
                  Discover Films
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="lg" href="/register" className="w-full sm:w-auto">
                  Build My Movie DNA
                </Button>
                <Button variant="secondary" size="lg" href="/login" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
