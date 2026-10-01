'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TheoryIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
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
    <div className="absolute bottom-full left-0 z-20 mb-1 w-48 overflow-hidden rounded border border-ns-border bg-ns-surface">
      {suggestions.map(u => (
        <button
          key={u}
          onMouseDown={e => { e.preventDefault(); onSelect(u) }}
          className="min-h-10 w-full border-t border-ns-border px-3 text-left font-body text-sm text-ns-text transition-colors first:border-t-0 hover:bg-ns-surface-2"
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
      <div className="flex flex-shrink-0 flex-col gap-3 border-t-2 border-ns-text py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-sm text-ns-muted">
          Join this Spoiler Zone to post messages and react.
        </p>
        <Button variant="secondary" size="sm" onClick={onJoinClick} className="min-h-10">
          <svg aria-hidden="true" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5"  x2="12" y2="19" />
            <line x1="5"  y1="12" x2="19" y2="12" />
          </svg>
          Join Spoiler Zone
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 border-t-2 border-ns-text pb-1 pt-3">

      {/* Reply preview strip */}
      {replyTo && !isEdit && (
        <div className="mb-2 flex items-start gap-2 border-l-2 border-ns-border pl-2">
          <div className="flex-1 min-w-0">
            <p className="mb-0.5 font-body text-[11px] text-ns-secondary-readable">Replying to @{replyTo.username}</p>
            <p className="truncate font-body text-xs text-ns-muted">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-ns-muted transition-colors hover:text-ns-text"
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
          <span className="font-body text-xs text-ns-secondary-readable">Editing message</span>
          <button
            onClick={() => { onCancelEdit(); setValue('') }}
            className="font-body text-xs text-ns-muted underline underline-offset-4 transition-colors hover:text-ns-text"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="relative flex items-end gap-1 sm:gap-2">

        {/* Theory toggle */}
        {!isEdit && (
          <button
            onClick={() => setIsTheory(v => !v)}
            title="Mark as theory"
            aria-pressed={isTheory}
            className={`flex h-10 w-8 flex-shrink-0 items-center justify-center rounded border transition-colors sm:w-10
              ${isTheory ? 'border-violet-500/30 text-violet-400' : 'border-transparent text-ns-muted hover:text-ns-text'}`}
          >
            <TheoryIcon size={14} strokeWidth={isTheory ? 2.5 : 2} />
          </button>
        )}

        {/* Mention suggestions */}
        <div className="relative min-w-0 flex-1">
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
            className="block w-full resize-none rounded border border-ns-border bg-ns-surface px-3 py-2.5
                       font-body text-sm text-ns-text placeholder:text-ns-muted
                       transition-colors focus:border-ns-text focus:outline-none
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
            className="flex h-10 w-8 items-center justify-center rounded text-ns-muted transition-colors hover:text-ns-text disabled:opacity-40 sm:w-10"
            title="Emoji"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-full right-0 z-20 mb-1 flex max-w-[calc(100vw-2rem)] flex-wrap gap-1 rounded border border-ns-border bg-ns-surface p-2">
              {REACTION_EMOJI.map(e => (
                <button
                  key={e}
                  onMouseDown={ev => { ev.preventDefault(); insertEmoji(e) }}
                  className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-ns-surface-2"
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
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-ns-secondary text-ns-secondary-foreground
                     transition-colors duration-150 hover:bg-ns-text hover:text-ns-bg
                     disabled:cursor-not-allowed disabled:opacity-30"
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
          <p className="text-[11px] font-body text-red-400">{sendError}</p>
        ) : (
          <span />
        )}
        {value.length > 0 && (
          <span className={`text-[11px] font-body tabular-nums
            ${charsLeft < 100 ? 'text-amber-400' : charsLeft < 0 ? 'text-red-400' : 'text-ns-muted'}`}>
            {charsLeft}
          </span>
        )}
      </div>
    </div>
  )
}
