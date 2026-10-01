import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import Section from '@/components/ui/Section'

interface Props {
  movies: { tmdbId: number; title: string; posterPath: string | null }[]
}

export default function SharedMovies({ movies }: Props) {
  return (
    <Section
      title="Movies You Both Love"
      action={<span className="font-body text-sm text-ns-muted">({movies.length})</span>}
    >
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-4">
        {movies.map(movie => (
          <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group min-w-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded border border-ns-border bg-ns-border transition-colors group-hover:border-ns-text/60">
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w185')}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 100px, 22vw"
              />
            </div>
            <p className="mt-1 truncate font-body text-[11px] leading-tight text-ns-muted transition-colors group-hover:text-ns-text">
              {movie.title}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  )
}
