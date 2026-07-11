'use client'

import type { MovieDnaProfile } from '@/types'
import MovieDNACard       from '@/components/dashboard/MovieDNACard'
import DnaEvolutionWidget from '@/components/dashboard/DnaEvolutionWidget'

interface Props {
  dnaProfile: MovieDnaProfile | null
  username:   string
}

export default function MovieDNATab({ dnaProfile, username }: Props) {
  return (
    <div className="space-y-6">
      {dnaProfile && <DnaEvolutionWidget />}
      <MovieDNACard profile={dnaProfile} username={username} />
    </div>
  )
}
