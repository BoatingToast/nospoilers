'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import { ArrowRightIcon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Section from '@/components/ui/Section'
import type { TMDbMovie } from '@/types'

interface DiscoverSectionProps {
  title: string
  eyebrow?: string
  movies: TMDbMovie[]
  index: number
  total: number
}

const SCROLL_BUTTON =
  'flex h-10 w-10 items-center justify-center rounded border border-ns-border text-ns-muted transition-colors hover:border-ns-text hover:text-ns-text disabled:cursor-default disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable'

export default function DiscoverSection({
  title,
  eyebrow,
  movies,
}: DiscoverSectionProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return

    const updateControls = () => {
      setCanScrollLeft(row.scrollLeft > 4)
      setCanScrollRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 4)
    }

    updateControls()
    row.addEventListener('scroll', updateControls, { passive: true })
    window.addEventListener('resize', updateControls)

    return () => {
      row.removeEventListener('scroll', updateControls)
      window.removeEventListener('resize', updateControls)
    }
  }, [movies.length])

  function scrollRow(direction: -1 | 1) {
    const row = rowRef.current
    if (!row) return
    row.scrollBy({
      left: direction * Math.max(row.clientWidth * 0.78, 360),
      behavior: 'smooth',
    })
  }

  if (movies.length === 0) return null

  return (
    <Section
      title={title.toUpperCase()}
      note={eyebrow}
      className="scroll-mt-28"
      action={
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => scrollRow(-1)}
            disabled={!canScrollLeft}
            aria-label={`Scroll ${title} backward`}
            className={SCROLL_BUTTON}
          >
            <ArrowRightIcon size={16} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollRow(1)}
            disabled={!canScrollRight}
            aria-label={`Scroll ${title} forward`}
            className={SCROLL_BUTTON}
          >
            <ArrowRightIcon size={16} />
          </button>
        </div>
      }
    >
      <div
        ref={rowRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-2 motion-reduce:scroll-auto sm:-mx-6 sm:scroll-px-6 sm:gap-5 sm:px-6"
        role="region"
        aria-label={`${title} films`}
      >
        {movies.map(movie => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            aria-label={`View ${movie.title}`}
            className="group block w-[150px] flex-shrink-0 snap-start rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg sm:w-[172px]"
          >
            <Card
              interactive
              className="relative h-[225px] w-[150px] overflow-hidden group-hover:border-ns-text/60 sm:h-[258px] sm:w-[172px]"
            >
              <Image
                src={tmdbImageUrl(movie.poster_path, 'w342')}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 172px, 150px"
              />
              {movie.vote_average > 0 && (
                <Badge variant="secondary" className="absolute right-2 top-2 bg-ns-bg/90">
                  {movie.vote_average.toFixed(1)}
                </Badge>
              )}
            </Card>
            <div className="mt-2 min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                {movie.title}
              </p>
              <p className="mt-0.5 font-body text-xs text-ns-muted">
                {formatYear(movie.release_date) || 'Year unknown'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}
