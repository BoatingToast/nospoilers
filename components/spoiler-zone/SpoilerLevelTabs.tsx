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
      <div className="flex overflow-x-auto scrollbar-hide px-4 pt-2 pb-0 gap-0.5">
        {LEVELS.map(level => {
          const isActive = level.key === active
          return (
            <button
              key={level.key}
              onClick={() => onChange(level.key)}
              title={level.desc}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-body rounded-t-lg
                          border-b-2 transition-all duration-150
                          ${isActive
                            ? `${level.bg} ${level.text} border-current font-semibold`
                            : 'text-ns-muted border-transparent hover:text-ns-text hover:bg-ns-surface/40'
                          }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${level.dot} ${isActive ? 'opacity-100' : 'opacity-40'}`} />
              <span className="hidden sm:inline">{level.label}</span>
              <span className="sm:hidden">{level.short}</span>
            </button>
          )
        })}
      </div>

      {/* Active level subtitle */}
      <div className={`px-5 py-1.5 text-[10px] font-body ${activeLevel.text}/70`}>
        {activeLevel.desc}
      </div>
    </div>
  )
}
