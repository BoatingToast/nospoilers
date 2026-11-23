'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

interface PosterRailProps {
  /** Accessible name for the scrolling region and its arrow buttons. */
  label: string
  /** Name used in the arrow labels: "Scroll {controlsLabel} forward". */
  controlsLabel?: string
  heading?: ReactNode
  /** Extends the track to the page gutter. Turn off inside padded panels. */
  bleed?: boolean
  className?: string
  children: ReactNode
}

const FOCUSABLE = 'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])'

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/**
 * Horizontal poster row with arrow buttons and roving arrow-key movement.
 * Direct children are treated as the rail's items.
 */
export default function PosterRail({
  label,
  controlsLabel,
  heading,
  bleed = true,
  className,
  children,
}: PosterRailProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)

  const updateControls = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setCanScrollBack(track.scrollLeft > 4)
    setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    updateControls()
    track.addEventListener('scroll', updateControls, { passive: true })
    const resize = new ResizeObserver(updateControls)
    resize.observe(track)

    return () => {
      track.removeEventListener('scroll', updateControls)
      resize.disconnect()
    }
  }, [updateControls])

  function scrollPage(direction: -1 | 1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.85, 240),
      behavior: scrollBehavior(),
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    const target = event.target as HTMLElement
    // Dialogs and form fields rendered inside a card keep their own key handling.
    if (target.closest('input, textarea, select, [role="dialog"]')) return

    const track = trackRef.current
    if (!track) return
    const items = Array.from(track.children) as HTMLElement[]
    const current = items.findIndex(item => item.contains(target))
    if (current < 0) return

    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : Math.min(items.length - 1, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1)))

    event.preventDefault()
    if (next === current) return

    const destination = items[next]
    // A rail item can be the link itself or a wrapper around its controls.
    const focusTarget = destination.matches(FOCUSABLE)
      ? destination
      : destination.querySelector<HTMLElement>(FOCUSABLE)
    focusTarget?.focus({ preventScroll: true })
    destination.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest', inline: 'nearest' })
  }

  const name = controlsLabel ?? label
  const hasOverflow = canScrollBack || canScrollForward
  const arrowClass = cn(
    'flex h-11 w-11 items-center justify-center rounded-full text-ns-text transition-colors duration-150 aria-disabled:cursor-default aria-disabled:text-ns-subtle',
    bleed
      ? 'bg-ns-surface hover:bg-ns-surface-2 aria-disabled:hover:bg-ns-surface'
      : 'bg-ns-surface-2 hover:bg-ns-surface-3 aria-disabled:hover:bg-ns-surface-2',
  )

  return (
    <div className={cn('min-w-0', className)}>
      {(heading || hasOverflow) && (
        <div className="mb-5 flex min-h-11 items-end justify-between gap-4">
          <div className="min-w-0">{heading}</div>
          {hasOverflow && (
            <div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => canScrollBack && scrollPage(-1)}
                aria-disabled={!canScrollBack}
                aria-label={`Scroll ${name} backward`}
                className={arrowClass}
              >
                <ArrowRightIcon size={16} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => canScrollForward && scrollPage(1)}
                aria-disabled={!canScrollForward}
                aria-label={`Scroll ${name} forward`}
                className={arrowClass}
              >
                <ArrowRightIcon size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className={cn(
          'scrollbar-hide flex snap-x snap-proximity gap-4 overflow-x-auto py-1 sm:gap-5',
          bleed && '-mx-4 scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6',
        )}
      >
        {children}
      </div>
    </div>
  )
}
