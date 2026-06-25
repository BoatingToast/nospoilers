import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'

interface Props {
  movies: { tmdbId: number; title: string; posterPath: string | null }[]
}

export default function SharedMovies({ movies }: Props) {
  return (
    <div className="mt-8 bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">
        Movies You Both Love ({movies.length})
      </p>
      <div className="flex gap-3 flex-wrap">
        {movies.map(movie => (
          <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group flex-shrink-0">
            <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-ns-border">
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w185')}
                alt={movie.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="56px"
              />
            </div>
            <p className="text-ns-muted text-[10px] font-body mt-1 max-w-[56px] truncate text-center leading-tight group-hover:text-ns-text transition-colors">
              {movie.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
