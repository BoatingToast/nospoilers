'use client'

import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/services/achievements'
import { AchievementsIcon, CheckIcon, getAchievementIcon } from '@/components/icons'

interface AchievementItem {
  slug:     string
  progress: number
  goal:     number
  earned:   boolean
  earnedAt: string | null
}

export default function ProfileAchievementsTab({ username }: { username: string }) {
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState<AchievementItem | null>(null)

  useEffect(() => {
    fetch(`/api/profile/${username}/tabs?tab=achievements`)
      .then(r => r.json())
      .then(data => setAchievements(data.achievements ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  const earned   = achievements.filter(a => a.earned)
  const inProgress = achievements.filter(a => !a.earned)

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-ns-surface border border-ns-border rounded-2xl p-4 h-24" />
        ))}
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <div className="py-20 text-center">
        <AchievementsIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
        <p className="text-ns-muted font-body text-sm">No achievements yet.</p>
      </div>
    )
  }

  function AchCard({ item }: { item: AchievementItem }) {
    const def = ACHIEVEMENTS.find(a => a.slug === item.slug)
    if (!def) return null
    const pct    = Math.min(100, Math.round((item.progress / item.goal) * 100))
    const AchIco = getAchievementIcon(item.slug)

    return (
      <button
        onClick={() => setSelected(item)}
        className={`text-left p-4 rounded-2xl border transition-all
          ${item.earned
            ? 'bg-ns-gold/5 border-ns-gold/30 hover:border-ns-gold/60'
            : 'bg-ns-surface border-ns-border hover:border-ns-muted/40'
          }`}
      >
        <AchIco size={22} className={`mb-2 ${item.earned ? 'text-ns-gold' : 'text-ns-muted/40'}`} />
        <p className={`text-xs font-body font-medium mb-1 ${item.earned ? 'text-white' : 'text-ns-muted'}`}>
          {def.name}
        </p>
        {item.earned ? (
          <p className="text-[10px] font-body text-ns-gold flex items-center gap-0.5">
            <CheckIcon size={10} /> Earned
          </p>
        ) : (
          <div>
            <div className="h-1 bg-ns-border rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-ns-gold/40 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] font-body text-ns-muted mt-1">{item.progress}/{item.goal}</p>
          </div>
        )}
      </button>
    )
  }

  return (
    <div>
      {earned.length > 0 && (
        <div className="mb-8">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-3">
            Unlocked · {earned.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {earned.map(a => <AchCard key={a.slug} item={a} />)}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-3">
            In Progress · {inProgress.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {inProgress.map(a => <AchCard key={a.slug} item={a} />)}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (() => {
        const def = ACHIEVEMENTS.find(a => a.slug === selected.slug)
        if (!def) return null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-ns-surface border border-ns-border rounded-3xl p-8 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              {(() => { const Icon = getAchievementIcon(selected.slug); return <Icon size={44} className="text-ns-gold mx-auto mb-4" /> })()}
              <h3 className="font-heading text-white text-xl mb-2">{def.name}</h3>
              <p className="text-ns-muted text-sm font-body mb-4">{def.description}</p>
              {selected.earned ? (
                <p className="text-ns-gold text-sm font-body flex items-center justify-center gap-1">
                  <CheckIcon size={13} /> Earned {selected.earnedAt
                    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(selected.earnedAt))
                    : ''}
                </p>
              ) : (
                <div>
                  <div className="h-2 bg-ns-border rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-ns-gold/60 rounded-full"
                      style={{ width: `${Math.min(100, (selected.progress / selected.goal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-ns-muted text-xs font-body">{selected.progress} / {selected.goal}</p>
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                className="mt-6 text-ns-muted text-sm font-body hover:text-ns-text transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
