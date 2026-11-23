'use client'

import { Meter } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'
import type { XPLevel } from '@/types'

interface Props {
  level: XPLevel
  size?: 'md' | 'lg'
}

export default function XPBar({ level, size = 'md' }: Props) {
  const large = size === 'lg'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <span className={cn('font-display tabular-nums text-ns-text', large ? 'text-4xl sm:text-5xl' : 'text-2xl')}>
            Level {level.level}
          </span>
          <span className={cn('text-ns-muted', large ? 'text-lg' : 'text-sm')}>{level.title}</span>
        </div>
        <span className={cn('font-semibold tabular-nums text-ns-text', large ? 'text-lg' : 'text-sm')}>
          {level.totalXP} XP
        </span>
      </div>

      <Meter value={level.progress / 100} className={large ? 'mt-2 h-3' : 'h-2'} />

      {level.progress < 100 && (
        <p className="text-sm tabular-nums text-ns-muted">
          {level.currentXP} / {level.maxXP - level.minXP} XP to Level {level.level + 1}
        </p>
      )}
    </div>
  )
}
