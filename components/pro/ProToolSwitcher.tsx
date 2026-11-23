'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ChevronIcon } from '@/components/icons'
import { PRO_TOOLS } from './pro-tools'

export default function ProToolSwitcher({ currentSlug }: { currentSlug: string }) {
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const onPointerDown = (event: PointerEvent) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !menu.open) return
      menu.open = false
      menu.querySelector('summary')?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <details ref={menuRef} className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full bg-ns-surface px-5 text-sm font-semibold text-ns-text transition-colors hover:bg-ns-surface-2 [&::-webkit-details-marker]:hidden">
        Switch tool
        <ChevronIcon direction="down" size={16} className="text-ns-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-64 animate-fade-up rounded-2xl bg-ns-surface-2 p-2 shadow-2xl">
        {PRO_TOOLS.map(({ slug, title, Icon }) => {
          const current = slug === currentSlug
          return (
            <Link
              key={slug}
              href={`/pro/${slug}`}
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                current ? 'bg-ns-surface-3 text-ns-text' : 'text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'
              }`}
            >
              <Icon size={16} />
              {title}
            </Link>
          )
        })}
      </div>
    </details>
  )
}
