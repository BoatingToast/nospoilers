'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export interface PreferenceAnswers {
  pacing:       string
  endings:      string
  storytelling: string
  tone:         string
  complexity:   number
  plotTwists:   number
}

interface StepPreferencesProps {
  onSubmit: (answers: PreferenceAnswers) => void
  onBack:   () => void
  loading:  boolean
}

type RadioOption = { value: string; label: string; sub: string }

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: RadioOption[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-ns-text font-body font-medium text-sm mb-3">{label}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 text-left px-4 py-3 rounded-xl border transition-all duration-150
                       ${value === opt.value
                         ? 'bg-ns-gold/10 border-ns-gold'
                         : 'bg-ns-surface border-ns-border hover:border-ns-muted/40'}`}
          >
            <p className={`text-sm font-body font-medium ${value === opt.value ? 'text-ns-gold' : 'text-ns-text'}`}>
              {opt.label}
            </p>
            <p className="text-ns-muted text-xs font-body mt-0.5">{opt.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function SliderQuestion({
  label,
  sublabel,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string
  sublabel: string
  leftLabel: string
  rightLabel: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-ns-text font-body font-medium text-sm">{label}</p>
          <p className="text-ns-muted text-xs font-body mt-0.5">{sublabel}</p>
        </div>
        <span className="text-ns-gold font-display text-xl">{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-ns-muted text-xs font-body w-20 text-right">{leftLabel}</span>
        <input
          type="range"
          min={1} max={10}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-[#C8963E] cursor-pointer"
        />
        <span className="text-ns-muted text-xs font-body w-20">{rightLabel}</span>
      </div>
    </div>
  )
}

export default function StepPreferences({ onSubmit, onBack, loading }: StepPreferencesProps) {
  const [answers, setAnswers] = useState<PreferenceAnswers>({
    pacing:       '',
    endings:      '',
    storytelling: '',
    tone:         '',
    complexity:   5,
    plotTwists:   5,
  })

  function set<K extends keyof PreferenceAnswers>(key: K) {
    return (val: PreferenceAnswers[K]) =>
      setAnswers(prev => ({ ...prev, [key]: val }))
  }

  const isComplete =
    answers.pacing && answers.endings && answers.storytelling && answers.tone

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text mb-2">
          YOUR PREFERENCES
        </h2>
        <p className="text-ns-muted font-body text-sm">
          A few quick questions to calibrate your Movie DNA.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-10">
        <RadioGroup
          label="Pacing — which do you prefer?"
          value={answers.pacing}
          onChange={set('pacing')}
          options={[
            { value: 'slow_burn',  label: 'Slow Burn',   sub: 'Let it breathe' },
            { value: 'balanced',   label: 'Balanced',    sub: 'Mix of both'    },
            { value: 'fast_paced', label: 'Fast-Paced',  sub: 'Keep it moving' },
          ]}
        />

        <RadioGroup
          label="Endings — which do you prefer?"
          value={answers.endings}
          onChange={set('endings')}
          options={[
            { value: 'happy',       label: 'Happy',       sub: 'Satisfying resolution' },
            { value: 'bittersweet', label: 'Bittersweet', sub: 'Earned complexity'     },
            { value: 'ambiguous',   label: 'Ambiguous',   sub: 'Open to interpretation'},
          ]}
        />

        <RadioGroup
          label="Storytelling — what do you value more?"
          value={answers.storytelling}
          onChange={set('storytelling')}
          options={[
            { value: 'characters', label: 'Characters', sub: 'Deep, rich people' },
            { value: 'plot',       label: 'Plot',       sub: 'Story and structure' },
            { value: 'equal',      label: 'Equal Mix',  sub: 'Both matter equally' },
          ]}
        />

        <RadioGroup
          label="Tone — which do you enjoy more?"
          value={answers.tone}
          onChange={set('tone')}
          options={[
            { value: 'dark',         label: 'Dark',         sub: 'Intense and serious' },
            { value: 'balanced',     label: 'Balanced',     sub: 'Mix of both'         },
            { value: 'lighthearted', label: 'Lighthearted', sub: 'Fun and uplifting'   },
          ]}
        />

        <SliderQuestion
          label="Complexity"
          sublabel="How complex do you like your movies?"
          leftLabel="Keep it simple"
          rightLabel="Give me layers"
          value={answers.complexity}
          onChange={set('complexity')}
        />

        <SliderQuestion
          label="Plot Twists"
          sublabel="How much do you enjoy plot twists?"
          leftLabel="Predictable is fine"
          rightLabel="Surprise me"
          value={answers.plotTwists}
          onChange={set('plotTwists')}
        />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="lg" onClick={onBack}>
          ← Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => isComplete && onSubmit(answers)}
          disabled={!isComplete}
          loading={loading}
        >
          Generate My DNA →
        </Button>
      </div>
    </div>
  )
}
