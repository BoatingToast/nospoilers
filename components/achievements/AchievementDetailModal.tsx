'use client'

import { useEffect, useRef, useState } from 'react'
import type { UserAchievementData, AchievementRarity } from '@/types'
import { getAchievementIcon, SuspenseIcon } from '@/components/icons'

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
    textClass:   'text-blue-400',
    borderClass: 'border-blue-500/40',
    bgClass:     'bg-blue-500/10',
    glowStyle:   '0 0 20px rgba(96,165,250,0.25)',
  },
  epic: {
    label:       'Epic',
    textClass:   'text-purple-400',
    borderClass: 'border-purple-500/40',
    bgClass:     'bg-purple-500/10',
    glowStyle:   '0 0 20px rgba(168,85,247,0.25)',
  },
  legendary: {
    label:       'Legendary',
    textClass:   'text-ns-gold',
    borderClass: 'border-ns-gold/40',
    bgClass:     'bg-ns-gold/10',
    glowStyle:   '0 0 24px rgba(200,150,62,0.35)',
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
  const backdropRef  = useRef<HTMLDivElement>(null)
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

  // ESC to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div
        className="w-full max-w-sm bg-ns-bg border rounded-2xl overflow-hidden shadow-2xl"
        style={{ borderColor: achievement.earned ? undefined : undefined }}
      >
        {/* ── Header strip — rarity colour ─────────────────────────────── */}
        <div className={`h-1 w-full ${
          achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-ns-gold via-amber-400 to-ns-gold' :
          achievement.rarity === 'epic'      ? 'bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600' :
          achievement.rarity === 'rare'      ? 'bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600' :
                                               'bg-ns-border'
        }`} />

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="p-6">

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-full
                       text-ns-muted hover:text-ns-text hover:bg-ns-surface transition-colors"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

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
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-ns-gold
                                flex items-center justify-center border-2 border-ns-bg">
                  <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}

              {/* Pulse ring for newly unlocked */}
              {isNew && achievement.earned && (
                <div className="absolute inset-0 rounded-full border-2 border-ns-gold animate-ping opacity-40" />
              )}
            </div>
          </div>

          {/* Name */}
          <h2 className="font-display text-2xl tracking-wider text-ns-text text-center mb-1">
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
            <span className="text-[10px] font-body text-ns-muted border border-ns-border rounded-full px-2 py-0.5">
              {CATEGORY_LABELS[achievement.category] ?? achievement.category}
            </span>
          </div>

          {/* Description */}
          <p className="text-ns-muted text-sm font-body text-center leading-relaxed mb-6">
            {achievement.description}
          </p>

          {/* Progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-ns-muted text-xs font-body">Progress</span>
              <span className={`text-xs font-body font-medium ${achievement.earned ? 'text-ns-gold' : 'text-ns-muted'}`}>
                {achievement.progress} / {achievement.goal}
              </span>
            </div>
            <div className="h-2 bg-ns-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  achievement.earned
                    ? 'bg-gradient-to-r from-ns-gold to-amber-400'
                    : 'bg-gradient-to-r from-ns-gold/50 to-ns-gold/30'
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
            achievement.earned ? 'border-ns-gold/20 bg-ns-gold/5' : 'border-ns-border bg-ns-surface'
          }`}>
            <span className="text-ns-muted text-xs font-body">XP Reward</span>
            <div className="flex items-center gap-1.5">
              <SuspenseIcon size={16} className={achievement.earned ? 'text-ns-gold' : 'text-ns-muted'} />
              <span className={`font-body font-semibold text-sm ${achievement.earned ? 'text-ns-gold' : 'text-ns-muted'}`}>
                {achievement.xpReward} XP
              </span>
              {achievement.earned && (
                <span className="text-ns-muted/50 text-xs font-body">(earned)</span>
              )}
            </div>
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
    </div>
  )
}
