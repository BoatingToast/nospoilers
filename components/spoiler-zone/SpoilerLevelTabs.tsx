'use client'

import type { SpoilerLevel } from '@/types'

interface Props {
  active:   SpoilerLevel
  onChange: (level: SpoilerLevel) => void
}

const LEVELS: {
  key:    SpoilerLevel
  label:  string
  short:  string   // mobile label
  dot:    string   // tailwind bg color
  text:   string   // warning text color
  desc:   string
}[] = [
  { key: 'safe', label: 'No spoilers', short: 'Safe', dot: 'bg-ns-success', text: 'text-ns-success', desc: 'General impressions only' },
  { key: 'mid', label: 'Mid-movie', short: 'Mid', dot: 'bg-ns-warning', text: 'text-ns-warning', desc: 'First half discussion' },
  { key: 'ending', label: 'Ending', short: 'Ending', dot: 'bg-ns-danger', text: 'text-ns-danger', desc: 'Full spoilers & finale' },
  { key: 'theory', label: 'Theories', short: 'Theory', dot: 'bg-ns-secondary', text: 'text-ns-secondary-readable', desc: 'Fan theories & predictions' },
  { key: 'behind', label: 'Behind the scenes', short: 'BTS', dot: 'bg-ns-info', text: 'text-ns-info', desc: 'Production & cast' },
]

export default function SpoilerLevelTabs({ active, onChange }: Props) {
  const activeLevel = LEVELS.find(l => l.key === active)!

  return (
    <div className="flex-shrink-0">
      <div role="group" aria-label="Spoiler level" className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-hide sm:-mx-6 sm:px-6">
        {LEVELS.map(level => {
          const isActive = level.key === active
          return (
            <button
              key={level.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(level.key)}
              title={level.desc}
              className={`inline-flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 sm:min-h-10 sm:px-4
                ${isActive
                  ? 'bg-ns-text text-ns-bg'
                  : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
                }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 flex-shrink-0 rounded-full ${level.dot}`} />
              <span className="hidden sm:inline">{level.label}</span>
              <span className="sm:hidden">{level.short}</span>
            </button>
          )
        })}
      </div>

      {/* The current room's spoiler warning */}
      <p key={active} className={`mt-2 animate-fade-up text-sm font-medium ${activeLevel.text}`}>
        {activeLevel.desc}
      </p>
    </div>
  )
}
