import Panel from '@/components/ui/Panel'
import GrowBar from './GrowBar'
import type { DNAScores } from '@/types'

const LABELS: { key: keyof DNAScores; label: string }[] = [
  { key: 'suspenseScore', label: 'Suspense' },
  { key: 'emotionalImpactScore', label: 'Emotion' },
  { key: 'complexityScore', label: 'Complexity' },
  { key: 'humorScore', label: 'Humor' },
  { key: 'realismScore', label: 'Realism' },
  { key: 'actionScore', label: 'Action' },
  { key: 'darknessScore', label: 'Darkness' },
]

export default function MovieVibeProfile({ scores }: { scores: DNAScores }) {
  // Strongest traits lead, so the shape of the film reads at a glance.
  const ranked = [...LABELS].sort((a, b) => scores[b.key] - scores[a.key])

  return (
    <Panel className="rounded-3xl p-7 sm:p-10">
      <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Movie vibe</h2>
      <ul className="mt-7 space-y-4">
        {ranked.map(({ key, label }, index) => (
          <li key={key} className="grid grid-cols-[6rem_minmax(0,1fr)_2.25rem] items-center gap-3">
            <span className={`text-sm ${index === 0 ? 'font-semibold text-ns-text' : 'text-ns-muted'}`}>{label}</span>
            <GrowBar
              value={scores[key] / 10}
              fillClassName={index === 0 ? 'bg-ns-secondary' : 'bg-ns-muted'}
            />
            <span className={`text-right text-sm tabular-nums ${index === 0 ? 'font-semibold text-ns-text' : 'text-ns-muted'}`}>
              {scores[key]}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
