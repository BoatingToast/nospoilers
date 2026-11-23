'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface GrowBarProps {
  /** Filled share of the track, from 0 to 1. */
  value: number
  /** Grow right after mount, for bars inside a just-opened dialog. */
  growOnMount?: boolean
  className?: string
  /** Track color. Replaces the default rather than merging with it. */
  trackClassName?: string
  /** Fill color. Replaces the default rather than merging with it. */
  fillClassName?: string
}

/** Decorative meter. Always pair it with the number it represents. */
export default function GrowBar({
  value,
  growOnMount = false,
  className,
  trackClassName = 'bg-ns-surface-3',
  fillClassName = 'bg-ns-secondary',
}: GrowBarProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [armed, setArmed] = useState(growOnMount)
  const share = Math.min(1, Math.max(0, value))

  useEffect(() => {
    if (document.documentElement.dataset.motion !== 'on') {
      setArmed(false)
      return
    }

    if (growOnMount) {
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setArmed(false))
      })
      return () => cancelAnimationFrame(frame)
    }

    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    // Bars already on screen stay put so nothing flashes during hydration.
    if (rect.top < window.innerHeight && rect.bottom > 0) return

    setArmed(true)
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setArmed(false)
      observer.disconnect()
    }, { threshold: 0.2 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [growOnMount])

  const hiddenShare = armed ? 100 : 100 - share * 100

  return (
    <span ref={ref} aria-hidden="true" className={cn('block h-2 overflow-hidden rounded-full', trackClassName, className)}>
      <span
        className={cn(
          'block h-full rounded-full',
          !armed && 'transition-[clip-path] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
          fillClassName,
        )}
        style={{ clipPath: `inset(0 ${hiddenShare}% 0 0 round 9999px)` }}
      />
    </span>
  )
}
