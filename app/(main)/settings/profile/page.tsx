'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import AvatarUploadModal from '@/components/profile/AvatarUploadModal'

// ── Genre list ────────────────────────────────────────────────────────────────

const ALL_GENRES = [
  'drama', 'thriller', 'crime', 'sci-fi', 'horror',
  'comedy', 'action', 'romance', 'mystery', 'documentary',
  'animation', 'fantasy', 'biography', 'western', 'musical',
]

const DECADES = [
  '1930s', '1940s', '1950s', '1960s', '1970s',
  '1980s', '1990s', '2000s', '2010s', '2020s',
]

// ── Field component helpers ───────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 border-b border-ns-border py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
      <div className="min-w-0">
        <label className="block text-sm font-body font-medium text-ns-text">{label}</label>
        {hint && <p className="mt-1 text-xs font-body text-ns-muted">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full min-w-0 bg-ns-surface border border-ns-border rounded px-4 py-2.5 text-sm font-body
                 text-ns-text placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-secondary/40 transition-colors"
    />
  )
}

// ── Profile form data ─────────────────────────────────────────────────────────

interface ProfileData {
  username:        string
  avatarUrl:       string | null
  displayName:     string
  bio:             string
  location:        string
  favoriteDecade:  string
  favoriteDirector: string
  favoriteActor:   string
  twitterUrl:      string
  letterboxdUrl:   string
  instagramUrl:    string
  favoriteGenres:  string[]
}

const EMPTY: ProfileData = {
  username:         '',
  avatarUrl:        null,
  displayName:      '',
  bio:              '',
  location:         '',
  favoriteDecade:   '',
  favoriteDirector: '',
  favoriteActor:    '',
  twitterUrl:       '',
  letterboxdUrl:    '',
  instagramUrl:     '',
  favoriteGenres:   [],
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()

  const [profile,      setProfile]      = useState<ProfileData>(EMPTY)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')
  const [showCropModal, setShowCropModal] = useState(false)

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Load current profile
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile/me')
      .then(r => r.json())
      .then(data => {
        setProfile({
          username:         data.username        ?? '',
          avatarUrl:        data.avatarUrl       ?? null,
          displayName:      data.displayName     ?? '',
          bio:              data.bio             ?? '',
          location:         data.location        ?? '',
          favoriteDecade:   data.favoriteDecade  ?? '',
          favoriteDirector: data.favoriteDirector ?? '',
          favoriteActor:    data.favoriteActor   ?? '',
          twitterUrl:       data.twitterUrl      ?? '',
          letterboxdUrl:    data.letterboxdUrl   ?? '',
          instagramUrl:     data.instagramUrl    ?? '',
          favoriteGenres:   data.favoriteGenres  ?? [],
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  function set(field: keyof ProfileData, value: string | string[] | null) {
    setProfile(p => ({ ...p, [field]: value ?? '' }))
    setSaved(false)
  }

  function toggleGenre(genre: string) {
    setProfile(p => ({
      ...p,
      favoriteGenres: p.favoriteGenres.includes(genre)
        ? p.favoriteGenres.filter(g => g !== genre)
        : [...p.favoriteGenres, genre],
    }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile/me', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          displayName:      profile.displayName     || null,
          bio:              profile.bio             || null,
          location:         profile.location        || null,
          favoriteDecade:   profile.favoriteDecade  || null,
          favoriteDirector: profile.favoriteDirector || null,
          favoriteActor:    profile.favoriteActor   || null,
          twitterUrl:       profile.twitterUrl      || null,
          letterboxdUrl:    profile.letterboxdUrl   || null,
          instagramUrl:     profile.instagramUrl    || null,
          favoriteGenres:   profile.favoriteGenres,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // After avatar change — update local state and refresh session
  async function handleAvatarSuccess(url: string) {
    setShowCropModal(false)
    setProfile(p => ({ ...p, avatarUrl: url || null }))
    // Refresh NextAuth session so navbar picks up the new avatar
    await updateSession({ avatarUrl: url || null })
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ns-secondary/20 border-t-ns-secondary rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">

        <PageHeader
          title="EDIT PROFILE"
          lede="Settings for how you appear to other film lovers, and the taste details shown on your profile."
        />

        <div className="mt-10 grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

        {/* ── Avatar section ───────────────────────────────────────────── */}
        <Section title="Profile Photo" className="lg:order-2 lg:self-start">
          <div className="flex flex-wrap items-center gap-6">
            <Avatar
              src={profile.avatarUrl}
              username={profile.username}
              size="xl"
              editable
              onEditClick={() => setShowCropModal(true)}
            />
            <div>
              <button
                onClick={() => setShowCropModal(true)}
                className="min-h-10 rounded border border-ns-text/70 px-4 py-2 font-heading text-sm font-semibold text-ns-text
                           transition-colors hover:bg-ns-text hover:text-ns-bg"
              >
                Change Photo
              </button>
              {profile.avatarUrl && (
                <button
                  onClick={async () => {
                    setError('')
                    try {
                      const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
                      if (!res.ok) {
                        const data = await res.json().catch(() => null) as { error?: string } | null
                        throw new Error(data?.error ?? 'Failed to remove photo')
                      }
                      await handleAvatarSuccess('')
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to remove photo')
                    }
                  }}
                  className="mt-2 block min-h-10 text-xs font-body text-ns-muted underline underline-offset-4 transition-colors hover:text-red-400"
                >
                  Remove photo
                </button>
              )}
              <p className="text-xs font-body text-ns-muted">
                JPG, PNG or WEBP · Max 5 MB
              </p>
            </div>
          </div>
        </Section>

        <div className="min-w-0 space-y-12 lg:order-1">

        {/* ── Basic info ───────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <div className="border-t border-ns-border">

          <Field label="Username" hint="Your username cannot be changed.">
            <TextInput
              value={profile.username}
              onChange={() => {}}
              placeholder="username"
            />
          </Field>

          <Field label="Display Name" hint="Shown on your profile alongside your username.">
            <TextInput
              value={profile.displayName}
              onChange={v => set('displayName', v)}
              placeholder="Your name"
              maxLength={60}
            />
          </Field>

          <Field label="Bio">
            <div className="relative">
              <textarea
                value={profile.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Tell other film lovers about yourself…"
                maxLength={500}
                rows={3}
                className="w-full bg-ns-surface border border-ns-border rounded px-4 py-3 text-sm font-body
                           text-ns-text placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-secondary/40
                           transition-colors resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[11px] font-body text-ns-muted">
                {profile.bio.length}/500
              </span>
            </div>
          </Field>

          <Field label="Location">
            <TextInput
              value={profile.location}
              onChange={v => set('location', v)}
              placeholder="City, Country"
              maxLength={80}
            />
          </Field>
          </div>
        </Section>

        {/* ── Film taste ───────────────────────────────────────────────── */}
        <Section title="Film Taste">
          <div className="border-t border-ns-border">

          <Field label="Favorite Genres" hint="Select as many as you like.">
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map(genre => {
                const selected = profile.favoriteGenres.includes(genre)
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`min-h-10 rounded px-3 py-1.5 text-xs font-body capitalize transition-colors border ${
                      selected
                        ? 'bg-ns-secondary text-ns-secondary-foreground border-ns-secondary font-medium'
                        : 'border-ns-border text-ns-muted hover:border-ns-muted/40'
                    }`}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Favorite Decade">
            <select
              value={profile.favoriteDecade}
              onChange={e => set('favoriteDecade', e.target.value)}
              className="w-full bg-ns-surface border border-ns-border rounded px-4 py-2.5 text-sm font-body
                         text-ns-text focus:outline-none focus:border-ns-secondary/40 transition-colors"
            >
              <option value="">— Select a decade —</option>
              {DECADES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Favorite Director">
            <TextInput
              value={profile.favoriteDirector}
              onChange={v => set('favoriteDirector', v)}
              placeholder="e.g. Stanley Kubrick"
              maxLength={80}
            />
          </Field>

          <Field label="Favorite Actor">
            <TextInput
              value={profile.favoriteActor}
              onChange={v => set('favoriteActor', v)}
              placeholder="e.g. Cate Blanchett"
              maxLength={80}
            />
          </Field>
          </div>
        </Section>

        {/* ── Social links ─────────────────────────────────────────────── */}
        <Section title="Social Links">
          <div className="border-t border-ns-border">

          <Field label="Letterboxd">
            <div className="flex items-center gap-2">
              <span className="text-ns-muted text-sm font-body whitespace-nowrap">letterboxd.com/</span>
              <TextInput
                value={profile.letterboxdUrl}
                onChange={v => set('letterboxdUrl', v)}
                placeholder="username"
                maxLength={80}
              />
            </div>
          </Field>

          <Field label="X / Twitter">
            <div className="flex items-center gap-2">
              <span className="text-ns-muted text-sm font-body">x.com/</span>
              <TextInput
                value={profile.twitterUrl}
                onChange={v => set('twitterUrl', v)}
                placeholder="username"
                maxLength={80}
              />
            </div>
          </Field>

          <Field label="Instagram">
            <div className="flex items-center gap-2">
              <span className="text-ns-muted text-sm font-body whitespace-nowrap">instagram.com/</span>
              <TextInput
                value={profile.instagramUrl}
                onChange={v => set('instagramUrl', v)}
                placeholder="username"
                maxLength={80}
              />
            </div>
          </Field>
          </div>
        </Section>

        </div>
        </div>

        {/* ── Save bar ─────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t-2 border-ns-text bg-ns-bg px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {error && (
              <p className="text-red-400 text-xs font-body flex-1 truncate">{error}</p>
            )}
            {saved && !error && (
              <p className="text-emerald-400 text-xs font-body flex-1">Saved!</p>
            )}
            {!error && !saved && <span className="flex-1" />}

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push(`/profile/${profile.username}`)}>
                View Profile
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Avatar upload modal */}
      {showCropModal && (
        <AvatarUploadModal
          currentAvatarUrl={profile.avatarUrl}
          onClose={() => setShowCropModal(false)}
          onSuccess={handleAvatarSuccess}
        />
      )}
    </div>
  )
}
