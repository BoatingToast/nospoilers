'use client'

import { useEffect, useState } from 'react'
import type { UserAchievementData, AchievementRarity } from '@/types'
import { getAchievementIcon, SuspenseIcon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<AchievementRarity, {
  label: string
  textClass:   string
  borderClass: string
  bgClass:     string
  glowStyle:   string
}> = {
  common: {
    label:       'Common',
    textClass:   'text-ns-muted',
    borderClass: 'border-ns-border',
    bgClass:     'bg-ns-surface',
    glowStyle:   '',
  },
  rare: {
    label:       'Rare',
    textClass:   'text-ns-info',
    borderClass: 'border-ns-info/40',
    bgClass:     'bg-ns-info/10',
    glowStyle:   '0 0 20px rgb(var(--ns-info)/0.25)',
  },
  epic: {
    label:       'Epic',
    textClass:   'text-ns-tier-epic',
    borderClass: 'border-ns-tier-epic/40',
    bgClass:     'bg-ns-tier-epic/10',
    glowStyle:   '0 0 20px rgb(var(--ns-tier-epic)/0.25)',
  },
  legendary: {
    label:       'Legendary',
    textClass:   'text-ns-secondary-readable',
    borderClass: 'border-ns-secondary/40',
    bgClass:     'bg-ns-secondary/10',
    glowStyle:   '0 0 24px rgb(var(--ns-secondary)/0.35)',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  watching:    'Watching',
  genres:      'Genres',
  discovery:   'Discovery',
  collections: 'Collections',
  social:      'Social',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  achievement: UserAchievementData
  onClose:     () => void
  isNew?:      boolean   // plays unlock animation when true
}

export default function AchievementDetailModal({ achievement, onClose, isNew = false }: Props) {
  const [animate, setAnimate] = useState(false)
  const [progressW, setProgressW] = useState(0)

  const rarity   = RARITY_CONFIG[achievement.rarity]
  const pct      = Math.min(100, Math.round((achievement.progress / achievement.goal) * 100))
  const remaining = Math.max(0, achievement.goal - achievement.progress)
  const AchIcon  = getAchievementIcon(achievement.slug)

  // Animate progress bar + icon on mount
  useEffect(() => {
    const t1 = setTimeout(() => setProgressW(pct), 80)
    const t2 = setTimeout(() => setAnimate(true),   120)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pct])

  return (
    <Modal
      onClose={onClose}
      ariaLabelledBy="achievement-detail-title"
      ariaDescribedBy="achievement-detail-description"
      maxWidth="max-w-sm"
      className="overflow-hidden"
    >
        {/* ── Header strip — rarity colour ─────────────────────────────── */}
        <div className={`h-1 w-full ${
          achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-ns-secondary via-ns-secondary/50 to-ns-secondary' :
          achievement.rarity === 'epic'      ? 'bg-gradient-to-r from-ns-tier-epic via-ns-tier-epic/50 to-ns-tier-epic' :
          achievement.rarity === 'rare'      ? 'bg-gradient-to-r from-ns-info via-ns-info/50 to-ns-info' :
                                               'bg-ns-border'
        }`} />

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="p-6">

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className={`
                relative w-20 h-20 rounded-full flex items-center justify-center border-2
                transition-all duration-500
                ${achievement.earned ? rarity.bgClass + ' ' + rarity.borderClass : 'bg-ns-surface border-ns-border opacity-70'}
                ${animate && achievement.earned ? 'scale-110' : 'scale-100'}
                ${isNew && achievement.earned ? 'achievement-unlock' : ''}
              `}
              style={achievement.earned ? { boxShadow: rarity.glowStyle } : undefined}
            >
              <AchIcon size={30} className={achievement.earned ? rarity.textClass : 'text-ns-muted/40'} />

              {/* Earned checkmark */}
              {achievement.earned && (
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-ns-secondary
                                flex items-center justify-center border-2 border-ns-bg">
                  <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}

              {/* Pulse ring for newly unlocked */}
              {isNew && achievement.earned && (
                <div className="absolute inset-0 rounded-full border-2 border-ns-secondary animate-ping opacity-40" />
              )}
            </div>
          </div>

          {/* Name */}
          <h2 id="achievement-detail-title" className="font-display text-2xl tracking-wider text-ns-text text-center mb-1">
            {achievement.name.toUpperCase()}
          </h2>

          {/* Badges row */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {/* Rarity */}
            <span className={`
              text-[10px] font-body font-medium tracking-widest uppercase px-2 py-0.5 rounded-full border
              ${rarity.textClass} ${rarity.borderClass} ${rarity.bgClass}
            `}>
              {rarity.label}
            </span>
            {/* Category */}
            <Badge variant="outline" className="uppercase tracking-widest">
              {CATEGORY_LABELS[achievement.category] ?? achievement.category}
            </Badge>
          </div>

          {/* Description */}
          <p id="achievement-detail-description" className="text-ns-muted text-sm font-body text-center leading-relaxed mb-6">
            {achievement.description}
          </p>

          {/* Progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-ns-muted text-xs font-body">Progress</span>
              <span className={`text-xs font-body font-medium ${achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
                {achievement.progress} / {achievement.goal}
              </span>
            </div>
            <div className="h-2 bg-ns-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  achievement.earned
                    ? 'bg-gradient-to-r from-ns-secondary to-ns-secondary/60'
                    : 'bg-gradient-to-r from-ns-secondary/50 to-ns-secondary/30'
                }`}
                style={{ width: `${progressW}%` }}
              />
            </div>
            <p className="text-ns-muted/60 text-[11px] font-body mt-1.5 text-right">
              {achievement.earned
                ? achievement.earnedAt
                  ? `Earned ${new Date(achievement.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'Earned'
                : remaining === 0
                  ? 'Almost there!'
                  : `${remaining} more to go`
              }
            </p>
          </div>

          {/* XP reward */}
          <div className={`flex items-center justify-between p-3 rounded-xl border ${
            achievement.earned ? 'border-ns-secondary/20 bg-ns-secondary/5' : 'border-ns-border bg-ns-surface'
          }`}>
            <span className="text-ns-muted text-xs font-body">XP Reward</span>
            <div className="flex items-center gap-1.5">
              <SuspenseIcon size={16} className={achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'} />
              <span className={`font-body font-semibold text-sm ${achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
                {achievement.xpReward} XP
              </span>
              {achievement.earned && (
                <span className="text-ns-muted/50 text-xs font-body">(earned)</span>
              )}
            </div>
          </div>
        </div>

      <style>{`
        @keyframes achievement-unlock {
          0%   { transform: scale(1);    }
          30%  { transform: scale(1.25); }
          50%  { transform: scale(1.15); }
          70%  { transform: scale(1.22); }
          100% { transform: scale(1.1);  }
        }
        .achievement-unlock {
          animation: achievement-unlock 0.6s ease-out forwards;
        }
      `}</style>
    </Modal>
  )
}
