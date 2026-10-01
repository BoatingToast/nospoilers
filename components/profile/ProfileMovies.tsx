import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'

interface Movie {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
}

export default function ProfileMovies({ movies }: { movies: Movie[] }) {
  if (movies.length === 0) return null

  return (
    <div className="min-w-0 border-t-2 border-ns-text pt-4">
      <h3 className="font-heading text-sm font-semibold text-ns-text mb-4">
        Favorite Films
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {movies.map(movie => (
          <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group">
            <div className="aspect-[2/3] rounded overflow-hidden bg-ns-border relative">
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w185')}
                alt={movie.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 20vw, 120px"
              />
            </div>
            <p className="text-ns-muted text-[11px] font-body mt-1.5 truncate leading-tight group-hover:text-ns-text transition-colors">
              {movie.title}
            </p>
            <p className="text-ns-muted/40 text-[11px] font-body">{formatYear(movie.releaseDate)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
