import Link from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/icons'
import type { RatingStats } from '@/types'

interface Props {
  stats:      RatingStats
  isOwnProfile: boolean
  username:   string
}

export default function ProfileRatingStats({ stats, isOwnProfile }: Props) {
  if (stats.totalRatings === 0) {
    if (!isOwnProfile) return null
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-ns-surface p-6">
        <p className="text-base text-ns-muted">No film ratings yet</p>
        <Button href="/ratings" variant="outline" size="sm">Start rating films</Button>
      </div>
    )
  }

  const maxDist = Math.max(1, ...Object.values(stats.distribution))

  return (
    <div className="rounded-2xl bg-ns-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-ns-text">Film ratings</h3>
        {isOwnProfile && (
          <Link href="/ratings" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-ns-secondary-readable transition-colors duration-150 hover:text-ns-text">
            View all <ArrowRightIcon size={14} />
          </Link>
        )}
      </div>

      <dl className="mb-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-1.5">
          <dd className="font-display text-3xl tabular-nums text-ns-text">{stats.totalRatings}</dd>
          <dt className="text-sm text-ns-muted">rated</dt>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dd className="font-display text-3xl tabular-nums text-ns-text">{stats.averageScore.toFixed(0)}</dd>
          <dt className="text-sm text-ns-muted">avg</dt>
        </div>
        {stats.perfectScores > 0 && (
          <div className="flex items-baseline gap-1.5">
            <dd className="font-display text-3xl tabular-nums text-ns-secondary-readable">{stats.perfectScores}</dd>
            <dt className="text-sm text-ns-muted">perfect</dt>
          </div>
        )}
      </dl>

      <div aria-hidden="true" className="mb-5 flex h-12 items-end gap-1">
        {Object.entries(stats.distribution).map(([bucket, count]) => (
          <div
            key={bucket}
            title={`${bucket}: ${count}`}
            style={{ height: `${Math.max(6, (count / maxDist) * 100)}%` }}
            className={cn('flex-1 rounded-t', count === maxDist && count > 0 ? 'bg-ns-secondary' : 'bg-ns-surface-3')}
          />
        ))}
      </div>

      {stats.topRatedMovies.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ns-text">Highest rated</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {stats.topRatedMovies.slice(0, 6).map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`} aria-label={`${m.title}, ${m.score} out of 100`} className="group relative block w-14 flex-shrink-0">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-ns-surface-2">
                  <PosterFill
                    path={m.posterPath}
                    size="w185"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                    sizes="56px"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0.5 text-center text-xs font-bold tabular-nums text-white">
                    {m.score}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
