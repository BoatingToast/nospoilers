'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import AvatarUploadModal from '@/components/profile/AvatarUploadModal'
import { Field, SelectControl, SettingsSection, controlClass } from '@/components/settings/FormControls'

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

// ── Field helpers ─────────────────────────────────────────────────────────────

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div>
      <Input
        id={id}
        label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-sm text-ns-muted">{hint}</p>}
    </div>
  )
}

function HandleField({
  id,
  label,
  prefix,
  value,
  onChange,
}: {
  id: string
  label: string
  prefix: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field id={id} label={label}>
      <div className="flex min-h-12 items-center rounded-xl border border-ns-border-strong bg-ns-bg transition-colors duration-150 focus-within:border-ns-text focus-within:ring-1 focus-within:ring-ns-text">
        <span aria-hidden="true" className="flex-shrink-0 whitespace-nowrap pl-4 text-base text-ns-muted">{prefix}</span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="username"
          maxLength={80}
          className="min-w-0 flex-1 bg-transparent py-2 pl-0.5 pr-4 text-base text-ns-text placeholder:text-ns-subtle focus:outline-none"
        />
      </div>
    </Field>
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

  async function handleRemovePhoto() {
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
  }

  if (status === 'loading' || loading) {
    return (
      <div aria-busy="true" aria-label="Loading profile">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="mt-8 h-52 rounded-2xl" />
        <Skeleton className="mt-4 h-96 rounded-2xl" />
      </div>
    )
  }

  if (!session) return null

  return (
    <>
      <PageHeader title="Edit profile" />

      <div className="mt-8 space-y-4">
        <SettingsSection title="Profile photo">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Avatar
              src={profile.avatarUrl}
              username={profile.username}
              size="xl"
              editable
              onEditClick={() => setShowCropModal(true)}
            />
            <div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowCropModal(true)}>
                  Change photo
                </Button>
                {profile.avatarUrl && (
                  <Button variant="ghost" onClick={handleRemovePhoto}>
                    Remove photo
                  </Button>
                )}
              </div>
              <p className="mt-3 text-sm text-ns-muted">JPG, PNG or WEBP · Max 5 MB</p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Basic info" reveal={1}>
          <div className="space-y-5">
            <div>
              <Input
                id="profile-username"
                label="Username"
                value={profile.username}
                readOnly
                aria-describedby="profile-username-hint"
                className="cursor-not-allowed !text-ns-muted"
              />
              <p id="profile-username-hint" className="mt-1.5 text-sm text-ns-muted">Your username cannot be changed.</p>
            </div>

            <TextField
              id="profile-display-name"
              label="Display name"
              hint="Shown on your profile alongside your username."
              value={profile.displayName}
              onChange={v => set('displayName', v)}
              placeholder="Your name"
              maxLength={60}
            />

            <Field id="profile-bio" label="Bio">
              <div className="relative">
                <textarea
                  id="profile-bio"
                  value={profile.bio}
                  onChange={e => set('bio', e.target.value)}
                  placeholder="Tell other film lovers about yourself…"
                  maxLength={500}
                  rows={4}
                  className={`${controlClass} block resize-none py-3 pb-8`}
                />
                <span className="pointer-events-none absolute bottom-2.5 right-4 text-xs tabular-nums text-ns-muted">
                  {profile.bio.length}/500
                </span>
              </div>
            </Field>

            <TextField
              id="profile-location"
              label="Location"
              value={profile.location}
              onChange={v => set('location', v)}
              placeholder="City, Country"
              maxLength={80}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Film taste" reveal={1}>
          <div className="space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold text-ns-text">Favorite genres</legend>
              <p className="mt-0.5 text-sm text-ns-muted">Select as many as you like.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_GENRES.map(genre => {
                  const selected = profile.favoriteGenres.includes(genre)
                  return (
                    <button
                      key={genre}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleGenre(genre)}
                      className={`min-h-11 rounded-full px-4 text-sm font-semibold capitalize transition-colors duration-150 sm:min-h-10 ${
                        selected
                          ? 'bg-ns-text text-ns-bg'
                          : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'
                      }`}
                    >
                      {genre}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <Field id="profile-decade" label="Favorite decade">
              <SelectControl
                id="profile-decade"
                value={profile.favoriteDecade}
                onChange={e => set('favoriteDecade', e.target.value)}
              >
                <option value="">Select a decade</option>
                {DECADES.map(d => <option key={d} value={d}>{d}</option>)}
              </SelectControl>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id="profile-director"
                label="Favorite director"
                value={profile.favoriteDirector}
                onChange={v => set('favoriteDirector', v)}
                placeholder="e.g. Stanley Kubrick"
                maxLength={80}
              />
              <TextField
                id="profile-actor"
                label="Favorite actor"
                value={profile.favoriteActor}
                onChange={v => set('favoriteActor', v)}
                placeholder="e.g. Cate Blanchett"
                maxLength={80}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Social links" reveal={1}>
          <div className="space-y-5">
            <HandleField id="profile-letterboxd" label="Letterboxd" prefix="letterboxd.com/" value={profile.letterboxdUrl} onChange={v => set('letterboxdUrl', v)} />
            <HandleField id="profile-twitter" label="X / Twitter" prefix="x.com/" value={profile.twitterUrl} onChange={v => set('twitterUrl', v)} />
            <HandleField id="profile-instagram" label="Instagram" prefix="instagram.com/" value={profile.instagramUrl} onChange={v => set('instagramUrl', v)} />
          </div>
        </SettingsSection>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ns-surface-3 p-3 shadow-2xl sm:pl-5">
        <p aria-live="polite" className="min-w-0 flex-1 basis-40 text-sm font-semibold">
          {error && <span className="block animate-fade-up text-ns-danger">{error}</span>}
          {saved && !error && <span className="block animate-fade-up text-ns-success">Saved!</span>}
        </p>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => router.push(`/profile/${profile.username}`)}>
            View profile
          </Button>
          <Button className="flex-1 whitespace-nowrap sm:flex-none" onClick={handleSave} loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
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
    </>
  )
}
