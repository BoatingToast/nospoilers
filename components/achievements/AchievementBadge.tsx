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
          relative flex flex-col items-center text-center
          ${sm ? 'gap-1' : 'gap-2'}
          ${achievement.earned ? '' : 'opacity-60'}
          hover:opacity-100 transition-opacity group focus:outline-none
        `}
      >
        {/* Icon circle */}
        <div className={`
          rounded-full flex items-center justify-center border-2 relative
          transition-all duration-200
          group-hover:scale-110 group-hover:border-ns-gold/40
          ${sm ? 'w-10 h-10 text-lg' : 'w-14 h-14 text-2xl'}
          ${achievement.earned
            ? 'border-ns-gold bg-ns-gold/10 shadow-[0_0_12px_rgba(200,150,62,0.3)]'
            : 'border-ns-border bg-ns-surface'}
        `}>
          {achievement.icon}
          {achievement.earned && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-ns-gold
                            flex items-center justify-center">
              <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
          )}
        </div>

        {/* Name */}
        <p className={`text-ns-text font-body font-medium leading-tight group-hover:text-ns-gold transition-colors
                       ${sm ? 'text-[10px]' : 'text-xs'}`}>
          {achievement.name}
        </p>

        {/* Progress */}
        {!achievement.earned && (
          <div className={`w-full ${sm ? 'max-w-[40px]' : 'max-w-[56px]'}`}>
            <div className="h-0.5 bg-ns-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ns-gold/50 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-ns-muted/50 text-[9px] font-body mt-0.5">
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
