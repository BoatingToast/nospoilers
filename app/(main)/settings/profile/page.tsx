'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
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
    <div className="space-y-1.5">
      <label className="block text-xs font-body text-ns-muted tracking-wide uppercase">{label}</label>
      {children}
      {hint && <p className="text-[11px] font-body text-ns-muted/50">{hint}</p>}
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
      className="w-full bg-ns-surface border border-ns-border rounded-xl px-4 py-2.5 text-sm font-body
                 text-ns-text placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-gold/40 transition-colors"
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
        <div className="w-8 h-8 border-2 border-ns-gold/20 border-t-ns-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="pt-2 pb-8 border-b border-ns-border mb-10">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2">Settings</p>
          <h1 className="font-display text-5xl tracking-wider text-ns-text">EDIT PROFILE</h1>
        </div>

        {/* ── Avatar section ───────────────────────────────────────────── */}
        <section className="mb-10">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-5">Profile Photo</p>
          <div className="flex items-center gap-6">
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
                className="px-4 py-2 rounded-xl border border-ns-gold/30 text-ns-gold text-sm font-body
                           hover:border-ns-gold/60 hover:bg-ns-gold/5 transition-all"
              >
                Change Photo
              </button>
              {profile.avatarUrl && (
                <button
                  onClick={async () => {
                    await fetch('/api/profile/avatar', { method: 'DELETE' })
                    await handleAvatarSuccess('')
                  }}
                  className="block mt-2 text-xs font-body text-ns-muted/60 hover:text-red-400 transition-colors"
                >
                  Remove photo
                </button>
              )}
              <p className="text-[11px] font-body text-ns-muted/50 mt-2">
                JPG, PNG or WEBP · Max 5 MB
              </p>
            </div>
          </div>
        </section>

        {/* ── Basic info ───────────────────────────────────────────────── */}
        <section className="mb-10 space-y-5">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Basic Info</p>

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
                className="w-full bg-ns-surface border border-ns-border rounded-xl px-4 py-3 text-sm font-body
                           text-ns-text placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-gold/40
                           transition-colors resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] font-body text-ns-muted/40">
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
        </section>

        {/* ── Film taste ───────────────────────────────────────────────── */}
        <section className="mb-10 space-y-5">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Film Taste</p>

          <Field label="Favorite Genres" hint="Select as many as you like.">
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_GENRES.map(genre => {
                const selected = profile.favoriteGenres.includes(genre)
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body capitalize transition-all border ${
                      selected
                        ? 'bg-ns-gold text-ns-bg border-ns-gold font-medium'
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
              className="w-full bg-ns-surface border border-ns-border rounded-xl px-4 py-2.5 text-sm font-body
                         text-ns-text focus:outline-none focus:border-ns-gold/40 transition-colors"
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
        </section>

        {/* ── Social links ─────────────────────────────────────────────── */}
        <section className="mb-12 space-y-5">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Social Links</p>

          <Field label="Letterboxd">
            <div className="flex items-center gap-2">
              <span className="text-ns-muted/50 text-sm font-body whitespace-nowrap">letterboxd.com/</span>
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
              <span className="text-ns-muted/50 text-sm font-body">x.com/</span>
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
              <span className="text-ns-muted/50 text-sm font-body whitespace-nowrap">instagram.com/</span>
              <TextInput
                value={profile.instagramUrl}
                onChange={v => set('instagramUrl', v)}
                placeholder="username"
                maxLength={80}
              />
            </div>
          </Field>
        </section>

        {/* ── Save bar ─────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-ns-bg/95 backdrop-blur-md border-t border-ns-border px-4 py-4 z-10">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {error && (
              <p className="text-red-400 text-xs font-body flex-1 truncate">{error}</p>
            )}
            {saved && !error && (
              <p className="text-emerald-400 text-xs font-body flex-1">Saved!</p>
            )}
            {!error && !saved && <span className="flex-1" />}

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/profile/${profile.username}`)}
                className="px-4 py-2.5 rounded-xl border border-ns-border text-ns-muted text-sm font-body hover:text-ns-text transition-colors"
              >
                View Profile
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-ns-gold text-ns-bg rounded-xl text-sm font-body font-medium
                           hover:bg-ns-gold/90 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
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
