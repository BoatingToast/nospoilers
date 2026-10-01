'use client'

import type { ReactNode } from 'react'
import type { MovieDnaProfile } from '@/types'
import MovieDNACard       from '@/components/dashboard/MovieDNACard'
import DnaEvolutionWidget from '@/components/dashboard/DnaEvolutionWidget'

interface Props {
  dnaProfile: MovieDnaProfile | null
  username:   string
  extras?: ReactNode
}

export default function MovieDNATab({ dnaProfile, username, extras }: Props) {
  return (
    <div className="space-y-6">
      {dnaProfile && <DnaEvolutionWidget />}
      <MovieDNACard profile={dnaProfile} username={username} />
      {extras && (
        <div className="space-y-8 border-t border-ns-border/40 pt-8">
          {extras}
        </div>
      )}
    </div>
  )
}
