import Image from 'next/image'
import { getTrendingMovies } from '@/services/tmdb'
import { tmdbImageUrl } from '@/lib/utils'
import type { TMDbMovie } from '@/types'
import MotionToggle from './MotionToggle'

async function getPosters(): Promise<TMDbMovie[]> {
  try {
    const data = await getTrendingMovies('week')
    return data.results.filter(movie => movie.poster_path).slice(0, 14)
  } catch {
    return []
  }
}

/** Decorative poster wall. The same titles are reachable in Featured films. */
export default async function HeroPosters() {
  const posters = await getPosters()
  if (posters.length < 5) return null

  return (
    <div className="ns-rise mt-14 lg:mt-16" style={{ '--i': 4 } as React.CSSProperties}>
      <div aria-hidden="true" className="ns-marquee">
        <div className="ns-marquee-track">
          {[...posters, ...posters].map((movie, index) => (
            <div
              key={`${movie.id}-${index}`}
              className="relative mr-4 aspect-[2/3] w-40 flex-shrink-0 overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5 sm:w-52 lg:w-60"
            >
              <Image
                src={tmdbImageUrl(movie.poster_path, 'w342')}
                alt=""
                fill
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 208px, 160px"
                loading={index < 8 ? 'eager' : 'lazy'}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <MotionToggle />
      </div>
    </div>
  )
}
