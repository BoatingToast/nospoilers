'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { UserAchievementData } from '@/types'
import { CheckIcon, getAchievementIcon } from '@/components/icons'
import { Meter } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

interface Props {
  achievement: UserAchievementData
  size?:       'sm' | 'md'
}

export default function AchievementBadge({ achievement, size = 'md' }: Props) {
  const [open, setOpen] = useState(false)
  const pct = Math.min(100, Math.round((achievement.progress / achievement.goal) * 100))
  const sm  = size === 'sm'
  const AchIcon = getAchievementIcon(achievement.slug)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={achievement.name}
        className={cn('group relative flex min-h-11 flex-col items-center rounded-xl text-center', sm ? 'gap-1' : 'gap-2')}
      >
        <span className={cn(
          'relative flex items-center justify-center rounded-full transition-colors duration-150',
          sm ? 'h-10 w-10' : 'h-14 w-14',
          achievement.earned ? 'bg-ns-tile-rose group-hover:bg-ns-surface-3' : 'bg-ns-surface-2 group-hover:bg-ns-surface-3',
        )}>
          <AchIcon size={sm ? 18 : 24} className={achievement.earned ? 'text-ns-text' : 'text-ns-muted'} />
          {achievement.earned && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ns-accent text-ns-secondary-foreground">
              <CheckIcon size={10} strokeWidth={3.5} />
            </span>
          )}
        </span>

        <span className="text-xs font-semibold leading-tight text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
          {achievement.name}
        </span>

        {!achievement.earned && (
          <span className={cn('block w-full', sm ? 'max-w-10' : 'max-w-14')}>
            <Meter value={pct / 100} className="h-1" />
            <span className="mt-0.5 block text-xs tabular-nums text-ns-muted">
              {achievement.progress}/{achievement.goal}
            </span>
          </span>
        )}
      </button>

      {open && createPortal(
        <AchievementDetailModal
          achievement={achievement}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )}
    </>
  )
}
