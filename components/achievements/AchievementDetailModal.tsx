'use client'

import type { UserAchievementData, AchievementRarity } from '@/types'
import { CheckIcon, getAchievementIcon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { Meter } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<AchievementRarity, { label: string; textClass: string; tileClass: string }> = {
  common:    { label: 'Common',    textClass: 'text-ns-muted',              tileClass: 'bg-ns-surface-3' },
  rare:      { label: 'Rare',      textClass: 'text-ns-info',               tileClass: 'bg-ns-tile-blue' },
  epic:      { label: 'Epic',      textClass: 'text-ns-tier-epic',          tileClass: 'bg-ns-tile-lilac' },
  legendary: { label: 'Legendary', textClass: 'text-ns-secondary-readable', tileClass: 'bg-ns-tile-rose' },
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
  const rarity   = RARITY_CONFIG[achievement.rarity]
  const pct      = Math.min(100, Math.round((achievement.progress / achievement.goal) * 100))
  const remaining = Math.max(0, achievement.goal - achievement.progress)
  const AchIcon  = getAchievementIcon(achievement.slug)

  return (
    <Modal
      onClose={onClose}
      ariaLabelledBy="achievement-detail-title"
      ariaDescribedBy="achievement-detail-description"
      maxWidth="max-w-sm"
    >
      <div className="p-7 text-center">
        <div className={cn(
          'relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl',
          achievement.earned ? rarity.tileClass : 'bg-ns-surface-2',
          isNew && achievement.earned && 'ns-rise',
        )}>
          <AchIcon size={32} className={achievement.earned ? 'text-ns-text' : 'text-ns-muted'} />
          {achievement.earned && (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ns-accent text-ns-secondary-foreground ring-4 ring-ns-surface">
              <CheckIcon size={14} strokeWidth={3} />
            </span>
          )}
        </div>

        <h2 id="achievement-detail-title" className="font-display text-3xl text-ns-text">
          {achievement.name}
        </h2>

        <div className="mt-3 flex items-center justify-center gap-2">
          <Badge variant="muted" className={rarity.textClass}>{rarity.label}</Badge>
          <Badge variant="outline">{CATEGORY_LABELS[achievement.category] ?? achievement.category}</Badge>
        </div>

        <p id="achievement-detail-description" className="mt-4 text-base leading-relaxed text-ns-muted">
          {achievement.description}
        </p>

        <div className="mt-6 text-left">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-ns-muted">Progress</span>
            <span className="font-semibold tabular-nums text-ns-text">
              {achievement.progress} / {achievement.goal}
            </span>
          </div>
          <Meter value={pct / 100} className="h-2" />
          <p className="mt-2 text-right text-sm text-ns-muted">
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

        <div className="mt-4 flex items-center justify-between rounded-xl bg-ns-surface-2 px-4 py-3 text-sm">
          <span className="text-ns-muted">XP reward</span>
          <span className="font-semibold tabular-nums text-ns-text">
            {achievement.xpReward} XP
            {achievement.earned && <span className="ml-1 font-normal text-ns-muted">(earned)</span>}
          </span>
        </div>
      </div>
    </Modal>
  )
}
