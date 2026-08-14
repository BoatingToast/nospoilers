'use client'

import { useEffect, useState, type ComponentType } from 'react'
import {
  FriendsIcon,
  MovieDnaIcon,
  RecsIcon,
  TopFiveIcon,
  WatchlistIcon,
  type IconProps,
} from '@/components/icons'

interface DashboardSection {
  id: string
  label: string
  Icon: ComponentType<IconProps>
}

// CHUNK 1 — DEFINE THE DASHBOARD DESTINATIONS

const SECTIONS: DashboardSection[] = [
  { id: 'dashboard-recommendations', label: 'For you', Icon: RecsIcon },
  { id: 'dashboard-watchlist', label: 'Watchlist', Icon: WatchlistIcon },
  { id: 'dashboard-dna', label: 'Movie DNA', Icon: MovieDnaIcon },
  { id: 'dashboard-community', label: 'Community', Icon: FriendsIcon },
  { id: 'dashboard-favorites', label: 'Favorites', Icon: TopFiveIcon },
]

// CHUNK 2 — KEEP THE CURRENT SECTION HIGHLIGHTED

function useActiveSection() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id)

  useEffect(() => {
    const elements = SECTIONS
      .map(section => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)

    const observer = new IntersectionObserver(
      entries => {
        const visibleEntry = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visibleEntry) setActiveId(visibleEntry.target.id)
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return { activeId, setActiveId }
}

// CHUNK 3 — BUILD THE RESPONSIVE STICKY NAVIGATOR

export default function DashboardSectionNav() {
  const { activeId, setActiveId } = useActiveSection()

  return (
    <nav
      aria-label="Jump to a dashboard section"
      className="sticky top-16 z-30 -mx-4 border-y border-ns-border/70 bg-ns-bg/90 px-4 py-3 shadow-[0_12px_32px_rgb(5_8_20/0.35)] backdrop-blur-xl sm:-mx-6 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <span className="hidden flex-shrink-0 text-[10px] font-body font-semibold uppercase tracking-[0.18em] text-ns-muted lg:block">
          Jump to
        </span>

        <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto pr-8 sm:pr-0">
          {SECTIONS.map(({ id, label, Icon }) => {
            const isActive = activeId === id

            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => setActiveId(id)}
                className={`group inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-body font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg ${
                  isActive
                    ? 'border-ns-secondary/60 bg-ns-secondary/15 text-white'
                    : 'border-ns-border bg-ns-surface/70 text-ns-muted hover:border-ns-secondary/35 hover:text-ns-text'
                }`}
              >
                <Icon
                  size={14}
                  className={isActive ? 'text-ns-secondary' : 'text-ns-muted group-hover:text-ns-secondary'}
                />
                {label}
              </a>
            )
          })}
        </div>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ns-bg/95 to-transparent sm:hidden"
        />
      </div>
    </nav>
  )
}
