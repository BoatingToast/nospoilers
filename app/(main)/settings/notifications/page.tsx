'use client'

import { useState, useEffect } from 'react'
import {
  FriendsIcon, PersonIcon, CollectionsIcon, ReviewsIcon,
  AchievementsIcon, MovieDnaIcon, RecsIcon,
} from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import type { NotificationPrefs } from '@/services/notifications'

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked:  boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-ns-secondary' : 'bg-ns-border'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )
}

// ── Pref row ─────────────────────────────────────────────────────────────────

function PrefRow({
  icon,
  label,
  description,
  value,
  onChange,
  saving,
}: {
  icon:        React.ReactNode
  label:       string
  description: string
  value:       boolean
  onChange:    (v: boolean) => void
  saving:      boolean
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b border-ns-border py-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 flex-shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-body font-semibold text-ns-text leading-tight">{label}</p>
          <p className="text-xs font-body text-ns-muted mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <Toggle checked={value} onChange={onChange} disabled={saving} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULTS: NotificationPrefs = {
  newFollowers:      true,
  newFriends:        true,
  friendActivity:    true,
  collectionUpvotes: true,
  reviewReplies:     true,
  achievementUnlocks:true,
  dnaUpdates:        true,
  recsRefreshed:     true,
}

export default function NotificationSettingsPage() {
  const [prefs,   setPrefs]   = useState<NotificationPrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then(r => r.ok ? r.json() : DEFAULTS)
      .then((d: NotificationPrefs) => { setPrefs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const update = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings/notifications', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [key]: value }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Revert on failure
      setPrefs(prefs)
    } finally {
      setSaving(false)
    }
  }

  const rows: {
    key:         keyof NotificationPrefs
    label:       string
    description: string
    icon:        React.ReactNode
  }[] = [
    {
      key:         'newFollowers',
      label:       'New Followers',
      description: 'When someone starts following you',
      icon:        <PersonIcon size={16} className="text-ns-secondary-readable/70" />,
    },
    {
      key:         'newFriends',
      label:       'New Friends',
      description: 'When a mutual follow creates a friendship',
      icon:        <FriendsIcon size={16} className="text-ns-secondary-readable/70" />,
    },
    {
      key:         'friendActivity',
      label:       'Friend Activity',
      description: 'When friends rate movies, update their Top 5, or earn achievements',
      icon:        <FriendsIcon size={16} className="text-ns-muted/60" />,
    },
    {
      key:         'collectionUpvotes',
      label:       'Collection Upvotes',
      description: 'When someone upvotes one of your collections',
      icon:        <CollectionsIcon size={16} className="text-ns-secondary-readable/70" />,
    },
    {
      key:         'reviewReplies',
      label:       'Review Replies',
      description: 'When someone replies to one of your reviews',
      icon:        <ReviewsIcon size={16} className="text-ns-secondary-readable/70" />,
    },
    {
      key:         'achievementUnlocks',
      label:       'Achievement Unlocks',
      description: 'When you earn a new achievement or badge',
      icon:        <AchievementsIcon size={16} className="text-ns-secondary-readable/70" />,
    },
    {
      key:         'dnaUpdates',
      label:       'Movie DNA Evolution',
      description: 'When your taste profile shifts and your DNA title changes',
      icon:        <MovieDnaIcon size={16} className="text-ns-secondary-readable/70" />,
    },
    {
      key:         'recsRefreshed',
      label:       'New Recommendations',
      description: 'When your personalised recommendations are refreshed',
      icon:        <RecsIcon size={16} className="text-ns-secondary-readable/70" />,
    },
  ]

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <PageHeader title="Notification Settings" lede="Choose what you want to hear about">
        <p className="font-body text-sm text-ns-muted">Changes are saved automatically.</p>
        {saved && <Badge variant="secondary" size="md">Saved</Badge>}
      </PageHeader>

      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {loading ? (
          // Skeleton
          <div className="border-t border-ns-border">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex items-center gap-3 border-b border-ns-border py-4 animate-pulse">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-ns-border/50 rounded w-1/3" />
                  <div className="h-2.5 bg-ns-border/30 rounded w-2/3" />
                </div>
                <div className="w-11 h-6 rounded-full bg-ns-border/50" />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-ns-border">
            {rows.map(r => (
              <PrefRow
                key={r.key}
                icon={r.icon}
                label={r.label}
                description={r.description}
                value={prefs[r.key]}
                onChange={v => update(r.key, v)}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
