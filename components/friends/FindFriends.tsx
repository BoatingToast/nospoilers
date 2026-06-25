'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { SearchIcon } from '@/components/icons'
import FollowButton from '@/components/social/FollowButton'

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserResult {
  id:             string
  username:       string
  displayName:    string | null
  avatarUrl:      string | null
  personality:    string | null
  topGenre:       string | null
  followerCount:  number
  followingCount: number
  isFollowing:    boolean
  isFriend:       boolean
}

const PERSONALITY_LABELS: Record<string, string> = {
  'thinker':         'The Thinker',
  'thriller-seeker': 'Thriller Seeker',
  'explorer':        'The Explorer',
  'story-analyst':   'Story Analyst',
  'entertainer':     'The Entertainer',
  'auteur':          'The Auteur',
  'escapist':        'The Escapist',
}

// ── User Card ─────────────────────────────────────────────────────────────────

function UserCard({ user }: { user: UserResult }) {
  const [followerCount, setFollowerCount] = useState(user.followerCount)

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-4 flex items-start gap-4
                    hover:border-ns-border/70 transition-all">
      {/* Avatar */}
      <Link href={`/profile/${user.username}`} className="flex-shrink-0 mt-0.5">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-ns-border ring-2 ring-transparent hover:ring-ns-gold/30 transition-all">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            : (
              <div className="w-full h-full flex items-center justify-center text-sm font-body font-semibold text-ns-muted bg-ns-bg">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )
          }
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + follow button */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <Link
              href={`/profile/${user.username}`}
              className="text-sm font-body font-semibold text-ns-text hover:text-ns-gold transition-colors"
            >
              @{user.username}
            </Link>
            {user.displayName && (
              <p className="text-xs font-body text-ns-muted/60 truncate leading-tight">{user.displayName}</p>
            )}
          </div>

          <FollowButton
            username={user.username}
            initialIsFollowing={user.isFollowing}
            initialIsFriend={user.isFriend}
            size="sm"
            onToggle={state => setFollowerCount(state.followerCount)}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {user.personality && (
            <span className="text-[11px] font-body text-ns-gold/70 font-medium">
              {PERSONALITY_LABELS[user.personality] ?? user.personality}
            </span>
          )}
          {user.topGenre && (
            <span className="text-[11px] font-body text-ns-muted/50 capitalize">{user.topGenre}</span>
          )}
          <span className="text-[11px] font-body text-ns-muted/50">
            {followerCount.toLocaleString()} follower{followerCount !== 1 ? 's' : ''}
            <span className="mx-1 opacity-40">·</span>
            {user.followingCount.toLocaleString()} following
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-4 flex gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-ns-border flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="flex justify-between">
          <div className="h-3.5 bg-ns-border rounded w-1/4" />
          <div className="h-7 bg-ns-border rounded-lg w-16" />
        </div>
        <div className="h-2.5 bg-ns-border rounded w-1/3" />
        <div className="h-2 bg-ns-border rounded w-1/2" />
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  users,
  loading,
  emptyText,
}: {
  title:     string
  subtitle?: string
  users:     UserResult[]
  loading:   boolean
  emptyText: string
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="font-display text-2xl tracking-wider text-ns-text">{title}</h2>
        {subtitle && <p className="text-xs font-body text-ns-muted mt-0.5">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <p className="text-ns-muted/50 text-sm font-body py-3">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => <UserCard key={u.id} user={u} />)}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FindFriends() {
  // Search state
  const [query,         setQuery]         = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Section state
  const [suggested, setSuggested] = useState<UserResult[]>([])
  const [recent,    setRecent]    = useState<UserResult[]>([])
  const [popular,   setPopular]   = useState<UserResult[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)

  // Fetch helper — hits /api/users/search which handles auth server-side
  const fetchUsers = useCallback(async (params: string): Promise<UserResult[]> => {
    try {
      const res = await fetch(`/api/users/search?${params}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }, [])

  // Load discovery sections
  useEffect(() => {
    setSectionsLoading(true)
    Promise.all([
      fetchUsers('sort=newest&limit=6'),
      fetchUsers('sort=most_followers&limit=6'),
    ])
      .then(([newUsers, popularUsers]) => {
        setRecent(newUsers)
        setPopular(popularUsers)
      })
      .finally(() => setSectionsLoading(false))
  }, [fetchUsers])

  // Load suggested users (DNA-match via compatibility service)
  useEffect(() => {
    fetch('/api/users/similar')
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown[]) => {
        if (!Array.isArray(data)) return
        // The similar-users API returns a different shape — normalise it
        const mapped: UserResult[] = data.map((u: any) => ({
          id:             u.id            ?? '',
          username:       u.username      ?? '',
          displayName:    u.displayName   ?? null,
          avatarUrl:      u.avatarUrl     ?? null,
          personality:    u.personality?.slug ?? (typeof u.personality === 'string' ? u.personality : null),
          topGenre:       u.topGenre      ?? null,
          followerCount:  u.followerCount ?? 0,
          followingCount: u.followingCount ?? 0,
          isFollowing:    u.isFollowing   ?? false,
          isFriend:       u.isFriend      ?? false,
        }))
        setSuggested(mapped)
      })
      .catch(() => {})
  }, [])

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    debounceRef.current = setTimeout(() => {
      fetchUsers(`q=${encodeURIComponent(query.trim())}&limit=20`)
        .then(setSearchResults)
        .finally(() => setSearchLoading(false))
    }, 280)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchUsers])

  const isSearching = query.trim().length >= 2

  return (
    <div className="space-y-10">

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted pointer-events-none">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username or display name…"
          className="w-full pl-11 pr-12 py-3.5 bg-ns-surface border border-ns-border rounded-2xl
                     text-sm font-body text-white placeholder-ns-muted/40
                     focus:outline-none focus:border-ns-gold/50 transition-colors"
          autoFocus
        />
        {searchLoading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="w-4 h-4 border border-ns-muted/40 border-t-ns-gold rounded-full animate-spin block" />
          </span>
        )}
        {!searchLoading && query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ns-muted/50 hover:text-ns-text transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Search results ───────────────────────────────────────────────────── */}
      {isSearching && (
        <div>
          <h2 className="font-display text-2xl tracking-wider text-ns-text mb-3">
            Results
            {searchResults.length > 0 && (
              <span className="text-ns-muted font-body text-sm font-normal ml-2 tracking-normal">
                {searchResults.length} found
              </span>
            )}
          </h2>
          {searchLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-ns-surface border border-ns-border rounded-2xl py-10 text-center">
              <p className="text-ns-muted/60 font-body text-sm">No users found for &quot;{query}&quot;</p>
              <p className="text-ns-muted/40 font-body text-xs mt-1">Try a different username or display name</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map(u => <UserCard key={u.id} user={u} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Discovery sections (visible when not searching) ─────────────────── */}
      {!isSearching && (
        <>
          {suggested.length > 0 && (
            <Section
              title="Suggested for You"
              subtitle="Based on your Movie DNA and taste profile"
              users={suggested}
              loading={false}
              emptyText=""
            />
          )}

          <Section
            title="Recently Joined"
            subtitle="New members building their taste profile"
            users={recent}
            loading={sectionsLoading}
            emptyText="No recent members found."
          />

          <Section
            title="Popular Members"
            subtitle="Most-followed cinephiles on NoSpoilers"
            users={popular}
            loading={sectionsLoading}
            emptyText="No members found."
          />
        </>
      )}
    </div>
  )
}
