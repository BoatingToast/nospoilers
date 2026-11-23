'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { SavedNote, Segmented } from './FormControls'

type Visibility = 'public' | 'friends' | 'private'

interface PrivacyState {
  ratings:     Visibility
  watchlist:   Visibility
  collections: Visibility
  activity:    Visibility
}

const FIELDS: { key: keyof PrivacyState; label: string; description: string }[] = [
  { key: 'ratings', label: 'Ratings', description: 'Who can see the movies you\'ve rated and your scores' },
  { key: 'watchlist', label: 'Watchlist', description: 'Who can see the films on your current watchlist' },
  { key: 'collections', label: 'Collections', description: 'Who can browse your curated collections' },
  { key: 'activity', label: 'Activity feed', description: 'Who can see your activity in their friends feed' },
]

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'friends', label: 'Friends only' },
  { value: 'private', label: 'Private' },
]

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacyState>({
    ratings: 'public', watchlist: 'public', collections: 'public', activity: 'friends',
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveError, setSaveError] = useState(false)

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
    setSaveError(false)
    try {
      const response = await fetch('/api/settings/privacy', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      })
      if (!response.ok) throw new Error('Privacy settings were not saved')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="divide-y divide-ns-border rounded-2xl bg-ns-surface px-6 sm:px-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex animate-pulse flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded-sm bg-ns-surface-2" />
              <div className="h-3.5 w-3/5 rounded-sm bg-ns-surface-2" />
            </div>
            <div className="h-12 w-full rounded-full bg-ns-surface-2 sm:w-72" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y divide-ns-border rounded-2xl bg-ns-surface px-6 sm:px-8">
        {FIELDS.map(field => (
          <div key={field.key} className="flex flex-col gap-3 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold text-ns-text">{field.label}</h2>
              <p className="mt-0.5 text-sm text-ns-muted">{field.description}</p>
            </div>
            <div className="flex-shrink-0">
              <Segmented
                label={`${field.label} visibility`}
                value={settings[field.key]}
                options={OPTIONS}
                onChange={value => setSettings(s => ({ ...s, [field.key]: value }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
        {saveError && (
          <p role="alert" className="text-sm font-medium text-ns-danger">
            Your privacy settings were not saved. Try again.
          </p>
        )}
        <SavedNote show={saved} />
        <Button onClick={save} loading={saving}>
          {saving ? 'Saving…' : 'Save privacy settings'}
        </Button>
      </div>
    </div>
  )
}
