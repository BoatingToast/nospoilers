'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/icons'

interface ModalProps {
  onClose:     () => void
  children:    React.ReactNode
  /** Tailwind max-width class for the panel, e.g. 'max-w-sm', 'max-w-lg'. */
  maxWidth?:   string
  showClose?:  boolean
  className?:  string
}

/**
 * Shared modal shell: backdrop, ESC-to-close, click-outside-to-close, and an
 * optional close button. Feature modals compose their own header/body/footer
 * inside `children` — this only owns the chrome that was previously
 * reimplemented per-modal (achievement details, collection pickers, review
 * forms, etc).
 */
export default function Modal({
  onClose,
  children,
  maxWidth  = 'max-w-md',
  showClose = true,
  className,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className={cn('relative w-full bg-ns-bg border border-ns-border rounded-2xl overflow-hidden shadow-2xl', maxWidth, className)}>
        {showClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 z-10 w-7 h-7 flex items-center justify-center rounded-full
                       text-ns-muted hover:text-ns-text hover:bg-ns-surface transition-colors"
          >
            <CloseIcon size={12} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
