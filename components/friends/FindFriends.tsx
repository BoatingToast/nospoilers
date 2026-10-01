'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { SearchIcon } from '@/components/icons'
import FollowButton from '@/components/social/FollowButton'
import Avatar from '@/components/ui/Avatar'
import Section from '@/components/ui/Section'

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

  const meta = [
    user.personality ? (PERSONALITY_LABELS[user.personality] ?? user.personality) : null,
    user.topGenre,
  ].filter(Boolean)

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 border-t border-ns-border py-4">
      {/* Avatar */}
      <Avatar
        src={user.avatarUrl}
        username={user.username}
        size="md"
        href
        className="flex-shrink-0"
      />

      {/* Info */}
      <div className="min-w-0 flex-1 basis-40">
        <Link
          href={`/profile/${user.username}`}
          className="font-body text-sm font-semibold text-ns-text underline-offset-4 [overflow-wrap:anywhere] hover:underline"
        >
          @{user.username}
        </Link>
        {user.displayName && (
          <p className="truncate font-body text-xs leading-tight text-ns-muted">{user.displayName}</p>
        )}

        {/* Meta row */}
        {meta.length > 0 && (
          <p className="mt-1 font-body text-xs capitalize text-ns-muted">{meta.join(' · ')}</p>
        )}
        <p className="mt-0.5 font-body text-xs text-ns-muted">
          {followerCount.toLocaleString()} follower{followerCount !== 1 ? 's' : ''}
          <span className="mx-1">·</span>
          {user.followingCount.toLocaleString()} following
        </p>
      </div>

      <FollowButton
        username={user.username}
        initialIsFollowing={user.isFollowing}
        initialIsFriend={user.isFriend}
        size="sm"
        onToggle={state => setFollowerCount(state.followerCount)}
      />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 border-t border-ns-border py-4">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-ns-border" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/4 rounded bg-ns-border" />
        <div className="h-2.5 w-1/3 rounded bg-ns-border" />
        <div className="h-2 w-1/2 rounded bg-ns-border" />
      </div>
      <div className="h-8 w-16 rounded bg-ns-border" />
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function PeopleSection({
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
    <Section title={title} note={subtitle}>
      {loading ? (
        <div className="border-b border-ns-border">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <p className="border-t border-ns-border py-4 font-body text-sm text-ns-muted">{emptyText}</p>
      ) : (
        <div className="border-b border-ns-border">
          {users.map(u => <UserCard key={u.id} user={u} />)}
        </div>
      )}
    </Section>
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
    <div className="min-w-0 space-y-10">

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="relative max-w-2xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username or display name…"
          className="w-full rounded border border-ns-border bg-ns-surface py-3.5 pl-11 pr-12
                     font-body text-sm text-ns-text placeholder:text-ns-muted/60
                     transition-colors focus:border-ns-text focus:outline-none"
          autoFocus
        />
        {searchLoading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="block h-4 w-4 animate-spin rounded-full border border-ns-muted/40 border-t-ns-secondary" />
          </span>
        )}
        {!searchLoading && query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-lg leading-none text-ns-muted transition-colors hover:text-ns-text"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Search results ───────────────────────────────────────────────────── */}
      {isSearching && (
        <Section
          title="Results"
          action={searchResults.length > 0 ? (
            <span className="font-body text-sm text-ns-muted">{searchResults.length} found</span>
          ) : undefined}
        >
          {searchLoading ? (
            <div className="border-b border-ns-border">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="border-t border-ns-border py-6">
              <p className="font-body text-sm text-ns-text [overflow-wrap:anywhere]">No users found for &quot;{query}&quot;</p>
              <p className="mt-1 font-body text-xs text-ns-muted">Try a different username or display name</p>
            </div>
          ) : (
            <div className="border-b border-ns-border">
              {searchResults.map(u => <UserCard key={u.id} user={u} />)}
            </div>
          )}
        </Section>
      )}

      {/* ── Discovery sections (visible when not searching) ─────────────────── */}
      {!isSearching && (
        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-10">
            {suggested.length > 0 && (
              <PeopleSection
                title="Suggested for You"
                subtitle="Based on your Movie DNA and taste profile"
                users={suggested}
                loading={false}
                emptyText=""
              />
            )}

            <PeopleSection
              title="Recently Joined"
              subtitle="New members building their taste profile"
              users={recent}
              loading={sectionsLoading}
              emptyText="No recent members found."
            />
          </div>

          <PeopleSection
            title="Popular Members"
            subtitle="Most-followed cinephiles on NoSpoilers"
            users={popular}
            loading={sectionsLoading}
            emptyText="No members found."
          />
        </div>
      )}
    </div>
  )
}
