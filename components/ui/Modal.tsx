'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/icons'

interface ModalBaseProps {
  onClose:     () => void
  children:    React.ReactNode
  /** Tailwind max-width class for the panel, e.g. 'max-w-sm', 'max-w-lg'. */
  maxWidth?:   string
  showClose?:  boolean
  className?:  string
  ariaDescribedBy?: string
  /** Focus this element when the dialog opens. Defaults to an autofocus element, then the first control. */
  initialFocusRef?: RefObject<HTMLElement | null>
}

type ModalProps = ModalBaseProps & (
  | { ariaLabel: string; ariaLabelledBy?: never }
  | { ariaLabel?: never; ariaLabelledBy: string }
)

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0)
}

/**
 * Shared accessible modal shell. It owns dialog semantics, focus management,
 * Escape/backdrop dismissal, and page scroll locking. Feature modals compose
 * their own header/body/footer inside `children`.
 */
export default function Modal({
  onClose,
  children,
  maxWidth  = 'max-w-md',
  showClose = true,
  className,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  initialFocusRef,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const panel = panelRef.current
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const bodyPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${bodyPadding + scrollbarWidth}px`
    }

    const focusTarget = initialFocusRef?.current ??
      panel?.querySelector<HTMLElement>('[autofocus]') ??
      (panel ? focusableElements(panel)[0] : null) ??
      panel
    focusTarget?.focus({ preventScroll: true })

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panel) return
      const focusable = focusableElements(panel)

      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true })
    }
  }, [initialFocusRef])

  return (
    <div
      ref={backdropRef}
      onMouseDown={event => {
        if (event.target === backdropRef.current) onCloseRef.current()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={cn('relative w-full bg-ns-bg border border-ns-border rounded-2xl overflow-hidden shadow-2xl outline-none', maxWidth, className)}
      >
        {showClose && (
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            className="absolute top-5 right-5 z-10 w-7 h-7 flex items-center justify-center rounded-full
                       text-ns-muted hover:text-ns-text hover:bg-ns-surface transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary"
          >
            <CloseIcon size={12} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
