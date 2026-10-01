'use client'

import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
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
    <div className="w-full min-w-0">
      <PageHeader
        title="YOUR GENRES"
        lede="Select all the genres you genuinely enjoy. No wrong answers."
      />

      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-x-6 border-t border-ns-border sm:grid-cols-2">
          {GENRES.map(genre => {
            const active = selected.includes(genre.id)
            return (
              <button
                key={genre.id}
                onClick={() => toggle(genre.id)}
                className={`flex min-h-12 w-full cursor-pointer select-none items-center gap-3 border-b border-ns-border py-3 text-left
                           transition-colors duration-200
                           ${active
                             ? 'text-ns-secondary-readable'
                             : 'text-ns-muted hover:text-ns-text'
                           }`}
              >
                <genre.Icon size={20} />
                <span className="flex-1 text-sm font-body font-medium">{genre.label}</span>
                {active && (
                  <svg aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        <div className="min-w-0 border-t-2 border-ns-text pt-4 lg:sticky lg:top-6 lg:self-start">
          <p className="text-ns-muted text-sm font-body">
            {selected.length} selected
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="lg" onClick={onBack}>
              ← Back
            </Button>
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
    </div>
  )
}
