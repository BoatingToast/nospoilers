'use client'

import { useState, useEffect } from 'react'
import SpoilerZoneGate from './SpoilerZoneGate'
import SpoilerZoneRoom from './SpoilerZoneRoom'
import Section from '@/components/ui/Section'

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
    <Section
      id="spoiler-zone"
      title="THE SPOILER ZONE"
      note={entered ? movieTitle : undefined}
      className="mt-12 scroll-mt-24"
    >
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
    </Section>
  )
}
