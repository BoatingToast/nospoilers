'use client'

/**
 * SocialListPage — shared client component for Followers / Following / Friends pages.
 *
 * Handles: search, sort, onlyFriends toggle, load-more pagination, empty states.
 * Rendered inside thin server-page wrappers that set <metadata>.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchIcon, FriendsIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import SharedEmptyState from '@/components/ui/EmptyState'
import { SelectControl } from '@/components/settings/FormControls'
import UserSocialCard, { type SocialUser }     from './UserSocialCard'
import SocialHubNav from './SocialHubNav'

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'followers' | 'following' | 'friends'
type SortKey = 'newest' | 'oldest' | 'alpha' | 'match'

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  alpha:  'A–Z',
  match:  'Taste match',
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-4 py-4 sm:px-6">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-ns-surface-2" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded-sm bg-ns-surface-2" />
        <div className="h-3.5 w-1/2 rounded-sm bg-ns-surface-2" />
      </div>
      <div className="hidden h-10 w-28 rounded-full bg-ns-surface-2 sm:block" />
    </div>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState({ mode, hasSearch }: { mode: Mode; hasSearch: boolean }) {
  if (hasSearch) {
    return <SharedEmptyState className="animate-fade-up" title="No results for that search" />
  }

  const configs: Record<Mode, { heading: string; sub: string; cta: { label: string; href: string } }> = {
    followers: {
      heading: 'No one is following you yet',
      sub:     'Share your profile to get your first followers.',
      cta:     { label: 'Find people', href: '/friends/find' },
    },
    following: {
      heading: "You're not following anyone yet",
      sub:     'Start following people to build your network.',
      cta:     { label: 'Discover members', href: '/friends/find' },
    },
    friends: {
      heading: 'No movie friends yet',
      sub:     'Accepted friend requests and movie connections will show up here.',
      cta:     { label: 'Find users with similar Movie DNA', href: '/friends/find' },
    },
  }

  const { heading, sub, cta } = configs[mode]

  return (
    <SharedEmptyState
      className="animate-fade-up"
      title={heading}
      description={sub}
      action={<Button variant="outline" href={cta.href}>{cta.label}</Button>}
    />
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
  const noun = mode === 'friends' ? 'friends' : mode === 'followers' ? 'followers' : 'following'

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <SearchIcon size={16} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ns-muted" />
        <Input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={`Search ${noun}…`}
          aria-label={`Search ${noun}`}
          className="!bg-ns-surface pl-11"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
          <SelectControl
            aria-label="Sort by"
            value={sort}
            onChange={e => onSort(e.target.value as SortKey)}
            className="!bg-ns-surface"
          >
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </SelectControl>
        </div>

        {/* Only Friends toggle — following page only */}
        {mode === 'following' && (
          <button
            type="button"
            aria-pressed={onlyFriends}
            onClick={() => onOnlyFriends(!onlyFriends)}
            className={`inline-flex min-h-12 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-150
              ${onlyFriends
                ? 'bg-ns-text text-ns-bg'
                : 'bg-ns-surface text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
              }`}
          >
            <FriendsIcon size={14} />
            Only friends
          </button>
        )}
      </div>
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
    <div className={embedded ? '' : 'mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16'}>
      {showNavigation && <div className="mb-6"><SocialHubNav active={mode} /></div>}

      <Toolbar
        mode={mode}
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        onlyFriends={onlyFriends}
        onOnlyFriends={setOnlyFriends}
      />

      <p aria-live="polite" className="mb-3 text-sm text-ns-muted">
        {loading ? 'Loading connections…' : (
          <span key={total} className="inline-block animate-fade-up tabular-nums">
            {total.toLocaleString()} {countLabel}
          </span>
        )}
      </p>

      {/* List */}
      {loading ? (
        <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
          {[1, 2, 3, 4, 5].map(i => <RowSkeleton key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState mode={mode} hasSearch={!!debouncedSearch} />
      ) : (
        <>
          <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
            {users.map((u, index) => (
              <div key={u.id} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
                <UserSocialCard
                  user={u}
                  showFriendBadge={mode !== 'friends'}
                />
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
