'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { PinIcon, TheoryIcon } from '@/components/icons'
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
function renderContent(content: string, currentUser?: string) {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return (
        <Link key={i} href={`/profile/${username}`}
          className="text-ns-gold hover:text-amber-400 transition-colors font-medium">
          {part}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
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
      onClick={() => onToggle(reaction.emoji)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body transition-all
        ${reaction.userReacted
          ? 'bg-ns-gold/15 border border-ns-gold/40 text-ns-gold'
          : 'bg-ns-surface border border-ns-border text-ns-muted hover:border-ns-gold/30 hover:text-ns-text'
        }`}
    >
      <span>{reaction.emoji}</span>
      <span className="text-[10px]">{reaction.count}</span>
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

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {visible.map(r => (
        <ReactionPill key={r.emoji} reaction={r} onToggle={onToggle} />
      ))}
      {!expanded && overflow > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-body
                     bg-ns-surface border border-ns-border text-ns-muted/70
                     hover:border-ns-gold/30 hover:text-ns-text transition-all"
        >
          +{overflow}
        </button>
      )}
      {expanded && overflow > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-body
                     bg-ns-surface border border-ns-border text-ns-muted/50
                     hover:border-ns-gold/20 hover:text-ns-muted transition-all"
        >
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
    <div
      className="absolute bottom-full mb-1 left-0 bg-ns-surface border border-ns-border rounded-xl p-2
                 flex gap-1 shadow-xl z-20"
      onMouseLeave={onClose}
    >
      {REACTION_EMOJI.map(e => (
        <button
          key={e}
          onClick={() => { onSelect(e); onClose() }}
          className="text-lg hover:scale-125 transition-transform"
        >
          {e}
        </button>
      ))}
    </div>
  )
}

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
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onVote('upvote')}
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors
          ${userVote === 'upvote' ? 'text-ns-gold' : 'text-ns-muted/40 hover:text-ns-gold'}`}
        title="Upvote"
      >
        <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2z"/>
        </svg>
      </button>
      <span className={`text-[10px] font-body font-medium min-w-[18px] text-center
        ${score > 0 ? 'text-ns-gold' : score < 0 ? 'text-red-400/80' : 'text-ns-muted/40'}`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        onClick={() => onVote('downvote')}
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors
          ${userVote === 'downvote' ? 'text-red-400' : 'text-ns-muted/40 hover:text-red-400'}`}
        title="Downvote"
      >
        <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
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
  const isOwn = message.userId === currentUser

  if (message.isDeleted) {
    return (
      <div className="flex items-start gap-3 px-4 py-2.5 opacity-40">
        <div className="w-8 h-8 flex-shrink-0" />
        <p className="text-ns-muted text-xs font-body italic">[Message deleted]</p>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 opacity-50">
        <div className="w-8 h-8 flex-shrink-0" />
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs font-body text-ns-muted/60 italic hover:text-ns-muted transition-colors"
        >
          [Low-quality message — click to expand]
        </button>
      </div>
    )
  }

  return (
    <div
      id={`msg-${message.id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false) }}
      className={`group relative flex items-start gap-3 px-4 py-2.5 transition-colors
        ${isHighlighted ? 'bg-ns-gold/5 ring-1 ring-ns-gold/20 rounded-xl' : 'hover:bg-ns-surface/40'}
        ${isFriend ? 'border-l-2 border-ns-gold/30 pl-3' : ''}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <Avatar src={message.avatarUrl} username={message.username} size="sm" href />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* Friend badge */}
        {isFriend && (
          <span className="inline-flex items-center gap-1 text-[9px] font-body text-ns-gold/70 mb-0.5">
            <svg width="8" height="8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            Your Friend
          </span>
        )}

        {/* Theory badge */}
        {message.isTheory && (
          <span className="inline-flex items-center gap-1 text-[9px] font-body text-violet-400/70 mb-0.5 ml-2">
            <TheoryIcon size={10} strokeWidth={1.75} className="text-violet-400/70" />
            Theory
          </span>
        )}

        {/* Header row */}
        <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
          <Link href={`/profile/${message.username}`}
            className="text-sm font-body font-semibold text-ns-text hover:text-ns-gold transition-colors">
            @{message.username}
          </Link>
          <span className="text-[10px] font-body text-ns-muted/50" title={fullTime(message.createdAt)}>
            {timeAgo(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-[10px] font-body text-ns-muted/40 italic">edited</span>
          )}
          {message.isPinned && (
            <span className="inline-flex items-center gap-1 text-[9px] font-body text-ns-gold/60 tracking-wide">
              <PinIcon size={9} strokeWidth={1.75} />
              {message.pinnedLabel ?? 'Pinned'}
            </span>
          )}
        </div>

        {/* Reply preview */}
        {message.parentPreview && (
          <div className="flex items-start gap-2 mb-1.5 pl-2 border-l-2 border-ns-border">
            <p className="text-xs font-body text-ns-muted/60 leading-snug line-clamp-2">
              <span className="text-ns-gold/70 font-medium">@{message.parentPreview.username}</span>
              {': '}
              {message.parentPreview.content}
            </p>
          </div>
        )}

        {/* Message content */}
        <p className="text-sm font-body text-ns-text leading-relaxed whitespace-pre-wrap break-words">
          {renderContent(message.content, currentUser ?? undefined)}
        </p>

        {/* Reactions row */}
        <ReactionRow
          reactions={message.reactions}
          onToggle={emoji => onReact(message.id, emoji)}
        />
      </div>

      {/* Floating action bar (on hover) */}
      {showActions && (
        <div className="absolute right-3 top-1 flex items-center gap-0.5 bg-ns-surface border border-ns-border rounded-xl px-1.5 py-1 shadow-lg z-10">

          {/* Vote */}
          <VoteButtons
            score={message.voteScore}
            userVote={message.userVote}
            onVote={type => onVote(message.id, type)}
            isOwn={isOwn}
          />

          {/* Emoji react */}
          <div className="relative">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded text-ns-muted/60 hover:text-ns-gold transition-colors"
              title="React"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

          {/* Reply */}
          <button
            onClick={() => onReply(message)}
            className="w-7 h-7 flex items-center justify-center rounded text-ns-muted/60 hover:text-ns-gold transition-colors"
            title="Reply"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
          </button>

          {/* Edit / Delete (own only) */}
          {isOwn && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="w-7 h-7 flex items-center justify-center rounded text-ns-muted/60 hover:text-ns-text transition-colors"
                title="Edit"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="w-7 h-7 flex items-center justify-center rounded text-ns-muted/60 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
