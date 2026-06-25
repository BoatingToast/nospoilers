'use client'

import Button from '@/components/ui/Button'
import {
  EmotionIcon, SuspenseIcon, SearchIcon, CompassIcon, EyeIcon,
  HumorIcon, ActionIcon, HeartIcon, MovieDnaIcon, ClapperboardIcon,
  type IconProps,
} from '@/components/icons'

const GENRES: { id: string; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { id: 'drama',       label: 'Drama',       Icon: EmotionIcon     },
  { id: 'thriller',    label: 'Thriller',    Icon: SuspenseIcon    },
  { id: 'crime',       label: 'Crime',       Icon: SearchIcon      },
  { id: 'sci-fi',      label: 'Sci-Fi',      Icon: CompassIcon     },
  { id: 'horror',      label: 'Horror',      Icon: EyeIcon         },
  { id: 'comedy',      label: 'Comedy',      Icon: HumorIcon       },
  { id: 'action',      label: 'Action',      Icon: ActionIcon      },
  { id: 'romance',     label: 'Romance',     Icon: HeartIcon       },
  { id: 'mystery',     label: 'Mystery',     Icon: MovieDnaIcon    },
  { id: 'documentary', label: 'Documentary', Icon: ClapperboardIcon},
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text mb-2">
          YOUR GENRES
        </h2>
        <p className="text-ns-muted font-body text-sm">
          Select all the genres you genuinely enjoy. No wrong answers.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
        {GENRES.map(genre => {
          const active = selected.includes(genre.id)
          return (
            <button
              key={genre.id}
              onClick={() => toggle(genre.id)}
              className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl
                         border transition-all duration-200 cursor-pointer select-none
                         ${active
                           ? 'bg-ns-gold/10 border-ns-gold text-ns-gold shadow-[0_0_20px_rgba(200,150,62,0.1)]'
                           : 'bg-ns-surface border-ns-border text-ns-muted hover:border-ns-muted/40 hover:text-ns-text'
                         }`}
            >
              <genre.Icon size={24} />
              <span className="text-sm font-body font-medium">{genre.label}</span>
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-ns-gold flex items-center justify-center">
                  <svg width="8" height="8" fill="none" stroke="#07070F" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="lg" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-ns-muted text-sm font-body">
            {selected.length} selected
          </span>
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            disabled={selected.length === 0}
          >
            Continue →
          </Button>
        </div>
      </div>
    </div>
  )
}
