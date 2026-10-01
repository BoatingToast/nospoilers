'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { UserAchievementData } from '@/types'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

interface Props {
  achievement: UserAchievementData
  size?:       'sm' | 'md'
}

export default function AchievementBadge({ achievement, size = 'md' }: Props) {
  const [open, setOpen] = useState(false)
  const pct = Math.min(100, Math.round((achievement.progress / achievement.goal) * 100))
  const sm  = size === 'sm'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={achievement.name}
        className={`
          group relative flex flex-col items-center text-center
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable
          ${sm ? 'gap-1' : 'gap-2'}
          ${achievement.earned ? '' : 'opacity-60'}
          hover:opacity-100 transition-opacity
        `}
      >
        {/* Icon */}
        <div className={`
          relative flex items-center justify-center rounded-full border transition-colors
          group-hover:border-ns-text/60
          ${sm ? 'h-10 w-10 text-lg' : 'h-14 w-14 text-2xl'}
          ${achievement.earned ? 'border-ns-secondary' : 'border-ns-border'}
        `}>
          {achievement.icon}
          {achievement.earned && (
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ns-secondary">
              <svg aria-hidden="true" width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
          )}
        </div>

        {/* Name */}
        <p className={`font-body font-medium leading-tight text-ns-text transition-colors group-hover:text-ns-secondary-readable
                       ${sm ? 'text-[11px]' : 'text-xs'}`}>
          {achievement.name}
        </p>

        {/* Progress */}
        {!achievement.earned && (
          <div className={`w-full ${sm ? 'max-w-[40px]' : 'max-w-[56px]'}`}>
            <div className="h-0.5 overflow-hidden bg-ns-border">
              <div
                className="h-full bg-ns-secondary/50 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 font-body text-[11px] text-ns-muted">
              {achievement.progress}/{achievement.goal}
            </p>
          </div>
        )}
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
