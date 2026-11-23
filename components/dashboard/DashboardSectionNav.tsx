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
      className="sticky top-16 z-30 -mx-4 bg-ns-bg px-4 py-3 sm:-mx-6 sm:px-6"
    >
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {SECTIONS.map(({ id, label, Icon }) => {
          const isActive = activeId === id

          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={() => setActiveId(id)}
              className={`inline-flex min-h-11 flex-shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
              }`}
            >
              <Icon size={15} />
              {label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
