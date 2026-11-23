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
    <section id="spoiler-zone" className="mt-12 scroll-mt-24">
      {entered ? (
        <div className="h-[calc(100dvh-7rem)] max-h-[50rem] min-h-[38rem] w-full animate-fade-up">
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
