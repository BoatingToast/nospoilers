'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { CloseIcon, SearchIcon } from '@/components/icons'
import FollowButton from '@/components/social/FollowButton'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'

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

// ── User row ──────────────────────────────────────────────────────────────────

function UserCard({ user, index = 0 }: { user: UserResult; index?: number }) {
  const [followerCount, setFollowerCount] = useState(user.followerCount)

  return (
    <div
      className="ns-reveal flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-6"
      style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
    >
      <Avatar src={user.avatarUrl} username={user.username} size="md" href />

      <div className="min-w-0 flex-1 basis-40">
        <Link
          href={`/profile/${user.username}`}
          className="-my-1 block truncate py-1 font-heading text-base font-bold text-ns-text transition-colors hover:text-ns-secondary-readable"
        >
          @{user.username}
        </Link>
        {user.displayName && (
          <p className="truncate text-sm text-ns-muted">{user.displayName}</p>
        )}
        <p className="mt-0.5 truncate text-sm text-ns-subtle">
          {user.personality && <span className="text-ns-muted">{PERSONALITY_LABELS[user.personality] ?? user.personality} · </span>}
          {user.topGenre && <span className="capitalize">{user.topGenre} · </span>}
          <span className="tabular-nums">{followerCount.toLocaleString()}</span> follower{followerCount !== 1 ? 's' : ''}
          {' · '}
          <span className="tabular-nums">{user.followingCount.toLocaleString()}</span> following
        </p>
      </div>

      <div className="w-full pl-16 sm:w-auto sm:flex-shrink-0 sm:pl-0">
        <FollowButton
          username={user.username}
          initialIsFollowing={user.isFollowing}
          initialIsFriend={user.isFriend}
          size="sm"
          onToggle={state => setFollowerCount(state.followerCount)}
        />
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4 sm:px-6">
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-ns-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded-sm bg-ns-surface-2" />
            <div className="h-3.5 w-2/3 rounded-sm bg-ns-surface-2" />
          </div>
          <div className="hidden h-10 w-28 rounded-full bg-ns-surface-2 sm:block" />
        </div>
      ))}
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
    <section className="min-w-0">
      <h2 className="font-display text-2xl text-ns-text sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1 text-base text-ns-muted">{subtitle}</p>}
      <div className="mt-4">
        {loading ? (
          <ListSkeleton />
        ) : users.length === 0 ? (
          <p className="rounded-2xl bg-ns-surface px-6 py-8 text-center text-base text-ns-muted">{emptyText}</p>
        ) : (
          <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
            {users.map((u, index) => <UserCard key={u.id} user={u} index={index} />)}
          </div>
        )}
      </div>
    </section>
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
    <div className="space-y-12">
      <div className="relative max-w-2xl">
        <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ns-muted" />
        <Input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username or display name…"
          aria-label="Search people"
          className="!min-h-14 !bg-ns-surface !pl-12 !pr-14"
          autoFocus
        />
        {searchLoading && (
          <span className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
            <span className="block h-5 w-5 animate-spin rounded-full border-2 border-ns-border-strong border-t-ns-text" />
          </span>
        )}
        {!searchLoading && query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      {/* Search results */}
      {isSearching && (
        <section className="animate-fade-up">
          <h2 className="font-display text-2xl text-ns-text sm:text-3xl">
            Results
            {searchResults.length > 0 && (
              <span className="ml-2 font-body text-base font-medium tabular-nums text-ns-muted">
                {searchResults.length} found
              </span>
            )}
          </h2>
          <div className="mt-4">
            {searchLoading ? (
              <ListSkeleton rows={2} />
            ) : searchResults.length === 0 ? (
              <EmptyState
                title={`No users found for "${query}"`}
                description="Try a different username or display name"
              />
            ) : (
              <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
                {searchResults.map((u, index) => <UserCard key={u.id} user={u} index={index} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Discovery sections (visible when not searching) */}
      {!isSearching && (
        <>
          {suggested.length > 0 && (
            <Section
              title="Suggested for you"
              subtitle="Based on your Movie DNA and taste profile"
              users={suggested}
              loading={false}
              emptyText=""
            />
          )}

          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-8">
            <Section
              title="Recently joined"
              subtitle="New members building their taste profile"
              users={recent}
              loading={sectionsLoading}
              emptyText="No recent members found."
            />

            <Section
              title="Popular members"
              subtitle="Most-followed cinephiles on NoSpoilers"
              users={popular}
              loading={sectionsLoading}
              emptyText="No members found."
            />
          </div>
        </>
      )}
    </div>
  )
}
