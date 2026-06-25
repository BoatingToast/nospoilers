'use client'

/**
 * SocialListPage — shared client component for Followers / Following / Friends pages.
 *
 * Handles: search, sort, onlyFriends toggle, load-more pagination, empty states.
 * Rendered inside thin server-page wrappers that set <metadata>.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { SearchIcon, FriendsIcon, PersonIcon } from '@/components/icons'
import UserSocialCard, { type SocialUser }     from './UserSocialCard'

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
    <div className="bg-ns-surface border border-ns-border/60 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
      <div className="w-[52px] h-[52px] rounded-full bg-ns-border flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-ns-border rounded w-1/3" />
        <div className="h-2.5 bg-ns-border/60 rounded w-1/4" />
        <div className="h-5 bg-ns-border/40 rounded-full w-24 mt-1" />
        <div className="flex gap-2 mt-1">
          <div className="h-4 bg-ns-border/40 rounded-full w-12" />
          <div className="h-4 bg-ns-border/40 rounded-full w-12" />
          <div className="h-4 bg-ns-border/40 rounded-full w-14" />
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className="h-7 w-20 bg-ns-border rounded-xl" />
        <div className="h-3 w-16 bg-ns-border/40 rounded" />
      </div>
    </div>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState({ mode, hasSearch }: { mode: Mode; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <SearchIcon size={32} className="text-ns-muted/20 mb-4" />
        <p className="text-ns-muted/60 font-body text-sm">No results for that search</p>
      </div>
    )
  }

  const configs: Record<Mode, { icon: React.ReactNode; heading: string; sub: string; cta: { label: string; href: string } }> = {
    followers: {
      icon:    <PersonIcon size={28} className="text-ns-muted/25" />,
      heading: 'No one is following you yet',
      sub:     'Share your profile to get your first followers.',
      cta:     { label: 'Find People', href: '/friends/find' },
    },
    following: {
      icon:    <FriendsIcon size={28} className="text-ns-muted/25" />,
      heading: "You're not following anyone yet",
      sub:     'Start following people to build your network.',
      cta:     { label: 'Discover Members', href: '/friends/find' },
    },
    friends: {
      icon:    <FriendsIcon size={28} className="text-ns-muted/25" />,
      heading: 'No movie friends yet',
      sub:     'When you and another user follow each other, you become friends automatically.',
      cta:     { label: 'Find users with similar Movie DNA', href: '/friends/find' },
    },
  }

  const { icon, heading, sub, cta } = configs[mode]

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-ns-border/30 flex items-center justify-center mb-5">
        {icon}
      </div>
      <p className="text-ns-text font-body text-base font-semibold mb-2">{heading}</p>
      <p className="text-ns-muted/60 font-body text-sm mb-6 max-w-xs">{sub}</p>
      <Link
        href={cta.href}
        className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold
                   bg-ns-gold text-black hover:bg-amber-400 transition-colors"
      >
        {cta.label}
      </Link>
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────────────────────

function PageHeader({ mode, total }: { mode: Mode; total: number }) {
  const tabs: { key: Mode; label: string; href: string }[] = [
    { key: 'followers', label: 'Followers', href: '/social/followers' },
    { key: 'following', label: 'Following', href: '/social/following' },
    { key: 'friends',   label: 'Friends',   href: '/social/friends'   },
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 bg-ns-surface border border-ns-border/60 rounded-2xl p-1 w-fit">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={t.href}
            className={`px-4 py-2 rounded-xl text-sm font-body font-semibold transition-all
              ${t.key === mode
                ? 'bg-ns-gold text-black'
                : 'text-ns-muted/70 hover:text-ns-text'
              }`}
          >
            {t.label}
            {t.key === mode && total > 0 && (
              <span className="ml-1.5 text-[10px] font-body opacity-70">{total.toLocaleString()}</span>
            )}
          </Link>
        ))}
      </div>
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
    <div className="flex flex-wrap items-center gap-3 mb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ns-muted/40 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={`Search ${mode === 'friends' ? 'friends' : mode === 'followers' ? 'followers' : 'following'}…`}
          className="w-full pl-9 pr-4 py-2.5 bg-ns-surface border border-ns-border/60
                     rounded-xl text-sm font-body text-ns-text placeholder:text-ns-muted/40
                     focus:outline-none focus:border-ns-gold/40 transition-colors"
        />
      </div>

      {/* Sort */}
      <select
        value={sort}
        onChange={e => onSort(e.target.value as SortKey)}
        className="px-3 py-2.5 bg-ns-surface border border-ns-border/60 rounded-xl
                   text-sm font-body text-ns-muted/80 focus:outline-none focus:border-ns-gold/40
                   transition-colors cursor-pointer"
      >
        {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {/* Only Friends toggle — following page only */}
      {mode === 'following' && (
        <button
          onClick={() => onOnlyFriends(!onlyFriends)}
          className={`px-3 py-2.5 rounded-xl text-xs font-body font-semibold border transition-all
            ${onlyFriends
              ? 'bg-ns-gold/15 text-ns-gold border-ns-gold/40'
              : 'bg-ns-surface text-ns-muted/60 border-ns-border/60 hover:border-ns-gold/30'
            }`}
        >
          <FriendsIcon size={12} className="inline mr-1.5" />
          Only Friends
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SocialListPageProps {
  mode: Mode
}

export default function SocialListPage({ mode }: SocialListPageProps) {
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader mode={mode} total={total} />

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
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState mode={mode} hasSearch={!!debouncedSearch} />
      ) : (
        <>
          <div className="space-y-3">
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
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl text-sm font-body font-semibold
                           bg-ns-surface border border-ns-border/60
                           text-ns-muted/70 hover:text-ns-gold hover:border-ns-gold/40
                           transition-all disabled:opacity-40"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-ns-muted/40 border-t-ns-gold rounded-full animate-spin" />
                    Loading…
                  </span>
                ) : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
