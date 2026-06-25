'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import SearchBar from './SearchBar'

export default function Hero() {
  const [revealed, setRevealed] = useState(false)
  const { data: session, status } = useSession()
  const loggedIn = status === 'authenticated'

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center bg-ns-bg overflow-hidden px-6 pt-16 pb-10">

      {/* Subtle radial glow behind hero text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]
                      bg-gradient-radial from-ns-gold/5 via-transparent to-transparent pointer-events-none" />

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
        }}
      />

      <div className="relative z-10 text-center max-w-5xl mx-auto flex-1 flex flex-col justify-center">

        {/* Eyebrow badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ns-gold/25
                     text-ns-gold text-xs tracking-[0.2em] uppercase mb-10 font-body
                     opacity-0 animate-fade-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-ns-gold animate-pulse-slow" />
          Now in Beta
        </div>

        {/* Main title: DISCOVER */}
        <h1
          className="font-display text-[18vw] sm:text-[14vw] md:text-[12vw] leading-none
                     tracking-wider text-ns-text select-none
                     opacity-0 animate-fade-up"
          style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
        >
          DISCOVER
        </h1>

        {/* Signature reveal: WITHOUT SPOILERS */}
        <div
          className="relative inline-block my-1 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          <h2 className="font-display text-[9vw] sm:text-[7vw] md:text-[6vw] leading-none
                         tracking-wider text-ns-gold select-none">
            WITHOUT SPOILERS
          </h2>

          {/* Redaction bar — wipes away to reveal the text */}
          <div
            className="absolute inset-0 bg-ns-gold origin-left transition-transform duration-[900ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
            style={{ transform: revealed ? 'scaleX(0)' : 'scaleX(1)' }}
          />
        </div>

        {/* Subtitle */}
        <p
          className="text-ns-muted text-base sm:text-lg max-w-lg mx-auto mt-8 mb-10 leading-relaxed font-body
                     opacity-0 animate-fade-up"
          style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
        >
          Find films you&apos;ll love based on your taste — not other people&apos;s reviews.
          No plot twists. No ruined endings.
        </p>

        {/* Search */}
        <div
          className="opacity-0 animate-fade-up"
          style={{ animationDelay: '0.75s', animationFillMode: 'forwards' }}
        >
          <SearchBar />
        </div>

        {/* CTAs — single source of truth from useSession() */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center mt-8
                     opacity-0 animate-fade-up"
          style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}
        >
          {loggedIn ? (
            <>
              <Button variant="primary" size="lg" href="/dashboard">
                Go to Dashboard
              </Button>
              <Button variant="secondary" size="lg" href="/discover">
                Discover Films
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" size="lg" href="/register">
                Get Started Free
              </Button>
              <Button variant="secondary" size="lg" href="/login">
                Sign In
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-ns-bg to-transparent pointer-events-none" />

      {/* Scroll indicator — in-flow, always below buttons, never overlaps */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-ns-muted/40 mt-12 sm:mt-14">
        <span className="text-xs tracking-widest uppercase font-body">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-ns-muted/40 to-transparent" />
      </div>
    </section>
  )
}
