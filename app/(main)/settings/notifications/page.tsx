'use client'

import { useState, useEffect } from 'react'
import {
  FriendsIcon, PersonIcon, CollectionsIcon, ReviewsIcon,
  AchievementsIcon, MovieDnaIcon, RecsIcon, NotificationsIcon,
} from '@/components/icons'
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
        ${checked ? 'bg-ns-gold' : 'bg-ns-border'}
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
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-ns-bg/50 border border-ns-border/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-body font-semibold text-ns-text leading-tight">{label}</p>
          <p className="text-xs font-body text-ns-muted/60 mt-0.5 leading-snug">{description}</p>
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
      icon:        <PersonIcon size={16} className="text-ns-gold/70" />,
    },
    {
      key:         'newFriends',
      label:       'New Friends',
      description: 'When a mutual follow creates a friendship',
      icon:        <FriendsIcon size={16} className="text-ns-gold/70" />,
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
      icon:        <CollectionsIcon size={16} className="text-ns-gold/70" />,
    },
    {
      key:         'reviewReplies',
      label:       'Review Replies',
      description: 'When someone replies to one of your reviews',
      icon:        <ReviewsIcon size={16} className="text-ns-gold/70" />,
    },
    {
      key:         'achievementUnlocks',
      label:       'Achievement Unlocks',
      description: 'When you earn a new achievement or badge',
      icon:        <AchievementsIcon size={16} className="text-ns-gold/70" />,
    },
    {
      key:         'dnaUpdates',
      label:       'Movie DNA Evolution',
      description: 'When your taste profile shifts and your DNA title changes',
      icon:        <MovieDnaIcon size={16} className="text-ns-gold/70" />,
    },
    {
      key:         'recsRefreshed',
      label:       'New Recommendations',
      description: 'When your personalised recommendations are refreshed',
      icon:        <RecsIcon size={16} className="text-ns-gold/70" />,
    },
  ]

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-ns-gold/10 border border-ns-gold/20 flex items-center justify-center">
          <NotificationsIcon size={18} className="text-ns-gold" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-ns-text">Notification Settings</h1>
          <p className="text-xs font-body text-ns-muted/60 mt-0.5">Choose what you want to hear about</p>
        </div>
        {saved && (
          <span className="ml-auto text-xs font-body text-ns-gold/80 bg-ns-gold/10 px-3 py-1 rounded-full">
            Saved
          </span>
        )}
      </div>

      {/* Prefs card */}
      <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
        {loading ? (
          // Skeleton
          <div className="divide-y divide-ns-border/30 px-5">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex items-center gap-3 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-ns-border/50 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-ns-border/50 rounded w-1/3" />
                  <div className="h-2.5 bg-ns-border/30 rounded w-2/3" />
                </div>
                <div className="w-11 h-6 rounded-full bg-ns-border/50" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-ns-border/30 px-5">
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

      <p className="text-xs font-body text-ns-muted/40 mt-4 text-center">
        Changes are saved automatically.
      </p>
    </div>
  )
}
