'use client'

import type { DNAScores } from '@/types'
import MovieDNACard      from '@/components/dashboard/MovieDNACard'
import TasteSummary      from '@/components/dashboard/TasteSummary'
import DnaEvolutionWidget from '@/components/dashboard/DnaEvolutionWidget'
import { MovieDnaIcon } from '@/components/icons'

interface Props {
  dnaScores: DNAScores | null
  username:  string
}

export default function MovieDNATab({ dnaScores, username }: Props) {
  if (!dnaScores) {
    return (
      <div className="py-16 text-center">
        <MovieDnaIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
        <p className="text-ns-muted font-body text-sm">
          Complete onboarding to generate your Movie DNA.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DnaEvolutionWidget />
      <TasteSummary scores={dnaScores} />
      <MovieDNACard scores={dnaScores} />
    </div>
  )
}
