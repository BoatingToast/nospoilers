'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import SearchBar from './SearchBar'

const order = (i: number) => ({ '--i': i }) as CSSProperties

export default function Hero({ posters }: { posters?: ReactNode }) {
  const { status } = useSession()
  const loggedIn = status === 'authenticated'

  return (
    <section className="ns-hero-glow pb-10 pt-28 sm:pt-36 lg:pb-14">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] text-ns-text">
          <span className="ns-word" style={order(0)}>Discover</span>{' '}
          <span className="ns-word" style={order(1)}>movies.</span>{' '}
          <span className="block">
            <span className="ns-word text-ns-muted" style={order(2)}>Without</span>{' '}
            <span className="ns-word" style={order(3)}>
              <span className="ns-unredact">spoilers.</span>
            </span>
          </span>
        </h1>

        <p className="ns-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ns-muted sm:text-xl" style={order(0)}>
          Find your next movie with NoSpoilers. Personalized movie recommendations
          based on your taste, with story details under your control.
        </p>

        <div className="ns-rise mx-auto mt-8 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row" style={order(1)}>
          {loggedIn ? (
            <Button size="lg" href="/dashboard" className="w-full flex-shrink-0 sm:w-auto">Go to Dashboard</Button>
          ) : (
            <Button size="lg" href="/register" className="w-full flex-shrink-0 sm:w-auto">Build My Movie DNA</Button>
          )}
          <SearchBar />
        </div>
      </div>

      {posters}
    </section>
  )
}
