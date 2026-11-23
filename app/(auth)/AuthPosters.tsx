import Image from 'next/image'
import { getTrendingMovies } from '@/services/tmdb'
import { tmdbImageUrl } from '@/lib/utils'
import type { TMDbMovie } from '@/types'

const COLUMN_OFFSETS = ['-mt-10', '-mt-32', '-mt-4', '-mt-24']
const POSTERS_PER_COLUMN = 4

async function getPosters(): Promise<TMDbMovie[]> {
  try {
    const data = await getTrendingMovies('week')
    return data.results.filter(movie => movie.poster_path).slice(0, COLUMN_OFFSETS.length * POSTERS_PER_COLUMN)
  } catch {
    return []
  }
}

/** Decorative poster wall behind the sign-in headline. */
export default async function AuthPosters() {
  const posters = await getPosters()
  if (posters.length < COLUMN_OFFSETS.length * 2) return null

  const columns = COLUMN_OFFSETS.map((_, column) => (
    posters.filter((__, index) => index % COLUMN_OFFSETS.length === column)
  ))

  return (
    <div className="absolute inset-0 grid grid-cols-4 gap-3 px-3">
      {columns.map((movies, column) => (
        <div
          key={column}
          className={`ns-rise flex flex-col gap-3 ${COLUMN_OFFSETS[column]}`}
          style={{ '--i': column - 5 } as React.CSSProperties}
        >
          {movies.map(movie => (
            <div key={movie.id} className="relative aspect-[2/3] flex-shrink-0 overflow-hidden rounded-xl bg-ns-surface-2">
              <Image
                src={tmdbImageUrl(movie.poster_path, 'w342')}
                alt=""
                fill
                sizes="(min-width: 1536px) 220px, 180px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
