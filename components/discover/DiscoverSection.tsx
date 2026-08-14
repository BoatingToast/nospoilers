'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import { ArrowRightIcon } from '@/components/icons'
import type { TMDbMovie } from '@/types'

interface DiscoverSectionProps {
  title: string
  eyebrow?: string
  movies: TMDbMovie[]
  index: number
  total: number
}

type CardStyle = CSSProperties & {
  '--card-index': number
}

function sectionNumber(value: number) {
  return String(value).padStart(2, '0')
}

export default function DiscoverSection({
  title,
  eyebrow,
  movies,
  index,
  total,
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
    <section
      className="discover-section relative mb-24 scroll-mt-28 lg:mb-32"
      data-discover-section
      data-section-index={index + 1}
      data-direction={index % 2 === 0 ? 'left' : 'right'}
    >
      <div className="discover-section-heading mb-7 flex items-end gap-4 border-b border-ns-border/55 pb-5 sm:gap-6">
        <span className="font-display text-4xl leading-none tracking-wider text-ns-secondary/45 sm:text-5xl">
          {sectionNumber(index + 1)}
        </span>
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1 font-body text-[10px] uppercase tracking-[0.24em] text-ns-secondary">
              {eyebrow}
            </p>
          )}
          <h2 className="truncate font-display text-3xl tracking-wider text-ns-text sm:text-4xl">
            {title.toUpperCase()}
          </h2>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => scrollRow(-1)}
            disabled={!canScrollLeft}
            aria-label={`Scroll ${title} backward`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ns-border bg-ns-surface/75 text-ns-muted transition-all hover:border-ns-secondary/45 hover:text-ns-text disabled:cursor-default disabled:opacity-25"
          >
            <ArrowRightIcon size={16} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollRow(1)}
            disabled={!canScrollRight}
            aria-label={`Scroll ${title} forward`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ns-border bg-ns-surface/75 text-ns-muted transition-all hover:border-ns-secondary/45 hover:text-ns-text disabled:cursor-default disabled:opacity-25"
          >
            <ArrowRightIcon size={16} />
          </button>
          <span className="ml-2 font-body text-[9px] uppercase tracking-[0.2em] text-ns-muted/45">
            {sectionNumber(index + 1)} / {sectionNumber(total)}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 -right-4 z-20 w-20 bg-gradient-to-l from-ns-bg via-ns-bg/80 to-transparent sm:-right-6 sm:w-28" aria-hidden="true" />
        <div
          ref={rowRef}
          className="discover-section-track scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-5 motion-reduce:scroll-auto sm:-mx-6 sm:gap-5 sm:px-6"
          role="region"
          aria-label={`${title} films`}
        >
          {movies.map((movie, movieIndex) => (
            <Link
              key={movie.id}
              href={`/movie/${movie.id}`}
              aria-label={`View ${movie.title}`}
              className="discover-card group block w-[150px] flex-shrink-0 snap-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg sm:w-[172px]"
              style={{ '--card-index': movieIndex } as CardStyle}
            >
              <div className="discover-card-frame relative h-[225px] w-[150px] overflow-hidden rounded-2xl border border-ns-border bg-ns-surface sm:h-[258px] sm:w-[172px]">
                <Image
                  src={tmdbImageUrl(movie.poster_path, 'w342')}
                  alt={movie.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                  sizes="(min-width: 640px) 172px, 150px"
                />
                <div className="discover-card-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ns-bg via-ns-bg/10 to-transparent p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="mb-1 font-body text-[9px] uppercase tracking-[0.18em] text-ns-secondary">
                    Open signal
                  </span>
                  <p className="line-clamp-2 font-body text-xs font-medium text-ns-text">
                    {movie.title}
                  </p>
                </div>
                {movie.vote_average > 0 && (
                  <div className="absolute right-2 top-2 rounded-full border border-ns-secondary/25 bg-ns-bg/80 px-2 py-1 font-body text-[10px] font-semibold text-ns-secondary backdrop-blur-md">
                    {movie.vote_average.toFixed(1)}
                  </div>
                )}
                <span className="absolute bottom-2 right-2 font-display text-lg tracking-wider text-white/35 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  {sectionNumber(movieIndex + 1)}
                </span>
              </div>
              <div className="mt-3 min-w-0">
                <p className="truncate font-heading text-xs font-semibold text-ns-text transition-colors group-hover:text-white sm:text-sm">
                  {movie.title}
                </p>
                <p className="mt-1 font-body text-[10px] uppercase tracking-[0.14em] text-ns-muted/65">
                  {formatYear(movie.release_date) || 'Year unknown'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
