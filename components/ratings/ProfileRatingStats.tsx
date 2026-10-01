import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import { ratingColor } from '@/lib/theme'
import type { RatingStats } from '@/types'

interface Props {
  stats:      RatingStats
  isOwnProfile: boolean
  username:   string
}

export default function ProfileRatingStats({ stats, isOwnProfile, username }: Props) {
  if (stats.totalRatings === 0) {
    if (!isOwnProfile) return null
    return (
      <div className="border-t-2 border-ns-text pt-4">
        <p className="text-ns-muted text-sm font-body mb-2">No film ratings yet</p>
        <Link href="/ratings"
          className="text-ns-secondary-readable text-sm font-body underline underline-offset-4 hover:text-ns-text transition-colors">
          Start rating films →
        </Link>
      </div>
    )
  }

  const maxDist = Math.max(1, ...Object.values(stats.distribution))

  return (
    <div className="min-w-0 border-t-2 border-ns-text pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-4">
        <p className="font-display text-3xl leading-none tracking-wide text-ns-text">Film Ratings</p>
        {isOwnProfile && (
          <Link href="/ratings"
            className="text-ns-secondary-readable text-sm font-body underline underline-offset-4 hover:text-ns-text transition-colors">
            View all →
          </Link>
        )}
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-4">
        <div>
          <span className="font-display text-3xl tracking-wider text-ns-text">
            {stats.totalRatings}
          </span>
          <span className="text-ns-muted text-xs font-body ml-1">rated</span>
        </div>
        <div>
          <span className="font-display text-3xl tracking-wider"
            style={{ color: ratingColor(stats.averageScore / 100) }}>
            {stats.averageScore.toFixed(0)}
          </span>
          <span className="text-ns-muted text-xs font-body ml-1">avg</span>
        </div>
        {stats.perfectScores > 0 && (
          <div>
            <span className="font-display text-3xl tracking-wider text-ns-secondary-readable">
              {stats.perfectScores}
            </span>
            <span className="text-ns-muted text-xs font-body ml-1">perfect</span>
          </div>
        )}
      </div>

      {/* Mini distribution */}
      <div className="flex items-end gap-1 h-10 mb-4">
        {Object.entries(stats.distribution).map(([bucket, count]) => {
          const pct   = (count / maxDist) * 100
          const color = bucket === '81-100' ? ratingColor(0.9)
                      : bucket === '61-80'  ? ratingColor(0.7)
                      : bucket === '41-60'  ? ratingColor(0.5)
                      : bucket === '21-40'  ? ratingColor(0.3)
                      : ratingColor(0.1)
          return (
            <div key={bucket} className="flex-1 transition-all"
              style={{ height: `${Math.max(4, pct)}%`, background: color, opacity: count === 0 ? 0.15 : 0.8 }}
              title={`${bucket}: ${count}`}
            />
          )
        })}
      </div>

      {/* Top-rated posters */}
      {stats.topRatedMovies.length > 0 && (
        <div>
          <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-2">Highest Rated</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {stats.topRatedMovies.slice(0, 6).map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`}
                className="flex-shrink-0 group relative">
                <div className="relative w-10 h-14 rounded-sm overflow-hidden border border-ns-border
                                group-hover:border-ns-text/60 transition-colors">
                  <Image src={tmdbImageUrl(m.posterPath, 'w185')} alt={m.title}
                    fill className="object-cover" sizes="40px" />
                  <span className="absolute bottom-0 left-0 right-0 bg-ns-bg text-center font-display text-[11px]"
                    style={{ color: ratingColor(m.score / 100) }}>
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
