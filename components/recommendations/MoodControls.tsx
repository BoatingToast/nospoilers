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
    <section aria-labelledby="mood-controls-title" className="rounded-3xl bg-ns-surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="mood-controls-title" className="font-heading text-2xl font-bold text-ns-text">
            What are you in the mood for tonight?
          </h2>
          <p className="mt-1 text-sm text-ns-muted">Temporary choices. Your permanent Movie DNA stays unchanged.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="flex-shrink-0 hover:!bg-ns-surface-2">
          Reset
        </Button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {CONTROLS.map(control => {
          const current = moodLabel(mood[control.key], control.left, control.right)
          return (
            <label key={control.key} className="block min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ns-text">{control.label}</span>
                <span key={current} className="inline-block animate-fade-up truncate text-sm font-medium text-ns-secondary-readable">
                  {current}
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
                className="mt-1 h-11 w-full cursor-pointer accent-ns-secondary"
              />
              <span className="flex justify-between text-xs text-ns-muted">
                <span>{control.left}</span><span>{control.right}</span>
              </span>
            </label>
          )
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={() => onApply(mood)} loading={loading} className="w-full !bg-ns-surface-2 hover:!bg-ns-surface-3 sm:w-auto">
          Tune my picks
        </Button>
      </div>
    </section>
  )
}
