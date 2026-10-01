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
      <div className="bg-ns-surface border border-dashed border-ns-border rounded-2xl p-5 text-center">
        <p className="text-ns-muted text-xs font-body mb-2">No film ratings yet</p>
        <Link href="/ratings"
          className="text-ns-secondary-readable text-xs font-body hover:text-ns-secondary-readable/70 transition-colors">
          Start rating films →
        </Link>
      </div>
    )
  }

  const maxDist = Math.max(1, ...Object.values(stats.distribution))

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Film Ratings</p>
        {isOwnProfile && (
          <Link href="/ratings"
            className="text-ns-secondary-readable text-[10px] font-body hover:text-ns-secondary-readable/70 transition-colors">
            View all →
          </Link>
        )}
      </div>

      {/* Summary row */}
      <div className="flex items-baseline gap-4 mb-4">
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
            <div key={bucket} className="flex-1 rounded-t-sm transition-all"
              style={{ height: `${Math.max(4, pct)}%`, background: color, opacity: count === 0 ? 0.15 : 0.8 }}
              title={`${bucket}: ${count}`}
            />
          )
        })}
      </div>

      {/* Top-rated posters */}
      {stats.topRatedMovies.length > 0 && (
        <div>
          <p className="text-ns-muted/50 text-[9px] tracking-widest uppercase font-body mb-2">Highest Rated</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {stats.topRatedMovies.slice(0, 6).map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`}
                className="flex-shrink-0 group relative">
                <div className="relative w-10 h-14 rounded-md overflow-hidden border border-ns-border
                                group-hover:border-ns-secondary/40 transition-colors">
                  <Image src={tmdbImageUrl(m.posterPath, 'w185')} alt={m.title}
                    fill className="object-cover" sizes="40px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-0.5 left-0 right-0 text-center font-display text-[9px]"
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
