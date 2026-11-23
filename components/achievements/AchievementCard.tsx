'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { UserAchievementData, AchievementRarity } from '@/types'
import { CheckIcon, LockIcon, getAchievementIcon } from '@/components/icons'
import { Meter } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

const RARITY_CONFIG: Record<AchievementRarity, { label: string; textClass: string; tileClass: string }> = {
  common:    { label: 'Common',    textClass: 'text-ns-muted',              tileClass: 'bg-ns-surface-3' },
  rare:      { label: 'Rare',      textClass: 'text-ns-info',               tileClass: 'bg-ns-tile-blue' },
  epic:      { label: 'Epic',      textClass: 'text-ns-tier-epic',          tileClass: 'bg-ns-tile-lilac' },
  legendary: { label: 'Legendary', textClass: 'text-ns-secondary-readable', tileClass: 'bg-ns-tile-rose' },
}

interface Props {
  achievement: UserAchievementData
}

export default function AchievementCard({ achievement }: Props) {
  const [open, setOpen] = useState(false)

  const rarity   = RARITY_CONFIG[achievement.rarity]
  const pct      = Math.min(100, Math.round((achievement.progress / achievement.goal) * 100))
  const locked   = !achievement.earned && achievement.progress === 0
  const AchIcon  = getAchievementIcon(achievement.slug)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-full w-full items-start gap-4 rounded-2xl bg-ns-surface p-5 text-left transition-colors duration-150 hover:bg-ns-surface-2"
      >
        <span className={cn(
          'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl',
          achievement.earned ? rarity.tileClass : 'bg-ns-surface-2',
        )}>
          {locked
            ? <LockIcon size={20} className="text-ns-subtle" />
            : <AchIcon size={24} className={achievement.earned ? 'text-ns-text' : 'text-ns-muted'} />}
        </span>

        <span className="block min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn('truncate font-heading text-base font-semibold', achievement.earned || !locked ? 'text-ns-text' : 'text-ns-muted')}>
              {achievement.name}
            </span>
            {achievement.earned && (
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ns-accent text-ns-secondary-foreground">
                <CheckIcon size={12} strokeWidth={3} />
              </span>
            )}
          </span>

          <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-ns-muted">
            {locked ? '???' : achievement.description}
          </span>

          {!locked && !achievement.earned && (
            <span className="mt-3 block">
              <Meter value={pct / 100} />
            </span>
          )}

          <span className="mt-2 flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-ns-muted">
            <span className={cn('font-semibold', rarity.textClass)}>{rarity.label}</span>
            <span aria-hidden="true">·</span>
            <span>{achievement.xpReward} XP</span>
            {locked && <><span aria-hidden="true">·</span><span>Locked</span></>}
            {!locked && !achievement.earned && (
              <><span aria-hidden="true">·</span><span>{achievement.progress}/{achievement.goal}</span></>
            )}
            {achievement.earnedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>{new Date(achievement.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </>
            )}
          </span>
        </span>
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
