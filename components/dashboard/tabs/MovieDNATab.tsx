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

export default function MovieDNATab({ dnaProfile, extras }: Props) {
  return (
    <div className="space-y-6">
      {dnaProfile && <DnaEvolutionWidget />}
      <div className="rounded-3xl bg-ns-surface p-6 sm:p-10">
        <MovieDNACard profile={dnaProfile} />
      </div>
      {extras && (
        <div className="space-y-10 border-t border-ns-border pt-10">
          {extras}
        </div>
      )}
    </div>
  )
}
