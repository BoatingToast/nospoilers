'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { UserAchievementData, AchievementRarity } from '@/types'
import { getAchievementIcon, SuspenseIcon } from '@/components/icons'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

const RARITY_CONFIG: Record<AchievementRarity, {
  label:       string
  textClass:   string
  borderClass: string
  bgClass:     string
  glowStyle:   string
}> = {
  common: {
    label:       'Common',
    textClass:   'text-ns-muted',
    borderClass: 'border-ns-border',
    bgClass:     '',
    glowStyle:   '',
  },
  rare: {
    label:       'Rare',
    textClass:   'text-blue-400',
    borderClass: 'border-blue-500/30',
    bgClass:     'bg-blue-500/5',
    glowStyle:   'rgba(96,165,250,0.15)',
  },
  epic: {
    label:       'Epic',
    textClass:   'text-purple-400',
    borderClass: 'border-purple-500/30',
    bgClass:     'bg-purple-500/5',
    glowStyle:   'rgba(168,85,247,0.15)',
  },
  legendary: {
    label:       'Legendary',
    textClass:   'text-ns-gold',
    borderClass: 'border-ns-gold/30',
    bgClass:     'bg-ns-gold/5',
    glowStyle:   'rgba(200,150,62,0.2)',
  },
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
          w-full text-left p-4 rounded-2xl border transition-all duration-200
          hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]
          focus:outline-none focus:ring-2 focus:ring-ns-gold/30
          ${achievement.earned
            ? `${rarity.borderClass} ${rarity.bgClass} bg-ns-surface`
            : 'border-ns-border bg-ns-surface'
          }
          ${locked ? 'opacity-50' : ''}
        `}
        style={achievement.earned && rarity.glowStyle
          ? { boxShadow: `0 4px 20px ${rarity.glowStyle}` }
          : undefined
        }
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl border
            ${achievement.earned
              ? `${rarity.borderClass} ${rarity.bgClass}`
              : 'border-ns-border bg-ns-bg'
            }
          `}>
            {locked ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"
                   viewBox="0 0 24 24" className="text-ns-muted/40">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            ) : (
              <AchIcon size={22} className={achievement.earned ? rarity.textClass : 'text-ns-muted/50'} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className={`text-sm font-body font-semibold truncate ${
                achievement.earned ? 'text-ns-text' : 'text-ns-muted'
              }`}>
                {achievement.name}
              </p>
              {achievement.earned && (
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-ns-gold flex items-center justify-center">
                  <svg width="8" height="8" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
            </div>

            <p className="text-ns-muted/70 text-xs font-body leading-snug line-clamp-2 mb-3">
              {locked ? '???' : achievement.description}
            </p>

            {/* Progress bar */}
            {!locked && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-body tracking-widest uppercase ${rarity.textClass}`}>
                      {rarity.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-body text-ns-muted/60">
                    {achievement.progress}/{achievement.goal}
                  </span>
                </div>
                <div className="h-1 bg-ns-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      achievement.earned
                        ? 'bg-gradient-to-r from-ns-gold to-amber-400'
                        : 'bg-ns-gold/40'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Locked label */}
            {locked && (
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-body tracking-widest uppercase ${rarity.textClass}`}>
                  {rarity.label}
                </span>
                <span className="text-ns-muted/40 text-[9px] font-body">· Locked</span>
              </div>
            )}
          </div>

          {/* XP badge */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className={`text-[10px] font-body font-semibold flex items-center gap-0.5 ${
              achievement.earned ? 'text-ns-gold' : 'text-ns-muted/50'
            }`}>
              <SuspenseIcon size={10} />
              {achievement.xpReward}
            </span>
            {achievement.earnedAt && (
              <span className="text-[9px] font-body text-ns-muted/40">
                {new Date(achievement.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
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
