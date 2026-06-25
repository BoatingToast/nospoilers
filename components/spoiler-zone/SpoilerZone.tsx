'use client'

import { useState, useEffect } from 'react'
import SpoilerZoneGate from './SpoilerZoneGate'
import SpoilerZoneRoom from './SpoilerZoneRoom'

interface Props {
  tmdbId:      number
  movieTitle:  string
  moviePoster?: string | null
  friendIds?:  string[]
}

export default function SpoilerZone({ tmdbId, movieTitle, moviePoster = null, friendIds = [] }: Props) {
  const [entered,   setEntered]   = useState(false)
  const [hydrated,  setHydrated]  = useState(false)

  // Read localStorage on mount (after hydration)
  useEffect(() => {
    const key = `szp_entered_${tmdbId}`
    if (localStorage.getItem(key) === '1') {
      setEntered(true)
    }
    setHydrated(true)
  }, [tmdbId])

  const handleEnter = () => {
    localStorage.setItem(`szp_entered_${tmdbId}`, '1')
    setEntered(true)
  }

  // Avoid flash of gate on subsequent visits
  if (!hydrated) return null

  return (
    <section className="mt-12">
      {/* Section label */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-ns-border" />
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="currentColor" className="text-ns-gold/60" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span className="font-display text-xs tracking-[0.2em] text-ns-muted/60">THE SPOILER ZONE</span>
          <svg width="14" height="14" fill="currentColor" className="text-ns-gold/60" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </div>
        <div className="flex-1 h-px bg-ns-border" />
      </div>

      {entered ? (
        <div style={{ height: '680px' }} className="w-full">
          <SpoilerZoneRoom
            tmdbId={tmdbId}
            movieTitle={movieTitle}
            moviePoster={moviePoster}
            friendIds={friendIds}
          />
        </div>
      ) : (
        <SpoilerZoneGate movieTitle={movieTitle} onEnter={handleEnter} />
      )}
    </section>
  )
}
