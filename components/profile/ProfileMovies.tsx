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
    <section>
      <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Favorite films</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">
        {movies.map(movie => (
          <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group min-w-0">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w342')}
                alt=""
                fill
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                sizes="(max-width: 640px) 30vw, 180px"
              />
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
              {movie.title}
            </p>
            <p className="text-sm tabular-nums text-ns-muted">{formatYear(movie.releaseDate)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
