'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TheoryIcon } from '@/components/icons'
import type { SZMessageData } from '@/types'

const REACTION_EMOJI = ['🔥', '💀', '🤯', '😭', '👀', '❤️', '👏', '🎬']
const MAX_CHARS = 2000

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  replyTo:       SZMessageData | null
  editTarget:    SZMessageData | null
  onSend:        (content: string, parentId?: string, isTheory?: boolean) => Promise<void>
  onEdit:        (messageId: string, content: string) => Promise<void>
  onCancelReply: () => void
  onCancelEdit:  () => void
  onTyping:      () => void
  knownUsernames: string[]   // for @mention autocomplete
  disabled?:     boolean
  /** Whether the current user is a member of this Spoiler Zone */
  isMember?:     boolean
  /** Called when user clicks the join prompt */
  onJoinClick?:  () => void
}

// ── Mention suggestion list ───────────────────────────────────────────────────

function MentionDropdown({
  suggestions,
  onSelect,
}: {
  suggestions: string[]
  onSelect:    (u: string) => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="absolute bottom-full mb-1 left-0 w-48 bg-ns-surface border border-ns-border rounded-xl overflow-hidden shadow-xl z-20">
      {suggestions.map(u => (
        <button
          key={u}
          onMouseDown={e => { e.preventDefault(); onSelect(u) }}
          className="w-full text-left px-3 py-2 text-xs font-body text-ns-text hover:bg-ns-gold/10 hover:text-ns-gold transition-colors"
        >
          @{u}
        </button>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessageInput({
  replyTo, editTarget,
  onSend, onEdit,
  onCancelReply, onCancelEdit,
  onTyping, knownUsernames,
  disabled = false,
  isMember = true,
  onJoinClick,
}: Props) {
  const [value, setValue]               = useState('')
  const [sending, setSending]           = useState(false)
  const [sendError, setSendError]       = useState<string | null>(null)
  const [showEmoji, setShowEmoji]       = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([])
  const [isTheory, setIsTheory]         = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When editTarget changes, pre-fill the value
  useEffect(() => {
    if (editTarget) {
      setValue(editTarget.content)
      textareaRef.current?.focus()
    }
  }, [editTarget])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  // Handle typing events
  const fireTyping = useCallback(() => {
    onTyping()
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }, [onTyping])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    if (v.length > MAX_CHARS) return
    setValue(v)
    fireTyping()

    // @mention detection
    const sel = e.target.selectionStart
    const before = v.slice(0, sel)
    const match = before.match(/@(\w*)$/)
    if (match) {
      const q = match[1].toLowerCase()
      setMentionQuery(q)
      setMentionSuggestions(
        knownUsernames.filter(u => u.toLowerCase().startsWith(q)).slice(0, 5),
      )
    } else {
      setMentionQuery(null)
      setMentionSuggestions([])
    }
  }

  const handleMentionSelect = (username: string) => {
    const el = textareaRef.current
    if (!el) return
    const sel = el.selectionStart
    const before = value.slice(0, sel)
    const after  = value.slice(sel)
    const replaced = before.replace(/@(\w*)$/, `@${username} `)
    setValue(replaced + after)
    setMentionQuery(null)
    setMentionSuggestions([])
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(replaced.length, replaced.length)
    }, 0)
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) return
    const sel = el.selectionStart
    const newVal = value.slice(0, sel) + emoji + value.slice(sel)
    if (newVal.length <= MAX_CHARS) {
      setValue(newVal)
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(sel + emoji.length, sel + emoji.length)
      }, 0)
    }
    setShowEmoji(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      if (replyTo)    { onCancelReply(); return }
      if (editTarget) { onCancelEdit(); setValue(''); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed || sending || disabled) return
    setSendError(null)
    setSending(true)
    try {
      if (editTarget) {
        await onEdit(editTarget.id, trimmed)
        onCancelEdit()
      } else {
        await onSend(trimmed, replyTo?.id, isTheory)
        if (replyTo) onCancelReply()
      }
      setValue('')
      setIsTheory(false)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }

  const charsLeft = MAX_CHARS - value.length
  const isEdit = !!editTarget

  // Non-member gate
  if (!isMember) {
    return (
      <div className="border-t border-ns-border bg-ns-bg/80 backdrop-blur-sm px-4 py-4 text-center">
        <p className="text-xs font-body text-ns-muted mb-2">
          Join this Spoiler Zone to post messages and react.
        </p>
        <button
          onClick={onJoinClick}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-body font-bold
                     bg-ns-gold/10 text-ns-gold border border-ns-gold/40
                     hover:bg-ns-gold hover:text-black hover:shadow-md hover:shadow-ns-gold/20
                     active:scale-95 transition-all duration-200"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5"  x2="12" y2="19" />
            <line x1="5"  y1="12" x2="19" y2="12" />
          </svg>
          Join Spoiler Zone
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-ns-border bg-ns-bg/80 backdrop-blur-sm px-4 pt-3 pb-4">

      {/* Reply preview strip */}
      {replyTo && !isEdit && (
        <div className="flex items-start gap-2 mb-2 pl-2 border-l-2 border-ns-gold/40 bg-ns-surface/40 rounded-r-lg py-1.5 pr-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-body text-ns-gold/70 mb-0.5">Replying to @{replyTo.username}</p>
            <p className="text-xs font-body text-ns-muted/70 truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-ns-muted/40 hover:text-ns-muted transition-colors mt-0.5 flex-shrink-0"
            aria-label="Cancel reply"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEdit && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-body text-ns-gold/70">Editing message</span>
          <button
            onClick={() => { onCancelEdit(); setValue('') }}
            className="text-[10px] font-body text-ns-muted/60 hover:text-ns-muted underline transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="relative flex items-end gap-2">

        {/* Theory toggle */}
        {!isEdit && (
          <button
            onClick={() => setIsTheory(v => !v)}
            title="Mark as theory"
            className={`flex-shrink-0 w-8 h-8 mb-0.5 rounded-lg flex items-center justify-center transition-colors
              ${isTheory ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-ns-muted/40 hover:text-ns-muted'}`}
          >
            <TheoryIcon size={14} strokeWidth={isTheory ? 2.5 : 2} />
          </button>
        )}

        {/* Mention suggestions */}
        <div className="relative flex-1">
          <MentionDropdown suggestions={mentionSuggestions} onSelect={handleMentionSelect} />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={
              replyTo
                ? `Reply to @${replyTo.username}…`
                : isTheory
                ? 'Share your theory… (marked as Theory)'
                : 'Add to the discussion… (Enter to send, Shift+Enter for newline)'
            }
            rows={1}
            className="w-full resize-none bg-ns-surface border border-ns-border rounded-xl px-4 py-2.5
                       text-sm font-body text-ns-text placeholder:text-ns-muted/40
                       focus:outline-none focus:border-ns-gold/40 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       scrollbar-hide leading-relaxed"
            style={{ minHeight: '42px', maxHeight: '160px' }}
          />
        </div>

        {/* Emoji toggle */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmoji(v => !v)}
            disabled={disabled || sending}
            className="w-8 h-8 mb-0.5 flex items-center justify-center rounded-lg text-ns-muted/50 hover:text-ns-gold transition-colors disabled:opacity-40"
            title="Emoji"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-full mb-1 right-0 bg-ns-surface border border-ns-border rounded-xl p-2 flex gap-1 shadow-xl z-20">
              {REACTION_EMOJI.map(e => (
                <button
                  key={e}
                  onMouseDown={ev => { ev.preventDefault(); insertEmoji(e) }}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || sending || disabled}
          className="flex-shrink-0 w-9 h-9 mb-0.5 rounded-xl bg-ns-gold text-black flex items-center justify-center
                     hover:bg-amber-400 active:scale-95 transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
          title={isEdit ? 'Save' : 'Send'}
        >
          {sending ? (
            <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : isEdit ? (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Character counter + error */}
      <div className="flex items-center justify-between mt-1 min-h-[14px]">
        {sendError ? (
          <p className="text-[10px] font-body text-red-400">{sendError}</p>
        ) : (
          <span />
        )}
        {value.length > 0 && (
          <span className={`text-[10px] font-body tabular-nums
            ${charsLeft < 100 ? 'text-amber-400' : charsLeft < 0 ? 'text-red-400' : 'text-ns-muted/40'}`}>
            {charsLeft}
          </span>
        )}
      </div>
    </div>
  )
}
