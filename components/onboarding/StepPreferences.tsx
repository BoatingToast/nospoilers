'use client'

import { useState } from 'react'
import { ChevronIcon, CloseIcon } from '@/components/icons'
import StepActions from './StepActions'

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

const CORE_SCALES: ScaleConfig[] = [
  FEELING_SCALES.find(scale => scale.key === 'emotionalIntensity')!,
  DISCOVERY_SCALES.find(scale => scale.key === 'runtimePreference')!,
  DISCOVERY_SCALES.find(scale => scale.key === 'discoveryPreference')!,
  COMFORT_SCALES.find(scale => scale.key === 'subtitleOpenness')!,
  COMFORT_SCALES.find(scale => scale.key === 'horrorTolerance')!,
]

const CORE_KEYS = new Set<ScaleKey>(CORE_SCALES.map(scale => scale.key))
const FINE_TUNE_SCALES = [
  ...STORY_SCALES,
  ...FEELING_SCALES,
  ...DISCOVERY_SCALES,
  ...COMFORT_SCALES,
].filter(scale => !CORE_KEYS.has(scale.key))

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

const RANGE_CLASSES = [
  'relative h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent',
  '[&::-webkit-slider-runnable-track]:h-11 [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:mt-2.5 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-ns-surface [&::-webkit-slider-thumb]:transition-colors',
  '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-ns-surface',
].join(' ')

function SliderQuestion({ config, value, onChange }: {
  config: ScaleConfig
  value: number | null
  onChange: (value: number | null) => void
}) {
  const label = selectionLabel(value, config.leftLabel, config.rightLabel)
  const fill = value === null ? 0 : (value - 1) / 9

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-heading text-base font-semibold text-ns-text">{config.label}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ns-muted">{config.sublabel}</p>
        </div>
        <span
          key={label}
          className={`max-w-[9rem] flex-shrink-0 text-right text-sm font-semibold motion-safe:animate-fade-up ${value === null ? 'text-ns-muted' : 'text-ns-secondary-readable'}`}
        >
          {label}
        </span>
      </div>

      <div className="relative mt-1 flex h-11 items-center">
        <div aria-hidden="true" className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
          <div
            className="h-full origin-left rounded-full bg-ns-secondary transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
            style={{ transform: `scaleX(${fill})` }}
          />
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={value ?? 5}
          aria-label={config.label}
          aria-valuetext={label}
          onChange={event => onChange(Number(event.target.value))}
          className={`${RANGE_CLASSES} ${value === null
            ? '[&::-moz-range-thumb]:bg-ns-muted [&::-webkit-slider-thumb]:bg-ns-muted'
            : '[&::-moz-range-thumb]:bg-ns-text [&::-webkit-slider-thumb]:bg-ns-text'}`}
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-ns-muted">
        <span>{config.leftLabel}</span>
        {config.optional && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-10 rounded-full px-3 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text motion-safe:animate-fade-up"
          >
            Clear preference
          </button>
        )}
        <span className="text-right">{config.rightLabel}</span>
      </div>
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
      <h2 className="font-heading text-xl font-bold text-ns-text">{title}</h2>
      <p className="mt-1 text-base text-ns-muted">{description}</p>
      <div className="mt-5 divide-y divide-ns-border">
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
  const [showFineTune, setShowFineTune] = useState(false)
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
    <div>
      <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Your preferences</h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-ns-muted">
        Five quick choices give us the strongest signals. You can skip any that do not matter to you.
      </p>

      <div className="mt-8 rounded-2xl bg-ns-surface p-6 sm:p-8">
        <ScaleSection
          title="The essentials"
          description="Your time, comfort, and appetite for discovery."
          scales={CORE_SCALES}
          answers={answers}
          setAnswer={setAnswer}
        />
      </div>

      <section className="mt-4 rounded-2xl bg-ns-surface">
        <button
          type="button"
          aria-expanded={showFineTune}
          aria-controls="fine-tune-preferences"
          onClick={() => setShowFineTune(open => !open)}
          className="flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left transition-colors duration-150 hover:bg-ns-surface-2 sm:px-8"
        >
          <span className="min-w-0">
            <span className="block font-heading text-base font-semibold text-ns-text">Fine-tune my taste</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-ns-muted">
              Optional story, tone, era, and content controls — plus genres to avoid.
            </span>
          </span>
          <ChevronIcon
            size={20}
            direction="down"
            className={`flex-shrink-0 text-ns-muted transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${showFineTune ? 'rotate-180' : ''}`}
          />
        </button>

        {showFineTune && (
          <div
            id="fine-tune-preferences"
            className="space-y-10 border-t border-ns-border p-6 motion-safe:animate-[fadeUp_280ms_cubic-bezier(0.23,1,0.32,1)_backwards] sm:p-8"
          >
            <ScaleSection
              title="More taste signals"
              description="These start neutral and can be adjusted now or later in settings."
              scales={FINE_TUNE_SCALES}
              answers={answers}
              setAnswer={setAnswer}
            />

            <section>
              <h2 className="font-heading text-xl font-bold text-ns-text">Genres to avoid</h2>
              <p className="mt-1 text-base text-ns-muted">Optional hard exclusions. You can change these later.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {AVOIDABLE_GENRES.map(genre => {
                  const selected = answers.excludedGenres.includes(genre)
                  return (
                    <button
                      type="button"
                      key={genre}
                      aria-pressed={selected}
                      onClick={() => toggleExcludedGenre(genre)}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold capitalize transition-colors duration-150 ${
                        selected
                          ? 'bg-ns-danger/10 text-ns-danger'
                          : 'bg-ns-surface-2 text-ns-text hover:bg-ns-surface-3'
                      }`}
                    >
                      {selected && <CloseIcon size={13} />}
                      {genre}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </section>

      {!showFineTune && (
        <p className="mt-4 text-center text-sm text-ns-muted">
          The rest stays neutral for now and can be changed in settings at any time.
        </p>
      )}

      <StepActions
        nextLabel="Generate My DNA"
        onNext={() => onSubmit(answers)}
        onBack={onBack}
        loading={loading}
      />
    </div>
  )
}
