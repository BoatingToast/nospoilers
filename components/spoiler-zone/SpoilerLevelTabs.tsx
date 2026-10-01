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
  ring:   string   // active ring color
  text:   string   // active text color
  bg:     string   // active bg color
  desc:   string
}[] = [
  {
    key:   'safe',
    label: 'No Spoilers',
    short: 'Safe',
    dot:   'bg-emerald-400',
    ring:  'ring-emerald-500/30',
    text:  'text-emerald-400',
    bg:    'bg-emerald-500/10',
    desc:  'General impressions only',
  },
  {
    key:   'mid',
    label: 'Mid-Movie',
    short: 'Mid',
    dot:   'bg-amber-400',
    ring:  'ring-amber-500/30',
    text:  'text-amber-400',
    bg:    'bg-amber-500/10',
    desc:  'First half discussion',
  },
  {
    key:   'ending',
    label: 'Ending',
    short: 'Ending',
    dot:   'bg-red-400',
    ring:  'ring-red-500/30',
    text:  'text-red-400',
    bg:    'bg-red-500/10',
    desc:  'Full spoilers & finale',
  },
  {
    key:   'theory',
    label: 'Theories',
    short: 'Theory',
    dot:   'bg-violet-400',
    ring:  'ring-violet-500/30',
    text:  'text-violet-400',
    bg:    'bg-violet-500/10',
    desc:  'Fan theories & predictions',
  },
  {
    key:   'behind',
    label: 'Behind the Scenes',
    short: 'BTS',
    dot:   'bg-sky-400',
    ring:  'ring-sky-500/30',
    text:  'text-sky-400',
    bg:    'bg-sky-500/10',
    desc:  'Production & cast',
  },
]

export default function SpoilerLevelTabs({ active, onChange }: Props) {
  const activeLevel = LEVELS.find(l => l.key === active)!

  return (
    <div className="flex-shrink-0 border-b border-ns-border">
      {/* Tab row */}
      <div className="flex gap-x-5 overflow-x-auto scrollbar-hide">
        {LEVELS.map(level => {
          const isActive = level.key === active
          return (
            <button
              key={level.key}
              onClick={() => onChange(level.key)}
              title={level.desc}
              aria-pressed={isActive}
              className={`-mb-px flex min-h-10 flex-shrink-0 items-center gap-1.5 border-b-2 font-heading text-xs transition-colors
                          ${isActive
                            ? `${level.text} border-current font-semibold`
                            : 'border-transparent text-ns-muted hover:text-ns-text'
                          }`}
            >
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${level.dot} ${isActive ? 'opacity-100' : 'opacity-40'}`} />
              <span className="hidden sm:inline">{level.label}</span>
              <span className="sm:hidden">{level.short}</span>
            </button>
          )
        })}
      </div>

      {/* Active level subtitle */}
      <div className={`py-1.5 font-body text-xs ${activeLevel.text}`}>
        {activeLevel.desc}
      </div>
    </div>
  )
}
