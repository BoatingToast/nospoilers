'use client'

import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/services/achievements'
import { CheckIcon, getAchievementIcon } from '@/components/icons'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { growOnReveal } from '../motion'

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-ns-surface" />
        ))}
      </div>
    )
  }

  if (achievements.length === 0) {
    return <EmptyState title="No achievements yet." />
  }

  const selectedDef = selected ? ACHIEVEMENTS.find(a => a.slug === selected.slug) : null
  const SelectedIcon = selected ? getAchievementIcon(selected.slug) : null

  return (
    <div className="space-y-8">
      {earned.length > 0 && (
        <section>
          <h3 className="mb-3 font-heading text-lg font-bold text-ns-text">
            Unlocked <span className="ml-1 font-body text-base font-medium tabular-nums text-ns-muted">{earned.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {earned.map((a, index) => <AchievementTile key={a.slug} item={a} index={index} onSelect={setSelected} />)}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section>
          <h3 className="mb-3 font-heading text-lg font-bold text-ns-text">
            In progress <span className="ml-1 font-body text-base font-medium tabular-nums text-ns-muted">{inProgress.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {inProgress.map((a, index) => <AchievementTile key={a.slug} item={a} index={index} onSelect={setSelected} />)}
          </div>
        </section>
      )}

      {/* Detail modal */}
      {selected && selectedDef && SelectedIcon && (
        <Modal onClose={() => setSelected(null)} ariaLabel={selectedDef.name} maxWidth="max-w-sm">
          <div className="p-8 text-center">
            <SelectedIcon size={44} className="mx-auto text-ns-secondary-readable" />
            <h3 className="mt-4 font-heading text-2xl font-bold text-ns-text">{selectedDef.name}</h3>
            <p className="mt-2 text-base leading-relaxed text-ns-muted">{selectedDef.description}</p>
            {selected.earned ? (
              <p className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-ns-success">
                <CheckIcon size={14} /> Earned {selected.earnedAt
                  ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(selected.earnedAt))
                  : ''}
              </p>
            ) : (
              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-ns-surface-3">
                  <div
                    className="h-full rounded-full bg-ns-secondary"
                    style={{ width: `${Math.min(100, (selected.progress / selected.goal) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm tabular-nums text-ns-muted">{selected.progress} / {selected.goal}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function AchievementTile({
  item,
  index,
  onSelect,
}: {
  item: AchievementItem
  index: number
  onSelect: (item: AchievementItem) => void
}) {
  const def = ACHIEVEMENTS.find(a => a.slug === item.slug)
  if (!def) return null
  const pct = Math.min(100, Math.round((item.progress / item.goal) * 100))
  const AchIco = getAchievementIcon(item.slug)

  return (
    <div className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`flex h-full min-h-36 w-full flex-col rounded-2xl p-5 text-left transition-colors duration-150
          ${item.earned ? 'bg-ns-tile-peach hover:bg-ns-surface-3' : 'bg-ns-surface hover:bg-ns-surface-2'}`}
      >
        <AchIco size={24} className={item.earned ? 'text-ns-text' : 'text-ns-muted'} />
        <span className={`mt-3 block text-sm font-semibold leading-snug ${item.earned ? 'text-ns-text' : 'text-ns-muted'}`}>
          {def.name}
        </span>
        <span className="mt-auto block pt-3">
          {item.earned ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-ns-text">
              <CheckIcon size={13} /> Earned
            </span>
          ) : (
            <>
              <span className="block h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
                <span className={`block h-full rounded-full bg-ns-secondary ${growOnReveal}`} style={{ width: `${pct}%` }} />
              </span>
              <span className="mt-1.5 block text-sm tabular-nums text-ns-muted">{item.progress}/{item.goal}</span>
            </>
          )}
        </span>
      </button>
    </div>
  )
}
