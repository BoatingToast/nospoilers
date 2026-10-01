'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { PopularIcon, FriendsIcon, LockIcon, CheckIcon, type IconProps } from '@/components/icons'

type Visibility = 'public' | 'friends' | 'private'

interface PrivacyState {
  ratings:     Visibility
  watchlist:   Visibility
  collections: Visibility
  activity:    Visibility
}

const FIELDS: { key: keyof PrivacyState; label: string; description: string }[] = [
  { key: 'ratings',     label: 'Ratings',      description: 'Who can see the movies you\'ve rated and your scores' },
  { key: 'watchlist',   label: 'Watchlist',     description: 'Who can see the films on your current watchlist' },
  { key: 'collections', label: 'Collections',   description: 'Who can browse your curated collections' },
  { key: 'activity',    label: 'Activity Feed', description: 'Who can see your activity in their friends feed' },
]

const OPTIONS: { value: Visibility; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { value: 'public',  label: 'Public',       Icon: PopularIcon  },
  { value: 'friends', label: 'Friends Only', Icon: FriendsIcon  },
  { value: 'private', label: 'Private',      Icon: LockIcon     },
]

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacyState>({
    ratings: 'public', watchlist: 'public', collections: 'public', activity: 'friends',
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    fetch('/api/settings/privacy')
      .then(r => r.json())
      .then(data => setSettings(s => ({ ...s, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings/privacy', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="border-t border-ns-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse border-b border-ns-border bg-ns-surface/40" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="border-t border-ns-border">
        {FIELDS.map(field => (
          <div
            key={field.key}
            className="grid gap-3 border-b border-ns-border py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
          >
            <div className="min-w-0">
              <p className="text-sm font-body text-white font-medium mb-0.5">{field.label}</p>
              <p className="text-xs font-body text-ns-muted">{field.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setSettings(s => ({ ...s, [field.key]: value }))}
                  className={`flex min-h-10 items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-body transition-colors
                    ${settings[field.key] === value
                      ? 'bg-ns-secondary/10 border-ns-secondary/40 text-ns-secondary-readable'
                      : 'border-ns-border text-ns-muted hover:text-ns-text hover:border-ns-muted/40'
                    }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 pt-5">
        {saved && (
          <span className="text-emerald-400 text-sm font-body flex items-center gap-1">
            <CheckIcon size={14} /> Saved
          </span>
        )}
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Privacy Settings'}
        </Button>
      </div>
    </div>
  )
}
