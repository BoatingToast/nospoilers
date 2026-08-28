'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
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
    <div className="rounded-2xl border border-ns-secondary/20 bg-ns-secondary/5 p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-heading text-white">What are you in the mood for tonight?</h2>
          <p className="mt-0.5 text-xs font-body text-ns-muted">Temporary choices—your permanent Movie DNA stays unchanged.</p>
        </div>
        <button type="button" onClick={reset} className="text-left text-[10px] font-body text-ns-muted hover:text-white sm:text-right">
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {CONTROLS.map(control => (
          <label key={control.key} className="block">
            <span className="flex items-center justify-between gap-2 text-xs font-body">
              <span className="text-ns-text">{control.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ns-secondary-readable">
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
            <span className="mt-1 flex justify-between text-[9px] font-body text-ns-muted">
              <span>{control.left}</span><span>{control.right}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => onApply(mood)} loading={loading}>
          Tune My Picks
        </Button>
      </div>
    </div>
  )
}
