'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { UserAchievementData, AchievementRarity } from '@/types'
import { getAchievementIcon, SuspenseIcon } from '@/components/icons'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

const RARITY_CONFIG: Record<AchievementRarity, { label: string; textClass: string }> = {
  common:    { label: 'Common',    textClass: 'text-ns-muted' },
  rare:      { label: 'Rare',      textClass: 'text-ns-info' },
  epic:      { label: 'Epic',      textClass: 'text-ns-tier-epic' },
  legendary: { label: 'Legendary', textClass: 'text-ns-secondary-readable' },
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
        onClick={() => setOpen(true)}
        className={`
          flex w-full min-w-0 items-start gap-4 border-t border-ns-border py-4 text-left transition-colors
          hover:bg-ns-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable
          ${locked ? 'opacity-60' : ''}
        `}
      >
        {/* Icon */}
        <span className="mt-0.5 flex w-6 flex-shrink-0 justify-center">
          {locked ? (
            <svg aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"
                 viewBox="0 0 24 24" className="text-ns-muted">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          ) : (
            <AchIcon size={22} className={achievement.earned ? rarity.textClass : 'text-ns-muted'} />
          )}
        </span>

        {/* Content */}
        <span className="block min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate font-heading text-sm font-semibold ${
              achievement.earned ? 'text-ns-text' : 'text-ns-muted'
            }`}>
              {achievement.name}
            </span>
            {achievement.earned && (
              <svg aria-hidden="true" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"
                   viewBox="0 0 24 24" className="flex-shrink-0 text-ns-secondary-readable">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
          </span>

          <span className="mt-0.5 block font-body text-xs leading-snug text-ns-muted line-clamp-2">
            {locked ? '???' : achievement.description}
          </span>

          <span className="mt-2 flex items-center gap-1.5 font-body text-[11px]">
            <span className={`uppercase tracking-widest ${rarity.textClass}`}>{rarity.label}</span>
            {locked ? (
              <span className="text-ns-muted">· Locked</span>
            ) : (
              <span className="tabular-nums text-ns-muted">· {achievement.progress}/{achievement.goal}</span>
            )}
          </span>

          {/* Progress bar */}
          {!locked && (
            <span className="mt-1.5 block h-0.5 max-w-xs overflow-hidden bg-ns-border">
              <span
                className={`block h-full transition-all ${achievement.earned ? 'bg-ns-secondary' : 'bg-ns-secondary/40'}`}
                style={{ width: `${pct}%` }}
              />
            </span>
          )}
        </span>

        {/* XP + date */}
        <span className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className={`flex items-center gap-0.5 font-body text-xs font-semibold tabular-nums ${
            achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'
          }`}>
            <SuspenseIcon size={10} />
            {achievement.xpReward}
          </span>
          {achievement.earnedAt && (
            <span className="font-body text-[11px] text-ns-muted">
              {new Date(achievement.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </span>
      </button>

      {open && (
        <AchievementDetailModal
          achievement={achievement}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
