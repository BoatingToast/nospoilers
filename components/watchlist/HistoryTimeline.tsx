import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'

interface Props {
  byMonth: Record<string, WatchlistItemData[]>
}

export default function HistoryTimeline({ byMonth }: Props) {
  return (
    <div className="flex flex-col gap-12">
      {Object.entries(byMonth).map(([month, movies]) => (
        <section key={month} className="min-w-0 border-t-2 border-ns-text pt-4">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">{month.toUpperCase()}</h2>
            <span className="text-ns-muted text-sm font-body">{movies.length} film{movies.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {movies.map(movie => (
              <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group">
                <div className="aspect-[2/3] rounded overflow-hidden bg-ns-surface border border-ns-border relative transition-colors group-hover:border-ns-text/60">
                  <Image
                    src={tmdbImageUrl(movie.posterPath, 'w185')}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 150px"
                  />
                  {movie.rating && (
                    <div className="absolute bottom-0 right-0 flex min-w-6 items-center justify-center bg-ns-bg px-1.5 py-0.5">
                      <span className="text-ns-secondary-readable text-[11px] font-body font-bold">{movie.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-ns-muted text-[11px] font-body mt-1.5 truncate group-hover:text-ns-text transition-colors">
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
