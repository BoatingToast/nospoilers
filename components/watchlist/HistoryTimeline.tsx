import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'

interface Props {
  byMonth: Record<string, WatchlistItemData[]>
}

export default function HistoryTimeline({ byMonth }: Props) {
  return (
    <div className="flex flex-col gap-10">
      {Object.entries(byMonth).map(([month, movies]) => (
        <section key={month}>
          <div className="flex items-center gap-4 mb-5">
            <h2 className="font-display text-xl tracking-wider text-ns-gold">{month.toUpperCase()}</h2>
            <div className="flex-1 h-px bg-ns-border" />
            <span className="text-ns-muted text-xs font-body">{movies.length} film{movies.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {movies.map(movie => (
              <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border relative">
                  <Image
                    src={tmdbImageUrl(movie.posterPath, 'w185')}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 150px"
                  />
                  {movie.rating && (
                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-ns-bg/80 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-ns-gold text-[9px] font-body font-bold">{movie.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-ns-muted text-[10px] font-body mt-1.5 truncate group-hover:text-ns-text transition-colors">
                  {movie.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
