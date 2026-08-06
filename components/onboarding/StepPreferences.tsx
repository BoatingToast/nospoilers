'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export interface PreferenceAnswers {
  pacingScale:          number | null
  endingClosure:        number | null
  storytellingScale:    number | null
  toneScale:            number | null
  complexity:           number
  plotTwists:           number
  escapism:             number | null
  emotionalIntensity:   number | null
  eraOpenness:          number | null
  runtimePreference:    number | null
  popularityPreference: number | null
  discoveryPreference:  number | null
  subtitleOpenness:     number | null
  violenceTolerance:    number | null
  horrorTolerance:      number | null
  animationOpenness:    number | null
  documentaryOpenness:  number | null
  excludedGenres:       string[]
}

interface StepPreferencesProps {
  onSubmit: (answers: PreferenceAnswers) => void
  onBack:   () => void
  loading:  boolean
}

type ScaleKey = Exclude<keyof PreferenceAnswers, 'excludedGenres'>

interface ScaleConfig {
  key: ScaleKey
  label: string
  sublabel: string
  leftLabel: string
  rightLabel: string
  optional?: boolean
}

const STORY_SCALES: ScaleConfig[] = [
  { key: 'pacingScale', label: 'Pacing', sublabel: 'How quickly should a story move?', leftLabel: 'Slow burn', rightLabel: 'Fast-paced', optional: true },
  { key: 'storytellingScale', label: 'Story Focus', sublabel: 'What pulls you into a film?', leftLabel: 'Characters', rightLabel: 'Plot', optional: true },
  { key: 'complexity', label: 'Complexity', sublabel: 'How much should a movie make you work?', leftLabel: 'Accessible', rightLabel: 'Layered' },
  { key: 'plotTwists', label: 'Plot Twists', sublabel: 'How much do you enjoy narrative surprises?', leftLabel: 'Straightforward', rightLabel: 'Surprise me' },
  { key: 'endingClosure', label: 'Endings', sublabel: 'How much closure do you want?', leftLabel: 'Clear closure', rightLabel: 'Open-ended', optional: true },
]

const FEELING_SCALES: ScaleConfig[] = [
  { key: 'toneScale', label: 'Tone', sublabel: 'What atmosphere do you gravitate toward?', leftLabel: 'Light', rightLabel: 'Dark', optional: true },
  { key: 'escapism', label: 'Realism', sublabel: 'How close should the world feel to real life?', leftLabel: 'Grounded', rightLabel: 'Escapist', optional: true },
  { key: 'emotionalIntensity', label: 'Emotional Intensity', sublabel: 'How hard should a movie hit?', leftLabel: 'Comforting', rightLabel: 'Intense', optional: true },
]

const DISCOVERY_SCALES: ScaleConfig[] = [
  { key: 'eraOpenness', label: 'Era Openness', sublabel: 'How far back should recommendations reach?', leftLabel: 'Recent only', rightLabel: 'Any era', optional: true },
  { key: 'runtimePreference', label: 'Runtime', sublabel: 'How much time do you like to commit?', leftLabel: 'Short', rightLabel: 'Epic', optional: true },
  { key: 'popularityPreference', label: 'Popularity', sublabel: 'How established should a pick be?', leftLabel: 'Mainstream', rightLabel: 'Hidden gems', optional: true },
  { key: 'discoveryPreference', label: 'Discovery', sublabel: 'How far outside your comfort zone should we go?', leftLabel: 'Familiar', rightLabel: 'Experimental', optional: true },
]

const COMFORT_SCALES: ScaleConfig[] = [
  { key: 'subtitleOpenness', label: 'Subtitles', sublabel: 'Are international-language films welcome?', leftLabel: 'English only', rightLabel: 'Subtitles welcome', optional: true },
  { key: 'violenceTolerance', label: 'Graphic Content', sublabel: 'How much violence are you comfortable with?', leftLabel: 'Keep it mild', rightLabel: 'No limit', optional: true },
  { key: 'horrorTolerance', label: 'Horror', sublabel: 'How much fear do you want in the mix?', leftLabel: 'Avoid horror', rightLabel: 'Love horror', optional: true },
  { key: 'animationOpenness', label: 'Animation', sublabel: 'How often should animated films appear?', leftLabel: 'Rarely', rightLabel: 'Often', optional: true },
  { key: 'documentaryOpenness', label: 'Documentaries', sublabel: 'How often should nonfiction appear?', leftLabel: 'Rarely', rightLabel: 'Often', optional: true },
]

const AVOIDABLE_GENRES = [
  'action', 'animation', 'comedy', 'crime', 'documentary', 'drama', 'fantasy',
  'history', 'horror', 'mystery', 'romance', 'sci-fi', 'thriller', 'war', 'western',
]

function selectionLabel(value: number | null, left: string, right: string): string {
  if (value === null) return 'No preference'
  if (value <= 2) return left
  if (value <= 4) return `Mostly ${left.toLowerCase()}`
  if (value <= 6) return 'Balanced'
  if (value <= 8) return `Mostly ${right.toLowerCase()}`
  return right
}

function SliderQuestion({ config, value, onChange }: {
  config: ScaleConfig
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <div className="rounded-2xl border border-ns-border bg-ns-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-body font-medium text-ns-text">{config.label}</p>
          <p className="mt-0.5 text-xs font-body text-ns-muted">{config.sublabel}</p>
        </div>
        <span className="max-w-28 text-right text-[10px] font-body font-semibold uppercase tracking-wide text-ns-secondary">
          {selectionLabel(value, config.leftLabel, config.rightLabel)}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value ?? 5}
        aria-label={config.label}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-ns-secondary"
      />
      <div className="mt-1 flex items-start justify-between gap-4 text-[10px] font-body text-ns-muted">
        <span>{config.leftLabel}</span>
        <span className="text-right">{config.rightLabel}</span>
      </div>
      {config.optional && value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-[10px] font-body text-ns-muted underline decoration-ns-border underline-offset-2 hover:text-ns-text"
        >
          Clear preference
        </button>
      )}
    </div>
  )
}

function ScaleSection({ title, description, scales, answers, setAnswer }: {
  title: string
  description: string
  scales: ScaleConfig[]
  answers: PreferenceAnswers
  setAnswer: (key: ScaleKey, value: number | null) => void
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-sm font-heading text-white">{title}</h3>
        <p className="mt-0.5 text-xs font-body text-ns-muted">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {scales.map(config => (
          <SliderQuestion
            key={config.key}
            config={config}
            value={answers[config.key] as number | null}
            onChange={value => setAnswer(config.key, value)}
          />
        ))}
      </div>
    </section>
  )
}

export default function StepPreferences({ onSubmit, onBack, loading }: StepPreferencesProps) {
  const [answers, setAnswers] = useState<PreferenceAnswers>({
    pacingScale: null,
    endingClosure: null,
    storytellingScale: null,
    toneScale: null,
    complexity: 5,
    plotTwists: 5,
    escapism: null,
    emotionalIntensity: null,
    eraOpenness: null,
    runtimePreference: null,
    popularityPreference: null,
    discoveryPreference: null,
    subtitleOpenness: null,
    violenceTolerance: null,
    horrorTolerance: null,
    animationOpenness: null,
    documentaryOpenness: null,
    excludedGenres: [],
  })

  function setAnswer(key: ScaleKey, value: number | null) {
    setAnswers(previous => ({ ...previous, [key]: value }))
  }

  function toggleExcludedGenre(genre: string) {
    setAnswers(previous => ({
      ...previous,
      excludedGenres: previous.excludedGenres.includes(genre)
        ? previous.excludedGenres.filter(item => item !== genre)
        : [...previous.excludedGenres, genre],
    }))
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text mb-2">
          YOUR PREFERENCES
        </h2>
        <p className="text-ns-muted font-body text-sm">
          Shape your recommendations with as much—or as little—detail as you want.
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-8">
        <ScaleSection title="Story" description="The way you like movies to unfold." scales={STORY_SCALES} answers={answers} setAnswer={setAnswer} />
        <ScaleSection title="Feeling" description="The atmosphere and emotional weight you enjoy." scales={FEELING_SCALES} answers={answers} setAnswer={setAnswer} />
        <ScaleSection title="Discovery" description="How broad and adventurous recommendations should be." scales={DISCOVERY_SCALES} answers={answers} setAnswer={setAnswer} />
        <ScaleSection title="Comfort" description="Optional boundaries that keep unsuitable picks out." scales={COMFORT_SCALES} answers={answers} setAnswer={setAnswer} />

        <section>
          <div className="mb-3">
            <h3 className="text-sm font-heading text-white">Genres to avoid</h3>
            <p className="mt-0.5 text-xs font-body text-ns-muted">Optional hard exclusions. You can change these later.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVOIDABLE_GENRES.map(genre => {
              const selected = answers.excludedGenres.includes(genre)
              return (
                <button
                  type="button"
                  key={genre}
                  aria-pressed={selected}
                  onClick={() => toggleExcludedGenre(genre)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-body capitalize transition-colors ${
                    selected
                      ? 'border-red-400/60 bg-red-500/10 text-red-300'
                      : 'border-ns-border bg-ns-surface text-ns-muted hover:border-ns-muted/50 hover:text-ns-text'
                  }`}
                >
                  {selected ? '× ' : ''}{genre}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="lg" onClick={onBack}>← Back</Button>
        <Button variant="primary" size="lg" onClick={() => onSubmit(answers)} loading={loading}>
          Generate My DNA →
        </Button>
      </div>
    </div>
  )
}
