'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import type { RecommendationMood } from '@/types'

const DEFAULT_MOOD: RecommendationMood = { intensity: 5, runtime: 5, adventure: 5 }

const CONTROLS: Array<{
  key: keyof RecommendationMood
  label: string
  left: string
  right: string
}> = [
  { key: 'intensity', label: 'Energy', left: 'Relaxing', right: 'Intense' },
  { key: 'runtime', label: 'Commitment', left: 'Short', right: 'Epic' },
  { key: 'adventure', label: 'Discovery', left: 'Familiar', right: 'Adventurous' },
]

function moodLabel(value: number, left: string, right: string): string {
  if (value <= 3) return left
  if (value >= 8) return right
  return value <= 6 ? 'Balanced' : `More ${right.toLowerCase()}`
}

export default function MoodControls({ onApply, loading }: {
  onApply: (mood: RecommendationMood) => void
  loading: boolean
}) {
  const [mood, setMood] = useState<RecommendationMood>(DEFAULT_MOOD)

  function reset() {
    setMood(DEFAULT_MOOD)
    onApply(DEFAULT_MOOD)
  }

  return (
    <Section
      title="What are you in the mood for tonight?"
      note="Temporary choices—your permanent Movie DNA stays unchanged."
      action={
        <button
          type="button"
          onClick={reset}
          className="min-h-10 font-heading text-sm text-ns-muted underline underline-offset-4 hover:text-ns-text"
        >
          Reset
        </button>
      }
    >
      <div className="grid gap-x-10 gap-y-5 sm:grid-cols-3">
        {CONTROLS.map(control => (
          <label key={control.key} className="block min-w-0">
            <span className="flex items-baseline justify-between gap-2 font-body text-sm">
              <span className="text-ns-text">{control.label}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ns-secondary-readable">
                {moodLabel(mood[control.key], control.left, control.right)}
              </span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={mood[control.key]}
              onChange={event => setMood(previous => ({
                ...previous,
                [control.key]: Number(event.target.value),
              }))}
              className="mt-2 w-full cursor-pointer accent-ns-secondary"
            />
            <span className="mt-1 flex justify-between font-body text-[11px] text-ns-muted">
              <span>{control.left}</span><span>{control.right}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5">
        <Button variant="secondary" size="md" onClick={() => onApply(mood)} loading={loading}>
          Tune My Picks
        </Button>
      </div>
    </Section>
  )
}
