'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { EditIcon, FriendsIcon, PinIcon, TheoryIcon, TrashIcon } from '@/components/icons'
import type { SZMessageData, SZReactionGroup } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function fullTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

/** Render content: highlight @mentions, linkify URLs */
function renderContent(content: string) {
  const parts = content.split(/(@\w+(?:-\w+)*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return (
        <Link key={i} href={`/profile/${username}`}
          className="font-semibold text-ns-secondary-readable transition-colors hover:text-ns-text">
          {part}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ── Deliberately revealed text ────────────────────────────────────────────────

/**
 * Rendered only after the viewer pressed "Reveal anyway". The text arrives
 * under the redaction bar, then the bar wipes away.
 */
function RevealedText({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 40)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <span className="ns-redact [&[data-open=false]_*]:!text-transparent" data-open={open}>
      {children}
    </span>
  )
}

// ── Reaction pill ─────────────────────────────────────────────────────────────

function ReactionPill({
  reaction,
  onToggle,
}: {
  reaction:  SZReactionGroup
  onToggle:  (emoji: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={reaction.userReacted}
      aria-label={`React with ${reaction.emoji}, ${reaction.count}`}
      onClick={() => onToggle(reaction.emoji)}
      className={`relative inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm transition-colors duration-150 before:absolute before:-inset-y-1.5 before:inset-x-0
        ${reaction.userReacted
          ? 'bg-ns-text text-ns-bg'
          : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'
        }`}
    >
      <span>{reaction.emoji}</span>
      <span key={reaction.count} className="inline-block animate-fade-up font-semibold tabular-nums">{reaction.count}</span>
    </button>
  )
}

// ── Reaction row (max 5 visible + overflow pill) ───────────────────────────────

const MAX_VISIBLE_REACTIONS = 5

function ReactionRow({
  reactions,
  onToggle,
}: {
  reactions: SZReactionGroup[]
  onToggle:  (emoji: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (reactions.length === 0) return null

  const visible  = expanded ? reactions : reactions.slice(0, MAX_VISIBLE_REACTIONS)
  const overflow = reactions.length - MAX_VISIBLE_REACTIONS
  const moreClass = 'relative inline-flex h-8 items-center rounded-full bg-ns-surface-2 px-2.5 text-sm font-semibold text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text before:absolute before:-inset-y-1.5 before:inset-x-0'

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {visible.map(r => (
        <ReactionPill key={r.emoji} reaction={r} onToggle={onToggle} />
      ))}
      {!expanded && overflow > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className={moreClass}>
          +{overflow}
        </button>
      )}
      {expanded && overflow > 0 && (
        <button type="button" onClick={() => setExpanded(false)} className={moreClass}>
          less
        </button>
      )}
    </div>
  )
}

// ── Emoji picker ──────────────────────────────────────────────────────────────

const REACTION_EMOJI = ['🔥', '💀', '🤯', '😭', '👀', '❤️', '👏', '🎬']

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    // Opens downward: the scrolling feed can always reach content below it.
    <div
      className="absolute right-0 top-full z-30 mt-1 grid w-max animate-fade-up grid-cols-[repeat(4,auto)] gap-0.5 rounded-2xl bg-ns-surface-3 p-1.5 shadow-2xl"
      onMouseLeave={onClose}
    >
      {REACTION_EMOJI.map(e => (
        <button
          key={e}
          type="button"
          aria-label={`React with ${e}`}
          onClick={() => { onSelect(e); onClose() }}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-colors hover:bg-ns-surface-2 sm:h-9 sm:w-9 sm:text-lg"
        >
          {e}
        </button>
      ))}
    </div>
  )
}

const actionButton = 'flex h-11 w-11 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text sm:h-8 sm:w-8'

// ── Vote buttons ──────────────────────────────────────────────────────────────

function VoteButtons({
  score, userVote, onVote, isOwn,
}: {
  score:    number
  userVote: 'upvote' | 'downvote' | null
  onVote:   (type: 'upvote' | 'downvote') => void
  isOwn:    boolean
}) {
  if (isOwn) return null
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onVote('upvote')}
        aria-pressed={userVote === 'upvote'}
        aria-label="Upvote"
        title="Upvote"
        className={`${actionButton} ${userVote === 'upvote' ? '!text-ns-secondary-readable' : ''}`}
      >
        <svg aria-hidden="true" width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2z"/>
        </svg>
      </button>
      <span
        key={score}
        className={`min-w-5 animate-fade-up text-center text-sm font-semibold tabular-nums
          ${score > 0 ? 'text-ns-secondary-readable' : score < 0 ? 'text-ns-danger' : 'text-ns-muted'}`}
      >
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        type="button"
        onClick={() => onVote('downvote')}
        aria-pressed={userVote === 'downvote'}
        aria-label="Downvote"
        title="Downvote"
        className={`${actionButton} ${userVote === 'downvote' ? '!text-ns-danger' : ''}`}
      >
        <svg aria-hidden="true" width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 22L2 2h20L12 22z"/>
        </svg>
      </button>
    </div>
  )
}

// ── MessageItem ───────────────────────────────────────────────────────────────

export interface MessageItemProps {
  message:     SZMessageData
  currentUser: string | null
  isFriend:    boolean
  onReply:     (msg: SZMessageData) => void
  onReact:     (messageId: string, emoji: string) => void
  onVote:      (messageId: string, type: 'upvote' | 'downvote') => void
  onEdit:      (msg: SZMessageData) => void
  onDelete:    (messageId: string) => void
  isHighlighted: boolean // jump-to highlight
}

export default function MessageItem({
  message, currentUser, isFriend,
  onReply, onReact, onVote, onEdit, onDelete, isHighlighted,
}: MessageItemProps) {
  const [showEmoji, setShowEmoji]     = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [collapsed, setCollapsed]     = useState(message.voteScore <= -5)
  const [revealedContent, setRevealedContent] = useState<string | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)
  const [revealError, setRevealError] = useState(false)
  const isOwn = message.userId === currentUser
  const passportLocked = !isOwn && !message.viewerUnlocked && revealedContent === null
  const visibleContent = message.viewerUnlocked || isOwn
    ? message.content
    : revealedContent ?? ''

  async function revealSpoiler() {
    if (revealLoading) return
    setRevealLoading(true)
    setRevealError(false)
    try {
      const response = await fetch(
        `/api/spoiler-zone/${message.tmdbId}/messages/${message.id}/reveal`,
        { method: 'POST', cache: 'no-store' },
      )
      if (!response.ok) throw new Error('Reveal failed')
      const data = await response.json() as { content?: unknown }
      if (typeof data.content !== 'string') throw new Error('Invalid reveal response')
      setRevealedContent(data.content)
    } catch {
      setRevealError(true)
    } finally {
      setRevealLoading(false)
    }
  }

  if (message.isDeleted) {
    return (
      <div className="px-4 py-2 pl-[3.75rem] sm:px-6 sm:pl-[4.25rem]">
        <p className="text-sm italic text-ns-subtle">[Message deleted]</p>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="px-4 pl-[3.25rem] sm:px-6 sm:pl-[3.75rem]">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="min-h-11 rounded-full px-2 text-sm italic text-ns-subtle transition-colors hover:text-ns-text"
        >
          [Low-quality message — click to expand]
        </button>
      </div>
    )
  }

  if (passportLocked) {
    return (
      <div className="animate-fade-up px-4 py-2 sm:px-6">
        <div className="rounded-2xl bg-ns-surface-2 p-4 sm:p-5">
          {/* Decorative bars only: locked text is never sent to this client. */}
          <div aria-hidden="true" className="max-w-md space-y-2">
            <span className="block h-3.5 w-11/12 rounded-sm bg-ns-secondary" />
            <span className="block h-3.5 w-3/5 rounded-sm bg-ns-secondary" />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-heading text-base font-bold text-ns-text">Locked by your Plot Passport</p>
              <p className="mt-0.5 text-sm text-ns-muted">
                This {message.spoilerLevel === 'ending' ? 'ending discussion' : 'mid-movie discussion'} unlocks at {message.unlockAtProgress}% progress.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {currentUser && (
                <Link
                  href="/plot-passport"
                  className="inline-flex min-h-11 items-center rounded-full bg-ns-text px-4 text-sm font-semibold text-ns-bg transition-colors duration-150 hover:bg-ns-muted sm:min-h-10"
                >
                  Update progress
                </Link>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={revealSpoiler}
                disabled={revealLoading}
                className="min-h-11 sm:min-h-10"
              >
                {revealLoading ? 'Revealing…' : 'Reveal anyway'}
              </Button>
            </div>
          </div>
          {revealError && (
            <p role="alert" className="mt-2 text-sm text-ns-danger">Could not reveal this message. Try again.</p>
          )}
        </div>
      </div>
    )
  }

  const deliberatelyRevealed = !message.viewerUnlocked && !isOwn && revealedContent !== null

  return (
    <div
      id={`msg-${message.id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false) }}
      onFocusCapture={() => setShowActions(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setShowActions(false)
          setShowEmoji(false)
        }
      }}
      className={`group relative flex animate-fade-up items-start gap-3 px-4 py-2.5 transition-colors duration-150 sm:px-6
        ${showActions ? 'z-20' : ''}
        ${isHighlighted ? 'bg-ns-surface-3' : 'hover:bg-ns-surface-2'}
      `}
    >
      {/* Avatar */}
      <div className="mt-0.5 flex-shrink-0">
        <Avatar src={message.avatarUrl} username={message.username} size="sm" href />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">

        {/* Header row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/profile/${message.username}`}
            className="text-sm font-bold text-ns-text transition-colors hover:text-ns-secondary-readable"
          >
            @{message.username}
          </Link>
          {isFriend && (
            <Badge variant="secondary">
              <FriendsIcon size={11} />
              Your friend
            </Badge>
          )}
          {message.isTheory && (
            <Badge variant="muted">
              <TheoryIcon size={11} strokeWidth={1.75} />
              Theory
            </Badge>
          )}
          {message.spoilerLevel === 'ending' && <Badge variant="danger">Ending</Badge>}
          {message.spoilerLevel === 'mid' && <Badge variant="warning">Mid-movie</Badge>}
          <span className="text-xs text-ns-subtle" title={fullTime(message.createdAt)}>
            {timeAgo(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-xs italic text-ns-subtle">edited</span>
          )}
          {message.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ns-secondary-readable">
              <PinIcon size={11} strokeWidth={1.75} />
              {message.pinnedLabel ?? 'Pinned'}
            </span>
          )}
        </div>

        {/* Reply preview */}
        {message.parentPreview && (
          <div className="mt-1.5 border-l-2 border-ns-border-strong pl-3">
            <p className="line-clamp-2 text-sm leading-snug text-ns-muted">
              <span className="font-semibold text-ns-text">@{message.parentPreview.username}</span>
              {': '}
              {message.parentPreview.content}
            </p>
          </div>
        )}

        {/* Message content */}
        <p className="mt-1 whitespace-pre-wrap break-words text-base leading-relaxed text-ns-text">
          {deliberatelyRevealed
            ? <RevealedText>{renderContent(visibleContent)}</RevealedText>
            : renderContent(visibleContent)}
        </p>

        {/* Reactions row */}
        <ReactionRow
          reactions={message.reactions}
          onToggle={emoji => onReact(message.id, emoji)}
        />
      </div>

      {/* Floating action bar (on hover or keyboard focus) */}
      <div
        className={`absolute right-2 top-1 z-10 flex items-center rounded-full bg-ns-surface p-0.5 shadow-2xl ring-1 ring-ns-border transition-opacity duration-150 sm:right-4
          ${showActions ? 'opacity-100' : 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100'}`}
      >
        <VoteButtons
          score={message.voteScore}
          userVote={message.userVote}
          onVote={type => onVote(message.id, type)}
          isOwn={isOwn}
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmoji(v => !v)}
            className={actionButton}
            title="React"
            aria-label="React"
            aria-expanded={showEmoji}
          >
            <svg aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
          </button>
          {showEmoji && (
            <EmojiPicker
              onSelect={emoji => onReact(message.id, emoji)}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => onReply(message)}
          className={actionButton}
          title="Reply"
          aria-label="Reply"
        >
          <svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
        </button>

        {isOwn && (
          <>
            <button type="button" onClick={() => onEdit(message)} className={actionButton} title="Edit" aria-label="Edit">
              <EditIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className={`${actionButton} hover:!text-ns-danger`}
              title="Delete"
              aria-label="Delete"
            >
              <TrashIcon size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
