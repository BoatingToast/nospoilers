'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import MessageItem       from './MessageItem'
import MessageInput      from './MessageInput'
import DiscussionPrompts from './DiscussionPrompts'
import PinnedMessages    from './PinnedMessages'
import RoomStats         from './RoomStats'
import MemberButton      from './MemberButton'
import SpoilerLevelTabs  from './SpoilerLevelTabs'
import { getSupabasePublicClient } from '@/lib/supabase-client'
import type { SZMessageData, SZRoomStats, SpoilerLevel } from '@/types'
import Button from '@/components/ui/Button'
import { CloseIcon, SearchIcon } from '@/components/icons'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterMode = 'live' | 'top' | 'top_today' | 'top_week' | 'top_month' | 'theories'

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null
  const label =
    users.length === 1
      ? `${users[0]} is typing…`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing…`
      : `${users[0]} and ${users.length - 1} others are typing…`

  return (
    <div role="status" className="flex flex-shrink-0 animate-fade-up items-center gap-2 px-4 pb-1 pt-2 sm:px-6">
      <div aria-hidden="true" className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ns-muted motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-ns-muted">{label}</span>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading messages" className="space-y-5 px-4 py-3 sm:px-6">
      {['w-3/4', 'w-1/2', 'w-5/6', 'w-2/5'].map(width => (
        <div key={width} className="flex animate-pulse items-start gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3.5 w-24 rounded-sm bg-ns-surface-2" />
            <div className={`h-3.5 rounded-sm bg-ns-surface-2 ${width}`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  tmdbId:      number
  movieTitle:  string
  moviePoster: string | null
  friendIds:   string[]  // set of user IDs that are friends
}

export default function SpoilerZoneRoom({ tmdbId, movieTitle, moviePoster, friendIds }: Props) {
  const { data: session } = useSession()
  const currentUserId     = (session?.user as { id?: string } | undefined)?.id ?? null

  // ── Message state ──────────────────────────────────────────────────────────
  const [messages,      setMessages]      = useState<SZMessageData[]>([])
  const [pinned,        setPinned]        = useState<SZMessageData[]>([])
  const [hasMore,       setHasMore]       = useState(false)
  const [cursor,        setCursor]        = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [loadingMore,   setLoadingMore]   = useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filter,        setFilter]        = useState<FilterMode>('live')
  const [spoilerLevel,  setSpoilerLevel]  = useState<SpoilerLevel>('safe')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchInput,   setSearchInput]   = useState('')
  const [replyTo,       setReplyTo]       = useState<SZMessageData | null>(null)
  const [editTarget,    setEditTarget]    = useState<SZMessageData | null>(null)
  const [highlightId,   setHighlightId]   = useState<string | null>(null)
  const [typingUsers,   setTypingUsers]   = useState<string[]>([])
  const [stats,         setStats]         = useState<SZRoomStats>({ memberCount: 0, messageCount: 0, onlineCount: 0 })
  const [searchOpen,    setSearchOpen]    = useState(false)
  // The feed query currently on screen. Live refetches keep it visible instead of flashing a loader.
  const [loadedUrl,     setLoadedUrl]     = useState<string | null>(null)

  // ── Membership state ───────────────────────────────────────────────────────
  const [isMember,      setIsMember]      = useState(false)
  const [memberCount,   setMemberCount]   = useState(0)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const feedRef      = useRef<HTMLDivElement>(null)
  const atBottomRef  = useRef(true)
  const channelRef   = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabasePublicClient>>['channel']> | null>(null)
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const buildUrl = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({
      filter: filter === 'live' ? 'newest' : filter,
      level:  spoilerLevel,
      ...(searchQuery && { q: searchQuery }),
      ...extra,
    })
    return `/api/spoiler-zone/${tmdbId}/messages?${p}`
  }, [tmdbId, filter, spoilerLevel, searchQuery])

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const url = buildUrl()
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json() as {
        messages: SZMessageData[]
        pinned:   SZMessageData[]
        nextCursor: string | null
        hasMore: boolean
      }
      setMessages(data.messages.filter(m => !m.isPinned))
      setPinned(data.pinned)
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setLoadedUrl(url)
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/spoiler-zone/${tmdbId}/stats`)
      if (res.ok) setStats(await res.json())
    } catch {}
  }, [tmdbId])

  useEffect(() => {
    fetchMessages()
    fetchStats()
  }, [fetchMessages, fetchStats])

  // ── Membership fetch + PATCH lastSeenAt on mount ──────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/spoiler-zone/${tmdbId}/membership`)
      .then(r => r.json())
      .then((d: { isMember: boolean }) => setIsMember(d.isMember))
      .catch(() => {})
    // Update lastSeenAt so unread counts reset
    fetch(`/api/spoiler-zone/${tmdbId}/membership`, { method: 'PATCH' }).catch(() => {})
  }, [tmdbId, session?.user?.id])

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!atBottomRef.current) return
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleScroll = () => {
    const el = feedRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  // ── Supabase Realtime ──────────────────────────────────────────────────────

  useEffect(() => {
    if (filter !== 'live') return  // only realtime in live mode

    const supabase = getSupabasePublicClient()
    if (!supabase) return  // no supabase env vars — poll-only mode

    const channelName = `sz-${tmdbId}`
    const ch = supabase.channel(channelName)

    ch
      // New message
      .on('broadcast', { event: 'sz_message' }, () => {
        // Refetch so the API applies this viewer's Plot Passport boundary.
        // A sender's realtime payload is intentionally never trusted for personalized unlocking.
        void fetchMessages()
        setStats(s => ({ ...s, messageCount: s.messageCount + 1 }))
      })
      // Edit
      .on('broadcast', { event: 'sz_edit' }, ({ payload }: { payload: { id: string; content: string; editedAt: string } }) => {
        setMessages(prev => prev.map(m =>
          m.id === payload.id ? { ...m, content: payload.content, editedAt: payload.editedAt } : m,
        ))
      })
      // Delete
      .on('broadcast', { event: 'sz_delete' }, ({ payload }: { payload: { id: string } }) => {
        setMessages(prev => prev.map(m =>
          m.id === payload.id ? { ...m, isDeleted: true, content: '' } : m,
        ))
      })
      // React
      .on('broadcast', { event: 'sz_react' }, ({ payload }: { payload: { id: string; reactions: SZMessageData['reactions'] } }) => {
        setMessages(prev => prev.map(m =>
          m.id === payload.id ? { ...m, reactions: payload.reactions } : m,
        ))
      })
      // Vote
      .on('broadcast', { event: 'sz_vote' }, ({ payload }: { payload: { id: string; voteScore: number } }) => {
        setMessages(prev => prev.map(m =>
          m.id === payload.id ? { ...m, voteScore: payload.voteScore } : m,
        ))
      })
      // Typing
      .on('broadcast', { event: 'sz_typing' }, ({ payload }: { payload: { username: string } }) => {
        const u = payload.username
        if (!u || u === session?.user?.name) return
        setTypingUsers(prev => prev.includes(u) ? prev : [...prev, u])
        if (typingTimers.current[u]) clearTimeout(typingTimers.current[u])
        typingTimers.current[u] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(x => x !== u))
          delete typingTimers.current[u]
        }, 3000)
      })
      // Presence for online count
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState()
        setStats(s => ({ ...s, onlineCount: Object.keys(state).length }))
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && session?.user?.name) {
          await ch.track({ username: session.user.name })
        }
      })

    channelRef.current = ch
    return () => {
      void supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [tmdbId, filter, session?.user?.name, fetchMessages])

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !session?.user?.name) return
    void channelRef.current.send({
      type: 'broadcast', event: 'sz_typing',
      payload: { username: session.user.name },
    })
  }, [session?.user?.name])

  // ── Message actions ────────────────────────────────────────────────────────

  const handleSend = async (content: string, parentId?: string, isTheory?: boolean) => {
    const res = await fetch(`/api/spoiler-zone/${tmdbId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parentId, isTheory: isTheory ?? false, movieTitle, spoilerLevel }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send' }))
      throw new Error(err.error ?? 'Failed to send')
    }
    const { message }: { message: SZMessageData } = await res.json()

    // Append locally — the Realtime broadcast listener deduplicates by id so
    // if Supabase is connected and echoes the broadcast back to us, it won't
    // create a duplicate (the dedup check in the broadcast handler covers it).
    setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
    atBottomRef.current = true
    setStats(s => ({ ...s, messageCount: s.messageCount + 1 }))

    // Broadcast to other clients (not echoed back to self by default in Supabase Broadcast)
    void channelRef.current?.send({
      type: 'broadcast', event: 'sz_message', payload: { message },
    })
  }

  const handleEdit = async (messageId: string, content: string) => {
    const res = await fetch(
      `/api/spoiler-zone/${tmdbId}/messages/${messageId}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) },
    )
    if (!res.ok) throw new Error('Failed to edit')
    const { message }: { message: SZMessageData } = await res.json()
    setMessages(prev => prev.map(m => m.id === messageId ? message : m))
    channelRef.current?.send({
      type: 'broadcast', event: 'sz_edit',
      payload: { id: messageId, content: message.content, editedAt: message.editedAt ?? '' },
    })
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message?')) return
    await fetch(`/api/spoiler-zone/${tmdbId}/messages/${messageId}`, { method: 'DELETE' })
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: '' } : m))
    channelRef.current?.send({
      type: 'broadcast', event: 'sz_delete', payload: { id: messageId },
    })
  }

  const handleReact = async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/spoiler-zone/${tmdbId}/messages/${messageId}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
    })
    if (!res.ok) return
    const { reactions } = await res.json()
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
    channelRef.current?.send({
      type: 'broadcast', event: 'sz_react', payload: { id: messageId, reactions },
    })
  }

  const handleVote = async (messageId: string, type: 'upvote' | 'downvote') => {
    const res = await fetch(`/api/spoiler-zone/${tmdbId}/messages/${messageId}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }),
    })
    if (!res.ok) return
    const { voteScore, userVote } = await res.json()
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, voteScore, userVote } : m))
    channelRef.current?.send({
      type: 'broadcast', event: 'sz_vote', payload: { id: messageId, voteScore },
    })
  }

  // ── Load more (non-live filters) ───────────────────────────────────────────

  const loadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl({ cursor }))
      if (!res.ok) return
      const data = await res.json() as {
        messages:   SZMessageData[]
        pinned:     SZMessageData[]
        nextCursor: string | null
        hasMore:    boolean
      }
      // Prepend older messages (they are ASC, so older = before current list)
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const fresh = data.messages.filter(m => !existingIds.has(m.id))
        return filter === 'live' ? [...fresh, ...prev] : [...prev, ...fresh]
      })
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Jump to pinned message ─────────────────────────────────────────────────

  const jumpTo = (id: string) => {
    setHighlightId(id)
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightId(null), 2500)
  }

  // ── Search submit ──────────────────────────────────────────────────────────

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
    setFilter('live')
  }

  // ── Known usernames for @mention ───────────────────────────────────────────

  const knownUsernames = Array.from(new Set(messages.map(m => m.username)))

  // A conversation starter fills the composer. The nonce lets the same one be picked twice.
  const [promptDraft, setPromptDraft] = useState<{ text: string; nonce: number } | null>(null)

  // ── Render ─────────────────────────────────────────────────────────────────

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: 'live', label: 'Live' },
    { key: 'top', label: 'All time' },
    { key: 'top_week', label: 'This week' },
    { key: 'top_today', label: 'Today' },
    { key: 'theories', label: 'Theories' },
  ]

  const showFeedSkeleton = loading && loadedUrl !== buildUrl()
  const showSearch = searchOpen || !!searchQuery

  const loadMoreButton = (label: string) => (
    <div className="flex justify-center py-2">
      <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>
        {loadingMore ? 'Loading…' : label}
      </Button>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-ns-surface">

      {/* Room header */}
      <div className="flex-shrink-0 space-y-2 px-4 pb-2 pt-3 sm:space-y-3 sm:px-6 sm:pb-3 sm:pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Spoiler Zone</h2>
            <p className="mt-0.5 hidden truncate text-sm text-ns-muted sm:block">{movieTitle}</p>
          </div>
          <div className="order-last w-full sm:order-none sm:w-auto">
            <RoomStats
              memberCount={stats.memberCount}
              messageCount={stats.messageCount}
              onlineCount={stats.onlineCount}
              movieTitle={movieTitle}
            />
          </div>
          <div data-member-button>
            <MemberButton
              tmdbId={tmdbId}
              movieTitle={movieTitle}
              moviePoster={moviePoster}
              initialMemberCount={stats.memberCount}
              onMembershipChange={(joined, count) => {
                setIsMember(joined)
                setMemberCount(count)
                setStats(s => ({ ...s, memberCount: count }))
              }}
            />
          </div>
        </div>

        <SpoilerLevelTabs
          active={spoilerLevel}
          onChange={level => { setSpoilerLevel(level); setCursor(null) }}
        />

        {/* Sort and search */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <div role="group" aria-label="Sort messages" className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide">
            {FILTERS.map(f => {
              const active = filter === f.key && !searchQuery
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setFilter(f.key); setSearchQuery(''); setSearchInput('') }}
                  className={`inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 sm:min-h-10
                    ${active
                      ? 'bg-ns-surface-3 text-ns-text'
                      : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'}`}
                >
                  {f.key === 'live' && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ns-success" />}
                  {f.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            aria-label="Search messages"
            aria-expanded={showSearch}
            onClick={() => setSearchOpen(open => !open)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ns-text transition-colors hover:bg-ns-surface-2 sm:hidden"
          >
            <SearchIcon size={16} />
          </button>

          <form
            onSubmit={handleSearchSubmit}
            className={`${showSearch ? 'flex animate-fade-up' : 'hidden'} w-full items-center gap-1 sm:flex sm:w-56 sm:animate-none`}
          >
            <div className="relative min-w-0 flex-1">
              <SearchIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ns-muted" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search messages…"
                aria-label="Search messages"
                className="min-h-11 w-full rounded-full border border-ns-border-strong bg-ns-bg pl-10 pr-3 text-base text-ns-text transition-colors placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text sm:min-h-10 sm:text-sm"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchInput('') }}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text sm:h-10 sm:w-10"
                aria-label="Clear search"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Pinned messages */}
      <PinnedMessages pinned={pinned} onJump={jumpTo} />

      {/* Message feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        aria-label="Spoiler Zone messages"
        className="min-h-0 flex-1 overflow-y-auto border-t border-ns-border py-2"
      >
        {/* Conversation starters scroll away with the feed so messages keep the room. */}
        {session && isMember && (
          <div className="px-4 pb-2 pt-1 sm:px-6">
            <DiscussionPrompts
              movieTitle={movieTitle}
              onPrompt={text => setPromptDraft({ text, nonce: Date.now() })}
            />
          </div>
        )}

        {/* Live mode prepends older messages, so its control sits at the top. */}
        {hasMore && filter === 'live' && !showFeedSkeleton && loadMoreButton('Load earlier messages')}

        {showFeedSkeleton ? (
          <FeedSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex animate-fade-up items-center justify-center px-6 py-12 text-center">
            <p className="max-w-xs font-heading text-lg font-bold text-ns-text">
              {searchQuery ? 'No messages found.' : 'Be the first to spark discussion!'}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUser={currentUserId}
              isFriend={friendIds.includes(msg.userId)}
              isHighlighted={highlightId === msg.id}
              onReply={setReplyTo}
              onEdit={setEditTarget}
              onDelete={handleDelete}
              onReact={handleReact}
              onVote={handleVote}
            />
          ))
        )}

        {/* Ranked filters append, so their control sits at the end. */}
        {hasMore && filter !== 'live' && !showFeedSkeleton && loadMoreButton('Load more')}
      </div>

      {/* Typing indicator */}
      <TypingIndicator users={typingUsers} />

      {/* Input */}
      {session ? (
        <MessageInput
          replyTo={replyTo}
          editTarget={editTarget}
          onSend={handleSend}
          onEdit={handleEdit}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditTarget(null)}
          onTyping={broadcastTyping}
          knownUsernames={knownUsernames}
          draft={promptDraft}
          isMember={isMember}
          onJoinClick={() => {
            // The header's MemberButton owns the join request.
            document.querySelector<HTMLButtonElement>('[data-member-button] button')?.click()
          }}
        />
      ) : (
        <p className="flex-shrink-0 border-t border-ns-border px-4 py-4 text-center text-sm text-ns-muted">
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/movie/${tmdbId}`)}`} className="font-semibold text-ns-secondary-readable underline underline-offset-2 transition-colors hover:text-ns-text">Sign in</Link>
          {' '}to join the discussion
        </p>
      )}
    </div>
  )
}
