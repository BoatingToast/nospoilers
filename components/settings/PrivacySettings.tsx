'use client'

import { useEffect, useState } from 'react'
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
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-ns-surface border border-ns-border rounded-2xl p-5 h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {FIELDS.map(field => (
        <div key={field.key} className="bg-ns-surface border border-ns-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-body text-white font-medium mb-0.5">{field.label}</p>
              <p className="text-xs font-body text-ns-muted">{field.description}</p>
            </div>
            <div className="flex gap-2">
              {OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setSettings(s => ({ ...s, [field.key]: value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body border transition-colors
                    ${settings[field.key] === value
                      ? 'bg-ns-gold/10 border-ns-gold/40 text-ns-gold'
                      : 'border-ns-border text-ns-muted hover:text-ns-text hover:border-ns-muted/40'
                    }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-end gap-4 pt-2">
        {saved && (
          <span className="text-emerald-400 text-sm font-body flex items-center gap-1">
            <CheckIcon size={14} /> Saved
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Privacy Settings'}
        </button>
      </div>
    </div>
  )
}
