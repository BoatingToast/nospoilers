'use client'

import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/services/achievements'
import { CheckIcon, getAchievementIcon } from '@/components/icons'
import Button from '@/components/ui/Button'

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
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-t border-ns-border py-3">
            <div className="animate-pulse bg-ns-border rounded h-9" />
          </div>
        ))}
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <p className="border-t border-ns-border py-6 text-sm font-body text-ns-muted">No achievements yet.</p>
    )
  }

  function AchRow({ item }: { item: AchievementItem }) {
    const def = ACHIEVEMENTS.find(a => a.slug === item.slug)
    if (!def) return null
    const pct    = Math.min(100, Math.round((item.progress / item.goal) * 100))
    const AchIco = getAchievementIcon(item.slug)

    return (
      <li className="min-w-0 border-t border-ns-border">
        <button
          onClick={() => setSelected(item)}
          className="group flex min-h-[56px] w-full items-center gap-3 py-3 text-left"
        >
          <AchIco size={20} className={`flex-shrink-0 ${item.earned ? 'text-ns-secondary-readable' : 'text-ns-muted/40'}`} />
          <span className={`min-w-0 flex-1 text-sm font-body font-medium group-hover:underline underline-offset-4 ${item.earned ? 'text-white' : 'text-ns-muted'}`}>
            {def.name}
          </span>
          {item.earned ? (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs font-body text-ns-secondary-readable">
              <CheckIcon size={11} /> Earned
            </span>
          ) : (
            <span className="flex w-28 flex-shrink-0 items-center gap-2">
              <span className="block h-1 flex-1 overflow-hidden bg-ns-border">
                <span
                  className="block h-full bg-ns-secondary/40"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-xs font-body text-ns-muted">{item.progress}/{item.goal}</span>
            </span>
          )}
        </button>
      </li>
    )
  }

  return (
    <div>
      {earned.length > 0 && (
        <div className="mb-10">
          <h3 className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-3">
            Unlocked · {earned.length}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
            {earned.map(a => <AchRow key={a.slug} item={a} />)}
          </ul>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <h3 className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-3">
            In Progress · {inProgress.length}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
            {inProgress.map(a => <AchRow key={a.slug} item={a} />)}
          </ul>
        </div>
      )}

      {/* Detail modal */}
      {selected && (() => {
        const def = ACHIEVEMENTS.find(a => a.slug === selected.slug)
        if (!def) return null
        const Icon = getAchievementIcon(selected.slug)
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setSelected(null)}
          >
            <div
              className="w-full max-w-sm rounded border border-ns-border border-t-2 border-t-ns-text bg-ns-surface p-6"
              onClick={e => e.stopPropagation()}
            >
              <Icon size={32} className="text-ns-secondary-readable mb-4" />
              <h3 className="font-heading text-white text-xl mb-2">{def.name}</h3>
              <p className="text-ns-muted text-sm font-body mb-4">{def.description}</p>
              {selected.earned ? (
                <p className="text-ns-secondary-readable text-sm font-body flex items-center gap-1">
                  <CheckIcon size={13} /> Earned {selected.earnedAt
                    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(selected.earnedAt))
                    : ''}
                </p>
              ) : (
                <div>
                  <div className="h-1.5 bg-ns-border overflow-hidden mb-2">
                    <div
                      className="h-full bg-ns-secondary/60"
                      style={{ width: `${Math.min(100, (selected.progress / selected.goal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-ns-muted text-xs font-body">{selected.progress} / {selected.goal}</p>
                </div>
              )}
              <div className="mt-6 border-t border-ns-border pt-4">
                <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
