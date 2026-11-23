'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronIcon, CloseIcon, SearchIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Poster grid shared by the viewer's library screens. */
export const posterGridClass = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

/** Zooms a poster inside its frame when the surrounding `group` is hovered. */
export const posterZoomClass = 'object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none'

/** Stagger for `ns-reveal` items, capped so long lists never lag behind the scroll. */
export function revealDelay(index: number): CSSProperties {
  return { '--i': Math.min(index % 6, 7) } as CSSProperties
}

/** Flips to true once, the first time the element scrolls into view. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, inView] as const
}

export interface PillOption<T extends string> {
  value: T
  label: string
  count?: number
}

function PillLabel({ label, count }: { label: string; count?: number }) {
  return (
    <>
      {label}
      {count !== undefined && <span className="tabular-nums opacity-70">{count}</span>}
    </>
  )
}

const pillClass = 'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold'

/**
 * Filter pills with a selection that slides between options. The selected
 * layer is a clipped copy of the row, so label colors invert as it passes.
 */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [clip, setClip] = useState<string | null>(null)
  const layoutKey = options.map(option => `${option.value}:${option.label}:${option.count ?? ''}`).join('|')

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const active = track.querySelector<HTMLElement>('button[aria-pressed="true"]')
      if (!active) {
        setClip('inset(50% 50% 50% 50%)')
        return
      }
      const right = track.offsetWidth - active.offsetLeft - active.offsetWidth
      setClip(`inset(4px ${right}px 4px ${active.offsetLeft}px round 999px)`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [value, layoutKey])

  return (
    <div className={cn('max-w-full overflow-x-auto scrollbar-hide', className)}>
      <div ref={trackRef} role="group" aria-label={label} className="relative inline-flex min-w-max items-center gap-1 rounded-full bg-ns-surface p-1">
        {options.map(option => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                pillClass,
                'transition-colors duration-150',
                selected && !clip ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text',
              )}
            >
              <PillLabel label={option.label} count={option.count} />
            </button>
          )
        })}
        {clip && (
          <div
            aria-hidden="true"
            style={{ clipPath: clip }}
            className="pointer-events-none absolute inset-0 flex items-center gap-1 rounded-full bg-ns-text p-1 text-ns-bg [transition:clip-path_280ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          >
            {options.map(option => (
              <span key={option.value} className={pillClass}>
                <PillLabel label={option.label} count={option.count} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function SortSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        aria-label={label}
        value={value}
        onChange={event => onChange(event.target.value as T)}
        className="min-h-11 w-full cursor-pointer appearance-none rounded-full bg-ns-surface py-2 pl-5 pr-10 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronIcon direction="down" size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ns-muted" />
    </div>
  )
}

export function FilterInput({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <SearchIcon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="min-h-11 w-full rounded-full bg-ns-surface py-2 pl-11 pr-11 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle hover:bg-ns-surface-2 focus:bg-ns-surface-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={() => onChange('')}
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:text-ns-text"
        >
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  )
}

export type LibraryView = 'grid' | 'list'

export function ViewToggle({ value, onChange }: { value: LibraryView; onChange: (value: LibraryView) => void }) {
  const button = (view: LibraryView, label: string, path: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={value === view}
      onClick={() => onChange(view)}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150',
        value === view ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text',
      )}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d={path} /></svg>
    </button>
  )

  return (
    <div role="group" aria-label="Layout" className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-ns-surface p-1">
      {button('grid', 'Poster grid', 'M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3Zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3Zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3Zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3Z')}
      {button('list', 'Compact list', 'M1 3.25A1.25 1.25 0 0 1 2.25 2h11.5a1.25 1.25 0 0 1 0 2.5H2.25A1.25 1.25 0 0 1 1 3.25Zm0 4.75a1.25 1.25 0 0 1 1.25-1.25h11.5a1.25 1.25 0 0 1 0 2.5H2.25A1.25 1.25 0 0 1 1 8Zm1.25 3.5a1.25 1.25 0 0 0 0 2.5h11.5a1.25 1.25 0 0 0 0-2.5H2.25Z')}
    </div>
  )
}

/**
 * Horizontal value bar. The fill slides in from the left when it scrolls into
 * view and animates between values. `value` runs from 0 to 1.
 */
export function Meter({
  value,
  className,
  fillClassName = 'bg-ns-secondary',
  fillStyle,
}: {
  value: number
  className?: string
  fillClassName?: string
  fillStyle?: CSSProperties
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const clamped = Math.max(0, Math.min(1, value))

  return (
    <div ref={ref} aria-hidden="true" className={cn('h-1.5 overflow-hidden rounded-full bg-ns-surface-3', className)}>
      <div
        data-in={inView ? 'true' : undefined}
        style={{ '--meter': clamped, ...fillStyle } as CSSProperties}
        className={cn(
          'h-full w-full rounded-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
          '[transform:translateX(calc((var(--meter)-1)*100%))]',
          '[html[data-motion=on]_&:not([data-in=true])]:[transform:translateX(-100%)]',
          fillClassName,
        )}
      />
    </div>
  )
}
