'use client'

import { useEffect, useState } from 'react'
import type { UserAchievementData, AchievementRarity } from '@/types'
import { getAchievementIcon, SuspenseIcon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<AchievementRarity, {
  label:     string
  textClass: string
  badge:     'muted' | 'info' | 'outline' | 'secondary'
}> = {
  common:    { label: 'Common',    textClass: 'text-ns-muted',              badge: 'muted' },
  rare:      { label: 'Rare',      textClass: 'text-ns-info',               badge: 'info' },
  epic:      { label: 'Epic',      textClass: 'text-ns-tier-epic',          badge: 'outline' },
  legendary: { label: 'Legendary', textClass: 'text-ns-secondary-readable', badge: 'secondary' },
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
  isNew?:      boolean   // newly unlocked (opened from the unlock toast)
}

export default function AchievementDetailModal({ achievement, onClose }: Props) {
  const [progressW, setProgressW] = useState(0)

  const rarity   = RARITY_CONFIG[achievement.rarity]
  const pct      = Math.min(100, Math.round((achievement.progress / achievement.goal) * 100))
  const remaining = Math.max(0, achievement.goal - achievement.progress)
  const AchIcon  = getAchievementIcon(achievement.slug)

  // Fill the progress bar after mount
  useEffect(() => {
    const t1 = setTimeout(() => setProgressW(pct), 80)
    return () => clearTimeout(t1)
  }, [pct])

  return (
    <Modal
      onClose={onClose}
      ariaLabelledBy="achievement-detail-title"
      ariaDescribedBy="achievement-detail-description"
      maxWidth="max-w-sm"
      className="overflow-hidden"
    >
      <div className="p-6">
        {/* Title row */}
        <div className="flex items-start gap-3 border-b border-ns-border pb-4 pr-8">
          <AchIcon size={28} className={`mt-0.5 flex-shrink-0 ${achievement.earned ? rarity.textClass : 'text-ns-muted'}`} />
          <div className="min-w-0">
            <h2 id="achievement-detail-title" className="break-words font-display text-3xl leading-none tracking-wide text-ns-text">
              {achievement.name.toUpperCase()}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={rarity.badge} className={`uppercase tracking-widest ${rarity.textClass}`}>
                {rarity.label}
              </Badge>
              <Badge variant="outline" className="uppercase tracking-widest">
                {CATEGORY_LABELS[achievement.category] ?? achievement.category}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        <p id="achievement-detail-description" className="mt-4 font-body text-sm leading-relaxed text-ns-text">
          {achievement.description}
        </p>

        {/* Progress */}
        <div className="mt-5 border-t border-ns-border pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-body text-xs text-ns-muted">Progress</span>
            <span className={`font-body text-xs font-medium tabular-nums ${achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
              {achievement.progress} / {achievement.goal}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden bg-ns-border">
            <div
              className={`h-full transition-all duration-700 ease-out ${achievement.earned ? 'bg-ns-secondary' : 'bg-ns-secondary/50'}`}
              style={{ width: `${progressW}%` }}
            />
          </div>
          <p className="mt-1.5 font-body text-xs text-ns-muted">
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
        <div className="mt-4 flex items-center justify-between border-t border-ns-border pt-3">
          <span className="font-body text-xs text-ns-muted">XP Reward</span>
          <div className="flex items-center gap-1.5">
            <SuspenseIcon size={16} className={achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'} />
            <span className={`font-body text-sm font-semibold ${achievement.earned ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
              {achievement.xpReward} XP
            </span>
            {achievement.earned && (
              <span className="font-body text-xs text-ns-muted">(earned)</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
