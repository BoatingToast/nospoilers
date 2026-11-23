'use client'

import { useId, useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SavedNote, Toggle } from '@/components/settings/FormControls'
import type { NotificationPrefs } from '@/services/notifications'

// ── Pref row ─────────────────────────────────────────────────────────────────

function PrefRow({
  label,
  description,
  value,
  onChange,
  saving,
}: {
  label:       string
  description: string
  value:       boolean
  onChange:    (v: boolean) => void
  saving:      boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p id={`${id}-label`} className="text-base font-semibold leading-snug text-ns-text">{label}</p>
        <p id={`${id}-description`} className="mt-0.5 text-sm leading-snug text-ns-muted">{description}</p>
      </div>
      <Toggle
        checked={value}
        onChange={onChange}
        disabled={saving}
        labelledBy={`${id}-label`}
        describedBy={`${id}-description`}
      />
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

type PrefDefinition = {
  key:         keyof NotificationPrefs
  label:       string
  description: string
}

const GROUPS: { title: string; rows: PrefDefinition[] }[] = [
  {
    title: 'People',
    rows: [
      { key: 'newFollowers', label: 'New followers', description: 'When someone starts following you' },
      { key: 'newFriends', label: 'New friends', description: 'When a mutual follow creates a friendship' },
      { key: 'friendActivity', label: 'Friend activity', description: 'When friends rate movies, update their Top 5, or earn achievements' },
    ],
  },
  {
    title: 'Your movies',
    rows: [
      { key: 'collectionUpvotes', label: 'Collection upvotes', description: 'When someone upvotes one of your collections' },
      { key: 'reviewReplies', label: 'Review replies', description: 'When someone replies to one of your reviews' },
      { key: 'achievementUnlocks', label: 'Achievement unlocks', description: 'When you earn a new achievement or badge' },
      { key: 'dnaUpdates', label: 'Movie DNA evolution', description: 'When your taste profile shifts and your DNA title changes' },
      { key: 'recsRefreshed', label: 'New recommendations', description: 'When your personalised recommendations are refreshed' },
    ],
  },
]

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

  return (
    <>
      <PageHeader
        title="Notification settings"
        description="Choose what you want to hear about"
        actions={<SavedNote show={saved} />}
      />

      <div className="mt-8 space-y-4">
        {loading ? (
          [3, 5].map(count => (
            <div key={count} className="rounded-2xl bg-ns-surface p-6 sm:p-8">
              <div className="h-6 w-32 animate-pulse rounded-sm bg-ns-surface-2" />
              <div className="mt-6 space-y-5">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded-sm bg-ns-surface-2" />
                      <div className="h-3.5 w-2/3 rounded-sm bg-ns-surface-2" />
                    </div>
                    <div className="h-7 w-12 rounded-full bg-ns-surface-2" />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          GROUPS.map((group, index) => (
            <section
              key={group.title}
              className={`rounded-2xl bg-ns-surface p-6 sm:p-8 ${index > 0 ? 'ns-reveal' : ''}`}
            >
              <h2 className="font-heading text-xl font-bold text-ns-text">{group.title}</h2>
              <div className="mt-5 divide-y divide-ns-border">
                {group.rows.map(row => (
                  <PrefRow
                    key={row.key}
                    label={row.label}
                    description={row.description}
                    value={prefs[row.key]}
                    onChange={v => update(row.key, v)}
                    saving={saving}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <p className="mt-4 text-sm text-ns-muted">Changes are saved automatically.</p>
    </>
  )
}
