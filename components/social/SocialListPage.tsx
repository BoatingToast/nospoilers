'use client'

/**
 * SocialListPage — shared client component for Followers / Following / Friends pages.
 *
 * Handles: search, sort, onlyFriends toggle, load-more pagination, empty states.
 * Rendered inside thin server-page wrappers that set <metadata>.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { SearchIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import UserSocialCard, { type SocialUser }     from './UserSocialCard'
import SocialHubNav from './SocialHubNav'

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'followers' | 'following' | 'friends'
type SortKey = 'newest' | 'oldest' | 'alpha' | 'match'

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  alpha:  'A–Z',
  match:  'Taste Match',
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 border-t border-ns-border py-4">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-ns-border" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/3 rounded bg-ns-border" />
        <div className="h-2.5 w-1/4 rounded bg-ns-border/60" />
        <div className="h-2.5 w-1/2 rounded bg-ns-border/40" />
      </div>
      <div className="h-8 w-20 rounded bg-ns-border" />
    </div>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState({ mode, hasSearch }: { mode: Mode; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="border-t border-ns-border py-8">
        <p className="font-body text-sm text-ns-muted">No results for that search</p>
      </div>
    )
  }

  const configs: Record<Mode, { heading: string; sub: string; cta: { label: string; href: string } }> = {
    followers: {
      heading: 'No one is following you yet',
      sub:     'Share your profile to get your first followers.',
      cta:     { label: 'Find People', href: '/friends/find' },
    },
    following: {
      heading: "You're not following anyone yet",
      sub:     'Start following people to build your network.',
      cta:     { label: 'Discover Members', href: '/friends/find' },
    },
    friends: {
      heading: 'No movie friends yet',
      sub:     'Accepted friend requests and movie connections will show up here.',
      cta:     { label: 'Find users with similar Movie DNA', href: '/friends/find' },
    },
  }

  const { heading, sub, cta } = configs[mode]

  return (
    <div className="border-t border-ns-border py-8">
      <p className="font-body text-base font-semibold text-ns-text">{heading}</p>
      <p className="mt-1 max-w-md font-body text-sm text-ns-muted">{sub}</p>
      <Button variant="secondary" href={cta.href} className="mt-5 w-full sm:w-auto">
        {cta.label}
      </Button>
    </div>
  )
}

// ── Toolbar (search + sort + filters) ────────────────────────────────────────

function Toolbar({
  mode,
  search,
  onSearch,
  sort,
  onSort,
  onlyFriends,
  onOnlyFriends,
}: {
  mode:         Mode
  search:       string
  onSearch:     (v: string) => void
  sort:         SortKey
  onSort:       (v: SortKey) => void
  onlyFriends:  boolean
  onOnlyFriends:(v: boolean) => void
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-0 flex-1 basis-full sm:basis-0 sm:min-w-[200px]">
        <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ns-muted" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={`Search ${mode === 'friends' ? 'friends' : mode === 'followers' ? 'followers' : 'following'}…`}
          className="min-h-[40px] w-full rounded border border-ns-border bg-ns-surface py-2.5 pl-9 pr-4
                     font-body text-sm text-ns-text placeholder:text-ns-muted/60
                     transition-colors focus:border-ns-text focus:outline-none"
        />
      </div>

      {/* Sort */}
      <select
        value={sort}
        onChange={e => onSort(e.target.value as SortKey)}
        className="min-h-[40px] cursor-pointer rounded border border-ns-border bg-ns-surface px-3 py-2.5
                   font-body text-sm text-ns-text transition-colors focus:border-ns-text focus:outline-none"
      >
        {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {/* Only Friends toggle — following page only */}
      {mode === 'following' && (
        <button
          onClick={() => onOnlyFriends(!onlyFriends)}
          className={`min-h-[40px] rounded border px-3 py-2.5 font-heading text-sm font-semibold transition-colors
            ${onlyFriends
              ? 'border-ns-text bg-ns-text text-ns-bg'
              : 'border-ns-border text-ns-muted hover:border-ns-text hover:text-ns-text'
            }`}
        >
          Only Friends
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SocialListPageProps {
  mode: Mode
  embedded?: boolean
  showNavigation?: boolean
}

export default function SocialListPage({
  mode,
  embedded = false,
  showNavigation = true,
}: SocialListPageProps) {
  const [users,       setUsers]       = useState<SocialUser[]>([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(false)
  const [nextCursor,  setNextCursor]  = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [sort,        setSort]        = useState<SortKey>(mode === 'friends' ? 'match' : 'newest')
  const [onlyFriends, setOnlyFriends] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 220)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search])

  const endpoint = mode === 'followers' ? '/api/followers'
    : mode === 'following'              ? '/api/following'
    :                                    '/api/friends'

  const responseKey = mode === 'followers' ? 'followers'
    : mode === 'following'                 ? 'following'
    :                                       'friends'

  const buildUrl = useCallback((cursor?: string | null) => {
    const p = new URLSearchParams()
    p.set('sort', sort)
    if (debouncedSearch) p.set('search', debouncedSearch)
    if (mode === 'following' && onlyFriends) p.set('onlyFriends', 'true')
    if (cursor) p.set('cursor', cursor)
    return `${endpoint}?${p.toString()}`
  }, [endpoint, mode, sort, debouncedSearch, onlyFriends])

  // Initial / re-fetch when filters change
  useEffect(() => {
    setLoading(true)
    setUsers([])
    setNextCursor(null)
    fetch(buildUrl())
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setUsers(d[responseKey] ?? [])
        setTotal(d.total ?? 0)
        setHasMore(d.hasMore ?? false)
        setNextCursor(d.nextCursor ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [buildUrl, responseKey])

  const loadMore = () => {
    if (!hasMore || !nextCursor || loadingMore) return
    setLoadingMore(true)
    fetch(buildUrl(nextCursor))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setUsers(prev => [...prev, ...(d[responseKey] ?? [])])
        setHasMore(d.hasMore ?? false)
        setNextCursor(d.nextCursor ?? null)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }

  const countLabel = mode === 'friends'
    ? `friend${total === 1 ? '' : 's'}`
    : mode === 'followers'
      ? `follower${total === 1 ? '' : 's'}`
      : 'following'

  return (
    <div className={embedded ? 'min-w-0' : 'mx-auto w-full max-w-6xl px-4 py-8 sm:px-6'}>
      {showNavigation && <SocialHubNav active={mode} />}

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-body text-sm text-ns-muted">
          {loading ? 'Loading connections…' : `${total.toLocaleString()} ${countLabel}`}
        </p>
        <Link href="/friends/find" className="font-heading text-sm text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text">
          Find people →
        </Link>
      </div>

      <Toolbar
        mode={mode}
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        onlyFriends={onlyFriends}
        onOnlyFriends={setOnlyFriends}
      />

      {/* List */}
      {loading ? (
        <div className="border-b border-ns-border">
          {[1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState mode={mode} hasSearch={!!debouncedSearch} />
      ) : (
        <>
          <div className="border-b border-ns-border">
            {users.map(u => (
              <UserSocialCard
                key={u.id}
                user={u}
                showFriendBadge={mode !== 'friends'}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="w-full sm:w-auto">
                {loadingMore ? 'Loading…' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
