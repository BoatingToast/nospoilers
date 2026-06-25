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
  TheoryIcon, EmptyDiscussionIcon, CloseIcon, SearchIcon,
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
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-ns-muted/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-body text-ns-muted/50 italic">{label}</span>
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
      .on('broadcast', { event: 'sz_message' }, ({ payload }: { payload: { message: SZMessageData } }) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.message.id)) return prev
          return [...prev, payload.message]
        })
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
  }, [tmdbId, filter, session?.user?.name])

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
    <div className="flex flex-col h-full min-h-0 bg-ns-bg rounded-2xl border border-ns-border overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-ns-border">

        {/* Title + stats + member button row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="font-display text-xl tracking-widest text-ns-gold leading-none mb-1">
              SPOILER ZONE
            </h2>
            <p className="text-ns-muted text-xs font-body truncate max-w-[240px]">{movieTitle}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => {
            const active = filter === f.key && !searchQuery
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setSearchQuery(''); setSearchInput('') }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all
                  ${active
                    ? 'bg-ns-gold/15 text-ns-gold border border-ns-gold/30'
                    : 'text-ns-muted hover:text-ns-text hover:bg-ns-surface/40'}`}
              >
                <f.Icon size={12} strokeWidth={active ? 2.5 : 2} />
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="mt-2 flex gap-1 items-center">
          <div className="relative flex-1">
            <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ns-muted/40 pointer-events-none" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search messages…"
              className="w-full bg-ns-surface border border-ns-border rounded-lg pl-8 pr-3 py-1.5 text-xs font-body
                         text-ns-text placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-gold/40 transition-colors"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchInput('') }}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ns-muted/50 hover:text-ns-muted hover:bg-ns-surface/60 transition-colors"
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
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
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
        className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-ns-border"
      >
        {/* Load more button (for non-live modes, messages load oldest-first or at top) */}
        {hasMore && filter !== 'live' && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs font-body text-ns-muted hover:text-ns-text transition-colors"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin text-ns-gold/40" width="20" height="20" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <EmptyDiscussionIcon size={52} className="text-ns-gold/30 mb-4" strokeWidth={1.5} />
            <p className="text-ns-muted font-body text-sm">
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

        {/* Live load more */}
        {hasMore && filter === 'live' && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs font-body text-ns-muted hover:text-ns-text transition-colors"
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
        <div className="flex-shrink-0 px-4 py-4 border-t border-ns-border text-center">
          <p className="text-xs font-body text-ns-muted">
            <a href="/auth/signin" className="text-ns-gold hover:text-amber-400 transition-colors">Sign in</a>
            {' '}to join the discussion
          </p>
        </div>
      )}
    </div>
  )
}
