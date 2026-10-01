'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import {
  PulseIcon, TimelineIcon, CalendarWeekIcon, TodayIcon,
  TheoryIcon, CloseIcon, SearchIcon,
  type IconProps,
} from '@/components/icons'

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
    <p className="flex-shrink-0 py-1.5 font-body text-xs italic text-ns-muted" aria-live="polite">{label}</p>
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
      const res = await fetch(buildUrl())
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const FILTERS: { key: FilterMode; label: string; Icon: React.ComponentType<IconProps> }[] = [
    { key: 'live',      label: 'Live',      Icon: PulseIcon        },
    { key: 'top',       label: 'All Time',  Icon: TimelineIcon     },
    { key: 'top_week',  label: 'This Week', Icon: CalendarWeekIcon },
    { key: 'top_today', label: 'Today',     Icon: TodayIcon        },
    { key: 'theories',  label: 'Theories',  Icon: TheoryIcon       },
  ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">

      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-ns-border pb-3">

        {/* Stats + member button row */}
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <RoomStats
            memberCount={stats.memberCount}
            messageCount={stats.messageCount}
            onlineCount={stats.onlineCount}
            movieTitle={movieTitle}
          />
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

        {/* Filter tabs */}
        <div className="flex gap-x-5 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => {
            const active = filter === f.key && !searchQuery
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setSearchQuery(''); setSearchInput('') }}
                aria-pressed={active}
                className={`flex min-h-10 flex-shrink-0 items-center gap-1.5 font-heading text-xs underline-offset-4 transition-colors
                  ${active
                    ? 'font-semibold text-ns-secondary-readable underline'
                    : 'text-ns-muted hover:text-ns-text'}`}
              >
                <f.Icon size={12} strokeWidth={active ? 2.5 : 2} />
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="mt-1 flex items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <SearchIcon size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ns-muted" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search messages…"
              className="min-h-10 w-full rounded border border-ns-border bg-ns-surface pl-8 pr-3 font-body text-sm
                         text-ns-text transition-colors placeholder:text-ns-muted focus:border-ns-text focus:outline-none"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchInput('') }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-ns-muted transition-colors hover:text-ns-text"
              aria-label="Clear search"
            >
              <CloseIcon size={12} />
            </button>
          )}
        </form>
      </div>

      {/* ── Spoiler level tabs ── */}
      <SpoilerLevelTabs
        active={spoilerLevel}
        onChange={level => { setSpoilerLevel(level); setCursor(null) }}
      />

      {/* ── Pinned messages ── */}
      <PinnedMessages pinned={pinned} onJump={jumpTo} />

      {/* ── Discussion prompts ── */}
      <div className="flex-shrink-0 border-b border-ns-border py-2">
        <DiscussionPrompts
          movieTitle={movieTitle}
          onPrompt={text => {
            /* handled by setting the input — we expose via ref in future; for now, show it */
          }}
        />
      </div>

      {/* ── Message feed ── */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="min-w-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-ns-border [&>*:first-child]:border-t-0"
      >
        {/* Load more button (for non-live modes, messages load oldest-first or at top) */}
        {hasMore && filter !== 'live' && (
          <div className="py-1">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="min-h-10 font-heading text-xs text-ns-muted underline underline-offset-4 transition-colors hover:text-ns-text"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-8">
            <svg aria-hidden="true" className="animate-spin text-ns-muted" width="20" height="20" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 font-body text-sm text-ns-muted">
            {searchQuery ? 'No messages found.' : 'Be the first to spark discussion!'}
          </p>
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

        {/* Live load more */}
        {hasMore && filter === 'live' && (
          <div className="border-t border-ns-border py-1">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="min-h-10 font-heading text-xs text-ns-muted underline underline-offset-4 transition-colors hover:text-ns-text"
            >
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}
      </div>

      {/* ── Typing indicator ── */}
      <TypingIndicator users={typingUsers} />

      {/* ── Input ── */}
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
          isMember={isMember}
          onJoinClick={() => {
            // Scroll the MemberButton into view — it's in the header
            document.querySelector('[data-member-button]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      ) : (
        <div className="flex-shrink-0 border-t border-ns-border py-4">
          <p className="font-body text-sm text-ns-muted">
            <a href="/auth/signin" className="text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text">Sign in</a>
            {' '}to join the discussion
          </p>
        </div>
      )}
    </div>
  )
}
