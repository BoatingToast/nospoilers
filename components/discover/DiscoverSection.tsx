import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { TMDbMovie } from '@/types'

interface DiscoverSectionProps {
  title: string
  eyebrow?: string
  movies: TMDbMovie[]
}

export default function DiscoverSection({ title, eyebrow, movies }: DiscoverSectionProps) {
  if (movies.length === 0) return null

  return (
    <section className="mb-12">
      <div className="mb-5">
        {eyebrow && (
          <p className="text-ns-gold text-xs tracking-[0.2em] uppercase font-body mb-1">{eyebrow}</p>
        )}
        <h2 className="font-display text-3xl tracking-wider text-ns-text">{title.toUpperCase()}</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6">
        {movies.map(movie => (
          <Link key={movie.id} href={`/movie/${movie.id}`} className="group flex-shrink-0">
            <div className="w-[150px]">
              <div className="relative w-[150px] h-[225px] rounded-xl overflow-hidden bg-ns-surface border border-ns-border
                              transition-all duration-300 group-hover:border-ns-gold/30 group-hover:scale-[1.02]
                              group-hover:shadow-[0_0_20px_rgba(200,150,62,0.12)]">
                <Image
                  src={tmdbImageUrl(movie.poster_path, 'w342')}
                  alt={movie.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="150px"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-transparent to-transparent
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
                  <p className="text-ns-text text-xs font-body font-medium line-clamp-2">{movie.title}</p>
                  <p className="text-ns-muted text-[10px] font-body">{formatYear(movie.release_date)}</p>
                </div>
                {movie.vote_average > 0 && (
                  <div className="absolute top-2 right-2 bg-ns-bg/80 backdrop-blur-sm rounded px-1.5 py-0.5
                                  text-ns-gold text-[10px] font-body font-semibold border border-ns-gold/20">
                    {movie.vote_average.toFixed(1)}
                  </div>
                )}
              </div>
              <p className="text-ns-muted text-[11px] font-body mt-2 truncate">{movie.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
