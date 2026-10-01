'use client'

import { useEffect, useState } from 'react'

interface DashboardSection {
  id: string
  label: string
}

// CHUNK 1 — DEFINE THE DASHBOARD DESTINATIONS

const SECTIONS: DashboardSection[] = [
  { id: 'dashboard-recommendations', label: 'For you' },
  { id: 'dashboard-watchlist', label: 'Watchlist' },
  { id: 'dashboard-dna', label: 'Movie DNA' },
  { id: 'dashboard-community', label: 'Community' },
  { id: 'dashboard-favorites', label: 'Favorites' },
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
      className="sticky top-16 z-30 -mx-4 border-y border-ns-border bg-ns-bg px-4 sm:-mx-6 sm:px-6"
    >
      <div className="flex items-center gap-4">
        <span className="hidden flex-shrink-0 font-body text-xs text-ns-muted lg:block">
          Jump to
        </span>

        <div className="scrollbar-hide flex min-w-0 flex-1 gap-5 overflow-x-auto">
          {SECTIONS.map(({ id, label }) => {
            const isActive = activeId === id

            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => setActiveId(id)}
                className={`inline-flex min-h-11 flex-shrink-0 items-center border-b-2 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable ${
                  isActive
                    ? 'border-ns-secondary text-ns-text'
                    : 'border-transparent text-ns-muted hover:text-ns-text'
                }`}
              >
                {label}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
