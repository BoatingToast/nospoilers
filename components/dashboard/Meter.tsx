'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface MeterProps {
  /** Fill from 0 to 100. */
  value: number
  className?: string
  barClassName?: string
  /** Position in a group of bars, used to stagger the first grow. */
  index?: number
}

/**
 * Thin data bar that grows the first time it scrolls into view and animates
 * later value changes. It is decorative: always pair it with the value as text.
 */
export default function Meter({ value, className, barClassName, index = 0 }: MeterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const percent = Math.min(100, Math.max(0, value))

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const show = () => setSeen(true)
    // Printed reports must show every bar, including ones never scrolled to.
    window.addEventListener('beforeprint', show)

    let observer: IntersectionObserver | undefined
    if (document.documentElement.dataset.motion === 'on') {
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        show()
        observer?.disconnect()
      }, { threshold: 0.2 })
      observer.observe(element)
    } else {
      show()
    }

    return () => {
      window.removeEventListener('beforeprint', show)
      observer?.disconnect()
    }
  }, [])

  return (
    <div ref={ref} aria-hidden="true" className={cn('h-2 w-full overflow-hidden rounded-full bg-ns-surface-3', className)}>
      <div
        data-seen={seen}
        className={cn(
          'h-full w-full bg-ns-secondary transition-[clip-path] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          '[html[data-motion=on]_&[data-seen=false]]:![clip-path:inset(0_100%_0_0_round_999px)]',
          barClassName,
        )}
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0 round 999px)`, transitionDelay: `${Math.min(index, 7) * 70}ms` }}
      />
    </div>
  )
}
