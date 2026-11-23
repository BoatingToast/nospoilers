import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'

interface Props {
  movies: { tmdbId: number; title: string; posterPath: string | null }[]
}

export default function SharedMovies({ movies }: Props) {
  return (
    <section className="mt-12">
      <h2 className="ns-reveal font-display text-2xl text-ns-text sm:text-3xl">
        Movies you both love <span className="ml-1 font-body text-lg font-medium tabular-nums text-ns-muted">{movies.length}</span>
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
        {movies.map((movie, index) => (
          <Link
            key={movie.tmdbId}
            href={`/movie/${movie.tmdbId}`}
            className="ns-reveal group block min-w-0 rounded-xl"
            style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w342')}
                alt=""
                fill
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                sizes="(min-width: 768px) 150px, (min-width: 640px) 24vw, 30vw"
              />
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
              {movie.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
