'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import { StarIcon } from '@/components/icons'
import PosterImage from './PosterImage'
import { tmdbImageUrl } from '@/lib/utils'

/** Deliberately has no overview field: this data is serialized to the client. */
export interface FeaturedFilm {
  id: number
  title: string
  posterPath: string | null
  year: string
  rating: string | null
}

const STEP_MS = 7000

export default function DiscoverFeatured({ films }: { films: FeaturedFilm[] }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [inView, setInView] = useState(false)
  const [holding, setHolding] = useState(false)
  const [canAnimate, setCanAnimate] = useState(false)
  const stageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setCanAnimate(document.documentElement.dataset.motion === 'on')
    const stage = stageRef.current
    if (!stage) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const canRotate = films.length > 1 && canAnimate
  const autoplay = canRotate && playing && inView && !holding

  useEffect(() => {
    if (!autoplay) return
    const timer = window.setInterval(() => {
      if (document.hidden || document.documentElement.dataset.motionPaused) return
      setIndex(current => (current + 1) % films.length)
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [autoplay, index, films.length])

  const film = films[index]
  if (!film) return null

  return (
    <section
      ref={stageRef}
      aria-labelledby="featured-film-title"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocusCapture={() => setHolding(true)}
      onBlurCapture={() => setHolding(false)}
      className="relative isolate overflow-hidden rounded-3xl bg-ns-surface"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {films.filter(item => item.posterPath).map(item => (
          <Image
            key={item.id}
            src={tmdbImageUrl(item.posterPath, 'w342')}
            alt=""
            fill
            sizes="60vw"
            className={`scale-125 object-cover blur-3xl transition-opacity duration-700 ${item.id === film.id ? 'opacity-50' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-ns-surface via-ns-surface/90 to-ns-surface/40 lg:bg-gradient-to-r lg:from-ns-surface lg:via-ns-surface/85 lg:to-ns-surface/30" />
      </div>

      <div className="grid gap-7 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:p-14">
        <Link
          href={`/movie/${film.id}`}
          aria-label={`View ${film.title}`}
          tabIndex={-1}
          className="group relative mx-auto block aspect-[2/3] w-52 overflow-hidden rounded-xl bg-ns-surface-2 shadow-2xl sm:w-60 lg:order-2 lg:w-[21rem]"
        >
          {films.map((item, itemIndex) => (
            <span
              key={item.id}
              className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transform-none ${
                itemIndex === index ? 'opacity-100 group-hover:scale-[1.03]' : 'scale-105 opacity-0'
              }`}
            >
              <PosterImage
                path={item.posterPath}
                size="w500"
                preload={itemIndex === 0}
                sizes="(min-width: 1024px) 336px, 240px"
              />
            </span>
          ))}
        </Link>

        <div className="min-w-0 lg:order-1">
          <p className="text-base font-semibold text-ns-secondary-readable">Featured this week</p>
          <h2
            key={film.id}
            id="featured-film-title"
            className="mt-3 line-clamp-3 animate-fade-up break-words pb-1 font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl"
          >
            {film.title}
          </h2>
          <p key={`${film.id}-meta`} className="mt-4 flex animate-fade-up items-center gap-2 text-lg tabular-nums text-ns-muted">
            <span>{film.year}</span>
            {film.rating && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-ns-text">
                  <StarIcon size={15} className="text-ns-accent" />
                  <span className="sr-only">Rated </span>
                  {film.rating}
                </span>
              </>
            )}
          </p>

          <Button href={`/movie/${film.id}`} size="lg" className="mt-7 w-full sm:w-auto">
            View film
          </Button>

          {films.length > 1 && (
            <div className="mt-8 flex flex-wrap items-center gap-2.5 lg:mt-10">
              <div role="group" aria-label="Featured films" className="flex items-center gap-2.5">
                {films.map((item, itemIndex) => {
                  const selected = itemIndex === index
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Show ${item.title}`}
                      onClick={() => setIndex(itemIndex)}
                      className={`relative aspect-[2/3] w-12 overflow-hidden rounded-lg transition-[opacity,box-shadow] duration-200 sm:w-14 ${
                        selected ? 'ring-2 ring-ns-text ring-offset-2 ring-offset-ns-surface' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <PosterImage path={item.posterPath} size="w185" sizes="56px" />
                      {selected && autoplay && (
                        <span
                          key={index}
                          aria-hidden="true"
                          className="ns-progress absolute inset-x-0 bottom-0 h-1 bg-ns-secondary"
                          style={{ '--ns-progress-duration': `${STEP_MS}ms` } as CSSProperties}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
              {canRotate && (
                <button
                  type="button"
                  onClick={() => setPlaying(value => !value)}
                  aria-label={playing ? 'Pause featured films' : 'Play featured films'}
                  className="ml-1 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ns-muted transition-colors duration-150 hover:bg-ns-surface-2 hover:text-ns-text"
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
