'use client'

import { CheckIcon, PlusIcon } from '@/components/icons'
import StepActions from './StepActions'

const GENRES: { id: string; label: string }[] = [
  { id: 'drama', label: 'Drama' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'crime', label: 'Crime' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'horror', label: 'Horror' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'action', label: 'Action' },
  { id: 'romance', label: 'Romance' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'documentary', label: 'Documentary' },
]

interface StepGenresProps {
  selected:    string[]
  setSelected: (genres: string[]) => void
  onNext:      () => void
  onBack:      () => void
}

export default function StepGenres({ selected, setSelected, onNext, onBack }: StepGenresProps) {
  function toggle(id: string) {
    setSelected(
      selected.includes(id)
        ? selected.filter(g => g !== id)
        : [...selected, id]
    )
  }

  return (
    <div>
      <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Your genres</h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-ns-muted">
        Select all the genres you genuinely enjoy. No wrong answers.
      </p>

      <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3">
        {GENRES.map(genre => {
          const active = selected.includes(genre.id)
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(genre.id)}
              className={`inline-flex min-h-14 cursor-pointer select-none items-center gap-2.5 rounded-full px-6 font-heading text-lg font-semibold transition-colors duration-200 active:translate-y-px ${
                active
                  ? 'bg-ns-text text-ns-bg'
                  : 'bg-ns-surface text-ns-text hover:bg-ns-surface-2'
              }`}
            >
              {active
                ? <CheckIcon key="on" size={18} className="motion-safe:animate-fade-up" />
                : <PlusIcon key="off" size={18} className="text-ns-muted" />}
              {genre.label}
            </button>
          )
        })}
      </div>

      <StepActions
        status={`${selected.length} selected`}
        nextLabel="Continue"
        onNext={onNext}
        onBack={onBack}
        nextDisabled={selected.length === 0}
      />
    </div>
  )
}
