import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { RatingStats } from '@/types'

interface Props {
  stats:      RatingStats
  isOwnProfile: boolean
  username:   string
}

function scoreColorHex(v: number): string {
  if (v >= 80) return '#C8963E'
  if (v >= 60) return '#6DBF91'
  if (v >= 40) return '#7B9CC8'
  return '#C87B6D'
}

export default function ProfileRatingStats({ stats, isOwnProfile, username }: Props) {
  if (stats.totalRatings === 0) {
    if (!isOwnProfile) return null
    return (
      <div className="bg-ns-surface border border-dashed border-ns-border rounded-2xl p-5 text-center">
        <p className="text-ns-muted text-xs font-body mb-2">No film ratings yet</p>
        <Link href="/ratings"
          className="text-ns-gold text-xs font-body hover:text-amber-400 transition-colors">
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
            className="text-ns-gold text-[10px] font-body hover:text-amber-400 transition-colors">
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
            style={{ color: scoreColorHex(stats.averageScore) }}>
            {stats.averageScore.toFixed(0)}
          </span>
          <span className="text-ns-muted text-xs font-body ml-1">avg</span>
        </div>
        {stats.perfectScores > 0 && (
          <div>
            <span className="font-display text-3xl tracking-wider text-ns-gold">
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
          const color = bucket === '81-100' ? '#C8963E'
                      : bucket === '61-80'  ? '#6DBF91'
                      : bucket === '41-60'  ? '#7B9CC8'
                      : bucket === '21-40'  ? '#C87B6D'
                      : '#9B6DC8'
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
                                group-hover:border-ns-gold/40 transition-colors">
                  <Image src={tmdbImageUrl(m.posterPath, 'w185')} alt={m.title}
                    fill className="object-cover" sizes="40px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-0.5 left-0 right-0 text-center font-display text-[9px]"
                    style={{ color: scoreColorHex(m.score) }}>
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
