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
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">
        Favorite Films
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {movies.map(movie => (
          <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-ns-border relative">
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w185')}
                alt={movie.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 20vw, 120px"
              />
            </div>
            <p className="text-ns-muted text-[10px] font-body mt-1.5 truncate leading-tight group-hover:text-ns-text transition-colors">
              {movie.title}
            </p>
            <p className="text-ns-muted/40 text-[10px] font-body">{formatYear(movie.releaseDate)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
