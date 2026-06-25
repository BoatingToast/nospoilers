import { generateTasteSummary } from '@/services/dna'
import type { DNAScores } from '@/types'

export default function TasteSummary({ scores }: { scores: DNAScores }) {
  const summary = generateTasteSummary(scores)

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl px-6 py-5 flex items-start gap-4">
      <div className="w-8 h-8 rounded-full bg-ns-gold/10 border border-ns-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="14" height="14" fill="none" stroke="#C8963E" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
      <div>
        <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-1">Your Taste Profile</p>
        <p className="text-ns-text font-body text-sm leading-relaxed">{summary}</p>
      </div>
    </div>
  )
}
