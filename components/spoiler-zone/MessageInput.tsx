'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import { CloseIcon, TheoryIcon } from '@/components/icons'
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
  /** Text from a conversation starter. Never replaces what the viewer already typed. */
  draft?:        { text: string; nonce: number } | null
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
    <div className="absolute bottom-full left-0 z-20 mb-3 w-56 max-w-full animate-fade-up overflow-hidden rounded-2xl bg-ns-surface-3 py-1 shadow-2xl">
      {suggestions.map(u => (
        <button
          key={u}
          type="button"
          onMouseDown={e => { e.preventDefault(); onSelect(u) }}
          className="flex min-h-11 w-full items-center truncate px-4 text-left text-sm font-semibold text-ns-text transition-colors hover:bg-ns-surface-2"
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
  draft = null,
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

  // A picked conversation starter fills an empty composer and takes focus
  useEffect(() => {
    if (!draft) return
    setValue(current => (current.trim() ? current : draft.text.slice(0, MAX_CHARS)))
    const frame = window.requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [draft])

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
    const match = before.match(/@([\w-]*)$/)
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
    const replaced = before.replace(/@([\w-]*)$/, () => `@${username} `)
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

  const iconButton = 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150'

  // Non-member gate
  if (!isMember) {
    return (
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ns-border px-4 py-4 sm:px-6">
        <p className="min-w-0 flex-1 basis-52 text-sm text-ns-muted">
          Join this Spoiler Zone to post messages and react.
        </p>
        <Button variant="outline" size="sm" onClick={onJoinClick} className="min-h-11 sm:min-h-10">
          Join Spoiler Zone
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 border-t border-ns-border px-2 pb-1.5 pt-2 sm:px-5 sm:pb-2 sm:pt-3">

      {/* Reply preview strip */}
      {replyTo && !isEdit && (
        <div className="mb-2 flex animate-fade-up items-center gap-2 rounded-xl bg-ns-surface-2 py-1 pl-3 pr-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ns-secondary-readable">Replying to @{replyTo.username}</p>
            <p className="truncate text-sm text-ns-muted">{replyTo.content}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className={`${iconButton} text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text`}
            aria-label="Cancel reply"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEdit && (
        <div className="mb-2 flex animate-fade-up items-center justify-between gap-2 rounded-xl bg-ns-surface-2 py-1 pl-3 pr-1">
          <span className="text-sm font-semibold text-ns-text">Editing message</span>
          <button
            type="button"
            onClick={() => { onCancelEdit(); setValue('') }}
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface-3 hover:text-ns-text"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="relative flex items-end gap-0.5 rounded-3xl border border-ns-border-strong bg-ns-bg p-1 transition-colors duration-150 focus-within:border-ns-text">

        {/* Theory toggle */}
        {!isEdit && (
          <button
            type="button"
            onClick={() => setIsTheory(v => !v)}
            title="Mark as theory"
            aria-label="Mark as theory"
            aria-pressed={isTheory}
            className={`${iconButton} ${isTheory ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'}`}
          >
            <TheoryIcon size={16} strokeWidth={isTheory ? 2.5 : 2} />
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
            aria-label={replyTo ? `Reply to @${replyTo.username}` : 'Message'}
            placeholder={
              replyTo
                ? `Reply to @${replyTo.username}…`
                : isTheory
                ? 'Share your theory…'
                : 'Add to the discussion…'
            }
            rows={1}
            className="block max-h-40 min-h-11 w-full resize-none bg-transparent px-1 py-2.5 sm:px-2 text-base leading-6 text-ns-text scrollbar-hide placeholder:text-ns-subtle focus:outline-none disabled:cursor-not-allowed disabled:text-ns-muted"
          />
        </div>

        {/* Emoji toggle */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowEmoji(v => !v)}
            disabled={disabled || sending}
            className={`${iconButton} text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text disabled:opacity-40`}
            title="Emoji"
            aria-label="Insert emoji"
            aria-expanded={showEmoji}
          >
            <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-full right-0 z-20 mb-3 grid w-max animate-fade-up grid-cols-[repeat(4,auto)] gap-0.5 rounded-2xl bg-ns-surface-3 p-1.5 shadow-2xl">
              {REACTION_EMOJI.map(e => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Insert ${e}`}
                  onMouseDown={ev => { ev.preventDefault(); insertEmoji(e) }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-colors hover:bg-ns-surface-2"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || sending || disabled}
          className={`${iconButton} bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-readable disabled:cursor-not-allowed disabled:bg-ns-surface-2 disabled:text-ns-subtle`}
          title={isEdit ? 'Save' : 'Send'}
          aria-label={isEdit ? 'Save' : 'Send'}
        >
          {sending ? (
            <svg aria-hidden="true" className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : isEdit ? (
            <svg aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Hint, character counter, and error */}
      <div className="mt-1 flex min-h-5 items-center justify-between gap-3 px-2">
        {sendError ? (
          <p role="alert" className="text-sm text-ns-danger">{sendError}</p>
        ) : (
          <p className="hidden text-xs text-ns-subtle sm:block">Enter to send, Shift+Enter for newline</p>
        )}
        {value.length > 0 && (
          <span className={`ml-auto text-xs tabular-nums ${charsLeft < 100 ? 'text-ns-warning' : 'text-ns-subtle'}`}>
            {charsLeft}
          </span>
        )}
      </div>
    </div>
  )
}
